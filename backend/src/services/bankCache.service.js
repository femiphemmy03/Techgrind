import { query } from '../config/db.js';
import { listBanks } from './flutterwave.service.js';
import { STATIC_BANKS } from '../data/staticBanks.js';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

let refreshing = false;

function dedupeBanks(raw) {
  const seen = new Set();
  return raw.filter((b) => {
    if (!b?.code || seen.has(b.code)) return false;
    seen.add(b.code);
    return true;
  });
}

/**
 * Fetch the live list from Flutterwave's /banks/NG (this is the same "CBN list via Flutterwave"
 * call used everywhere else in the app — see flutterwave.service.js) and overwrite the cached
 * row. Throws on failure/empty-response so callers can decide what to fall back to; never
 * partially overwrites a good cache with a bad one.
 */
export async function refreshBankCache() {
  const data = await listBanks();
  const banks = dedupeBanks(data?.data || []);
  if (!banks.length) throw new Error('Flutterwave returned an empty bank list');

  await query(
    `INSERT INTO bank_list_cache (id, banks, fetched_at)
     VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET banks = EXCLUDED.banks, fetched_at = EXCLUDED.fetched_at`,
    [JSON.stringify(banks)]
  );
  console.log(`[bankCache] Refreshed — ${banks.length} banks cached from Flutterwave.`);
  return banks;
}

async function readCache() {
  const { rows } = await query('SELECT banks, fetched_at FROM bank_list_cache WHERE id = 1');
  return rows[0] || null;
}

/**
 * Serve the bank list for the withdrawal dropdown. Reads from the cache instantly — never
 * blocks a request on Flutterwave once a cache row exists, so a Flutterwave slowdown/outage
 * never slows this endpoint down. Refreshing happens separately on its own 24h schedule
 * (see startBankCacheScheduler below).
 *
 * Only if the cache is completely empty (e.g. very first request right after a fresh deploy,
 * before the startup refresh below has finished) does this fall back to a synchronous fetch,
 * and only if THAT also fails does it fall back to the small static list as an absolute last
 * resort — withdrawals should never be fully blocked by this.
 */
export async function getBanks() {
  const cached = await readCache();
  if (cached) {
    return { banks: cached.banks, source: 'cache', fetchedAt: cached.fetched_at };
  }

  try {
    const banks = await refreshBankCache();
    return { banks, source: 'live', fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.error('[bankCache] No cache yet and live fetch failed — serving static fallback:', err.message);
    return { banks: STATIC_BANKS, source: 'static-fallback', fetchedAt: null };
  }
}

/**
 * Call once at server startup, then every 24h thereafter. A failed refresh is logged and
 * swallowed — the whole point is that we keep serving whatever was last cached instead of
 * breaking, so a Flutterwave hiccup here should never surface as an error anywhere else.
 */
export function startBankCacheScheduler() {
  const tick = async () => {
    if (refreshing) return;
    refreshing = true;
    try {
      await refreshBankCache();
    } catch (err) {
      console.error('[bankCache] Background refresh failed, keeping last good cache:', err.message);
    } finally {
      refreshing = false;
    }
  };

  tick(); // populate/refresh immediately on boot, don't wait a full 24h for the first one
  setInterval(tick, REFRESH_INTERVAL_MS);
}
