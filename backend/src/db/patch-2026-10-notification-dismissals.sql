-- TECHGRIND — per-user notification dismissal, plus the fix that made it necessary:
-- getMyNotifications was showing every "affiliates"-audience row to every affiliate,
-- including other affiliates' personal "Withdrawal completed" notifications, because it never
-- checked target_user_id. That's a code fix (notification.controller.js) — nothing to run here
-- for it. This patch only adds the table the dismiss feature needs.
-- Safe to run multiple times.
-- Run this in Supabase's SQL Editor — not via `npm run db:migrate`.

CREATE TABLE IF NOT EXISTS notification_dismissals (
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
