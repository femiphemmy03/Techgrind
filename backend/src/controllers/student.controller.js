import { query } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { currentCalendarWeek, isWeekUnlocked, isAssessmentOpen } from '../utils/cohortWeek.js';
import { youtubeEmbedUrl, youtubeThumbnailUrl } from '../services/youtube.service.js';
import { generateCertificatePdf } from '../services/certificate.service.js';
import { TRACKS } from '../config/env.js';

async function getStudentContext(userId) {
  const { rows } = await query(
    `SELECT s.*, c.name AS cohort_name, c.start_date, c.status AS cohort_status, c.id AS cohort_id,
            t.slug AS track_slug, t.name AS track_name
     FROM students s
     JOIN cohorts c ON c.id = s.cohort_id
     JOIN tracks t ON t.id = s.track_id
     WHERE s.user_id = $1`,
    [userId]
  );
  if (!rows.length) throw new AppError('Student profile not found. Your cohort may have ended.', 404);
  return rows[0];
}

export const getDashboard = asyncHandler(async (req, res) => {
  const student = await getStudentContext(req.user.id);
  const { rows: userRows } = await query('SELECT email, username FROM users WHERE id = $1', [req.user.id]);
  const trackLinks = TRACKS[student.track_slug] || {};

  res.json({
    email: userRows[0].email,
    username: userRows[0].username,
    track: { slug: student.track_slug, name: student.track_name },
    cohort: { id: student.cohort_id, name: student.cohort_name, startDate: student.start_date, status: student.cohort_status },
    currentWeek: currentCalendarWeek({ start_date: student.start_date }),
    paidRegistration: student.paid_registration,
    paidStartup: student.paid_startup,
    telegram: {
      general: student.paid_registration ? trackLinks.telegramGeneral || null : null,
      startup: student.paid_startup ? trackLinks.telegramStartup || null : null,
    },
  });
});

export const getVideos = asyncHandler(async (req, res) => {
  const student = await getStudentContext(req.user.id);
  const { rows } = await query(
    `SELECT id, week_number, class_number, youtube_id, title FROM videos
     WHERE track_id = $1 AND cohort_id = $2 ORDER BY week_number, class_number`,
    [student.track_id, student.cohort_id]
  );

  const unlocked = rows
    .filter((v) => isWeekUnlocked({ start_date: student.start_date }, v.week_number))
    .map((v) => ({
      id: v.id,
      week: v.week_number,
      class: v.class_number,
      title: v.title,
      embedUrl: youtubeEmbedUrl(v.youtube_id),
      thumbnailUrl: youtubeThumbnailUrl(v.youtube_id),
      watchUrl: `https://www.youtube.com/watch?v=${v.youtube_id}`,
    }));

  res.json({ videos: unlocked });
});

export const getAssessments = asyncHandler(async (req, res) => {
  const student = await getStudentContext(req.user.id);
  const { rows } = await query(
    `SELECT a.id, a.week_number, a.opens_at, a.closes_at,
            sub.score AS my_score, sub.submitted_at AS my_submitted_at
     FROM assessments a
     LEFT JOIN assessment_submissions sub ON sub.assessment_id = a.id AND sub.student_user_id = $3
     WHERE a.track_id = $1 AND a.cohort_id = $2
     ORDER BY a.week_number`,
    [student.track_id, student.cohort_id, req.user.id]
  );

  const now = new Date();
  const list = rows.map((a) => {
    let status = 'locked';
    if (a.my_submitted_at) status = 'submitted';
    else if (now >= new Date(a.opens_at) && now <= new Date(a.closes_at)) status = 'open';
    else if (now > new Date(a.closes_at)) status = 'closed';
    return {
      id: a.id,
      week: a.week_number,
      opensAt: a.opens_at,
      closesAt: a.closes_at,
      status,
      score: a.my_score !== null ? Number(a.my_score) : null,
    };
  });

  res.json({ assessments: list });
});

