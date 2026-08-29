/**
 * Kompro backend entry point.
 *
 * Configures the Express application with security middleware, JSON body
 * parsing, cookie parsing, health checks, modular routes and the central
 * error handler. Listens on the configured port.
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const prisma = require('./lib/prisma');

const authRoutes = require('./modules/auth/auth.routes');
const orgRoutes = require('./modules/organization/org.routes');
const usersRoutes = require('./modules/users/users.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const controlsRoutes = require('./modules/controls/controls.routes');
const policiesRoutes = require('./modules/policies/policies.routes');
const evidenceRoutes = require('./modules/evidence/evidence.routes');
const assessmentsRoutes = require('./modules/assessments/assessments.routes');
const frameworksRoutes = require('./modules/frameworks/frameworks.routes');
const requirementsRoutes = require('./modules/frameworks/requirements.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const riskRoutes = require('./modules/risk/risk.routes');
const incidentsRoutes = require('./modules/incidents/incidents.routes');
const itsmRoutes = require('./modules/itsm/itsm.routes');
const auditProgramRoutes = require('./modules/audit-program/audit-program.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const collectorRunner = require('./modules/evidence/collector.runner');

const app = express();

// Security headers on every response.
app.use(helmet());

// Allow the configured frontend origins to call the API with credentials.
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: config.bodyLimitBytes }));
app.use(cookieParser());

// Simple liveness checks.
app.get('/health', (req, res) => res.json({ message: 'ok', data: { status: 'ok' } }));
app.get('/api/health', (req, res) => res.json({ message: 'ok', data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/controls', controlsRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/frameworks', frameworksRoutes);
app.use('/api/requirements', requirementsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/itsm', itsmRoutes);
app.use('/api/audit-program', auditProgramRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Unknown routes return a 404 with a useful message.
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

app.use(errorHandler);

// Export the app so tests can drive it with Supertest without binding a port.
// The server only listens when this file is run directly (not when required).
module.exports = app;

/**
 * Starts the server after verifying database connectivity.
 *
 * Runs a trivial query to confirm Prisma can reach PostgreSQL, logs the result,
 * then binds the HTTP port. The server still starts on connection failure so
 * the health endpoint remains reachable, but the error is surfaced loudly.
 * @returns {Promise<void>}
 */
async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected');
  } catch (err) {
    console.error(`Database connection failed: ${err.message}`);
  }

  app.listen(config.port, () => {
    console.log(`Kompro backend listening on port ${config.port}`);
  });

  // Recurring automated-evidence sweeps run only in real deployments, never in
  // the test environment (which drives the app without calling start()).
  if (config.nodeEnv !== 'test') {
    collectorRunner.startCollectorRunner();
  }
}

if (require.main === module) {
  start();
}
