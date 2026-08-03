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
  otp: (code) =>
    wrapper('Your password reset code', `<p>Use this code to reset your password. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.</p><p style="font-size:28px;font-weight:800;letter-spacing:4px;color:#39E07A;">${code}</p><p>If you didn't request this, you can safely ignore this email.</p>`),

  contactCopy: ({ name, subject, body }) =>
    wrapper('New contact form message', `<p><strong>From:</strong> ${name}</p><p><strong>Subject:</strong> ${subject}</p><p>${body}</p>`),
};

export async function sendOtpEmail(email, code) {
  return sendEmail({ to: email, subject: 'Your TechGrind password reset code', html: emailTemplates.otp(code) });
}

export async function sendContactFormEmail({ name, email, subject, body }) {
  return sendEmail({
    to: env.CONTACT_INBOX_EMAIL,
    subject: `[Contact] ${subject}`,
    html: emailTemplates.contactCopy({ name: `${name} <${email}>`, subject, body }),
  });
}
