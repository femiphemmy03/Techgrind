import { query } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { extractYoutubeId } from '../services/youtube.service.js';

async function getLecturerContext(userId) {
  const { rows } = await query(
    `SELECT l.*, t.slug AS track_slug, t.name AS track_name, c.name AS cohort_name
     FROM lecturers l
     LEFT JOIN tracks t ON t.id = l.track_id
     LEFT JOIN cohorts c ON c.id = l.cohort_id
     WHERE l.user_id = $1`,
    [userId]
  );
  const lecturer = rows[0];
  if (!lecturer || !lecturer.track_id || !lecturer.cohort_id) {
    throw new AppError('You have not been assigned to a track/cohort yet. Contact the admin.', 409);
  }
  return lecturer;
}

export const getDashboard = asyncHandler(async (req, res) => {
  const lecturer = await getLecturerContext(req.user.id);
  const { rows: countRows } = await query(
    'SELECT COUNT(*)::int AS count FROM students WHERE track_id = $1 AND cohort_id = $2',
    [lecturer.track_id, lecturer.cohort_id]
  );
  res.json({
    track: { id: lecturer.track_id, slug: lecturer.track_slug, name: lecturer.track_name },
    cohort: { id: lecturer.cohort_id, name: lecturer.cohort_name },
    studentCount: countRows[0].count,
  });
});

export const getMyStudents = asyncHandler(async (req, res) => {
  const lecturer = await getLecturerContext(req.user.id);
  const { rows } = await query(
    `SELECT u.id, u.email, u.username, s.paid_registration, s.paid_startup, s.created_at
     FROM students s JOIN users u ON u.id = s.user_id
     WHERE s.track_id = $1 AND s.cohort_id = $2 ORDER BY s.created_at DESC`,
    [lecturer.track_id, lecturer.cohort_id]
  );
  res.json({ students: rows });
});

export const uploadVideo = asyncHandler(async (req, res) => {
  const lecturer = await getLecturerContext(req.user.id);
  const { week, classNumber, youtubeUrl, title } = req.body;

  const weekNum = Number(week);
  const classNum = Number(classNumber);
  if (!(weekNum >= 1 && weekNum <= 12)) throw new AppError('Week must be between 1 and 12.');
  if (!(classNum >= 1 && classNum <= 3)) throw new AppError('Class must be between 1 and 3.');

  const youtubeId = extractYoutubeId(youtubeUrl);
  if (!youtubeId) throw new AppError('Please provide a valid YouTube link or video ID.');
  if (!title || !title.trim()) throw new AppError('A title is required.');

  const existing = await query(
    'SELECT id FROM videos WHERE track_id = $1 AND cohort_id = $2 AND week_number = $3 AND class_number = $4',
    [lecturer.track_id, lecturer.cohort_id, weekNum, classNum]
  );
  if (existing.rows.length) {
    throw new AppError('A video already exists for that week/class. Ask an admin to edit or delete it.', 409);
  }

  const { rows } = await query(
    `INSERT INTO videos (track_id, cohort_id, week_number, class_number, youtube_id, title, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [lecturer.track_id, lecturer.cohort_id, weekNum, classNum, youtubeId, title.trim(), req.user.id]
  );
  res.status(201).json({ video: rows[0] });
});

export const getVideos = asyncHandler(async (req, res) => {
  const lecturer = await getLecturerContext(req.user.id);
  const { rows } = await query(
    'SELECT * FROM videos WHERE track_id = $1 AND cohort_id = $2 ORDER BY week_number, class_number',
    [lecturer.track_id, lecturer.cohort_id]
  );
  res.json({ videos: rows });
});

export const createAssessment = asyncHandler(async (req, res) => {
  const lecturer = await getLecturerContext(req.user.id);
  const { week, opensAt, closesAt, questions } = req.body;

  const weekNum = Number(week);
  if (!(weekNum >= 1 && weekNum <= 10)) throw new AppError('Assessment week must be between 1 and 10.');
  if (!opensAt || !closesAt) throw new AppError('Opening and closing times are required.');
  if (!Array.isArray(questions) || questions.length === 0) throw new AppError('At least one question is required.');

  for (const q of questions) {
    if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2) {
      throw new AppError('Each question needs text and at least two options.');
    }
    if (!(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length)) {
      throw new AppError('Each question needs a valid correct-answer index.');
    }
  }

  const { rows: existing } = await query(
    'SELECT id FROM assessments WHERE track_id = $1 AND cohort_id = $2 AND week_number = $3',
    [lecturer.track_id, lecturer.cohort_id, weekNum]
  );
  if (existing.length) {
    throw new AppError('An assessment already exists for that week. Ask an admin to edit or delete it.', 409);
  }

  const { rows } = await query(
    `INSERT INTO assessments (track_id, cohort_id, week_number, opens_at, closes_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [lecturer.track_id, lecturer.cohort_id, weekNum, opensAt, closesAt, req.user.id]
  );
  const assessmentId = rows[0].id;

  let position = 0;
  for (const q of questions) {
    await query(
      'INSERT INTO assessment_questions (assessment_id, question_text, options, correct_index, position) VALUES ($1,$2,$3,$4,$5)',
      [assessmentId, q.questionText.trim(), JSON.stringify(q.options), q.correctIndex, position++]
    );
  }

  res.status(201).json({ assessmentId });
});

export const getAssessments = asyncHandler(async (req, res) => {
  const lecturer = await getLecturerContext(req.user.id);
  const { rows } = await query(
    `SELECT a.id, a.week_number, a.opens_at, a.closes_at,
            (SELECT COUNT(*)::int FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count
     FROM assessments a
     WHERE a.track_id = $1 AND a.cohort_id = $2
     ORDER BY a.week_number`,
    [lecturer.track_id, lecturer.cohort_id]
  );
  res.json({ assessments: rows });
});

export const getGrades = asyncHandler(async (req, res) => {
  const lecturer = await getLecturerContext(req.user.id);
  const week = Number(req.query.week);

  const params = [lecturer.track_id, lecturer.cohort_id];
  let weekClause = '';
  if (week) {
    weekClause = 'AND a.week_number = $3';
    params.push(week);
  }

  const { rows } = await query(
    `SELECT u.email, u.username, a.week_number, sub.score, sub.submitted_at
     FROM assessment_submissions sub
     JOIN assessments a ON a.id = sub.assessment_id
     JOIN users u ON u.id = sub.student_user_id
     WHERE a.track_id = $1 AND a.cohort_id = $2 ${weekClause}
     ORDER BY a.week_number, u.email`,
    params
  );
  res.json({ grades: rows });
});
