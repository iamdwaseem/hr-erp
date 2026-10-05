import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../db/client";
import { employeeDocuments } from "../db/schema/documents";
import { auditLogs } from "../db/schema/audit";
import {
  uploadDocumentMetadataSchema,
  updateVerificationStatusSchema,
} from "../../shared/schemas/document";
import {
  calculateDocumentStatus,
  calculateDaysRemaining,
  type EmployeeDocument,
  type DocumentType,
} from "../../shared/types/document";
import { jsonSuccess, jsonError } from "../utils/response";
import {
  resolveEmployeeAccess,
  checkDocumentWritePermission,
} from "./employee-documents";

export const employeeDocumentVaultRoutes = new Hono<AppContext>();

employeeDocumentVaultRoutes.use("*", requireAuth());

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validate magic bytes for PDF, JPEG, and PNG.
 */
function validateFileBuffer(
  buffer: ArrayBuffer
): { valid: boolean; detectedMime: string; error?: string } {
  if (buffer.byteLength === 0) {
    return { valid: false, detectedMime: "", error: "File is empty" };
  }
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      detectedMime: "",
      error: "File exceeds maximum allowed size of 10MB",
    };
  }

  const bytes = new Uint8Array(buffer.slice(0, 8));

  // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { valid: true, detectedMime: "application/pdf" };
  }

  // JPEG: 0xFF, 0xD8, 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  return {
    valid: false,
    detectedMime: "",
    error:
      "Unsupported file format. Only PDF, JPEG, and PNG files are allowed.",
  };
}

/**
 * Sanitize filename to avoid path traversal, special characters, or shell injections.
 */
function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "document.bin";
  const clean = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
  return clean.slice(-100) || "document.bin";
}

/**
 * Format document entity into EmployeeDocument output with dynamic status.
 */
