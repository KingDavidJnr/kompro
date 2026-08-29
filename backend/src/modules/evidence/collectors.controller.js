/**
 * Evidence collector controllers.
 *
 * Admins configure and trigger automated evidence collectors. All handlers
 * require the `evidence:collect` permission and return { message, data }.
 */

const collectorService = require('./collector.service');

/**
 * Handles GET (list collectors).
 * @param {object} req - Authenticated request.
 * @param {object} res - Express response ({ message, data: { collectors } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const collectors = await collectorService.listCollectors();
    res.json({ message: 'Collectors retrieved', data: { collectors } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST (create a collector configuration).
 * @param {object} req - Authenticated request with collector fields in body.
 * @param {object} res - Express response ({ message, data: { collector } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function create(req, res, next) {
  try {
    const collector = await collectorService.createCollector(req.body);
    res.status(201).json({ message: 'Collector created', data: { collector } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /:id/run (trigger an immediate run).
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: result }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function runNow(req, res, next) {
  try {
    const result = await collectorService.runCollectorNow(req.params.id);
    res.json({ message: 'Collector run complete', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /:id/runs (collector run history from the audit log).
 * @param {object} req - Authenticated request with id param and page query.
 * @param {object} res - Express response ({ message, data: { runs, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function getRuns(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Math.min(Number(req.query.pageSize) || 25, 100);
    const result = await collectorService.getCollectorRuns(req.params.id, { page, pageSize });
    res.json({ message: 'Collector runs retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /:id (update a collector configuration).
 * @param {object} req - Authenticated request with updatable fields in body.
 * @param {object} res - Express response ({ message, data: { collector } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function update(req, res, next) {
  try {
    const collector = await collectorService.updateCollector(req.params.id, req.body);
    res.json({ message: 'Collector updated', data: { collector } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles DELETE /:id (remove a collector configuration).
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function remove(req, res, next) {
  try {
    await collectorService.deleteCollector(req.params.id);
    res.json({ message: 'Collector deleted', data: {} });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, runNow, getRuns };
