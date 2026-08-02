import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashPassword = (plain) => bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

/**
 * Minimum viable strength check — enforced server-side regardless of what the frontend does.
 * At least 8 chars, one letter, one number.
 */
export function isStrongPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}
