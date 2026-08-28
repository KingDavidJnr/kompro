/**
 * Assessment business logic.
 *
 * An assessment evaluates a control and its supporting evidence, producing a
 * result of satisfied, partially_satisfied, unsatisfied or needs_review. The
 * result is traceable to the control and to the evidence records that support
 * it via the AssessmentEvidence join table.
 */

const prisma = require('../../lib/prisma');
const emailService = require('../../lib/email');
const config = require('../../config');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Allowed assessment outcomes.
const ASSESSMENT_RESULTS = ['satisfied', 'partially_satisfied', 'unsatisfied', 'needs_review'];

/**
 * Lists assessments with optional filtering and pagination.
 * @param {object} [opts] - { page, pageSize, controlId, result }.
 * @returns {object} { assessments, total, page, pageSize }.
 */
async function listAssessments({ page = 1, pageSize = DEFAULT_PAGE_SIZE, controlId, result } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const where = {};
  if (controlId) where.controlId = controlId;
  if (result) where.result = result;

  const [total, assessments] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: { createdAt: 'desc' },
      include: {
        control: { select: { id: true, title: true } },
        assessor: { select: { id: true, name: true, email: true } },
        _count: { select: { evidenceLinks: true } },
      },
    }),
  ]);

  return { assessments, total, page: safePage, pageSize: safeSize };
}

/**
 * Returns a single assessment with its control, assessor and evidence.
 * @param {string} id - Assessment id.
 * @returns {object} Assessment record with relations.
 * @throws {NotFoundError} When the assessment does not exist.
 */
async function getAssessment(id) {
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      control: { select: { id: true, title: true } },
      assessor: { select: { id: true, name: true, email: true } },
      evidenceLinks: { include: { evidence: { select: { id: true, title: true, source: true } } } },
    },
  });
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }
  return assessment;
}

/**
 * Replaces the evidence links for an assessment.
 * @param {string} assessmentId - Assessment id.
 * @param {string[]} evidenceIds - Evidence ids to link.
 * @returns {void}
 */
async function replaceEvidenceLinks(assessmentId, evidenceIds) {
  // Confirm every referenced evidence exists before linking.
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

/**
 * Emails the assigned assessor about a new or updated assessment.
 * @param {object} assessment - Assessment with control and assessor relations.
 * @returns {Promise<void>}
 */
async function notifyAssessmentAssigned(assessment) {
  if (!assessment.assessor || !config.smtp.host) return;
  const dueText = assessment.dueDate
    ? `This assessment is due by ${new Date(assessment.dueDate).toUTCString()}.`
    : 'Please complete it at your earliest convenience.';
  try {
    await emailService.sendNotification({
      to: assessment.assessor.email,
      heading: `You've been assigned an assessment on ${config.orgName}`,
      paragraphs: [
        `Hi ${assessment.assessor.name || 'there'},`,
        `You have been assigned to assess the control "${assessment.control.title}" on ${config.orgName}.`,
        dueText,
      ],
    });
  } catch (err) {
    console.error(`Failed to send assessment assignment email: ${err.message}`);
  }
}

/**
 * Creates an assessment.
 * @param {object} input - { controlId, result, notes, assessorId, evidenceIds, assessmentDate, dueDate }.
 * @returns {object} Created assessment with relations.
 * @throws {ValidationError} On missing control, invalid result, or unknown evidence.
 */
async function createAssessment({ controlId, result, notes, assessorId, evidenceIds, assessmentDate, dueDate }) {
  if (!controlId) {
    throw new ValidationError('controlId is required');
  }
  if (!result) {
    throw new ValidationError('result is required');
  }
  if (!ASSESSMENT_RESULTS.includes(result)) {
    throw new ValidationError(`Invalid result. Allowed: ${ASSESSMENT_RESULTS.join(', ')}`);
  }

  const control = await prisma.control.findUnique({ where: { id: controlId } });
  if (!control) {
    throw new ValidationError('Linked control not found');
  }
  if (assessorId) {
    const assessor = await prisma.user.findUnique({ where: { id: assessorId } });
    if (!assessor) throw new ValidationError('Assessor not found');
  }

  const data = {
    controlId,
    result,
    notes: notes || null,
    assessorId: assessorId || null,
    assessmentDate: assessmentDate ? new Date(assessmentDate) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
  };

  const assessment = await prisma.assessment.create({
    data,
    include: {
      control: { select: { id: true, title: true } },
      assessor: { select: { id: true, name: true, email: true } },
    },
  });

  if (Array.isArray(evidenceIds) && evidenceIds.length) {
    await replaceEvidenceLinks(assessment.id, evidenceIds);
  }

  await notifyAssessmentAssigned(assessment);

  return getAssessment(assessment.id);
}

/**
 * Updates an assessment.
 * @param {string} id - Assessment id.
 * @param {object} input - Updatable fields (including assessorId and dueDate).
 * @returns {object} Updated assessment with relations.
 * @throws {NotFoundError} When the assessment does not exist.
 * @throws {ValidationError} On invalid result or unknown evidence.
 */
async function updateAssessment(id, { result, notes, evidenceIds, assessmentDate, assessorId, dueDate }) {
  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Assessment not found');
  }

  if (result && !ASSESSMENT_RESULTS.includes(result)) {
    throw new ValidationError(`Invalid result. Allowed: ${ASSESSMENT_RESULTS.join(', ')}`);
  }

  const data = {};
  if (result) data.result = result;
  if (notes !== undefined) data.notes = notes;
  if (assessmentDate !== undefined) data.assessmentDate = assessmentDate ? new Date(assessmentDate) : null;
  if (assessorId !== undefined) {
    if (assessorId) {
      const assessor = await prisma.user.findUnique({ where: { id: assessorId } });
      if (!assessor) throw new ValidationError('Assessor not found');
    }
    data.assessorId = assessorId || null;
  }
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  await prisma.assessment.update({ where: { id }, data });

  if (Array.isArray(evidenceIds)) {
    await replaceEvidenceLinks(id, evidenceIds);
  }

  // Notify only when the assignee actually changed.
  if (assessorId !== undefined && assessorId && assessorId !== existing.assessorId) {
    const fresh = await getAssessment(id);
    await notifyAssessmentAssigned(fresh);
  }

  return getAssessment(id);
}

/**
 * Deletes an assessment.
 * @param {string} id - Assessment id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the assessment does not exist.
 */
async function deleteAssessment(id) {
  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Assessment not found');
  }
  await prisma.assessment.delete({ where: { id } });
  return true;
}

module.exports = {
  listAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  ASSESSMENT_RESULTS,
};
