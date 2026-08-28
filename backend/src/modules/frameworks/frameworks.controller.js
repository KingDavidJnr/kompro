/**
 * HTTP layer for framework endpoints.
 *
 * Wraps frameworks.service and formats responses as { message, data }.
 */

const frameworkService = require('./frameworks.service');

/**
 * Handles GET /api/frameworks.
 * @param {object} req - Authenticated request; reads enabled query.
 * @param {object} res - Express response ({ message, data: { frameworks } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const enabled = req.query.enabled === undefined ? undefined : req.query.enabled === 'true';
    res.json({ message: 'Frameworks retrieved', data: { frameworks: await frameworkService.listFrameworks({ enabled }) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/frameworks.
 * @param {object} req - Authenticated request with { name, description, enabled }.
 * @param {object} res - Express response ({ message, data: { framework } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const framework = await frameworkService.createFramework(req.body);
    res.status(201).json({ message: 'Framework created', data: { framework } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/frameworks/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { framework } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    res.json({ message: 'Framework retrieved', data: { framework: await frameworkService.getFramework(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/frameworks/:id/status.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: derived status }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function status(req, res, next) {
  try {
    res.json({ message: 'Framework status derived', data: await frameworkService.deriveFrameworkStatus(req.params.id) });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/frameworks/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { framework } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    res.json({ message: 'Framework updated', data: { framework: await frameworkService.updateFramework(req.params.id, req.body) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/frameworks/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    await frameworkService.deleteFramework(req.params.id);
    res.json({ message: 'Framework deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, get, status, update, remove };
