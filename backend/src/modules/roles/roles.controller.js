/**
 * HTTP layer for role and permission endpoints.
 *
 * Wraps roles.service and formats responses as { message, data }.
 */

const roleService = require('./roles.service');

/**
 * Handles GET /api/roles.
 * @param {object} req - Authenticated request.
 * @param {object} res - Express response ({ message, data: { roles } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    res.json({ message: 'Roles retrieved', data: { roles: await roleService.listRoles() } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/roles/permissions.
 * @param {object} req - Authenticated request.
 * @param {object} res - Express response ({ message, data: { permissions } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function listPermissions(req, res, next) {
  try {
    res.json({ message: 'Permissions retrieved', data: { permissions: await roleService.listPermissions() } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/roles/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { role } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    res.json({ message: 'Role retrieved', data: { role: await roleService.getRole(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/roles.
 * @param {object} req - Authenticated request with { name, description, permissions }.
 * @param {object} res - Express response ({ message, data: { role } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json({ message: 'Role created', data: { role } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/roles/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { role } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const role = await roleService.updateRole(req.params.id, req.body);
    res.json({ message: 'Role updated', data: { role } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/roles/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    await roleService.deleteRole(req.params.id);
    res.json({ message: 'Role deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, listPermissions, get, create, update, remove };
