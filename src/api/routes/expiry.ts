import { Hono } from "hono";
import { eq, or, and, isNotNull, like, sql } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { employees } from "../db/schema/employees";
import { departments, branches } from "../db/schema/masters";
import {
  employeePassports,
  employeeVisas,
  employeeWorkPermits,
  employeeDocuments,
} from "../db/schema/documents";
import {
  calculateDocumentStatus,
  calculateDaysRemaining,
  DOCUMENT_STATUSES,
  type DocumentStatus,
} from "../../shared/types/document";
import type {
  ExpirySummary,
  ExpiringDocumentItem,
} from "../../shared/types/expiry";
import { jsonSuccess } from "../utils/response";

export const expiryRoutes = new Hono<AppContext>();

expiryRoutes.use("*", requireAuth());

const STATUS_URGENCY_RANK: Record<DocumentStatus, number> = {
  [DOCUMENT_STATUSES.EXPIRED]: 1,
  [DOCUMENT_STATUSES.EXPIRING_7_DAYS]: 2,
  [DOCUMENT_STATUSES.EXPIRING_30_DAYS]: 3,
  [DOCUMENT_STATUSES.EXPIRING_90_DAYS]: 4,
  [DOCUMENT_STATUSES.VALID]: 5,
};

/**
 * Helper to get the employee ID for an EMPLOYEE role user.
 */
async function getSelfEmployeeId(
  db: ReturnType<typeof getDb>,
  userId: string,
  email: string
): Promise<string | null> {
  const rows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      or(
        eq(employees.userId, userId),
        like(sql`lower(${employees.email})`, email.toLowerCase())
      )
    )
    .limit(1);

  return rows[0]?.id || null;
}

/**
 * GET /api/expiry/summary
 * Aggregate document expiry counts and workforce compliance numbers.
 */
expiryRoutes.get("/summary", async (c) => {
  const user = c.get("user")!;
  const db = getDb(c.env.DB);

  let selfEmpId: string | null = null;
  if (user.role === ROLES.EMPLOYEE) {
    selfEmpId = await getSelfEmployeeId(db, user.sub, user.email);
    if (!selfEmpId) {
      const emptySummary: ExpirySummary = {
        workforce: { totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0 },
        compliance: { expired: 0, expiring7Days: 0, expiring30Days: 0, expiring90Days: 0, valid: 0, total: 0 },
        byType: {
          passport: { expired: 0, expiringSoon: 0 },
          visa: { expired: 0, expiringSoon: 0 },
          workPermit: { expired: 0, expiringSoon: 0 },
          uploadedDocuments: { expired: 0, expiringSoon: 0 },
        },
      };
      return jsonSuccess(c, emptySummary);
    }
  }

  // 1. Workforce Stats
  let totalEmployees = 0;
  let activeEmployees = 0;
  let inactiveEmployees = 0;

  if (selfEmpId) {
    const emp = await db
      .select({ status: employees.employmentStatus })
      .from(employees)
      .where(eq(employees.id, selfEmpId))
      .limit(1);
    if (emp.length) {
      totalEmployees = 1;
      if (emp[0].status === "active" || emp[0].status === "probation") {
        activeEmployees = 1;
      } else {
        inactiveEmployees = 1;
      }
    }
  } else {
    const empRows = await db
      .select({ status: employees.employmentStatus })
      .from(employees);
    totalEmployees = empRows.length;
    activeEmployees = empRows.filter(
      (e) => e.status === "active" || e.status === "probation"
    ).length;
    inactiveEmployees = totalEmployees - activeEmployees;
  }

  // 2. Query all document sources
  const [passports, visas, workPermits, uploadedDocs] = await Promise.all([
    db
      .select({
        id: employeePassports.id,
        expiryDate: employeePassports.expiryDate,
      })
      .from(employeePassports)
      .where(selfEmpId ? eq(employeePassports.employeeId, selfEmpId) : undefined),
    db
      .select({
        id: employeeVisas.id,
        expiryDate: employeeVisas.expiryDate,
      })
      .from(employeeVisas)
      .where(selfEmpId ? eq(employeeVisas.employeeId, selfEmpId) : undefined),
    db
      .select({
        id: employeeWorkPermits.id,
        expiryDate: employeeWorkPermits.expiryDate,
      })
      .from(employeeWorkPermits)
      .where(selfEmpId ? eq(employeeWorkPermits.employeeId, selfEmpId) : undefined),
    db
      .select({
        id: employeeDocuments.id,
        expiryDate: employeeDocuments.expiryDate,
      })
      .from(employeeDocuments)
      .where(
        selfEmpId
          ? and(
              eq(employeeDocuments.employeeId, selfEmpId),
              isNotNull(employeeDocuments.expiryDate)
            )
          : isNotNull(employeeDocuments.expiryDate)
      ),
  ]);

  // Exclude empty string expiry dates for uploaded documents
  const validUploadedDocs = uploadedDocs.filter(
    (d) => d.expiryDate && d.expiryDate.trim() !== ""
  );

  function countBuckets(items: { expiryDate: string }[]) {
    let expired = 0;
    let expiring7 = 0;
    let expiring30 = 0;
    let expiring90 = 0;
    let valid = 0;

    for (const item of items) {
      const status = calculateDocumentStatus(item.expiryDate);
      if (status === DOCUMENT_STATUSES.EXPIRED) expired++;
      else if (status === DOCUMENT_STATUSES.EXPIRING_7_DAYS) expiring7++;
      else if (status === DOCUMENT_STATUSES.EXPIRING_30_DAYS) expiring30++;
      else if (status === DOCUMENT_STATUSES.EXPIRING_90_DAYS) expiring90++;
      else valid++;
    }

    return {
      expired,
      expiring7,
      expiring30,
      expiring90,
      valid,
      expiringSoon: expiring7 + expiring30 + expiring90,
      total: items.length,
    };
  }

  const pCounts = countBuckets(passports);
  const vCounts = countBuckets(visas);
  const wpCounts = countBuckets(workPermits);
  const docCounts = countBuckets(validUploadedDocs as { expiryDate: string }[]);

  const summary: ExpirySummary = {
    workforce: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
    },
    compliance: {
      expired:
        pCounts.expired + vCounts.expired + wpCounts.expired + docCounts.expired,
      expiring7Days:
        pCounts.expiring7 +
        vCounts.expiring7 +
        wpCounts.expiring7 +
        docCounts.expiring7,
      expiring30Days:
        pCounts.expiring30 +
        vCounts.expiring30 +
        wpCounts.expiring30 +
        docCounts.expiring30,
      expiring90Days:
        pCounts.expiring90 +
        vCounts.expiring90 +
        wpCounts.expiring90 +
        docCounts.expiring90,
      valid:
        pCounts.valid + vCounts.valid + wpCounts.valid + docCounts.valid,
      total:
        pCounts.total + vCounts.total + wpCounts.total + docCounts.total,
    },
    byType: {
      passport: {
        expired: pCounts.expired,
        expiringSoon: pCounts.expiringSoon,
      },
      visa: {
        expired: vCounts.expired,
        expiringSoon: vCounts.expiringSoon,
      },
      workPermit: {
        expired: wpCounts.expired,
        expiringSoon: wpCounts.expiringSoon,
      },
      uploadedDocuments: {
        expired: docCounts.expired,
        expiringSoon: docCounts.expiringSoon,
      },
    },
  };

  return jsonSuccess(c, summary);
});

