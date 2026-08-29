const express = require('express');
const router = express.Router();
const controller = require('./dashboard.controller');

router.get('/summary', controller.summary);

module.exports = router;
