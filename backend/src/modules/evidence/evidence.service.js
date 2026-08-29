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
const emailService = require('../../lib/email');
const config = require('../../config');
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
 * Notifies the uploader when their evidence is accepted or rejected.
 * @param {object} evidence - Evidence record (must carry uploadedById).
 * @param {string} status - New status (accepted|rejected).
 * @returns {Promise<void>}
 */
async function notifyEvidenceStatus(evidence, status) {
  if (!evidence.uploadedById || !config.smtp.host) return;
  const uploader = await prisma.user.findUnique({ where: { id: evidence.uploadedById } });
  if (!uploader) return;
  const verb = status === 'accepted' ? 'accepted' : 'rejected';
  try {
    await emailService.sendNotification({
      to: uploader.email,
      heading: `Your evidence was ${verb} on ${config.orgName}`,
      paragraphs: [
        `Hi ${uploader.name || 'there'},`,
        `Your evidence "${evidence.title}" was ${verb} by a ${config.orgName} reviewer.`,
      ],
    });
  } catch (err) {
    console.error(`Failed to send evidence status email: ${err.message}`);
  }
}

/**
 * Creates an evidence record, optionally storing an uploaded file.
 * @param {object} input - { title, description, source, content, filePath, collectedAt, controlId, policyId, file, uploadedById }.
 * @param {object} [input.file] - Uploaded file ({ buffer, originalname, mimetype }).
 * @param {string} [input.uploadedById] - User who submitted the evidence (for notifications).
 * @returns {object} Created evidence.
 * @throws {ValidationError} On missing title, invalid source, or unknown control/policy.
 */
async function createEvidence({ title, description, source, content, filePath, collectedAt, controlId, policyId, collectorId, file, uploadedById }) {
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
      status: 'submitted',
      collectedAt: collectedAt ? new Date(collectedAt) : null,
      controlId: controlId || null,
      policyId: policyId || null,
      collectorId: collectorId || null,
      uploadedById: uploadedById || null,
    },
    include: { control: { select: { id: true, title: true } }, policy: { select: { id: true, title: true } } },
  });
}

/**
 * Requests evidence from a user without an upload.
 * @param {object} input - { title, description, source, controlId, policyId, requestedFromUserId }.
 * @returns {Promise<object>} Created evidence placeholder (status "requested").
 * @throws {ValidationError} On missing title or unknown recipient/control/policy.
 */
async function requestEvidence({ title, description, source, controlId, policyId, requestedFromUserId }) {
  if (!title) {
    throw new ValidationError('Evidence title is required');
  }
  if (!requestedFromUserId) {
    throw new ValidationError('requestedFromUserId is required');
  }
  const recipient = await prisma.user.findUnique({ where: { id: requestedFromUserId } });
  if (!recipient) throw new ValidationError('Recipient user not found');
  if (controlId) {
    const control = await prisma.control.findUnique({ where: { id: controlId } });
    if (!control) throw new ValidationError('Linked control not found');
  }
  if (policyId) {
    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new ValidationError('Linked policy not found');
  }

  const evidence = await prisma.evidence.create({
    data: {
      title,
      description: description || null,
      source: source || null,
      status: 'requested',
      controlId: controlId || null,
      policyId: policyId || null,
      uploadedById: requestedFromUserId,
    },
    include: { control: { select: { id: true, title: true } }, policy: { select: { id: true, title: true } } },
  });

  if (config.smtp.host) {
    const where = evidence.control
      ? ` for control "${evidence.control.title}"`
      : evidence.policy
        ? ` for policy "${evidence.policy.title}"`
        : '';
    try {
      await emailService.sendNotification({
        to: recipient.email,
        heading: `Evidence requested on ${config.orgName}`,
        paragraphs: [
          `Hi ${recipient.name || 'there'},`,
          `You've been asked to provide evidence "${evidence.title}"${where}. Please upload it in Kompro at your earliest convenience.`,
        ],
      });
    } catch (err) {
      console.error(`Failed to send evidence request email: ${err.message}`);
    }
  }

  return evidence;
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
async function updateEvidence(id, { title, description, source, content, filePath, collectedAt, controlId, policyId, status }) {
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
  if (status !== undefined) data.status = status;

  const updated = await prisma.evidence.update({
    where: { id },
    data,
    include: { control: { select: { id: true, title: true } }, policy: { select: { id: true, title: true } } },
  });

  // Notify the uploader when a reviewer accepts or rejects their evidence.
  if (status && status !== existing.status && (status === 'accepted' || status === 'rejected')) {
    await notifyEvidenceStatus({ ...updated, uploadedById: existing.uploadedById }, status);
  }

  return updated;
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
  requestEvidence,
  updateEvidence,
  deleteEvidence,
  EVIDENCE_SOURCES,
};
