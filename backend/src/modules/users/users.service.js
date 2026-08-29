/**
 * User management business logic.
 *
 * Provides listing, lookup, creation, update and removal of users. Passwords
 * are hashed with bcrypt. Setting active to false (or deleting a user) revokes
 * access immediately because requireAuth re-checks the user on every request.
 *
 * Creating a user without a password starts an invitation: the account is
 * created inactive with a random password and a one-time invite token is
 * emailed to the address. Supplying a password creates an active account
 * directly with no email.
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../../lib/prisma');
const emailService = require('../../lib/email');
const config = require('../../config');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * Lists users with pagination and optional search.
 * @param {object} [opts] - { page, pageSize, search }.
 * @returns {object} { users, total, page, pageSize } where users are sanitized.
 */
async function listUsers({ page = 1, pageSize = DEFAULT_PAGE_SIZE, search } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const where = {};
  if (search) {
    const q = String(search).trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: { createdAt: 'asc' },
      include: { role: true },
    }),
  ]);

  // Strip the password hash and expose only the role id and name.
  const safeUsers = users.map((u) => {
    const { passwordHash, role, ...rest } = u;
    return { ...rest, role: role ? { id: role.id, name: role.name } : null };
  });

  return { users: safeUsers, total, page: safePage, pageSize: safeSize };
}

/**
 * Returns a single user by id.
 * @param {string} id - User id.
 * @returns {object} Sanitized user with role summary.
 * @throws {NotFoundError} When the user does not exist.
 */
async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  const { passwordHash, role, ...rest } = user;
  return { ...rest, role: role ? { id: role.id, name: role.name } : null };
}

/**
 * Sanitizes a user record returned by Prisma.
 * @param {object} user - Raw user record with role relation.
 * @returns {object} User without passwordHash, with role summary.
 */
function sanitize(user) {
  const { passwordHash, role, ...rest } = user;
  return { ...rest, role: role ? { id: role.id, name: role.name } : null };
}

/**
 * Validates that a role id (if provided) references an existing role.
 * @param {string|null|undefined} roleId - Role id to validate.
 * @returns {Promise<void>}
 * @throws {ValidationError} When the role does not exist.
 */
async function assertRole(roleId) {
  if (roleId === undefined) return;
  if (roleId === null) return;
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw new ValidationError('Role not found');
  }
}

/**
 * Creates a user directly with a password (active account, no email).
 * @param {object} input - { email, password, name, roleId, active }.
 * @returns {Promise<object>} Sanitized created user.
 */
async function createDirectUser({ email, password, name, roleId, active = true }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, roleId: roleId || null, active },
    include: { role: true },
  });
  return sanitize(user);
}

/**
 * Invites a user: creates an inactive account and emails a one-time link.
 * When SMTP is not configured the token is returned so the admin can share the
 * link manually instead of failing the request.
 * @param {object} input - { email, name, roleId }.
 * @returns {Promise<object>} { user, inviteToken } where inviteToken is null
 *   when the email was sent, or the raw token when no SMTP is configured.
 * @throws {Error} When SMTP is configured but the email cannot be sent; the
 *   account is rolled back so an un-notified user is never left behind.
 */
async function inviteUser({ email, name, roleId }) {
  // A throwaway hash; the real password is set when the invite is accepted.
  const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash: tempHash, roleId: roleId || null, active: false },
      include: { role: true },
    });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + config.inviteTtlHours * 60 * 60 * 1000);
    const invite = await tx.invite.create({ data: { token, email, userId: user.id, expiresAt } });
    return { user, invite, token };
  });

  // Without SMTP there is nothing to send; hand the token back to the caller.
  if (!config.smtp.host) {
    return { user: sanitize(created.user), inviteToken: created.token };
  }

  // Send the email after the transaction commits; roll back on failure.
  try {
    await emailService.sendInvite({ to: email, token: created.token });
  } catch (err) {
    await prisma.invite.deleteMany({ where: { userId: created.user.id } });
    await prisma.user.delete({ where: { id: created.user.id } });
    throw err;
  }

  return { user: sanitize(created.user), inviteToken: null };
}

/**
 * Creates a user. With a password the account is active immediately; without
 * one the user is invited by email (or the link is returned when SMTP is off).
 * @param {object} input - { email, password, name, roleId, active }.
 * @returns {Promise<object>} { user, inviteToken } (inviteToken null when no
 *   invite was created or the email was sent).
 * @throws {ValidationError} On missing email or unknown role.
 * @throws {ApiError} 409 when the email already exists (Prisma constraint).
 * @throws {Error} When an invitation email cannot be sent despite SMTP being set.
 */
async function createUser({ email, password, name, roleId, active = true }) {
  if (!email) {
    throw new ValidationError('Email is required');
  }
  await assertRole(roleId);

  if (password) {
    const user = await createDirectUser({ email, password, name, roleId, active });
    return { user, inviteToken: null };
  }
  return inviteUser({ email, name, roleId });
}

/**
 * Resends a pending invitation for an inactive user. When SMTP is not
 * configured the new token is returned so the admin can share the link.
 * @param {string} userId - User id to re-invite.
 * @returns {Promise<object>} { emailSent, inviteToken } where inviteToken is
 *   the raw token only when email was not sent.
 * @throws {NotFoundError} When the user does not exist.
 * @throws {ValidationError} When the user is already active.
 * @throws {Error} When SMTP is configured but the email cannot be sent.
 */
