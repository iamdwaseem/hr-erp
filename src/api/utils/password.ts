/**
 * Cryptographic password hashing and verification using Web Crypto API.
 * Uses PBKDF2 with SHA-256 and 100,000 iterations.
 * Compatible with Node.js 18+ and Cloudflare Workers runtime.
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hash a plaintext password into a formatted PBKDF2 string:
 * `pbkdf2:<saltHex>:<hashHex>`
 */
export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
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

/**
 * Verify a plaintext password against a stored hash string.
 * Supports constant-time length-safe comparison and backward-compatible fallback.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const [, saltHex, expectedHashHex] = parts;
    if (!saltHex || !expectedHashHex) return false;

    const computed = await hashPassword(password, saltHex);
    const [, , computedHashHex] = computed.split(":");

    if (expectedHashHex.length !== computedHashHex.length) {
      return false;
    }

    // Constant-time comparison
    let match = 0;
    for (let i = 0; i < expectedHashHex.length; i++) {
      match |= expectedHashHex.charCodeAt(i) ^ computedHashHex.charCodeAt(i);
    }
    return match === 0;
  }

  // Fallback for legacy plaintext entries if any
  return password === storedHash;
}
