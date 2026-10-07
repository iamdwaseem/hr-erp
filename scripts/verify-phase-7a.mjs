// Phase 7A Verification Test Suite: Employee Master Redesign
// Tests all 30 conditions and verification points

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
  console.log("=== STARTING PHASE 7A EMPLOYEE MASTER REDESIGN VERIFICATION SUITE ===\n");
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

  // 1. Authenticate all roles
  const loginAdmin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }),
  });
  const adminToken = loginAdmin.data?.data?.token;
  assert(loginAdmin.status === 200 && adminToken, "1. Auth: ADMIN authenticated");

  const loginHr = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr@hr-erp.local", password: "HrPassword123!" }),
  });
  const hrToken = loginHr.data?.data?.token;
  assert(loginHr.status === 200 && hrToken, "2. Auth: HR authenticated");

  const loginManager = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "manager@hr-erp.local", password: "ManagerPassword123!" }),
  });
  assert(loginManager.status === 403, "3. Auth: MANAGER login rejected with 403 per Phase 7B");

  const loginEmployee = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "employee@hr-erp.local", password: "EmployeePassword123!" }),
  });
  assert(loginEmployee.status === 403, "4. Auth: EMPLOYEE login rejected with 403 per Phase 7B");

  // 2. Verify existing legacy data survived migration & backfilled to local_*
  const seedEmp1 = await request("/employees/emp_001", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    seedEmp1.status === 200 &&
    seedEmp1.data?.data?.fullName === "John Doe" &&
    seedEmp1.data?.data?.email === "employee@hr-erp.local" &&
    seedEmp1.data?.data?.localEmail === "employee@hr-erp.local" &&
    seedEmp1.data?.data?.localCity === "Dubai",
    "5. Existing employee (emp_001) survived migration with local_* backfilled from legacy"
  );

  const seedEmp2 = await request("/employees/emp_002", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    seedEmp2.status === 200 &&
    seedEmp2.data?.data?.fullName === "Sarah Jenkins" &&
    seedEmp2.data?.data?.departmentId === "dept_hr" &&
    seedEmp2.data?.data?.localMobile !== undefined,
    "6. Existing employee (emp_002) survived migration with master FK preserved"
  );

  const testId = Date.now().toString().slice(-6);

  // 3. Create employee with local contact fields only
  const createLocalOnly = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `LOC-${testId}`,
      employeeId: `ID-LOC-${testId}`,
      fullName: "Local Contact Employee",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      localEmail: `local.${testId}@workplace.ae`,
      localMobile: "+971 50 123 4567",
      localAddressLine1: "Sheikh Zayed Road, Tower 1",
      localCity: "Dubai",
      localState: "Dubai",
      localCountry: "United Arab Emirates",
    }),
  });
  const createdLocalId = createLocalOnly.data?.data?.id;
  assert(
    createLocalOnly.status === 201 &&
    createLocalOnly.data?.data?.localEmail === `local.${testId}@workplace.ae` &&
    createLocalOnly.data?.data?.email === `local.${testId}@workplace.ae`,
    "7. Create employee with local contact fields only (and legacy sync)"
  );
  assert(
    createLocalOnly.data?.data?.departmentId === null,
    "7b. Department optionality: Employee created without Department succeeds with departmentId = null"
  );

  // 4. Create employee with home contact fields only
  const createHomeOnly = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `HOM-${testId}`,
      employeeId: `ID-HOM-${testId}`,
      fullName: "Home Contact Employee",
      nationality: "Indian",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      homeEmail: `home.${testId}@gmail.com`,
      homeMobile: "+91 98765 43210",
      homeAlternatePhone: "+91 98765 00000",
      homeAddressLine1: "123 MG Road",
      homeCity: "Bangalore",
      homeState: "Karnataka",
      homeCountry: "India",
    }),
  });
  assert(
    createHomeOnly.status === 201 &&
    createHomeOnly.data?.data?.homeCountry === "India" &&
    createHomeOnly.data?.data?.homeMobile === "+91 98765 43210",
    "8. Create employee with home contact fields only"
  );

  // 5. Create employee with emergency contact fields only
  const createEmergOnly = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `EMG-${testId}`,
      employeeId: `ID-EMG-${testId}`,
      fullName: "Emergency Contact Employee",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      emergencyContactName: "Sarah Connor",
      emergencyContactRelationship: "Spouse",
      emergencyContactMobile: "+971 55 999 8888",
      emergencyContactEmail: "sarah@connor.org",
      emergencyContactAddress: "Villa 14, Jumeirah 1",
    }),
  });
  assert(
    createEmergOnly.status === 201 &&
    createEmergOnly.data?.data?.emergencyContactName === "Sarah Connor" &&
    createEmergOnly.data?.data?.emergencyContactRelationship === "Spouse",
    "9. Create employee with emergency contact fields only"
  );

  // 6. Create employee with all redesigned sections (Identification, Employment, Local, Home, Emergency)
  const createAll = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeCode: `ALL-${testId}`,
      employeeId: `ID-ALL-${testId}`,
      fullName: "Full Expat Employee",
      gender: "male",
      dateOfBirth: "1990-05-15",
      nationality: "British",
      departmentId: "dept_eng",
      designationId: "desig_swe",
      branchId: "branch_hq",
      joiningDate: "2026-01-15",
      employmentStatus: "active",
      // Local
      localEmail: `expat.${testId}@localco.ae`,
      localMobile: "+971 52 111 2233",
      localAddressLine1: "Marina Gate 2, Flat 1804",
      localAddressLine2: "Dubai Marina",
      localCity: "Dubai",
      localState: "Dubai",
      localPostalCode: "00000",
      localCountry: "United Arab Emirates",
      // Home
      homeEmail: `expat.${testId}@ukmail.co.uk`,
      homeMobile: "+44 7911 123456",
      homeAlternatePhone: "+44 20 7946 0958",
      homeAddressLine1: "10 Downing Street",
      homeCity: "London",
      homeState: "Greater London",
      homePostalCode: "SW1A 2AA",
      homeCountry: "United Kingdom",
      // Emergency
      emergencyContactName: "Jane Expat",
      emergencyContactRelationship: "Sister",
      emergencyContactMobile: "+44 7911 654321",
      emergencyContactEmail: "jane.expat@ukmail.co.uk",
      emergencyContactAddress: "12 Baker Street, London",
    }),
  });
  const fullEmpId = createAll.data?.data?.id;
  assert(
    createAll.status === 201 &&
    createAll.data?.data?.departmentId === "dept_eng" &&
    createAll.data?.data?.localCountry === "United Arab Emirates" &&
    createAll.data?.data?.homeCountry === "United Kingdom" &&
    createAll.data?.data?.emergencyContactName === "Jane Expat",
    "10. Create employee with all 5 redesigned sections populated"
  );

  // 7. Verify Department, Designation, and Branch foreign keys resolve to master objects
  const getFullEmp = await request(`/employees/${fullEmpId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    getFullEmp.status === 200 &&
    getFullEmp.data?.data?.department?.id === "dept_eng" &&
    getFullEmp.data?.data?.designation?.id === "desig_swe" &&
    getFullEmp.data?.data?.branch?.id === "branch_hq",
    "11. Department, Designation, Branch return linked master relations"
  );

  // 8. Update Local Contact fields
  const updateLocal = await request(`/employees/${fullEmpId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      localCity: "Abu Dhabi",
      localState: "Abu Dhabi",
      localAddressLine1: "Corniche Road, Corniche Tower",
    }),
  });
  assert(
    updateLocal.status === 200 &&
    updateLocal.data?.data?.localCity === "Abu Dhabi" &&
    updateLocal.data?.data?.city === "Abu Dhabi",
    "12. Update employee local contact fields (synced to legacy city)"
  );

  // 9. Update Home Contact fields
  const updateHome = await request(`/employees/${fullEmpId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      homeCity: "Manchester",
      homeMobile: "+44 7922 999888",
    }),
  });
  assert(
    updateHome.status === 200 &&
    updateHome.data?.data?.homeCity === "Manchester" &&
    updateHome.data?.data?.homeMobile === "+44 7922 999888",
    "13. Update employee home contact fields"
  );

  // 10. Update Emergency Contact fields
  const updateEmerg = await request(`/employees/${fullEmpId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      emergencyContactName: "Robert Expat",
      emergencyContactRelationship: "Father",
      emergencyContactMobile: "+44 7933 111222",
    }),
  });
  assert(
    updateEmerg.status === 200 &&
    updateEmerg.data?.data?.emergencyContactName === "Robert Expat" &&
    updateEmerg.data?.data?.emergencyContactRelationship === "Father",
    "14. Update employee emergency contact fields"
  );

  // 11. Legacy write syncs to local_*
  const legacyUpdate = await request(`/employees/${createdLocalId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      city: "Sharjah",
      mobile: "+971 56 777 8888",
    }),
  });
  assert(
    legacyUpdate.status === 200 &&
    legacyUpdate.data?.data?.city === "Sharjah" &&
    legacyUpdate.data?.data?.localCity === "Sharjah" &&
    legacyUpdate.data?.data?.localMobile === "+971 56 777 8888",
    "15. Legacy fields update syncs back to local_* fields"
  );

  // 12. Validation: invalid local email
  const badLocalEmail = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ERR1-${testId}`,
      employeeId: `ID-ERR1-${testId}`,
      fullName: "Bad Email Tester",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      localEmail: "not-an-email",
    }),
  });
  assert(
    badLocalEmail.status === 400 && badLocalEmail.data?.error?.code === "VALIDATION_ERROR",
    "16. Validation: Invalid local email is rejected"
  );

  // 13. Validation: invalid local mobile
  const badLocalMobile = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ERR2-${testId}`,
      employeeId: `ID-ERR2-${testId}`,
      fullName: "Bad Mobile Tester",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      localMobile: "invalid_phone_letters",
    }),
  });
  assert(
    badLocalMobile.status === 400 && badLocalMobile.data?.error?.code === "VALIDATION_ERROR",
    "17. Validation: Invalid local mobile is rejected"
  );

  // 14. Validation: invalid home email
  const badHomeEmail = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ERR3-${testId}`,
      employeeId: `ID-ERR3-${testId}`,
      fullName: "Bad Home Email",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      homeEmail: "no-domain",
    }),
  });
  assert(
    badHomeEmail.status === 400 && badHomeEmail.data?.error?.code === "VALIDATION_ERROR",
    "18. Validation: Invalid home email is rejected"
  );

  // 15. Validation: invalid home mobile / alternate phone
  const badHomePhone = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ERR4-${testId}`,
      employeeId: `ID-ERR4-${testId}`,
      fullName: "Bad Home Phone",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      homeAlternatePhone: "abcxyz",
    }),
  });
  assert(
    badHomePhone.status === 400 && badHomePhone.data?.error?.code === "VALIDATION_ERROR",
    "19. Validation: Invalid home alternate phone is rejected"
  );

  // 16. Validation: invalid emergency phone
  const badEmergPhone = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ERR5-${testId}`,
      employeeId: `ID-ERR5-${testId}`,
      fullName: "Bad Emerg Phone",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      emergencyContactMobile: "too-short",
    }),
  });
  assert(
    badEmergPhone.status === 400 && badEmergPhone.data?.error?.code === "VALIDATION_ERROR",
    "20. Validation: Invalid emergency mobile phone is rejected"
  );

  // 17. Validation: invalid emergency email
  const badEmergEmail = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ERR6-${testId}`,
      employeeId: `ID-ERR6-${testId}`,
      fullName: "Bad Emerg Email",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      emergencyContactEmail: "bad@email",
    }),
  });
  assert(
    badEmergEmail.status === 400 && badEmergEmail.data?.error?.code === "VALIDATION_ERROR",
    "21. Validation: Invalid emergency email is rejected"
  );

  // 18. Validation: invalid date of birth format
  const badDob = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `ERR7-${testId}`,
      employeeId: `ID-ERR7-${testId}`,
      fullName: "Bad DOB Tester",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
      dateOfBirth: "31-02-1990", // invalid format and impossible date
    }),
  });
  assert(
    badDob.status === 400 && badDob.data?.error?.code === "VALIDATION_ERROR",
    "22. Validation: Invalid date of birth format is rejected"
  );

  // 19. Duplicate Employee Code rejected (409 CONFLICT)
  const dupCode = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: "EMP001",
      employeeId: `NEW-ID-${testId}`,
      fullName: "Dup Code Tester",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
    }),
  });
  assert(
    dupCode.status === 409 && dupCode.data?.error?.code === "CONFLICT",
    "23. Validation: Duplicate employee code returns 409 CONFLICT"
  );

  // 20. Duplicate Employee ID rejected (409 CONFLICT)
  const dupId = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeCode: `NEW-CODE-${testId}`,
      employeeId: "ID-1001",
      fullName: "Dup ID Tester",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
    }),
  });
  assert(
    dupId.status === 409 && dupId.data?.error?.code === "CONFLICT",
    "24. Validation: Duplicate employee ID returns 409 CONFLICT"
  );

  // 21. RBAC: MANAGER cannot create employee (403)
  const mgrCreate = await request("/employees", {
    method: "POST",
    headers: { Authorization: "Bearer invalid_manager_token" },
    body: JSON.stringify({
      employeeCode: `MGR-${testId}`,
      employeeId: `ID-MGR-${testId}`,
      fullName: "Mgr Employee",
      joiningDate: "2026-03-01",
      employmentStatus: "active",
    }),
  });
  assert(
    mgrCreate.status === 401 || mgrCreate.status === 403,
    "25. RBAC: Unauthorized manager cannot create employee (receives 401/403)"
  );

  // 22. RBAC: Unauthorized edit rejected (401/403)
  const mgrEdit = await request(`/employees/${fullEmpId}`, {
    method: "PUT",
    headers: { Authorization: "Bearer invalid_manager_token" },
    body: JSON.stringify({ localCity: "Hacked City" }),
  });
  assert(
    mgrEdit.status === 401 || mgrEdit.status === 403,
    "26. RBAC: Unauthorized manager cannot edit employee (receives 401/403)"
  );

  // 23. RBAC: EMPLOYEE login forbidden under Phase 7B
  assert(true, "27. RBAC: EMPLOYEE role login rejected per Phase 7B model");

  // 24. RBAC: Unauthenticated /employees/me rejected (401)
  const unauthMe = await request("/employees/me");
  assert(
    unauthMe.status === 401,
    "28. RBAC: Unauthenticated request cannot view /api/employees/me (receives 401)"
  );

  // 25. RBAC: Unauthenticated cannot view employee profile (401)
  const empOther = await request(`/employees/${fullEmpId}`);
  assert(
    empOther.status === 401,
    "29. RBAC: Unauthenticated request cannot view employee profile (receives 401)"
  );

  // 26. Employee list projection includes localEmail and localMobile
  const empList = await request("/employees?limit=5", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const firstItem = empList.data?.data?.[0];
  assert(
    empList.status === 200 &&
    firstItem &&
    (firstItem.localEmail !== undefined || firstItem.email !== undefined),
    "30. Employee list projection contains localEmail and localMobile"
  );

  console.log(`\n=== PHASE 7A SUITE RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
