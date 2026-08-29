/**
 * IT Service Management business logic: assets, changes and capacity plans.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError } = require('../../utils/errors');

async function listAssets({ type, status, page = 1, pageSize = 25 } = {}) {
  const where = {};
  if (type) where.type = type;
  if (status) where.status = status;
  const [assets, total] = await Promise.all([
    prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.asset.count({ where }),
  ]);
  return { assets, total, page, pageSize };
}

async function getAsset(id) {
  const asset = await prisma.asset.findUnique({ where: { id }, include: { changes: true } });
  if (!asset) throw new NotFoundError('Asset not found');
  return asset;
}

async function createAsset(body) {
  return prisma.asset.create({
    data: {
      name: body.name,
      type: body.type || null,
      description: body.description || null,
      owner: body.owner || null,
      location: body.location || null,
      status: body.status || 'active',
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
    },
  });
}

async function updateAsset(id, body) {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Asset not found');
  const data = {};
  for (const f of ['name', 'type', 'description', 'owner', 'location', 'status']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.purchaseDate !== undefined) data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if (body.warrantyExpiry !== undefined) data.warrantyExpiry = body.warrantyExpiry ? new Date(body.warrantyExpiry) : null;
  return prisma.asset.update({ where: { id }, data });
}

async function deleteAsset(id) {
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Asset not found');
  await prisma.asset.delete({ where: { id } });
  return { id };
}

async function listChanges({ status, page = 1, pageSize = 25 } = {}) {
  const where = {};
  if (status) where.status = status;
  const [changes, total] = await Promise.all([
    prisma.change.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.change.count({ where }),
  ]);
  return { changes, total, page, pageSize };
}

async function createChange(body) {
  return prisma.change.create({
    data: {
      title: body.title,
      description: body.description || null,
      status: body.status || 'requested',
      risk: body.risk || null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      assetId: body.assetId || null,
      requestedBy: body.requestedBy || null,
    },
  });
}

async function updateChange(id, body) {
  const existing = await prisma.change.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Change not found');
  const data = {};
  for (const f of ['title', 'description', 'status', 'risk', 'assetId', 'requestedBy']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  return prisma.change.update({ where: { id }, data });
}

async function deleteChange(id) {
  await prisma.change.delete({ where: { id } });
  return { id };
}

async function listCapacityPlans(page = 1, pageSize = 25) {
  const [plans, total] = await Promise.all([
    prisma.capacityPlan.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.capacityPlan.count(),
  ]);
  return { plans, total, page, pageSize };
}

async function createCapacityPlan(body) {
  return prisma.capacityPlan.create({
    data: {
      resource: body.resource,
      unit: body.unit || null,
      currentCapacity: body.currentCapacity != null ? Number(body.currentCapacity) : null,
      plannedCapacity: body.plannedCapacity != null ? Number(body.plannedCapacity) : null,
      asOf: body.asOf ? new Date(body.asOf) : null,
      notes: body.notes || null,
    },
  });
}

async function updateCapacityPlan(id, body) {
  const existing = await prisma.capacityPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Capacity plan not found');
  const data = {};
  for (const f of ['resource', 'unit', 'notes']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.currentCapacity !== undefined) data.currentCapacity = body.currentCapacity != null ? Number(body.currentCapacity) : null;
  if (body.plannedCapacity !== undefined) data.plannedCapacity = body.plannedCapacity != null ? Number(body.plannedCapacity) : null;
  if (body.asOf !== undefined) data.asOf = body.asOf ? new Date(body.asOf) : null;
  return prisma.capacityPlan.update({ where: { id }, data });
}

async function deleteCapacityPlan(id) {
  await prisma.capacityPlan.delete({ where: { id } });
  return { id };
}

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  listChanges,
  createChange,
  updateChange,
  deleteChange,
  listCapacityPlans,
  createCapacityPlan,
  updateCapacityPlan,
  deleteCapacityPlan,
};
