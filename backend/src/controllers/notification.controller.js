import { query } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const ROLE_TO_AUDIENCE = { student: 'students', lecturer: 'lecturers', affiliate: 'affiliates' };

export const getMyNotifications = asyncHandler(async (req, res) => {
  const roleAudience = ROLE_TO_AUDIENCE[req.user.role];

  const { rows } = await query(
    roleAudience
      ? `SELECT id, title, body, created_at FROM notifications
         WHERE audience = 'all' OR audience = $1
         ORDER BY created_at DESC LIMIT 20`
      : `SELECT id, title, body, created_at FROM notifications
         WHERE audience = 'all'
         ORDER BY created_at DESC LIMIT 20`,
    roleAudience ? [roleAudience] : []
  );

  res.json({ notifications: rows });
});
