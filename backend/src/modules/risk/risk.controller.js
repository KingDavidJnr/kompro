/**
 * Risk management controllers. All routes require the matching risk:*
 * permission; mutations are recorded in the audit trail.
 */

const riskService = require('./risk.service');
const auditService = require('../audit/audit.service');

async function list(req, res, next) {
  try {
    const result = await riskService.listRisks({
      status: req.query.status,
      category: req.query.category,
      page: Number(req.query.page) || 1,
      pageSize: Math.min(Number(req.query.pageSize) || 25, 100),
    });
    res.json({ message: 'Risks retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json({ message: 'Risk retrieved', data: { risk: await riskService.getRisk(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const risk = await riskService.createRisk(req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'risk', entityId: risk.id, after: risk });
    res.status(201).json({ message: 'Risk created', data: { risk } });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const before = await riskService.getRisk(req.params.id);
    const risk = await riskService.updateRisk(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'risk', entityId: risk.id, before, after: risk });
    res.json({ message: 'Risk updated', data: { risk } });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const before = await riskService.getRisk(req.params.id);
    const result = await riskService.deleteRisk(req.params.id);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'risk', entityId: req.params.id, before });
    res.json({ message: 'Risk deleted', data: result });
  } catch (err) {
    next(err);
  }
}

async function listScenarios(req, res, next) {
  try {
    const items = await require('../../lib/prisma').riskScenario.findMany({ where: { riskId: req.params.id } });
    res.json({ message: 'Scenarios retrieved', data: { scenarios: items } });
  } catch (err) {
    next(err);
  }
}

async function addScenario(req, res, next) {
  try {
    const item = await riskService.addScenario(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'riskScenario', entityId: item.id, after: item });
    res.status(201).json({ message: 'Scenario added', data: { scenario: item } });
  } catch (err) {
    next(err);
  }
}

async function removeScenario(req, res, next) {
  try {
    const result = await riskService.deleteScenario(req.params.sid);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'riskScenario', entityId: req.params.sid });
    res.json({ message: 'Scenario deleted', data: result });
  } catch (err) {
    next(err);
  }
}

async function listKris(req, res, next) {
  try {
    const items = await require('../../lib/prisma').kri.findMany({ where: { riskId: req.params.id } });
    res.json({ message: 'KRIs retrieved', data: { kris: items } });
  } catch (err) {
    next(err);
  }
}

async function addKri(req, res, next) {
  try {
    const item = await riskService.addKri(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'kri', entityId: item.id, after: item });
    res.status(201).json({ message: 'KRI added', data: { kri: item } });
  } catch (err) {
    next(err);
  }
}

async function updateKri(req, res, next) {
  try {
    const item = await riskService.updateKri(req.params.kid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'kri', entityId: item.id, after: item });
    res.json({ message: 'KRI updated', data: { kri: item } });
  } catch (err) {
    next(err);
  }
}

async function removeKri(req, res, next) {
  try {
    await riskService.deleteKri(req.params.kid);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'kri', entityId: req.params.kid });
    res.json({ message: 'KRI deleted', data: { id: req.params.kid } });
  } catch (err) {
    next(err);
  }
}

async function listTreatments(req, res, next) {
  try {
    const items = await require('../../lib/prisma').riskTreatment.findMany({ where: { riskId: req.params.id } });
    res.json({ message: 'Treatments retrieved', data: { treatments: items } });
  } catch (err) {
    next(err);
  }
}

async function addTreatment(req, res, next) {
  try {
    const item = await riskService.addTreatment(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'riskTreatment', entityId: item.id, after: item });
    res.status(201).json({ message: 'Treatment added', data: { treatment: item } });
  } catch (err) {
    next(err);
  }
}

async function updateTreatment(req, res, next) {
  try {
    const item = await riskService.updateTreatment(req.params.tid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'riskTreatment', entityId: item.id, after: item });
    res.json({ message: 'Treatment updated', data: { treatment: item } });
  } catch (err) {
    next(err);
  }
}

async function removeTreatment(req, res, next) {
  try {
    await riskService.deleteTreatment(req.params.tid);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'riskTreatment', entityId: req.params.tid });
    res.json({ message: 'Treatment deleted', data: { id: req.params.tid } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  listScenarios,
  addScenario,
  removeScenario,
  listKris,
  addKri,
  updateKri,
  removeKri,
  listTreatments,
  addTreatment,
  updateTreatment,
  removeTreatment,
};
