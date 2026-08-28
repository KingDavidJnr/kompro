/**
 * Authorization middleware factory for data-driven IAM.
 *
 * Permissions live in the database and are attached to roles. This factory
 * returns a middleware that checks the authenticated user's role contains the
 * requested permission name, returning 403 otherwise.
 */

const prisma = require('../lib/prisma');
const { ForbiddenError } = require('../utils/errors');

/**
 * Builds a middleware that requires a specific permission.
 * @param {string} permission - Permission name such as "org:update".
 * @returns {function} Express middleware that allows or denies the request.
 */
function requirePermission(permission) {
  return async function (req, res, next) {
    try {
      const user = req.user;
      if (!user || !user.roleId) {
        throw new ForbiddenError();
      }

      // Load the user's role with its permissions.
      const role = await prisma.role.findUnique({
        where: { id: user.roleId },
        include: { permissions: true },
      });

      const allowed = role?.permissions.some((p) => p.name === permission);
      if (!allowed) {
        throw new ForbiddenError();
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requirePermission;
