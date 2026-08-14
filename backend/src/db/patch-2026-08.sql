-- TECHGRIND — patch for databases created before the dual-mode withdrawal rebuild.
-- Safe to run multiple times; every statement is idempotent.
-- Run this in Supabase's SQL Editor, not via `npm run db:migrate` (that runs schema.sql as
-- one block and will still fail on databases that already have some of these tables).

-- affiliates: new lifetime-withdrawn tracker
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS total_withdrawn_ngn NUMERIC NOT NULL DEFAULT 0;

-- withdrawals: new mode column (backfill existing rows as 'automated' — that's what they
-- actually were, processed under the old self-service system, before manual mode existed)
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS mode TEXT;
UPDATE withdrawals SET mode = 'automated' WHERE mode IS NULL;
ALTER TABLE withdrawals ALTER COLUMN mode SET NOT NULL;
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_mode_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_mode_check CHECK (mode IN ('manual','automated'));

-- withdrawals: new failure_reason column
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- withdrawals: status values changed shape (old: pending/approved/rejected/paid/failed
-- -> new: pending/processing/completed/failed) — migrate existing data, then update the constraint
UPDATE withdrawals SET status = 'completed' WHERE status = 'paid';
UPDATE withdrawals SET status = 'failed' WHERE status = 'rejected';
UPDATE withdrawals SET status = 'processing' WHERE status = 'approved';
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_status_check CHECK (status IN ('pending','processing','completed','failed'));

CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- notifications: new target_user_id column for personal (non-broadcast) notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_user_id);
