import { query, withTransaction } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { hashPassword, isStrongPassword } from '../utils/password.js';
import { initiateTransfer } from '../services/flutterwave.service.js';
import { extractYoutubeId } from '../services/youtube.service.js';
import { env } from '../config/env.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------- Cohorts ----------------

export const listCohorts = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM cohorts ORDER BY start_date DESC');
  res.json({ cohorts: rows });
});

export const createCohort = asyncHandler(async (req, res) => {
  const { name, cohortNumber, startDate, registrationEndDate } = req.body;
  if (!name || !cohortNumber || !startDate || !registrationEndDate) throw new AppError('All fields are required.');

  // start_date and registration_end_date are intentionally independent — registration can
  // stay open weeks after classes begin (rolling/late registration). start_date only drives
  // content unlocking and the informational "cohort starts on..." display, never registration
  // availability.

  // Only one cohort is "active"/shown on the landing page at a time.
  await query('UPDATE cohorts SET is_active = false');

  const { rows } = await query(
    `INSERT INTO cohorts (name, cohort_number, start_date, registration_end_date, status, is_active)
     VALUES ($1,$2,$3,$4,'registration_open', true) RETURNING *`,
    [name, cohortNumber, startDate, registrationEndDate]
  );
  res.status(201).json({ cohort: rows[0] });
});

export const updateCohortDates = asyncHandler(async (req, res) => {
  const { startDate, registrationEndDate } = req.body;
  const { rows } = await query(
    'UPDATE cohorts SET start_date = COALESCE($1, start_date), registration_end_date = COALESCE($2, registration_end_date) WHERE id = $3 RETURNING *',
    [startDate || null, registrationEndDate || null, req.params.id]
  );
  if (!rows.length) throw new AppError('Cohort not found.', 404);
  res.json({ cohort: rows[0] });
});

/**
 * Hard-ends a cohort: permanently deletes every student account (and, via cascade,
 * their submissions/certificates), videos, and assessments tied to it, per product
 * requirement to reclaim database space. This is irreversible.
 */
export const endCohort = asyncHandler(async (req, res) => {
  const cohortId = req.params.id;
  const { confirm } = req.body;
  if (confirm !== true) throw new AppError('Confirmation required — this permanently deletes all cohort data.');

  await withTransaction(async (client) => {
    // Deleting student users cascades to students/submissions/certificates for this cohort.
    await client.query(
      `DELETE FROM users WHERE id IN (SELECT user_id FROM students WHERE cohort_id = $1)`,
      [cohortId]
    );
    // videos/assessments cascade on cohort delete via FK, but delete explicitly first for a clean audit trail.
    await client.query('DELETE FROM videos WHERE cohort_id = $1', [cohortId]);
    await client.query('DELETE FROM assessments WHERE cohort_id = $1', [cohortId]);
    await client.query(`UPDATE lecturers SET cohort_id = NULL WHERE cohort_id = $1`, [cohortId]);
    await client.query(`UPDATE cohorts SET status = 'ended', is_active = false WHERE id = $1`, [cohortId]);
  });

  res.json({ message: 'Cohort ended and all associated data has been removed.' });
});

// ---------------- Lecturers ----------------

export const listLecturers = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.username, u.is_active, l.track_id, t.name AS track_name, l.cohort_id, c.name AS cohort_name
     FROM lecturers l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN tracks t ON t.id = l.track_id
     LEFT JOIN cohorts c ON c.id = l.cohort_id
     ORDER BY u.created_at DESC`
  );
  res.json({ lecturers: rows });
});

export const createLecturer = asyncHandler(async (req, res) => {
  const { email, username, password, trackId, cohortId } = req.body;
  if (!email || !EMAIL_RE.test(email)) throw new AppError('A valid email is required.');
  if (!isStrongPassword(password)) throw new AppError('Password must be at least 8 characters with a letter and a number.');

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) throw new AppError('An account with this email already exists.', 409);

  const passwordHash = await hashPassword(password);

  const lecturer = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO users (email, username, password_hash, role) VALUES ($1,$2,$3,'lecturer') RETURNING id, email`,
      [email.toLowerCase(), username || null, passwordHash]
    );
    const user = rows[0];
    await client.query('INSERT INTO lecturers (user_id, track_id, cohort_id, assigned_by) VALUES ($1,$2,$3,$4)', [
      user.id,
      trackId || null,
      cohortId || null,
      req.user.id,
    ]);
    return user;
  });

  res.status(201).json({ lecturer });
});

