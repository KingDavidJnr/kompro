/**
 * HTTP layer for framework endpoints.
 *
 * Wraps frameworks.service and formats responses as { message, data }. Every
 * mutating action writes an audit entry recording the actor and before/after
 * state.
 */

const frameworkService = require('./frameworks.service');
const auditService = require('../audit/audit.service');

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
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'framework',
      entityId: framework.id,
      before: null,
      after: framework,
    });
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
    const before = await frameworkService.getFramework(req.params.id);
    const framework = await frameworkService.updateFramework(req.params.id, req.body);
    await auditService.recordFromRequest(req, {
      action: 'update',
      entity: 'framework',
      entityId: framework.id,
      before,
      after: framework,
    });
    res.json({ message: 'Framework updated', data: { framework } });
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
    const before = await frameworkService.getFramework(req.params.id);
    await frameworkService.deleteFramework(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'delete',
      entity: 'framework',
      entityId: req.params.id,
      before,
      after: null,
    });
    res.json({ message: 'Framework deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/frameworks/:id/readiness.
 *
 * Returns the compliance readiness for a framework: an overall percentage of
 * satisfied requirements, a status breakdown, and a list of gaps (requirements
 * that are not satisfied) together with their linked controls.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: readiness }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function readiness(req, res, next) {
  try {
    res.json({ message: 'Framework readiness computed', data: await frameworkService.computeReadiness(req.params.id) });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/frameworks/seed.
 *
 * Re-applies the bundled framework + requirement catalogs (ISO 27001, SOC 2,
 * GDPR, ...) so the operator can populate the system from the UI without
 * running the CLI seed. The actual upsert is delegated to the seed script.
 * @param {object} req - Authenticated request; uses req.user.id for audit.
 * @param {object} res - Express response ({ message, data: { frameworks } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function seed(req, res, next) {
  try {
    const frameworks = await frameworkService.seedCatalog(req.user.id);
    res.json({ message: 'Framework catalog seeded', data: { frameworks } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, get, status, update, remove, readiness, seed };
