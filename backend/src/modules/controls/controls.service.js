/**
 * Control management business logic.
 *
 * Controls are the organization's security, operational, administrative or
 * compliance objectives. They are framework-agnostic: later mappings connect
 * a control to requirements in one or more frameworks, and assessments
 * evaluate the control against its evidence. A control also carries a current
 * implementation status maintained by the organization.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Allowed implementation states for a control.
const CONTROL_STATUSES = ['not_implemented', 'partial', 'implemented', 'needs_review'];

/**
 * Lists controls with optional filtering and pagination.
 * @param {object} [opts] - { page, pageSize, category, status, search }.
 * @returns {object} { controls, total, page, pageSize }.
 */
async function listControls({ page = 1, pageSize = DEFAULT_PAGE_SIZE, category, status, search } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const where = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (search) {
    const q = String(search).trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, controls] = await Promise.all([
    prisma.control.count({ where }),
    prisma.control.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return { controls, total, page: safePage, pageSize: safeSize };
}

/**
 * Returns a single control.
 * @param {string} id - Control id.
 * @returns {object} Control record.
 * @throws {NotFoundError} When the control does not exist.
 */
async function getControl(id) {
  const control = await prisma.control.findUnique({ where: { id } });
  if (!control) {
    throw new NotFoundError('Control not found');
  }
  return control;
}

/**
 * Creates a control.
 * @param {object} input - { title, description, category, status, owner }.
 * @returns {object} Created control.
 * @throws {ValidationError} On missing title or invalid status.
 */
async function createControl({ title, description, category, status, owner }) {
  if (!title) {
    throw new ValidationError('Control title is required');
  }
  if (status && !CONTROL_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status. Allowed: ${CONTROL_STATUSES.join(', ')}`);
  }

  return prisma.control.create({
    data: {
      title,
      description: description || null,
      category: category || null,
      status: status || 'not_implemented',
      owner: owner || null,
    },
  });
}

/**
 * Updates a control.
 * @param {string} id - Control id.
 * @param {object} input - { title, description, category, status, owner }.
 * @returns {object} Updated control.
 * @throws {NotFoundError} When the control does not exist.
 * @throws {ValidationError} On invalid status.
 */
async function updateControl(id, { title, description, category, status, owner }) {
  const existing = await prisma.control.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Control not found');
  }

  if (status && !CONTROL_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status. Allowed: ${CONTROL_STATUSES.join(', ')}`);
  }

  const data = {};
  if (typeof title === 'string') data.title = title;
  if (description !== undefined) data.description = description;
  if (category !== undefined) data.category = category;
  if (status) data.status = status;
  if (owner !== undefined) data.owner = owner;

  return prisma.control.update({ where: { id }, data });
}

/**
 * Deletes a control.
 * @param {string} id - Control id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the control does not exist.
 */
async function deleteControl(id) {
  const existing = await prisma.control.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Control not found');
  }
  await prisma.control.delete({ where: { id } });
  return true;
}

module.exports = {
  listControls,
  getControl,
  createControl,
  updateControl,
  deleteControl,
  CONTROL_STATUSES,
};
