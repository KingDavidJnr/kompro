/**
 * Outbound email helpers.
 *
 * Wraps nodemailer to send invitation emails. nodemailer is required lazily so
 * the backend still boots when the dependency is not yet installed. All senders
 * assume SMTP is configured via environment variables; if it is not, the caller
 * receives a clear error.
 */

const crypto = require('crypto');
const config = require('../config');

/**
 * Sends an invitation email containing a one-time accept link.
 * @param {object} opts - { to, token }.
 * @param {string} opts.to - Recipient email address.
 * @param {string} opts.token - One-time invitation token embedded in the link.
 * @returns {Promise<void>} Resolves when the message is accepted by the server.
 * @throws {Error} When SMTP is not configured or the transport rejects the mail.
 */
async function sendInvite({ to, token }) {
  // Lazy require so a missing dependency does not break boot.
  const nodemailer = require('nodemailer');
  const { smtp, appUrl, orgName, inviteTtlHours } = config;

  if (!smtp.host) {
    throw new Error('SMTP is not configured (set SMTP_HOST)');
  }

  const link = `${appUrl}/accept-invite?token=${token}`;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  const text = [
    `You have been invited to join ${orgName} on Kompro.`,
    '',
    `Accept your invitation: ${link}`,
    '',
    `This link expires in ${inviteTtlHours} hours.`,
  ].join('\n');

  const html = [
    '<p>You have been invited to join <strong>' + orgName + '</strong> on Kompro.</p>',
    '<p><a href="' + link + '">Accept your invitation</a></p>',
    '<p>This link expires in ' + inviteTtlHours + ' hours.</p>',
  ].join('\n');

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: `You have been invited to ${orgName}`,
    text,
    html,
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

  const link = `${appUrl}/reset-password?token=${token}`;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });

  const text = [
    `A password reset was requested for your ${orgName} account.`,
    '',
    `Reset your password: ${link}`,
    '',
    `This link expires in ${inviteTtlHours} hours. If you did not request this, you can ignore the email.`,
  ].join('\n');

  const html = [
    '<p>A password reset was requested for your <strong>' + orgName + '</strong> account.</p>',
    '<p><a href="' + link + '">Reset your password</a></p>',
    '<p>This link expires in ' + inviteTtlHours + ' hours. If you did not request this, you can ignore the email.</p>',
  ].join('\n');

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: `Reset your ${orgName} password`,
    text,
    html,
  });
}

module.exports = { sendInvite, sendPasswordReset };
