/**
 * Policy-as-Code Rule Engine
 *
 * Evaluates a policy's `rules` JSON against live compliance data
 * (evidence, controls, assessments) and produces a structured result.
 *
 * Rule schema:
 * {
 *   "match": "all" | "any",   // AND / OR across conditions (default: "all")
 *   "conditions": [
 *     {
 *       "field":  string,     // what to check (see FIELD_CATALOGUE below)
 *       "op":     string,     // operator: eq, neq, gte, lte, gt, lt, contains, exists, notExists
 *       "value":  any         // expected value to compare against
 *     }
 *   ]
 * }
 *
 * Field catalogue:
 *   evidence.count              - total evidence linked to this policy
 *   evidence.accepted.count     - evidence with status "accepted"
 *   evidence.source             - any evidence has this source value
 *   evidence.status             - any evidence has this status value
 *   evidence.hasFile            - any evidence has a file attachment (true/false)
 *   evidence.collectedWithin    - most recent evidence collected within N days
 *   control.count               - distinct controls linked via evidence
 *   control.status              - any linked control has this status
 *   control.implemented.count   - controls with status "implemented"
 *   assessment.count            - total assessments across linked controls
 *   assessment.result           - any assessment has this result
 *   assessment.satisfied.count  - assessments with result "satisfied"
 *   assessment.latestResult     - the most recent assessment result
 *   policy.hasContent           - policy has written content (true/false)
 *   policy.hasFile              - policy has a file attachment (true/false)
 *   policy.version              - policy version string
 *   policy.status               - policy status (draft/active/retired)
 */

