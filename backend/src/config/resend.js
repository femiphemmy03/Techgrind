import { Resend } from 'resend';
import { env } from './env.js';

export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping send:', subject);
    return { skipped: true };
  }
  return resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
