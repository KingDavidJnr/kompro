/**
 * Application configuration loaded from environment variables.
 *
 * This module reads process.env (populated by dotenv from backend/.env)
 * and exposes a single configuration object used across the backend.
 */

const dotenv = require('dotenv');

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
};
