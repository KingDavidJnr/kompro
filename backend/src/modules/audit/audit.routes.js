/**
 * Audit log routes.
 *
 * All routes require authentication and the audit:read permission. Audit
 * entries are written by the other modules; this router only exposes reads.
 */

const router = require('express').Router();
const controller = require('./audit.controller');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

router.get('/', requireAuth, requirePermission('audit:read'), controller.list);
router.get('/:id', requireAuth, requirePermission('audit:read'), controller.get);

module.exports = router;
