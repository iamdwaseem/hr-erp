// Verification test suite for HR ERP MVP Phase 6 (Audit Log Viewer & Final Polish)

const BASE_URL = "http://localhost:8787/api";

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
  console.log("=== STARTING HR ERP AUDIT LOG & RBAC VERIFICATION SUITE ===\n");
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

  // Test 1: ADMIN can access audit logs
  {
    const res = await request("/audit-logs", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      res.status === 200 && Array.isArray(res.data?.data) && res.data?.meta,
      "Test 1: ADMIN can access audit logs",
      `Status: ${res.status}`
    );
  }

  // Test 2: HR can access audit logs
  {
    const res = await request("/audit-logs", {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      res.status === 200 && Array.isArray(res.data?.data) && res.data?.meta,
      "Test 2: HR can access audit logs",
      `Status: ${res.status}`
    );
  }

  // Test 3: MANAGER gets 403 Forbidden
  {
    const res = await request("/audit-logs", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(
      res.status === 403,
      "Test 3: MANAGER gets 403 Forbidden for audit logs",
      `Status: ${res.status}`
    );
  }

  // Test 4: EMPLOYEE gets 403 Forbidden
  {
    const res = await request("/audit-logs", {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      res.status === 403,
      "Test 4: EMPLOYEE gets 403 Forbidden for audit logs",
      `Status: ${res.status}`
    );
  }

  // Test 5: Pagination works
  {
    const res = await request("/audit-logs?page=1&limit=2", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const meta = res.data?.meta;
    assert(
      res.status === 200 && items.length <= 2 && meta?.page === 1 && meta?.limit === 2,
      "Test 5: Pagination works with page & limit params",
      `Items: ${items.length}, meta: ${JSON.stringify(meta)}`
    );
  }

  // Test 6: Newest-first ordering works by default
  {
    const res = await request("/audit-logs?limit=5", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    let isSorted = true;
    for (let i = 0; i < items.length - 1; i++) {
      if (new Date(items[i].timestamp).getTime() < new Date(items[i + 1].timestamp).getTime()) {
        isSorted = false;
        break;
      }
    }
    assert(
      res.status === 200 && items.length >= 2 && isSorted,
      "Test 6: Default sorting is newest-first (descending timestamp)",
      `Item count: ${items.length}`
    );
  }

  // Test 7: Action filter works
  {
    const res = await request("/audit-logs?action=LOGIN", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const allLogin = items.length > 0 && items.every((i) => i.action.includes("LOGIN"));
    assert(
      res.status === 200 && allLogin,
      "Test 7: Action filter correctly returns matching actions",
      `Found: ${items.length}`
    );
  }

  // Test 8: Entity filter works
  {
    const res = await request("/audit-logs?entityType=employee", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const allEmployee = items.length > 0 && items.every((i) => i.entityType === "employee");
    assert(
      res.status === 200 && allEmployee,
      "Test 8: Entity filter correctly returns employee resource types",
      `Found: ${items.length}`
    );
  }

  // Test 9: Actor filter works
  {
    const res = await request("/audit-logs?actor=Administrator", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const allAdmin = items.length > 0 && items.every((i) => i.actor.fullName.includes("Administrator"));
    assert(
      res.status === 200 && allAdmin,
      "Test 9: Actor filter correctly filters by actor name",
      `Found: ${items.length}`
    );
  }

  // Test 10: Search works
  {
    const res = await request("/audit-logs?search=LOGIN", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    assert(
      res.status === 200 && items.length > 0,
      "Test 10: Free-text search returns matching audit records",
      `Found: ${items.length}`
    );
  }

  // Test 11: Existing audit records are returned
  {
    const res = await request("/audit-logs", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    assert(
      res.status === 200 && items.length > 0,
      "Test 11: Existing mutation audit records are present",
      `Total returned: ${items.length}`
    );
  }

  // Set up a test employee to verify mutation audit logs
  const testCode = `AUD-${Date.now().toString().slice(-6)}`;
  const testEmpId = `EMP-${Date.now().toString().slice(-6)}`;
  let createdEmployeeId = null;

  // Test 12: Employee creation creates an audit record
  {
    const empRes = await request("/employees", {
      method: "POST",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        employeeCode: testCode,
        employeeId: testEmpId,
        fullName: "Audit Test Worker",
        joiningDate: "2024-01-15",
        departmentId: "dept_eng",
      }),
    });
    createdEmployeeId = empRes.data?.data?.id;

    const auditRes = await request(`/audit-logs?search=${testCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = auditRes.data?.data || [];
    const found = items.some(
      (i) => i.action === "EMPLOYEE_CREATE" && i.entityType === "employee" && i.entityId === createdEmployeeId
    );
    assert(
      empRes.status === 201 && found,
      "Test 12: Employee creation generates an EMPLOYEE_CREATE audit record",
      `Employee ID: ${createdEmployeeId}`
    );
  }

  // Test 13: Employee update creates an audit record
  {
    const updateRes = await request(`/employees/${createdEmployeeId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        fullName: "Audit Test Worker Updated",
      }),
    });

    const auditRes = await request(`/audit-logs?search=${createdEmployeeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = auditRes.data?.data || [];
    const found = items.some(
      (i) => i.action === "EMPLOYEE_UPDATE" && i.entityType === "employee" && i.entityId === createdEmployeeId
    );
    assert(
      updateRes.status === 200 && found,
      "Test 13: Employee update generates an EMPLOYEE_UPDATE audit record",
      JSON.stringify(items.map((i) => i.action))
    );
  }

  // Test 14: Document upload creates an audit record
  let uploadedDocId = null;
  {
    const pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Title (Audit Test Document)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF\n";
    const pdfBytes = Buffer.from(pdfContent);
    const formData = new FormData();
    formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "audit_test.pdf");
    formData.append("documentType", "OTHER");
    formData.append("documentNumber", "CERT-AUDIT-001");

    const uploadRes = await request(`/employees/${createdEmployeeId}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: formData,
    });
    uploadedDocId = uploadRes.data?.data?.id;

    const auditRes = await request(`/audit-logs?search=${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = auditRes.data?.data || [];
    const found = items.some(
      (i) => i.action === "DOCUMENT_UPLOAD" && i.entityType === "document" && i.entityId === uploadedDocId
    );
    assert(
      uploadRes.status === 201 && found,
      "Test 14: Document upload generates a DOCUMENT_UPLOAD audit record",
      `Doc ID: ${uploadedDocId}`
    );
  }

  // Test 15: Document verification creates an audit record
  {
    const verifyRes = await request(`/employees/${createdEmployeeId}/documents/${uploadedDocId}/verification`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "VERIFIED" }),
    });

    const auditRes = await request(`/audit-logs?search=${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = auditRes.data?.data || [];
    const found = items.some(
      (i) => i.action === "DOCUMENT_VERIFY" && i.entityType === "document" && i.entityId === uploadedDocId
    );
    assert(
      verifyRes.status === 200 && found,
      "Test 15: Document verification generates a DOCUMENT_VERIFY audit record",
      JSON.stringify(items.map((i) => i.action))
    );
  }

  // Test 16: Document deletion creates an audit record
  {
    const delRes = await request(`/employees/${createdEmployeeId}/documents/${uploadedDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const auditRes = await request(`/audit-logs?search=${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = auditRes.data?.data || [];
    const found = items.some(
      (i) => i.action === "DOCUMENT_DELETE" && i.entityType === "document" && i.entityId === uploadedDocId
    );
    assert(
      delRes.status === 200 && found,
      "Test 16: Document deletion generates a DOCUMENT_DELETE audit record",
      JSON.stringify(items.map((i) => i.action))
    );
  }

  // Test 17: Passport, Visa, Work Permit mutations remain audited
  {
    // A. Passport
    const passRes = await request(`/employees/${createdEmployeeId}/passport`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        passportNumber: `P-AUD-${Date.now().toString().slice(-4)}`,
        nationality: "Canadian",
        issueDate: "2020-01-01",
        expiryDate: "2030-01-01",
      }),
    });

    // B. Visa
    const visaRes = await request(`/employees/${createdEmployeeId}/visa`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        visaNumber: `V-AUD-${Date.now().toString().slice(-4)}`,
        visaType: "Employment",
        issueDate: "2022-01-01",
        expiryDate: "2026-12-31",
      }),
    });

    // C. Work Permit
    const wpRes = await request(`/employees/${createdEmployeeId}/work-permit`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        permitNumber: `WP-AUD-${Date.now().toString().slice(-4)}`,
        issueDate: "2022-01-01",
        expiryDate: "2026-12-31",
      }),
    });

    const auditRes = await request(`/audit-logs?search=${createdEmployeeId}&limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const actions = (auditRes.data?.data || []).map((i) => i.action);
    const hasPassport = actions.some((a) => a.includes("PASSPORT"));
    const hasVisa = actions.some((a) => a.includes("VISA"));
    const hasWp = actions.some((a) => a.includes("WORK_PERMIT"));

    assert(
      passRes.status === 200 && visaRes.status === 200 && wpRes.status === 200 && hasPassport && hasVisa && hasWp,
      "Test 17: Passport, Visa, and Work Permit mutations remain audited",
      `Actions recorded: ${actions.join(", ")}`
    );
  }

  // Test 18: Sensitive secrets are NOT exposed in audit data
  {
    const res = await request("/audit-logs?limit=50", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const items = res.data?.data || [];
    const sensitiveKeys = ["password", "password_hash", "jwt", "secret", "cookie", "token"];
    let leakDetected = false;

    for (const item of items) {
      const serialized = JSON.stringify(item).toLowerCase();
      for (const secret of sensitiveKeys) {
        // Look for keys like "password": or "secret":
        if (serialized.includes(`"${secret}":`)) {
          leakDetected = true;
          console.error(`Sensitive key detected in audit item ${item.id}: ${secret}`);
          break;
        }
      }
      if (leakDetected) break;
    }

    assert(
      !leakDetected && items.length > 0,
      "Test 18: Sensitive secrets (passwords, JWTs, hashes) are strictly excluded from audit payloads",
      `Checked ${items.length} items`
    );
  }

  console.log(`\n=== AUDIT MODULE RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
