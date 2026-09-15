/**
 * Assessment business logic.
 *
 * An assessment evaluates a specific control against a specific framework
 * requirement. It has two phases:
 *
 *   1. Schedule (status: pending)  — assign assessor, set due date, link to
 *      the requirement and the control already mapped to that requirement.
 *
 *   2. Complete (status: complete) — assessor records result, notes, evidence
 *      reviewed, and the actual assessment date.
 *
 * Result is nullable until the assessment is completed.
 */

const prisma = require('../../lib/prisma');
const emailService = require('../../lib/email');
const config = require('../../config');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const ASSESSMENT_RESULTS = ['satisfied', 'partially_satisfied', 'unsatisfied', 'needs_review'];
const ASSESSMENT_STATUSES = ['pending', 'in_progress', 'complete'];

const INCLUDE_FULL = {
  control: { select: { id: true, title: true, status: true, category: true } },
  framework: { select: { id: true, name: true } },
  requirement: { select: { id: true, code: true, title: true } },
  assessor: { select: { id: true, name: true, email: true } },
  evidenceLinks: { include: { evidence: { select: { id: true, title: true, source: true, status: true } } } },
};

async function listAssessments({ page = 1, pageSize = DEFAULT_PAGE_SIZE, controlId, frameworkId, requirementId, status, result } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const where = {};
  if (controlId) where.controlId = controlId;
  if (frameworkId) where.frameworkId = frameworkId;
  if (requirementId) where.requirementId = requirementId;
  if (status) where.status = status;
  if (result) where.result = result;

  const [total, assessments] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        control: { select: { id: true, title: true, category: true } },
        framework: { select: { id: true, name: true } },
        requirement: { select: { id: true, code: true, title: true } },
        assessor: { select: { id: true, name: true, email: true } },
        _count: { select: { evidenceLinks: true } },
      },
    }),
  ]);

  return { assessments, total, page: safePage, pageSize: safeSize };
}

async function getAssessment(id) {
  const assessment = await prisma.assessment.findUnique({ where: { id }, include: INCLUDE_FULL });
  if (!assessment) throw new NotFoundError('Assessment not found');
  return assessment;
}

/**
 * Returns the controls already mapped to a specific requirement.
 * Used by the frontend to restrict the control picker.
 */
async function getControlsForRequirement(requirementId) {
  const mappings = await prisma.mapping.findMany({
    where: { requirementId },
    include: { control: { select: { id: true, title: true, category: true, status: true } } },
  });
  return mappings.map((m) => m.control);
}

async function replaceEvidenceLinks(assessmentId, evidenceIds) {
  const found = await prisma.evidence.findMany({ where: { id: { in: evidenceIds } } });
  if (found.length !== evidenceIds.length) {
    throw new ValidationError('One or more evidence records were not found');
  }
  await prisma.$transaction([
    prisma.assessmentEvidence.deleteMany({ where: { assessmentId } }),
    prisma.assessmentEvidence.createMany({
      data: evidenceIds.map((evidenceId) => ({ assessmentId, evidenceId })),
    }),
  ]);
}

async function notifyAssessmentAssigned(assessment) {
  if (!assessment.assessor || !config.smtp.host) return;
  const reqLabel = assessment.requirement
    ? `${assessment.requirement.code ? assessment.requirement.code + ' — ' : ''}${assessment.requirement.title}`
    : null;
  const dueText = assessment.dueDate
    ? `This assessment is due by ${new Date(assessment.dueDate).toLocaleDateString()}.`
    : 'Please complete it at your earliest convenience.';
  try {
    await emailService.sendNotification({
      to: assessment.assessor.email,
      heading: `You've been assigned an assessment on ${config.orgName}`,
      paragraphs: [
        `Hi ${assessment.assessor.name || 'there'},`,
        `You have been assigned to assess the control "${assessment.control.title}"${reqLabel ? ` against requirement "${reqLabel}"` : ''}${assessment.framework ? ` (${assessment.framework.name})` : ''}.`,
        dueText,
      ],
    });
  } catch (err) {
    console.error(`Failed to send assessment assignment email: ${err.message}`);
  }
}

