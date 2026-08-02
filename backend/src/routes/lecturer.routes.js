import { Router } from 'express';
import * as ctrl from '../controllers/lecturer.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('lecturer'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/students', ctrl.getMyStudents);
router.get('/videos', ctrl.getVideos);
router.post('/videos', ctrl.uploadVideo);
router.post('/assessments', ctrl.createAssessment);
router.get('/assessments', ctrl.getAssessments);
router.get('/grades', ctrl.getGrades);

export default router;
