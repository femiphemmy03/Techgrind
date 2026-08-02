import { Router } from 'express';
import { flutterwaveWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Note: this route is mounted BEFORE the global JSON body parser's normal use elsewhere is irrelevant here —
// Flutterwave sends JSON, express.json() applied at app level is fine since we don't need the raw body
// (signature is verified via the `verif-hash` header, not an HMAC over the raw payload).
router.post('/flutterwave', flutterwaveWebhook);

export default router;
