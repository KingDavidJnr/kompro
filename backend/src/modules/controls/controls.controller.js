/**
 * HTTP layer for control management endpoints.
 *
 * Wraps controls.service and formats responses as { message, data }. Every
 * mutating action writes an audit entry recording the actor and before/after
 * state.
 */

const controlService = require('./controls.service');
const auditService = require('../audit/audit.service');

/**
 * Handles GET /api/controls.
 * @param {object} req - Authenticated request; reads page/pageSize/category/status.
 * @param {object} res - Express response ({ message, data: { controls, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await controlService.listControls({
      page: req.query.page,
      pageSize: req.query.pageSize,
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
    });
    res.json({ message: 'Controls retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/controls/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { control } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    const control = await controlService.getControl(req.params.id);
    res.json({ message: 'Control retrieved', data: { control } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/controls.
 * @param {object} req - Authenticated request with control fields.
 * @param {object} res - Express response ({ message, data: { control } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const control = await controlService.createControl(req.body);
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'control',
      entityId: control.id,
      before: null,
      after: control,
    });
    res.status(201).json({ message: 'Control created', data: { control } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/controls/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { control } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const before = await controlService.getControl(req.params.id);
    const control = await controlService.updateControl(req.params.id, req.body);
    await auditService.recordFromRequest(req, {
      action: 'update',
      entity: 'control',
      entityId: control.id,
      before,
      after: control,
    });
    res.json({ message: 'Control updated', data: { control } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/controls/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    const before = await controlService.getControl(req.params.id);
    await controlService.deleteControl(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'delete',
      entity: 'control',
      entityId: req.params.id,
      before,
      after: null,
    });
    res.json({ message: 'Control deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
