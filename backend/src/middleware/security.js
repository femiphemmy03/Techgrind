import helmet from 'helmet';
import hpp from 'hpp';
import cors from 'cors';
import { env } from '../config/env.js';

/**
 * Strict Content-Security-Policy.
 * - No inline scripts/styles beyond what's explicitly allowed.
 * - YouTube embeds are whitelisted (frame-src) since video watch relies on them.
 * - Flutterwave checkout + inline-script SDK is whitelisted for payment pages.
 * - connect-src is limited to our own API + Flutterwave + Supabase (for any direct client calls).
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.flutterwave.com'],
      styleSrc: ["'self'", "'unsafe-inline'"], // required by many CSS-in-JS/build tools; tighten with nonces if needed
      imgSrc: ["'self'", 'data:', 'https://img.youtube.com', 'https://i.ytimg.com', 'https://*.supabase.co'],
      fontSrc: ["'self'", 'data:'],
      frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://checkout.flutterwave.com'],
      connectSrc: ["'self'", env.BACKEND_URL, 'https://api.flutterwave.com', 'https://*.supabase.co'].filter(Boolean),
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", 'https://checkout.flutterwave.com'],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // would break the YouTube iframe embed
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow non-browser tools (no origin header) and whitelisted origins only.
    if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const hppMiddleware = hpp();

/** Strip any keys starting with "$" or containing "." from req.body to blunt NoSQL/operator-injection style payloads. */
export function sanitizeBody(req, res, next) {
  const clean = (obj) => {
    if (Array.isArray(obj)) return obj.map(clean);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith('$') || k.includes('.')) continue;
        out[k] = clean(v);
      }
      return out;
    }
    return obj;
  };
  if (req.body) req.body = clean(req.body);
  next();
}
