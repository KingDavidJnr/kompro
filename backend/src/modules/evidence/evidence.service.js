/**
 * Evidence management business logic.
 *
 * Evidence supports the state of a control or policy. It may originate from
 * documentation, policies, manual submissions, integrations, automated checks
 * or infrastructure. Evidence is retained as compliance history and can be
 * linked to a control and/or a policy. Deleting a linked control or policy
 * nullifies the link rather than destroying the evidence record.
 */

const prisma = require('../../lib/prisma');
const storage = require('../../lib/storage');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Allowed originating sources for a piece of evidence.
const EVIDENCE_SOURCES = [
  'documentation',
  'policy',
  'manual',
  'integration',
  'automated_check',
  'infrastructure',
  'other',
];

/**
 * Lists evidence with optional filtering and pagination.
 * @param {object} [opts] - { page, pageSize, controlId, policyId, source }.
 * @returns {object} { evidence, total, page, pageSize }.
 */
async function listEvidence({ page = 1, pageSize = DEFAULT_PAGE_SIZE, controlId, policyId, source } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

  const where = {};
  if (controlId) where.controlId = controlId;
  if (policyId) where.policyId = policyId;
  if (source) where.source = source;

  const [total, evidence] = await Promise.all([
    prisma.evidence.count({ where }),
    prisma.evidence.findMany({
      where,
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: { createdAt: 'desc' },
      include: { control: { select: { id: true, title: true } }, policy: { select: { id: true, title: true } } },
    }),
  ]);

  return { evidence, total, page: safePage, pageSize: safeSize };
}

/**
 * Returns a single evidence record.
 * @param {string} id - Evidence id.
 * @returns {object} Evidence record with control and policy summaries.
 * @throws {NotFoundError} When the evidence does not exist.
 */
async function getEvidence(id) {
  const evidence = await prisma.evidence.findUnique({
    where: { id },
    include: { control: { select: { id: true, title: true } }, policy: { select: { id: true, title: true } } },
  });
  if (!evidence) {
    throw new NotFoundError('Evidence not found');
  }
  return evidence;
}

/**
 * Creates an evidence record, optionally storing an uploaded file.
 * @param {object} input - { title, description, source, content, filePath, collectedAt, controlId, policyId, file }.
 * @param {object} [input.file] - Uploaded file ({ buffer, originalname, mimetype }).
 * @returns {object} Created evidence.
 * @throws {ValidationError} On missing title, invalid source, or unknown control/policy.
 */
async function createEvidence({ title, description, source, content, filePath, collectedAt, controlId, policyId, file }) {
  if (!title) {
    throw new ValidationError('Evidence title is required');
  }
  if (source && !EVIDENCE_SOURCES.includes(source)) {
    throw new ValidationError(`Invalid source. Allowed: ${EVIDENCE_SOURCES.join(', ')}`);
  }

  // Confirm any linked records exist so the relation is valid.
  if (controlId) {
    const control = await prisma.control.findUnique({ where: { id: controlId } });
    if (!control) throw new ValidationError('Linked control not found');
  }
  if (policyId) {
    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new ValidationError('Linked policy not found');
  }

  // A manually supplied filePath (no upload) can still be recorded as-is.
  let storedPath = filePath || null;
  let mimeType = null;

  // When a file buffer is provided, persist it via the active storage driver.
  if (file && file.buffer) {
    storedPath = await storage.upload({
      buffer: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
    });
    mimeType = file.mimetype;
  }

  return prisma.evidence.create({
    data: {
      title,
      description: description || null,
      source: source || null,
      content: content || null,
      filePath: storedPath,
      mimeType,
      collectedAt: collectedAt ? new Date(collectedAt) : null,
      controlId: controlId || null,
      policyId: policyId || null,
    },
    include: { control: { select: { id: true, title: true } }, policy: { select: { id: true, title: true } } },
  });
}

/**
 * Resolves the stored file for an evidence record as a readable stream.
 * @param {string} id - Evidence id.
 * @returns {Promise<{ stream: Readable, contentType: string }>}
 * @throws {NotFoundError} When the evidence or its file is missing.
 */
async function getEvidenceFile(id) {
  const evidence = await prisma.evidence.findUnique({ where: { id } });
  if (!evidence) {
    throw new NotFoundError('Evidence not found');
  }
  if (!evidence.filePath) {
    throw new NotFoundError('This evidence has no file attached');
  }
  return storage.getFile(evidence.filePath, evidence.mimeType);
}

/**
 * Updates an evidence record.
 * @param {string} id - Evidence id.
 * @param {object} input - Updatable fields.
 * @returns {object} Updated evidence.
 * @throws {NotFoundError} When the evidence does not exist.
 * @throws {ValidationError} On invalid source or unknown control/policy.
 */
async function updateEvidence(id, { title, description, source, content, filePath, collectedAt, controlId, policyId }) {
  const existing = await prisma.evidence.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Evidence not found');
  }

  if (source && !EVIDENCE_SOURCES.includes(source)) {
    throw new ValidationError(`Invalid source. Allowed: ${EVIDENCE_SOURCES.join(', ')}`);
  }

  if (controlId !== undefined && controlId !== null) {
    const control = await prisma.control.findUnique({ where: { id: controlId } });
    if (!control) throw new ValidationError('Linked control not found');
  }
  if (policyId !== undefined && policyId !== null) {
    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new ValidationError('Linked policy not found');
  }

  const data = {};
  if (typeof title === 'string') data.title = title;
  if (description !== undefined) data.description = description;
  if (source !== undefined) data.source = source;
  if (content !== undefined) data.content = content;
  if (filePath !== undefined) data.filePath = filePath;
  if (collectedAt !== undefined) data.collectedAt = collectedAt ? new Date(collectedAt) : null;
  if (controlId !== undefined) data.controlId = controlId;
  if (policyId !== undefined) data.policyId = policyId;

  return prisma.evidence.update({
    where: { id },
    data,
    include: { control: { select: { id: true, title: true } }, policy: { select: { id: true, title: true } } },
  });
}

/**
 * Deletes an evidence record.
 * @param {string} id - Evidence id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the evidence does not exist.
 */
async function deleteEvidence(id) {
  const existing = await prisma.evidence.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Evidence not found');
  }
  await prisma.evidence.delete({ where: { id } });
  // Best-effort removal of the underlying file (local or S3).
  if (existing.filePath) {
    await storage.deleteFile(existing.filePath).catch(() => {});
  }
  return true;
}

module.exports = {
  listEvidence,
  getEvidence,
  getEvidenceFile,
  createEvidence,
  updateEvidence,
  deleteEvidence,
  EVIDENCE_SOURCES,
};
