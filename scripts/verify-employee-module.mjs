// Verification test suite for HR ERP MVP Phase 1 (Employee Module & RBAC)

const BASE_URL = "http://localhost:8787/api";

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log("=== STARTING HR ERP MODULE VERIFICATION SUITE ===\n");
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
  assert(loginAdmin.status === 200 && adminToken, "Auth: ADMIN login successful");

  const loginHr = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr@hr-erp.local", password: "HrPassword123!" }),
  });
  const hrToken = loginHr.data?.data?.token;
  assert(loginHr.status === 200 && hrToken, "Auth: HR login successful");

  const loginManager = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "manager@hr-erp.local", password: "ManagerPassword123!" }),
  });
  const managerToken = loginManager.data?.data?.token;
  assert(loginManager.status === 200 && managerToken, "Auth: MANAGER login successful");

  const loginEmployee = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "employee@hr-erp.local", password: "EmployeePassword123!" }),
  });
  const employeeToken = loginEmployee.data?.data?.token;
  assert(loginEmployee.status === 200 && employeeToken, "Auth: EMPLOYEE login successful");

  const runId = Date.now().toString().slice(-6);

  // 2. Test 1: ADMIN can create employee
  const adminCreate = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ADM-${runId}`,
      employeeId: `ID-ADM-${runId}`,
      fullName: "Admin Created Employee",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      departmentId: "dept_eng",
    }),
  });
  assert(adminCreate.status === 201, "Test 1: ADMIN can create employee", JSON.stringify(adminCreate));

  // 3. Test 2: HR can create employee
  const hrCreate = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeCode: `HR-${runId}`,
      employeeId: `ID-HR-${runId}`,
      fullName: "HR Created Employee",
      joiningDate: "2026-03-02",
      employmentStatus: "active",
      departmentId: "dept_hr",
    }),
  });
  assert(hrCreate.status === 201, "Test 2: HR can create employee", JSON.stringify(hrCreate));

  // 4. Test 3: MANAGER cannot create employee
  const mgrCreate = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      employeeCode: "MGR-EMP-01",
      employeeId: "ID-MGR-01",
      fullName: "Manager Created Employee",
      joiningDate: "2026-03-03",
      employmentStatus: "active",
    }),
  });
  assert(
    mgrCreate.status === 403,
    "Test 3: MANAGER cannot create employee (receives 403)",
    `Status ${mgrCreate.status}`
  );

  // 5. Test 4: EMPLOYEE cannot create employee
  const empCreate = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${employeeToken}` },
    body: JSON.stringify({
      employeeCode: "EMP-EMP-01",
      employeeId: "ID-EMP-01",
      fullName: "Self Created Employee",
      joiningDate: "2026-03-04",
      employmentStatus: "active",
    }),
  });
  assert(
    empCreate.status === 403,
    "Test 4: EMPLOYEE cannot create employee (receives 403)",
    `Status ${empCreate.status}`
  );

  // 6. Test 5: Search works (by ID, code, name)
  const searchByName = await request("/employees?search=Sarah", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundSarah = searchByName.data?.data?.some((e) => e.fullName.includes("Sarah"));
  assert(searchByName.status === 200 && foundSarah, "Test 5: Search by employee name works");

  const searchByCode = await request("/employees?search=EMP001", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundCode = searchByCode.data?.data?.some((e) => e.employeeCode === "EMP001");
  assert(searchByCode.status === 200 && foundCode, "Test 5b: Search by employee code works");

  // 7. Test 6: Filters work
  const filterDept = await request("/employees?departmentId=dept_eng", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const allEng = filterDept.data?.data?.every((e) => e.departmentId === "dept_eng");
  assert(filterDept.status === 200 && allEng && filterDept.data?.data?.length > 0, "Test 6: Filter by department works");

  const filterStatus = await request("/employees?employmentStatus=probation", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const allProbation = filterStatus.data?.data?.every((e) => e.employmentStatus === "probation");
  assert(filterStatus.status === 200 && allProbation, "Test 6b: Filter by employment status works");

  // 8. Test 7: Employee profile opens
  const getProfile = await request("/employees/emp_001", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    getProfile.status === 200 && getProfile.data?.data?.fullName === "John Doe",
    "Test 7: Employee profile retrieval with master relations works"
  );

  // 9. Test 8: Employee can edit where permitted
  const hrEdit = await request("/employees/emp_002", {
    method: "PUT",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ city: "Dubai Silicon Oasis" }),
  });
  assert(hrEdit.status === 200 && hrEdit.data?.data?.city === "Dubai Silicon Oasis", "Test 8: HR can edit employee");

  const mgrEdit = await request("/employees/emp_002", {
    method: "PUT",
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({ city: "Hacked City" }),
  });
  assert(mgrEdit.status === 403, "Test 8b: MANAGER cannot edit employee (receives 403)");

  // 10. Test 9: EMPLOYEE can only see own profile
  const empOwnProfile = await request("/employees/me", {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert(
    empOwnProfile.status === 200 && empOwnProfile.data?.data?.id === "emp_001",
    "Test 9: EMPLOYEE can view own profile via /api/employees/me"
  );

  const empBrowseList = await request("/employees", {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert(
    empBrowseList.status === 403,
    "Test 9b: EMPLOYEE cannot browse /api/employees directory (receives 403)"
  );

  const empOtherProfile = await request("/employees/emp_002", {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  assert(
    empOtherProfile.status === 403,
    "Test 9c: EMPLOYEE cannot view other employee's profile (receives 403)"
  );

  // 11. Test 10: Invalid form data is rejected
  const invalidCreate = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      // Missing required employeeCode, employeeId, fullName, joiningDate
      mobile: "not-a-number",
      email: "invalid-email-address",
    }),
  });
  assert(
    invalidCreate.status === 400 && invalidCreate.data?.error?.code === "VALIDATION_ERROR",
    "Test 10: Invalid form data is rejected with 400 VALIDATION_ERROR"
  );

  // 12. Test 11: Duplicate employee code is rejected
  const duplicateCode = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: "EMP001", // already exists
      employeeId: "NEW-ID-999",
      fullName: "Duplicate Tester",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
    }),
  });
  assert(
    duplicateCode.status === 409 && duplicateCode.data?.error?.code === "CONFLICT",
    "Test 11: Duplicate employee code returns 409 CONFLICT"
  );

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
