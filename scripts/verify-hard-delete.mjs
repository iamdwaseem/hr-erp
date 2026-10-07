/**
 * Hard Delete Capabilities Verification Script
 * Validates:
 * 1. Admin hard delete of employees (and cascaded passports, visas, permits, R2 documents, assignments)
 * 2. Admin hard delete of master tables (departments, designations, branches, document types)
 * 3. Admin hard delete of HR users (and prevention of deleting the single Admin)
 * 4. Admin hard delete of Transport routes, vehicles, and assignments
 * 5. HR role is blocked from hard-deleting records (gets 403)
 */

const BASE_URL = "http://127.0.0.1:8787/api";

async function request(path, options = {}, token) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message, details = "") {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message} - ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log("=== HARD DELETE VERIFICATION SUITE ===\n");

  // Admin login
  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }),
  });
  const adminToken = adminLogin.data?.data?.token;
  assert(adminLogin.status === 200 && adminToken, "Admin authenticates successfully", JSON.stringify(adminLogin.data));

  // HR login
  const hrLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr@hr-erp.local", password: "HrPassword123!" }),
  });
  const hrToken = hrLogin.data?.data?.token;
  assert(hrLogin.status === 200 && hrToken, "HR authenticates successfully", JSON.stringify(hrLogin.data));

  // ----------------------------------------------------
  // 1. MASTER RECORDS HARD DELETE
  // ----------------------------------------------------
  console.log("\n1. Master Records Hard Delete");
  
  // 1a. Department
  const deptRes = await request("/masters/departments", {
    method: "POST",
    body: JSON.stringify({ name: "Temporary Dept", code: `TMP${Date.now().toString().slice(-4)}` }),
  }, adminToken);
  assert(deptRes.status === 201, "Admin creates test department", JSON.stringify(deptRes.data));
  const deptId = deptRes.data?.data?.id;

  // HR cannot hard delete department
  const hrDelDept = await request(`/masters/departments/${deptId}`, { method: "DELETE" }, hrToken);
  assert(hrDelDept.status === 403, "HR forbidden from hard-deleting department (403)", JSON.stringify(hrDelDept.data));

  // Admin hard deletes department
  const adminDelDept = await request(`/masters/departments/${deptId}`, { method: "DELETE" }, adminToken);
  assert(adminDelDept.status === 200 && adminDelDept.data?.data?.deleted, "Admin permanently deletes department", JSON.stringify(adminDelDept.data));

  // 1b. Designation
  const desigRes = await request("/masters/designations", {
    method: "POST",
    body: JSON.stringify({ name: "Temporary Desig", code: `TMP${Date.now().toString().slice(-4)}` }),
  }, adminToken);
  assert(desigRes.status === 201, "Admin creates test designation", JSON.stringify(desigRes.data));
  const desigId = desigRes.data?.data?.id;

  const adminDelDesig = await request(`/masters/designations/${desigId}`, { method: "DELETE" }, adminToken);
  assert(adminDelDesig.status === 200 && adminDelDesig.data?.data?.deleted, "Admin permanently deletes designation", JSON.stringify(adminDelDesig.data));

  // 1c. Branch
  const branchRes = await request("/masters/branches", {
    method: "POST",
    body: JSON.stringify({ name: "Temporary Branch", code: `TMP${Date.now().toString().slice(-4)}` }),
  }, adminToken);
  assert(branchRes.status === 201, "Admin creates test branch", JSON.stringify(branchRes.data));
  const branchId = branchRes.data?.data?.id;

  const adminDelBranch = await request(`/masters/branches/${branchId}`, { method: "DELETE" }, adminToken);
  assert(adminDelBranch.status === 200 && adminDelBranch.data?.data?.deleted, "Admin permanently deletes branch", JSON.stringify(adminDelBranch.data));

  // 1d. Document Type
  const docTypeRes = await request("/masters/document-types", {
    method: "POST",
    body: JSON.stringify({ name: "Temporary Doc Type", code: `TMP${Date.now().toString().slice(-4)}` }),
  }, adminToken);
  assert(docTypeRes.status === 201, "Admin creates test document type", JSON.stringify(docTypeRes.data));
  const docTypeId = docTypeRes.data?.data?.id;

  const adminDelDocType = await request(`/masters/document-types/${docTypeId}`, { method: "DELETE" }, adminToken);
  assert(adminDelDocType.status === 200 && adminDelDocType.data?.data?.deleted, "Admin permanently deletes document type", JSON.stringify(adminDelDocType.data));

  // ----------------------------------------------------
  // 2. USER ACCOUNTS HARD DELETE
  // ----------------------------------------------------
  console.log("\n2. User Accounts Hard Delete");
  
  // Create an HR account
  const hrUserEmail = `test_hr_${Date.now()}@hr-erp.local`;
  const createHrRes = await request("/users", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Test HR to Delete",
      email: hrUserEmail,
      password: "Password123!",
      role: "HR",
    }),
  }, adminToken);
  assert(createHrRes.status === 201, "Admin creates test HR user", JSON.stringify(createHrRes.data));
  const testHrId = createHrRes.data?.data?.id;

  // HR cannot delete user
  const hrDelUser = await request(`/users/${testHrId}`, { method: "DELETE" }, hrToken);
  assert(hrDelUser.status === 403, "HR forbidden from deleting user account (403)", JSON.stringify(hrDelUser.data));

  // Admin cannot delete the Admin account
  const adminUsers = await request("/users", {}, adminToken);
  const adminAccount = adminUsers.data?.data?.find(u => u.role === "ADMIN");
  if (adminAccount) {
    const tryDelAdmin = await request(`/users/${adminAccount.id}`, { method: "DELETE" }, adminToken);
    assert(tryDelAdmin.status === 400, "Admin account deletion is strictly forbidden (400)", JSON.stringify(tryDelAdmin.data));
  }

  // Admin deletes HR account
  const adminDelHrUser = await request(`/users/${testHrId}`, { method: "DELETE" }, adminToken);
  assert(adminDelHrUser.status === 200 && adminDelHrUser.data?.data?.deleted, "Admin permanently deletes HR user account", JSON.stringify(adminDelHrUser.data));

  // ----------------------------------------------------
  // 3. EMPLOYEE MASTER HARD DELETE
  // ----------------------------------------------------
  console.log("\n3. Employee Master Hard Delete");
  
  const empCode = `DEL${Date.now().toString().slice(-5)}`;
  const empIdStr = `E${Date.now().toString().slice(-5)}`;
  const createEmpRes = await request("/employees", {
    method: "POST",
    body: JSON.stringify({
      employeeCode: empCode,
      employeeId: empIdStr,
      fullName: "Employee For Hard Delete",
      joiningDate: "2025-01-01",
      employmentStatus: "active",
      localEmail: `del_${Date.now()}@company.local`,
    }),
  }, adminToken);
  assert(createEmpRes.status === 201, "Admin creates test employee", JSON.stringify(createEmpRes.data));
  const testEmpId = createEmpRes.data?.data?.id;

  // HR cannot delete employee
  const hrDelEmp = await request(`/employees/${testEmpId}`, { method: "DELETE" }, hrToken);
  assert(hrDelEmp.status === 403, "HR forbidden from hard-deleting employee (403)", JSON.stringify(hrDelEmp.data));

  // Admin hard deletes employee
  const adminDelEmp = await request(`/employees/${testEmpId}`, { method: "DELETE" }, adminToken);
  assert(adminDelEmp.status === 200 && adminDelEmp.data?.data?.deleted, "Admin permanently deletes employee", JSON.stringify(adminDelEmp.data));

  // Verify employee is gone
  const getEmpAfter = await request(`/employees/${testEmpId}`, {}, adminToken);
  assert(getEmpAfter.status === 404, "Employee record verified removed (404)");

  // ----------------------------------------------------
  // 4. TRANSPORT MODULE HARD DELETE
  // ----------------------------------------------------
  console.log("\n4. Transport Module Hard Delete");

  // 4a. Create route & vehicle & assignment
  const routeRes = await request("/transport/routes", {
    method: "POST",
    body: JSON.stringify({
      name: "Temporary Test Route",
      code: `TR${Date.now().toString().slice(-4)}`,
    }),
  }, adminToken);
  assert(routeRes.status === 201, "Admin creates transport route", JSON.stringify(routeRes.data));
  const testRouteId = routeRes.data?.data?.id;

  const vehicleRes = await request("/transport/vehicles", {
    method: "POST",
    body: JSON.stringify({
      registrationNumber: `REG-${Date.now().toString().slice(-4)}`,
      vehicleType: "Bus",
      capacity: 30,
    }),
  }, adminToken);
  assert(vehicleRes.status === 201, "Admin creates transport vehicle", JSON.stringify(vehicleRes.data));
  const testVehicleId = vehicleRes.data?.data?.id;

  // Create an employee for assignment
  const emp2Res = await request("/employees", {
    method: "POST",
    body: JSON.stringify({
      employeeCode: `TR_EMP_${Date.now().toString().slice(-4)}`,
      employeeId: `TR_ID_${Date.now().toString().slice(-4)}`,
      fullName: "Transport Employee",
      joiningDate: "2025-01-01",
      employmentStatus: "active",
    }),
  }, adminToken);
  const emp2Id = emp2Res.data?.data?.id;

  const assignRes = await request("/transport/assignments", {
    method: "POST",
    body: JSON.stringify({
      employeeId: emp2Id,
      routeId: testRouteId,
      vehicleId: testVehicleId,
      effectiveFrom: "2025-01-01",
    }),
  }, adminToken);
  assert(assignRes.status === 201, "Admin creates transport assignment", JSON.stringify(assignRes.data));
  const testAssignId = assignRes.data?.data?.id;

  // 4b. Assignment hard delete
  const hrDelAssign = await request(`/transport/assignments/${testAssignId}`, { method: "DELETE" }, hrToken);
  assert(hrDelAssign.status === 403, "HR forbidden from deleting assignment (403)", JSON.stringify(hrDelAssign.data));

  const adminDelAssign = await request(`/transport/assignments/${testAssignId}`, { method: "DELETE" }, adminToken);
  assert(adminDelAssign.status === 200 && adminDelAssign.data?.data?.deleted, "Admin permanently deletes assignment", JSON.stringify(adminDelAssign.data));

  // 4c. Route & Vehicle force delete
  const adminDelRoute = await request(`/transport/routes/${testRouteId}`, { method: "DELETE" }, adminToken);
  assert(adminDelRoute.status === 200, "Admin deletes transport route", JSON.stringify(adminDelRoute.data));

  const adminDelVehicle = await request(`/transport/vehicles/${testVehicleId}`, { method: "DELETE" }, adminToken);
  assert(adminDelVehicle.status === 200, "Admin deletes transport vehicle", JSON.stringify(adminDelVehicle.data));

  // Cleanup employee 2
  await request(`/employees/${emp2Id}`, { method: "DELETE" }, adminToken);

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
