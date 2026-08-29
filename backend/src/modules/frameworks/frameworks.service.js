/**
 * Framework, requirement and mapping business logic.
 *
 * Frameworks are collections of requirements. Mappings link a framework
 * requirement to one or more organizational controls, so a single control can
 * contribute to requirements across several frameworks. The organization's
 * underlying controls and assessments are the source of truth; a framework's
 * status is derived from the latest assessment of each mapped control.
 */

const prisma = require('../../lib/prisma');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const { seedFrameworkCatalog } = require('../../../prisma/seed');

/**
 * Aggregates assessment results into a single status.
 * @param {string[]} results - Assessment result values.
 * @returns {string} Derived status, or "not_mapped" when empty.
 */
function aggregateResults(results) {
  if (!results.length) return 'not_mapped';
  if (results.includes('unsatisfied')) return 'unsatisfied';
  if (results.includes('needs_review')) return 'needs_review';
  if (results.includes('partially_satisfied')) return 'partially_satisfied';
  return 'satisfied';
}

/**
 * Lists frameworks with optional enabled filter.
 * @param {object} [opts] - { enabled }.
 * @returns {Array} Framework records with requirement counts.
 */
async function listFrameworks({ enabled } = {}) {
  const where = {};
  if (typeof enabled === 'boolean') where.enabled = enabled;
  return prisma.framework.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { requirements: true } } },
  });
}

/**
 * Returns a framework with its requirements and their control mappings.
 * @param {string} id - Framework id.
 * @returns {object} Framework with requirements and mappings.
 * @throws {NotFoundError} When the framework does not exist.
 */
async function getFramework(id) {
  const framework = await prisma.framework.findUnique({
    where: { id },
    include: {
      requirements: {
        orderBy: { code: 'asc' },
        include: {
          controlMappings: { include: { control: { select: { id: true, title: true, status: true } } } },
        },
      },
    },
  });
  if (!framework) {
    throw new NotFoundError('Framework not found');
  }
  return framework;
}

/**
 * Creates a framework.
 * @param {object} input - { name, description, enabled }.
 * @returns {object} Created framework.
 * @throws {ValidationError} On missing name.
 */
async function createFramework({ name, description, enabled }) {
  if (!name) {
    throw new ValidationError('Framework name is required');
  }
  return prisma.framework.create({
    data: { name, description: description || null, enabled: enabled === true },
  });
}

/**
 * Updates a framework.
 * @param {string} id - Framework id.
 * @param {object} input - { name, description, enabled }.
 * @returns {object} Updated framework.
 * @throws {NotFoundError} When the framework does not exist.
 */
async function updateFramework(id, { name, description, enabled }) {
  const existing = await prisma.framework.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Framework not found');
  }
  const data = {};
  if (typeof name === 'string') data.name = name;
  if (description !== undefined) data.description = description;
  if (typeof enabled === 'boolean') data.enabled = enabled;
  return prisma.framework.update({ where: { id }, data });
}

/**
 * Deletes a framework and its requirements/mappings (cascade).
 * @param {string} id - Framework id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the framework does not exist.
 */
async function deleteFramework(id) {
  const existing = await prisma.framework.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Framework not found');
  }
  await prisma.framework.delete({ where: { id } });
  return true;
}

/**
 * Lists requirements, optionally for one framework.
 * @param {string} [frameworkId] - Filter by framework.
 * @returns {Array} Requirement records with mapping counts.
 */
async function listRequirements(frameworkId) {
  const where = frameworkId ? { frameworkId } : {};
  return prisma.frameworkRequirement.findMany({
    where,
    orderBy: [{ frameworkId: 'asc' }, { code: 'asc' }],
    include: { _count: { select: { controlMappings: true } } },
  });
}

/**
 * Returns a single requirement.
 * @param {string} id - Requirement id.
 * @returns {object} Requirement record with framework and mapping counts.
 * @throws {NotFoundError} When the requirement does not exist.
 */
async function getRequirement(id) {
  const requirement = await prisma.frameworkRequirement.findUnique({
    where: { id },
    include: {
      framework: { select: { id: true, name: true } },
      _count: { select: { controlMappings: true } },
    },
  });
  if (!requirement) {
    throw new NotFoundError('Requirement not found');
  }
  return requirement;
}

