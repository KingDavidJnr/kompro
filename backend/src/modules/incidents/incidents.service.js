/**
 * Incident management business logic: incident register and the response
 * actions tracked against each incident.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError } = require('../../utils/errors');

async function listIncidents({ status, severity, page = 1, pageSize = 25 } = {}) {
  const where = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actions: true },
    }),
    prisma.incident.count({ where }),
  ]);
  return { incidents, total, page, pageSize };
}

async function getIncident(id) {
  const incident = await prisma.incident.findUnique({ where: { id }, include: { actions: true } });
  if (!incident) throw new NotFoundError('Incident not found');
  return incident;
}

async function createIncident({ title, description, category, severity, classification, status, owner, occurredAt }) {
  return prisma.incident.create({
    data: {
      title,
      description: description || null,
      category: category || null,
      severity: severity || 'low',
      classification: classification || null,
      status: status || 'open',
      owner: owner || null,
      occurredAt: occurredAt ? new Date(occurredAt) : null,
    },
    include: { actions: true },
  });
}

async function updateIncident(id, body) {
  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Incident not found');
  const data = {};
  for (const f of ['title', 'description', 'category', 'severity', 'classification', 'status', 'owner', 'lessonsLearned']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.occurredAt !== undefined) data.occurredAt = body.occurredAt ? new Date(body.occurredAt) : null;
  if (body.status === 'resolved' && !existing.resolvedAt) data.resolvedAt = new Date();
  if (body.status && body.status !== 'resolved') data.resolvedAt = null;
  return prisma.incident.update({ where: { id }, data, include: { actions: true } });
}

async function deleteIncident(id) {
  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Incident not found');
  await prisma.incident.delete({ where: { id } });
  return { id };
}

async function addAction(incidentId, { action, owner, status, dueDate }) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) throw new NotFoundError('Incident not found');
  return prisma.incidentAction.create({
    data: {
      incidentId,
      action,
      owner: owner || null,
      status: status || 'todo',
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
}

async function updateAction(id, body) {
  const existing = await prisma.incidentAction.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Incident action not found');
  const data = {};
  for (const f of ['action', 'owner', 'status']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.status === 'done' && !existing.doneAt) data.doneAt = new Date();
  return prisma.incidentAction.update({ where: { id }, data });
}

async function deleteAction(id) {
  await prisma.incidentAction.delete({ where: { id } });
  return { id };
}

module.exports = {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  addAction,
  updateAction,
  deleteAction,
};
