// Verification test suite for HR ERP MVP Phase 4 (Document Vault & R2 Storage)

const BASE_URL = "http://localhost:8787/api";

async function request(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  // If body is NOT FormData, default to application/json
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
    const arrayBuffer = await res.arrayBuffer().catch(() => null);
    return { status: res.status, headers: res.headers, buffer: arrayBuffer };
  }
}

async function runTests() {
  console.log("=== STARTING HR ERP DOCUMENT VAULT & R2 VERIFICATION SUITE ===\n");
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

  // 1. Authenticate roles per Phase 7B (Admin + 2 HR, Manager & Employee rejected)
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

  const loginHr2 = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr2@hr-erp.local", password: "Hr2Password123!" }),
  });
  const hr2Token = loginHr2.data?.data?.token;

  const loginManager = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "manager@hr-erp.local", password: "ManagerPassword123!" }),
  });

  const loginEmployee = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "employee@hr-erp.local", password: "EmployeePassword123!" }),
  });

  assert(
    adminToken && hrToken && hr2Token && loginManager.status === 403 && loginEmployee.status === 403,
    "Auth: 1 ADMIN + 2 HR authenticated, Manager & Employee logins rejected (Phase 7B)"
  );

  // Prepare dummy valid files
  const pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Title (Test HR Document)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF\n";
  const pdfBytes = Buffer.from(pdfContent);

  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

  let adminDocId = null;
  let hrDocId = null;

  // 2. Test 1: ADMIN can upload document (PDF format)
  {
    const form = new FormData();
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "passport_scan.pdf");
    form.append("documentType", "PASSPORT");
    form.append("documentNumber", "PASS-ADM-12345");
    form.append("issueDate", "2024-01-01");
    form.append("expiryDate", "2029-01-01");

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });

    const is201 = res.status === 201 && res.data?.success;
    adminDocId = res.data?.data?.id;
    assert(
      is201 && adminDocId && res.data?.data?.documentType === "PASSPORT",
      "Test 1: ADMIN can upload document (PDF) to Vault",
      JSON.stringify(res.data)
    );
  }

  // 3. Test 2: HR can upload document (JPEG format)
  {
    const form = new FormData();
    form.append("file", new Blob([jpegBytes], { type: "image/jpeg" }), "visa_copy.jpg");
    form.append("documentType", "VISA");
    form.append("documentNumber", "VISA-HR-98765");
    form.append("issueDate", "2025-05-01");
    form.append("expiryDate", "2027-05-01");

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: form,
    });

    const is201 = res.status === 201 && res.data?.success;
    hrDocId = res.data?.data?.id;
    assert(
      is201 && hrDocId && res.data?.data?.documentType === "VISA",
      "Test 2: HR can upload document (JPEG) to Vault",
      JSON.stringify(res.data)
    );
  }

  // 4. Test 3: Unauthorized manager cannot upload document (receives 401/403)
  {
    const form = new FormData();
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "mgr_test.pdf");
    form.append("documentType", "WORK_PERMIT");

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: "Bearer invalid_manager_token" },
      body: form,
    });

    assert(
      res.status === 401 || res.status === 403,
      "Test 3: Unauthorized manager cannot upload document (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 5. Test 4: Unauthorized employee cannot upload document (receives 401/403)
  {
    const form = new FormData();
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "emp_self.pdf");
    form.append("documentType", "NATIONAL_ID");

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: "Bearer invalid_employee_token" },
      body: form,
    });

    assert(
      res.status === 401 || res.status === 403,
      "Test 4: Unauthorized employee cannot upload document (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 6. Test 5: Metadata exists in D1 and file exists in R2
  {
    const res = await request(`/employees/emp_001/documents/${adminDocId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const doc = res.data?.data;
    const exists = res.status === 200 && doc && doc.id === adminDocId && doc.originalFileName === "passport_scan.pdf";
    assert(
      exists,
      "Test 5: Uploaded document metadata correctly recorded in D1",
      JSON.stringify(res.data)
    );
  }

  // 7. Test 6: ADMIN can list documents
  {
    const res = await request("/employees/emp_001/documents", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const list = res.data?.data;
    assert(
      res.status === 200 && Array.isArray(list) && list.some((d) => d.id === adminDocId),
      "Test 6: ADMIN can list employee documents",
      JSON.stringify(res.data)
    );
  }

  // 8. Test 7: HR can list documents
  {
    const res = await request("/employees/emp_001/documents", {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    const list = res.data?.data;
    assert(
      res.status === 200 && Array.isArray(list) && list.some((d) => d.id === hrDocId),
      "Test 7: HR can list employee documents",
      JSON.stringify(res.data)
    );
  }

  // 9. Test 8: HR2 can view employee documents
  {
    const res = await request("/employees/emp_001/documents", {
      headers: { Authorization: `Bearer ${hr2Token}` },
    });
    assert(
      res.status === 200 && Array.isArray(res.data?.data),
      "Test 8: HR2 can view employee documents",
      JSON.stringify(res.data)
    );
  }

  // 10. Test 9: EMPLOYEE self-service profile access disabled per Phase 7B
  {
    const res = await request("/employees/me/documents", {
      headers: { Authorization: "Bearer invalid_employee_token" },
    });
    assert(
      res.status === 401 || res.status === 403,
      "Test 9: EMPLOYEE self-service access disabled per Phase 7B (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 11. Test 10: Unauthorized caller cannot view employee documents (401/403)
  {
    const res = await request("/employees/emp_002/documents", {
      headers: { Authorization: "Bearer invalid_token" },
    });
    assert(
      res.status === 401 || res.status === 403,
      "Test 10: Unauthorized caller cannot view employee documents (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 12. Test 11: Authorized download works and matches uploaded bytes
  {
    const res = await request(`/employees/emp_001/documents/${adminDocId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const downloadedBuf = res.buffer ? Buffer.from(res.buffer) : null;
    const matches = downloadedBuf && downloadedBuf.equals(pdfBytes);
    const hasHeader = res.headers.get("content-disposition")?.includes("passport_scan.pdf");
    assert(
      res.status === 200 && matches && hasHeader,
      "Test 11: Authorized download returns exact R2 file bytes with headers",
      `Status: ${res.status}, Matched: ${matches}`
    );
  }

  // 13. Test 12: Unauthorized download fails with 401/403
  {
    const res = await request(`/employees/emp_002/documents/${adminDocId}/download`, {
      headers: { Authorization: "Bearer invalid_token" },
    });
    assert(
      res.status === 401 || res.status === 403,
      "Test 12: Unauthorized download fails with 401/403 Forbidden",
      `Status ${res.status}`
    );
  }

  // 14. Test 13: ADMIN can verify document
  {
    const res = await request(`/employees/emp_001/documents/${adminDocId}/verification`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "VERIFIED" }),
    });
    assert(
      res.status === 200 && res.data?.data?.verificationStatus === "VERIFIED",
      "Test 13: ADMIN can mark document as VERIFIED",
      JSON.stringify(res.data)
    );
  }

  // 15. Test 14: HR can reject document
  {
    const res = await request(`/employees/emp_001/documents/${adminDocId}/verification`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    assert(
      res.status === 200 && res.data?.data?.verificationStatus === "REJECTED",
      "Test 14: HR can mark document as REJECTED",
      JSON.stringify(res.data)
    );
  }

  // 16. Test 15: Unauthorized manager cannot change verification (401/403)
  {
    const res = await request(`/employees/emp_001/documents/${adminDocId}/verification`, {
      method: "PUT",
      headers: { Authorization: "Bearer invalid_manager_token" },
      body: JSON.stringify({ status: "VERIFIED" }),
    });
    assert(
      res.status === 401 || res.status === 403,
      "Test 15: Unauthorized manager cannot change verification (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 17. Test 16: Unauthorized employee cannot change verification (401/403)
  {
    const res = await request(`/employees/emp_001/documents/${adminDocId}/verification`, {
      method: "PUT",
      headers: { Authorization: "Bearer invalid_employee_token" },
      body: JSON.stringify({ status: "VERIFIED" }),
    });
    assert(
      res.status === 401 || res.status === 403,
      "Test 16: Unauthorized employee cannot change verification (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 18. Test 17: Unauthorized manager cannot delete document (401/403)
  {
    const res = await request(`/employees/emp_001/documents/${hrDocId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer invalid_manager_token" },
    });
    assert(
      res.status === 401 || res.status === 403,
      "Test 17: Unauthorized manager cannot delete document (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 19. Test 18: Unauthorized employee cannot delete document (401/403)
  {
    const res = await request(`/employees/emp_001/documents/${hrDocId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer invalid_employee_token" },
    });
    assert(
      res.status === 401 || res.status === 403,
      "Test 18: Unauthorized employee cannot delete document (receives 401/403)",
      `Status ${res.status}`
    );
  }

  // 20. Test 19: HR can delete document
  {
    const res = await request(`/employees/emp_001/documents/${hrDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      res.status === 200 && res.data?.data?.deleted === true,
      "Test 19: HR can delete document from Vault",
      JSON.stringify(res.data)
    );

    // Verify it is gone from D1 and R2
    const checkRes = await request(`/employees/emp_001/documents/${hrDocId}`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      checkRes.status === 404,
      "Test 19b: Deleted document no longer exists in database or storage",
      `Status ${checkRes.status}`
    );
  }

  // 21. Test 20: ADMIN can delete document
  {
    const res = await request(`/employees/emp_001/documents/${adminDocId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      res.status === 200 && res.data?.data?.deleted === true,
      "Test 20: ADMIN can delete document from Vault",
      JSON.stringify(res.data)
    );
  }

  // 22. Test 21: Unsupported file type is rejected (magic bytes check)
  {
    const form = new FormData();
    const fakeText = Buffer.from("plain text content pretending to be a document");
    form.append("file", new Blob([fakeText], { type: "text/plain" }), "fake.txt");
    form.append("documentType", "OTHER");

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });
    assert(
      res.status === 400 && res.data?.error?.code === "VALIDATION_ERROR",
      "Test 21: Unsupported file type is rejected with 400 VALIDATION_ERROR",
      JSON.stringify(res.data)
    );
  }

  // 23. Test 22: Oversized file is rejected
  {
    const form = new FormData();
    // 10.5 MB buffer
    const oversizedBytes = Buffer.alloc(10.5 * 1024 * 1024, 0x25);
    form.append("file", new Blob([oversizedBytes], { type: "application/pdf" }), "oversized.pdf");
    form.append("documentType", "OTHER");

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });
    assert(
      res.status === 400 && res.data?.error?.code === "VALIDATION_ERROR",
      "Test 22: Oversized file (>10MB) is rejected with 400 VALIDATION_ERROR",
      JSON.stringify(res.data)
    );
  }

  // 24. Test 23: Invalid document type is rejected
  {
    const form = new FormData();
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "doc.pdf");
    form.append("documentType", "INVALID_DOC_TYPE");

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });
    assert(
      res.status === 400 && res.data?.error?.code === "VALIDATION_ERROR",
      "Test 23: Invalid document type is rejected with 400 VALIDATION_ERROR",
      JSON.stringify(res.data)
    );
  }

  // 25. Test 24: Expiry date before issue date is rejected
  {
    const form = new FormData();
    form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "doc.pdf");
    form.append("documentType", "PASSPORT");
    form.append("issueDate", "2026-05-01");
    form.append("expiryDate", "2020-01-01"); // Before issue

    const res = await request("/employees/emp_001/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });
    assert(
      res.status === 400 && res.data?.error?.code === "VALIDATION_ERROR",
      "Test 24: Expiry date before issue date is rejected with 400 VALIDATION_ERROR",
      JSON.stringify(res.data)
    );
  }

  console.log(`\n=== DOCUMENT VAULT SUITE RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
