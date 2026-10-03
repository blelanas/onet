import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/** Minimum policy: 8+ chars, at least one letter and one digit. */
export function isStrongPassword(plain: string) {
  return plain.length >= 8 && /[A-Za-z]/.test(plain) && /\d/.test(plain);
}
