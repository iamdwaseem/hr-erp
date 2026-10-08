#!/usr/bin/env node

const BASE_URL = "http://127.0.0.1:8787/api";
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  return { status: response.status, data: await response.json().catch(() => null) };
}
function assert(condition, message) { if (!condition) throw new Error(message); console.log(`PASS ${message}`); }

const adminLogin = await request("/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }) });
const token = adminLogin.data?.data?.token;
assert(adminLogin.status === 200 && token, "Admin authentication");
const headers = { Authorization: `Bearer ${token}` };
const code = `ANNUAL_${Date.now()}`;
const seed = Date.now();
const testYear = 2090 + (Math.floor(seed / 1000) % 10);
const testMonth = String(1 + (Math.floor(seed / 10000) % 12)).padStart(2, "0");
const testDay = 1 + (seed % 25);
const leaveStart = `${testYear}-${testMonth}-${String(testDay).padStart(2, "0")}`;
const leaveEnd = `${testYear}-${testMonth}-${String(testDay + 1).padStart(2, "0")}`;
const importDate = `${testYear}-${testMonth}-${String(testDay + 2).padStart(2, "0")}`;
const periodStart = `${testYear}-${testMonth}-01`;
const periodEnd = `${testYear}-${testMonth}-28`;
const typeResponse = await request("/leave/types", { method: "POST", headers, body: JSON.stringify({ code, name: "Annual Leave", paid: true, annualEntitlement: 30 }) });
assert(typeResponse.status === 201, "Create paid leave type");
const leaveTypeId = typeResponse.data.data.id;
const employeeId = "emp_001";
const balanceResponse = await request("/leave/balances/adjust", { method: "POST", headers, body: JSON.stringify({ employeeId, leaveTypeId, year: testYear, days: 10, note: "Initial entitlement" }) });
assert(balanceResponse.status === 200, "Adjust leave balance");
const requestResponse = await request("/leave/requests", { method: "POST", headers, body: JSON.stringify({ employeeId, leaveTypeId, startDate: leaveStart, endDate: leaveEnd, requestedDays: 2, reason: "Annual leave" }) });
assert(requestResponse.status === 201, "Create leave request");
const leaveRequestId = requestResponse.data.data.id;
const approval = await request(`/leave/requests/${leaveRequestId}/approve`, { method: "POST", headers, body: JSON.stringify({ note: "Approved" }) });
assert(approval.status === 200, "Approve leave request and materialize attendance");
const records = await request(`/attendance/records?employeeId=${employeeId}&startDate=${leaveStart}&endDate=${leaveEnd}`, { headers });
assert(records.status === 200 && records.data.data.length >= 1, "Approved leave appears in attendance records");
const importResponse = await request("/attendance/imports", { method: "POST", headers, body: JSON.stringify({ fileName: "leave-only.csv", mode: "leave_only", periodStart, periodEnd, mapping: { employeeIdentifier: "Employee Code", attendanceDate: "Date", status: "Status" }, rows: [{ employeeIdentifier: "EMP001", attendanceDate: importDate, status: "leave", sourceRowNumber: 2, sourceIdentifier: "EMP001" }] }) });
assert(importResponse.status === 201 && importResponse.data.data.acceptedCount === 1, "Import leave-only attendance row");
console.log("ATTENDANCE/LEAVE VERIFICATION PASSED");
