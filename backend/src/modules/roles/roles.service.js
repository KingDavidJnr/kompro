/**
 * Role and permission management business logic.
 *
 * Roles group permissions and are assigned to users. Permissions are the
 * fixed set seeded by the database seed script. This module lists roles and
 * permissions, and creates, updates and deletes roles, including the
 * permissions attached to them.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Lists all roles with their permissions.
 * @returns {Array} Role records including permissions.
 */
async function listRoles() {
  return prisma.role.findMany({ orderBy: { name: 'asc' }, include: { permissions: true } });
}

/**
 * Lists all permission definitions.
 * @returns {Array} Permission records ordered by name.
 */
async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { name: 'asc' } });
}

/**
 * Returns a single role with its permissions.
 * @param {string} id - Role id.
 * @returns {object} Role record including permissions.
 * @throws {NotFoundError} When the role does not exist.
 */
async function getRole(id) {
  const role = await prisma.role.findUnique({ where: { id }, include: { permissions: true } });
  if (!role) {
    throw new NotFoundError('Role not found');
  }
  return role;
}

/**
 * Maps permission names to ids, rejecting any unknown names.
 * @param {string[]} names - Permission names to resolve.
 * @returns {string[]} Matching permission ids.
 * @throws {ValidationError} When a name does not exist.
 */
async function resolvePermissionIds(names) {
  if (!names.length) return [];
  const found = await prisma.permission.findMany({ where: { name: { in: names } } });
  const foundNames = new Set(found.map((p) => p.name));
  const unknown = names.filter((n) => !foundNames.has(n));
  if (unknown.length) {
    throw new ValidationError(`Unknown permission(s): ${unknown.join(', ')}`);
  }
  return found.map((p) => p.id);
}

/**
 * Creates a role and connects its permissions.
 * @param {object} input - { name, description, permissions } where permissions is an array of names.
 * @returns {object} Created role including permissions.
 * @throws {ValidationError} On missing name or unknown permission.
 */
async function createRole({ name, description, permissions = [] }) {
  if (!name) {
    throw new ValidationError('Role name is required');
  }
  const permIds = await resolvePermissionIds(permissions);
  return prisma.role.create({
    data: { name, description, permissions: { connect: permIds.map((id) => ({ id })) } },
    include: { permissions: true },
  });
}

/**
 * Updates a role and optionally replaces its permissions.
 * @param {string} id - Role id.
 * @param {object} input - { name, description, permissions }.
 * @returns {object} Updated role including permissions.
 * @throws {NotFoundError} When the role does not exist.
 * @throws {ValidationError} On unknown permission.
 */
async function updateRole(id, { name, description, permissions }) {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Role not found');
  }

  const data = {};
  if (typeof name === 'string') data.name = name;
  if (typeof description === 'string') data.description = description;

  // Replace the permission set when provided.
  if (Array.isArray(permissions)) {
    const permIds = await resolvePermissionIds(permissions);
    data.permissions = { set: permIds.map((pid) => ({ id: pid })) };
  }

  return prisma.role.update({ where: { id }, data, include: { permissions: true } });
}

/**
 * Deletes a role if no user is assigned to it.
 * @param {string} id - Role id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the role does not exist.
 * @throws {ValidationError} When the role is still assigned to users.
 */
async function deleteRole(id) {
  const existing = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) {
    throw new NotFoundError('Role not found');
  }
  if (existing._count.users > 0) {
    throw new ValidationError('Role is assigned to users and cannot be deleted');
  }
  await prisma.role.delete({ where: { id } });
  return true;
}

module.exports = {
  listRoles,
  listPermissions,
  getRole,
  createRole,
  updateRole,
  deleteRole,
};
