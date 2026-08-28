/**
 * Pluggable file storage for evidence attachments.
 *
 * Two drivers are supported and selected automatically:
 *   - S3: when S3_BUCKET and S3_REGION are configured, files go to an
 *     S3-compatible bucket (AWS S3 or a compatible endpoint like MinIO).
 *   - local: otherwise files are written to the configured uploadDir on the
 *     application server's disk.
 *
 * Every stored object is referenced by a key prefixed with its driver
 * ("s3:" or "local:") so the correct driver can be resolved on read/delete
 * without an extra database column. The caller stores the key in
 * evidence.filePath.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const S3_PREFIX = 's3:';
const LOCAL_PREFIX = 'local:';

/**
 * Strips unsafe characters from an uploaded filename.
 * @param {string} name - Original filename.
 * @returns {string} A safe basename no longer than 100 characters.
 */
function sanitizeName(name) {
  const base = path.basename(name || 'file');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(0, 100) || 'file';
}

/**
 * Resolves which driver is active.
 * @returns {string} "s3" when S3 is fully configured, otherwise "local".
 */
function activeDriver() {
  const s = config.s3;
  if (s && s.bucket && s.region) return 's3';
  return 'local';
}

/**
 * Writes a buffer to the local upload directory.
 * @param {object} file - { buffer, filename, contentType }.
 * @returns {Promise<string>} Storage key prefixed with "local:".
 */
async function localUpload({ buffer, filename }) {
  await fsp.mkdir(config.uploadDir, { recursive: true });
  const key = `${crypto.randomUUID()}-${sanitizeName(filename)}`;
  await fsp.writeFile(path.join(config.uploadDir, key), buffer);
  return LOCAL_PREFIX + key;
}

// Lazily created S3 client so the dependency is only loaded when needed.
let s3Client;

/**
 * Returns a cached S3 client, creating it on first use.
 * @returns {object} An @aws-sdk/client-s3 S3Client.
 */
function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = require('@aws-sdk/client-s3');
  const s = config.s3;
  s3Client = new S3Client({
    region: s.region,
    endpoint: s.endpoint || undefined,
    // Path-style addressing is required for most S3-compatible endpoints.
    forcePathStyle: s.endpoint ? true : undefined,
    credentials: s.accessKeyId
      ? { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey }
      : undefined,
  });
  return s3Client;
}

/**
 * Uploads a buffer to the configured S3 bucket.
 * @param {object} file - { buffer, filename, contentType }.
 * @returns {Promise<string>} Storage key prefixed with "s3:".
 */
async function s3Upload({ buffer, filename, contentType }) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = `evidence/${crypto.randomUUID()}-${sanitizeName(filename)}`;
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return S3_PREFIX + key;
}

/**
 * Stores a file using the active driver.
 * @param {object} file - { buffer, filename, contentType }.
 * @returns {Promise<string>} Storage key with its driver prefix.
 */
async function upload(file) {
  if (activeDriver() === 's3') return s3Upload(file);
  return localUpload(file);
}

/**
 * Resolves a stored file to a readable stream and content type.
 * @param {string} key - Storage key (with driver prefix).
 * @param {string} [fallbackContentType] - MIME type to use if unknown.
 * @returns {Promise<{ stream: Readable, contentType: string }>}
 * @throws {Error} When a local path escapes the upload directory.
 */
async function getFile(key, fallbackContentType) {
  if (key.startsWith(S3_PREFIX)) {
    return getS3File(key.slice(S3_PREFIX.length), fallbackContentType);
  }
  return getLocalFile(key.slice(LOCAL_PREFIX.length), fallbackContentType);
}

/**
 * Streams a local file, guarding against path traversal.
 * @param {string} rel - Relative key without the driver prefix.
 * @param {string} [fallbackContentType] - MIME type to use.
 * @returns {Promise<{ stream: Readable, contentType: string }>}
 */
async function getLocalFile(rel, fallbackContentType) {
  const full = path.join(config.uploadDir, rel);
  if (path.relative(config.uploadDir, full).startsWith('..')) {
    throw new Error('Invalid file path');
  }
  const stream = fs.createReadStream(full);
  return { stream, contentType: fallbackContentType || 'application/octet-stream' };
}

/**
 * Streams an S3 object.
 * @param {string} key - S3 object key without the driver prefix.
 * @param {string} [fallbackContentType] - MIME type to use if S3 omits one.
 * @returns {Promise<{ stream: Readable, contentType: string }>}
 */
async function getS3File(key, fallbackContentType) {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const res = await getS3Client().send(
    new GetObjectCommand({ Bucket: config.s3.bucket, Key: key })
  );
  const contentType = res.ContentType || fallbackContentType || 'application/octet-stream';
  return { stream: res.Body, contentType };
}

/**
 * Deletes a stored file using the driver encoded in its key.
 * @param {string} key - Storage key (with driver prefix).
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  if (key.startsWith(S3_PREFIX)) return deleteS3File(key.slice(S3_PREFIX.length));
  return deleteLocalFile(key.slice(LOCAL_PREFIX.length));
}

/**
 * Removes a local file, tolerating a missing file.
 * @param {string} rel - Relative key without the driver prefix.
 * @returns {Promise<void>}
 */
async function deleteLocalFile(rel) {
  const full = path.join(config.uploadDir, rel);
  if (path.relative(config.uploadDir, full).startsWith('..')) return;
  await fsp.rm(full, { force: true });
}

/**
 * Removes an S3 object.
 * @param {string} key - S3 object key without the driver prefix.
 * @returns {Promise<void>}
 */
async function deleteS3File(key) {
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key })
  );
}

module.exports = { upload, getFile, deleteFile, activeDriver };
