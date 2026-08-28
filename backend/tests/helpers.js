/**
 * Shared test helpers.
 *
 * Exposes the Express app (via Supertest), a Prisma client for inspecting
 * state, and utilities for creating sessions and reading one-time tokens that
 * were delivered by email. Any flow that sends email uses a unique
 * odusedavid+<alias>@gmail.com address so messages actually land in the inbox
 * when SMTP (e.g. Gmail) is configured.
 */

const request = require('supertest');
const app = require('../src/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PASSWORD = 'Sup3rSecret!123';

let aliasCounter = 0;

/**
 * Builds a unique email that routes to the odusedavid Gmail inbox.
 * @param {string} label - Short tag describing the test scenario.
 * @returns {string} A unique odusedavid+alias@gmail.com address.
 */
function uniqueEmail(label) {
  aliasCounter += 1;
  return `odusedavid+${label}-${Date.now()}-${aliasCounter}@gmail.com`;
}

/**
 * Logs in and returns the session cookie for authenticated requests.
 * @param {string} email - User email.
 * @param {string} [password] - User password (defaults to the shared test password).
 * @returns {Promise<string[]>} The Set-Cookie header array from the response.
 */
async function loginCookie(email, password = PASSWORD) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  if (!res.headers['set-cookie']) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.headers['set-cookie'];
}

/**
 * Registers the first user (becomes admin after a wipe) and returns its session.
 * @param {string} [label] - Alias label.
 * @returns {Promise<{ email: string, cookie: string[] }>}
 */
async function createAdminSession(label = 'admin') {
  const email = uniqueEmail(label);
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email, password: PASSWORD, name: 'Admin' });
  if (reg.status !== 201) {
    throw new Error(`Admin register failed: ${JSON.stringify(reg.body)}`);
  }
  const cookie = await loginCookie(email, PASSWORD);
  return { email, cookie };
}

/**
 * Reads the latest unused invitation token for an email (from the DB).
 * @param {string} email - Invited email address.
 * @returns {Promise<string|null>} The token, or null when none exists.
 */
async function getInviteToken(email) {
  const invite = await prisma.invite.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });
  return invite ? invite.token : null;
}

/**
 * Reads the latest unused password-reset token for an email (from the DB).
 * @param {string} email - Account email address.
 * @returns {Promise<string|null>} The token, or null when none exists.
 */
async function getResetToken(email) {
  const record = await prisma.passwordReset.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });
  return record ? record.token : null;
}

module.exports = {
  request,
  app,
  prisma,
  PASSWORD,
  uniqueEmail,
  loginCookie,
  createAdminSession,
  getInviteToken,
  getResetToken,
};
