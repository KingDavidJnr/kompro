/**
 * Risk management business logic: risk register, scenarios, key risk
 * indicators (KRIs) and treatment plans. Each write is auditable via the
 * standard recordFromRequest pattern used by the controllers.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError } = require('../../utils/errors');

async function listRisks({ status, category, page = 1, pageSize = 25 } = {}) {
  const where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  const [risks, total] = await Promise.all([
    prisma.risk.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { scenarios: true, kris: true, treatments: true },
    }),
    prisma.risk.count({ where }),
  ]);
  return { risks, total, page, pageSize };
}

async function getRisk(id) {
  const risk = await prisma.risk.findUnique({
    where: { id },
    include: { scenarios: true, kris: true, treatments: true },
  });
  if (!risk) throw new NotFoundError('Risk not found');
  return risk;
}

async function createRisk({ title, description, category, likelihood, impact, tolerance, status, owner }) {
  const l = Number(likelihood) || 1;
  const i = Number(impact) || 1;
  return prisma.risk.create({
    data: {
      title,
      description: description || null,
      category: category || null,
      likelihood: l,
      impact: i,
      score: l * i,
      tolerance: tolerance || null,
      status: status || 'open',
      owner: owner || null,
    },
    include: { scenarios: true, kris: true, treatments: true },
  });
}

async function updateRisk(id, { title, description, category, likelihood, impact, tolerance, status, owner }) {
  const existing = await prisma.risk.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Risk not found');
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (category !== undefined) data.category = category;
  if (tolerance !== undefined) data.tolerance = tolerance;
  if (status !== undefined) data.status = status;
  if (owner !== undefined) data.owner = owner;
  if (likelihood !== undefined || impact !== undefined) {
    const l = Number(likelihood ?? existing.likelihood) || 1;
    const i = Number(impact ?? existing.impact) || 1;
    data.likelihood = l;
    data.impact = i;
    data.score = l * i;
  }
  return prisma.risk.update({ where: { id }, data, include: { scenarios: true, kris: true, treatments: true } });
}

async function deleteRisk(id) {
  const existing = await prisma.risk.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Risk not found');
  await prisma.risk.delete({ where: { id } });
  return { id };
}

async function addScenario(riskId, { title, description, likelihood, impact, inherentScore, residualScore }) {
  const risk = await prisma.risk.findUnique({ where: { id: riskId } });
  if (!risk) throw new NotFoundError('Risk not found');
  return prisma.riskScenario.create({
    data: {
      riskId,
      title,
      description: description || null,
      likelihood: Number(likelihood) || 1,
      impact: Number(impact) || 1,
      inherentScore: Number(inherentScore) || 1,
      residualScore: Number(residualScore) || 1,
    },
  });
}

async function deleteScenario(scenarioId) {
  await prisma.riskScenario.delete({ where: { id: scenarioId } });
  return { id: scenarioId };
}

async function addKri(riskId, { title, description, unit, threshold, currentValue }) {
  const data = {
    title,
    description: description || null,
    unit: unit || null,
    threshold: threshold != null ? Number(threshold) : null,
    currentValue: currentValue != null ? Number(currentValue) : null,
  };
  if (riskId) data.riskId = riskId;
  if (data.threshold != null && data.currentValue != null) {
    data.status = data.currentValue > data.threshold ? 'breach' : data.currentValue >= data.threshold * 0.8 ? 'warning' : 'ok';
  }
  return prisma.kri.create({ data });
}

async function updateKri(id, { title, description, unit, threshold, currentValue }) {
  const existing = await prisma.kri.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('KRI not found');
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (unit !== undefined) data.unit = unit;
  if (threshold !== undefined) data.threshold = threshold != null ? Number(threshold) : null;
  if (currentValue !== undefined) data.currentValue = currentValue != null ? Number(currentValue) : null;
  if (data.threshold != null && data.currentValue != null) {
    data.status = data.currentValue > data.threshold ? 'breach' : data.currentValue >= data.threshold * 0.8 ? 'warning' : 'ok';
  }
  return prisma.kri.update({ where: { id }, data });
}

async function deleteKri(id) {
  await prisma.kri.delete({ where: { id } });
  return { id };
}

async function addTreatment(riskId, { title, description, status, owner, dueDate }) {
  const risk = await prisma.risk.findUnique({ where: { id: riskId } });
  if (!risk) throw new NotFoundError('Risk not found');
  return prisma.riskTreatment.create({
    data: {
      riskId,
      title,
      description: description || null,
      status: status || 'planned',
      owner: owner || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
}

async function updateTreatment(id, { title, description, status, owner, dueDate }) {
  const existing = await prisma.riskTreatment.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Risk treatment not found');
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (status !== undefined) data.status = status;
  if (owner !== undefined) data.owner = owner;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  return prisma.riskTreatment.update({ where: { id }, data });
}

async function deleteTreatment(id) {
  await prisma.riskTreatment.delete({ where: { id } });
  return { id };
}

module.exports = {
  listRisks,
  getRisk,
  createRisk,
  updateRisk,
  deleteRisk,
  addScenario,
  deleteScenario,
  addKri,
  updateKri,
  deleteKri,
  addTreatment,
  updateTreatment,
  deleteTreatment,
};
