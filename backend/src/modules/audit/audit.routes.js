/**
 * Audit log routes.
 *
 * All routes require authentication. Reads use audit:read and purging uses
 * audit:purge. Audit entries are written by the other modules; this router
 * exposes reads and an audited purge.
 */

const router = require('express').Router();
const controller = require('./audit.controller');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

router.get('/', requireAuth, requirePermission('audit:read'), controller.list);
router.get('/export', requireAuth, requirePermission('audit:read'), controller.exportAudit);
router.get('/:id', requireAuth, requirePermission('audit:read'), controller.get);

// Purge entries older than N days (audit:purge). The action is itself audited.
router.post('/purge', requireAuth, requirePermission('audit:purge'), controller.purge);

module.exports = router;
