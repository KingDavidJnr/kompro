/**
 * Audit program business logic. An AuditPlan groups nonconformities; each
 * nonconformity tracks corrective actions until it is closed.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError } = require('../../utils/errors');

async function listPlans({ status, page = 1, pageSize = 25 } = {}) {
  const where = {};
  if (status) where.status = status;
  const [plans, total] = await Promise.all([
    prisma.auditPlan.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { nonconformities: true } }),
    prisma.auditPlan.count({ where }),
  ]);
  return { plans, total, page, pageSize };
}

async function getPlan(id) {
  const plan = await prisma.auditPlan.findUnique({ where: { id }, include: { nonconformities: { include: { actions: true } } } });
  if (!plan) throw new NotFoundError('Audit plan not found');
  return plan;
}

async function createPlan({ title, scope, status, scheduledAt }) {
  return prisma.auditPlan.create({
    data: {
      title,
      scope: scope || null,
      status: status || 'planned',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
    include: { nonconformities: true },
  });
}

async function updatePlan(id, body) {
  const existing = await prisma.auditPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Audit plan not found');
  const data = {};
  for (const f of ['title', 'scope', 'status']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  return prisma.auditPlan.update({ where: { id }, data });
}

async function deletePlan(id) {
  await prisma.auditPlan.delete({ where: { id } });
  return { id };
}

async function addNonconformity(planId, { description, severity, status }) {
  const plan = await prisma.auditPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Audit plan not found');
  return prisma.nonconformity.create({
    data: { auditPlanId: planId, description, severity: severity || 'minor', status: status || 'open' },
    include: { actions: true },
  });
}

async function updateNonconformity(id, body) {
  const existing = await prisma.nonconformity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Nonconformity not found');
  const data = {};
  for (const f of ['description', 'severity', 'status']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  return prisma.nonconformity.update({ where: { id }, data });
}

async function deleteNonconformity(id) {
  await prisma.nonconformity.delete({ where: { id } });
  return { id };
}

async function addCorrectiveAction(nonconformityId, { description, owner, dueDate, status }) {
  const nc = await prisma.nonconformity.findUnique({ where: { id: nonconformityId } });
  if (!nc) throw new NotFoundError('Nonconformity not found');
  return prisma.correctiveAction.create({
    data: {
      nonconformityId,
      description,
      owner: owner || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status || 'open',
    },
  });
}

async function updateCorrectiveAction(id, body) {
  const existing = await prisma.correctiveAction.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Corrective action not found');
  const data = {};
  for (const f of ['description', 'owner', 'status']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  return prisma.correctiveAction.update({ where: { id }, data });
}

async function deleteCorrectiveAction(id) {
  await prisma.correctiveAction.delete({ where: { id } });
  return { id };
}

module.exports = {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  addNonconformity,
  updateNonconformity,
  deleteNonconformity,
  addCorrectiveAction,
  updateCorrectiveAction,
  deleteCorrectiveAction,
};