export const getAssessmentQuestions = asyncHandler(async (req, res) => {
  const student = await getStudentContext(req.user.id);
  const { rows: aRows } = await query(
    `SELECT * FROM assessments WHERE id = $1 AND track_id = $2 AND cohort_id = $3`,
    [req.params.id, student.track_id, student.cohort_id]
  );
  const assessment = aRows[0];
  if (!assessment) throw new AppError('Assessment not found.', 404);

  const { rows: subRows } = await query(
    'SELECT * FROM assessment_submissions WHERE assessment_id = $1 AND student_user_id = $2',
    [assessment.id, req.user.id]
  );
  if (subRows.length) {
    return res.json({ submitted: true, score: Number(subRows[0].score) });
  }

  if (!isAssessmentOpen(assessment)) throw new AppError('This assessment is not currently open.', 403);

  const { rows: qRows } = await query(
    'SELECT id, question_text, options FROM assessment_questions WHERE assessment_id = $1 ORDER BY position',
    [assessment.id]
  );
  res.json({ submitted: false, closesAt: assessment.closes_at, questions: qRows });
});

export const submitAssessment = asyncHandler(async (req, res) => {
  const student = await getStudentContext(req.user.id);
  const { answers } = req.body; // { questionId: chosenIndex }
  if (!answers || typeof answers !== 'object') throw new AppError('Answers are required.');

  const { rows: aRows } = await query(
    `SELECT * FROM assessments WHERE id = $1 AND track_id = $2 AND cohort_id = $3`,
    [req.params.id, student.track_id, student.cohort_id]
  );
  const assessment = aRows[0];
  if (!assessment) throw new AppError('Assessment not found.', 404);
  if (!isAssessmentOpen(assessment)) throw new AppError('This assessment window has closed.', 403);

  const existing = await query('SELECT id FROM assessment_submissions WHERE assessment_id = $1 AND student_user_id = $2', [
    assessment.id,
    req.user.id,
  ]);
  if (existing.rows.length) throw new AppError('You have already submitted this assessment.', 409);

  const { rows: qRows } = await query('SELECT id, correct_index FROM assessment_questions WHERE assessment_id = $1', [
    assessment.id,
  ]);
  if (!qRows.length) throw new AppError('This assessment has no questions yet.', 409);

  let correct = 0;
  for (const q of qRows) {
    if (Number(answers[q.id]) === q.correct_index) correct += 1;
  }
  const score = Math.round((correct / qRows.length) * 10000) / 100; // 0–100, 2dp

  await query(
    'INSERT INTO assessment_submissions (assessment_id, student_user_id, answers, score) VALUES ($1,$2,$3,$4)',
    [assessment.id, req.user.id, JSON.stringify(answers), score]
  );

  res.json({ score });
});

export const getCertificateEligibility = asyncHandler(async (req, res) => {
  const student = await getStudentContext(req.user.id);

  const { rows } = await query(
    `SELECT sub.score FROM assessment_submissions sub
     JOIN assessments a ON a.id = sub.assessment_id
     WHERE a.track_id = $1 AND a.cohort_id = $2 AND sub.student_user_id = $3`,
    [student.track_id, student.cohort_id, req.user.id]
  );

  const attempted = rows.length;
  const average = attempted ? rows.reduce((sum, r) => sum + Number(r.score), 0) / 10 : 0; // divided by 10 total weeks, per spec
  const eligible = attempted >= 10 && average >= 75;

  res.json({ attempted, average: Math.round(average * 100) / 100, eligible, required: { attempted: 10, average: 75 } });
});

export const issueCertificate = asyncHandler(async (req, res) => {
  const student = await getStudentContext(req.user.id);
  const { fullName } = req.body;
  if (!fullName || fullName.trim().length < 3) throw new AppError('Please enter your full name.');

  const { rows } = await query(
    `SELECT sub.score FROM assessment_submissions sub
     JOIN assessments a ON a.id = sub.assessment_id
     WHERE a.track_id = $1 AND a.cohort_id = $2 AND sub.student_user_id = $3`,
    [student.track_id, student.cohort_id, req.user.id]
  );
  const attempted = rows.length;
  const average = attempted ? rows.reduce((sum, r) => sum + Number(r.score), 0) / 10 : 0;
  if (attempted < 10 || average < 75) throw new AppError('You are not yet eligible for a certificate.', 403);

  await query(
    `INSERT INTO certificates (student_user_id, cohort_id, track_id, full_name, final_score) VALUES ($1,$2,$3,$4,$5)`,
    [req.user.id, student.cohort_id, student.track_id, fullName.trim().slice(0, 150), average]
  );

  const pdfBytes = await generateCertificatePdf({
    fullName: fullName.trim().slice(0, 150),
    trackName: student.track_name,
    finalScore: average,
    cohortName: student.cohort_name,
    issuedAt: new Date(),
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="techgrind-certificate.pdf"');
  res.send(Buffer.from(pdfBytes));
});
