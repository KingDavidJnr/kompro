/**
 * Organization settings business logic for the single-tenant deployment.
 *
 * Because Kompro is self-hosted per organization, there is exactly one
 * Organization row. Settings can be edited at runtime without redeploying.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError } = require('../../utils/errors');

/**
 * Returns the single organization record.
 * @returns {object} Organization row.
 * @throws {NotFoundError} When no organization has been seeded yet.
 */
async function getSettings() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!org) {
    throw new NotFoundError('Organization not configured');
  }
  return org;
}

/**
 * Creates or updates the organization record.
 * @param {object} data - { name, displayName, settings }.
 * @returns {object} The created or updated organization row.
 */
async function updateSettings(data) {
  // Fetch the first org, creating a minimal one if none exists yet.
  let org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: data.name || 'My Organization' } });
  }

  // Only copy fields the caller actually provided.
  const updatable = {};
  if (typeof data.name === 'string') updatable.name = data.name;
  if (typeof data.displayName === 'string') updatable.displayName = data.displayName;
  if (data.settings !== undefined) updatable.settings = data.settings;

  return prisma.organization.update({ where: { id: org.id }, data: updatable });
}

module.exports = { getSettings, updateSettings };
