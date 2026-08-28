/**
 * Rate limiting middleware.
 *
 * Provides an email-keyed limiter so brute-force and abuse protection is tied
 * to the targeted account (the email in the request body) rather than the
 * source IP. This matters in corporate environments where many users share one
 * NAT IP address; limiting by IP would unfairly lock out the whole company
 * while letting an attacker cycle through accounts from a single address.
 */

const rateLimit = require('express-rate-limit');

/**
 * Builds a rate limiter keyed primarily by the request email, falling back to
 * the IP when no email is present (for example a malformed body).
 * @param {object} opts - { windowMs, max, message }.
 * @returns {function} Configured express-rate-limit middleware.
 */
function rateLimitByEmail({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = req.body && req.body.email;
      if (typeof email === 'string' && email.length) {
        return `email:${email.toLowerCase()}`;
      }
      return `ip:${req.ip}`;
    },
    handler: (req, res) =>
      res.status(429).json({ message: message || 'Too many requests, please try again later' }),
  });
}

module.exports = { rateLimitByEmail };
