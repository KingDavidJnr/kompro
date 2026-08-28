/**
 * HTTP layer for evidence management endpoints.
 *
 * Wraps evidence.service and formats responses as { message, data }.
 */

const evidenceService = require('./evidence.service');

/**
 * Handles GET /api/evidence.
 * @param {object} req - Authenticated request; reads page/pageSize/controlId/policyId/source.
 * @param {object} res - Express response ({ message, data: { evidence, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await evidenceService.listEvidence({
      page: req.query.page,
      pageSize: req.query.pageSize,
      controlId: req.query.controlId,
      policyId: req.query.policyId,
      source: req.query.source,
    });
    res.json({ message: 'Evidence retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/evidence/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { evidence } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    const evidence = await evidenceService.getEvidence(req.params.id);
    res.json({ message: 'Evidence retrieved', data: { evidence } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/evidence.
 * @param {object} req - Authenticated request with evidence fields.
 * @param {object} res - Express response ({ message, data: { evidence } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const evidence = await evidenceService.createEvidence(req.body);
    res.status(201).json({ message: 'Evidence created', data: { evidence } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/evidence/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { evidence } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const evidence = await evidenceService.updateEvidence(req.params.id, req.body);
    res.json({ message: 'Evidence updated', data: { evidence } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/evidence/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    await evidenceService.deleteEvidence(req.params.id);
    res.json({ message: 'Evidence deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
