/**
 * HTTP layer for assessment endpoints.
 *
 * Wraps assessments.service and formats responses as { message, data }.
 * The authenticated user is recorded as the assessor by default.
 */

const assessmentService = require('./assessments.service');

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
    // Record the acting user as the assessor unless one was supplied.
    const assessorId = req.body.assessorId || req.user.id;
    const assessment = await assessmentService.createAssessment({ ...req.body, assessorId });
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
    const assessment = await assessmentService.updateAssessment(req.params.id, req.body);
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
    await assessmentService.deleteAssessment(req.params.id);
    res.json({ message: 'Assessment deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
