/**
 * Express validation middleware built on express-validator results.
 *
 * Throws a ValidationError when any prior validation chains reported a
 * failure, letting the central error handler return a 400 response.
 */

const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Checks accumulated validation errors and forwards a 400 on failure.
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {function} next - Express next callback.
 * @returns {void}
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    // Surface the first validation message to the client.
    throw new ValidationError(result.array()[0].msg);
  }
  next();
}

module.exports = validate;
