/**
 * HTTP layer for requirement and mapping endpoints.
 *
 * Requirements and their control mappings are managed here. Wraps
 * frameworks.service and formats responses as { message, data }.
 */

const frameworkService = require('./frameworks.service');

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
    const requirement = await frameworkService.getFramework(req.params.id);
    res.json({ message: 'Requirement retrieved', data: { requirement } });
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
    const requirement = await frameworkService.updateRequirement(req.params.id, req.body);
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
    await frameworkService.deleteRequirement(req.params.id);
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
    await frameworkService.deleteMapping(req.params.requirementId, req.params.controlId);
    res.json({ message: 'Mapping deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, get, update, remove, createMapping, deleteMapping };
