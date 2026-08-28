/**
 * Authentication middleware enforcing signed session JWTs with DB revocation.
 *
 * The request must carry a valid JWT (cookie or Authorization header). The
 * token is verified by signature, then the referenced database session is
 * loaded to confirm it is still active. This gives instant revocation:
 * disabling a user or revoking a session fails the next request even if the
 * token has not expired.
 */

const { verifyToken } = require('../lib/jwt');
const prisma = require('../lib/prisma');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Authenticates the incoming request and attaches user and session.
 * @param {object} req - Express request; receives req.user and req.session.
 * @param {object} res - Express response.
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function requireAuth(req, res, next) {
  try {
    // Read the token from the httpOnly cookie, falling back to bearer header.
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError();
    }

    const payload = verifyToken(token);

    // Load the persisted session and its owning user.
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    // Revoked or expired sessions must not grant access.
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired or revoked');
    }

    const user = session.user;

    // Inactive users lose access immediately.
    if (!user || !user.active) {
      throw new UnauthorizedError('User is inactive');
    }

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
