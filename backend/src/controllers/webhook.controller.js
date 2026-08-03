import { verifyAndFinalizePayment } from '../services/paymentProcessing.service.js';
import { env } from '../config/env.js';

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
    res.status(200).json({ received: true, error: true });
  }
}
