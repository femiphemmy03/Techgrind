import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase pooler requires TLS
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error', err);
});

/**
 * Always use parameterized queries: query('SELECT * FROM x WHERE id = $1', [id])
 * Never string-concatenate user input into SQL.
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Run multiple statements inside a single transaction.
 * fn receives a client with the same `.query` signature.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
