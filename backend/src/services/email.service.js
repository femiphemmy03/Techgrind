import { sendEmail } from '../config/resend.js';
import { env } from '../config/env.js';

const wrapper = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0B0F14;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F14;padding:32px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#141B22;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#0B0F14;padding:24px 32px;">
            <span style="color:#39E07A;font-weight:800;font-size:20px;letter-spacing:1px;">TECHGRIND</span>
          </td></tr>
          <tr><td style="padding:32px;color:#F4F7F5;">
            <h2 style="margin:0 0 16px;color:#F4F7F5;">${title}</h2>
            <div style="font-size:14px;line-height:1.6;color:#C7D1CC;">${bodyHtml}</div>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#0B0F14;color:#7C8A85;font-size:11px;">
            TechGrind — Powered by Oluwafemi Sunmola Technologies LTD (RC: 8815307)<br/>
            Support: ${env.CONTACT_INBOX_EMAIL} · WhatsApp/Call: ${env.SUPPORT_WHATSAPP_NUMBER}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

export const emailTemplates = {
  welcomeStudent: (name) =>
    wrapper('Welcome to TechGrind', `<p>Hi ${name || 'there'},</p><p>Your registration is confirmed. Log in any time to see your track, videos, and assessments as they unlock each week.</p>`),

  welcomeAffiliate: (name) =>
    wrapper('You\'re a TechGrind Affiliate', `<p>Hi ${name || 'there'},</p><p>Your affiliate account is live. Share your referral link and earn ₦${env.AFFILIATE_PAYOUT_PER_REFERRAL_NGN} for every student who completes registration payment using your code.</p>`),

  otp: (code) =>
    wrapper('Your password reset code', `<p>Use this code to reset your password. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.</p><p style="font-size:28px;font-weight:800;letter-spacing:4px;color:#39E07A;">${code}</p><p>If you didn't request this, you can safely ignore this email.</p>`),

  paymentConfirmed: (type, amount) =>
    wrapper('Payment received', `<p>We've confirmed your payment of ₦${amount.toLocaleString()} for ${type === 'registration' ? 'cohort registration' : 'joining a startup'}.</p><p>Your dashboard has been updated with the next steps.</p>`),

  contactCopy: ({ name, subject, body }) =>
    wrapper('New contact form message', `<p><strong>From:</strong> ${name}</p><p><strong>Subject:</strong> ${subject}</p><p>${body}</p>`),
};

export async function sendWelcomeEmail(email, role, name) {
  const html = role === 'affiliate' ? emailTemplates.welcomeAffiliate(name) : emailTemplates.welcomeStudent(name);
  return sendEmail({ to: email, subject: 'Welcome to TechGrind', html });
}

export async function sendOtpEmail(email, code) {
  return sendEmail({ to: email, subject: 'Your TechGrind password reset code', html: emailTemplates.otp(code) });
}

export async function sendPaymentConfirmedEmail(email, type, amount) {
  return sendEmail({ to: email, subject: 'TechGrind payment confirmed', html: emailTemplates.paymentConfirmed(type, amount) });
}

export async function sendContactFormEmail({ name, email, subject, body }) {
  return sendEmail({
    to: env.CONTACT_INBOX_EMAIL,
    subject: `[Contact] ${subject}`,
    html: emailTemplates.contactCopy({ name: `${name} <${email}>`, subject, body }),
  });
}
