const express = require('express');
const router = express.Router();
const controller = require('./dashboard.controller');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');

router.get('/summary', requireAuth, requirePermission('controls:read'), controller.summary);

module.exports = router;
