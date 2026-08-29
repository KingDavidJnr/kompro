/**
 * OAuth 2.0 Authorization Code flow with PKCE for Google and Microsoft.
 *
 * This module knows nothing about sessions or cookies; it only builds the
 * provider authorize URL, exchanges the returned code for tokens, and decodes
 * the identity provider's id_token into the claims we need (email + stable
 * subject id). The auth controller wires the resolved profile into a normal
 * Kompro session so SSO and password users share one code path.
 *
 * No third-party OAuth library is used: Node 18+ ships a global fetch and we
 * decode the id_token with jsonwebtoken's unverified decode (the token arrives
 * directly from the provider over TLS during the code exchange, so it is
 * authentic for our purposes).
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../config');

/**
 * Encodes a Buffer/string as URL-safe base64 (RFC 7636).
 * @param {Buffer|string} input - Data to encode.
 * @returns {string} base64url string without padding.
 */
function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Resolves the static configuration for a provider, or throws when the
 * provider is unknown or missing its client credentials.
 * @param {string} provider - 'google' | 'microsoft'.
 * @returns {object} Provider configuration including endpoints and credentials.
 * @throws {Error} When the provider is unsupported or not configured.
 */
function getProviderConfig(provider) {
  if (provider === 'google') {
    const cfg = config.sso.google;
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new Error('Google SSO is not configured');
    }
    return {
      name: 'google',
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      scope: cfg.scope,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
    };
  }

  if (provider === 'microsoft') {
    const cfg = config.sso.microsoft;
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new Error('Microsoft SSO is not configured');
    }
    const tenant = cfg.tenant || 'common';
    return {
      name: 'microsoft',
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      scope: cfg.scope,
      authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    };
  }

  throw new Error(`Unsupported SSO provider: ${provider}`);
}

/**
 * Generates a PKCE code verifier/challenge pair and a CSRF state value.
 * @returns {object} { state, verifier, challenge }.
 */
function generatePkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = crypto.randomBytes(16).toString('hex');
  return { state, verifier, challenge };
}

/**
 * Builds the absolute callback URI the provider will redirect back to.
 *
 * Defaults to the host the browser used for the initial request so the entire
 * handshake (including the session cookie set by the callback) stays on the
 * same origin. An explicit SSO_REDIRECT_BASE override takes precedence.
 * @param {object} req - Express request (used for protocol/host).
 * @param {string} provider - 'google' | 'microsoft'.
 * @returns {string} Absolute callback URL.
 */
function buildRedirectUri(req, provider) {
  const path = `/api/auth/${provider}/callback`;
  if (config.sso.redirectBase) {
    return `${config.sso.redirectBase.replace(/\/$/, '')}${path}`;
  }
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : req.protocol;
  return `${proto}://${req.get('host')}${path}`;
}

/**
 * Builds the provider authorization URL and the PKCE/state bundle to persist
 * in a short-lived cookie for the callback to verify.
 * @param {object} req - Express request.
 * @param {string} provider - 'google' | 'microsoft'.
 * @returns {object} { url, state, verifier } where url is the redirect target.
 */
function buildAuthorizeUrl(req, provider) {
  const cfg = getProviderConfig(provider);
  const { state, verifier, challenge } = generatePkce();
  const redirectUri = buildRedirectUri(req, provider);

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: cfg.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return { url: `${cfg.authorizeUrl}?${params.toString()}`, state, verifier };
}

/**
 * Exchanges an authorization code for tokens at the provider's token endpoint.
 * @param {string} provider - 'google' | 'microsoft'.
 * @param {object} params - { code, verifier, redirectUri }.
 * @returns {Promise<object>} { idToken, accessToken } from the provider.
 */
async function exchangeCode(provider, { code, verifier, redirectUri }) {
  const cfg = getProviderConfig(provider);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code_verifier: verifier,
  });

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`SSO token exchange failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  if (!data.id_token) {
    throw new Error('SSO provider did not return an id_token');
  }

  return { idToken: data.id_token, accessToken: data.access_token };
}

/**
 * Decodes the provider id_token (no signature verification) into the profile
 * claims Kompro needs.
 * @param {string} provider - 'google' | 'microsoft'.
 * @param {string} idToken - Raw id_token JWT from the provider.
 * @returns {object} { email, name, providerId } where providerId is the
 *   stable subject identifier (sub).
 */
function decodeProfile(provider, idToken) {
  const claims = jwt.decode(idToken);
  if (!claims || !claims.sub) {
    throw new Error('Could not decode identity from SSO provider');
  }

  // Microsoft Entra accounts may surface the email as preferred_username/upn
  // rather than the "email" claim; Google always includes "email".
  const email =
    claims.email || claims.unique_name || claims.preferred_username || claims.upn;
  const name = claims.name || email;

  return { email, name, providerId: claims.sub };
}

module.exports = {
  getProviderConfig,
  buildAuthorizeUrl,
  exchangeCode,
  decodeProfile,
  buildRedirectUri,
};
