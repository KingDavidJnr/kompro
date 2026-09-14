/**
 * Trust portal business logic.
 *
 * Builds the public-facing compliance snapshot that external stakeholders can
 * view without authentication. The data returned is intentionally limited to
 * aggregate metrics and curated text -- no internal control names, gap details,
 * or evidence records are ever exposed.
 *
 * Portal configuration lives inside the Organization `settings` JSON under
 * the `trustPortal` key:
 *
 *   settings.trustPortal = {
 *     enabled:       Boolean   -- master on/off switch
 *     headline:      String    -- hero heading (e.g. "Security & Compliance")
 *     description:   String    -- introductory paragraph
 *     contactEmail:  String    -- email for compliance inquiries
 *     contactNote:   String    -- instructions on how to request access / NDA docs
 *     showReadiness: Boolean   -- show the overall readiness score
 *     showFrameworks:Boolean   -- show per-framework readiness
 *     showPolicies:  Boolean   -- show active policy titles & descriptions
 *     showStats:     Boolean   -- show aggregate control / evidence stats
 *     customSections:[{ title, body }] -- freeform rich-text sections
 *   }
 */

const prisma = require('../../lib/prisma');
const dashboardService = require('../dashboard/dashboard.service');

const PORTAL_DEFAULTS = {
  enabled: false,
  headline: 'Security & Compliance',
  description: '',
  contactEmail: '',
  contactNote: '',
  showReadiness: true,
  showFrameworks: true,
  showPolicies: true,
  showStats: true,
  customSections: [],
};

/**
 * Returns the trust portal configuration merged with defaults.
 * @returns {object} The merged portal settings.
 */
async function getPortalSettings() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const raw = (org && org.settings && org.settings.trustPortal) || {};
  return { ...PORTAL_DEFAULTS, ...raw };
}

/**
 * Builds the public trust portal payload.
 *
 * Returns null when the portal is disabled so the caller can respond with 404.
 * @returns {object|null} Public-safe compliance snapshot, or null if disabled.
 */
async function getPublicPortal() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!org) return null;

  const portal = { ...PORTAL_DEFAULTS, ...((org.settings && org.settings.trustPortal) || {}) };
  if (!portal.enabled) return null;

  const result = {
    organization: {
      name: org.name,
      displayName: org.displayName || org.name,
    },
    portal: {
      headline: portal.headline,
      description: portal.description,
      contactEmail: portal.contactEmail,
      contactNote: portal.contactNote,
      customSections: portal.customSections || [],
    },
  };

  // Overall readiness score
  if (portal.showReadiness || portal.showStats) {
    const summary = await dashboardService.getSummary();
    if (portal.showReadiness) {
      result.readiness = {
        score: summary.readiness,
        components: {
          frameworkAdoption: Math.round(summary.components.frameworkEnabled * 100),
          controlImplementation: Math.round(summary.components.controlImplementation * 100),
          evidenceCoverage: Math.round(summary.components.evidenceCoverage * 100),
          assessmentPassRate: Math.round(summary.components.assessmentPassRate * 100),
        },
      };
    }
    if (portal.showStats) {
      result.stats = {
        totalControls: summary.counts.totalControls,
        implementedControls: summary.counts.implementedControls,
        totalEvidence: summary.counts.totalEvidence,
        totalAssessments: summary.counts.totalAssessments,
        passedAssessments: summary.counts.passedAssessments,
      };
    }
  }

  // Per-framework readiness (only enabled frameworks)
  if (portal.showFrameworks) {
    const frameworks = await prisma.framework.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { requirements: true } },
        requirements: {
          select: {
            controlMappings: {
              select: {
                control: {
                  select: {
                    assessments: {
                      orderBy: { createdAt: 'desc' },
                      take: 1,
                      select: { result: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    result.frameworks = frameworks.map((fw) => {
      const total = fw._count.requirements;
      let satisfied = 0;
      for (const req of fw.requirements) {
        if (req.controlMappings.length === 0) continue;
        const results = req.controlMappings.map(
          (m) => (m.control.assessments[0] && m.control.assessments[0].result) || null
        );
        const allSatisfied = results.length > 0 && results.every((r) => r === 'satisfied');
        if (allSatisfied) satisfied++;
      }
      return {
        name: fw.name,
        version: fw.version || null,
        totalRequirements: total,
        satisfiedRequirements: satisfied,
        readinessPercent: total > 0 ? Math.round((satisfied / total) * 100) : 0,
      };
    });
  }

  // Active policies (title + description only)
  if (portal.showPolicies) {
    const policies = await prisma.policy.findMany({
      where: { status: 'active' },
      orderBy: { title: 'asc' },
      select: { title: true, description: true, version: true },
    });
    result.policies = policies;
  }

  return result;
}

module.exports = { getPortalSettings, getPublicPortal, PORTAL_DEFAULTS };
