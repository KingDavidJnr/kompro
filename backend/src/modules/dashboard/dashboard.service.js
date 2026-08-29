const prisma = require('../../lib/prisma');

/**
 * Computes a transparent compliance readiness score (0-100) from four
 * equally-weighted components:
 *   - framework adoption   (enabled frameworks / total)
 *   - control implementation (implemented controls / total)
 *   - evidence coverage     (controls with >=1 evidence / total)
 *   - assessment pass rate  (satisfied assessments / total)
 *
 * Each component is a ratio in [0,1]; the readiness score is their mean * 100.
 */
async function getSummary() {
  const [
    frameworks,
    enabledFrameworks,
    totalControls,
    implementedControls,
    controlsWithEvidence,
    totalAssessments,
    passedAssessments,
    totalEvidence,
    openRisks,
    openIncidents,
  ] = await Promise.all([
    prisma.framework.count(),
    prisma.framework.count({ where: { enabled: true } }),
    prisma.control.count(),
    prisma.control.count({ where: { status: 'implemented' } }),
    prisma.control.count({ where: { evidences: { some: {} } } }),
    prisma.assessment.count(),
    prisma.assessment.count({ where: { result: 'satisfied' } }),
    prisma.evidence.count(),
    prisma.risk.count({ where: { status: { not: 'closed' } } }),
    prisma.incident.count({ where: { status: { not: 'closed' } } }),
  ]);

  const ratio = (n, d) => (d > 0 ? n / d : 0);
  const frameworkEnabled = ratio(enabledFrameworks, frameworks);
  const controlImplementation = ratio(implementedControls, totalControls);
  const evidenceCoverage = ratio(controlsWithEvidence, totalControls);
  const assessmentPassRate = ratio(passedAssessments, totalAssessments);
  const readiness = Math.round(100 * (frameworkEnabled + controlImplementation + evidenceCoverage + assessmentPassRate) / 4);

  return {
    readiness,
    components: { frameworkEnabled, controlImplementation, evidenceCoverage, assessmentPassRate },
    counts: {
      frameworks,
      enabledFrameworks,
      totalControls,
      implementedControls,
      controlsWithEvidence,
      totalAssessments,
      passedAssessments,
      totalEvidence,
      openRisks,
      openIncidents,
    },
  };
}

module.exports = { getSummary };