/**
 * Creates a requirement under a framework.
 * @param {object} input - { frameworkId, code, title, description }.
 * @returns {object} Created requirement.
 * @throws {ValidationError} On missing framework or title, or unknown framework.
 */
async function createRequirement({ frameworkId, code, title, description }) {
  if (!frameworkId) {
    throw new ValidationError('frameworkId is required');
  }
  if (!title) {
    throw new ValidationError('Requirement title is required');
  }
  const framework = await prisma.framework.findUnique({ where: { id: frameworkId } });
  if (!framework) {
    throw new ValidationError('Framework not found');
  }
  return prisma.frameworkRequirement.create({
    data: { frameworkId, code: code || null, title, description: description || null },
  });
}

/**
 * Updates a requirement.
 * @param {string} id - Requirement id.
 * @param {object} input - { code, title, description }.
 * @returns {object} Updated requirement.
 * @throws {NotFoundError} When the requirement does not exist.
 */
async function updateRequirement(id, { code, title, description }) {
  const existing = await prisma.frameworkRequirement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Requirement not found');
  }
  const data = {};
  if (code !== undefined) data.code = code;
  if (typeof title === 'string') data.title = title;
  if (description !== undefined) data.description = description;
  return prisma.frameworkRequirement.update({ where: { id }, data });
}

/**
 * Deletes a requirement (cascades its mappings).
 * @param {string} id - Requirement id.
 * @returns {boolean} True when deleted.
 * @throws {NotFoundError} When the requirement does not exist.
 */
async function deleteRequirement(id) {
  const existing = await prisma.frameworkRequirement.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Requirement not found');
  }
  await prisma.frameworkRequirement.delete({ where: { id } });
  return true;
}

/**
 * Creates or updates a mapping between a requirement and a control.
 * @param {string} requirementId - Requirement id.
 * @param {object} input - { controlId, notes }.
 * @returns {object} The mapping record.
 * @throws {ValidationError} On missing control or unknown records.
 */
async function createMapping(requirementId, { controlId, notes }) {
  if (!controlId) {
    throw new ValidationError('controlId is required');
  }
  const requirement = await prisma.frameworkRequirement.findUnique({ where: { id: requirementId } });
  if (!requirement) {
    throw new ValidationError('Requirement not found');
  }
  const control = await prisma.control.findUnique({ where: { id: controlId } });
  if (!control) {
    throw new ValidationError('Control not found');
  }
  return prisma.mapping.upsert({
    where: { requirementId_controlId: { requirementId, controlId } },
    update: { notes: notes || null },
    create: { requirementId, controlId, notes: notes || null },
  });
}

/**
 * Deletes a mapping between a requirement and a control.
 * @param {string} requirementId - Requirement id.
 * @param {string} controlId - Control id.
 * @returns {boolean} True when deleted (or already absent).
 */
async function deleteMapping(requirementId, controlId) {
  await prisma.mapping.deleteMany({ where: { requirementId, controlId } });
  return true;
}

/**
 * Derives framework status from the latest assessments of mapped controls.
 * @param {string} frameworkId - Framework id.
 * @returns {object} { framework, status, requirements[] } where each requirement
 *          carries its mapped controls and a derived status.
 * @throws {NotFoundError} When the framework does not exist.
 */
async function deriveFrameworkStatus(frameworkId) {
  const framework = await prisma.framework.findUnique({
    where: { id: frameworkId },
    include: {
      requirements: {
        orderBy: { code: 'asc' },
        include: {
          controlMappings: { include: { control: { select: { id: true, title: true, status: true } } } },
        },
      },
    },
  });
  if (!framework) {
    throw new NotFoundError('Framework not found');
  }

  // Collect every control linked by any requirement in this framework.
  const linkedControls = framework.requirements.flatMap((r) =>
    r.controlMappings.map((m) => m.control)
  );
  const controlIds = [...new Set(linkedControls.map((c) => c.id))];

  // Find the most recent assessment per control.
  const assessments = controlIds.length
    ? await prisma.assessment.findMany({
        where: { controlId: { in: controlIds } },
        orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
      })
    : [];
  const latestByControl = new Map();
  for (const a of assessments) {
    if (!latestByControl.has(a.controlId)) {
      latestByControl.set(a.controlId, a.result);
    }
  }

  const requirements = framework.requirements.map((r) => {
    const mappedControls = r.controlMappings.map((m) => ({
      id: m.control.id,
      title: m.control.title,
      controlStatus: m.control.status,
      latestAssessment: latestByControl.get(m.control.id) || null,
    }));
    const results = mappedControls
      .map((c) => latestByControl.get(c.id))
      .filter(Boolean);
    return {
      requirement: { id: r.id, code: r.code, title: r.title },
      mappedControls,
      status: aggregateResults(results),
    };
  });

  // Framework-level status ignores requirements that have no mapping yet.
  const frameworkStatus = aggregateResults(
    requirements.map((r) => r.status).filter((s) => s !== 'not_mapped')
  );

  return {
    framework: { id: framework.id, name: framework.name, enabled: framework.enabled },
    status: frameworkStatus,
    requirements,
  };
}

