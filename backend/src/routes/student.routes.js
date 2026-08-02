import { Router } from 'express';
import * as ctrl from '../controllers/student.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('student'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/videos', ctrl.getVideos);
router.get('/assessments', ctrl.getAssessments);
router.get('/assessments/:id', ctrl.getAssessmentQuestions);
router.post('/assessments/:id/submit', ctrl.submitAssessment);
router.get('/certificate/eligibility', ctrl.getCertificateEligibility);
router.post('/certificate', ctrl.issueCertificate);

export default router;
