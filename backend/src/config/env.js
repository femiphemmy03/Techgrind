import dotenv from 'dotenv';
dotenv.config();

function required(name, fallback = undefined) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    console.warn(`[env] Missing required environment variable: ${name}`);
  }
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,

  FRONTEND_URL: required('FRONTEND_URL'),
  BACKEND_URL: required('BACKEND_URL'),

  DATABASE_URL: required('DATABASE_URL'),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  FLW_PUBLIC_KEY: process.env.FLW_PUBLIC_KEY,
  FLW_SECRET_KEY: process.env.FLW_SECRET_KEY,
  FLW_WEBHOOK_SECRET_HASH: process.env.FLW_WEBHOOK_SECRET_HASH,

  REGISTRATION_FEE_NGN: Number(process.env.REGISTRATION_FEE_NGN) || 6500,
  STARTUP_FEE_NGN: Number(process.env.STARTUP_FEE_NGN) || 10000,
  AFFILIATE_PAYOUT_PER_REFERRAL_NGN: Number(process.env.AFFILIATE_PAYOUT_PER_REFERRAL_NGN) || 1500,
  MAX_WITHDRAWALS_PER_MONTH: Number(process.env.MAX_WITHDRAWALS_PER_MONTH) || 3,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'TechGrind <no-reply@techgrind.com>',
  CONTACT_INBOX_EMAIL: process.env.CONTACT_INBOX_EMAIL || 'techgrindng@gmail.com',
  SUPPORT_WHATSAPP_NUMBER: process.env.SUPPORT_WHATSAPP_NUMBER || '+2348055488895',

  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES) || 10,
  OTP_LENGTH: Number(process.env.OTP_LENGTH) || 6,

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),

  RATE_LIMIT_WINDOW_MINUTES: Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15,
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  AUTH_RATE_LIMIT_MAX_REQUESTS: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10,
};

// Track registry: slug -> { name, telegramGeneral, telegramStartup }
// Single place to add/remove tracks. Telegram links come from .env only.
export const TRACKS = {
  'product-management': {
    name: 'Product Management',
    telegramGeneral: process.env.TG_LINK_PRODUCT_MANAGEMENT_GENERAL,
    telegramStartup: process.env.TG_LINK_PRODUCT_MANAGEMENT_STARTUP,
  },
  'full-stack-development': {
    name: 'Full-Stack Development (JavaScript)',
    telegramGeneral: process.env.TG_LINK_FULLSTACK_DEV_GENERAL,
    telegramStartup: process.env.TG_LINK_FULLSTACK_DEV_STARTUP,
  },
  'mobile-app-development': {
    name: 'Mobile App Development',
    telegramGeneral: process.env.TG_LINK_MOBILE_DEV_GENERAL,
    telegramStartup: process.env.TG_LINK_MOBILE_DEV_STARTUP,
  },
  'data-analytics': {
    name: 'Data Analytics',
    telegramGeneral: process.env.TG_LINK_DATA_ANALYTICS_GENERAL,
    telegramStartup: process.env.TG_LINK_DATA_ANALYTICS_STARTUP,
  },
  'digital-marketing': {
    name: 'Digital Marketing',
    telegramGeneral: process.env.TG_LINK_DIGITAL_MARKETING_GENERAL,
    telegramStartup: process.env.TG_LINK_DIGITAL_MARKETING_STARTUP,
  },
  'ui-ux-design': {
    name: 'UI/UX Design',
    telegramGeneral: process.env.TG_LINK_UI_UX_GENERAL,
    telegramStartup: process.env.TG_LINK_UI_UX_STARTUP,
  },
  cybersecurity: {
    name: 'Cybersecurity',
    telegramGeneral: process.env.TG_LINK_CYBERSECURITY_GENERAL,
    telegramStartup: process.env.TG_LINK_CYBERSECURITY_STARTUP,
  },
  'ai-automation-chatbots': {
    name: 'AI Automation / Chatbots',
    telegramGeneral: process.env.TG_LINK_AI_AUTOMATION_GENERAL,
    telegramStartup: process.env.TG_LINK_AI_AUTOMATION_STARTUP,
  },
};
