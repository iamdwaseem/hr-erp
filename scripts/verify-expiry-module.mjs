// Verification test suite for HR ERP MVP Phase 5 (Document Expiry Tracking & HR Action Center)

const BASE_URL = "http://localhost:8787/api";

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function request(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, data };
  } else {
    const text = await res.text().catch(() => "");
    return { status: res.status, headers: res.headers, text };
  }
}

async function runTests() {
  console.log("=== STARTING HR ERP EXPIRY TRACKING & ACTION CENTER VERIFICATION SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}: ${details}`);
      failed++;
    }
  }

  // 1. Authenticate all 4 roles
  const loginAdmin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }),
  });
  const adminToken = loginAdmin.data?.data?.token;

  const loginHr = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr@hr-erp.local", password: "HrPassword123!" }),
  });
  const hrToken = loginHr.data?.data?.token;

  const loginManager = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "manager@hr-erp.local", password: "ManagerPassword123!" }),
  });
  const managerToken = loginManager.data?.data?.token;

  const loginEmployee = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "employee@hr-erp.local", password: "EmployeePassword123!" }),
  });
  const employeeToken = loginEmployee.data?.data?.token;

  assert(
    adminToken && hrToken && managerToken && employeeToken,
    "Auth: All 4 roles authenticated successfully"
  );

  // Setup predictable test document records for emp_001 and emp_002
  // A. emp_001 Passport: Expired 10 days ago
  await request("/employees/emp_001/passport", {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      passportNumber: "PASS-EXP-001",
      nationality: "United States",
      issueDate: "2015-01-01",
      expiryDate: addDays(-10),
    }),
  });

  // B. emp_001 Visa: Expiring in 4 days (EXPIRING_7_DAYS)
  await request("/employees/emp_001/visa", {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      visaNumber: "VISA-7D-001",
      visaType: "Employment",
      issueDate: "2024-01-01",
      expiryDate: addDays(4),
    }),
  });

  // C. emp_002 Visa: Expiring in 20 days (EXPIRING_30_DAYS)
  await request("/employees/emp_002/visa", {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      visaNumber: "VISA-30D-002",
      visaType: "Employment",
      issueDate: "2024-01-01",
      expiryDate: addDays(20),
    }),
  });

  // D. emp_002 Work Permit: Expiring in 60 days (EXPIRING_90_DAYS)
  await request("/employees/emp_002/work-permit", {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      permitNumber: "WP-90D-002",
      issueDate: "2024-01-01",
      expiryDate: addDays(60),
    }),
  });

  // E. emp_001 Work Permit: Valid (> 90 days, e.g. 180 days)
  await request("/employees/emp_001/work-permit", {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      permitNumber: "WP-VAL-001",
      issueDate: "2025-01-01",
      expiryDate: addDays(180),
    }),
  });

  // F. Uploaded Document WITH expiry date (expiring in 15 days)
  const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF\n");
  const formWithExpiry = new FormData();
  formWithExpiry.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "expiring_doc.pdf");
  formWithExpiry.append("documentType", "OTHER");
  formWithExpiry.append("documentNumber", "DOC-WITH-EXP");
  formWithExpiry.append("issueDate", "2025-01-01");
  formWithExpiry.append("expiryDate", addDays(15));

  const uploadWithExp = await request("/employees/emp_001/documents", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formWithExpiry,
  });
  const uploadedDocWithExpId = uploadWithExp.data?.data?.id;

  // G. Uploaded Document WITHOUT expiry date
  const formWithoutExpiry = new FormData();
  formWithoutExpiry.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "no_expiry_doc.pdf");
  formWithoutExpiry.append("documentType", "OTHER");
  formWithoutExpiry.append("documentNumber", "DOC-NO-EXP");

  const uploadWithoutExp = await request("/employees/emp_001/documents", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formWithoutExpiry,
  });
  const uploadedDocNoExpId = uploadWithoutExp.data?.data?.id;

  // Test 1: Expired passport appears in expired results
  {
    const res = await request("/expiry/documents?status=EXPIRED", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const found = items.some((i) => i.documentNumber === "PASS-EXP-001" && i.status === "EXPIRED");
    assert(
      res.status === 200 && found,
      "Test 1: Expired passport appears in EXPIRED status query",
      JSON.stringify(res.data)
    );
  }

  // Test 2: 4-day visa appears in EXPIRING_7_DAYS
  {
    const res = await request("/expiry/documents?status=EXPIRING_7_DAYS", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const found = items.some((i) => i.documentNumber === "VISA-7D-001" && i.status === "EXPIRING_7_DAYS");
    assert(
      res.status === 200 && found,
      "Test 2: 4-day visa appears in EXPIRING_7_DAYS",
      JSON.stringify(res.data)
    );
  }

  // Test 3: 20-day visa appears in EXPIRING_30_DAYS
  {
    const res = await request("/expiry/documents?status=EXPIRING_30_DAYS", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const found = items.some((i) => i.documentNumber === "VISA-30D-002" && i.status === "EXPIRING_30_DAYS");
    assert(
      res.status === 200 && found,
      "Test 3: 20-day visa appears in EXPIRING_30_DAYS",
      JSON.stringify(res.data)
    );
  }

  // Test 4: 60-day work permit appears in EXPIRING_90_DAYS
  {
    const res = await request("/expiry/documents?status=EXPIRING_90_DAYS", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const found = items.some((i) => i.documentNumber === "WP-90D-002" && i.status === "EXPIRING_90_DAYS");
    assert(
      res.status === 200 && found,
      "Test 4: 60-day work permit appears in EXPIRING_90_DAYS",
      JSON.stringify(res.data)
    );
  }

  // Test 5: >90-day document is VALID
  {
    const res = await request("/expiry/documents?status=VALID", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const found = items.some((i) => i.documentNumber === "WP-VAL-001" && i.status === "VALID");
    assert(
      res.status === 200 && found,
      "Test 5: >90-day work permit appears in VALID status query",
      JSON.stringify(res.data)
    );
  }

  // Test 6: Uploaded document with expiry date appears correctly
  {
    const res = await request("/expiry/documents", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const found = items.some((i) => i.documentId === uploadedDocWithExpId);
    assert(
      res.status === 200 && found,
      "Test 6: Uploaded document with expiry date appears in expiry documents",
      JSON.stringify(res.data)
    );
  }

  // Test 7: Uploaded document without expiry date is excluded
  {
    const res = await request("/expiry/documents", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const found = items.some((i) => i.documentId === uploadedDocNoExpId);
    assert(
      res.status === 200 && !found,
      "Test 7: Uploaded document without expiry date is excluded from expiry calculations",
      `Found: ${found}`
    );
  }

  // Test 8: Expiry summary counts are correct and non-zero
  {
    const res = await request("/expiry/summary", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summary = res.data?.data;
    const validSummary =
      res.status === 200 &&
      summary &&
      summary.workforce.totalEmployees > 0 &&
      summary.compliance.expired >= 1 &&
      summary.compliance.expiring7Days >= 1 &&
      summary.compliance.expiring30Days >= 1 &&
      summary.compliance.expiring90Days >= 1 &&
      summary.byType.passport.expired >= 1 &&
      summary.byType.visa.expiringSoon >= 1;

    assert(
      validSummary,
      "Test 8: Expiry summary returns aggregated workforce, compliance, and byType metrics",
      JSON.stringify(summary)
    );
  }

  // Test 9: Employee search works
  {
    const res = await request("/expiry/documents?search=John", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const allJohn = items.length > 0 && items.every((i) => i.employeeName.includes("John"));
    assert(
      res.status === 200 && allJohn,
      "Test 9: Search by employee name works in expiry queue",
      JSON.stringify(res.data)
    );
  }

  // Test 10: Department filter works
  {
    const res = await request("/expiry/documents?department=dept_eng", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const valid = res.status === 200 && items.length > 0 && items.every((i) => i.department === "Engineering");
    assert(
      valid,
      "Test 10: Department filter works in expiry queue",
      JSON.stringify(res.data)
    );
  }

  // Test 11: Branch filter works
  {
    const res = await request("/expiry/documents?branch=branch_hq", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    assert(
      res.status === 200 && items.length > 0,
      "Test 11: Branch filter works in expiry queue",
      `Count: ${items.length}`
    );
  }

  // Test 12: Nationality filter works
  {
    const res = await request("/expiry/documents?nationality=Emirati", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const valid = items.length > 0 && items.every((i) => i.nationality === "Emirati");
    assert(
      res.status === 200 && valid,
      "Test 12: Nationality filter works in expiry queue",
      `Count: ${items.length}`
    );
  }

  // Test 13: Status filter works
  {
    const res = await request("/expiry/documents?status=EXPIRING_7_DAYS", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const all7Days = items.length > 0 && items.every((i) => i.status === "EXPIRING_7_DAYS");
    assert(
      res.status === 200 && all7Days,
      "Test 13: Status filter exclusively returns matching status",
      `Count: ${items.length}`
    );
  }

  // Test 14: Document type filter works
  {
    const res = await request("/expiry/documents?documentType=PASSPORT", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const allPassports = items.length > 0 && items.every((i) => i.documentType === "PASSPORT");
    assert(
      res.status === 200 && allPassports,
      "Test 14: Document type filter exclusively returns PASSPORT documents",
      `Count: ${items.length}`
    );
  }

  // Test 15: Results are sorted by urgency (EXPIRED first, then 7d, 30d, 90d, VALID)
  {
    const res = await request("/expiry/documents", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const rankMap = {
      EXPIRED: 1,
      EXPIRING_7_DAYS: 2,
      EXPIRING_30_DAYS: 3,
      EXPIRING_90_DAYS: 4,
      VALID: 5,
    };
    let sortedCorrectly = true;
    for (let i = 0; i < items.length - 1; i++) {
      const rankCurr = rankMap[items[i].status] || 99;
      const rankNext = rankMap[items[i + 1].status] || 99;
      if (rankCurr > rankNext) {
        sortedCorrectly = false;
        break;
      }
      if (rankCurr === rankNext && items[i].daysRemaining > items[i + 1].daysRemaining) {
        sortedCorrectly = false;
        break;
      }
    }
    assert(
      res.status === 200 && items.length >= 3 && sortedCorrectly,
      "Test 15: Expiry list is sorted by urgency: EXPIRED -> 7d -> 30d -> 90d -> VALID",
      `Sorted: ${sortedCorrectly}`
    );
  }

  // Test 16: ADMIN sees all authorized data
  {
    const res = await request("/expiry/summary", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      res.status === 200 && res.data?.data?.workforce?.totalEmployees >= 2,
      "Test 16: ADMIN sees company-wide workforce and compliance data",
      JSON.stringify(res.data?.data?.workforce)
    );
  }

  // Test 17: HR sees all authorized data
  {
    const res = await request("/expiry/summary", {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      res.status === 200 && res.data?.data?.workforce?.totalEmployees >= 2,
      "Test 17: HR sees company-wide workforce and compliance data",
      JSON.stringify(res.data?.data?.workforce)
    );
  }

  // Test 18: MANAGER sees authorized company document expiry data
  {
    const res = await request("/expiry/documents", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(
      res.status === 200 && Array.isArray(res.data?.data),
      "Test 18: MANAGER can view authorized document expiry items",
      `Count: ${res.data?.data?.length}`
    );
  }

  // Test 19: EMPLOYEE sees only own expiry information (no cross-employee leakage)
  {
    const resDocs = await request("/expiry/documents", {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const items = resDocs.data?.data || [];
    // emp_001 is John Doe (employee's record). emp_002 is Sarah Connor (HR record).
    const containsOtherEmp = items.some((i) => i.employeeId === "emp_002");
    const containsOwnEmp = items.some((i) => i.employeeId === "emp_001");
    assert(
      resDocs.status === 200 && containsOwnEmp && !containsOtherEmp,
      "Test 19: EMPLOYEE sees only own document expiry records (no other employees)",
      `ContainsOwn: ${containsOwnEmp}, ContainsOther: ${containsOtherEmp}`
    );

    const resSummary = await request("/expiry/summary", {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const empTotal = resSummary.data?.data?.workforce?.totalEmployees;
    assert(
      resSummary.status === 200 && empTotal === 1,
      "Test 19b: EMPLOYEE summary is scoped to 1 employee (self-record)",
      `Total: ${empTotal}`
    );
  }

  // Cleanup temporary test uploaded documents
  if (uploadedDocWithExpId) {
    await request(`/employees/emp_001/documents/${uploadedDocWithExpId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }
  if (uploadedDocNoExpId) {
    await request(`/employees/emp_001/documents/${uploadedDocNoExpId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  console.log(`\n=== EXPIRY MODULE RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