function formatDocumentResponse(doc: typeof employeeDocuments.$inferSelect): EmployeeDocument {
  return {
    id: doc.id,
    employeeId: doc.employeeId,
    documentType: doc.documentType as DocumentType,
    documentNumber: doc.documentNumber,
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate,
    originalFileName: doc.originalFileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    verificationStatus: doc.verificationStatus as EmployeeDocument["verificationStatus"],
    status: doc.expiryDate ? calculateDocumentStatus(doc.expiryDate) : null,
    daysRemaining: doc.expiryDate ? calculateDaysRemaining(doc.expiryDate) : null,
    uploadedBy: doc.uploadedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * GET /api/employees/:id/documents
 * List all uploaded documents for an employee.
 */
employeeDocumentVaultRoutes.get("/:id/documents", async (c) => {
  const { employee, errorResponse } = await resolveEmployeeAccess(
    c,
    c.req.param("id")
  );
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const db = getDb(c.env.DB);
  const typeFilter = c.req.query("documentType");
  const verificationFilter = c.req.query("verificationStatus");

  const conditions = [eq(employeeDocuments.employeeId, employee.id)];
  if (typeFilter) {
    conditions.push(eq(employeeDocuments.documentType, typeFilter));
  }
  if (verificationFilter) {
    conditions.push(
      eq(employeeDocuments.verificationStatus, verificationFilter)
    );
  }

  const rows = await db
    .select()
    .from(employeeDocuments)
    .where(and(...conditions))
    .orderBy(desc(employeeDocuments.createdAt));

  const result = rows.map(formatDocumentResponse);
  return jsonSuccess(c, result);
});

/**
 * POST /api/employees/:id/documents
 * Upload document to Cloudflare R2 and store metadata in D1.
 * RBAC: ADMIN & HR only.
 */
employeeDocumentVaultRoutes.post("/:id/documents", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(
    c,
    c.req.param("id")
  );
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Request must be multipart/form-data",
      400
    );
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid form data payload", 400);
  }

  const rawFile = formData.get("file");
  if (!rawFile || typeof rawFile === "string") {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "A valid document file is required",
      400
    );
  }
  const file = rawFile as unknown as File;
  if (typeof file.arrayBuffer !== "function") {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "A valid document file is required",
      400
    );
  }

  // Parse and validate metadata
  const documentType = formData.get("documentType");
  const documentNumber = formData.get("documentNumber") || null;
  const issueDate = formData.get("issueDate") || null;
  const expiryDate = formData.get("expiryDate") || null;

  const metaParse = uploadDocumentMetadataSchema.safeParse({
    documentType: typeof documentType === "string" ? documentType : undefined,
    documentNumber: typeof documentNumber === "string" && documentNumber.trim() !== "" ? documentNumber.trim() : null,
    issueDate: typeof issueDate === "string" && issueDate.trim() !== "" ? issueDate.trim() : null,
    expiryDate: typeof expiryDate === "string" && expiryDate.trim() !== "" ? expiryDate.trim() : null,
  });

  if (!metaParse.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid document metadata",
      400,
      metaParse.error.flatten()
    );
  }

  const metaData = metaParse.data;

  // Read file and validate size & magic bytes
  const arrayBuffer = await file.arrayBuffer().catch(() => null);
  if (!arrayBuffer) {
    return jsonError(c, "VALIDATION_ERROR", "Failed to read file contents", 400);
  }

  const validation = validateFileBuffer(arrayBuffer);
  if (!validation.valid) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      validation.error || "Invalid file format or size",
      400
    );
  }

  const user = c.get("user")!;
  const db = getDb(c.env.DB);
  const now = new Date().toISOString();
  const documentId = `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const safeFileName = sanitizeFileName(file.name);
  const r2Key = `employees/${employee.id}/documents/${documentId}/${safeFileName}`;

  // 1. Upload to Cloudflare R2
  try {
    await c.env.BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: validation.detectedMime,
      },
      customMetadata: {
        employeeId: employee.id,
        documentId,
        originalFileName: file.name,
        uploadedBy: user.sub,
      },
    });
  } catch (err) {
    console.error("R2 Upload error:", err);
    return jsonError(
      c,
      "STORAGE_ERROR",
      "Failed to upload document file to storage",
      500
    );
  }

  // 2. Save metadata in D1
  try {
    await db.insert(employeeDocuments).values({
      id: documentId,
      employeeId: employee.id,
      documentType: metaData.documentType,
      documentNumber: metaData.documentNumber || null,
      issueDate: metaData.issueDate || null,
      expiryDate: metaData.expiryDate || null,
      r2Key,
      originalFileName: file.name || safeFileName,
      mimeType: validation.detectedMime,
      fileSize: arrayBuffer.byteLength,
      verificationStatus: "PENDING",
      uploadedBy: user.sub,
      createdAt: now,
      updatedAt: now,
    });
  } catch (dbErr) {
    console.error("D1 Insert error after R2 upload:", dbErr);
    // Cleanup R2 object if database insert failed
    await c.env.BUCKET.delete(r2Key).catch(() => {});
    return jsonError(
      c,
      "DATABASE_ERROR",
      "Failed to record document metadata",
      500
    );
  }

  // 3. Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: "DOCUMENT_UPLOAD",
      resourceType: "document",
      resourceId: documentId,
      details: JSON.stringify({
        employeeId: employee.id,
        documentType: metaData.documentType,
        documentNumber: metaData.documentNumber,
        originalFileName: file.name,
        fileSize: arrayBuffer.byteLength,
      }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: now,
    });
  } catch {
    // Non-blocking
  }

  const saved = await db
    .select()
    .from(employeeDocuments)
    .where(eq(employeeDocuments.id, documentId))
    .limit(1);

  return jsonSuccess(c, formatDocumentResponse(saved[0]), undefined, 201);
});

/**
 * GET /api/employees/:id/documents/:documentId/download
 * Download file from R2.
 */
employeeDocumentVaultRoutes.get(
  "/:id/documents/:documentId/download",
  async (c) => {
    const { employee, errorResponse } = await resolveEmployeeAccess(
      c,
      c.req.param("id")
    );
    if (errorResponse) return errorResponse;
    if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

    const documentId = c.req.param("documentId");
    const db = getDb(c.env.DB);

    const rows = await db
      .select()
      .from(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.id, documentId),
          eq(employeeDocuments.employeeId, employee.id)
        )
      )
      .limit(1);

    if (!rows.length) {
      return jsonError(c, "NOT_FOUND", "Document record not found", 404);
    }

    const doc = rows[0];

    const r2Object = await c.env.BUCKET.get(doc.r2Key);
    if (!r2Object || !r2Object.body) {
      return jsonError(
        c,
        "STORAGE_ERROR",
        "Document file not found in storage",
        404
      );
    }

    return new Response(r2Object.body, {
      status: 200,
      headers: {
        "Content-Type": r2Object.httpMetadata?.contentType || doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalFileName)}"`,
        "Content-Length": String(doc.fileSize),
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  }
);

/**
 * GET /api/employees/:id/documents/:documentId
 * Get document metadata (or download if ?download=true).
 */