async function resendInvite(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  if (user.active) {
    throw new ValidationError('User is already active');
  }

  // Invalidate any outstanding invites for this user.
  await prisma.invite.deleteMany({ where: { userId, usedAt: null } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.inviteTtlHours * 60 * 60 * 1000);
  await prisma.invite.create({ data: { token, email: user.email, userId, expiresAt } });

  if (!config.smtp.host) {
    return { emailSent: false, inviteToken: token };
  }

  await emailService.sendInvite({ to: user.email, token });
  return { emailSent: true, inviteToken: null };
}

/**
 * Updates a user.
 * @param {string} id - User id.
 * @param {object} input - { name, roleId, active, password }.
 * @returns {object} Sanitized updated user.
 * @throws {NotFoundError} When the user does not exist.
 * @throws {ValidationError} On unknown role.
 */
async function updateUser(id, { name, roleId, active, password }) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  const data = {};
  if (typeof name === 'string') data.name = name;
  if (typeof active === 'boolean') data.active = active;

  // Allow clearing the role with null, or assigning a known role.
  if (roleId !== undefined) {
    if (roleId === null) {
      data.roleId = null;
    } else {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        throw new ValidationError('Role not found');
      }
      data.roleId = roleId;
    }
  }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({ where: { id }, data, include: { role: true } });

  if (config.smtp.host) {
    try {
      if (password) {
        await emailService.sendNotification({
          to: existing.email,
          heading: `Your ${config.orgName} password was changed`,
          paragraphs: [
            `Hi ${existing.name || 'there'},`,
            `The password for your ${config.orgName} account (${existing.email}) was just changed. If this was you, no action is needed.`,
            'If you did not make this change, please reset your password and contact your administrator.',
          ],
        });
      }
      if (roleId !== undefined && roleId !== existing.roleId) {
        const newRole = await prisma.role.findUnique({ where: { id: roleId } });
        await emailService.sendNotification({
          to: existing.email,
          heading: `Your ${config.orgName} role was changed`,
          paragraphs: [
            `Hi ${existing.name || 'there'},`,
            `Your role on ${config.orgName} was updated to "${newRole ? newRole.name : roleId}". Your permissions have changed accordingly.`,
          ],
        });
      }
    } catch (err) {
      console.error(`Failed to send account-change email to ${existing.email}: ${err.message}`);
    }
  }

  return sanitize(user);
}

/**
 * Deletes a user.
 * @param {string} id - User id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the user does not exist.
 * @throws {ValidationError} When deleting the last administrator.
 */
async function deleteUser(id) {
  const existing = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }
  // Protect the last administrator so the deployment is never orphaned.
  if (existing.role && existing.role.name === 'admin') {
    const otherAdmins = await prisma.user.count({
      where: { id: { not: id }, role: { name: 'admin' } },
    });
    if (otherAdmins === 0) {
      throw new ValidationError('Cannot delete the last admin');
    }
  }
  await prisma.user.delete({ where: { id } });

  // Best-effort notification: the account is already removed, so a failed or
  // unconfigured email must not abort the deletion.
  if (config.smtp.host) {
    try {
      await emailService.sendUserRemoved({ to: existing.email, name: existing.name });
    } catch (err) {
      console.error(`Failed to send removal email to ${existing.email}: ${err.message}`);
    }
  }

  return true;
}

/**
 * Disables a user and revokes all of their active sessions immediately.
 * @param {string} id - User id.
 * @returns {object} Sanitized (now inactive) user.
 * @throws {NotFoundError} When the user does not exist.
 */
async function deactivateUser(id) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }
  if (!existing.active) {
    return sanitize(existing);
  }
  await prisma.session.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const user = await prisma.user.update({
    where: { id },
    data: { active: false },
    include: { role: true },
  });

  if (config.smtp.host) {
    try {
      await emailService.sendNotification({
        to: existing.email,
        heading: `Your ${config.orgName} account was deactivated`,
        paragraphs: [
          `Hi ${existing.name || 'there'},`,
          `Your ${config.orgName} account has been deactivated by an administrator. You will not be able to sign in until it is reactivated.`,
        ],
      });
    } catch (err) {
      console.error(`Failed to send deactivation email to ${existing.email}: ${err.message}`);
    }
  }

  return sanitize(user);
}

/**
 * Re-enables a previously disabled user.
 * @param {string} id - User id.
 * @returns {object} Sanitized (now active) user.
 * @throws {NotFoundError} When the user does not exist.
 */
async function reactivateUser(id) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }
  const user = await prisma.user.update({
    where: { id },
    data: { active: true },
    include: { role: true },
  });

  if (config.smtp.host) {
    try {
      await emailService.sendNotification({
        to: existing.email,
        heading: `Your ${config.orgName} account was reactivated`,
        paragraphs: [
          `Hi ${existing.name || 'there'},`,
          `Your ${config.orgName} account has been reactivated. You can sign in again.`,
        ],
      });
    } catch (err) {
      console.error(`Failed to send reactivation email to ${existing.email}: ${err.message}`);
    }
  }

  return sanitize(user);
}

/**
 * Generates a password-reset link for a user without emailing it.
 *
 * Used by administrators in deployments without SMTP: the admin copies the link
 * and delivers it to the user out of band. The caller is expected to audit this
 * action for visibility. Does not require or rely on SMTP.
 * @param {string} userId - Target user id.
 * @returns {Promise<{ token: string, resetUrl: string, email: string }>}
 * @throws {NotFoundError} When the user does not exist.
 */
async function generateResetLink(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.inviteTtlHours * 60 * 60 * 1000);
  await prisma.passwordReset.create({
    data: { token, email: user.email, userId: user.id, expiresAt },
  });
  return {
    token,
    email: user.email,
    resetUrl: `${config.appUrl}/reset-password?token=${token}`,
  };
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  resendInvite,
  updateUser,
  deleteUser,
  deactivateUser,
  reactivateUser,
  generateResetLink,
};
