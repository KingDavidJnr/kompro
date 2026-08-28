/**
 * Authentication business logic: registration, login, logout and current user.
 *
 * Passwords are hashed with bcrypt. Login issues a signed session JWT and a
 * database session so access can be revoked instantly. The first registered
 * user becomes an admin; later users get the member role by default.
 */

const bcrypt = require('bcrypt');
const prisma = require('../../lib/prisma');
const { signSession } = require('../../lib/jwt');
const config = require('../../config');
const { ValidationError, UnauthorizedError, publicUser } = require('../../utils/errors');

/**
 * Registers a new user.
 * @param {object} input - { email, password, name }.
 * @returns {object} Sanitized user record (no password hash).
 * @throws {ValidationError} When the email is already registered.
 * @throws {Error} When the required default role is missing (seed not run).
 */
async function register({ email, password, name }) {
  // Reject duplicates early with a clear client message.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ValidationError('Email already registered');
  }

  // The first user in the system is granted the admin role.
  const count = await prisma.user.count();
  const roleName = count === 0 ? 'admin' : 'member';
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Default role "${roleName}" not found. Run the seed script.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, roleId: role.id, active: true },
  });

  return publicUser(user);
}

/**
 * Authenticates a user and creates a session.
 * @param {object} input - { email, password }.
 * @returns {object} { token, user } where user is sanitized.
 * @throws {UnauthorizedError} On invalid credentials or inactive user.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Persist a session so it can be revoked independently of the token.
  const expiresAt = new Date(Date.now() + config.sessionTtlMs);
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt },
  });

  const token = signSession({ sub: user.id, sid: session.id });
  return { token, user: publicUser(user) };
}

/**
 * Revokes a session, logging the user out.
 * @param {string} userId - Owner of the session (kept for call-site clarity).
 * @param {string} sessionId - Session id to revoke.
 * @returns {boolean} True when the revocation was recorded.
 */
async function logout(userId, sessionId) {
  // Soft delete: mark revoked so the audit trail and history remain.
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
  return true;
}

/**
 * Returns the sanitized current user.
 * @param {object} user - Authenticated user record from the request.
 * @returns {object} Sanitized user.
 */
function me(user) {
  return publicUser(user);
}

/**
 * Accepts a user invitation by setting the account password and activating it.
 * @param {object} input - { token, password }.
 * @returns {Promise<object>} Sanitized user that accepted the invite.
 * @throws {ValidationError} When the token is invalid, used or expired.
 */
async function acceptInvite({ token, password }) {
  const invite = await prisma.invite.findUnique({ where: { token }, include: { user: true } });
  if (!invite || invite.usedAt) {
    throw new ValidationError('Invitation is invalid or already used');
  }
  if (invite.expiresAt < new Date()) {
    // Mark expired invites so they cannot be reused.
    await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    throw new ValidationError('Invitation has expired');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: invite.userId },
      data: { passwordHash, active: true },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    return updated;
  });

  return publicUser(user);
}

module.exports = { register, login, logout, me, acceptInvite };
