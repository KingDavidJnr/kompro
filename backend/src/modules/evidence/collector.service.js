/**
 * Evidence collector service.
 *
 * Turns configured CollectorConfig rows into Evidence via the connector
 * framework, attributes each run in the audit trail, and schedules recurring
 * runs. Secrets are decrypted from the CollectorConfig row and passed to the
 * connector, so credentials never leave the database unencrypted.
 */

const prisma = require('../../lib/prisma');
const { recordAudit } = require('../audit/audit.service');
const { createEvidence } = require('../evidence/evidence.service');
const { getCollector } = require('./collectors');
const { encryptJSON, decryptJSON } = require('../../lib/crypto');
const emailService = require('../../lib/email');
const config = require('../../config');
const { NotFoundError, ValidationError } = require('../../utils/errors');

/**
 * Lists all collector configurations (no secrets are returned).
 * @returns {Promise<Array>} CollectorConfig rows.
 */
async function listCollectors() {
  return prisma.collectorConfig.findMany({ orderBy: { createdAt: 'desc' } });
}

/**
 * Creates a collector configuration. Secrets are encrypted at rest.
 * @param {object} input - { name, description, type, enabled, cadenceMinutes, params, secrets }.
 * @returns {Promise<object>} The created CollectorConfig.
 * @throws {ValidationError} When the collector type is unknown.
 */
async function createCollector({ name, description, type, enabled, cadenceMinutes, params, secrets }) {
  getCollector(type); // throws if the type is not registered
  const cadence = cadenceMinutes || 360;
  const now = Date.now();
  return prisma.collectorConfig.create({
    data: {
      name,
      description: description || null,
      type,
      enabled: enabled === true,
      cadenceMinutes: cadence,
      params: params || undefined,
      secrets: secrets ? encryptJSON(secrets) : null,
      nextRunAt: enabled === true ? new Date(now + cadence * 60000) : null,
    },
  });
}

/**
 * Notifies admins when a collector run fails (best effort).
 * @param {object} collectorConfig - The failing collector.
 * @param {Error} err - The failure.
 * @returns {Promise<void>}
 */
async function notifyCollectorFailure(collectorConfig, err) {
  if (!config.smtp.host) return;
  try {
    const admins = await prisma.user.findMany({
      where: { role: { name: 'admin' }, active: true },
      select: { email: true },
    });
    for (const admin of admins) {
      await emailService.sendNotification({
        to: admin.email,
        heading: `Evidence collector "${collectorConfig.name}" failed`,
        paragraphs: [
          `The collector failed during its last run: ${err.message}`,
          'Review the audit log for full details.',
        ],
        buttonText: 'Open audit log',
        buttonUrl: `${config.appUrl}/audit`,
      });
    }
  } catch (notifyErr) {
    // Notification is best-effort; never let it mask the original failure.
    console.error('Failed to notify collector failure:', notifyErr.message);
  }
}

/**
 * Runs a single collector: invokes its connector, ingests the resulting
 * evidence, records the run in the audit trail, and updates run status.
 * @param {object} collectorConfig - CollectorConfig row.
 * @returns {Promise<object>} { status, added, error? }.
 */
async function ingestEvidence(collectorConfig) {
  const collector = getCollector(collectorConfig.type);
  const params = collectorConfig.params || {};
  const secrets = collectorConfig.secrets ? decryptJSON(collectorConfig.secrets) : {};

  let items = [];
  try {
    items = await collector.collect({ prisma, params, secrets });
  } catch (err) {
    await prisma.collectorConfig.update({
      where: { id: collectorConfig.id },
      data: {
        lastRunAt: new Date(),
        lastStatus: 'error',
        lastError: err.message,
        nextRunAt: new Date(Date.now() + collectorConfig.cadenceMinutes * 60000),
      },
    });
    await recordAudit({
      actorId: null,
      action: 'collect',
      entity: 'evidence',
      entityId: collectorConfig.id,
      after: { collector: collectorConfig.name, status: 'error', error: err.message },
    });
    await notifyCollectorFailure(collectorConfig, err);
    return { status: 'error', added: 0, error: err.message };
  }

  let added = 0;
  for (const item of items) {
    await createEvidence({
      title: item.title,
      description: item.description || null,
      source: 'automated_check',
      content: item.content || null,
      collectedAt: new Date(),
      controlId: item.controlId || null,
      policyId: item.policyId || null,
      collectorId: collectorConfig.id,
      uploadedById: null,
    });
    added += 1;
  }

  await prisma.collectorConfig.update({
    where: { id: collectorConfig.id },
    data: {
      lastRunAt: new Date(),
      lastStatus: 'success',
      lastError: null,
      nextRunAt: new Date(Date.now() + collectorConfig.cadenceMinutes * 60000),
    },
  });
  await recordAudit({
    actorId: null,
    action: 'collect',
    entity: 'evidence',
    entityId: collectorConfig.id,
    after: { collector: collectorConfig.name, status: 'success', added },
  });
  return { status: 'success', added };
}

/**
 * Triggers an immediate run of a collector by id.
 * @param {string} id - CollectorConfig id.
 * @returns {Promise<object>} The ingestion result.
 * @throws {NotFoundError} When the collector does not exist.
 */
async function runCollectorNow(id) {
  const collectorConfig = await prisma.collectorConfig.findUnique({ where: { id } });
  if (!collectorConfig) {
    throw new NotFoundError('Collector not found');
  }
  return ingestEvidence(collectorConfig);
}

/**
 * Runs every enabled collector whose next run is due. Intended to be called on
 * a recurring timer by the collector runner.
 * @returns {Promise<Array>} Ingestion results.
 */
async function runDueCollectors() {
  const now = new Date();
  const due = await prisma.collectorConfig.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
  });
  const results = [];
  for (const collectorConfig of due) {
    results.push(await ingestEvidence(collectorConfig));
  }
  return results;
}

module.exports = {
  listCollectors,
  createCollector,
  ingestEvidence,
  runCollectorNow,
  runDueCollectors,
};
