import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register/student', authLimiter, ctrl.registerStudent);
router.post('/register/affiliate', authLimiter, ctrl.registerAffiliate);
router.post('/login', authLimiter, ctrl.login);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/verify-otp', authLimiter, ctrl.verifyOtp);
router.post('/reset-password', authLimiter, ctrl.resetPassword);
router.get('/me', requireAuth, ctrl.me);

export default router;
