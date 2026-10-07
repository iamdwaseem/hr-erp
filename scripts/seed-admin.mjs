#!/usr/bin/env node

/**
 * Phase 7C — Minimal Admin Seed Script
 *
 * Seeds exactly ONE initial ADMIN user for HR ERP.
 * Does NOT seed HR users, departments, designations, branches, or document types.
 *
 * Usage:
 *   Local D1:
 *     ADMIN_NAME="System Administrator" ADMIN_EMAIL="admin@waseemcodes.me" ADMIN_PASSWORD="..." npm run seed:admin
 *
 *   Remote Production D1:
 *     ADMIN_NAME="System Administrator" ADMIN_EMAIL="admin@waseemcodes.me" ADMIN_PASSWORD="..." npm run seed:admin -- --remote
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";

// Load environment variables from .env or .dev.vars if present and not already defined
if (fs.existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch {}
} else if (fs.existsSync(".dev.vars")) {
  try {
    process.loadEnvFile(".dev.vars");
  } catch {}
}

const name = process.env.ADMIN_NAME?.trim();
const rawEmail = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;

// 1. Validate required environment variables
if (!name || !rawEmail || !password) {
  console.error("❌ Error: Missing required environment variables.\n");
  console.error("Please provide:");
  console.error("  ADMIN_NAME     Name of the administrator (e.g. 'System Administrator')");
  console.error("  ADMIN_EMAIL    Email/Login ID (e.g. 'admin@waseemcodes.me')");
  console.error("  ADMIN_PASSWORD Secure password (at least 8 characters)\n");
  console.error("Usage examples:\n");
  console.error("  Local development D1:");
  console.error("    ADMIN_NAME='System Administrator' ADMIN_EMAIL='admin@waseemcodes.me' ADMIN_PASSWORD='...' npm run seed:admin\n");
  console.error("  Remote production D1:");
  console.error("    ADMIN_NAME='System Administrator' ADMIN_EMAIL='admin@waseemcodes.me' ADMIN_PASSWORD='...' npm run seed:admin -- --remote\n");
  process.exit(1);
}

const email = rawEmail.toLowerCase();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`❌ Error: Invalid email format for ADMIN_EMAIL: ${email}`);
  process.exit(1);
}

if (password.length < 8) {
  console.error("❌ Error: ADMIN_PASSWORD must be at least 8 characters long.");
  process.exit(1);
}

// 2. Cryptographic password hashing (identical to src/api/utils/password.ts)
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function hashPassword(plainPassword, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(plainPassword),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );

  const hashHex = bytesToHex(new Uint8Array(derivedKey));
  const finalSaltHex = saltHex || bytesToHex(salt);

  return `pbkdf2:${finalSaltHex}:${hashHex}`;
}

// 3. Database Execution Helpers
const isRemote =
  process.argv.includes("--remote") ||
  process.argv.includes("--prod") ||
  process.env.CLOUDFLARE_ENV === "production";
const targetFlag = isRemote ? "--remote" : "--local";

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

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
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].results || [];
    }
    return [];
  } catch (err) {
    const errMsg = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`D1 execution failed (${targetFlag}): ${errMsg}`);
  }
}

// 4. Idempotent Admin Seeding
async function run() {
  const allowReplace = process.argv.includes("--replace") || process.env.ALLOW_REPLACE_ADMIN === "true";
  const force = process.argv.includes("--force") || process.env.FORCE_SEED === "true";

  // Check if a user with this email already exists
  const existingUserRows = executeD1(
    `SELECT id, email, role, is_active FROM users WHERE email = '${escapeSql(email)}';`
  );

  if (existingUserRows.length > 0) {
    const existing = existingUserRows[0];
    if (existing.role === "ADMIN") {
      console.log(`Admin seed complete: ${email} (already exists, no changes made)`);
      process.exit(0);
    } else {
      console.error(
        `❌ Error: User with email '${email}' already exists with role '${existing.role}'. Cannot overwrite as ADMIN.`
      );
      process.exit(1);
    }
  }

  // Check if any active ADMIN already exists in the target database
  const activeAdminRows = executeD1(
    `SELECT id, email, role, is_active FROM users WHERE role = 'ADMIN' AND is_active = 1;`
  );

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  if (activeAdminRows.length > 0) {
    const existingAdmin = activeAdminRows[0];

    if (allowReplace) {
      // Intentionally replace the existing administrator
      const updateSql = `UPDATE users SET email = '${escapeSql(email)}', full_name = '${escapeSql(name)}', password_hash = '${escapeSql(passwordHash)}', updated_at = '${now}' WHERE id = '${existingAdmin.id}';`;
      executeD1(updateSql);
      console.log(`Admin seed complete: ${email} (updated existing administrator ${existingAdmin.email})`);
      process.exit(0);
    }

    if (force) {
      // Force insert additional admin if explicitly requested
      const id = `usr_admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const insertSql = `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at) VALUES ('${escapeSql(id)}', '${escapeSql(email)}', '${escapeSql(passwordHash)}', '${escapeSql(name)}', 'ADMIN', 1, '${now}', '${now}');`;
      executeD1(insertSql);
      console.log(`Admin seed complete: ${email} (force created)`);
      process.exit(0);
    }

    console.log(
      `⚠️ An active administrator already exists in the database (${existingAdmin.email}).`
    );
    console.log(`The system enforces exactly ONE administrator.`);
    console.log(`To prevent accidentally creating multiple administrators, no changes were made.`);
    console.log(
      `To replace the existing administrator with ${email}, run with --replace (e.g. npm run seed:admin -- --replace).`
    );
    process.exit(0);
  }

  // No active admin exists: insert fresh ADMIN user
  const id = `usr_admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const insertSql = `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at) VALUES ('${escapeSql(id)}', '${escapeSql(email)}', '${escapeSql(passwordHash)}', '${escapeSql(name)}', 'ADMIN', 1, '${now}', '${now}');`;

  executeD1(insertSql);
  console.log(`Admin seed complete: ${email}`);
}

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
