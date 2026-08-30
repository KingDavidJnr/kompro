/**
 * Authentication business logic: registration, login, logout and current user.
 *
 * Passwords are hashed with bcrypt. Login issues a signed session JWT and a
 * database session so access can be revoked instantly. The first registered
 * user becomes an admin; later users get the member role by default.
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../../lib/prisma');
const { signSession } = require('../../lib/jwt');
const config = require('../../config');
const emailService = require('../../lib/email');
const auditService = require('../audit/audit.service');
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
 * Determines whether a sign-in IP has been seen before for an account.
 * @param {string} userId - User id.
 * @param {string} ip - Incoming request IP.
 * @returns {Promise<boolean>} True when this IP has NOT been used before but
 *   at least one earlier sign-in exists (i.e. a new device/location).
 */
async function isNewLoginIp(userId, ip) {
  const priorSameIp = await prisma.auditLog.count({
    where: { actorId: userId, action: 'login', ip },
  });
  const priorAny = await prisma.auditLog.count({
    where: { actorId: userId, action: 'login' },
  });
  return priorSameIp === 0 && priorAny > 0;
}

/**
 * Persists a session for a resolved user and mints the session JWT.
 *
 * Shared by password login and SSO so every sign-in path produces the same
 * revocable session cookie. Also records the login audit entry and, when SMTP
 * is configured, alerts on a first sign-in from a new IP.
 * @param {object} user - Resolved user record (must be active).
 * @param {string} [ip] - Request IP, used for new-device detection.
 * @returns {Promise<object>} { token, user } where user is sanitized.
 */
async function createSessionForUser(user, ip) {
  // Persist a session so it can be revoked independently of the token.
  const expiresAt = new Date(Date.now() + config.sessionTtlMs);
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt },
  });

  const token = signSession({ sub: user.id, sid: session.id });

  // Record the sign-in (audit trail + new-device detection). Checked before
  // inserting so the just-created row does not mask a genuinely new IP.
  const newIp = ip ? await isNewLoginIp(user.id, ip) : false;
  await auditService.recordAudit({
    actorId: user.id,
    action: 'login',
    entity: 'user',
    entityId: user.id,
    ip: ip || null,
  });

  if (newIp && config.smtp.host) {
    try {
      await emailService.sendNotification({
        to: user.email,
        heading: `New sign-in to your ${config.orgName} account`,
        paragraphs: [
          `We noticed a sign-in to your ${config.orgName} account from a new IP address: ${ip}.`,
          'If this was you, no action is needed. If you did not sign in, please reset your password and contact your administrator.',
        ],
      });
    } catch (err) {
      console.error(`Failed to send new-login alert to ${user.email}: ${err.message}`);
    }
  }

  return { token, user: publicUser(user) };
}

/**
 * Authenticates a user and creates a session.
 * @param {object} input - { email, password, ip }.
 * @param {string} [input.ip] - Request IP, used for new-device detection.
 * @returns {object} { token, user } where user is sanitized.
 * @throws {UnauthorizedError} On invalid credentials or inactive user.
 */
async function login({ email, password, ip }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Invalid credentials');
  }

  return createSessionForUser(user, ip);
}

/**
 * Resolves (or provisions) a user from a verified identity-provider profile
 * and creates a session. Matching prefers the provider subject id, then falls
 * back to the verified email so an SSO login can attach to an existing
 * password account. When no match exists a new user is created with the member
 * role (or admin for the first user), unless auto-provisioning is disabled.
 * @param {object} input - { email, name, provider, providerId, ip }.
 * @returns {Promise<object>} { token, user } where user is sanitized.
 * @throws {UnauthorizedError} When SSO provisioning is disabled and the
 *   identity does not match an existing user.
 */
