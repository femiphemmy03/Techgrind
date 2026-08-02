# TechGrind

A 12-week cohort-based LMS: students pay a commitment fee to join a track, learn for free, get paired with a
startup, compete for prizes, and earn a certificate. Includes an affiliate referral program with admin-approved
payouts via Flutterwave.

```
techgrind/
├── backend/     Node.js + Express API (PostgreSQL via Supabase)
├── frontend/    React + Vite PWA
└── render.yaml  Optional one-click Render blueprint for both services
```

---

## 0. Before you do anything: rotate your keys

Any credential that was ever pasted into a chat, doc, or screenshot should be treated as burned. Rotate in this order
before filling in real `.env` values:

1. **Supabase** — Project Settings → Database → reset password; Project Settings → API → regenerate `service_role` key.
2. **JWT_SECRET** — generate a fresh one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. **Resend** — regenerate the API key from the Resend dashboard.
4. **Flutterwave** — rotate before switching from test to live keys.

---

## 1. Local setup

### Backend

```bash
cd backend
cp .env.example .env      # fill in your rotated real values
npm install
npm run db:migrate        # creates all tables (safe to re-run any time schema.sql changes — only adds what's missing)
npm run db:seed           # seeds the 8 tracks + bootstraps the admin account (needs ADMIN_EMAIL/ADMIN_PASSWORD in .env)
```

> **Payment flow note:** registering does not create a login account. Form data sits in a temporary
> `pending_registrations` row until the ₦6,500 payment is confirmed — only then does a real
> student account, referral credit, and payment record get created. Abandoned checkouts leave
> nothing behind to clean up (the pending row simply expires after 2 hours).

### Frontend

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL to http://localhost:5000/api for local dev
npm install
npm run generate-icons    # rasterizes the logo into favicons/PWA icons/OG image (run once, and again if you edit the logo)
npm run dev                # starts BOTH the backend (npm --prefix ../backend run dev) and the Vite frontend together
```

`npm run dev` inside `frontend/` is the single command for local development — it runs the backend and frontend
concurrently (see `frontend/package.json`).

The app runs at `http://localhost:5173`, API at `http://localhost:5000`.

---

## 2. Environment variables — the only place URLs and secrets live

Every external URL (frontend URL, backend URL, Telegram links per track, Flutterwave keys, Resend key, JWT secret)
is read from `.env`. There are **zero hardcoded URLs** in the codebase — to point the app at a new domain, change
`FRONTEND_URL` / `BACKEND_URL` (backend) and `VITE_API_URL` (frontend) and nothing else.

See `backend/.env.example` and `frontend/.env.example` for the full list, including the two Telegram links
(general + paid startup group) required per track.

---

## 3. Deploying to Render

### Option A — Blueprint (recommended)

Push this folder to a GitHub repo, then in Render: **New → Blueprint**, point it at the repo. `render.yaml` creates
both services automatically. You'll still need to manually set every secret (`DATABASE_URL`, `JWT_SECRET`,
`FLW_SECRET_KEY`, `RESEND_API_KEY`, `TG_LINK_*`, etc.) in the Render dashboard — never commit real values to git.

### Option B — Manual

1. **Backend** — New → Web Service → root directory `backend` → build `npm install` → start `npm start`. Add all
   variables from `backend/.env.example` in the Environment tab. Set `BACKEND_URL` to the Render URL Render gives you
   (or your custom API domain).
2. Run migrations once, from the Render shell or locally against the production `DATABASE_URL`:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
3. **Frontend** — New → Static Site → root directory `frontend` → build
   `npm install && npm run generate-icons && npm run build` → publish directory `dist`. Add a rewrite rule
   `/* → /index.html` (already in `render.yaml`) so deep links like `/affiliate/dashboard` or `/adelove` don't 404
   on refresh. Set `VITE_API_URL` to your backend's `/api` URL.
4. **Custom domain** — point `www.techgrind.com` at the frontend static site, and something like `api.techgrind.com`
   at the backend, in Render's custom domain settings. Update `FRONTEND_URL`, `BACKEND_URL`, `ALLOWED_ORIGINS`, and
   `VITE_API_URL` to match, then redeploy both.
5. **Flutterwave webhook** — in the Flutterwave dashboard, set the webhook URL to
   `https://api.techgrind.com/api/webhooks/flutterwave` and the "secret hash" to the same string you put in
   `FLW_WEBHOOK_SECRET_HASH`. This is what the backend uses to verify incoming webhook calls.

---

## 4. Security measures already in place

- **CSP + Helmet** — strict `Content-Security-Policy`, no inline scripts, YouTube/Flutterwave explicitly whitelisted.
- **Payments are webhook-verified, not redirect-trusted** — the backend re-verifies every transaction directly
  against Flutterwave's API before marking anything "successful," and checks the paid amount against the expected fee.
- **Parameterized SQL everywhere** — no string-built queries, via `pg`'s parameterized query API.
- **Rate limiting** — tighter limits on auth endpoints (login, register, forgot-password) to blunt brute-force/credential
  stuffing.
- **bcrypt password hashing**, minimum strength enforced server-side regardless of frontend validation.
- **Role re-checked on every request** (not just at login) — an admin-revoked account loses access immediately.
- **CORS allowlist** — only `ALLOWED_ORIGINS` can call the API.
- **Withdrawals are admin-approved**, not self-service instant payouts — a human confirms before real money moves,
  and a failed transfer automatically restores the affiliate's balance.

This covers the core OWASP-style basics for an MVP handling real payments. Before scaling to "millions of naira,"
also consider: a Web Application Firewall in front of Render, a proper secrets manager instead of plain `.env`,
structured audit logging, and a third-party security review.

---

## 5. What's intentionally manual for MVP

- **Assigning lecturers to a track in the admin UI currently requires the track's UUID**, copied from Supabase's
  table editor (`tracks` table). A track-name dropdown wired to real IDs is a quick follow-up if useful.
- **Ending a cohort is a hard, irreversible delete** of that cohort's students, videos, and assessments — by design,
  per product requirement, to keep the database lean.
- **Objective/multiple-choice assessments only** — no free-text/essay auto-grading in this MVP.
- **Video hosting is YouTube (unlisted)** — watchable on-site via embed, no download option (a real platform
  limitation of YouTube, not this app).

---

## 6. Brand

The TechGrind mark (`frontend/src/assets/logo-mark.svg`) is used as the favicon, PWA icon, and Open Graph image —
regenerate all raster sizes any time you edit it with `npm run generate-icons` inside `frontend/`.
