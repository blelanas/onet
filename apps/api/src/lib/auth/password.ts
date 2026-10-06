import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/** bcrypt only hashes the first 72 bytes: longer passwords would be silently truncated. */
export const MAX_PASSWORD_BYTES = 72;

/** Minimum policy: 8+ chars, at least one letter and one digit, at most 72 UTF-8 bytes. */
export function isStrongPassword(plain: string) {
  return plain.length >= 8 && Buffer.byteLength(plain, "utf8") <= MAX_PASSWORD_BYTES && /[A-Za-z]/.test(plain) && /\d/.test(plain);
}

/** A valid bcrypt hash of a random throwaway password: compared against when the account doesn't exist, so timing doesn't reveal it. */
const DUMMY_HASH = "$2b$12$lxb55srtE1m3Guz0oXTz8eVmxX32KLdjQeLu81Gte.RHa9hVAu/XS";

/** Burns the same bcrypt work as a real check, always resolving to false. */
export async function verifyDummyPassword(plain: string) {
  await bcrypt.compare(plain, DUMMY_HASH);
  return false;
}
