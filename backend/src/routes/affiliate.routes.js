import { Router } from 'express';
import * as ctrl from '../controllers/affiliate.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('affiliate'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/banks', ctrl.getBanks);
router.post('/resolve-account', ctrl.resolveAccount);
router.post('/withdrawals', ctrl.requestWithdrawal);
router.get('/withdrawals', ctrl.getMyWithdrawals);
router.post('/referral-code', ctrl.changeReferralCode);

export default router;
