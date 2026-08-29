/**
 * Incident controllers. Mutations are recorded in the audit trail.
 */

const service = require('./incidents.service');
const auditService = require('../audit/audit.service');

async function list(req, res, next) {
  try {
    const result = await service.listIncidents({
      status: req.query.status,
      severity: req.query.severity,
      page: Number(req.query.page) || 1,
      pageSize: Math.min(Number(req.query.pageSize) || 25, 100),
    });
    res.json({ message: 'Incidents retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json({ message: 'Incident retrieved', data: { incident: await service.getIncident(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const incident = await service.createIncident(req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'incident', entityId: incident.id, after: incident });
    res.status(201).json({ message: 'Incident created', data: { incident } });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const before = await service.getIncident(req.params.id);
    const incident = await service.updateIncident(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'incident', entityId: incident.id, before, after: incident });
    res.json({ message: 'Incident updated', data: { incident } });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const before = await service.getIncident(req.params.id);
    const result = await service.deleteIncident(req.params.id);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'incident', entityId: req.params.id, before });
    res.json({ message: 'Incident deleted', data: result });
  } catch (err) {
    next(err);
  }
}

async function listActions(req, res, next) {
  try {
    const items = await require('../../lib/prisma').incidentAction.findMany({ where: { incidentId: req.params.id } });
    res.json({ message: 'Actions retrieved', data: { actions: items } });
  } catch (err) {
    next(err);
  }
}

async function addAction(req, res, next) {
  try {
    const item = await service.addAction(req.params.id, req.body);
    await auditService.recordFromRequest(req, { action: 'create', entity: 'incidentAction', entityId: item.id, after: item });
    res.status(201).json({ message: 'Action added', data: { action: item } });
  } catch (err) {
    next(err);
  }
}

async function updateAction(req, res, next) {
  try {
    const item = await service.updateAction(req.params.aid, req.body);
    await auditService.recordFromRequest(req, { action: 'update', entity: 'incidentAction', entityId: item.id, after: item });
    res.json({ message: 'Action updated', data: { action: item } });
  } catch (err) {
    next(err);
  }
}

async function removeAction(req, res, next) {
  try {
    await service.deleteAction(req.params.aid);
    await auditService.recordFromRequest(req, { action: 'delete', entity: 'incidentAction', entityId: req.params.aid });
    res.json({ message: 'Action deleted', data: { id: req.params.aid } });
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
  listActions,
  addAction,
  updateAction,
  removeAction,
};