export const assignLecturer = asyncHandler(async (req, res) => {
  const { trackId, cohortId } = req.body;
  const { rows } = await query(
    'UPDATE lecturers SET track_id = $1, cohort_id = $2, assigned_by = $3 WHERE user_id = $4 RETURNING *',
    [trackId, cohortId, req.user.id, req.params.id]
  );
  if (!rows.length) throw new AppError('Lecturer not found.', 404);
  res.json({ lecturer: rows[0] });
});

// ---------------- Users (revoke access) ----------------

export const listStudents = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.username, u.is_active, s.paid_registration, s.paid_startup,
            t.name AS track_name, c.name AS cohort_name, s.created_at
     FROM students s
     JOIN users u ON u.id = s.user_id
     JOIN tracks t ON t.id = s.track_id
     JOIN cohorts c ON c.id = s.cohort_id
     ORDER BY s.created_at DESC`
  );
  res.json({ students: rows });
});

export const listAffiliates = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.username, u.is_active, a.referral_code, a.confirmed_referrals, a.withdrawable_count
     FROM affiliates a JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC`
  );
  res.json({ affiliates: rows });
});

export const setUserActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const { rows } = await query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, role, is_active', [
    Boolean(isActive),
    req.params.id,
  ]);
  if (!rows.length) throw new AppError('User not found.', 404);
  res.json({ user: rows[0] });
});

// ---------------- Stats ----------------

export const getStats = asyncHandler(async (req, res) => {
  const [students, byTrack, lecturers, affiliates, payments] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM students'),
    query(`SELECT t.name, COUNT(s.*)::int AS count FROM tracks t LEFT JOIN students s ON s.track_id = t.id GROUP BY t.name`),
    query('SELECT COUNT(*)::int AS count FROM lecturers'),
    query('SELECT COUNT(*)::int AS count FROM affiliates'),
    query(`SELECT type, COUNT(*)::int AS count, COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'successful' GROUP BY type`),
  ]);
  res.json({
    totalStudents: students.rows[0].count,
    studentsByTrack: byTrack.rows,
    totalLecturers: lecturers.rows[0].count,
    totalAffiliates: affiliates.rows[0].count,
    payments: payments.rows,
  });
});

// ---------------- Videos (any track/cohort — list/create/edit/delete, admin-only for edit/delete) ----------------

export const listVideosAdmin = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT v.*, t.name AS track_name, c.name AS cohort_name
     FROM videos v
     JOIN tracks t ON t.id = v.track_id
     JOIN cohorts c ON c.id = v.cohort_id
     ORDER BY c.start_date DESC, t.name, v.week_number, v.class_number`
  );
  res.json({ videos: rows });
});

export const upsertVideoAdmin = asyncHandler(async (req, res) => {
  const { trackId, cohortId, week, classNumber, youtubeUrl, title } = req.body;
  if (!trackId || !cohortId) throw new AppError('Track and cohort are required.');
  const youtubeId = extractYoutubeId(youtubeUrl);
  if (!youtubeId) throw new AppError('Please provide a valid YouTube link or video ID.');
  if (!title || !title.trim()) throw new AppError('A title is required.');

  const { rows } = await query(
    `INSERT INTO videos (track_id, cohort_id, week_number, class_number, youtube_id, title, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (track_id, cohort_id, week_number, class_number)
     DO UPDATE SET youtube_id = EXCLUDED.youtube_id, title = EXCLUDED.title
     RETURNING *`,
    [trackId, cohortId, Number(week), Number(classNumber), youtubeId, title.trim(), req.user.id]
  );
  res.status(201).json({ video: rows[0] });
});

export const deleteVideoAdmin = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM videos WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) throw new AppError('Video not found.', 404);
  res.json({ message: 'Video deleted.' });
});

// ---------------- Assessments (any track/cohort — list/create/edit/delete, admin-only for edit/delete) ----------------

export const listAssessmentsAdmin = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT a.id, a.week_number, a.opens_at, a.closes_at, t.name AS track_name, c.name AS cohort_name,
            (SELECT COUNT(*)::int FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count
     FROM assessments a
     JOIN tracks t ON t.id = a.track_id
     JOIN cohorts c ON c.id = a.cohort_id
     ORDER BY c.start_date DESC, t.name, a.week_number`
  );
  res.json({ assessments: rows });
});

export const getAssessmentAdmin = asyncHandler(async (req, res) => {
  const { rows: aRows } = await query('SELECT * FROM assessments WHERE id = $1', [req.params.id]);
  if (!aRows.length) throw new AppError('Assessment not found.', 404);
  const { rows: qRows } = await query(
    'SELECT id, question_text, options, correct_index FROM assessment_questions WHERE assessment_id = $1 ORDER BY position',
    [req.params.id]
  );
  res.json({ assessment: aRows[0], questions: qRows });
});

