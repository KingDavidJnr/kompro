/**
 * HTTP layer for audit log endpoints.
 *
 * Wraps audit.service and formats responses as { message, data }. Audit
 * entries are append-only; this module only reads them.
 */

const auditService = require('./audit.service');

/**
 * Handles GET /api/audit.
 * @param {object} req - Authenticated request; reads page/pageSize/entity/entityId/actorId/action.
 * @param {object} res - Express response ({ message, data: { entries, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await auditService.listAudit({
      page: req.query.page,
      pageSize: req.query.pageSize,
      entity: req.query.entity,
      entityId: req.query.entityId,
      actorId: req.query.actorId,
      action: req.query.action,
    });
    res.json({ message: 'Audit log retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/audit/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { entry } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    res.json({ message: 'Audit entry retrieved', data: { entry: await auditService.getAudit(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get };
