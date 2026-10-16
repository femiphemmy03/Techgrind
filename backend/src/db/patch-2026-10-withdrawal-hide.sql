-- TECHGRIND — lets an affiliate clear a completed/failed withdrawal off their own dashboard
-- without actually deleting the record (admin's withdrawals view is untouched by this).
-- Safe to run multiple times.
-- Run this in Supabase's SQL Editor — not via `npm run db:migrate`.

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS hidden_by_affiliate BOOLEAN NOT NULL DEFAULT false;