/**
 * Creates a scheduled assessment (Phase 1).
 * result is not required -- it is recorded when completing the assessment.
 */
async function createAssessment({ controlId, frameworkId, requirementId, assessorId, dueDate }) {
  if (!controlId) throw new ValidationError('controlId is required');

  const control = await prisma.control.findUnique({ where: { id: controlId } });
  if (!control) throw new ValidationError('Control not found');

  if (frameworkId) {
    const framework = await prisma.framework.findUnique({ where: { id: frameworkId } });
    if (!framework) throw new ValidationError('Framework not found');
  }

  if (requirementId) {
    const req = await prisma.frameworkRequirement.findUnique({ where: { id: requirementId } });
    if (!req) throw new ValidationError('Requirement not found');
    // Confirm this control is mapped to the requirement.
    const mapping = await prisma.mapping.findUnique({
      where: { requirementId_controlId: { requirementId, controlId } },
    });
    if (!mapping) throw new ValidationError('This control is not mapped to the selected requirement');
  }

  if (assessorId) {
    const assessor = await prisma.user.findUnique({ where: { id: assessorId } });
    if (!assessor) throw new ValidationError('Assessor not found');
  }

  const assessment = await prisma.assessment.create({
    data: {
      controlId,
      frameworkId: frameworkId || null,
      requirementId: requirementId || null,
      assessorId: assessorId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending',
      result: null,
    },
    include: INCLUDE_FULL,
  });

  await notifyAssessmentAssigned(assessment);
  return assessment;
}

/**
 * Updates an assessment. Handles both in-progress status updates
 * and final completion (recording result, notes, evidence, date).
 */
async function updateAssessment(id, { status, result, notes, evidenceIds, assessmentDate, assessorId, dueDate }) {
  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Assessment not found');

  if (status && !ASSESSMENT_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status. Allowed: ${ASSESSMENT_STATUSES.join(', ')}`);
  }
  if (result && !ASSESSMENT_RESULTS.includes(result)) {
    throw new ValidationError(`Invalid result. Allowed: ${ASSESSMENT_RESULTS.join(', ')}`);
  }
  // Completing requires a result.
  if (status === 'complete' && !result && !existing.result) {
    throw new ValidationError('A result is required to complete an assessment');
  }

  const data = {};
  if (status) data.status = status;
  if (result) data.result = result;
  if (notes !== undefined) data.notes = notes;
  if (assessmentDate !== undefined) data.assessmentDate = assessmentDate ? new Date(assessmentDate) : null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  if (assessorId !== undefined) {
    if (assessorId) {
      const assessor = await prisma.user.findUnique({ where: { id: assessorId } });
      if (!assessor) throw new ValidationError('Assessor not found');
    }
    data.assessorId = assessorId || null;
  }

  // Auto-set assessmentDate when completing.
  if (status === 'complete' && !data.assessmentDate && !existing.assessmentDate) {
    data.assessmentDate = new Date();
  }

  await prisma.assessment.update({ where: { id }, data });

  if (Array.isArray(evidenceIds)) {
    await replaceEvidenceLinks(id, evidenceIds);
  }

  if (assessorId !== undefined && assessorId && assessorId !== existing.assessorId) {
    const fresh = await getAssessment(id);
    await notifyAssessmentAssigned(fresh);
  }

  return getAssessment(id);
}

async function deleteAssessment(id) {
  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Assessment not found');
  await prisma.assessment.delete({ where: { id } });
  return true;
}

module.exports = {
  listAssessments,
  getAssessment,
  getControlsForRequirement,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  ASSESSMENT_RESULTS,
  ASSESSMENT_STATUSES,
};
