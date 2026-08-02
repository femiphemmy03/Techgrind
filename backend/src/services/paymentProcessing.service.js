import { query, withTransaction } from '../config/db.js';
import { verifyTransaction } from './flutterwave.service.js';
import { sendPaymentConfirmedEmail, sendWelcomeEmail } from './email.service.js';
import { env } from '../config/env.js';

/**
 * Verifies a transaction directly against Flutterwave, then finalizes it:
 * - STARTUP fee: a `payments` row already exists (created when the logged-in student
 *   clicked "Pay") — this just flips it to successful and unlocks the startup group.
 * - REGISTRATION fee: no account exists yet. A `pending_registrations` row holds the
 *   form data; this converts it into a real user/student/referral row for the first time.
 *
 * Safe to call multiple times for the same transaction (webhook + frontend poll can both
 * call this) — every branch checks current state first and no-ops if already finalized.
 */
export async function verifyAndFinalizePayment(transactionId) {
  const verification = await verifyTransaction(transactionId);
  const vData = verification?.data;
  if (!vData || vData.status !== 'successful') {
    return { status: 'failed' };
  }

  const txRef = vData.tx_ref;

  // ---------- Case 1: an existing payments row (startup fee, or a registration that
  // was already converted by a prior call) ----------
  const existingPayment = await query('SELECT * FROM payments WHERE tx_ref = $1', [txRef]);
  if (existingPayment.rows.length) {
    const payment = existingPayment.rows[0];
    if (payment.status === 'successful') return { status: 'successful', type: payment.type };

    const expected = payment.type === 'registration' ? env.REGISTRATION_FEE_NGN : env.STARTUP_FEE_NGN;
    if (Number(vData.amount) < expected) {
      await query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      return { status: 'failed', reason: 'underpaid' };
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE payments SET status = 'successful', flw_transaction_id = $1, verified_at = now() WHERE id = $2`,
        [String(transactionId), payment.id]
      );
      if (payment.type === 'startup') {
        await client.query(`UPDATE students SET paid_startup = true, startup_paid_at = now() WHERE user_id = $1`, [
          payment.user_id,
        ]);
      }
    });

    const { rows: userRows } = await query('SELECT email FROM users WHERE id = $1', [payment.user_id]);
    if (userRows[0]) {
      sendPaymentConfirmedEmail(userRows[0].email, payment.type, Number(payment.amount)).catch((e) =>
        console.error('[email] payment confirmation failed', e)
      );
    }

    return { status: 'successful', type: payment.type };
  }

  // ---------- Case 2: a pending registration awaiting its first successful payment ----------
  const pendingResult = await query('SELECT * FROM pending_registrations WHERE tx_ref = $1', [txRef]);
  if (!pendingResult.rows.length) {
    return { status: 'not_found' };
  }
  const pending = pendingResult.rows[0];

  if (new Date(pending.expires_at) <= new Date()) {
    return { status: 'expired' };
  }
  if (Number(vData.amount) < env.REGISTRATION_FEE_NGN) {
    return { status: 'failed', reason: 'underpaid' };
  }

  const user = await withTransaction(async (client) => {
    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, username, password_hash, role) VALUES ($1,$2,$3,'student') RETURNING id, email, role, username`,
      [pending.email, pending.username, pending.password_hash]
    );
    const newUser = userRows[0];

    await client.query(
      `INSERT INTO students (user_id, cohort_id, track_id, referral_code_used, paid_registration) VALUES ($1,$2,$3,$4,true)`,
      [newUser.id, pending.cohort_id, pending.track_id, pending.referral_code_used]
    );

    await client.query(
      `INSERT INTO payments (user_id, type, amount, tx_ref, flw_transaction_id, status, verified_at)
       VALUES ($1,'registration',$2,$3,$4,'successful', now())`,
      [newUser.id, env.REGISTRATION_FEE_NGN, txRef, String(transactionId)]
    );

    if (pending.referral_code_used) {
      const { rows: affRows } = await client.query('SELECT user_id FROM affiliates WHERE referral_code = $1', [
        pending.referral_code_used,
      ]);
      if (affRows.length) {
        const affiliateId = affRows[0].user_id;
        await client.query(
          `INSERT INTO referrals (affiliate_id, student_user_id, cohort_id, status) VALUES ($1,$2,$3,'confirmed')`,
          [affiliateId, newUser.id, pending.cohort_id]
        );
        await client.query(
          `UPDATE affiliates SET confirmed_referrals = confirmed_referrals + 1, withdrawable_count = withdrawable_count + 1
           WHERE user_id = $1`,
          [affiliateId]
        );
      }
      // If the referral code no longer exists (e.g. affiliate changed their code in the
      // gap between registering and paying), the payment still succeeds — the student
      // just isn't attributed to anyone. This is correct: we never invent a referral.
    }

    await client.query('DELETE FROM pending_registrations WHERE id = $1', [pending.id]);

    return newUser;
  });

  sendWelcomeEmail(user.email, 'student', user.username).catch((e) => console.error('[email] welcome failed', e));
  sendPaymentConfirmedEmail(user.email, 'registration', env.REGISTRATION_FEE_NGN).catch((e) =>
    console.error('[email] payment confirmation failed', e)
  );

  return { status: 'successful', type: 'registration' };
}