/**
 * GET /api/expiry/documents
 * List expiring documents with search, filters, pagination, and urgency sorting.
 */
expiryRoutes.get("/documents", async (c) => {
  const user = c.get("user")!;
  const db = getDb(c.env.DB);

  let selfEmpId: string | null = null;
  if (user.role === ROLES.EMPLOYEE) {
    selfEmpId = await getSelfEmployeeId(db, user.sub, user.email);
    if (!selfEmpId) {
      return jsonSuccess(c, [], {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    }
  }

  const query = c.req.query();
  const statusFilter = query.status;
  const docTypeFilter = query.documentType || query.document_type;
  const deptFilter = query.departmentId || query.department;
  const branchFilter = query.branchId || query.branch;
  const nationalityFilter = query.nationality;
  const searchFilter = query.search?.trim().toLowerCase();

  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10) || 20));

  // Build employee condition
  const empConditions = [];
  if (selfEmpId) {
    empConditions.push(eq(employees.id, selfEmpId));
  }
  if (deptFilter && deptFilter !== "all") {
    empConditions.push(eq(employees.departmentId, deptFilter));
  }
  if (branchFilter && branchFilter !== "all") {
    empConditions.push(eq(employees.branchId, branchFilter));
  }
  if (nationalityFilter && nationalityFilter !== "all") {
    empConditions.push(
      like(sql`lower(${employees.nationality})`, `%${nationalityFilter.toLowerCase().trim()}%`)
    );
  }

  // Retrieve employees with department & branch details
  const empRows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      employeeIdNum: employees.employeeId,
      fullName: employees.fullName,
      nationality: employees.nationality,
      departmentId: employees.departmentId,
      departmentName: departments.name,
      branchId: employees.branchId,
      branchName: branches.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(branches, eq(employees.branchId, branches.id))
    .where(empConditions.length ? and(...empConditions) : undefined);

  if (!empRows.length) {
    return jsonSuccess(c, [], {
      page: 1,
      limit,
      total: 0,
      totalPages: 0,
    });
  }

  const empMap = new Map(empRows.map((e) => [e.id, e]));
  const employeeIds = empRows.map((e) => e.id);

  // Helper to query documents by employee list
  const allItems: ExpiringDocumentItem[] = [];

  // 1. Passports
  if (!docTypeFilter || docTypeFilter === "all" || docTypeFilter.toUpperCase() === "PASSPORT") {
    const passportRows = await db
      .select()
      .from(employeePassports)
      .where(sql`${employeePassports.employeeId} IN ${employeeIds}`);

    for (const p of passportRows) {
      const emp = empMap.get(p.employeeId);
      if (!emp) continue;

      const status = calculateDocumentStatus(p.expiryDate);
      const daysRemaining = calculateDaysRemaining(p.expiryDate) ?? 0;

      allItems.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        documentType: "PASSPORT",
        documentId: p.id,
        documentNumber: p.passportNumber,
        expiryDate: p.expiryDate,
        daysRemaining,
        status,
        department: emp.departmentName || null,
        branch: emp.branchName || null,
        nationality: emp.nationality || null,
      });
    }
  }

  // 2. Visas
  if (!docTypeFilter || docTypeFilter === "all" || docTypeFilter.toUpperCase() === "VISA") {
    const visaRows = await db
      .select()
      .from(employeeVisas)
      .where(sql`${employeeVisas.employeeId} IN ${employeeIds}`);

    for (const v of visaRows) {
      const emp = empMap.get(v.employeeId);
      if (!emp) continue;

      const status = calculateDocumentStatus(v.expiryDate);
      const daysRemaining = calculateDaysRemaining(v.expiryDate) ?? 0;

      allItems.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        documentType: "VISA",
        documentId: v.id,
        documentNumber: v.visaNumber,
        expiryDate: v.expiryDate,
        daysRemaining,
        status,
        department: emp.departmentName || null,
        branch: emp.branchName || null,
        nationality: emp.nationality || null,
      });
    }
  }

  // 3. Work Permits
  if (!docTypeFilter || docTypeFilter === "all" || docTypeFilter.toUpperCase() === "WORK_PERMIT") {
    const wpRows = await db
      .select()
      .from(employeeWorkPermits)
      .where(sql`${employeeWorkPermits.employeeId} IN ${employeeIds}`);

    for (const wp of wpRows) {
      const emp = empMap.get(wp.employeeId);
      if (!emp) continue;

      const status = calculateDocumentStatus(wp.expiryDate);
      const daysRemaining = calculateDaysRemaining(wp.expiryDate) ?? 0;

      allItems.push({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        documentType: "WORK_PERMIT",
        documentId: wp.id,
        documentNumber: wp.permitNumber,
        expiryDate: wp.expiryDate,
        daysRemaining,
        status,
        department: emp.departmentName || null,
        branch: emp.branchName || null,
        nationality: emp.nationality || null,
      });
    }
  }

  // 4. Uploaded Documents
  const uploadedDocTypeCondition =
    docTypeFilter && docTypeFilter !== "all"
      ? eq(employeeDocuments.documentType, docTypeFilter.toUpperCase())
      : undefined;

  const docConditions = [
    sql`${employeeDocuments.employeeId} IN ${employeeIds}`,
    isNotNull(employeeDocuments.expiryDate),
  ];
  if (uploadedDocTypeCondition) {
    docConditions.push(uploadedDocTypeCondition);
  }

  const uploadedRows = await db
    .select()
    .from(employeeDocuments)
    .where(and(...docConditions));

  for (const doc of uploadedRows) {
    if (!doc.expiryDate || doc.expiryDate.trim() === "") continue;

    const emp = empMap.get(doc.employeeId);
    if (!emp) continue;

    const status = calculateDocumentStatus(doc.expiryDate);
    const daysRemaining = calculateDaysRemaining(doc.expiryDate) ?? 0;

    allItems.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      documentType: doc.documentType,
      documentId: doc.id,
      documentNumber: doc.documentNumber || doc.originalFileName,
      expiryDate: doc.expiryDate,
      daysRemaining,
      status,
      department: emp.departmentName || null,
      branch: emp.branchName || null,
      nationality: emp.nationality || null,
    });
  }

  // Filter in memory for search & status
  let filtered = allItems;

  if (statusFilter && statusFilter !== "all") {
    filtered = filtered.filter((i) => i.status === statusFilter);
  }

  if (searchFilter) {
    filtered = filtered.filter(
      (i) =>
        i.employeeName.toLowerCase().includes(searchFilter) ||
        i.employeeCode.toLowerCase().includes(searchFilter) ||
        (i.documentNumber && i.documentNumber.toLowerCase().includes(searchFilter))
    );
  }

  // Sort by urgency:
  // EXPIRED -> 7 days -> 30 days -> 90 days -> VALID
  // Within the same category, earliest expiry first (daysRemaining ascending)
  filtered.sort((a, b) => {
    const rankA = STATUS_URGENCY_RANK[a.status] || 99;
    const rankB = STATUS_URGENCY_RANK[b.status] || 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.daysRemaining - b.daysRemaining;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return jsonSuccess(c, paginated, {
    page,
    limit,
    total,
    totalPages,
  });
});
