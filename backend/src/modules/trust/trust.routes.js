/**
 * Trust portal routes.
 *
 * The public endpoint (GET /api/public/trust) is intentionally unauthenticated
 * so external stakeholders can view it. The admin endpoint for reading/updating
 * portal settings requires authentication and org:update permission.
 */

const router = require('express').Router();
const { body } = require('express-validator');
const trustService = require('./trust.service');
const orgService = require('../organization/org.service');
const auditService = require('../audit/audit.service');
const requireAuth = require('../../middleware/requireAuth');
const requirePermission = require('../../middleware/requirePermission');
const validate = require('../../middleware/validate');

// ── Public (no auth) ────────────────────────────────────────────────────────

/**
 * GET /api/public/trust
 * Returns the public trust portal data. 404 if disabled.
 */
router.get('/public/trust', async (req, res, next) => {
  try {
    const data = await trustService.getPublicPortal();
    if (!data) {
      return res.status(404).json({ message: 'Trust portal is not enabled' });
    }
    res.json({ message: 'Trust portal', data });
  } catch (err) {
    next(err);
  }
});

// ── Admin (auth required) ───────────────────────────────────────────────────

/**
 * GET /api/trust/settings
 * Returns the current portal configuration (merged with defaults).
 */
router.get(
  '/trust/settings',
  requireAuth,
  requirePermission('org:update'),
  async (req, res, next) => {
    try {
      const settings = await trustService.getPortalSettings();
      res.json({ message: 'Trust portal settings', data: { trustPortal: settings } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/trust/settings
 * Updates portal configuration inside org.settings.trustPortal.
 */
router.patch(
  '/trust/settings',
  requireAuth,
  requirePermission('org:update'),
  body('enabled').optional().isBoolean(),
  body('headline').optional().isString(),
  body('description').optional().isString(),
  body('contactEmail').optional().isString(),
  body('contactNote').optional().isString(),
  body('showReadiness').optional().isBoolean(),
  body('showFrameworks').optional().isBoolean(),
  body('showPolicies').optional().isBoolean(),
  body('showStats').optional().isBoolean(),
  body('customSections').optional().isArray(),
  validate,
  async (req, res, next) => {
    try {
      const org = await orgService.getSettings();
      const before = (org.settings && org.settings.trustPortal) || {};

      // Merge incoming fields into existing portal settings.
      const merged = { ...before };
      const allowed = [
        'enabled', 'headline', 'description', 'contactEmail', 'contactNote',
        'showReadiness', 'showFrameworks', 'showPolicies', 'showStats', 'customSections',
      ];
      for (const key of allowed) {
        if (req.body[key] !== undefined) merged[key] = req.body[key];
      }

      // Write back into org settings.
      const newSettings = { ...(org.settings || {}), trustPortal: merged };
      await orgService.updateSettings({ settings: newSettings });

      await auditService.recordFromRequest(req, {
        action: 'update',
        entity: 'trust_portal',
        entityId: org.id,
        before,
        after: merged,
      });

      res.json({ message: 'Trust portal settings updated', data: { trustPortal: merged } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
