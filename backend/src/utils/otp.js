import crypto from 'crypto';
import { env } from '../config/env.js';

export function generateOtp() {
  const max = 10 ** env.OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(env.OTP_LENGTH, '0');
}

export function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}
