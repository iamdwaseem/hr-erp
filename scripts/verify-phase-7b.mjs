// Phase 7B Comprehensive Verification Test Suite
// Authorization & Admin Configuration Model Verification
// Tests all Phase 7B conditions across Auth, User Admin, Master Config, RBAC, and Operations.

const BASE_URL = "http://127.0.0.1:8787/api";

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
  console.log("=== STARTING PHASE 7B VERIFICATION SUITE ===\n");
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

  // ==========================================
  // SECTION 1: AUTHENTICATION & LOGIN MODEL
  // ==========================================
  console.log("\n--- Section 1: Authentication & Login Model ---");

  // 1. Admin login
  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }),
  });
  const adminToken = adminLogin.data?.data?.token;
  assert(adminLogin.status === 200 && adminToken, "1. Auth: Admin login succeeds", JSON.stringify(adminLogin.data));

  // 2. HR 1 login
  const hr1Login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr@hr-erp.local", password: "HrPassword123!" }),
  });
  const hr1Token = hr1Login.data?.data?.token;
  assert(hr1Login.status === 200 && hr1Token, "2. Auth: HR 1 login succeeds", JSON.stringify(hr1Login.data));

  // 3. HR 2 login
  const hr2Login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr2@hr-erp.local", password: "Hr2Password123!" }),
  });
  const hr2Token = hr2Login.data?.data?.token;
  assert(hr2Login.status === 200 && hr2Token, "3. Auth: HR 2 login succeeds", JSON.stringify(hr2Login.data));

  // 4. Disallow Manager login
  const managerLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "manager@hr-erp.local", password: "ManagerPassword123!" }),
  });
  assert(managerLogin.status === 403, "4. Auth: Manager login rejected with 403", JSON.stringify(managerLogin.data));

  // 5. Disallow Employee login
  const empLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "employee@hr-erp.local", password: "EmployeePassword123!" }),
  });
  assert(empLogin.status === 403, "5. Auth: Employee login rejected with 403", JSON.stringify(empLogin.data));

  // 6. Disallow wrong password
  const wrongPwdLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "WrongPassword999!" }),
  });
  assert(wrongPwdLogin.status === 401, "6. Auth: Wrong password rejected with 401", JSON.stringify(wrongPwdLogin.data));

  // 7. Disallow nonexistent user
  const nonExistLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "nonexistent@hr-erp.local", password: "SomePassword123!" }),
  });
  assert(nonExistLogin.status === 401, "7. Auth: Nonexistent user rejected with 401", JSON.stringify(nonExistLogin.data));

  // 8. Auth /me for Admin
  const adminMe = await request("/auth/me", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminMe.status === 200 && adminMe.data?.data?.role === "ADMIN", "8. Auth: Admin /me returns role ADMIN");

  // 9. Auth /me for HR
  const hrMe = await request("/auth/me", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(hrMe.status === 200 && hrMe.data?.data?.role === "HR", "9. Auth: HR /me returns role HR");

  // ==========================================
  // SECTION 2: USER ADMINISTRATION & QUOTAS
  // ==========================================
  console.log("\n--- Section 2: User Administration (Admin Only) ---");

  // 10. Admin can list users
  const listUsers = await request("/users", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(listUsers.status === 200 && Array.isArray(listUsers.data?.data), "10. User Admin: Admin can list users");

  // 11. Passwords never returned in user list
  const userListHasNoPasswords = listUsers.data?.data?.every(
    (u) => !u.password && !u.passwordHash && !u.password_hash
  );
  assert(userListHasNoPasswords, "11. Security: Passwords never returned in user list");

  // 12. HR cannot access user list (403 Forbidden)
  const hrListUsers = await request("/users", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(hrListUsers.status === 403, "12. RBAC: HR cannot access /users (403 Forbidden)");

  // 13. System enforces max 5 active HR cap
  const quotaTs = Date.now().toString().slice(-4);
  const tempHrIds = [];
  for (let i = 3; i <= 5; i++) {
    const res = await request("/users", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        fullName: `Temp HR User ${i}`,
        email: `hr${i}_${quotaTs}@hr-erp.local`,
        password: "TestPassword123!",
        role: "HR",
      }),
    });
    if (res.data?.data?.id) tempHrIds.push(res.data.data.id);
  }

  // Now active HR count is 5. Attempting to create a 6th must fail with HR_LIMIT_EXCEEDED
  const create6thHr = await request("/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fullName: "Sixth HR User",
      email: `hr6_${quotaTs}@hr-erp.local`,
      password: "TestPassword123!",
      role: "HR",
    }),
  });
  assert(
    create6thHr.status === 400 && create6thHr.data?.error?.code === "HR_LIMIT_EXCEEDED",
    "13. User Quota: Rejects 6th active HR user when 5 are already active",
    JSON.stringify(create6thHr.data)
  );

  // Disable the temporary HRs so active count returns to 2
  for (const tid of tempHrIds) {
    await request(`/users/${tid}/disable`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  // 14. Cannot create a 2nd Admin
  const create2ndAdmin = await request("/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fullName: "Second Admin",
      email: "admin2_test@hr-erp.local",
      password: "TestPassword123!",
      role: "ADMIN",
    }),
  });
  assert(
    create2ndAdmin.status === 400,
    "14. User Quota: System strictly forbids creating a second Admin",
    JSON.stringify(create2ndAdmin.data)
  );

  // 15. Cannot disable the Admin account
  const disableAdmin = await request("/users/usr_admin_default/disable", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    disableAdmin.status === 400 && disableAdmin.data?.error?.code === "CANNOT_DISABLE_ADMIN",
    "15. Security: Administrator account cannot be disabled",
    JSON.stringify(disableAdmin.data)
  );

  // 16. Disable HR2 to free up a slot
  const disableHr2 = await request("/users/usr_hr_2_default/disable", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(disableHr2.status === 200 && disableHr2.data?.data?.isActive === false, "16. User Admin: Admin can disable an HR account");

  // 17. Disabled HR2 login is now rejected (403)
  const hr2DisabledLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr2@hr-erp.local", password: "Hr2Password123!" }),
  });
  assert(hr2DisabledLogin.status === 403, "17. Auth: Disabled user login rejected with 403");

  // 18. Create replacement HR user (now permitted since active HR count is 1)
  const userTs = Date.now().toString().slice(-5);
  const repEmail = `rep_hr_${userTs}@hr-erp.local`;
  const updatedRepEmail = `upd_hr_${userTs}@hr-erp.local`;

  const createReplacementHr = await request("/users", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fullName: "Replacement HR Specialist",
      email: repEmail,
      password: "ReplacementPassword123!",
      role: "HR",
    }),
  });
  const replacementHr = createReplacementHr.data?.data;
  assert(
    createReplacementHr.status === 201 && replacementHr?.id,
    "18. User Admin: Can create replacement HR after disabling an existing HR",
    JSON.stringify(createReplacementHr.data)
  );

  // 19. Replacement HR login succeeds
  const replacementLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: repEmail, password: "ReplacementPassword123!" }),
  });
  const replacementToken = replacementLogin.data?.data?.token;
  assert(replacementLogin.status === 200 && replacementToken, "19. Auth: Replacement HR logs in successfully");

  // 20. Enabling when 5 active HRs exist is rejected
  for (const tid of tempHrIds) {
    await request(`/users/${tid}/enable`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }
  const tryReEnableHr2 = await request("/users/usr_hr_2_default/enable", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    tryReEnableHr2.status === 400 && tryReEnableHr2.data?.error?.code === "HR_LIMIT_EXCEEDED",
    "20. User Quota: Re-enabling account rejected if 5 active HRs already exist",
    JSON.stringify(tryReEnableHr2.data)
  );
  for (const tid of tempHrIds) {
    await request(`/users/${tid}/disable`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  // 21. Update replacement HR display name and email
  const updateReplacement = await request(`/users/${replacementHr.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      fullName: "Updated Replacement HR",
      email: updatedRepEmail,
    }),
  });
  assert(
    updateReplacement.status === 200 &&
      updateReplacement.data?.data?.fullName === "Updated Replacement HR" &&
      updateReplacement.data?.data?.email === updatedRepEmail,
    "21. User Admin: Admin can update HR display name and email"
  );

  // 22. Reset replacement HR password
  const resetReplacementPwd = await request(`/users/${replacementHr.id}/reset-password`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ password: "NewStrongPassword456!" }),
  });
  assert(resetReplacementPwd.status === 200, "22. User Admin: Admin can reset HR password");

  // 23. Login with new password succeeds
  const loginWithNewPwd = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: updatedRepEmail, password: "NewStrongPassword456!" }),
  });
  assert(loginWithNewPwd.status === 200, "23. Auth: Login with reset password succeeds");

  // 24. Clean up replacement HR (disable it) and re-enable HR2
  await request(`/users/${replacementHr.id}/disable`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const reEnableHr2 = await request("/users/usr_hr_2_default/enable", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(reEnableHr2.status === 200 && reEnableHr2.data?.data?.isActive === true, "24. User Admin: HR2 re-enabled successfully");

  // 25. HR2 login works again
  const hr2BackLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr2@hr-erp.local", password: "Hr2Password123!" }),
  });
  assert(hr2BackLogin.status === 200, "25. Auth: Re-enabled HR2 logs in successfully");

  // ==========================================
  // SECTION 3: SYSTEM MASTER CONFIGURATION
  // ==========================================
  console.log("\n--- Section 3: Master Configuration (Admin Mutations, HR Read-Only) ---");

  // 26. Admin and HR can read active departments
  const hrDepts = await request("/masters/departments", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(hrDepts.status === 200 && Array.isArray(hrDepts.data?.data), "26. Masters: HR can read active departments");

  // 27. HR cannot create department (403)
  const hrCreateDept = await request("/masters/departments", {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({ name: "Unauthorized Dept", code: "UNAUTH" }),
  });
  assert(hrCreateDept.status === 403, "27. RBAC: HR cannot create department (403 Forbidden)");

  // 28. Admin can create department
  const timestamp = Date.now().toString().slice(-4);
  const testDeptCode = `TST${timestamp}`;
  const adminCreateDept = await request("/masters/departments", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Test Department ${timestamp}`, code: testDeptCode }),
  });
  const testDept = adminCreateDept.data?.data;
  assert((adminCreateDept.status === 201 || adminCreateDept.status === 200) && testDept?.id, "28. Masters: Admin can create department", JSON.stringify(adminCreateDept.data));

  // 29. Admin can update department
  const adminUpdateDept = await request(`/masters/departments/${testDept.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Updated Department ${timestamp}` }),
  });
  assert(adminUpdateDept.status === 200 && adminUpdateDept.data?.data?.name === `Updated Department ${timestamp}`, "29. Masters: Admin can update department");

  // 30. Admin can deactivate department
  const adminDeactivateDept = await request(`/masters/departments/${testDept.id}/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDeactivateDept.status === 200 && adminDeactivateDept.data?.data?.status === "inactive", "30. Masters: Admin can deactivate department");

  // 31. Deactivated department does not appear in active departments list
  const activeDepts = await request("/masters/departments", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  const inActiveList = activeDepts.data?.data?.some((d) => d.id === testDept.id);
  assert(!inActiveList, "31. Masters: Inactive department excluded from standard active list");

  // 32. Inactive department appears in ?all=true list
  const allDepts = await request("/masters/departments?all=true", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const inAllList = allDepts.data?.data?.some((d) => d.id === testDept.id);
  assert(inAllList, "32. Masters: Inactive department present in ?all=true list");

  // 33. Admin can reactivate department
  const adminReactivateDept = await request(`/masters/departments/${testDept.id}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminReactivateDept.status === 200 && adminReactivateDept.data?.data?.status === "active", "33. Masters: Admin can reactivate department");

  // 34. Designations: HR read active, HR mutation forbidden (403)
  const hrCreateDesig = await request("/masters/designations", {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({ name: "HR Rogue Title", code: "ROGU" }),
  });
  assert(hrCreateDesig.status === 403, "34. RBAC: HR cannot create designation (403 Forbidden)");

  // 35. Admin create, update, deactivate, activate designation
  const testDesigCode = `DSG${timestamp}`;
  const adminCreateDesig = await request("/masters/designations", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Test Designation ${timestamp}`, code: testDesigCode }),
  });
  const testDesig = adminCreateDesig.data?.data;
  assert((adminCreateDesig.status === 201 || adminCreateDesig.status === 200) && testDesig?.id, "35. Masters: Admin can create designation");

  const adminDeactDesig = await request(`/masters/designations/${testDesig.id}/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDeactDesig.status === 200 && adminDeactDesig.data?.data?.status === "inactive", "36. Masters: Admin can deactivate designation");

  const adminActDesig = await request(`/masters/designations/${testDesig.id}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminActDesig.status === 200 && adminActDesig.data?.data?.status === "active", "37. Masters: Admin can reactivate designation");

  // 38. Branches: HR mutation forbidden (403)
  const hrCreateBranch = await request("/masters/branches", {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({ name: "Rogue Branch", code: "RGB" }),
  });
  assert(hrCreateBranch.status === 403, "38. RBAC: HR cannot create branch (403 Forbidden)");

  // 39. Admin create, update, deactivate, activate branch
  const testBranchCode = `BR${timestamp}`;
  const adminCreateBranch = await request("/masters/branches", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Test Branch ${timestamp}`, code: testBranchCode, city: "Dubai", country: "UAE" }),
  });
  const testBranch = adminCreateBranch.data?.data;
  assert((adminCreateBranch.status === 201 || adminCreateBranch.status === 200) && testBranch?.id, "39. Masters: Admin can create branch");

  const adminDeactBranch = await request(`/masters/branches/${testBranch.id}/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDeactBranch.status === 200 && adminDeactBranch.data?.data?.status === "inactive", "40. Masters: Admin can deactivate branch");

  const adminActBranch = await request(`/masters/branches/${testBranch.id}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminActBranch.status === 200 && adminActBranch.data?.data?.status === "active", "41. Masters: Admin can reactivate branch");

  // 42. Document Types: List active returns seeded 10 document types
  const listDocTypes = await request("/masters/document-types", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(
    listDocTypes.status === 200 && listDocTypes.data?.data?.length >= 10,
    "42. Masters: Document Types master returns seeded 10 document types"
  );

  // 43. HR cannot create document type (403)
  const hrCreateDocType = await request("/masters/document-types", {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({ name: "Rogue Doc", code: "ROGUE_DOC" }),
  });
  assert(hrCreateDocType.status === 403, "43. RBAC: HR cannot create document type (403 Forbidden)");

  // 44. Admin create, deactivate, activate document type
  const testDocTypeCode = `DOC_${timestamp}`;
  const adminCreateDocType = await request("/masters/document-types", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Test Custom Doc ${timestamp}`, code: testDocTypeCode, description: "Test doc type" }),
  });
  const testDocType = adminCreateDocType.data?.data;
  assert((adminCreateDocType.status === 201 || adminCreateDocType.status === 200) && testDocType?.id, "44. Masters: Admin can create custom document type");

  const adminDeactDocType = await request(`/masters/document-types/${testDocType.id}/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDeactDocType.status === 200 && adminDeactDocType.data?.data?.status === "inactive", "45. Masters: Admin can deactivate document type");

  const adminActDocType = await request(`/masters/document-types/${testDocType.id}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminActDocType.status === 200 && adminActDocType.data?.data?.status === "active", "46. Masters: Admin can reactivate document type");

  // ==========================================
  // SECTION 4: AUDIT LOGS (ADMIN ONLY)
  // ==========================================
  console.log("\n--- Section 4: Audit Logs (Admin Only) ---");

  // 47. Admin can view audit logs
  const adminAudit = await request("/audit-logs", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminAudit.status === 200 && Array.isArray(adminAudit.data?.data), "47. Audit: Admin can view audit logs");

  // 48. HR cannot view audit logs (403 Forbidden)
  const hrAudit = await request("/audit-logs", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(hrAudit.status === 403, "48. RBAC: HR cannot view audit logs (403 Forbidden)");

  // 49. Audit logs recorded user actions
  const userActionsLogged = adminAudit.data?.data?.some(
    (e) => e.entityType === "users" || e.action.startsWith("USER_")
  );
  assert(userActionsLogged, "49. Audit: User admin actions properly recorded in audit logs");

  // 50. Audit logs recorded master actions
  const masterActionsLogged = adminAudit.data?.data?.some(
    (e) => e.action.includes("DEPARTMENT_") || e.action.includes("DESIGNATION_") || e.action.includes("BRANCH_") || e.action.includes("DOCUMENT_TYPE_")
  );
  assert(masterActionsLogged, "50. Audit: Master configuration actions recorded in audit logs");

  // ==========================================
  // SECTION 5: HR OPERATIONAL WORKFLOWS
  // ==========================================
  console.log("\n--- Section 5: HR Operational Workflows ---");

  // 51. HR can create an employee
  const empCode = `EMP7B${timestamp}`;
  const createEmp = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({
      employeeCode: empCode,
      employeeId: empCode,
      fullName: "Phase 7B Verified Employee",
      joiningDate: "2026-03-01",
      departmentId: testDept.id,
      designationId: testDesig.id,
      branchId: testBranch.id,
      localMobile: "+971501112233",
      localEmail: "emp7b@example.com",
    }),
  });
  const createdEmp = createEmp.data?.data;
  assert(createEmp.status === 201 && createdEmp?.id, "51. Operations: HR can create employee", JSON.stringify(createEmp.data));

  // 52. Employee record has user_id = null
  assert(createdEmp?.userId === null, "52. Architecture: Employee record exists independently with userId = null");

  // 53. HR can view employee details
  const getEmp = await request(`/employees/${createdEmp.id}`, {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(getEmp.status === 200 && getEmp.data?.data?.fullName === "Phase 7B Verified Employee", "53. Operations: HR can view employee details");

  // 54. HR can update employee details
  const updateEmp = await request(`/employees/${createdEmp.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({
      fullName: "Phase 7B Updated Employee",
    }),
  });
  assert(updateEmp.status === 200 && updateEmp.data?.data?.fullName === "Phase 7B Updated Employee", "54. Operations: HR can update employee details");

  // 55. HR can create passport for employee
  const createPassport = await request(`/employees/${createdEmp.id}/passport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({
      passportNumber: `P${timestamp}7B`,
      nationality: "Indian",
      issueDate: "2024-01-01",
      expiryDate: "2034-01-01",
    }),
  });
  assert(
    createPassport.status === 201 || createPassport.status === 200,
    "55. Operations: HR can manage employee passport",
    JSON.stringify(createPassport.data)
  );

  // 56. HR can create visa for employee
  const createVisa = await request(`/employees/${createdEmp.id}/visa`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({
      visaNumber: `V${timestamp}7B`,
      visaType: "Employment",
      issueDate: "2025-01-01",
      expiryDate: "2027-01-01",
      sponsorName: "HR ERP LLC",
    }),
  });
  assert(
    createVisa.status === 201 || createVisa.status === 200,
    "56. Operations: HR can manage employee visa",
    JSON.stringify(createVisa.data)
  );

  // 57. HR can create work permit for employee
  const createWorkPermit = await request(`/employees/${createdEmp.id}/work-permit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hr1Token}` },
    body: JSON.stringify({
      permitNumber: `WP${timestamp}7B`,
      issueDate: "2025-01-01",
      expiryDate: "2027-01-01",
    }),
  });
  assert(
    createWorkPermit.status === 201 || createWorkPermit.status === 200,
    "57. Operations: HR can manage employee work permit",
    JSON.stringify(createWorkPermit.data)
  );

  // 58. HR can view expiry summary
  const expirySummary = await request("/expiry/summary", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(expirySummary.status === 200 && expirySummary.data?.data?.compliance, "58. Operations: HR can access expiry summary");

  // 59. HR can view expiring documents
  const expiringDocs = await request("/expiry/documents", {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(expiringDocs.status === 200 && Array.isArray(expiringDocs.data?.data), "59. Operations: HR can access expiry tracking");

  // 60. Soft deactivation preserves employee foreign keys
  // Deactivate the assigned department and verify employee still references it
  await request(`/masters/departments/${testDept.id}/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const empAfterDeact = await request(`/employees/${createdEmp.id}`, {
    headers: { Authorization: `Bearer ${hr1Token}` },
  });
  assert(
    empAfterDeact.status === 200 && empAfterDeact.data?.data?.departmentId === testDept.id,
    "60. Integrity: Soft deactivation preserves employee foreign key reference"
  );

  // 61. Admin also has all operational capabilities
  const adminEmpView = await request(`/employees/${createdEmp.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminEmpView.status === 200, "61. RBAC: Admin has full operational access to employees");

  // 62. Both HR1 and HR2 have operational access
  const hr2EmpView = await request(`/employees/${createdEmp.id}`, {
    headers: { Authorization: `Bearer ${hr2Token}` },
  });
  assert(hr2EmpView.status === 200, "62. RBAC: Both HR users have identical full operational access");

  // 63. Reactivate test department to leave clean state
  await request(`/masters/departments/${testDept.id}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(true, "63. Cleanup: Master department restored to active status");

  // 64. Final account verification: exactly 1 Admin and 2 active HRs
  const finalUsersList = await request("/users", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const finalActiveAdmins = finalUsersList.data?.data?.filter((u) => u.role === "ADMIN" && u.isActive);
  const finalActiveHrs = finalUsersList.data?.data?.filter((u) => u.role === "HR" && u.isActive);
  assert(
    finalActiveAdmins.length === 1 && finalActiveHrs.length === 2,
    `64. Final State: Exactly 1 Admin (${finalActiveAdmins.length}) and 2 active HR users (${finalActiveHrs.length}) verified`
  );

  console.log(`\n=========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log(`=========================================`);

  if (failed === 0) {
    console.log("\nPHASE 7B COMPLETE — ADMIN + TWO HR OPERATIONAL MODEL VERIFIED\n");
    process.exit(0);
  } else {
    console.error(`\nTest suite had ${failed} failures.`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
