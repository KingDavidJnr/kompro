/**
 * Jest setup (runs before the test suites).
 *
 * Protects real data by refusing to run unless NODE_ENV is "test", then wipes
 * all user/tenant data so each run starts from a known state. Roles,
 * permissions and the organization are seeded once via `npm run seed` and are
 * intentionally preserved.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function wipe() {
  // Delete children before parents to avoid foreign-key violations.
  await prisma.auditLog.deleteMany({});
  await prisma.assessmentEvidence.deleteMany({});
  await prisma.assessment.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.mapping.deleteMany({});
  await prisma.frameworkRequirement.deleteMany({});
  await prisma.framework.deleteMany({});
  await prisma.policy.deleteMany({});
  await prisma.control.deleteMany({});
  await prisma.passwordReset.deleteMany({});
  await prisma.invite.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
}

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Refusing to run tests without NODE_ENV=test (protects real data)');
  }

  // Roles/permissions must exist for RBAC-gated endpoints. Seed once if missing.
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) {
    throw new Error('Base roles not found. Run `npm run migrate && npm run seed` before tests.');
  }

  await wipe();
});

afterAll(async () => {
  await prisma.$disconnect();
});
