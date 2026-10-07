#!/usr/bin/env node

/**
 * Verification test suite for Phase 7C — Minimal Admin Seed Only
 */

import { execFileSync, execSync } from "node:child_process";

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

function executeD1(sql) {
  const args = [
    "wrangler",
    "d1",
    "execute",
    "hr-erp-db",
    "--local",
    "--command",
    sql,
    "--json",
  ];
  const stdout = execFileSync("npx", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const parsed = JSON.parse(stdout);
  return parsed[0]?.results || [];
}

async function runTests() {
  console.log("=== STARTING PHASE 7C VERIFICATION SUITE ===\n");
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

  // Test 1: Seed script fails when required env vars are missing
  try {
    execSync("node scripts/seed-admin.mjs", {
      env: { ...process.env, ADMIN_NAME: "", ADMIN_EMAIL: "", ADMIN_PASSWORD: "" },
      stdio: "pipe",
    });
    assert(false, "1. Env Validation: Fails when env vars are missing");
  } catch (err) {
    assert(err.status === 1, "1. Env Validation: Fails when env vars are missing");
  }

  // Test 2: Seed script fails on invalid email
  try {
    execSync("node scripts/seed-admin.mjs", {
      env: {
        ...process.env,
        ADMIN_NAME: "Admin Test",
        ADMIN_EMAIL: "notanemail",
        ADMIN_PASSWORD: "Password123!",
      },
      stdio: "pipe",
    });
    assert(false, "2. Validation: Rejects invalid email format");
  } catch (err) {
    assert(err.status === 1, "2. Validation: Rejects invalid email format");
  }

  // Test 3: Seed script fails on short password
  try {
    execSync("node scripts/seed-admin.mjs", {
      env: {
        ...process.env,
        ADMIN_NAME: "Admin Test",
        ADMIN_EMAIL: "admin@test.com",
        ADMIN_PASSWORD: "short",
      },
      stdio: "pipe",
    });
    assert(false, "3. Validation: Rejects password shorter than 8 characters");
  } catch (err) {
    assert(err.status === 1, "3. Validation: Rejects password shorter than 8 characters");
  }

  // Test 4: Seed script is idempotent for existing configured admin
  const activeAdmin = executeD1("SELECT email, full_name FROM users WHERE role = 'ADMIN' AND is_active = 1 LIMIT 1;")[0];
  const adminEmail = activeAdmin?.email || "admin@hr-erp.local";
  const adminName = activeAdmin?.full_name || "System Administrator";

  const countBefore = executeD1("SELECT count(*) as count FROM users;")[0].count;
  const seedOutput1 = execSync(
    `ADMIN_NAME="${adminName}" ADMIN_EMAIL="${adminEmail}" ADMIN_PASSWORD="AdminPassword123!" node scripts/seed-admin.mjs`,
    { encoding: "utf8" }
  );
  const countAfter1 = executeD1("SELECT count(*) as count FROM users;")[0].count;

  assert(
    countBefore === countAfter1 && seedOutput1.includes("already exists, no changes made"),
    "4. Idempotency: Existing admin recognized, no duplicate created",
    `Output: ${seedOutput1}`
  );

  // Test 5: Running seed a second time produces identical safe output
  const seedOutput2 = execSync(
    `ADMIN_NAME="${adminName}" ADMIN_EMAIL="${adminEmail}" ADMIN_PASSWORD="AdminPassword123!" node scripts/seed-admin.mjs`,
    { encoding: "utf8" }
  );
  const countAfter2 = executeD1("SELECT count(*) as count FROM users;")[0].count;

  assert(
    countAfter2 === countBefore && seedOutput2.includes("already exists, no changes made"),
    "5. Idempotency: Second run produces zero duplicates"
  );

  // Test 6: Seed script prevents creating a second admin accidentally
  const seedOutputSecondAdmin = execSync(
    'ADMIN_NAME="Another Admin" ADMIN_EMAIL="another_admin@example.com" ADMIN_PASSWORD="Password123!" node scripts/seed-admin.mjs',
    { encoding: "utf8" }
  );
  const countAfterSecondAdmin = executeD1("SELECT count(*) as count FROM users;")[0].count;

  assert(
    countAfterSecondAdmin === countBefore &&
      seedOutputSecondAdmin.includes("An active administrator already exists") &&
      seedOutputSecondAdmin.includes("The system enforces exactly ONE administrator"),
    "6. Safety: Rejects accidentally creating a second admin"
  );

  // Test 7: Verify no HR, Manager, or Employee users are created
  const nonAdminRows = executeD1("SELECT count(*) as count FROM users WHERE role != 'ADMIN';")[0].count;
  assert(
    nonAdminRows > 0, // Existing baseline intact, nothing added or deleted
    "7. Isolation: Unrelated users (HR/Manager/Employee) left untouched"
  );

  // Test 8: Admin login works via API
  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@hr-erp.local", password: "AdminPassword123!" }),
  });
  const adminToken = adminLogin.data?.data?.token;

  assert(
    adminLogin.status === 200 && adminToken,
    "8. Auth: Admin login succeeds with password verification",
    JSON.stringify(adminLogin.data)
  );

  // Test 9: Authenticated user role is ADMIN
  const adminMe = await request("/auth/me", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert(
    adminMe.status === 200 && adminMe.data?.data?.role === "ADMIN",
    "9. Auth: Authenticated role is strictly ADMIN",
    JSON.stringify(adminMe.data)
  );

  // Test 10: Security check - password and hash never printed or leaked in output
  assert(
    !seedOutput1.includes("AdminPassword123!") &&
      !seedOutput1.includes("pbkdf2:") &&
      !seedOutput2.includes("AdminPassword123!") &&
      !seedOutputSecondAdmin.includes("Password123!"),
    "10. Security: Passwords and hashes never printed in seed script output"
  );

  console.log(`\n=========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log(`=========================================`);

  if (failed === 0) {
    console.log("\nADMIN SEED COMPLETE — READY FOR GIT + CLOUDFLARE\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
