/**
 * Audit program controllers. Mutations are recorded in the audit trail.
 */

const service = require('./audit-program.service');
const auditService = require('../audit/audit.service');

async function list(req, res, next) {
  try {
    const result = await service.listPlans({ status: req.query.status, page: Number(req.query.page) || 1, pageSize: Math.min(Number(req.query.pageSize) || 25, 100) });
    res.json({ message: 'Audit plans retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json({ message: 'Audit plan retrieved', data: { plan: await service.getPlan(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const plan = await service.createPlan(req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'auditPlan', entityId: plan.id, after: plan });
    res.status(201).json({ message: 'Audit plan created', data: { plan } });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const plan = await service.updatePlan(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'auditPlan', entityId: plan.id, after: plan });
    res.json({ message: 'Audit plan updated', data: { plan } });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deletePlan(req.params.id);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'auditPlan', entityId: req.params.id });
    res.json({ message: 'Audit plan deleted', data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}

async function addNonconformity(req, res, next) {
  try {
    const item = await service.addNonconformity(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'nonconformity', entityId: item.id, after: item });
    res.status(201).json({ message: 'Nonconformity added', data: { nonconformity: item } });
  } catch (err) {
    next(err);
  }
}

async function updateNonconformity(req, res, next) {
  try {
    const item = await service.updateNonconformity(req.params.nid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'nonconformity', entityId: item.id, after: item });
    res.json({ message: 'Nonconformity updated', data: { nonconformity: item } });
  } catch (err) {
    next(err);
  }
}

async function removeNonconformity(req, res, next) {
  try {
    await service.deleteNonconformity(req.params.nid);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'nonconformity', entityId: req.params.nid });
    res.json({ message: 'Nonconformity deleted', data: { id: req.params.nid } });
  } catch (err) {
    next(err);
  }
}

async function addCorrectiveAction(req, res, next) {
  try {
    const item = await service.addCorrectiveAction(req.params.nid, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'correctiveAction', entityId: item.id, after: item });
    res.status(201).json({ message: 'Corrective action added', data: { action: item } });
  } catch (err) {
    next(err);
  }
}

async function updateCorrectiveAction(req, res, next) {
  try {
    const item = await service.updateCorrectiveAction(req.params.cid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'correctiveAction', entityId: item.id, after: item });
    res.json({ message: 'Corrective action updated', data: { action: item } });
  } catch (err) {
    next(err);
  }
}

async function removeCorrectiveAction(req, res, next) {
  try {
    await service.deleteCorrectiveAction(req.params.cid);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'correctiveAction', entityId: req.params.cid });
    res.json({ message: 'Corrective action deleted', data: { id: req.params.cid } });
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
  addNonconformity,
  updateNonconformity,
  removeNonconformity,
  addCorrectiveAction,
  updateCorrectiveAction,
  removeCorrectiveAction,
};
