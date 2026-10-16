import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, ctrl.getMyNotifications);
export default router;
