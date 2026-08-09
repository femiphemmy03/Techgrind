import { query, withTransaction } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { hashPassword, isStrongPassword } from '../utils/password.js';
import { extractYoutubeId } from '../services/youtube.service.js';
import { sendWithdrawalCompletedEmail } from '../services/email.service.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const listCohorts = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM cohorts ORDER BY start_date DESC');
  res.json({ cohorts: rows });
});

export const createCohort = asyncHandler(async (req, res) => {
  const { name, cohortNumber, startDate, registrationEndDate } = req.body;
  if (!name || !cohortNumber || !startDate || !registrationEndDate) throw new AppError('All fields are required.');

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

export const endCohort = asyncHandler(async (req, res) => {
  const cohortId = req.params.id;
  const { confirm } = req.body;
  if (confirm !== true) throw new AppError('Confirmation required — this permanently deletes all cohort data.');

  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM users WHERE id IN (SELECT user_id FROM students WHERE cohort_id = $1)`,
      [cohortId]
    );
    await client.query('DELETE FROM videos WHERE cohort_id = $1', [cohortId]);
    await client.query('DELETE FROM assessments WHERE cohort_id = $1', [cohortId]);
    await client.query('DELETE FROM pending_registrations WHERE cohort_id = $1', [cohortId]);
    await client.query(`UPDATE lecturers SET cohort_id = NULL WHERE cohort_id = $1`, [cohortId]);
    await client.query(`UPDATE cohorts SET status = 'ended', is_active = false WHERE id = $1`, [cohortId]);
  });

  res.json({ message: 'Cohort ended and all associated data has been removed.' });
});

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

export const sendNotification = asyncHandler(async (req, res) => {
  const { title, body, audience } = req.body;
  if (!title || !body) throw new AppError('Title and body are required.');
  const { rows } = await query(
    'INSERT INTO notifications (title, body, audience, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
    [title, body, audience || 'all', req.user.id]
  );
  res.status(201).json({ notification: rows[0] });
});

export const listWithdrawals = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT w.*, u.email AS affiliate_email FROM withdrawals w
     JOIN users u ON u.id = w.affiliate_id
     ORDER BY
       CASE w.status WHEN 'pending' THEN 0 WHEN 'processing' THEN 1 ELSE 2 END,
       w.requested_at DESC`
  );
  res.json({ withdrawals: rows });
});

/** For the admin dashboard's badge/counter — pending + processing count as "needs attention" (manual mode only). */
export const getPendingWithdrawalCount = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM withdrawals WHERE mode = 'manual' AND status IN ('pending','processing')`
  );
  res.json({ count: rows[0].count });
});

/**
 * Everything admin needs to actually verify this request is legitimate before sending money:
 * the affiliate's recent confirmed referrals and the registration payments behind them. This is
 * a recent-history aid, not a precise per-referral ledger — once a balance is withdrawn in full,
 * which specific referrals "funded" it stops being a meaningful distinction, so this just shows
 * enough recent confirmed activity for a sanity check.
 */
export const getWithdrawalReviewInfo = asyncHandler(async (req, res) => {
  const { rows: wRows } = await query(
    `SELECT w.*, u.email AS affiliate_email FROM withdrawals w JOIN users u ON u.id = w.affiliate_id WHERE w.id = $1`,
    [req.params.id]
  );
  const withdrawal = wRows[0];
  if (!withdrawal) throw new AppError('Withdrawal not found.', 404);

  const { rows: referrals } = await query(
    `SELECT r.created_at AS referred_at, u.email AS student_email, p.amount, p.status AS payment_status, p.verified_at
     FROM referrals r
     JOIN users u ON u.id = r.student_user_id
     LEFT JOIN payments p ON p.user_id = r.student_user_id AND p.type = 'registration'
     WHERE r.affiliate_id = $1 AND r.status = 'confirmed'
     ORDER BY r.created_at DESC
     LIMIT 20`,
    [withdrawal.affiliate_id]
  );

  res.json({ withdrawal, recentConfirmedReferrals: referrals });
});

/** Admin claims a pending manual request so it doesn't get double-handled by another admin. */
export const startWithdrawalReview = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE withdrawals SET status = 'processing', processed_by = $1
     WHERE id = $2 AND mode = 'manual' AND status = 'pending' RETURNING *`,
    [req.user.id, req.params.id]
  );
  if (!rows.length) throw new AppError('This request is not awaiting review (already claimed or not manual).', 409);
  res.json({ withdrawal: rows[0] });
});

/**
 * Admin has sent the transfer manually through Flutterwave's own dashboard and confirms it here.
 * This is the only place total_withdrawn_ngn increments — never at request time.
 */
export const completeWithdrawal = asyncHandler(async (req, res) => {
  const { flwReference } = req.body;

  const { rows: wRows } = await query(`SELECT * FROM withdrawals WHERE id = $1`, [req.params.id]);
  const withdrawal = wRows[0];
  if (!withdrawal) throw new AppError('Withdrawal not found.', 404);
  if (withdrawal.mode !== 'manual') throw new AppError('Only manual-mode withdrawals are completed this way.', 409);
  if (!['pending', 'processing'].includes(withdrawal.status)) {
    throw new AppError('This request has already been processed.', 409);
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE withdrawals SET status = 'completed', processed_at = now(), processed_by = $1, flw_transfer_id = $2 WHERE id = $3`,
      [req.user.id, flwReference || null, withdrawal.id]
    );
    await client.query('UPDATE affiliates SET total_withdrawn_ngn = total_withdrawn_ngn + $1 WHERE user_id = $2', [
      withdrawal.amount,
      withdrawal.affiliate_id,
    ]);
    // Personal, targeted notification — only this affiliate sees it, not a broadcast.
    await client.query(
      `INSERT INTO notifications (title, body, audience, target_user_id, created_by)
       VALUES ($1,$2,'affiliates',$3,$4)`,
      [
        'Withdrawal completed',
        `Your withdrawal of ₦${Number(withdrawal.amount).toLocaleString()} has been sent.`,
        withdrawal.affiliate_id,
        req.user.id,
      ]
    );
  });

  const { rows: userRows } = await query('SELECT email FROM users WHERE id = $1', [withdrawal.affiliate_id]);
  if (userRows[0]) {
    sendWithdrawalCompletedEmail(userRows[0].email, Number(withdrawal.amount)).catch((e) =>
      console.error('[email] withdrawal completion email failed', e)
    );
  }

  res.json({ message: 'Withdrawal marked as completed.' });
});

/** Admin rejects a request (e.g. the registration payment behind it never actually cleared) — balance is restored. */
export const failWithdrawal = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const { rows: wRows } = await query(`SELECT * FROM withdrawals WHERE id = $1`, [req.params.id]);
  const withdrawal = wRows[0];
  if (!withdrawal) throw new AppError('Withdrawal not found.', 404);
  if (withdrawal.mode !== 'manual') throw new AppError('Only manual-mode withdrawals are rejected this way.', 409);
  if (!['pending', 'processing'].includes(withdrawal.status)) {
    throw new AppError('This request has already been processed.', 409);
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE withdrawals SET status = 'failed', processed_at = now(), processed_by = $1, failure_reason = $2 WHERE id = $3`,
      [req.user.id, reason || null, withdrawal.id]
    );
    await client.query('UPDATE affiliates SET withdrawable_count = withdrawable_count + $1 WHERE user_id = $2', [
      withdrawal.count_requested,
      withdrawal.affiliate_id,
    ]);
  });

  res.json({ message: 'Withdrawal rejected and balance restored.' });
});
