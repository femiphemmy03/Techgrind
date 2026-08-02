import { pool } from '../config/db.js';
import { TRACKS } from '../config/env.js';
import { hashPassword } from '../utils/password.js';

async function seed() {
  console.log('[seed] Seeding tracks...');
  for (const [slug, t] of Object.entries(TRACKS)) {
    await pool.query(
      `INSERT INTO tracks (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [slug, t.name]
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail.toLowerCase()]);
    if (!existing.rows.length) {
      console.log('[seed] Creating admin account...');
      const hash = await hashPassword(adminPassword);
      await pool.query(`INSERT INTO users (email, password_hash, role, username) VALUES ($1,$2,'admin','Admin')`, [
        adminEmail.toLowerCase(),
        hash,
      ]);
    } else {
      console.log('[seed] Admin account already exists, skipping.');
    }
  } else {
    console.warn('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap. Set them in .env and re-run.');
  }

  console.log('[seed] Done.');
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
