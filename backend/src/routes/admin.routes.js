import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/stats', ctrl.getStats);

router.get('/cohorts', ctrl.listCohorts);
router.post('/cohorts', ctrl.createCohort);
router.patch('/cohorts/:id', ctrl.updateCohortDates);
router.post('/cohorts/:id/end', ctrl.endCohort);

router.get('/lecturers', ctrl.listLecturers);
router.post('/lecturers', ctrl.createLecturer);
router.patch('/lecturers/:id/assign', ctrl.assignLecturer);

router.get('/students', ctrl.listStudents);
router.get('/affiliates', ctrl.listAffiliates);
router.patch('/users/:id/active', ctrl.setUserActive);

router.get('/videos', ctrl.listVideosAdmin);
router.post('/videos', ctrl.upsertVideoAdmin);
router.delete('/videos/:id', ctrl.deleteVideoAdmin);

router.get('/assessments', ctrl.listAssessmentsAdmin);
router.get('/assessments/:id', ctrl.getAssessmentAdmin);
router.post('/assessments', ctrl.upsertAssessmentAdmin);
router.delete('/assessments/:id', ctrl.deleteAssessmentAdmin);

router.post('/notifications', ctrl.sendNotification);

router.get('/withdrawals', ctrl.listWithdrawals);
router.post('/withdrawals/:id/decide', ctrl.decideWithdrawal);

export default router;
