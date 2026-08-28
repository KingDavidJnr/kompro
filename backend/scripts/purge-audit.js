/**
 * Purges audit entries older than the configured retention window.
 *
 * Reads AUDIT_RETENTION_DAYS from the environment (or an optional numeric
 * argument) and deletes audit rows created before the cutoff. Intended to be
 * run on a schedule (cron) to keep the append-only audit table bounded.
 *
 * Usage: npm run audit:purge [days]
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Entry point.
 * @returns {Promise<void>}
 */
async function main() {
  const days = Number(process.argv[2] || process.env.AUDIT_RETENTION_DAYS || 365);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('Retention days must be a positive number');
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  console.log(`Purged ${count} audit entries older than ${days} days.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
