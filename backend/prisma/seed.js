/**
 * Database seed script for Kompro.
 *
 * Idempotently creates the core permission set, the default roles
 * (admin, auditor, member), the single organization row, and an optional
 * bootstrap admin user from environment variables. Run with `npm run seed`.
 */

const bcrypt = require('bcrypt');
const prisma = require('../src/lib/prisma');
const config = require('../src/config');

// Canonical permission list. Add new permissions here as features grow.
const PERMISSIONS = [
  { name: 'org:read', description: 'View organization settings' },
  { name: 'org:update', description: 'Update organization settings' },
  { name: 'users:read', description: 'List and view users' },
  { name: 'users:create', description: 'Create users' },
  { name: 'users:update', description: 'Update users' },
  { name: 'users:delete', description: 'Delete users' },
  { name: 'roles:read', description: 'View roles and permissions' },
  { name: 'roles:create', description: 'Create roles' },
  { name: 'roles:update', description: 'Update roles' },
  { name: 'roles:delete', description: 'Delete roles' },
  { name: 'audit:read', description: 'View audit log' },
  { name: 'controls:read', description: 'View controls' },
  { name: 'controls:create', description: 'Create controls' },
  { name: 'controls:update', description: 'Update controls' },
  { name: 'controls:delete', description: 'Delete controls' },
  { name: 'policies:read', description: 'View policies' },
  { name: 'policies:create', description: 'Create policies' },
  { name: 'policies:update', description: 'Update policies' },
  { name: 'policies:delete', description: 'Delete policies' },
];

// Default roles and the permissions each one grants.
const ROLES = [
  { name: 'admin', description: 'Full access', permissions: PERMISSIONS.map((p) => p.name) },
  {
    name: 'auditor',
    description: 'Read-only compliance and audit access',
    permissions: ['org:read', 'users:read', 'roles:read', 'audit:read'],
  },
  { name: 'member', description: 'Basic member access', permissions: ['org:read'] },
];

/**
 * Seeds permissions, roles, the organization and an optional admin user.
 * @returns {void}
 */
async function main() {
  // Upsert each permission so re-running the seed is safe.
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`);

  // Build a name to id map for connecting roles to permissions.
  const allPermissions = await prisma.permission.findMany();
  const byName = new Map(allPermissions.map((p) => [p.name, p.id]));

  for (const role of ROLES) {
    const permissionIds = role.permissions.map((name) => byName.get(name)).filter(Boolean);
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
        permissions: { connect: permissionIds.map((id) => ({ id })) },
      },
    });
  }
  console.log(`Seeded ${ROLES.length} roles`);

  // Ensure exactly one organization exists for this single-tenant deployment.
  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    await prisma.organization.create({ data: { name: config.orgName } });
    console.log('Seeded organization');
  }

  // Bootstrap an admin when credentials are provided and none exists yet.
  if (config.initialAdminEmail && config.initialAdminPassword) {
    const existing = await prisma.user.findUnique({
      where: { email: config.initialAdminEmail },
    });
    if (!existing) {
      const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
      const passwordHash = await bcrypt.hash(config.initialAdminPassword, 10);
      await prisma.user.create({
        data: {
          email: config.initialAdminEmail,
          passwordHash,
          roleId: adminRole.id,
          active: true,
        },
      });
      console.log(`Seeded initial admin: ${config.initialAdminEmail}`);
    }
  } else {
    // Otherwise guide the operator if the system has no users at all.
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log(
        'No users exist. Register the first user via /api/auth/register to obtain the admin role.'
      );
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
