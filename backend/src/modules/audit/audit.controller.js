/**
 * HTTP layer for audit log endpoints.
 *
 * Wraps audit.service and formats responses as { message, data }. Audit
 * entries are append-only; this module only reads them.
 */

const auditService = require('./audit.service');
const emailService = require('../../lib/email');
const config = require('../../config');

/**
 * Handles GET /api/audit.
 * @param {object} req - Authenticated request; reads page/pageSize/entity/entityId/actorId/action.
 * @param {object} res - Express response ({ message, data: { entries, total, page, pageSize } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function list(req, res, next) {
  try {
    const result = await auditService.listAudit({
      page: req.query.page,
      pageSize: req.query.pageSize,
      entity: req.query.entity,
      entityId: req.query.entityId,
      actorId: req.query.actorId,
      action: req.query.action,
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ message: 'Audit log retrieved', data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/audit/:id.
 * @param {object} req - Authenticated request with id param.
 * @param {object} res - Express response ({ message, data: { entry } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function get(req, res, next) {
  try {
    res.json({ message: 'Audit entry retrieved', data: { entry: await auditService.getAudit(req.params.id) } });
  } catch (err) {
    next(err);
  }
}

/**
 * Escapes a single CSV cell value.
 * @param {*} value - Any value (object becomes JSON).
 * @returns {string} Quoted, escaped CSV cell.
 */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Serializes audit rows to CSV.
 * @param {Array} rows - Audit rows with optional actor summary.
 * @returns {string} CSV document text.
 */
function toCsv(rows) {
  const header = ['id', 'createdAt', 'action', 'entity', 'entityId', 'actorId', 'actorEmail', 'before', 'after', 'ip'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [r.id, r.createdAt, r.action, r.entity, r.entityId, r.actorId, r.actor ? r.actor.email : '', r.before, r.after, r.ip]
        .map(csvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

/**
 * Handles GET /api/audit/export.
 * @param {object} req - Authenticated request; reads format (json|csv) + filters.
 * @param {object} res - Express response (JSON or CSV attachment).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function exportAudit(req, res, next) {
  try {
    const rows = await auditService.exportAudit({
      entity: req.query.entity,
      entityId: req.query.entityId,
      actorId: req.query.actorId,
      action: req.query.action,
      from: req.query.from,
      to: req.query.to,
    });

    // Best-effort security notice to the administrator who exported the trail.
    if (req.user && config.smtp.host) {
      try {
        await emailService.sendNotification({
          to: req.user.email,
          heading: `Audit log exported on ${config.orgName}`,
          paragraphs: [
            `Hi ${req.user.name || 'there'},`,
            `The ${config.orgName} audit log was just exported. If this wasn't you, please review account activity and reset your password.`,
          ],
        });
      } catch (err) {
        console.error(`Failed to send audit-export email: ${err.message}`);
      }
    }

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-export.csv"');
      res.send(toCsv(rows));
      return;
    }

    res.json({ message: 'Audit export', data: { entries: rows, total: rows.length } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles POST /api/audit/purge.
 *
 * Deletes audit entries older than the given number of days (default
 * AUDIT_RETENTION_DAYS) and records the action itself so that the purge is
 * visible in the audit log.
 * @param {object} req - Authenticated request. Body may include `days`.
 * @param {object} res - Express response ({ message, data: { deleted } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function purge(req, res, next) {
  try {
    const days = req.body && Number.isFinite(Number(req.body.days))
      ? Number(req.body.days)
      : config.auditRetentionDays;
    const deleted = await auditService.purgeOld(days);
    await auditService.recordFromRequest(req, {
      action: 'purge',
      entity: 'audit',
      entityId: 'audit',
      before: { olderThanDays: days },
      after: { deleted },
    });
    res.json({ message: 'Audit entries purged', data: { deleted } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, exportAudit, purge };
