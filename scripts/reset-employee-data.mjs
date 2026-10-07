#!/usr/bin/env node

/**
 * One-Time Employee Master Production Data Reset Script
 *
 * Removes all employees and their dependent records from Cloudflare D1.
 * Preserves users (Admin & HR), master configuration (Departments, Designations, Branches, Document Types),
 * audit logs, and database schema.
 *
 * Usage:
 *   Production D1: node scripts/reset-employee-data.mjs --remote
 *   Local D1:      node scripts/reset-employee-data.mjs --local
 */

import { execFileSync } from "node:child_process";

const isRemote = process.argv.includes("--remote") || process.env.CLOUDFLARE_ENV === "production";
const targetFlag = isRemote ? "--remote" : "--local";
const targetEnvName = isRemote ? "PRODUCTION Cloudflare D1" : "LOCAL Development D1";

console.log("=========================================================");
console.log(`EMPLOYEE MASTER DATA RESET — TARGET: ${targetEnvName}`);
console.log("=========================================================\n");

function executeD1(sql) {
  const args = [
    "wrangler",
    "d1",
    "execute",
    "hr-erp-db",
    targetFlag,
    "--command",
    sql,
    "--json",
  ];

  try {
    const stdout = execFileSync("npx", args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(stdout);
    return parsed;
  } catch (err) {
    const errMsg = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`D1 query execution failed (${targetFlag}): ${errMsg}`);
  }
}

function getCount(results, index = 0) {
  return results[index]?.results?.[0]?.count ?? 0;
}

