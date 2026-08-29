/**
 * Generic HTTP/REST collector.
 *
 * This single connector covers the vast majority of integrations (GitHub,
 * GitLab, Okta/Entra, AWS, Azure, GCP, Jira, ServiceNow, Snyk, SonarQube,
 * KnowBe4, SecurityScorecard, Datadog, Cloudflare, Kubernetes, backup, and any
 * other REST API). Each integration is just a configuration - no per-vendor
 * code. Credentials come from the decrypted `secrets` object (stored encrypted
 * in the CollectorConfig row) and are interpolated into URLs, headers and the
 * OAuth2 exchange via `{{secret.KEY}}` / `{{param.KEY}}` placeholders.
 *
 * params:
 *   method        {string}  HTTP method (default GET).
 *   url           {string}  Request URL; supports {{secret.*}}/{{param.*}}.
 *   headers       {object}  Static headers; values support interpolation.
 *   body          {string|object} Request body (for POST/PUT).
 *   auth          {object}  See auth strategies below.
 *   itemsPath     {string}  Dot-path to the array in the response (optional).
 *   mapping       {object}  Dot-paths (or literal {{...}}) for title, description,
 *                          content, controlId, policyId, id.
 *   defaultTitle  {string}  Fallback title when the mapping yields nothing.
 *
 * auth strategies:
 *   { type: 'apiKey', header?, prefix?, value: '{{secret.token}}' }
 *   { type: 'bearer', value: '{{secret.token}}', prefix? }
 *   { type: 'oauth2', tokenUrl, clientId, clientSecret, scope? } -> adds Bearer
 *   { type: 'aws', service, region, accessKeyId, secretAccessKey } -> SigV4
 */

const crypto = require('crypto');

/**
 * Resolves a dot-notation path inside an object.
 * @param {object} obj - Source object.
 * @param {string} path - Dot-separated path (e.g. "data.items").
 * @returns {*} The value at the path, or undefined.
 */
function getPath(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/**
 * Replaces {{secret.KEY}} and {{param.KEY}} placeholders with stored values.
 * @param {string} template - String possibly containing placeholders.
 * @param {object} ctx - { secrets, params }.
 * @returns {string} Interpolated string.
 */
function interpolate(template, ctx) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(secret|param)\.([^}]+)\}\}/g, (match, kind, key) => {
    const store = kind === 'secret' ? ctx.secrets || {} : ctx.params || {};
    const value = getPath(store, key.trim());
    return value == null ? '' : String(value);
  });
}

/**
 * Resolves a single mapping field. Literal {{...}} templates are interpolated;
 * otherwise the value is read as a dot-path from the item.
 * @param {object} item - Source item object.
 * @param {*} spec - Mapping spec (string path or literal template).
 * @param {object} ctx - { secrets, params }.
 * @returns {*} Resolved value.
 */
function resolveField(item, spec, ctx) {
  if (spec == null) return undefined;
  if (typeof spec === 'string' && spec.startsWith('{{') && spec.endsWith('}}')) {
    return interpolate(spec, ctx);
  }
  if (typeof spec === 'string') {
    const value = getPath(item, spec);
    return value == null ? undefined : typeof value === 'string' ? value : String(value);
  }
  return spec;
}

/**
 * Exchanges client-credentials for an access token.
 * @param {function} doFetch - Fetch implementation.
 * @param {object} auth - OAuth2 auth config.
 * @param {object} ctx - { secrets, params }.
 * @returns {Promise<string>} Access token.
 */
async function fetchOAuth2(doFetch, auth, ctx) {
  const tokenUrl = interpolate(auth.tokenUrl, ctx);
  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  if (auth.clientId) body.set('client_id', interpolate(auth.clientId, ctx));
  if (auth.clientSecret) body.set('client_secret', interpolate(auth.clientSecret, ctx));
  if (auth.scope) body.set('scope', interpolate(auth.scope, ctx));
  const res = await doFetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OAuth2 token request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('OAuth2 token response missing access_token');
  }
  return data.access_token;
}

/**
 * Computes an AWS Signature Version 4 authorization header set.
 * @param {object} opts - { method, url, headers, body, service, region, accessKeyId, secretAccessKey }.
 * @returns {object} Headers to merge (Authorization, X-Amz-Date, X-Amz-Content-Sha256).
 */
function awsSigV4({ method, url, headers, body, service, region, accessKeyId, secretAccessKey }) {
  const u = new URL(url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 17); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update(body || '', 'utf8').digest('hex');

  const reqHeaders = { ...headers, host: u.host };
  reqHeaders['x-amz-date'] = amzDate;
  if (body) reqHeaders['x-amz-content-sha256'] = payloadHash;

  const sortedKeys = Object.keys(reqHeaders).sort();
  const canonicalHeaders = sortedKeys
    .map((k) => `${k.toLowerCase()}:${String(reqHeaders[k]).trim()}\n`)
    .join('');
  const signedHeaders = sortedKeys.map((k) => k.toLowerCase()).join(';');
  const canonicalRequest = [
    method,
    u.pathname + u.search,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
  ].join('\n');

  const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    'X-Amz-Date': amzDate,
    ...(body ? { 'X-Amz-Content-Sha256': payloadHash } : {}),
  };
}

/**
 * @param {object} ctx - { prisma, params, secrets, fetch? }.
 * @returns {Promise<Array>} Normalized evidence items.
 */
async function collect({ params, secrets, fetch: fetchImpl }) {
  const doFetch = fetchImpl || globalThis.fetch;
  if (!params || !params.url) {
    throw new Error('HTTP collector requires params.url');
  }
  const ctx = { secrets: secrets || {}, params: params || {} };
  const method = (params.method || 'GET').toUpperCase();
  const headers = {};
  for (const [key, value] of Object.entries(params.headers || {})) {
    headers[key] = interpolate(value, ctx);
  }

  let body = params.body
    ? typeof params.body === 'string'
      ? params.body
      : JSON.stringify(params.body)
    : undefined;

  const auth = params.auth || {};
  if (auth.type === 'apiKey' || auth.type === 'bearer') {
    const headerName = auth.header || 'Authorization';
    const prefix = auth.type === 'bearer' ? auth.prefix || 'Bearer ' : auth.prefix || '';
    headers[headerName] = prefix + interpolate(auth.value, ctx);
  } else if (auth.type === 'oauth2') {
    const token = await fetchOAuth2(doFetch, auth, ctx);
    headers['Authorization'] = `Bearer ${token}`;
  } else if (auth.type === 'aws') {
    const signed = awsSigV4({
      method,
      url: interpolate(params.url, ctx),
      headers,
      body,
      service: interpolate(auth.service, ctx),
      region: interpolate(auth.region, ctx),
      accessKeyId: interpolate(auth.accessKeyId, ctx),
      secretAccessKey: interpolate(auth.secretAccessKey, ctx),
    });
    Object.assign(headers, signed);
  }

  const url = interpolate(params.url, ctx);
  const res = await doFetch(url, { method, headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP collector request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json().catch(() => ({}));
  const items = params.itemsPath ? getPath(json, params.itemsPath) || [] : [json];

  const mapping = params.mapping || {};
  return (items || []).map((item) => ({
    title: resolveField(item, mapping.title, ctx) || params.defaultTitle || 'Collected evidence',
    description: resolveField(item, mapping.description, ctx) || null,
    content: resolveField(item, mapping.content, ctx) || null,
    controlId: resolveField(item, mapping.controlId, ctx) || undefined,
    policyId: resolveField(item, mapping.policyId, ctx) || undefined,
  }));
}

module.exports = { type: 'http', collect, awsSigV4 };
