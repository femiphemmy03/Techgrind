import { query, withTransaction } from '../config/db.js';
import { verifyTransaction } from './flutterwave.service.js';
import { env } from '../config/env.js';

export async function verifyAndFinalizePayment(transactionId) {
  const verification = await verifyTransaction(transactionId);
  const vData = verification?.data;
  if (!vData || vData.status !== 'successful') {
    return { status: 'failed' };
  }

  const txRef = vData.tx_ref;

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

    return { status: 'successful', type: payment.type };
  }

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

  await withTransaction(async (client) => {
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
    }

    await client.query('DELETE FROM pending_registrations WHERE id = $1', [pending.id]);
  });

  return { status: 'successful', type: 'registration' };
}