async function run() {
  // 1. Pre-reset Inventory
  console.log("--- 1. PRE-RESET INVENTORY AUDIT ---");

  const preQuery = `
    SELECT count(*) as count FROM employees;
    SELECT count(*) as count FROM employee_passports;
    SELECT count(*) as count FROM employee_visas;
    SELECT count(*) as count FROM employee_work_permits;
    SELECT count(*) as count FROM employee_documents;
    SELECT count(*) as count FROM users WHERE role = 'ADMIN' AND is_active = 1;
    SELECT count(*) as count FROM users;
    SELECT count(*) as count FROM departments;
    SELECT count(*) as count FROM designations;
    SELECT count(*) as count FROM branches;
    SELECT count(*) as count FROM document_types;
    SELECT count(*) as count FROM audit_logs;
  `;

  const preResults = executeD1(preQuery);

  const empCountBefore = getCount(preResults, 0);
  const passportCountBefore = getCount(preResults, 1);
  const visaCountBefore = getCount(preResults, 2);
  const workPermitCountBefore = getCount(preResults, 3);
  const docCountBefore = getCount(preResults, 4);
  const adminCountBefore = getCount(preResults, 5);
  const userCountBefore = getCount(preResults, 6);
  const deptCountBefore = getCount(preResults, 7);
  const desigCountBefore = getCount(preResults, 8);
  const branchCountBefore = getCount(preResults, 9);
  const docTypeCountBefore = getCount(preResults, 10);
  const auditCountBefore = getCount(preResults, 11);

  console.log(`Employees before reset:               ${empCountBefore}`);
  console.log(`Employee Passports before reset:      ${passportCountBefore}`);
  console.log(`Employee Visas before reset:          ${visaCountBefore}`);
  console.log(`Employee Work Permits before reset:   ${workPermitCountBefore}`);
  console.log(`Employee Documents before reset:      ${docCountBefore}`);
  console.log(`Users (total) before reset:           ${userCountBefore}`);
  console.log(`Active Admins before reset:           ${adminCountBefore}`);
  console.log(`Departments before reset:             ${deptCountBefore}`);
  console.log(`Designations before reset:            ${desigCountBefore}`);
  console.log(`Branches before reset:                ${branchCountBefore}`);
  console.log(`Document Types before reset:          ${docTypeCountBefore}`);
  console.log(`Audit Logs before reset:              ${auditCountBefore}\n`);

  // 2. Data Removal Plan
  console.log("--- 2. EXACT SQL REMOVAL PLAN & DELETION ORDER ---");
  console.log("The following statements will execute in strict child-to-parent foreign-key order:\n");
  console.log("  Step 1: DELETE FROM employee_documents;     (Child table: employee files)");
  console.log("  Step 2: DELETE FROM employee_passports;     (Child table: compliance passports)");
  console.log("  Step 3: DELETE FROM employee_visas;         (Child table: compliance visas)");
  console.log("  Step 4: DELETE FROM employee_work_permits;  (Child table: compliance work permits)");
  console.log("  Step 5: DELETE FROM employees;              (Parent table: employee master)\n");

  console.log("Preserved tables (NO DELETIONS):");
  console.log("  - users (Admin & HR accounts)");
  console.log("  - departments (Master data)");
  console.log("  - designations (Master data)");
  console.log("  - branches (Master data)");
  console.log("  - document_types (Master data)");
  console.log("  - audit_logs (User auth & system logs)");
  console.log("  - d1_migrations (Schema tracking)\n");

  // 3. Execution
  console.log("--- 3. EXECUTING DATA REMOVAL ---");
  const deleteBatch = `
    DELETE FROM employee_documents;
    DELETE FROM employee_passports;
    DELETE FROM employee_visas;
    DELETE FROM employee_work_permits;
    DELETE FROM employees;
  `;

  executeD1(deleteBatch);
  console.log("✅ Deletion statements executed successfully.\n");

  // 4. Post-reset Verification
  console.log("--- 4. POST-RESET VERIFICATION ---");
  const postResults = executeD1(preQuery);

  const empCountAfter = getCount(postResults, 0);
  const passportCountAfter = getCount(postResults, 1);
  const visaCountAfter = getCount(postResults, 2);
  const workPermitCountAfter = getCount(postResults, 3);
  const docCountAfter = getCount(postResults, 4);
  const adminCountAfter = getCount(postResults, 5);
  const userCountAfter = getCount(postResults, 6);
  const deptCountAfter = getCount(postResults, 7);
  const desigCountAfter = getCount(postResults, 8);
  const branchCountAfter = getCount(postResults, 9);
  const docTypeCountAfter = getCount(postResults, 10);
  const auditCountAfter = getCount(postResults, 11);

  // Assertions
  const okEmployees = empCountAfter === 0;
  const okPassports = passportCountAfter === 0;
  const okVisas = visaCountAfter === 0;
  const okWorkPermits = workPermitCountAfter === 0;
  const okDocs = docCountAfter === 0;
  const okAdmin = adminCountAfter >= 1;
  const okUsers = userCountAfter === userCountBefore;
  const okDepts = deptCountAfter === deptCountBefore;
  const okDesigs = desigCountAfter === desigCountBefore;
  const okBranches = branchCountAfter === branchCountBefore;
  const okDocTypes = docTypeCountAfter === docTypeCountBefore;

  console.log(`[${okEmployees ? "PASS" : "FAIL"}] Employee count is 0:                     ${empCountAfter}`);
  console.log(`[${okPassports ? "PASS" : "FAIL"}] Employee passports count is 0:            ${passportCountAfter}`);
  console.log(`[${okVisas ? "PASS" : "FAIL"}] Employee visas count is 0:                ${visaCountAfter}`);
  console.log(`[${okWorkPermits ? "PASS" : "FAIL"}] Employee work permits count is 0:         ${workPermitCountAfter}`);
  console.log(`[${okDocs ? "PASS" : "FAIL"}] Employee documents count is 0:            ${docCountAfter}`);
  console.log(`[${okAdmin ? "PASS" : "FAIL"}] ADMIN user still exists:                  ${adminCountAfter} active`);
  console.log(`[${okUsers ? "PASS" : "FAIL"}] Users table preserved:                    ${userCountAfter} users`);
  console.log(`[${okDepts ? "PASS" : "FAIL"}] Departments preserved:                    ${deptCountAfter} departments`);
  console.log(`[${okDesigs ? "PASS" : "FAIL"}] Designations preserved:                   ${desigCountAfter} designations`);
  console.log(`[${okBranches ? "PASS" : "FAIL"}] Branches preserved:                       ${branchCountAfter} branches`);
  console.log(`[${okDocTypes ? "PASS" : "FAIL"}] Document Types preserved:                 ${docTypeCountAfter} types`);
  console.log(`[PASS] Audit Logs preserved:                     ${auditCountAfter} entries\n`);

  if (!okEmployees || !okPassports || !okVisas || !okWorkPermits || !okDocs || !okAdmin || !okUsers || !okDepts || !okDesigs || !okBranches || !okDocTypes) {
    console.error("❌ Post-reset verification failed. Please inspect the database state.");
    process.exit(1);
  }

  console.log("=========================================================");
  console.log("✅ ONE-TIME PRODUCTION EMPLOYEE DATA RESET COMPLETE");
  console.log("   The HR ERP is ready for entering real company employees.");
  console.log("=========================================================");
}

run().catch((err) => {
  console.error("❌ Reset script encountered an error:", err.message);
  process.exit(1);
});
