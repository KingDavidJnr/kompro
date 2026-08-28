/**
 * Authentication routes.
 *
 * Exposes register, login, logout and current-user endpoints. Register and
 * login are public; logout and me require a valid session.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate');
const requireAuth = require('../../middleware/requireAuth');

// Public registration; the first registrant becomes admin.
router.post(
  '/register',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isString(),
  validate,
  controller.register
);

// Public login; issues an httpOnly session cookie.
router.post(
  '/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password required'),
  validate,
  controller.login
);

// Protected routes.
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
