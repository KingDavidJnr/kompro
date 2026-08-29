/**
 * Symmetric encryption helpers for secrets stored in the database.
 *
 * Self-hosted deployments manage connector credentials themselves, so secrets
 * (API keys, tokens) are persisted encrypted in the `CollectorConfig.secrets`
 * column rather than in environment variables or external secret stores. The
 * key is derived from the existing JWT secret, so no additional environment
 * configuration is required.
 */

const crypto = require('crypto');
const config = require('../config');

function deriveKey() {
  // Derive a 32-byte key from the application's JWT secret using a distinct
  // salt/label so it is not the literal signing key.
  return crypto.scryptSync(config.jwtSecret || 'insecure-dev-secret', 'kompro-collector-secret-v1', 32);
}

/**
 * Encrypts an arbitrary JSON-serializable value for at-rest storage.
 * @param {*} value - Value to encrypt (typically an object of secrets).
 * @returns {string} Encrypted payload safe to store as text.
 */
function encryptJSON(value) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

/**
 * Decrypts a payload produced by encryptJSON.
 * @param {string} payload - Encrypted payload.
 * @returns {*} The original value.
 */
function decryptJSON(payload) {
  if (!payload) return {};
  const key = deriveKey();
  const [ivB64, tagB64, dataB64] = payload.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = { encryptJSON, decryptJSON };
