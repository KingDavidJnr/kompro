/**
 * HTTP layer for user management endpoints.
 *
 * Wraps users.service and formats responses as { message, data }.
 */

const userService = require('./users.service');

/**
 * Handles GET /api/users.
 * @param {object} req - Authenticated request; reads page/pageSize query.
 * @param {object} res - Express response ({ message, data: { users, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await userService.listUsers({
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json({ message: 'Users retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/users/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ message: 'User retrieved', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/users.
 * @param {object} req - Authenticated request with { email, password, name, roleId, active }.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ message: 'User created', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/users/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json({ message: 'User updated', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/users/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
