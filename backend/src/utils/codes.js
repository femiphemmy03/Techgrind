import crypto from 'crypto';

/** Normalizes a marketer's requested referral code: lowercase, alphanumeric + hyphen only. */
export function normalizeReferralCode(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

export function generateTxRef(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}
