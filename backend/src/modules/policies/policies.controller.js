/**
 * HTTP layer for policy management endpoints.
 *
 * Wraps policies.service and formats responses as { message, data }. Every
 * mutating action writes an audit entry recording the actor and before/after
 * state.
 */

const policyService = require('./policies.service');
const auditService = require('../audit/audit.service');

/**
 * Handles GET /api/policies.
 * @param {object} req - Authenticated request; reads page/pageSize/status.
 * @param {object} res - Express response ({ message, data: { policies, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await policyService.listPolicies({
      page: req.query.page,
      pageSize: req.query.pageSize,
      status: req.query.status,
    });
    res.json({ message: 'Policies retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/policies/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { policy } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    const policy = await policyService.getPolicy(req.params.id);
    res.json({ message: 'Policy retrieved', data: { policy } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/policies.
 * @param {object} req - Authenticated request with policy fields.
 * @param {object} res - Express response ({ message, data: { policy } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const policy = await policyService.createPolicy(req.body);
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'policy',
      entityId: policy.id,
      before: null,
      after: policy,
    });
    res.status(201).json({ message: 'Policy created', data: { policy } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/policies/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { policy } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const before = await policyService.getPolicy(req.params.id);
    const policy = await policyService.updatePolicy(req.params.id, req.body);
    await auditService.recordFromRequest(req, {
      action: 'update',
      entity: 'policy',
      entityId: policy.id,
      before,
      after: policy,
    });
    res.json({ message: 'Policy updated', data: { policy } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/policies/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    const before = await policyService.getPolicy(req.params.id);
    await policyService.deletePolicy(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'delete',
      entity: 'policy',
      entityId: req.params.id,
      before,
      after: null,
    });
    res.json({ message: 'Policy deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
