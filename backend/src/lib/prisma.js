/**
 * Shared Prisma client singleton.
 *
 * A single PrismaClient instance is created and reused across the backend
 * to avoid exhausting database connections. Import this module wherever
 * database access is required.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
