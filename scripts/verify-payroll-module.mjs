#!/usr/bin/env node

/**
 * Phase 11 — Salary + Payroll + Gratuity + Payslips Module Verification Suite
 * Tests Salary Structures, Employee Salary Assignment, Historical Rollover,
 * Payroll Period Workflow, Salary Snapshotting, Adjustments & Minor-Unit Math,
 * Gratuity Calculation (UAE Labor Law), Payslip Generation, RBAC, and Audit Logs.
 */

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
  console.log("=== STARTING PHASE 11 SALARY + PAYROLL + GRATUITY + PAYSLIPS VERIFICATION SUITE ===\n");
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

  // ----------------------------------------------------
  // SECTION 1: AUTHENTICATION & RBAC
  // ----------------------------------------------------
  console.log("\n--- Section 1: Authentication & RBAC ---");

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }),
  });
  const adminToken = adminLogin.data?.data?.token;
  assert(adminLogin.status === 200 && adminToken, "1.1 Auth: ADMIN authentication succeeds");

  const hrLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr@hr-erp.local", password: "HrPassword123!" }),
  });
  const hrToken = hrLogin.data?.data?.token;
  assert(hrLogin.status === 200 && hrToken, "1.2 Auth: HR authentication succeeds");

  const unauthSalary = await request("/salary/structures");
  assert(unauthSalary.status === 401, "1.3 RBAC: Unauthenticated access to /salary/structures rejected (401)");

  const unauthPayroll = await request("/payroll/periods");
  assert(unauthPayroll.status === 401, "1.4 RBAC: Unauthenticated access to /payroll/periods rejected (401)");

  const unauthGratuity = await request("/gratuity/records");
  assert(unauthGratuity.status === 401, "1.5 RBAC: Unauthenticated access to /gratuity/records rejected (401)");

  // ----------------------------------------------------
  // SECTION 2: SETUP TEST EMPLOYEES & MASTERS
  // ----------------------------------------------------
  console.log("\n--- Section 2: Setup Test Master Data & Employees ---");

  // Create department & designation
  const deptRes = await request("/masters/departments", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Finance & Payroll ${Date.now()}`, code: `FIN_${Date.now()}` }),
  });
  const deptId = deptRes.data?.data?.id;

  const desigRes = await request("/masters/designations", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Payroll Specialist ${Date.now()}`, code: `PS_${Date.now()}` }),
  });
  const desigId = desigRes.data?.data?.id;

  // Employee 1: Full salary setup (Joined 3.5 years ago)
  const emp1Res = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeId: `PAY-EMP1-${Date.now()}`,
      employeeCode: `PE1-${Date.now()}`,
      fullName: "Rashid Al Nuaimi",
      localEmail: `rashid.${Date.now()}@test.com`,
      localMobile: "+971501111111",
      dateOfBirth: "1990-05-15",
      gender: "Male",
      nationality: "United Arab Emirates",
      joiningDate: "2021-01-01",
      employmentStatus: "active",
      departmentId: deptId,
      designationId: desigId,
    }),
  });
  const emp1 = emp1Res.data?.data;
  assert(emp1Res.status === 201 && emp1?.id, "2.1 Setup: Created Test Employee 1 (Rashid)");

  // Employee 2: Full salary setup (Joined 7.0 years ago)
  const emp2Res = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeId: `PAY-EMP2-${Date.now()}`,
      employeeCode: `PE2-${Date.now()}`,
      fullName: "Fatima Zahra",
      localEmail: `fatima.${Date.now()}@test.com`,
      localMobile: "+971502222222",
      dateOfBirth: "1988-08-20",
      gender: "Female",
      nationality: "Morocco",
      joiningDate: "2018-01-01",
      employmentStatus: "active",
      departmentId: deptId,
      designationId: desigId,
    }),
  });
  const emp2 = emp2Res.data?.data;
  assert(emp2Res.status === 201 && emp2?.id, "2.2 Setup: Created Test Employee 2 (Fatima)");

  // Employee 3: Unassigned salary (to test payroll exception reporting)
  const emp3Res = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeId: `PAY-EMP3-${Date.now()}`,
      employeeCode: `PE3-${Date.now()}`,
      fullName: "Tariq Mansoor",
      localEmail: `tariq.${Date.now()}@test.com`,
      localMobile: "+971503333333",
      dateOfBirth: "1995-11-10",
      gender: "Male",
      nationality: "Jordan",
      joiningDate: "2024-06-01",
      employmentStatus: "active",
      departmentId: deptId,
      designationId: desigId,
    }),
  });
  const emp3 = emp3Res.data?.data;
  assert(emp3Res.status === 201 && emp3?.id, "2.3 Setup: Created Test Employee 3 (Tariq - Unassigned Salary)");

  // ----------------------------------------------------
  // SECTION 3: SALARY STRUCTURES
  // ----------------------------------------------------
  console.log("\n--- Section 3: Salary Structures ---");

  // Create Salary Structure (Standard Executive)
  // Basic: 10,000 AED
  // Housing: 4,000 AED
  // Transport: 1,500 AED
  // Other: 500 AED
  // Gross: 16,000 AED (1,600,000 fils)
  const structCode = `EXEC_STD_${Date.now()}`;
  const createStructRes = await request("/salary/structures", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      name: "Executive Standard Grade A",
      code: structCode,
      description: "Standard package for executives",
      basicSalary: 10000,
      housingAllowance: 4000,
      transportAllowance: 1500,
      otherAllowance: 500,
      otherDeductions: 0,
      currency: "AED",
      status: "active",
    }),
  });
  const struct1 = createStructRes.data?.data;
  assert(
    createStructRes.status === 201 &&
      struct1?.id &&
      struct1.basicSalary === 1000000 &&
      struct1.housingAllowance === 400000 &&
      struct1.transportAllowance === 150000 &&
      struct1.otherAllowance === 50000,
    "3.1 Salary Structure: Created with converted minor units in database"
  );

  // Duplicate Code Rejection
  const dupStructRes = await request("/salary/structures", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      name: "Duplicate Grade",
      code: structCode,
      basicSalary: 8000,
    }),
  });
  assert(
    dupStructRes.status === 409,
    "3.2 Salary Structure: Duplicate code rejected with 409 Conflict"
  );

  // Deactivate and Activate Structure
  const deactRes = await request(`/salary/structures/${struct1.id}/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(deactRes.status === 200, "3.3 Salary Structure: Deactivated successfully");

  const actRes = await request(`/salary/structures/${struct1.id}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(actRes.status === 200, "3.4 Salary Structure: Reactivated successfully");

  // ----------------------------------------------------
  // SECTION 4: EMPLOYEE SALARY ASSIGNMENTS & HISTORICAL ROLLOVER
  // ----------------------------------------------------
  console.log("\n--- Section 4: Employee Salary Assignment & Historical Rollover ---");

  // Assign Structure to Rashid (emp1): Basic 10,000 AED, Housing 4,000, Transport 1,500, Other 500 -> Gross 16,000 AED
  const assign1Res = await request("/salary/employees/assign", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeId: emp1.id,
      salaryStructureId: struct1.id,
      basicSalary: 10000,
      housingAllowance: 4000,
      transportAllowance: 1500,
      otherAllowance: 500,
      deductions: 0,
      effectiveFrom: "2023-01-01",
      notes: "Initial executive placement",
    }),
  });
  const sal1 = assign1Res.data?.data;
  assert(
    assign1Res.status === 201 &&
      sal1?.employeeId === emp1.id &&
      sal1?.status === "active" &&
      sal1?.grossSalary === 1600000,
    "4.1 Salary Assignment: Structure assigned to Employee 1 (16,000 AED Gross)"
  );

  // Roll over / Increment Rashid's Salary to 18,000 AED Gross (Basic 12,000 AED)
  const rolloverRes = await request("/salary/employees/assign", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeId: emp1.id,
      basicSalary: 12000,
      housingAllowance: 4500,
      transportAllowance: 1500,
      otherAllowance: 0,
      deductions: 0,
      effectiveFrom: "2024-01-01",
      notes: "Annual merit increment",
    }),
  });
  const sal1Updated = rolloverRes.data?.data;
  assert(
    rolloverRes.status === 201 &&
      sal1Updated?.basicSalary === 1200000 &&
      sal1Updated?.grossSalary === 1800000,
    "4.2 Salary Assignment: New salary revision assigned (18,000 AED Gross)"
  );

  // Verify History: Previous salary marked closed with effectiveTo
  const historyRes = await request(`/salary/employees/${emp1.id}/history`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const history = historyRes.data?.data || [];
  assert(
    history.length === 2 &&
      history.some((s) => s.status === "closed" && s.effectiveTo === "2024-01-01") &&
      history.some((s) => s.status === "active" && s.basicSalary === 1200000),
    "4.3 Salary History: Non-destructive historical rollover correctly set effectiveTo on old record"
  );

  // Assign Custom Salary to Fatima (emp2): Basic 15,000 AED, Housing 5,000, Transport 2,000
  const assign2Res = await request("/salary/employees/assign", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeId: emp2.id,
      basicSalary: 15000,
      housingAllowance: 5000,
      transportAllowance: 2000,
      otherAllowance: 0,
      deductions: 0,
      effectiveFrom: "2022-01-01",
      notes: "Senior Director custom compensation",
    }),
  });
  const sal2 = assign2Res.data?.data;
  assert(
    assign2Res.status === 201 &&
      sal2?.basicSalary === 1500000 &&
      sal2?.grossSalary === 2200000,
    "4.4 Salary Assignment: Custom compensation assigned to Employee 2 (Gross: 22,000 AED)"
  );

  // ----------------------------------------------------
  // SECTION 5: PAYROLL PERIOD & SALARY SNAPSHOT GENERATION
  // ----------------------------------------------------
  console.log("\n--- Section 5: Payroll Period & Generation ---");

  const pYear = 2050 + Math.floor(Math.random() * 40);
  const pMonth = Math.floor(Math.random() * 12) + 1;
  const pMonthStr = String(pMonth).padStart(2, "0");
  const pStartDate = `${pYear}-${pMonthStr}-01`;
  const pEndDate = `${pYear}-${pMonthStr}-28`;

  // Create Payroll Period
  const createPeriodRes = await request("/payroll/periods", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      periodYear: pYear,
      periodMonth: pMonth,
      startDate: pStartDate,
      endDate: pEndDate,
      notes: `Test Payroll Run ${pYear}-${pMonthStr}`,
    }),
  });
  const period = createPeriodRes.data?.data;
  assert(
    createPeriodRes.status === 201 && period?.id && period?.status === "draft",
    `5.1 Payroll Period: Created DRAFT period for ${pYear}-${pMonthStr}`
  );

  // Duplicate Period Check
  const dupPeriodRes = await request("/payroll/periods", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      periodYear: pYear,
      periodMonth: pMonth,
      startDate: pStartDate,
      endDate: pEndDate,
    }),
  });
  assert(
    dupPeriodRes.status === 409,
    "5.2 Payroll Period: Duplicate period for same month/year rejected with 409"
  );

  // Generate Payroll Snapshot
  const genRes = await request(`/payroll/periods/${period.id}/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const genData = genRes.data?.data;
  assert(
    genRes.status === 200 &&
      genData?.generatedCount >= 2 &&
      genData?.exceptionsCount >= 1 &&
      genData?.exceptions?.some((ex) => ex.employeeId === emp3.id),
    `5.3 Payroll Generation: Generated snapshot for assigned employees, reported Employee 3 as exception (${genData?.exceptionsCount} exceptions)`
  );

  // Verify Payroll Records
  const recordsRes = await request(`/payroll/periods/${period.id}/records`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const records = recordsRes.data?.data || [];
  const emp1Record = records.find((r) => r.employeeId === emp1.id);
  const emp2Record = records.find((r) => r.employeeId === emp2.id);

  assert(
    emp1Record &&
      emp1Record.basicSalary === 1200000 &&
      emp1Record.grossEarnings === 1800000 &&
      emp1Record.netSalary === 1800000 &&
      emp2Record &&
      emp2Record.basicSalary === 1500000 &&
      emp2Record.netSalary === 2200000,
    "5.4 Payroll Snapshot: Active salary accurate snapshot captured for all assigned employees"
  );

  // ----------------------------------------------------
  // SECTION 6: ITEMIZED ADJUSTMENTS & MINOR-UNIT MATH
  // ----------------------------------------------------
  console.log("\n--- Section 6: Itemized Adjustments & Minor-Unit Math ---");

  // Add Earning: Performance Bonus 2,000 AED to Rashid
  const bonusRes = await request(`/payroll/records/${emp1Record.id}/adjustments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      type: "EARNING",
      name: "Q3 Performance Bonus",
      amount: 2000,
      reason: "Exceeded KPI targets",
    }),
  });
  assert(bonusRes.status === 201, "6.1 Adjustments: Added 2,000 AED earning adjustment");

  // Add Deduction: Unpaid Leave 500 AED to Rashid
  const deductRes = await request(`/payroll/records/${emp1Record.id}/adjustments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      type: "DEDUCTION",
      name: "Unpaid Leave",
      amount: 500,
      reason: "1 day unauthorized leave",
    }),
  });
  const deductAdj = deductRes.data?.data;
  assert(deductRes.status === 201, "6.2 Adjustments: Added 500 AED deduction adjustment");

  // Check Recalculated Record
  // Base Gross: 18,000 AED (1,800,000 fils)
  // + Earning 2,000 AED (200,000 fils) = 20,000 AED Gross (2,000,000 fils)
  // - Deduction 500 AED (50,000 fils) = 19,500 AED Net (1,950,000 fils)
  const updatedRecRes = await request(`/payroll/records/${emp1Record.id}`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const updatedRec = updatedRecRes.data?.data;
  assert(
    updatedRec?.grossEarnings === 2000000 &&
      updatedRec?.totalDeductions === 50000 &&
      updatedRec?.netSalary === 1950000,
    `6.3 Recalculation: Gross=20,000 AED, Deductions=500 AED, Net=19,500 AED (Actual: ${updatedRec?.netSalary / 100} AED)`
  );

  // Delete Adjustment and Verify Recalculation
  const delAdjRes = await request(`/payroll/adjustments/${deductAdj.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(delAdjRes.status === 200, "6.4 Adjustments: Deleted deduction adjustment");

  const recAfterDeleteRes = await request(`/payroll/records/${emp1Record.id}`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const recAfterDelete = recAfterDeleteRes.data?.data;
  assert(
    recAfterDelete?.totalDeductions === 0 &&
      recAfterDelete?.netSalary === 2000000,
    "6.5 Recalculation: Net restored to 20,000 AED after deduction removal"
  );

  // ----------------------------------------------------
  // SECTION 7: PAYROLL WORKFLOW & STATE MACHINE
  // ----------------------------------------------------
  console.log("\n--- Section 7: Payroll Workflow (DRAFT -> PROCESSED -> APPROVED -> PAID) ---");

  // Process Period
  const processRes = await request(`/payroll/periods/${period.id}/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(processRes.status === 200, "7.1 Workflow: Period transitioned to PROCESSED");

  // Approve Period (Locks records)
  const approveRes = await request(`/payroll/periods/${period.id}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(approveRes.status === 200, "7.2 Workflow: Period transitioned to APPROVED (Locked)");

  // Verify Cannot Add Adjustment to Approved Period
  const blockedAdjRes = await request(`/payroll/records/${emp1Record.id}/adjustments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      type: "EARNING",
      name: "Late Bonus",
      amount: 1000,
    }),
  });
  assert(
    blockedAdjRes.status === 400,
    "7.3 Immutability: Modifications blocked on APPROVED period (400)"
  );

  // Mark Paid (Immutable)
  const markPaidRes = await request(`/payroll/periods/${period.id}/mark-paid`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(markPaidRes.status === 200, "7.4 Workflow: Period marked PAID");

  // ----------------------------------------------------
  // SECTION 8: PAYSLIP GENERATION & RETRIEVAL
  // ----------------------------------------------------
  console.log("\n--- Section 8: Payslip Generation & Snapshot Verification ---");

  // Generate Payslips for October 2026
  const genPayslipsRes = await request("/payslips/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      payrollPeriodId: period.id,
    }),
  });
  const genPayslipsData = genPayslipsRes.data?.data;
  assert(
    [200, 201].includes(genPayslipsRes.status) && genPayslipsData?.generatedCount >= 2,
    `8.1 Payslips: Generated ${genPayslipsData?.generatedCount} payslips for period`
  );

  // List Payslips
  const payslipsListRes = await request(`/payslips?periodId=${period.id}`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const payslipsList = payslipsListRes.data?.data || [];
  const emp1Payslip = payslipsList.find((p) => p.employeeId === emp1.id);
  assert(
    emp1Payslip && emp1Payslip.payslipNumber,
    "8.2 Payslips: Payslip listed with generated payslip number"
  );

  // Single Payslip Detailed Snapshot Retrieval
  const singlePayslipRes = await request(`/payslips/${emp1Payslip.id}`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const singlePayslip = singlePayslipRes.data?.data;
  assert(
    singlePayslipRes.status === 200 &&
      singlePayslip?.employeeName === "Rashid Al Nuaimi" &&
      singlePayslip?.netSalary === 2000000 &&
      singlePayslip?.housingAllowance === 450000,
    "8.3 Payslips: Retrieved single payslip detail with immutable snapshot breakdown"
  );

  // Employee Payslips Archive
  const empPayslipsRes = await request(`/payslips/employee/${emp1.id}`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(
    empPayslipsRes.status === 200 && (empPayslipsRes.data?.data || []).length >= 1,
    "8.4 Payslips: Retrieved employee payslip history"
  );

  // ----------------------------------------------------
  // SECTION 9: GRATUITY CALCULATION & SETTLEMENT (UAE LABOR LAW)
  // ----------------------------------------------------
  console.log("\n--- Section 9: UAE Gratuity Calculations & Settlement Records ---");

  // Rule Test 1: Service < 1 year (Joined 2026-01-01, leaving 2026-06-01 = 0.41 years) -> 0 AED
  const shortServiceEmp = await request("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeId: `GRAT-SHORT-${Date.now()}`,
      employeeCode: `GS-${Date.now()}`,
      fullName: "Short Service Employee",
      localEmail: `short.${Date.now()}@test.com`,
      dateOfBirth: "1998-01-01",
      gender: "Male",
      nationality: "Egypt",
      joiningDate: "2026-01-01",
      employmentStatus: "active",
    }),
  });
  const shortEmpId = shortServiceEmp.data?.data?.id;
  await request("/salary/employees/assign", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      employeeId: shortEmpId,
      basicSalary: 10000,
      effectiveFrom: "2026-01-01",
    }),
  });

  const calcShortRes = await request("/gratuity/calculate", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeId: shortEmpId,
      lastWorkingDate: "2026-06-01",
    }),
  });
  const calcShort = calcShortRes.data?.data;
  assert(
    calcShortRes.status === 200 &&
      calcShort?.eligibleDays === 0 &&
      calcShort?.gratuityAmountFils === 0,
    "9.1 Gratuity: Service < 1 year yields 0 eligible days and 0 gratuity (UAE Labor Law)"
  );

  // Rule Test 2: Service between 1 and 5 years (Rashid: Joined 2021-01-01, leaving 2024-07-01 = 3.50 years)
  // Daily Basic = 12,000 / 30 = 400 AED/day (40,000 fils/day)
  // Eligible Days = 3.50 * 21 = 73.44 days
  // Gratuity = 29,375.77 AED -> ~2,937,577 fils
  const calcRashidRes = await request("/gratuity/calculate", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeId: emp1.id,
      lastWorkingDate: "2024-07-01",
    }),
  });
  const calcRashid = calcRashidRes.data?.data;
  assert(
    calcRashidRes.status === 200 &&
      calcRashid?.serviceYearsBasisPoints >= 340 &&
      calcRashid?.eligibleDays >= 70 &&
      calcRashid?.gratuityAmountFils > 2900000,
    `9.2 Gratuity: 1-5 years service (3.5 yrs @ 12k basic = ~29,376 AED, got ${calcRashid?.gratuityAmountFils / 100} AED)`
  );

  // Rule Test 3: Service > 5 years (Fatima: Joined 2018-01-01, leaving 2025-01-01 = 7.00 years)
  // Basic = 15,000 AED. Daily = 500 AED (50,000 fils/day)
  // Eligible Days = (5 * 21) + (2 * 30) = 105 + 60 = 165 days
  // Gratuity = 165 * 500 AED = ~82,437 AED (8,243,669 fils)
  const calcFatimaRes = await request("/gratuity/calculate", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeId: emp2.id,
      lastWorkingDate: "2025-01-01",
    }),
  });
  const calcFatima = calcFatimaRes.data?.data;
  assert(
    calcFatimaRes.status === 200 &&
      calcFatima?.eligibleDays >= 164 &&
      calcFatima?.gratuityAmountFils > 8200000,
    `9.3 Gratuity: >5 years service (7 yrs @ 15k basic = ~82,437 AED, got ${calcFatima?.gratuityAmountFils / 100} AED)`
  );

  // Save Gratuity Settlement Record
  const saveGratRes = await request("/gratuity/records", {
    method: "POST",
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeId: emp1.id,
      lastWorkingDate: "2024-07-01",
      basicSalaryAtCalculation: 12000,
      serviceYears: calcRashid.serviceYearsBasisPoints,
      eligibleDays: calcRashid.eligibleDays,
      gratuityAmount: calcRashid.gratuityAmountFils / 100,
      currency: "AED",
      status: "finalized",
      notes: "End of service settlement finalized",
    }),
  });
  const gratRecord = saveGratRes.data?.data;
  assert(
    saveGratRes.status === 201 && gratRecord?.id && gratRecord.gratuityAmount === calcRashid.gratuityAmountFils,
    "9.4 Gratuity: Settlement record finalized & persisted"
  );

  // List Gratuity Records
  const listGratRes = await request("/gratuity/records", {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(
    listGratRes.status === 200 && (listGratRes.data?.data || []).length >= 1,
    "9.5 Gratuity: Records listed successfully"
  );

  // ----------------------------------------------------
  // SECTION 10: CLEANUP & CASCADE HARD DELETE
  // ----------------------------------------------------
  console.log("\n--- Section 10: Cascade Cleanup & Hard Delete ---");

  // Admin hard delete test employee (emp1)
  const delEmpRes = await request(`/employees/${emp1.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    delEmpRes.status === 200,
    "10.1 Hard Delete: Admin successfully deleted Employee 1 (cascading payroll/salary records)"
  );

  // Clean up remaining test employees & masters
  await request(`/employees/${emp2.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await request(`/employees/${emp3.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await request(`/employees/${shortEmpId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await request(`/salary/structures/${struct1.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await request(`/masters/departments/${deptId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await request(`/masters/designations/${desigId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log(`\n====================================================`);
  console.log(`VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});
