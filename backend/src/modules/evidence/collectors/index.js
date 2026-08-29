/**
 * Collector registry.
 *
 * A collector is a pluggable adapter that produces normalized evidence items
 * from some external or internal source. Each module under
 * src/modules/evidence/collectors exports { type, collect } where collect(ctx)
 * returns an array of items: { title, description?, content?, controlId?,
 * policyId? }. Connectors that need credentials read them from ctx.secrets,
 * which is decrypted from the CollectorConfig row by the ingestion service.
 */

const sqlCollector = require('./sql');
const httpCollector = require('./http');
const fileCollector = require('./file');

const REGISTRY = {
  sql: sqlCollector,
  http: httpCollector,
  file: fileCollector,
};

/**
 * Resolves a collector implementation by its registered type.
 * @param {string} type - Collector type identifier.
 * @returns {object} The collector module ({ type, collect }).
 * @throws {Error} When the type is not registered.
 */
function getCollector(type) {
  const collector = REGISTRY[type];
  if (!collector) {
    throw new Error(`Unknown collector type: ${type}`);
  }
  return collector;
}

module.exports = { getCollector, REGISTRY };
