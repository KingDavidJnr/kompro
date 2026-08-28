/**
 * User management business logic.
 *
 * Provides listing, lookup, creation, update and removal of users. Passwords
 * are hashed with bcrypt. Setting active to false (or deleting a user) revokes
 * access immediately because requireAuth re-checks the user on every request.
 */

const bcrypt = require('bcrypt');
const prisma = require('../../lib/prisma');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * Lists users with pagination.
 * @param {object} [opts] - { page, pageSize }.
 * @returns {object} { users, total, page, pageSize } where users are sanitized.
 */
async function listUsers({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
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
 * Creates a user.
 * @param {object} input - { email, password, name, roleId, active }.
 * @returns {object} Sanitized created user.
 * @throws {ValidationError} On missing fields or unknown role.
 * @throws {ApiError} 409 when the email already exists (Prisma unique constraint).
 */
async function createUser({ email, password, name, roleId, active = true }) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  if (roleId) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new ValidationError('Role not found');
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, roleId: roleId || null, active },
    include: { role: true },
  });

  const { passwordHash: ph, role, ...rest } = user;
  return { ...rest, role: role ? { id: role.id, name: role.name } : null };
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
  const { passwordHash, role, ...rest } = user;
  return { ...rest, role: role ? { id: role.id, name: role.name } : null };
}

/**
 * Deletes a user.
 * @param {string} id - User id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the user does not exist.
 */
async function deleteUser(id) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }
  await prisma.user.delete({ where: { id } });
  return true;
}

module.exports = { listUsers, getUserById, createUser, updateUser, deleteUser };