/**
 * Computes compliance readiness for a framework.
 *
 * Aggregates the latest assessment of every control mapped to each requirement
 * into a per-requirement status, then derives overall readiness: a percentage
 * of fully satisfied requirements, a status breakdown, and a list of gaps
 * (requirements that are not satisfied) with their linked controls. A
 * requirement is "satisfied" only when every mapped control's latest assessment
 * is satisfied.
 * @param {string} frameworkId - Framework id.
 * @returns {object} { framework, totalRequirements, satisfied, readinessPercent, breakdown, gaps }.
 * @throws {NotFoundError} When the framework does not exist.
 */
async function computeReadiness(frameworkId) {
  const framework = await prisma.framework.findUnique({
    where: { id: frameworkId },
    include: {
      requirements: {
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          controlMappings: {
            select: {
              control: {
                select: {
                  id: true,
                  title: true,
                  assessments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { result: true, createdAt: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!framework) {
    throw new NotFoundError('Framework not found');
  }

  const breakdown = {
    satisfied: 0,
    partially_satisfied: 0,
    unsatisfied: 0,
    needs_review: 0,
    unassessed: 0,
    unmapped: 0,
  };
  const gaps = [];

  for (const req of framework.requirements) {
    const controls = req.controlMappings.map((m) => {
      const latest = m.control.assessments[0] || null;
      return {
        id: m.control.id,
        title: m.control.title,
        latestResult: latest ? latest.result : null,
        assessedAt: latest ? latest.createdAt : null,
      };
    });

    let status;
    if (controls.length === 0) {
      status = 'unmapped';
    } else {
      const results = controls.map((c) => c.latestResult);
      if (results.includes('unsatisfied')) status = 'unsatisfied';
      else if (results.includes('needs_review')) status = 'needs_review';
      else if (results.includes(null)) status = 'unassessed';
      else if (results.includes('partially_satisfied')) status = 'partially_satisfied';
      else status = 'satisfied';
    }

    breakdown[status] += 1;
    if (status !== 'satisfied') {
      gaps.push({
        requirement: { id: req.id, code: req.code, title: req.title, description: req.description },
        status,
        controls,
      });
    }
  }

  const total = framework.requirements.length;
  const readinessPercent = total === 0 ? 0 : Math.round((breakdown.satisfied / total) * 100);

  return {
    framework: { id: framework.id, name: framework.name, enabled: framework.enabled },
    totalRequirements: total,
    satisfied: breakdown.satisfied,
    readinessPercent,
    breakdown,
    gaps,
  };
}

/**
 * (Re)applies the bundled, authoritative framework + requirement catalogs.
 *
 * Delegates to the seed script's idempotent `seedFrameworkCatalog` (upserts
 * each framework and backfills only its missing requirements) and attributes
 * the change to the requesting user. Returns the resulting framework list.
 * @param {string} actorId - User performing the seed (for the audit trail).
 * @returns {Promise<Array>} The full framework list with requirement counts.
 */
async function seedCatalog(actorId) {
  await seedFrameworkCatalog({ actorId });
  return listFrameworks({});
}

module.exports = {
  listFrameworks,
  getFramework,
  createFramework,
  updateFramework,
  deleteFramework,
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  createMapping,
  deleteMapping,
  deriveFrameworkStatus,
  computeReadiness,
  seedCatalog,
};
