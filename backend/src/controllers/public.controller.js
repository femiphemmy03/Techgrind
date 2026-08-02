import { query } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { normalizeReferralCode } from '../utils/codes.js';
import { sendContactFormEmail } from '../services/email.service.js';
import { verifyAndFinalizePayment } from '../services/paymentProcessing.service.js';

/**
 * Drives which view the landing page shows. Deliberately independent of start_date —
 * registration can stay open weeks after classes begin (rolling/late registration).
 * start_date is informational display only here; it never gates registration.
 * - registration_open: registration_end_date hasn't passed yet -> show countdown + register CTA
 * - waitlist: registration_end_date has passed -> show "registration closed" notice
 */
export const getCohortStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, cohort_number, start_date, registration_end_date, status
     FROM cohorts WHERE is_active = true ORDER BY start_date DESC LIMIT 1`
  );
  const cohort = rows[0];
  if (!cohort) return res.json({ phase: 'none' });

  const phase = new Date() < new Date(cohort.registration_end_date) ? 'registration_open' : 'waitlist';

  res.json({ phase, cohort });
});

export const getTracks = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, slug, name FROM tracks ORDER BY name ASC');
  res.json({ tracks: rows });
});

export const checkReferralCode = asyncHandler(async (req, res) => {
  const code = normalizeReferralCode(req.params.code);
  const { rows } = await query('SELECT user_id FROM affiliates WHERE referral_code = $1', [code]);
  res.json({ valid: rows.length > 0 });
});

export const submitContact = asyncHandler(async (req, res) => {
  const { name, email, subject, body } = req.body;
  if (!name || !email || !subject || !body) throw new AppError('All fields are required.');
  if (String(body).length > 5000) throw new AppError('Message is too long.');

  await query('INSERT INTO contact_messages (name, email, subject, body) VALUES ($1,$2,$3,$4)', [
    name.slice(0, 200),
    email.slice(0, 200).toLowerCase(),
    subject.slice(0, 200),
    body.slice(0, 5000),
  ]);

  await sendContactFormEmail({ name, email, subject, body });
  res.json({ message: 'Your message has been sent. We\'ll get back to you shortly.' });
});

/**
 * Called by the frontend the instant Flutterwave redirects back — verifies directly against
 * Flutterwave's API (never trusts the redirect's own query params) and, if this is a first-time
 * registration payment, converts the pending registration into a real account right here. This
 * is why the student doesn't have to sit and wait for a separate webhook to arrive: whichever of
 * the two (this call, or the webhook) reaches Flutterwave's confirmation first does the work, and
 * the other safely no-ops.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) throw new AppError('Missing transaction reference.');

  const result = await verifyAndFinalizePayment(transactionId);
  res.json(result);
});