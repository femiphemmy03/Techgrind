-- TECHGRIND — patch adding the self-refreshing bank list cache.
-- Safe to run multiple times.
-- Run this in Supabase's SQL Editor (same as patch-2026-08.sql — not via `npm run db:migrate`).

CREATE TABLE IF NOT EXISTS bank_list_cache (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  banks       JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
