/**
 * HTTP layer for assessment endpoints.
 *
 * Wraps assessments.service and formats responses as { message, data }. The
 * authenticated user is recorded as the assessor by default. Every mutating
 * action writes an audit entry recording the actor and before/after state.
 */

const assessmentService = require('./assessments.service');
const auditService = require('../audit/audit.service');

/**
 * Handles GET /api/assessments.
 * @param {object} req - Authenticated request; reads page/pageSize/controlId/result.
 * @param {object} res - Express response ({ message, data: { assessments, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await assessmentService.listAssessments({
      page: req.query.page,
      pageSize: req.query.pageSize,
      controlId: req.query.controlId,
      result: req.query.result,
    });
    res.json({ message: 'Assessments retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/assessments/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { assessment } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    const assessment = await assessmentService.getAssessment(req.params.id);
    res.json({ message: 'Assessment retrieved', data: { assessment } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/assessments.
 * @param {object} req - Authenticated request with assessment fields.
 * @param {object} res - Express response ({ message, data: { assessment } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const assessorId = req.body.assessorId || req.user.id;
    const assessment = await assessmentService.createAssessment({ ...req.body, assessorId });
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'assessment',
      entityId: assessment.id,
      before: null,
      after: assessment,
    });
    res.status(201).json({ message: 'Assessment created', data: { assessment } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/assessments/:id.
 * @param {object} req - Authenticated request with id param and updatable fields.
 * @param {object} res - Express response ({ message, data: { assessment } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const before = await assessmentService.getAssessment(req.params.id);
    const assessment = await assessmentService.updateAssessment(req.params.id, req.body);
    await auditService.recordFromRequest(req, {
      action: 'update',
      entity: 'assessment',
      entityId: assessment.id,
      before,
      after: assessment,
    });
    res.json({ message: 'Assessment updated', data: { assessment } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /api/assessments/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    const before = await assessmentService.getAssessment(req.params.id);
    await assessmentService.deleteAssessment(req.params.id);
    await auditService.recordFromRequest(req, {
      action: 'delete',
      entity: 'assessment',
      entityId: req.params.id,
      before,
      after: null,
    });
    res.json({ message: 'Assessment deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
