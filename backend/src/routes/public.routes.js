import { Router } from 'express';
import * as ctrl from '../controllers/public.controller.js';
import { generalLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/cohort', ctrl.getCohortStatus);
router.get('/tracks', ctrl.getTracks);
router.get('/referral/:code', ctrl.checkReferralCode);
router.post('/contact', generalLimiter, ctrl.submitContact);
router.post('/verify-payment', generalLimiter, ctrl.verifyPayment);

export default router;