const SUPPORTED_OPS = ['eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'contains', 'exists', 'notExists'];

/**
 * Evaluates a single condition against the collected context data.
 * @param {object} condition - { field, op, value }
 * @param {object} ctx - Collected data snapshot for this policy.
 * @returns {{ passed: boolean, actual: any }}
 */
function evaluateCondition(condition, ctx) {
  const { field, op, value } = condition;
  let actual;

  switch (field) {
    // Evidence fields
    case 'evidence.count':
      actual = ctx.evidence.total;
      break;
    case 'evidence.accepted.count':
      actual = ctx.evidence.acceptedCount;
      break;
    case 'evidence.source':
      actual = ctx.evidence.sources;
      break;
    case 'evidence.status':
      actual = ctx.evidence.statuses;
      break;
    case 'evidence.hasFile':
      actual = ctx.evidence.hasFile;
      break;
    case 'evidence.collectedWithin':
      actual = ctx.evidence.daysSinceLatest;
      break;

    // Control fields
    case 'control.count':
      actual = ctx.controls.total;
      break;
    case 'control.status':
      actual = ctx.controls.statuses;
      break;
    case 'control.implemented.count':
      actual = ctx.controls.implementedCount;
      break;

    // Assessment fields
    case 'assessment.count':
      actual = ctx.assessments.total;
      break;
    case 'assessment.result':
      actual = ctx.assessments.results;
      break;
    case 'assessment.satisfied.count':
      actual = ctx.assessments.satisfiedCount;
      break;
    case 'assessment.latestResult':
      actual = ctx.assessments.latestResult;
      break;

    // Policy fields
    case 'policy.hasContent':
      actual = ctx.policy.hasContent;
      break;
    case 'policy.hasFile':
      actual = ctx.policy.hasFile;
      break;
    case 'policy.version':
      actual = ctx.policy.version;
      break;
    case 'policy.status':
      actual = ctx.policy.status;
      break;

    default:
      return { passed: false, actual: null, error: `Unknown field: ${field}` };
  }

  const passed = applyOp(op, actual, value);
  return { passed, actual };
}

/**
 * Applies a comparison operator.
 * For array actuals (like sources/statuses/results), checks if the value
 * appears anywhere in the array.
 */
function applyOp(op, actual, expected) {
  // Existence checks.
  if (op === 'exists') return actual !== null && actual !== undefined && actual !== false && actual !== 0 && actual !== '';
  if (op === 'notExists') return actual === null || actual === undefined || actual === false || actual === 0 || actual === '';

  // For array values, "eq" / "contains" means "includes".
  if (Array.isArray(actual)) {
    if (op === 'eq' || op === 'contains') return actual.includes(expected);
    if (op === 'neq') return !actual.includes(expected);
    // For numeric arrays, fall through to numeric comparisons on .length
    return false;
  }

  switch (op) {
    case 'eq':      return actual === expected || String(actual) === String(expected);
    case 'neq':     return actual !== expected && String(actual) !== String(expected);
    case 'gte':     return Number(actual) >= Number(expected);
    case 'lte':     return Number(actual) <= Number(expected);
    case 'gt':      return Number(actual) > Number(expected);
    case 'lt':      return Number(actual) < Number(expected);
    case 'contains':
      return typeof actual === 'string' && actual.toLowerCase().includes(String(expected).toLowerCase());
    default:        return false;
  }
}

/**
 * Validates a rules object and returns a list of errors.
 * @param {object} rules - The parsed rules JSON.
 * @returns {string[]} Array of validation error messages (empty if valid).
 */
function validateRules(rules) {
  const errors = [];
  if (!rules || typeof rules !== 'object') {
    errors.push('rules must be a JSON object');
    return errors;
  }
  if (rules.match && !['all', 'any'].includes(rules.match)) {
    errors.push('"match" must be "all" or "any"');
  }
  if (!Array.isArray(rules.conditions)) {
    errors.push('"conditions" must be an array');
    return errors;
  }
  if (rules.conditions.length === 0) {
    errors.push('"conditions" must contain at least one rule');
  }
  rules.conditions.forEach((c, i) => {
    if (!c.field) errors.push(`conditions[${i}]: "field" is required`);
    if (!c.op) errors.push(`conditions[${i}]: "op" is required`);
    if (c.op && !SUPPORTED_OPS.includes(c.op)) {
      errors.push(`conditions[${i}]: unsupported op "${c.op}". Allowed: ${SUPPORTED_OPS.join(', ')}`);
    }
    if (c.value === undefined && !['exists', 'notExists'].includes(c.op)) {
      errors.push(`conditions[${i}]: "value" is required for op "${c.op}"`);
    }
  });
  return errors;
}

/**
 * Collects all context data for a policy from the database.
 * @param {object} prisma - Prisma client.
 * @param {object} policy - Policy record (with filePath, content, status, version).
 * @returns {object} Context snapshot used by the evaluator.
 */
async function collectContext(prisma, policy) {
  // Fetch all evidence linked to this policy (both FK and join table).
  const evidenceRows = await prisma.evidence.findMany({
    where: {
      OR: [
        { policyId: policy.id },
        { policies: { some: { policyId: policy.id } } },
      ],
    },
    select: {
      id: true,
      source: true,
      status: true,
      filePath: true,
      collectedAt: true,
      controlId: true,
      controls: { select: { controlId: true } },
    },
  });

  // Evidence stats.
  const evidenceSources = [...new Set(evidenceRows.map((e) => e.source).filter(Boolean))];
  const evidenceStatuses = [...new Set(evidenceRows.map((e) => e.status).filter(Boolean))];
  const acceptedCount = evidenceRows.filter((e) => e.status === 'accepted').length;
  const hasFile = evidenceRows.some((e) => !!e.filePath);

  // Most recent collection date.
  let daysSinceLatest = null;
  const withDates = evidenceRows.filter((e) => e.collectedAt).map((e) => e.collectedAt);
  if (withDates.length > 0) {
    const latest = new Date(Math.max(...withDates.map((d) => new Date(d).getTime())));
    daysSinceLatest = Math.floor((Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Collect all control IDs linked via evidence.
  const controlIdSet = new Set();
  evidenceRows.forEach((e) => {
    if (e.controlId) controlIdSet.add(e.controlId);
    e.controls.forEach((c) => controlIdSet.add(c.controlId));
  });
  const controlIds = [...controlIdSet];

  // Fetch control records.
  const controlRows = controlIds.length
    ? await prisma.control.findMany({ where: { id: { in: controlIds } }, select: { id: true, status: true } })
    : [];
  const controlStatuses = [...new Set(controlRows.map((c) => c.status))];
  const implementedCount = controlRows.filter((c) => c.status === 'implemented').length;

  // Fetch latest assessment per control.
  const assessmentRows = controlIds.length
    ? await prisma.assessment.findMany({
        where: { controlId: { in: controlIds } },
        orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, controlId: true, result: true, assessmentDate: true, createdAt: true },
      })
    : [];

  const assessmentResults = assessmentRows.map((a) => a.result);
  const satisfiedCount = assessmentRows.filter((a) => a.result === 'satisfied').length;

  // Latest assessment by date.
  let latestResult = null;
  if (assessmentRows.length > 0) {
    const latest = assessmentRows.reduce((best, a) => {
      const aTime = a.assessmentDate ? new Date(a.assessmentDate).getTime() : new Date(a.createdAt).getTime();
      const bTime = best.assessmentDate ? new Date(best.assessmentDate).getTime() : new Date(best.createdAt).getTime();
      return aTime > bTime ? a : best;
    });
    latestResult = latest.result;
  }

  return {
    policy: {
      hasContent: !!(policy.content && policy.content.trim()),
      hasFile: !!policy.filePath,
      version: policy.version,
      status: policy.status,
    },
    evidence: {
      total: evidenceRows.length,
      acceptedCount,
      sources: evidenceSources,
      statuses: evidenceStatuses,
      hasFile,
      daysSinceLatest,
    },
    controls: {
      total: controlRows.length,
      statuses: controlStatuses,
      implementedCount,
    },
    assessments: {
      total: assessmentRows.length,
      results: [...new Set(assessmentResults)],
      satisfiedCount,
      latestResult,
    },
  };
}

/**
 * Evaluates a policy's rules against live compliance data.
 * @param {object} prisma - Prisma client.
 * @param {object} policy - Full policy record.
 * @returns {object} Evaluation result with per-condition detail.
 */
async function evaluatePolicy(prisma, policy) {
  const rules = policy.rules;

  // No rules configured.
  if (!rules || !rules.conditions || rules.conditions.length === 0) {
    return {
      result: 'not_configured',
      score: 0,
      passedCount: 0,
      failedCount: 0,
      totalCount: 0,
      conditions: [],
      evaluatedAt: new Date().toISOString(),
    };
  }

  const ctx = await collectContext(prisma, policy);
  const match = rules.match || 'all';

  const conditionResults = rules.conditions.map((c) => ({
    field: c.field,
    op: c.op,
    value: c.value,
    label: c.label || null,
    ...evaluateCondition(c, ctx),
  }));

  const passedCount = conditionResults.filter((c) => c.passed).length;
  const failedCount = conditionResults.filter((c) => !c.passed).length;
  const totalCount = conditionResults.length;
  const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  let result;
  if (match === 'any') {
    result = passedCount > 0 ? 'pass' : 'fail';
  } else {
    if (passedCount === totalCount) result = 'pass';
    else if (passedCount === 0) result = 'fail';
    else result = 'partial';
  }

  return {
    result,
    score,
    passedCount,
    failedCount,
    totalCount,
    conditions: conditionResults,
    context: ctx,
    evaluatedAt: new Date().toISOString(),
  };
}

module.exports = { evaluatePolicy, validateRules, SUPPORTED_OPS };
