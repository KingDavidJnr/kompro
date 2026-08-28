/**
 * Audit log business logic.
 *
 * Records who changed what, when, and the before/after state of the affected
 * record. Entries are append-only history used for traceability and review.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * Builds a Prisma where filter from common audit query parameters.
 * @param {object} [filters] - { entity, entityId, actorId, action, from, to }.
 * @returns {object} Prisma where clause for AuditLog.
 */
function buildAuditWhere({ entity, entityId, actorId, action, from, to } = {}) {
  const where = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  return where;
}

/**
 * Records an audit entry directly.
 * @param {object} input - { actorId, action, entity, entityId, before, after, ip }.
 * @returns {object} Created audit log row.
 */
async function recordAudit({ actorId, action, entity, entityId, before, after, ip }) {
  return prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      action,
      entity,
      entityId: entityId || null,
      before: before === undefined ? null : before,
      after: after === undefined ? null : after,
      ip: ip || null,
    },
  });
}

/**
 * Records an audit entry using the authenticated user from the request.
 * @param {object} req - Express request carrying req.user and req.ip.
 * @param {object} input - { action, entity, entityId, before, after }.
 * @returns {object} Created audit log row.
 */
async function recordFromRequest(req, { action, entity, entityId, before, after }) {
  const actorId = req.user ? req.user.id : null;
  return recordAudit({ actorId, action, entity, entityId, before, after, ip: req.ip });
}

/**
 * Lists audit entries with optional filtering and pagination.
 * @param {object} [opts] - { page, pageSize, entity, entityId, actorId, action }.
 * @returns {object} { entries, total, page, pageSize }.
 */
async function listAudit({ page = 1, pageSize = DEFAULT_PAGE_SIZE, entity, entityId, actorId, action } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const where = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;

  const [total, entries] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return { entries, total, page: safePage, pageSize: safeSize };
}

/**
 * Returns all matching audit entries for export (no pagination).
 * @param {object} [filters] - { entity, entityId, actorId, action, from, to }.
 * @returns {Array} Audit rows with actor summary, oldest first.
 */
async function exportAudit(filters = {}) {
  const where = buildAuditWhere(filters);
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}

/**
 * Deletes audit entries older than the given number of days.
 * @param {number} days - Entries created before (now - days) are removed.
 * @returns {number} Count of deleted rows.
 */
async function purgeOld(days) {
  const cutoff = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  const { count } = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}

/**
 * Returns a single audit entry.
 * @param {string} id - Audit log id.
 * @returns {object} Audit entry with actor summary.
 * @throws {NotFoundError} When the entry does not exist.
 */
async function getAudit(id) {
  const entry = await prisma.auditLog.findUnique({
    where: { id },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
  if (!entry) {
    throw new NotFoundError('Audit entry not found');
  }
  return entry;
}

module.exports = { recordAudit, recordFromRequest, listAudit, getAudit, exportAudit, purgeOld };
