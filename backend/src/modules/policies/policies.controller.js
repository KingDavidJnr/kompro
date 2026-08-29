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
      search: req.query.search,
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

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  listVersions,
  createVersion,
  listChangeRequests,
  createChangeRequest,
  updateChangeRequest,
  listReviews,
  createReview,
  updateReview,
  listExceptions,
  createException,
  updateException,
};

/**
 * Lists version snapshots for a policy.
 */
async function listVersions(req, res, next) {
  try {
    const versions = await policyService.listVersions(req.params.id);
    res.json({ message: 'Policy versions retrieved', data: { versions } });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new version snapshot of a policy.
 */
async function createVersion(req, res, next) {
  try {
    const version = await policyService.createVersion(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'policyVersion', entityId: version.id, after: version });
    res.status(201).json({ message: 'Policy version created', data: { version } });
  } catch (err) {
    next(err);
  }
}

/**
 * Lists change requests for a policy.
 */
async function listChangeRequests(req, res, next) {
  try {
    const changeRequests = await policyService.listChangeRequests(req.params.id);
    res.json({ message: 'Change requests retrieved', data: { changeRequests } });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a change request against a policy.
 */
async function createChangeRequest(req, res, next) {
  try {
    const changeRequest = await policyService.createChangeRequest(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'policyChangeRequest', entityId: changeRequest.id, after: changeRequest });
    res.status(201).json({ message: 'Change request created', data: { changeRequest } });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates a change request.
 */
async function updateChangeRequest(req, res, next) {
  try {
    const changeRequest = await policyService.updateChangeRequest(req.params.crid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'policyChangeRequest', entityId: changeRequest.id, after: changeRequest });
    res.json({ message: 'Change request updated', data: { changeRequest } });
  } catch (err) {
    next(err);
  }
}

/**
 * Lists reviews for a policy.
 */
async function listReviews(req, res, next) {
  try {
    const reviews = await policyService.listReviews(req.params.id);
    res.json({ message: 'Policy reviews retrieved', data: { reviews } });
  } catch (err) {
    next(err);
  }
}

/**
 * Schedules a review for a policy.
 */
async function createReview(req, res, next) {
  try {
    const review = await policyService.createReview(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'policyReview', entityId: review.id, after: review });
    res.status(201).json({ message: 'Policy review created', data: { review } });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates a review.
 */
async function updateReview(req, res, next) {
  try {
    const review = await policyService.updateReview(req.params.rid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'policyReview', entityId: review.id, after: review });
    res.json({ message: 'Policy review updated', data: { review } });
  } catch (err) {
    next(err);
  }
}

/**
 * Lists exceptions for a policy.
 */
async function listExceptions(req, res, next) {
  try {
    const exceptions = await policyService.listExceptions(req.params.id);
    res.json({ message: 'Policy exceptions retrieved', data: { exceptions } });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates an exception against a policy.
 */
async function createException(req, res, next) {
  try {
    const exception = await policyService.createException(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'policyException', entityId: exception.id, after: exception });
    res.status(201).json({ message: 'Policy exception created', data: { exception } });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates an exception.
 */
async function updateException(req, res, next) {
  try {
    const exception = await policyService.updateException(req.params.eid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'policyException', entityId: exception.id, after: exception });
    res.json({ message: 'Policy exception updated', data: { exception } });
  } catch (err) {
    next(err);
  }
}
