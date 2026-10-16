import { Router } from 'express';
import * as ctrl from '../controllers/affiliate.controller.js';
import { requireAuth, requireAffiliateAccess } from '../middleware/auth.js';

const router = Router();
// Allows both standalone affiliate accounts (role='affiliate') and students who've opted in
// to the affiliate add-on on their own account — see requireAffiliateAccess (middleware/auth.js).
router.use(requireAuth, requireAffiliateAccess);

router.get('/dashboard', ctrl.getDashboard);
router.get('/banks', ctrl.getBanks);
router.post('/resolve-account', ctrl.resolveAccount);
router.post('/withdrawals', ctrl.requestWithdrawal);
router.get('/withdrawals', ctrl.getMyWithdrawals);
router.delete('/withdrawals/:id', ctrl.hideWithdrawal);
router.post('/referral-code', ctrl.changeReferralCode);

export default router;
