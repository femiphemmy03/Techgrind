import { query, withTransaction } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { normalizeReferralCode } from '../utils/codes.js';
import { listBanks, resolveAccountName } from '../services/flutterwave.service.js';
import { env } from '../config/env.js';

async function getAffiliate(userId) {
  const { rows } = await query('SELECT * FROM affiliates WHERE user_id = $1', [userId]);
  if (!rows.length) throw new AppError('Affiliate profile not found.', 404);
  return rows[0];
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
  });
});

export const getBanks = asyncHandler(async (req, res) => {
  const data = await listBanks();
  res.json({ banks: data?.data || [] });
});

export const resolveAccount = asyncHandler(async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!accountNumber || !bankCode) throw new AppError('Account number and bank are required.');
  const data = await resolveAccountName({ accountNumber, bankCode });
  if (!data?.data?.account_name) throw new AppError('Could not resolve that account. Please check the details.', 422);
  res.json({ accountName: data.data.account_name });
});

export const requestWithdrawal = asyncHandler(async (req, res) => {
  const affiliate = await getAffiliate(req.user.id);
  const { accountNumber, bankCode, bankName } = req.body;
  if (!accountNumber || !bankCode) throw new AppError('Account number and bank are required.');

  if (affiliate.withdrawable_count <= 0) throw new AppError('You have no withdrawable referrals yet.', 409);

  const { rows: monthRows } = await query(
    `SELECT COUNT(*)::int AS count FROM withdrawals
     WHERE affiliate_id = $1 AND requested_at >= date_trunc('month', now())`,
    [req.user.id]
  );
  if (monthRows[0].count >= env.MAX_WITHDRAWALS_PER_MONTH) {
    throw new AppError(`You can only request up to ${env.MAX_WITHDRAWALS_PER_MONTH} withdrawals per month.`, 429);
  }

  const verified = await resolveAccountName({ accountNumber, bankCode });
  const accountName = verified?.data?.account_name;
  if (!accountName) throw new AppError('Could not verify that account. Please check the details.', 422);

  const count = affiliate.withdrawable_count;
  const amount = count * env.AFFILIATE_PAYOUT_PER_REFERRAL_NGN;

  const withdrawal = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO withdrawals (affiliate_id, count_requested, amount, bank_code, bank_name, account_number, account_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, count, amount, bankCode, bankName || null, accountNumber, accountName]
    );
    // Reserve the count immediately so it can't be double-requested while pending admin approval.
    await client.query('UPDATE affiliates SET withdrawable_count = 0 WHERE user_id = $1', [req.user.id]);
    return rows[0];
  });

  res.status(201).json({ withdrawal });
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
