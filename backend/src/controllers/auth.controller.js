import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../config/db.js';
import { hashPassword, comparePassword, isStrongPassword } from '../utils/password.js';
import { generateOtp, hashOtp } from '../utils/otp.js';
import { normalizeReferralCode, generateTxRef } from '../utils/codes.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { sendOtpEmail } from '../services/email.service.js';
import { initiatePayment } from '../services/flutterwave.service.js';
import { TRACKS, env } from '../config/env.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PENDING_REGISTRATION_TTL_MINUTES = 120;

function assertPasswordsOk(password, confirmPassword) {
  if (!isStrongPassword(password)) {
    throw new AppError('Password must be at least 8 characters and include a letter and a number.');
  }
  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match.');
  }
}

async function getOpenCohort() {
  const { rows } = await query(
    `SELECT * FROM cohorts WHERE is_active = true AND status = 'registration_open' AND registration_end_date > now()
     ORDER BY start_date ASC LIMIT 1`
  );
  return rows[0] || null;
}

export const registerStudent = asyncHandler(async (req, res) => {
  const { email, username, password, confirmPassword, trackSlug, referralCode } = req.body;

  if (!email || !EMAIL_RE.test(email)) throw new AppError('A valid email address is required.');
  if (!trackSlug || !TRACKS[trackSlug]) throw new AppError('Please select a valid track.');
  assertPasswordsOk(password, confirmPassword);

  const cohort = await getOpenCohort();
  if (!cohort) throw new AppError('Registration is not currently open. Please check back for the next cohort.', 409);

  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existingUser.rows.length) throw new AppError('An account with this email already exists.', 409);

  const existingPending = await query(
    'SELECT id FROM pending_registrations WHERE email = $1 AND expires_at > now()',
    [email.toLowerCase()]
  );
  if (existingPending.rows.length) {
    throw new AppError('A registration for this email is already awaiting payment. Please complete that payment, or wait a couple of hours and try again.', 409);
  }

  let normalizedRef = null;
  if (referralCode) {
    normalizedRef = normalizeReferralCode(referralCode);
    const { rows } = await query('SELECT user_id FROM affiliates WHERE referral_code = $1', [normalizedRef]);
    if (!rows.length) throw new AppError('That referral code was not found. Leave it blank if you don\'t have one.');
  }

  const trackRow = await query('SELECT id, name FROM tracks WHERE slug = $1', [trackSlug]);
  if (!trackRow.rows.length) throw new AppError('That track is not available right now.');
  const track = trackRow.rows[0];

  const passwordHash = await hashPassword(password);
  const txRef = generateTxRef('REG');
  const expiresAt = new Date(Date.now() + PENDING_REGISTRATION_TTL_MINUTES * 60 * 1000);

  await query('DELETE FROM pending_registrations WHERE email = $1 AND expires_at <= now()', [email.toLowerCase()]);

  await query(
    `INSERT INTO pending_registrations (email, username, password_hash, track_id, cohort_id, referral_code_used, tx_ref, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [email.toLowerCase(), username || null, passwordHash, track.id, cohort.id, normalizedRef, txRef, expiresAt]
  );

  const payment = await initiatePayment({
    txRef,
    amount: env.REGISTRATION_FEE_NGN,
    email: email.toLowerCase(),
    name: username || email,
    redirectUrl: `${env.FRONTEND_URL}/payment/callback`,
    meta: { type: 'registration' },
  });

  res.status(201).json({ checkoutUrl: payment?.data?.link || null, txRef });
});

export const registerAffiliate = asyncHandler(async (req, res) => {
  const { email, referralCode, password, confirmPassword } = req.body;

  if (!email || !EMAIL_RE.test(email)) throw new AppError('A valid email address is required.');
  if (!referralCode) throw new AppError('Please choose a referral code.');
  assertPasswordsOk(password, confirmPassword);

  const normalized = normalizeReferralCode(referralCode);
  if (normalized.length < 3) throw new AppError('Referral code must be at least 3 characters.');

  const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existingEmail.rows.length) throw new AppError('An account with this email already exists.', 409);

  const existingCode = await query('SELECT user_id FROM affiliates WHERE referral_code = $1', [normalized]);
  if (existingCode.rows.length) throw new AppError('That referral code is already taken. Please choose another.', 409);

  const passwordHash = await hashPassword(password);

  const user = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'affiliate') RETURNING id, email, role`,
      [email.toLowerCase(), passwordHash]
    );
    const newUser = rows[0];
    await client.query(`INSERT INTO affiliates (user_id, referral_code) VALUES ($1,$2)`, [newUser.id, normalized]);
    return newUser;
  });

  const token = signToken(user);

  res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required.');

  const { rows } = await query('SELECT id, email, username, role, password_hash, is_active FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);
  const user = rows[0];

  const dummyHash = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8u3sSQXNjRjIufk4gG9RCUmpaqe0fu';
  const ok = user ? await comparePassword(password, user.password_hash) : await comparePassword(password, dummyHash);

  if (!user || !ok) throw new AppError('Incorrect email or password.', 401);
  if (!user.is_active) throw new AppError('This account has been deactivated. Contact support.', 403);

  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) throw new AppError('A valid email address is required.');

  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (!rows.length) {
    throw new AppError('No account was found with that email address.', 404);
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
  await query('INSERT INTO otp_codes (email, code_hash, expires_at) VALUES ($1,$2,$3)', [
    email.toLowerCase(),
    hashOtp(code),
    expiresAt,
  ]);

  await sendOtpEmail(email.toLowerCase(), code);
  res.json({ message: 'A reset code has been sent to your email.' });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) throw new AppError('Email and code are required.');

  const { rows } = await query(
    `SELECT * FROM otp_codes WHERE email = $1 AND used = false AND expires_at > now() ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase()]
  );
  const otp = rows[0];
  if (!otp || otp.code_hash !== hashOtp(code)) throw new AppError('Invalid or expired code.', 400);

  await query('UPDATE otp_codes SET used = true WHERE id = $1', [otp.id]);

  const resetToken = jwt.sign({ email: email.toLowerCase(), purpose: 'reset' }, env.JWT_SECRET, { expiresIn: '10m' });
  res.json({ resetToken });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;
  if (!resetToken) throw new AppError('Reset session expired. Please request a new code.', 400);
  assertPasswordsOk(newPassword, confirmPassword);

  let payload;
  try {
    payload = jwt.verify(resetToken, env.JWT_SECRET);
  } catch {
    throw new AppError('Reset session expired. Please request a new code.', 400);
  }
  if (payload.purpose !== 'reset') throw new AppError('Invalid reset session.', 400);

  const passwordHash = await hashPassword(newPassword);
  const result = await query('UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id', [
    passwordHash,
    payload.email,
  ]);
  if (!result.rows.length) throw new AppError('Account not found.', 404);

  res.json({ message: 'Password has been reset. You can now log in.' });
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, email, username, role FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: rows[0] });
});
