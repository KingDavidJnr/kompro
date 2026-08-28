/**
 * HTTP layer for organization settings endpoints.
 *
 * Formats responses as { message, data }.
 */

const orgService = require('./org.service');
const auditService = require('../audit/audit.service');

/**
 * Handles GET /api/org/settings.
 * @param {object} req - Express request.
 * @param {object} res - Express response ({ message, data: { organization } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function getSettings(req, res, next) {
  try {
    res.json({ message: 'Organization settings retrieved', data: { organization: await orgService.getSettings() } });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/org/settings.
 * @param {object} req - Authenticated request with { name, displayName, settings }.
 * @param {object} res - Express response ({ message, data: { organization } }).
 * @param {function} next - Express next callback.
 * @returns {void}
 */
async function updateSettings(req, res, next) {
  try {
    const before = await orgService.getSettings();
    const organization = await orgService.updateSettings(req.body);
    await auditService.recordFromRequest(req, {
      action: 'update',
      entity: 'organization',
      entityId: organization.id,
      before,
      after: organization,
    });
    res.json({ message: 'Organization settings updated', data: { organization } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
