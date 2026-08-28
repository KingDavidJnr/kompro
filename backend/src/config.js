/**
 * Application configuration loaded from environment variables.
 *
 * This module reads process.env (populated by dotenv from backend/.env)
 * and exposes a single configuration object used across the backend.
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Session lifetime in days, used to derive the millisecond value below.
const sessionTtlDays = Number(process.env.SESSION_TTL_DAYS || 30);

module.exports = {
  // Port the Express server listens on.
  port: Number(process.env.BACKEND_PORT || 5000),

  // Runtime mode, affects cookie security and logging behaviour.
  nodeEnv: process.env.NODE_ENV || 'development',

  // Secret used to sign session JWTs (HS256). Must be set in production.
  jwtSecret: process.env.JWT_SECRET,

  // JWT expiry passed to jsonwebtoken (for example "2h").
  jwtTtl: process.env.JWT_TTL || '2h',

  // Session lifetime in days.
  sessionTtlDays,

  // Session lifetime expressed in milliseconds for the cookie maxAge.
  sessionTtlMs: sessionTtlDays * 24 * 60 * 60 * 1000,

  // PostgreSQL connection string from DATABASE_URL.
  databaseUrl: process.env.DATABASE_URL,

  // Allowed CORS origins for credentialed browser requests.
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Optional bootstrap admin credentials consumed by the seed script.
  initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL,
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD,

  // Default organization name used when seeding the single-tenant org.
  orgName: process.env.ORG_NAME || 'My Organization',

  // Public base URL used to build invitation links.
  appUrl: process.env.APP_URL || 'http://localhost:5173',

  // How long an invitation link stays valid, in hours.
  inviteTtlHours: Number(process.env.INVITE_TTL_HOURS || 72),

  // SMTP configuration for sending invitation emails.
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === 'true',
    from: process.env.MAIL_FROM || 'no-reply@kompro.local',
  },

  // Where uploaded evidence files are stored on local disk when S3 is not used.
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),

  // Maximum accepted upload size in bytes (derived from megabytes).
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024,

  // Maximum JSON request body size (derived from megabytes).
  bodyLimitBytes: Number(process.env.BODY_LIMIT_MB || 1) * 1024 * 1024,

  // How many days audit entries are retained before purge (audit:purge).
  auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS || 365),

  // S3-compatible storage. When bucket and region are set, evidence files are
  // stored in S3; otherwise the local uploadDir is used. All keys are optional.
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    endpoint: process.env.S3_ENDPOINT,
  },
};
