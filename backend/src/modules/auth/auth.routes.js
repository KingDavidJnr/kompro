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
const { rateLimitByEmail } = require('../../middleware/rateLimit');

// Limit login attempts per account email, not per IP (shared corporate NAT).
const loginLimit = rateLimitByEmail({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts for this account, please try again later',
});

// Limit reset requests per email to avoid abuse/enumerate loops.
const forgotLimit = rateLimitByEmail({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many reset requests for this account, please try again later',
});

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
  loginLimit,
  body('email').isEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password required'),
  validate,
  controller.login
);

// Public invitation acceptance; sets the password and activates the account.
router.post(
  '/accept-invite',
  body('token').isString().notEmpty().withMessage('Token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  controller.acceptInvite
);

// Public password reset flow.
router.post(
  '/forgot-password',
  forgotLimit,
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  controller.forgotPassword
);

router.post(
  '/reset-password',
  body('token').isString().notEmpty().withMessage('Token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  controller.resetPassword
);

// Protected routes.
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
