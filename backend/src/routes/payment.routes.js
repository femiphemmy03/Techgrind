import { Router } from 'express';
import * as ctrl from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/startup', requireAuth, ctrl.initiateStartupPayment);

export default router;
