/**
 * HTTP layer for requirement and mapping endpoints.
 *
 * Requirements and their control mappings are managed here. Wraps
 * frameworks.service and formats responses as { message, data }. Every
 * mutating action writes an audit entry recording the actor and before/after
 * state.
 */

const frameworkService = require('./frameworks.service');
const auditService = require('../audit/audit.service');

/**
 * Handles GET /api/requirements.
 * @param {object} req - Authenticated request; reads frameworkId query.
 * @param {object} res - Express response ({ message, data: { requirements } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    res.json({
      message: 'Requirements retrieved',
      data: { requirements: await frameworkService.listRequirements(req.query.frameworkId) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/requirements.
 * @param {object} req - Authenticated request with { frameworkId, code, title, description }.
 * @param {object} res - Express response ({ message, data: { requirement } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const requirement = await frameworkService.createRequirement(req.body);
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'requirement',
      entityId: requirement.id,
      before: null,
      after: requirement,
    });
    res.status(201).json({ message: 'Requirement created', data: { requirement } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/requirements/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { requirement } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    res.json({ message: 'Requirement retrieved', data: { requirement: await frameworkService.getRequirement(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/requirements/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { requirement } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const before = await frameworkService.getRequirement(req.params.id);
    const requirement = await frameworkService.updateRequirement(req.params.id, req.body);
    await auditService.recordFromRequest(req, {
      action: 'update',
      entity: 'requirement',
      entityId: requirement.id,
      before,
      after: requirement,
    });
    res.json({ message: 'Requirement updated', data: { requirement } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/requirements/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    const before = await frameworkService.getRequirement(req.params.id);
    await frameworkService.deleteRequirement(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'delete',
      entity: 'requirement',
      entityId: req.params.id,
      before,
      after: null,
    });
    res.json({ message: 'Requirement deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/requirements/:requirementId/mappings.
 * @param {object} req - Authenticated request with requirementId param and { controlId, notes }.
 * @param {object} res - Express response ({ message, data: { mapping } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function createMapping(req, res, next) {
  try {
    const mapping = await frameworkService.createMapping(req.params.requirementId, req.body);
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'mapping',
      entityId: `${req.params.requirementId}:${req.body.controlId}`,
      before: null,
      after: mapping,
    });
    res.status(201).json({ message: 'Mapping created', data: { mapping } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/requirements/:requirementId/mappings/:controlId.
 * @param {object} req - Authenticated request with requirementId and controlId params.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function deleteMapping(req, res, next) {
  try {
    const before = { requirementId: req.params.requirementId, controlId: req.params.controlId };
    await frameworkService.deleteMapping(req.params.requirementId, req.params.controlId);
    await auditService.recordFromRequest(req, {
      action: 'delete',
      entity: 'mapping',
      entityId: `${req.params.requirementId}:${req.params.controlId}`,
      before,
      after: null,
    });
    res.json({ message: 'Mapping deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, get, update, remove, createMapping, deleteMapping };
