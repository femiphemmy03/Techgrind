-- TECHGRIND — Database Schema (PostgreSQL / Supabase)
-- Run once against DATABASE_URL: psql "$DATABASE_URL" -f src/db/schema.sql
-- Safe to re-run any time this file changes — every statement is idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tracks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cohorts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  cohort_number         NUMERIC NOT NULL,
  start_date            TIMESTAMPTZ NOT NULL,
  registration_end_date TIMESTAMPTZ NOT NULL,
  status                TEXT NOT NULL DEFAULT 'upcoming'
                          CHECK (status IN ('upcoming','registration_open','in_progress','ended')),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  username       TEXT,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin','lecturer','student','affiliate')),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS students (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cohort_id          UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  track_id           UUID NOT NULL REFERENCES tracks(id),
  referral_code_used TEXT,
  paid_registration  BOOLEAN NOT NULL DEFAULT false,
  paid_startup       BOOLEAN NOT NULL DEFAULT false,
  startup_paid_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_students_cohort ON students(cohort_id);
CREATE INDEX IF NOT EXISTS idx_students_track ON students(track_id);

CREATE TABLE IF NOT EXISTS pending_registrations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT UNIQUE NOT NULL,
  username           TEXT,
  password_hash      TEXT NOT NULL,
  track_id           UUID NOT NULL REFERENCES tracks(id),
  cohort_id          UUID NOT NULL REFERENCES cohorts(id),
  referral_code_used TEXT,
  tx_ref             TEXT UNIQUE NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pending_reg_tx_ref ON pending_registrations(tx_ref);

CREATE TABLE IF NOT EXISTS lecturers (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  track_id    UUID REFERENCES tracks(id),
  cohort_id   UUID REFERENCES cohorts(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliates (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referral_code       TEXT UNIQUE NOT NULL,
  confirmed_referrals INTEGER NOT NULL DEFAULT 0,
  withdrawable_count  INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID NOT NULL REFERENCES affiliates(user_id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cohort_id       UUID REFERENCES cohorts(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);

CREATE TABLE IF NOT EXISTS withdrawals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    UUID NOT NULL REFERENCES affiliates(user_id) ON DELETE CASCADE,
  count_requested INTEGER NOT NULL,
  amount          NUMERIC NOT NULL,
  bank_code       TEXT NOT NULL,
  bank_name       TEXT,
  account_number  TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','paid','failed')),
  flw_transfer_id TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,
  processed_by    UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_affiliate ON withdrawals(affiliate_id);

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('registration','startup')),
  amount         NUMERIC NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'NGN',
  tx_ref         TEXT UNIQUE NOT NULL,
  flw_transaction_id TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','successful','failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE TABLE IF NOT EXISTS videos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id     UUID NOT NULL REFERENCES tracks(id),
  cohort_id    UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  week_number  INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 12),
  class_number INTEGER NOT NULL CHECK (class_number BETWEEN 1 AND 3),
  youtube_id   TEXT NOT NULL,
  title        TEXT NOT NULL,
  uploaded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, cohort_id, week_number, class_number)
);

CREATE TABLE IF NOT EXISTS assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id     UUID NOT NULL REFERENCES tracks(id),
  cohort_id    UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  week_number  INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 10),
  opens_at     TIMESTAMPTZ NOT NULL,
  closes_at    TIMESTAMPTZ NOT NULL,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, cohort_id, week_number)
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  options        JSONB NOT NULL,
  correct_index  INTEGER NOT NULL,
  position       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessment_submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers        JSONB NOT NULL,
  score          NUMERIC NOT NULL,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_user_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  track_id        UUID NOT NULL REFERENCES tracks(id),
  full_name       TEXT NOT NULL,
  final_score     NUMERIC NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  audience    TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','lecturers','affiliates')),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
