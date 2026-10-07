import { query } from '../config/db.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const ROLE_TO_AUDIENCE = { student: 'students', lecturer: 'lecturers', affiliate: 'affiliates' };

export const getMyNotifications = asyncHandler(async (req, res) => {
  const roleAudience = ROLE_TO_AUDIENCE[req.user.role];

  // A row is visible to this user when it's either a true broadcast (audience='all', or this
  // role's audience with no target_user_id) or a personal row explicitly targeted at them —
  // never someone else's personal row just because it shares the same audience value. Rows this
  // user has dismissed (notification_dismissals) are excluded without being deleted for anyone.
  const { rows } = await query(
    `SELECT n.id, n.title, n.body, n.created_at FROM notifications n
     LEFT JOIN notification_dismissals d ON d.notification_id = n.id AND d.user_id = $1
     WHERE d.notification_id IS NULL
       AND (
         n.audience = 'all'
         OR (n.audience = $2 AND (n.target_user_id IS NULL OR n.target_user_id = $1))
       )
     ORDER BY n.created_at DESC LIMIT 20`,
    [req.user.id, roleAudience || null]
  );

  res.json({ notifications: rows });
});

export const dismissNotification = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id FROM notifications WHERE id = $1', [req.params.id]);
  if (!rows.length) throw new AppError('Notification not found.', 404);

  await query(
    `INSERT INTO notification_dismissals (notification_id, user_id) VALUES ($1,$2)
     ON CONFLICT (notification_id, user_id) DO NOTHING`,
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Dismissed.' });
});