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

const authRoutes = require('./modules/auth/auth.routes');
const orgRoutes = require('./modules/organization/org.routes');
const usersRoutes = require('./modules/users/users.routes');
const rolesRoutes = require('./modules/roles/roles.routes');

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

app.use(express.json());
app.use(cookieParser());

// Simple liveness checks.
app.get('/health', (req, res) => res.json({ message: 'ok', data: { status: 'ok' } }));
app.get('/api/health', (req, res) => res.json({ message: 'ok', data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);

// Unknown routes return a 404 with a useful message.
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Kompro backend listening on port ${config.port}`);
});
