/**
 * Policy management business logic.
 *
 * Policies describe the rules and requirements an organization establishes for
 * itself. A policy carries human-readable content plus an optional structured
 * "rules" JSON field reserved for machine-evaluable policy-as-code, which a
 * later engine will evaluate against evidence. Policies can later be linked to
 * controls and frameworks; this module manages the policy records themselves.
 */

const prisma = require('../../lib/prisma');
const emailService = require('../../lib/email');
const config = require('../../config');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Allowed lifecycle states for a policy.
const POLICY_STATUSES = ['draft', 'active', 'retired'];

/**
 * Lists policies with optional filtering and pagination.
 * @param {object} [opts] - { page, pageSize, status }.
 * @returns {object} { policies, total, page, pageSize }.
 */
async function listPolicies({ page = 1, pageSize = DEFAULT_PAGE_SIZE, status } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const where = {};
  if (status) where.status = status;

  const [total, policies] = await Promise.all([
    prisma.policy.count({ where }),
    prisma.policy.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return { policies, total, page: safePage, pageSize: safeSize };
}

/**
 * Returns a single policy.
 * @param {string} id - Policy id.
 * @returns {object} Policy record.
 * @throws {NotFoundError} When the policy does not exist.
 */
async function getPolicy(id) {
  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) {
    throw new NotFoundError('Policy not found');
  }
  return policy;
}

/**
 * Creates a policy.
 * @param {object} input - { title, description, content, status, rules, owner }.
 * @returns {object} Created policy.
 * @throws {ValidationError} On missing title or invalid status.
 */
async function createPolicy({ title, description, content, status, rules, owner }) {
  if (!title) {
    throw new ValidationError('Policy title is required');
  }
  if (status && !POLICY_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status. Allowed: ${POLICY_STATUSES.join(', ')}`);
  }

  const policy = await prisma.policy.create({
    data: {
      title,
      description: description || null,
      content: content || null,
      status: status || 'draft',
      rules: rules || null,
      owner: owner || null,
    },
  });

  // Announce when a policy goes live.
  if (policy.status === 'active') {
    await notifyPolicyPublished(policy);
  }

  return policy;
}

/**
 * Emails all active users when a policy is published.
 * @param {object} policy - Policy record with title/description.
 * @returns {Promise<void>}
 */
async function notifyPolicyPublished(policy) {
  if (!config.smtp.host) return;
  const users = await prisma.user.findMany({ where: { active: true }, select: { email: true } });
  const emails = users.map((u) => u.email).filter(Boolean);
  if (!emails.length) return;
  try {
    await emailService.sendNotification({
      to: emails,
      heading: `New policy published on ${config.orgName}: ${policy.title}`,
      paragraphs: [
        `A policy "${policy.title}" has been published on ${config.orgName}.`,
        policy.description || 'Sign in to review the full policy.',
      ],
    });
  } catch (err) {
    console.error(`Failed to send policy-published email: ${err.message}`);
  }
}

/**
 * Updates a policy.
 * @param {string} id - Policy id.
 * @param {object} input - { title, description, content, status, rules, owner }.
 * @returns {object} Updated policy.
 * @throws {NotFoundError} When the policy does not exist.
 * @throws {ValidationError} On invalid status.
 */
async function updatePolicy(id, { title, description, content, status, rules, owner }) {
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Policy not found');
  }

  if (status && !POLICY_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status. Allowed: ${POLICY_STATUSES.join(', ')}`);
  }

  const data = {};
  if (typeof title === 'string') data.title = title;
  if (description !== undefined) data.description = description;
  if (content !== undefined) data.content = content;
  if (status) data.status = status;
  if (rules !== undefined) data.rules = rules;
  if (owner !== undefined) data.owner = owner;

  const updated = await prisma.policy.update({ where: { id }, data });
  if (updated.status === 'active' && existing.status !== 'active') {
    await notifyPolicyPublished(updated);
  }
  return updated;
}

/**
 * Deletes a policy.
 * @param {string} id - Policy id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the policy does not exist.
 */
async function deletePolicy(id) {
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Policy not found');
  }
  await prisma.policy.delete({ where: { id } });
  return true;
}

module.exports = {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  POLICY_STATUSES,
};
