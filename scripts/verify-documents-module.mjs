// Verification test suite for HR ERP MVP Phase 2 (Passport, Visa, Work Permit & Document Status)

const BASE_URL = "http://localhost:8787/api";

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
  console.log("=== STARTING HR ERP DOCUMENTS & RBAC VERIFICATION SUITE ===\n");
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

  // Targets for testing:
  // emp_001 is John Doe (linked to employee@hr-erp.local)
  // emp_002 is Sarah Jenkins
  // emp_003 is Marcus Wong

  // Test 1: ADMIN can create passport
  const adminPassport = await request("/employees/emp_001/passport", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      passportNumber: "PASS-ADM-001",
      nationality: "Emirati",
      issueDate: "2020-01-15",
      expiryDate: addDays(400), // > 90 days => VALID
      placeOfIssue: "Dubai",
    }),
  });
  assert(
    adminPassport.status === 201 && adminPassport.data?.data?.passportNumber === "PASS-ADM-001",
    "Test 1: ADMIN can create passport",
    JSON.stringify(adminPassport)
  );

  // Test 2: HR can create passport
  const hrPassport = await request("/employees/emp_002/passport", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      passportNumber: "PASS-HR-002",
      nationality: "British",
      issueDate: "2021-06-01",
      expiryDate: addDays(80), // 80 days => EXPIRING_90_DAYS
      placeOfIssue: "London",
    }),
  });
  assert(
    hrPassport.status === 201 && hrPassport.data?.data?.passportNumber === "PASS-HR-002",
    "Test 2: HR can create passport",
    JSON.stringify(hrPassport)
  );

  // Test 3: HR2 (2nd HR user) can view passport
  const hr2ViewPassport = await request("/employees/emp_001/passport", {
    headers: { Authorization: `Bearer ${hr2Token}` },
  });
  assert(
    hr2ViewPassport.status === 200 && hr2ViewPassport.data?.data?.passportNumber === "PASS-ADM-001",
    "Test 3: HR2 (second active HR) can view passport"
  );

  // Test 4: Unauthorized cannot edit passport
  const unauthEditPassport = await request("/employees/emp_001/passport", {
    method: "PUT",
    headers: { Authorization: "Bearer invalid_token" },
    body: JSON.stringify({ placeOfIssue: "Unauthorized City" }),
  });
  assert(
    unauthEditPassport.status === 401 || unauthEditPassport.status === 403,
    "Test 4: Unauthorized cannot edit passport (receives 401/403)"
  );

  // Test 5: HR2 can view employee passport
  assert(
    hr2ViewPassport.status === 200,
    "Test 5: HR2 can view employee documents"
  );

  // Test 6: Unauthenticated cannot view employee's passport
  const unauthPassport = await request("/employees/emp_002/passport");
  assert(
    unauthPassport.status === 401,
    "Test 6: Unauthenticated cannot view employee passport (receives 401)"
  );

  // Test 7: ADMIN can create visa
  const adminVisa = await request("/employees/emp_001/visa", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      visaNumber: "VISA-ADM-001",
      visaType: "Employment",
      issuingState: "Dubai",
      profession: "Software Engineer",
      issueDate: "2023-01-01",
      expiryDate: addDays(25), // 25 days => EXPIRING_30_DAYS
      sponsorName: "Tech Hub LLC",
    }),
  });
  assert(
    adminVisa.status === 201 && adminVisa.data?.data?.visaNumber === "VISA-ADM-001",
    "Test 7: ADMIN can create visa",
    JSON.stringify(adminVisa)
  );

  // Test 8: HR can edit visa
  const hrEditVisa = await request("/employees/emp_001/visa", {
    method: "PUT",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      sponsorName: "Updated Tech Corp LLC",
    }),
  });
  assert(
    hrEditVisa.status === 200 && hrEditVisa.data?.data?.sponsorName === "Updated Tech Corp LLC",
    "Test 8: HR can edit visa"
  );

  // Test 9: MANAGER cannot edit visa
  const mgrEditVisa = await request("/employees/emp_001/visa", {
    method: "PUT",
    headers: { Authorization: "Bearer invalid_manager_token" },
    body: JSON.stringify({ sponsorName: "Hacked Sponsor" }),
  });
  assert(
    mgrEditVisa.status === 401 || mgrEditVisa.status === 403,
    "Test 9: Unauthorized cannot edit visa (receives 401/403)"
  );

  // Test 10: HR2 can view visa
  const hr2OwnVisa = await request("/employees/emp_001/visa", {
    headers: { Authorization: `Bearer ${hr2Token}` },
  });
  assert(
    hr2OwnVisa.status === 200 && hr2OwnVisa.data?.data?.visaNumber === "VISA-ADM-001",
    "Test 10: HR2 can view employee visa"
  );

  // Test 11: ADMIN can create work permit
  const adminWorkPermit = await request("/employees/emp_001/work-permit", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      permitNumber: "WP-ADM-001",
      profession: "Senior Software Engineer",
      issueDate: "2023-01-01",
      expiryDate: addDays(5), // 5 days => EXPIRING_7_DAYS
    }),
  });
  assert(
    adminWorkPermit.status === 201 && adminWorkPermit.data?.data?.permitNumber === "WP-ADM-001",
    "Test 11: ADMIN can create work permit",
    JSON.stringify(adminWorkPermit)
  );

  // Test 12: HR can edit work permit
  const hrEditWp = await request("/employees/emp_001/work-permit", {
    method: "PUT",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      profession: "Staff Software Engineer",
    }),
  });
  assert(
    hrEditWp.status === 200 && hrEditWp.data?.data?.profession === "Staff Software Engineer",
    "Test 12: HR can edit work permit"
  );

  // Test 13: Unauthorized cannot edit work permit
  const mgrEditWp = await request("/employees/emp_001/work-permit", {
    method: "PUT",
    headers: { Authorization: "Bearer invalid_manager_token" },
    body: JSON.stringify({ profession: "Hacked Profession" }),
  });
  assert(
    mgrEditWp.status === 401 || mgrEditWp.status === 403,
    "Test 13: Unauthorized cannot edit work permit (receives 401/403)"
  );

  // Test 14: HR2 can view work permit
  const hr2OwnWp = await request("/employees/emp_001/work-permit", {
    headers: { Authorization: `Bearer ${hr2Token}` },
  });
  assert(
    hr2OwnWp.status === 200 && hr2OwnWp.data?.data?.permitNumber === "WP-ADM-001",
    "Test 14: HR2 can view employee work permit"
  );

  // Test 15: Invalid dates return validation errors (e.g. expiry before issue)
  const invalidDates = await request("/employees/emp_001/passport", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      passportNumber: "INVALID-DATES",
      nationality: "Emirati",
      issueDate: "2025-05-01",
      expiryDate: "2024-05-01", // before issue date!
    }),
  });
  assert(
    invalidDates.status === 400 && invalidDates.data?.error?.code === "VALIDATION_ERROR",
    "Test 15: Expiry before issue date rejected with 400 VALIDATION_ERROR"
  );

  // Test 16: Expired status is correct (< 0 days)
  const expiredPermit = await request("/employees/emp_003/work-permit", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      permitNumber: "WP-EXPIRED-003",
      issueDate: "2020-01-01",
      expiryDate: "2023-01-01", // Past date => EXPIRED
    }),
  });
  assert(
    expiredPermit.status === 201 && expiredPermit.data?.data?.status === "EXPIRED",
    "Test 16: Status calculated as EXPIRED for past expiry date"
  );

  // Test 17: 7-day status is correct (<= 7 days)
  const sevenDayVisa = await request("/employees/emp_003/visa", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      visaNumber: "VISA-7DAY",
      visaType: "Residence",
      issueDate: "2023-01-01",
      expiryDate: addDays(4), // 4 days remaining => EXPIRING_7_DAYS
    }),
  });
  assert(
    sevenDayVisa.status === 201 && sevenDayVisa.data?.data?.status === "EXPIRING_7_DAYS",
    "Test 17: Status calculated as EXPIRING_7_DAYS for 4-day expiry"
  );

  // Test 18: 30-day status is correct (<= 30 days)
  const thirtyDayVisa = await request("/employees/emp_003/visa", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      visaNumber: "VISA-30DAY",
      visaType: "Residence",
      issueDate: "2023-01-01",
      expiryDate: addDays(20), // 20 days remaining => EXPIRING_30_DAYS
    }),
  });
  assert(
    thirtyDayVisa.status === 201 && thirtyDayVisa.data?.data?.status === "EXPIRING_30_DAYS",
    "Test 18: Status calculated as EXPIRING_30_DAYS for 20-day expiry"
  );

  // Test 19: 90-day status is correct (<= 90 days)
  const ninetyDayPassport = await request("/employees/emp_003/passport", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      passportNumber: "PASS-90DAY",
      nationality: "Singaporean",
      issueDate: "2020-01-01",
      expiryDate: addDays(60), // 60 days remaining => EXPIRING_90_DAYS
    }),
  });
  assert(
    ninetyDayPassport.status === 201 && ninetyDayPassport.data?.data?.status === "EXPIRING_90_DAYS",
    "Test 19: Status calculated as EXPIRING_90_DAYS for 60-day expiry"
  );

  // Test 20: Existing Employee Master tests still pass
  const employeeList = await request("/employees", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    employeeList.status === 200 && employeeList.data?.data?.length > 0,
    "Test 20: Existing Employee Master list retrieval still passes"
  );

  console.log(`\n=== DOCUMENTS SUITE RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
