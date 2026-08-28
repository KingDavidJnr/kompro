/**
 * Outbound email helpers.
 *
 * Wraps nodemailer to send invitation and password reset emails. nodemailer is
 * required lazily so the backend still boots when the dependency is not yet
 * installed. All emails share a branded, responsive HTML template that shows
 * the Kompro wordmark at the top (transparent, no background box), a brand
 * color call-to-action, and an open-source footer notice. A plain-text twin is
 * always included for clients that prefer it.
 */

const config = require('../config');

/**
 * Builds a branded HTML email body.
 * @param {object} opts - { heading, paragraphs, buttonText, buttonUrl, footerNote }.
 * @param {string} opts.heading - Main title line.
 * @param {string[]} opts.paragraphs - Body paragraphs (may contain simple HTML).
 * @param {string} opts.buttonText - Call-to-action label.
 * @param {string} opts.buttonUrl - Call-to-action URL.
 * @param {string} opts.footerNote - Small print shown in the footer.
 * @returns {string} Full HTML email document.
 */
function buildBrandedEmail({ heading, paragraphs, buttonText, buttonUrl, footerNote }) {
  const logo = config.mailLogoUrl;
  const brand = config.brandColor;

  // The logo PNG is transparent; it sits directly on the white card so its
  // distinctness is preserved (no background fill behind it).
  const bodyParagraphs = paragraphs
    .map((p) => `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;font-family:inherit;">${p}</p>`)
    .join('');

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;padding:32px;box-sizing:border-box;">
            <tr>
              <td style="text-align:center;padding-bottom:24px;">
                <img src="${logo}" alt="Kompro" width="200" style="max-width:200px;height:auto;display:block;margin:0 auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td>
                <h1 style="margin:0 0 16px;color:#18181b;font-size:20px;font-weight:700;font-family:inherit;">${heading}</h1>
                ${bodyParagraphs}
                <p style="margin:0 0 24px;text-align:center;">
                  <a href="${buttonUrl}" style="background:${brand};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;display:inline-block;font-family:inherit;">${buttonText}</a>
                </p>
                <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5;word-break:break-all;font-family:inherit;">
                  Or paste this link: <a href="${buttonUrl}" style="color:${brand};text-decoration:underline;">${buttonUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #eeeeee;margin-top:24px;padding-top:16px;">
                <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;text-align:center;font-family:inherit;">
                  ${footerNote}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Builds the plain-text twin of a branded email.
 * @param {object} opts - { heading, paragraphs, buttonText, buttonUrl, footerNote }.
 * @returns {string} Plain text email body.
 */
function buildTextEmail({ heading, paragraphs, buttonText, buttonUrl, footerNote }) {
  return [
    heading,
    '',
    ...paragraphs,
    '',
    `${buttonText}: ${buttonUrl}`,
    '',
    footerNote,
  ].join('\n');
}

/**
 * Sends an invitation email containing a one-time accept link.
 * @param {object} opts - { to, token }.
 * @param {string} opts.to - Recipient email address.
 * @param {string} opts.token - One-time invitation token embedded in the link.
 * @returns {Promise<void>} Resolves when the message is accepted by the server.
 * @throws {Error} When SMTP is not configured or the transport rejects the mail.
 */
async function sendInvite({ to, token }) {
  const nodemailer = require('nodemailer');
  const { smtp, appUrl, orgName, inviteTtlHours } = config;

  if (!smtp.host) {
    throw new Error('SMTP is not configured (set SMTP_HOST)');
  }

  const buttonUrl = `${appUrl}/accept-invite?token=${token}`;
  const content = {
    heading: `You're invited to ${orgName}`,
    paragraphs: [
      `You have been invited to join <strong>${orgName}</strong> on Kompro, your team's compliance workspace.`,
      `Accept your invitation to set a password and get started. This link expires in ${inviteTtlHours} hours.`,
    ],
    buttonText: 'Accept invitation',
    buttonUrl,
    footerNote:
      'Kompro is free, open-source software (AGPL-3.0), self-hosted by your organization. If you were not expecting this email you can safely ignore it.',
  };

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: `You have been invited to ${orgName}`,
    text: buildTextEmail(content),
    html: buildBrandedEmail(content),
  });
}

/**
 * Sends a password reset email containing a one-time link.
 * @param {object} opts - { to, token }.
 * @param {string} opts.to - Recipient email address.
 * @param {string} opts.token - One-time reset token embedded in the link.
 * @returns {Promise<void>} Resolves when the message is accepted by the server.
 * @throws {Error} When SMTP is not configured or the transport rejects the mail.
 */
async function sendPasswordReset({ to, token }) {
  const nodemailer = require('nodemailer');
  const { smtp, appUrl, orgName, inviteTtlHours } = config;

  if (!smtp.host) {
    throw new Error('SMTP is not configured (set SMTP_HOST)');
  }

  const buttonUrl = `${appUrl}/reset-password?token=${token}`;
  const content = {
    heading: `Reset your ${orgName} password`,
    paragraphs: [
      `A password reset was requested for your <strong>${orgName}</strong> account.`,
      `Choose a new password using the link below. This link expires in ${inviteTtlHours} hours. If you did not request this, you can ignore the email.`,
    ],
    buttonText: 'Reset password',
    buttonUrl,
    footerNote:
      'Kompro is free, open-source software (AGPL-3.0), self-hosted by your organization.',
  };

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: `Reset your ${orgName} password`,
    text: buildTextEmail(content),
    html: buildBrandedEmail(content),
  });
}

module.exports = { sendInvite, sendPasswordReset };
