import { query } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { initiatePayment } from '../services/flutterwave.service.js';
import { generateTxRef } from '../utils/codes.js';
import { env } from '../config/env.js';

export const initiateStartupPayment = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') throw new AppError('Only students can pay the join-startup fee.', 403);

  const { rows } = await query('SELECT * FROM students WHERE user_id = $1', [req.user.id]);
  const student = rows[0];
  if (!student) throw new AppError('Student profile not found.', 404);
  if (student.paid_startup) throw new AppError('You have already paid the join-startup fee.', 409);

  const txRef = generateTxRef('STARTUP');
  await query(`INSERT INTO payments (user_id, type, amount, tx_ref) VALUES ($1,'startup',$2,$3)`, [
    req.user.id,
    env.STARTUP_FEE_NGN,
    txRef,
  ]);

  const payment = await initiatePayment({
    txRef,
    amount: env.STARTUP_FEE_NGN,
    email: req.user.email,
    name: req.user.email,
    redirectUrl: `${env.FRONTEND_URL}/payment/callback`,
    meta: { userId: req.user.id, type: 'startup' },
  });

  res.json({ checkoutUrl: payment?.data?.link || null, txRef });
});
