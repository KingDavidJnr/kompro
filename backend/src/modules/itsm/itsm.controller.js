/**
 * ITSM controllers for assets, changes and capacity plans.
 */

const service = require('./itsm.service');
const auditService = require('../audit/audit.service');

async function listAssets(req, res, next) {
  try {
    const result = await service.listAssets({
      type: req.query.type,
      status: req.query.status,
      page: Number(req.query.page) || 1,
      pageSize: Math.min(Number(req.query.pageSize) || 25, 100),
    });
    res.json({ message: 'Assets retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

async function getAsset(req, res, next) {
  try {
    res.json({ message: 'Asset retrieved', data: { asset: await service.getAsset(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

async function createAsset(req, res, next) {
  try {
    const asset = await service.createAsset(req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'asset', entityId: asset.id, after: asset });
    res.status(201).json({ message: 'Asset created', data: { asset } });
  } catch (err) {
    next(err);
  }
}

async function updateAsset(req, res, next) {
  try {
    const before = await service.getAsset(req.params.id);
    const asset = await service.updateAsset(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'asset', entityId: asset.id, before, after: asset });
    res.json({ message: 'Asset updated', data: { asset } });
  } catch (err) {
    next(err);
  }
}

async function deleteAsset(req, res, next) {
  try {
    const before = await service.getAsset(req.params.id);
    const result = await service.deleteAsset(req.params.id);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'asset', entityId: req.params.id, before });
    res.json({ message: 'Asset deleted', data: result });
  } catch (err) {
    next(err);
  }
}

async function listChanges(req, res, next) {
  try {
    const result = await service.listChanges({ status: req.query.status, page: Number(req.query.page) || 1, pageSize: Math.min(Number(req.query.pageSize) || 25, 100) });
    res.json({ message: 'Changes retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

async function createChange(req, res, next) {
  try {
    const change = await service.createChange(req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'change', entityId: change.id, after: change });
    res.status(201).json({ message: 'Change created', data: { change } });
  } catch (err) {
    next(err);
  }
}

async function updateChange(req, res, next) {
  try {
    const change = await service.updateChange(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'change', entityId: change.id, after: change });
    res.json({ message: 'Change updated', data: { change } });
  } catch (err) {
    next(err);
  }
}

async function deleteChange(req, res, next) {
  try {
    await service.deleteChange(req.params.id);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'change', entityId: req.params.id });
    res.json({ message: 'Change deleted', data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
}

async function listCapacityPlans(req, res, next) {
  try {
    const result = await service.listCapacityPlans(Number(req.query.page) || 1, Math.min(Number(req.query.pageSize) || 25, 100));
    res.json({ message: 'Capacity plans retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

async function createCapacityPlan(req, res, next) {
  try {
    const plan = await service.createCapacityPlan(req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'capacityPlan', entityId: plan.id, after: plan });
    res.status(201).json({ message: 'Capacity plan created', data: { plan } });
  } catch (err) {
    next(err);
  }
}

async function updateCapacityPlan(req, res, next) {
  try {
    const plan = await service.updateCapacityPlan(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'capacityPlan', entityId: plan.id, after: plan });
    res.json({ message: 'Capacity plan updated', data: { plan } });
  } catch (err) {
    next(err);
  }
}

async function deleteCapacityPlan(req, res, next) {
  try {
    await service.deleteCapacityPlan(req.params.id);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'capacityPlan', entityId: req.params.id });
    res.json({ message: 'Capacity plan deleted', data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
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