async function ssoLogin({ email, name, provider, providerId, ip }) {
  if (!email) {
    throw new UnauthorizedError('Identity provider did not return an email');
  }

  let user = await prisma.user.findFirst({
    where: { OR: [{ provider, providerId }, { email }] },
  });

  if (!user) {
    if (!config.sso.autoProvision) {
      throw new UnauthorizedError('No account matches this sign-in. Contact an administrator.');
    }

    const count = await prisma.user.count();
    const roleName = count === 0 ? 'admin' : 'member';
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new Error(`Default role "${roleName}" not found. Run the seed script.`);
    }

    user = await prisma.user.create({
      // passwordHash is required; SSO accounts get a random hash so a password
      // login attempt can never succeed for them.
      data: {
        email,
        name,
        provider,
        providerId,
        roleId: role.id,
        active: true,
        passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      },
    });
  } else if (!user.active) {
    throw new UnauthorizedError('Account is inactive');
  } else if (!user.providerId) {
    // Link the identity to the existing (password) account for future logins.
    user = await prisma.user.update({
      where: { id: user.id },
      data: { provider, providerId, name: user.name || name },
    });
  }

  return createSessionForUser(user, ip);
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

/**
 * Initiates a password reset for an account.
 * @param {object} input - { email }.
 * @returns {Promise<object>} { userExists, emailed } where emailed reflects
 *   whether the link was emailed. The token is never returned to the caller;
 *   when SMTP is absent a reset must be issued by an administrator via the
 *   audited admin endpoint.
 * @throws {Error} When SMTP is configured but the reset email cannot be sent.
 */
async function forgotPassword({ email }) {
  if (!email) {
    return { userExists: false };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Stay silent to avoid account enumeration.
    return { userExists: false };
  }

  // With an SMTP server we email a reset link and reveal nothing to the caller.
  // Without SMTP there is no mail transport, so a reset can only be issued by an
  // administrator through the dedicated, fully-audited admin endpoint. We do not
  // create or disclose a token here.
  if (!config.smtp.host) {
    return { userExists: true, emailed: false };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.inviteTtlHours * 60 * 60 * 1000);
  await prisma.passwordReset.create({
    data: { token, email: user.email, userId: user.id, expiresAt },
  });
  await emailService.sendPasswordReset({ to: user.email, token });
  return { userExists: true, emailed: true };
}

/**
 * Completes a password reset using a one-time token.
 * @param {object} input - { token, password }.
 * @returns {Promise<object>} Sanitized user whose password was reset.
 * @throws {ValidationError} When the token is invalid, used or expired.
 */
async function resetPassword({ token, password }) {
  const record = await prisma.passwordReset.findUnique({ where: { token }, include: { user: true } });
  if (!record || record.usedAt) {
    throw new ValidationError('Reset link is invalid or already used');
  }
  if (record.expiresAt < new Date()) {
    await prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    throw new ValidationError('Reset link has expired');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    // Force a fresh login by revoking every active session for this user.
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  // Confirm the change to the account owner (sessions were just revoked).
  if (config.smtp.host) {
    try {
      await emailService.sendNotification({
        to: record.user.email,
        heading: `Your ${config.orgName} password was changed`,
        paragraphs: [
          `Hi ${record.user.name || 'there'},`,
          `The password for your ${config.orgName} account (${record.user.email}) was just changed. If this was you, no action is needed.`,
          'If you did not make this change, please contact your administrator immediately.',
        ],
      });
    } catch (err) {
      console.error(`Failed to send password-changed email to ${record.user.email}: ${err.message}`);
    }
  }

  return publicUser(record.user);
}

/**
 * Changes the authenticated user's own password after verifying the current
 * one. All other active sessions are revoked so the new password is enforced
 * everywhere, and the change is confirmed by email when SMTP is configured.
 * @param {object} input - { userId, currentPassword, newPassword }.
 * @returns {Promise<object>} Sanitized user whose password changed.
 * @throws {UnauthorizedError} When the current password is incorrect.
 */
async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    // Force a fresh login everywhere by revoking active sessions.
    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  if (config.smtp.host) {
    try {
      await emailService.sendNotification({
        to: user.email,
        heading: `Your ${config.orgName} password was changed`,
        paragraphs: [
          `Hi ${user.name || 'there'},`,
          `The password for your ${config.orgName} account (${user.email}) was just changed. If this was you, no action is needed.`,
          'If you did not make this change, please contact your administrator immediately.',
        ],
      });
    } catch (err) {
      console.error(`Failed to send password-changed email to ${user.email}: ${err.message}`);
    }
  }

  return publicUser(user);
}

module.exports = { register, login, logout, me, acceptInvite, forgotPassword, resetPassword, changePassword, isNewLoginIp, ssoLogin };
