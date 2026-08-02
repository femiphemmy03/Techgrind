import { verifyAndFinalizePayment } from '../services/paymentProcessing.service.js';
import { env } from '../config/env.js';

/**
 * Safety-net path: Flutterwave calls this asynchronously after a payment.
 * The fast path most users actually experience is the frontend's own immediate
 * check right after redirect (see public.controller.js -> verifyPayment), which
 * calls the exact same verifyAndFinalizePayment function — so whichever arrives
 * first does the work, and this one just no-ops if it's already done.
 */
export async function flutterwaveWebhook(req, res) {
  try {
    const signature = req.headers['verif-hash'];
    if (!signature || signature !== env.FLW_WEBHOOK_SECRET_HASH) {
      return res.status(401).json({ error: 'Invalid signature.' });
    }

    const transactionId = req.body?.data?.id;
    if (!transactionId) return res.status(400).json({ error: 'Malformed payload.' });

    const result = await verifyAndFinalizePayment(transactionId);
    res.status(200).json({ received: true, result });
  } catch (err) {
    console.error('[webhook] error', err);
    res.status(200).json({ received: true, error: true }); // 200 so Flutterwave doesn't hammer retries on our bug
  }
}
