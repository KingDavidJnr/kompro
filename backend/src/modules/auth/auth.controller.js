/**
 * HTTP layer for authentication endpoints.
 *
 * Wraps auth.service and formats responses as { message, data }. The session
 * JWT is delivered in an httpOnly cookie; it is not returned in the body.
 */

const authService = require('./auth.service');
const oauthService = require('./oauth.service');
const config = require('../../config');
const auditService = require('../audit/audit.service');

/**
 * Builds the cookie options for the session token.
 * @returns {object} Options for res.cookie (httpOnly, secure, sameSite, maxAge).
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: config.sessionTtlMs,
  };
}

/**
 * The app base URL with no trailing slash, used to redirect after SSO.
 * @returns {string} App base URL.
 */
function appBase() {
  return config.appUrl.replace(/\/$/, '');
}

/**
 * Handles POST /api/auth/register.
 * @param {object} req - Express request with { email, password, name }.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    await auditService.recordFromRequest(req, {
      action: 'create',
      entity: 'user',
      entityId: user.id,
      before: null,
      after: user,
    });
    res.status(201).json({ message: 'User registered successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/login.
 * @param {object} req - Express request with { email, password }.
 * @param {object} res - Express response; sets token cookie, returns { message, data: { user } }.
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function login(req, res, next) {
  try {
    const { token, user } = await authService.login({ ...req.body, ip: req.ip });
    res.cookie('token', token, cookieOptions());
    res.json({ message: 'Login successful', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/logout.
 * @param {object} req - Authenticated request (req.user, req.session).
 * @param {object} res - Express response ({ message, data: {} }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id, req.session.id);
    res.clearCookie('token');
    res.json({ message: 'Logout successful', data: {} });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/auth/me.
 * @param {object} req - Authenticated request (req.user).
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function me(req, res, next) {
  try {
    res.json({ message: 'Current user retrieved', data: { user: authService.me(req.user) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/accept-invite.
 * @param {object} req - Public request with { token, password }.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function acceptInvite(req, res, next) {
  try {
    const user = await authService.acceptInvite(req.body);
    res.json({ message: 'Invitation accepted. You can now log in.', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/forgot-password.
 * @param {object} req - Public request with { email }.
 * @param {object} res - Express response; when SMTP is off and the account
 *   exists, includes resetUrl in data so it can be used manually.
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(req.body);
    // Always return a generic message to avoid account enumeration, whether the
    // link was emailed or (when SMTP is absent) written to the server log. The
    // reset token is never returned to the caller.
    res.json({ message: 'If that account exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/auth/reset-password.
 * @param {object} req - Public request with { token, password }.
 * @param {object} res - Express response ({ message, data: { user } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function resetPassword(req, res, next) {
  try {
    const user = await authService.resetPassword(req.body);
    await auditService.recordFromRequest(req, {
      action: 'reset',
      entity: 'user',
      entityId: user.id,
      before: null,
      after: user,
    });
    res.json({ message: 'Password has been reset. You can now log in.', data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * Initiates an OAuth 2.0 Authorization Code + PKCE handshake for a provider.
 *
 * Builds the provider authorize URL, stores the PKCE verifier and CSRF state
 * in a short-lived httpOnly cookie, then 302-redirects the browser to the
 * provider. On any configuration error the user is sent back to the app with a
 * descriptive query parameter rather than being left on a dead page.
 * @param {string} provider - 'google' | 'microsoft'.
 * @returns {function} Express handler.
 */
function ssoRedirect(provider) {
  return (req, res) => {
    try {
      oauthService.getProviderConfig(provider); // throws if not configured
      const { url, state, verifier } = oauthService.buildAuthorizeUrl(req, provider);
      res.cookie(`oauth_${provider}`, JSON.stringify({ state, verifier }), {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
      res.redirect(url);
    } catch (err) {
      const msg = encodeURIComponent(err.message || 'SSO is unavailable');
      res.redirect(`${appBase()}/?auth_error=${msg}`);
    }
  };
}

/**
 * Completes the OAuth handshake: verifies state, exchanges the code, decodes
 * the identity, then logs the user in (creating a normal session cookie) and
 * redirects to the application. Any failure redirects back with an error.
 * @param {string} provider - 'google' | 'microsoft'.
 * @returns {function} Express handler.
 */
function ssoCallback(provider) {
  return async (req, res) => {
    const fail = (message) => res.redirect(`${appBase()}/?auth_error=${encodeURIComponent(message)}`);
    try {
      const { code, state } = req.query;
      const cookieName = `oauth_${provider}`;
      const cookieVal = req.cookies ? req.cookies[cookieName] : undefined;
      res.clearCookie(cookieName);

      if (!code || !state || !cookieVal) {
        return fail('SSO callback is missing required parameters');
      }

      let saved;
      try {
        saved = JSON.parse(cookieVal);
      } catch {
        return fail('Invalid SSO state cookie');
      }
      if (saved.state !== state) {
        return fail('SSO state mismatch — possible CSRF attempt');
      }

      const redirectUri = oauthService.buildRedirectUri(req, provider);
      const { idToken } = await oauthService.exchangeCode(provider, {
        code,
        verifier: saved.verifier,
        redirectUri,
      });
      const profile = oauthService.decodeProfile(provider, idToken);

      const { token, user } = await authService.ssoLogin({
        email: profile.email,
        name: profile.name,
        provider,
        providerId: profile.providerId,
        ip: req.ip,
      });

      res.cookie('token', token, cookieOptions());
      res.redirect(`${appBase()}/`);
    } catch (err) {
      fail(err.message || 'SSO sign-in failed');
    }
  };
}

module.exports = { register, login, logout, me, acceptInvite, forgotPassword, resetPassword, ssoRedirect, ssoCallback };
