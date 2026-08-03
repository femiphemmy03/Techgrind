import { query, withTransaction } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { normalizeReferralCode } from '../utils/codes.js';
import { listBanks, resolveAccountName, initiateTransfer } from '../services/flutterwave.service.js';
import { env } from '../config/env.js';

async function getAffiliate(userId) {
  const { rows } = await query('SELECT * FROM affiliates WHERE user_id = $1', [userId]);
  if (!rows.length) throw new AppError('Affiliate profile not found.', 404);
  return rows[0];
}

function friendlyFlutterwaveError(err, fallback) {
  const flwMessage = err?.response?.data?.message;
  return new AppError(flwMessage || fallback, 422);
}

export const getDashboard = asyncHandler(async (req, res) => {
  const affiliate = await getAffiliate(req.user.id);
  const { rows: userRows } = await query('SELECT email, username FROM users WHERE id = $1', [req.user.id]);

  res.json({
    email: userRows[0].email,
    username: userRows[0].username,
    referralCode: affiliate.referral_code,
    referralLink: `${env.FRONTEND_URL}/${affiliate.referral_code}`,
    confirmedReferrals: affiliate.confirmed_referrals,
    withdrawableCount: affiliate.withdrawable_count,
    withdrawableAmount: affiliate.withdrawable_count * env.AFFILIATE_PAYOUT_PER_REFERRAL_NGN,
    payoutPerReferral: env.AFFILIATE_PAYOUT_PER_REFERRAL_NGN,
    maxWithdrawalsPerMonth: env.MAX_WITHDRAWALS_PER_MONTH,
    minDaysBetweenWithdrawals: env.MIN_DAYS_BETWEEN_WITHDRAWALS,
  });
});

export const getBanks = asyncHandler(async (req, res) => {
  const data = await listBanks();
  const raw = data?.data || [];
  const seen = new Set();
  const banks = raw.filter((b) => {
    if (seen.has(b.code)) return false;
    seen.add(b.code);
    return true;
  });
  res.json({ banks });
});

export const resolveAccount = asyncHandler(async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!accountNumber || !bankCode) throw new AppError('Account number and bank are required.');
  try {
    const data = await resolveAccountName({ accountNumber, bankCode });
    if (!data?.data?.account_name) throw new AppError('Could not resolve that account. Please check the details.', 422);
    res.json({ accountName: data.data.account_name });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw friendlyFlutterwaveError(err, 'Could not resolve that account. Please check the details.');
  }
});

export const requestWithdrawal = asyncHandler(async (req, res) => {
  const affiliate = await getAffiliate(req.user.id);
  const { accountNumber, bankCode, bankName, confirm } = req.body;
  if (!accountNumber || !bankCode) throw new AppError('Account number and bank are required.');
  if (confirm !== true) {
    throw new AppError('Please confirm you have checked your account details before submitting.');
  }

  if (affiliate.withdrawable_count <= 0) throw new AppError('You have no withdrawable referrals yet.', 409);

  const { rows: recentRows } = await query(
    `SELECT requested_at FROM withdrawals
     WHERE affiliate_id = $1 AND requested_at >= now() - interval '30 days'
     ORDER BY requested_at DESC`,
    [req.user.id]
  );

  if (recentRows.length >= env.MAX_WITHDRAWALS_PER_MONTH) {
    throw new AppError(`You can only withdraw up to ${env.MAX_WITHDRAWALS_PER_MONTH} times in a rolling 30-day period.`, 429);
  }

  if (recentRows.length) {
    const daysSinceLast = (Date.now() - new Date(recentRows[0].requested_at).getTime()) / 86400000;
    if (daysSinceLast < env.MIN_DAYS_BETWEEN_WITHDRAWALS) {
      const daysLeft = Math.ceil(env.MIN_DAYS_BETWEEN_WITHDRAWALS - daysSinceLast);
      throw new AppError(`Please wait ${daysLeft} more day(s) before your next withdrawal.`, 429);
    }
  }

  let accountName;
  try {
    const verified = await resolveAccountName({ accountNumber, bankCode });
    accountName = verified?.data?.account_name;
    if (!accountName) throw new AppError('Could not verify that account. Please check the details.', 422);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw friendlyFlutterwaveError(err, 'Could not verify that account. Please check the details.');
  }

  const count = affiliate.withdrawable_count;
  const amount = count * env.AFFILIATE_PAYOUT_PER_REFERRAL_NGN;

  const withdrawal = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO withdrawals (affiliate_id, count_requested, amount, bank_code, bank_name, account_number, account_name, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
      [req.user.id, count, amount, bankCode, bankName || null, accountNumber, accountName]
    );
    await client.query('UPDATE affiliates SET withdrawable_count = 0 WHERE user_id = $1', [req.user.id]);
    return rows[0];
  });

  try {
    const transfer = await initiateTransfer({
      accountNumber,
      bankCode,
      amount,
      narration: `TechGrind affiliate payout — ${count} referrals`,
      reference: `WD_${withdrawal.id}`,
    });

    await query(
      `UPDATE withdrawals SET status = 'paid', processed_at = now(), flw_transfer_id = $1 WHERE id = $2`,
      [String(transfer?.data?.id || ''), withdrawal.id]
    );

    res.status(201).json({ withdrawal: { ...withdrawal, status: 'paid' } });
  } catch (err) {
    await withTransaction(async (client) => {
      await client.query(`UPDATE withdrawals SET status = 'failed', processed_at = now() WHERE id = $1`, [withdrawal.id]);
      await client.query('UPDATE affiliates SET withdrawable_count = withdrawable_count + $1 WHERE user_id = $2', [
        count,
        req.user.id,
      ]);
    });
    throw friendlyFlutterwaveError(err, 'The transfer could not be completed. Your balance has been restored — please try again.');
  }
});

export const getMyWithdrawals = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM withdrawals WHERE affiliate_id = $1 ORDER BY requested_at DESC', [
    req.user.id,
  ]);
  res.json({ withdrawals: rows });
});

export const changeReferralCode = asyncHandler(async (req, res) => {
  const { newCode, confirm } = req.body;
  if (confirm !== true) {
    throw new AppError('Please confirm you understand this will permanently reset your referral count.');
  }
  const normalized = normalizeReferralCode(newCode);
  if (normalized.length < 3) throw new AppError('Referral code must be at least 3 characters.');

  const existing = await query('SELECT user_id FROM affiliates WHERE referral_code = $1', [normalized]);
  if (existing.rows.length) throw new AppError('That referral code is already taken.', 409);

  await query(
    'UPDATE affiliates SET referral_code = $1, confirmed_referrals = 0, withdrawable_count = 0 WHERE user_id = $2',
    [normalized, req.user.id]
  );

  res.json({ referralCode: normalized });
});