/** Creates a new assessment, or fully replaces an existing one's window + questions — admin only. */
export const upsertAssessmentAdmin = asyncHandler(async (req, res) => {
  const { trackId, cohortId, week, opensAt, closesAt, questions } = req.body;
  if (!trackId || !cohortId) throw new AppError('Track and cohort are required.');
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

  const assessmentId = await withTransaction(async (client) => {
    const { rows: existing } = await client.query(
      'SELECT id FROM assessments WHERE track_id = $1 AND cohort_id = $2 AND week_number = $3',
      [trackId, cohortId, weekNum]
    );

    let id;
    if (existing.length) {
      id = existing[0].id;
      await client.query('UPDATE assessments SET opens_at = $1, closes_at = $2 WHERE id = $3', [opensAt, closesAt, id]);
      await client.query('DELETE FROM assessment_questions WHERE assessment_id = $1', [id]);
    } else {
      const { rows } = await client.query(
        `INSERT INTO assessments (track_id, cohort_id, week_number, opens_at, closes_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [trackId, cohortId, weekNum, opensAt, closesAt, req.user.id]
      );
      id = rows[0].id;
    }

    let position = 0;
    for (const q of questions) {
      await client.query(
        'INSERT INTO assessment_questions (assessment_id, question_text, options, correct_index, position) VALUES ($1,$2,$3,$4,$5)',
        [id, q.questionText.trim(), JSON.stringify(q.options), q.correctIndex, position++]
      );
    }

    return id;
  });

  res.status(201).json({ assessmentId });
});

export const deleteAssessmentAdmin = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM assessments WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows.length) throw new AppError('Assessment not found.', 404);
  res.json({ message: 'Assessment deleted.' });
});

// ---------------- Notifications ----------------

export const sendNotification = asyncHandler(async (req, res) => {
  const { title, body, audience } = req.body;
  if (!title || !body) throw new AppError('Title and body are required.');
  const { rows } = await query(
    'INSERT INTO notifications (title, body, audience, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
    [title, body, audience || 'all', req.user.id]
  );
  res.status(201).json({ notification: rows[0] });
});

// ---------------- Withdrawals ----------------

export const listWithdrawals = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT w.*, u.email AS affiliate_email FROM withdrawals w
     JOIN users u ON u.id = w.affiliate_id ORDER BY w.requested_at DESC`
  );
  res.json({ withdrawals: rows });
});

/**
 * Admin approval triggers the actual Flutterwave transfer programmatically —
 * the marketer never has a "pay myself" button. On failure the reserved count is restored.
 */
export const decideWithdrawal = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'approve' | 'reject'
  const { rows } = await query('SELECT * FROM withdrawals WHERE id = $1', [req.params.id]);
  const withdrawal = rows[0];
  if (!withdrawal) throw new AppError('Withdrawal request not found.', 404);
  if (withdrawal.status !== 'pending') throw new AppError('This request has already been processed.', 409);

  if (action === 'reject') {
    await withTransaction(async (client) => {
      await client.query(`UPDATE withdrawals SET status = 'rejected', processed_at = now(), processed_by = $1 WHERE id = $2`, [
        req.user.id,
        withdrawal.id,
      ]);
      // Restore the reserved count since the payout did not happen.
      await client.query('UPDATE affiliates SET withdrawable_count = withdrawable_count + $1 WHERE user_id = $2', [
        withdrawal.count_requested,
        withdrawal.affiliate_id,
      ]);
    });
    return res.json({ message: 'Withdrawal rejected and count restored.' });
  }

  if (action !== 'approve') throw new AppError('Invalid action.');

  try {
    const transfer = await initiateTransfer({
      accountNumber: withdrawal.account_number,
      bankCode: withdrawal.bank_code,
      amount: Number(withdrawal.amount),
      narration: `TechGrind affiliate payout — ${withdrawal.count_requested} referrals`,
      reference: `WD_${withdrawal.id}`,
    });

    await query(
      `UPDATE withdrawals SET status = 'paid', processed_at = now(), processed_by = $1, flw_transfer_id = $2 WHERE id = $3`,
      [req.user.id, String(transfer?.data?.id || ''), withdrawal.id]
    );
    res.json({ message: 'Transfer initiated.', transfer: transfer?.data });
  } catch (err) {
    await withTransaction(async (client) => {
      await client.query(`UPDATE withdrawals SET status = 'failed', processed_at = now(), processed_by = $1 WHERE id = $2`, [
        req.user.id,
        withdrawal.id,
      ]);
      await client.query('UPDATE affiliates SET withdrawable_count = withdrawable_count + $1 WHERE user_id = $2', [
        withdrawal.count_requested,
        withdrawal.affiliate_id,
      ]);
    });
    throw new AppError('Transfer failed. The affiliate\'s balance has been restored.', 502);
  }
});