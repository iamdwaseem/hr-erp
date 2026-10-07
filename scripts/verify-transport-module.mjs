#!/usr/bin/env node

/**
 * Phase 9 — Transport Management Module Verification Suite
 * Tests Routes, Vehicles, Assignments, Business Rules, RBAC, and Audit Logging.
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
  console.log("=== STARTING PHASE 9 TRANSPORT MODULE VERIFICATION SUITE ===\n");
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
  console.log("--- Section 1: Authentication & RBAC ---");

  // Admin login
  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }),
  });
  const adminToken = adminLogin.data?.data?.token;
  assert(adminLogin.status === 200 && adminToken, "1. Auth: ADMIN authentication succeeds");

  // HR login
  const hrLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "hr@hr-erp.local", password: "HrPassword123!" }),
  });
  const hrToken = hrLogin.data?.data?.token;
  assert(hrLogin.status === 200 && hrToken, "2. Auth: HR authentication succeeds");

  // Unauthenticated access rejected
  const unauthRes = await request("/transport/routes");
  assert(unauthRes.status === 401, "3. RBAC: Unauthenticated access to /transport/routes rejected with 401");

  // Manager login rejected per Phase 7B model
  const managerLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "manager@hr-erp.local", password: "ManagerPassword123!" }),
  });
  assert(managerLogin.status === 403, "4. RBAC: Inactive MANAGER login rejected with 403");

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const hrHeaders = { Authorization: `Bearer ${hrToken}` };

  // ----------------------------------------------------
  // SETUP TEST DATA: Active and Inactive Employees
  // ----------------------------------------------------
  const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
  const activeEmpCode = `EMP-TR-${randomSuffix}`;
  const inactiveEmpCode = `EMP-IN-${randomSuffix}`;

  // Create active employee
  const activeEmpRes = await request("/employees", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      employeeCode: activeEmpCode,
      employeeId: `ID-TR-${randomSuffix}`,
      fullName: `Transport Test Employee ${randomSuffix}`,
      joiningDate: "2026-01-15",
      employmentStatus: "active",
      localEmail: `tr_${randomSuffix}@example.com`,
      localMobile: "+971501112233",
    }),
  });
  const activeEmployee = activeEmpRes.data?.data;
  assert(activeEmpRes.status === 201 && activeEmployee?.id, "Setup: Created active test employee", JSON.stringify(activeEmpRes.data));

  // Create inactive/terminated employee
  const inactiveEmpRes = await request("/employees", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      employeeCode: inactiveEmpCode,
      employeeId: `ID-IN-${randomSuffix}`,
      fullName: `Terminated Test Employee ${randomSuffix}`,
      joiningDate: "2025-06-01",
      employmentStatus: "terminated",
      localEmail: `in_${randomSuffix}@example.com`,
    }),
  });
  const inactiveEmployee = inactiveEmpRes.data?.data;
  assert(inactiveEmpRes.status === 201 && inactiveEmployee?.id, "Setup: Created terminated test employee");

  // ----------------------------------------------------
  // SECTION 2: ROUTES
  // ----------------------------------------------------
  console.log("\n--- Section 2: Transport Routes ---");

  const routeCode = `RT-${randomSuffix}`;

  // Create route
  const createRouteRes = await request("/transport/routes", {
    method: "POST",
    headers: hrHeaders, // HR can create
    body: JSON.stringify({
      name: `Route North ${randomSuffix}`,
      code: routeCode,
      description: "Daily morning and evening shuttle to Dubai Silicon Oasis",
      pickupPoints: "Deira City Centre, Business Bay Metro, Silicon Oasis HQ",
      status: "active",
    }),
  });
  const createdRoute = createRouteRes.data?.data;
  assert(createRouteRes.status === 201 && createdRoute?.id, "5. Routes: HR creates route successfully (201)", JSON.stringify(createRouteRes.data));

  // Validation: Missing name
  const invalidRouteRes = await request("/transport/routes", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      name: "",
      code: `RT-INV-${randomSuffix}`,
    }),
  });
  assert(invalidRouteRes.status === 400, "6. Routes: Validation rejects empty name with 400");

  // Duplicate route code rejection
  const duplicateRouteRes = await request("/transport/routes", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      name: "Duplicate Code Route",
      code: routeCode,
    }),
  });
  assert(duplicateRouteRes.status === 409, "7. Routes: Rejects duplicate route code with 409 Conflict");

  // Get route by ID
  const getRouteRes = await request(`/transport/routes/${createdRoute.id}`, { headers: hrHeaders });
  assert(getRouteRes.status === 200 && getRouteRes.data?.data?.code === routeCode, "8. Routes: Get route by ID succeeds");

  // Update route
  const updateRouteRes = await request(`/transport/routes/${createdRoute.id}`, {
    method: "PUT",
    headers: hrHeaders,
    body: JSON.stringify({
      name: `Updated Route North ${randomSuffix}`,
      description: "Updated description for Silicon Oasis",
    }),
  });
  assert(
    updateRouteRes.status === 200 && updateRouteRes.data?.data?.name === `Updated Route North ${randomSuffix}`,
    "9. Routes: Update route succeeds (200)"
  );

  // Deactivate route
  const deactRouteRes = await request(`/transport/routes/${createdRoute.id}/deactivate`, {
    method: "POST",
    headers: hrHeaders,
  });
  assert(deactRouteRes.status === 200 && deactRouteRes.data?.data?.status === "inactive", "10. Routes: Deactivate route succeeds");

  // Reactivate route
  const actRouteRes = await request(`/transport/routes/${createdRoute.id}/activate`, {
    method: "POST",
    headers: hrHeaders,
  });
  assert(actRouteRes.status === 200 && actRouteRes.data?.data?.status === "active", "11. Routes: Reactivate route succeeds");

  // Create a second route that stays inactive for assignment testing
  const inactiveRouteCode = `RT-INACT-${randomSuffix}`;
  const inactiveRouteRes = await request("/transport/routes", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      name: `Inactive Route ${randomSuffix}`,
      code: inactiveRouteCode,
      status: "inactive",
    }),
  });
  const inactiveRoute = inactiveRouteRes.data?.data;

  // ----------------------------------------------------
  // SECTION 3: VEHICLES
  // ----------------------------------------------------
  console.log("\n--- Section 3: Transport Vehicles ---");

  const vehicleReg = `DXB-${randomSuffix}`;

  // Create vehicle
  const createVehicleRes = await request("/transport/vehicles", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      registrationNumber: vehicleReg,
      vehicleType: "Bus",
      capacity: 32,
      driverName: "Ahmed Mansoor",
      driverPhone: "+971559876543",
      status: "active",
    }),
  });
  const createdVehicle = createVehicleRes.data?.data;
  assert(createVehicleRes.status === 201 && createdVehicle?.id, "12. Vehicles: HR creates vehicle successfully (201)", JSON.stringify(createVehicleRes.data));

  // Validation: non-positive capacity
  const invalidVehicleRes = await request("/transport/vehicles", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      registrationNumber: `DXB-INV-${randomSuffix}`,
      vehicleType: "Van",
      capacity: -5,
    }),
  });
  assert(invalidVehicleRes.status === 400, "13. Vehicles: Validation rejects non-positive capacity with 400");

  // Duplicate registration rejection
  const duplicateVehicleRes = await request("/transport/vehicles", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      registrationNumber: vehicleReg,
      vehicleType: "Minibus",
      capacity: 14,
    }),
  });
  assert(duplicateVehicleRes.status === 409, "14. Vehicles: Rejects duplicate registration number with 409 Conflict");

  // Get vehicle by ID
  const getVehicleRes = await request(`/transport/vehicles/${createdVehicle.id}`, { headers: hrHeaders });
  assert(getVehicleRes.status === 200 && getVehicleRes.data?.data?.capacity === 32, "15. Vehicles: Get vehicle by ID succeeds");

  // Update vehicle
  const updateVehicleRes = await request(`/transport/vehicles/${createdVehicle.id}`, {
    method: "PUT",
    headers: hrHeaders,
    body: JSON.stringify({
      driverName: "Ahmed M. Mansoor",
      capacity: 35,
    }),
  });
  assert(
    updateVehicleRes.status === 200 && updateVehicleRes.data?.data?.capacity === 35,
    "16. Vehicles: Update vehicle succeeds (200)"
  );

  // Deactivate vehicle
  const deactVehRes = await request(`/transport/vehicles/${createdVehicle.id}/deactivate`, {
    method: "POST",
    headers: hrHeaders,
  });
  assert(deactVehRes.status === 200 && deactVehRes.data?.data?.status === "inactive", "17. Vehicles: Deactivate vehicle succeeds");

  // Reactivate vehicle
  const actVehRes = await request(`/transport/vehicles/${createdVehicle.id}/activate`, {
    method: "POST",
    headers: hrHeaders,
  });
  assert(actVehRes.status === 200 && actVehRes.data?.data?.status === "active", "18. Vehicles: Reactivate vehicle succeeds");

  // Create an inactive vehicle for assignment testing
  const inactiveVehReg = `INACT-${randomSuffix}`;
  const inactiveVehRes = await request("/transport/vehicles", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      registrationNumber: inactiveVehReg,
      vehicleType: "Van",
      capacity: 10,
      status: "inactive",
    }),
  });
  const inactiveVehicle = inactiveVehRes.data?.data;

  // ----------------------------------------------------
  // SECTION 4: ASSIGNMENTS & BUSINESS RULES
  // ----------------------------------------------------
  console.log("\n--- Section 4: Assignments & Business Rules ---");

  // 19. Valid assignment
  const assignRes = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: activeEmployee.id,
      routeId: createdRoute.id,
      vehicleId: createdVehicle.id,
      pickupPoint: "Business Bay Metro",
      effectiveFrom: "2026-02-01",
      notes: "Morning shift commute",
    }),
  });
  const createdAssignment = assignRes.data?.data;
  assert(assignRes.status === 201 && createdAssignment?.id, "19. Assignments: Valid transport assignment created (201)", JSON.stringify(assignRes.data));

  // 20. Nonexistent employee rejected
  const nonEmpAssign = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: "emp_nonexistent_99999",
      routeId: createdRoute.id,
      effectiveFrom: "2026-02-01",
    }),
  });
  assert(nonEmpAssign.status === 404, "20. Assignments: Nonexistent employee rejected with 404");

  // 21. Nonexistent route rejected
  const nonRouteAssign = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: activeEmployee.id,
      routeId: "route_nonexistent_99999",
      effectiveFrom: "2026-02-01",
    }),
  });
  assert(nonRouteAssign.status === 404, "21. Assignments: Nonexistent route rejected with 404");

  // 22. Inactive route rejected
  const inactiveRouteAssign = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: activeEmployee.id,
      routeId: inactiveRoute.id,
      effectiveFrom: "2026-02-01",
    }),
  });
  assert(inactiveRouteAssign.status === 400 && inactiveRouteAssign.data?.error?.code === "ROUTE_INACTIVE", "22. Assignments: Inactive route rejected with ROUTE_INACTIVE (400)");

  // 23. Inactive vehicle rejected
  const inactiveVehAssign = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: activeEmployee.id,
      routeId: createdRoute.id,
      vehicleId: inactiveVehicle.id,
      effectiveFrom: "2026-02-01",
    }),
  });
  assert(inactiveVehAssign.status === 400 && inactiveVehAssign.data?.error?.code === "VEHICLE_INACTIVE", "23. Assignments: Inactive vehicle rejected with VEHICLE_INACTIVE (400)");

  // 24. Deactivated/terminated employee rejected
  const termEmpAssign = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: inactiveEmployee.id,
      routeId: createdRoute.id,
      effectiveFrom: "2026-02-01",
    }),
  });
  assert(termEmpAssign.status === 400 && termEmpAssign.data?.error?.code === "EMPLOYEE_NOT_ACTIVE", "24. Assignments: Inactive/terminated employee rejected with EMPLOYEE_NOT_ACTIVE (400)");

  // 25. Overlapping active assignment rejected
  const overlapAssign = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: activeEmployee.id,
      routeId: createdRoute.id,
      effectiveFrom: "2026-03-01",
    }),
  });
  assert(overlapAssign.status === 409 && overlapAssign.data?.error?.code === "ASSIGNMENT_OVERLAP", "25. Assignments: Overlapping active assignment rejected with ASSIGNMENT_OVERLAP (409)");

  // 26. Get current assignment for employee
  const currentAssignRes = await request(`/transport/assignments/employee/${activeEmployee.id}/current`, {
    headers: hrHeaders,
  });
  assert(
    currentAssignRes.status === 200 && currentAssignRes.data?.data?.id === createdAssignment.id,
    "26. Assignments: Current assignment query returns active assignment"
  );

  // 27. End assignment
  const endAssignRes = await request(`/transport/assignments/${createdAssignment.id}/end`, {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      effectiveTo: "2026-02-28",
      notes: "Shift ended, reassigned to new line",
    }),
  });
  assert(
    endAssignRes.status === 200 &&
      endAssignRes.data?.data?.status === "ended" &&
      endAssignRes.data?.data?.effectiveTo === "2026-02-28",
    "27. Assignments: Ending assignment sets status to 'ended' and records end date (200)"
  );

  // 28. Valid non-overlapping subsequent assignment succeeds now that previous is ended
  const nextAssignRes = await request("/transport/assignments", {
    method: "POST",
    headers: hrHeaders,
    body: JSON.stringify({
      employeeId: activeEmployee.id,
      routeId: createdRoute.id,
      pickupPoint: "Silicon Oasis Gate 1",
      effectiveFrom: "2026-03-01",
      notes: "Spring shift commute",
    }),
  });
  const secondAssignment = nextAssignRes.data?.data;
  assert(nextAssignRes.status === 201 && secondAssignment?.id, "28. Assignments: Subsequent assignment succeeds after previous ended (201)");

  // 29. Assignment history contains both assignments
  const historyRes = await request(`/transport/assignments/employee/${activeEmployee.id}/history`, {
    headers: hrHeaders,
  });
  assert(
    historyRes.status === 200 && Array.isArray(historyRes.data?.data) && historyRes.data.data.length >= 2,
    "29. Assignments: History returns all historical and current employee assignments"
  );

  // 30. Route filtering on assignments
  const routeFilterRes = await request(`/transport/assignments?routeId=${createdRoute.id}`, { headers: hrHeaders });
  assert(
    routeFilterRes.status === 200 && routeFilterRes.data?.data?.every((a) => a.routeId === createdRoute.id),
    "30. Assignments: Filter by routeId returns matching assignments"
  );

  // 31. Vehicle filtering on assignments
  const vehFilterRes = await request(`/transport/assignments?vehicleId=${createdVehicle.id}`, { headers: hrHeaders });
  assert(
    vehFilterRes.status === 200 && vehFilterRes.data?.data?.every((a) => a.vehicleId === createdVehicle.id),
    "31. Assignments: Filter by vehicleId returns matching assignments"
  );

  // ----------------------------------------------------
  // SECTION 5: SAFETY & HISTORICAL INTEGRITY
  // ----------------------------------------------------
  console.log("\n--- Section 5: Safety & Deletion Protections ---");

  // 32. Attempting to delete a route with assignments as HR is rejected
  const deleteRouteRes = await request(`/transport/routes/${createdRoute.id}`, {
    method: "DELETE",
    headers: hrHeaders,
  });
  assert(
    deleteRouteRes.status === 400 && deleteRouteRes.data?.error?.code === "ROUTE_HAS_ASSIGNMENTS",
    "32. Integrity: Deleting route with existing assignments rejected for HR with ROUTE_HAS_ASSIGNMENTS"
  );

  // 33. Attempting to delete a vehicle with assignments as HR is rejected
  const deleteVehRes = await request(`/transport/vehicles/${createdVehicle.id}`, {
    method: "DELETE",
    headers: hrHeaders,
  });
  assert(
    deleteVehRes.status === 400 && deleteVehRes.data?.error?.code === "VEHICLE_HAS_ASSIGNMENTS",
    "33. Integrity: Deleting vehicle with existing assignments rejected for HR with VEHICLE_HAS_ASSIGNMENTS"
  );

  // ----------------------------------------------------
  // SECTION 6: OVERVIEW / STATS & AUDIT LOG
  // ----------------------------------------------------
  console.log("\n--- Section 6: Overview Stats & Audit Logs ---");

  // 34. Overview API
  const overviewRes = await request("/transport/overview", { headers: hrHeaders });
  const overview = overviewRes.data?.data;
  assert(
    overviewRes.status === 200 &&
      typeof overview?.activeRoutesCount === "number" &&
      typeof overview?.activeVehiclesCount === "number" &&
      typeof overview?.assignedEmployeesCount === "number" &&
      typeof overview?.totalVehicleCapacity === "number",
    "34. Overview: GET /transport/overview returns valid operational metrics"
  );

  // 35. Audit logs contain transport entries (Admin only)
  const auditRes = await request("/audit-logs?search=transport&limit=100", { headers: adminHeaders });
  const logs = Array.isArray(auditRes.data?.data)
    ? auditRes.data.data
    : auditRes.data?.data?.items || [];
  const hasRouteAudit = logs.some((l) => l.action?.includes("transport:route"));
  const hasVehicleAudit = logs.some((l) => l.action?.includes("transport:vehicle"));
  const hasAssignAudit = logs.some((l) => l.action?.includes("transport:assignment"));

  assert(hasRouteAudit, "35. Audit: Route lifecycle actions captured in audit log");
  assert(hasVehicleAudit, "36. Audit: Vehicle lifecycle actions captured in audit log");
  assert(hasAssignAudit, "37. Audit: Assignment lifecycle actions captured in audit log");

  console.log(`\n=========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log(`=========================================`);

  if (failed === 0) {
    console.log("\nPHASE 9 TRANSPORT MODULE VERIFICATION COMPLETE\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
