import { query } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { normalizeReferralCode } from '../utils/codes.js';
import { sendContactFormEmail } from '../services/email.service.js';
import { verifyAndFinalizePayment } from '../services/paymentProcessing.service.js';

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

export const verifyPayment = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) throw new AppError('Missing transaction reference.');

  const result = await verifyAndFinalizePayment(transactionId);
  res.json(result);
});