employeeDocumentVaultRoutes.get("/:id/documents/:documentId", async (c) => {
  const { employee, errorResponse } = await resolveEmployeeAccess(
    c,
    c.req.param("id")
  );
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const documentId = c.req.param("documentId");
  const db = getDb(c.env.DB);

  const rows = await db
    .select()
    .from(employeeDocuments)
    .where(
      and(
        eq(employeeDocuments.id, documentId),
        eq(employeeDocuments.employeeId, employee.id)
      )
    )
    .limit(1);

  if (!rows.length) {
    return jsonError(c, "NOT_FOUND", "Document record not found", 404);
  }

  const doc = rows[0];

  const downloadRequested =
    c.req.query("download") === "true" || c.req.query("download") === "1";
  if (downloadRequested) {
    const r2Object = await c.env.BUCKET.get(doc.r2Key);
    if (!r2Object || !r2Object.body) {
      return jsonError(
        c,
        "STORAGE_ERROR",
        "Document file not found in storage",
        404
      );
    }

    return new Response(r2Object.body, {
      status: 200,
      headers: {
        "Content-Type": r2Object.httpMetadata?.contentType || doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalFileName)}"`,
        "Content-Length": String(doc.fileSize),
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  }

  return jsonSuccess(c, formatDocumentResponse(doc));
});

/**
 * DELETE /api/employees/:id/documents/:documentId
 * Delete document from R2 and D1.
 * RBAC: ADMIN & HR only.
 */
employeeDocumentVaultRoutes.delete("/:id/documents/:documentId", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(
    c,
    c.req.param("id")
  );
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const documentId = c.req.param("documentId");
  const db = getDb(c.env.DB);
  const user = c.get("user")!;

  const rows = await db
    .select()
    .from(employeeDocuments)
    .where(
      and(
        eq(employeeDocuments.id, documentId),
        eq(employeeDocuments.employeeId, employee.id)
      )
    )
    .limit(1);

  if (!rows.length) {
    return jsonError(c, "NOT_FOUND", "Document record not found", 404);
  }

  const doc = rows[0];

  // 1. Remove from R2
  try {
    await c.env.BUCKET.delete(doc.r2Key);
  } catch (r2Err) {
    console.error("R2 Delete error:", r2Err);
    return jsonError(
      c,
      "STORAGE_ERROR",
      "Failed to delete document file from storage",
      500
    );
  }

  // 2. Remove metadata from D1
  try {
    await db
      .delete(employeeDocuments)
      .where(eq(employeeDocuments.id, doc.id));
  } catch (dbErr) {
    console.error(
      `[CRITICAL] R2 object ${doc.r2Key} deleted but D1 deletion failed for doc ${doc.id}:`,
      dbErr
    );
    return jsonError(
      c,
      "DATABASE_ERROR",
      "File was deleted from storage but metadata removal failed",
      500
    );
  }

  // 3. Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: "DOCUMENT_DELETE",
      resourceType: "document",
      resourceId: doc.id,
      details: JSON.stringify({
        employeeId: employee.id,
        documentType: doc.documentType,
        originalFileName: doc.originalFileName,
      }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Non-blocking
  }

  return jsonSuccess(c, {
    id: doc.id,
    deleted: true,
    message: "Document deleted successfully",
  });
});

/**
 * PUT /api/employees/:id/documents/:documentId/verification
 * Update document verification status (PENDING, VERIFIED, REJECTED).
 * RBAC: ADMIN & HR only.
 */
employeeDocumentVaultRoutes.put(
  "/:id/documents/:documentId/verification",
  async (c) => {
    const writeErr = checkDocumentWritePermission(c);
    if (writeErr) return writeErr;

    const { employee, errorResponse } = await resolveEmployeeAccess(
      c,
      c.req.param("id")
    );
    if (errorResponse) return errorResponse;
    if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

    const documentId = c.req.param("documentId");
    const db = getDb(c.env.DB);
    const user = c.get("user")!;

    const body = await c.req.json().catch(() => null);
    const parseResult = updateVerificationStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return jsonError(
        c,
        "VALIDATION_ERROR",
        "Invalid verification status update payload",
        400,
        parseResult.error.flatten()
      );
    }

    const rows = await db
      .select()
      .from(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.id, documentId),
          eq(employeeDocuments.employeeId, employee.id)
        )
      )
      .limit(1);

    if (!rows.length) {
      return jsonError(c, "NOT_FOUND", "Document record not found", 404);
    }

    const doc = rows[0];
    const newStatus = parseResult.data.status;
    const now = new Date().toISOString();

    await db
      .update(employeeDocuments)
      .set({
        verificationStatus: newStatus,
        updatedAt: now,
      })
      .where(eq(employeeDocuments.id, doc.id));

    // Audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.sub,
        action: "DOCUMENT_VERIFY",
        resourceType: "document",
        resourceId: doc.id,
        details: JSON.stringify({
          employeeId: employee.id,
          previousStatus: doc.verificationStatus,
          newStatus,
        }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    const updated = await db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.id, doc.id))
      .limit(1);

    return jsonSuccess(c, formatDocumentResponse(updated[0]));
  }
);
