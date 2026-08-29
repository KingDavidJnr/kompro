/**
 * SQL collector.
 *
 * Runs a read-only SQL query against the application's own PostgreSQL database
 * (using the existing Prisma connection, so it requires no external credentials
 * or secrets) and turns each row into an evidence item. This proves the entire
 * collection loop end to end without any third-party system.
 *
 * params:
 *   sql              {string}  Query text. Column names become row keys.
 *   titleColumn      {string}  Column used for the evidence title (default 'title').
 *   descriptionColumn {string} Column used for the description (default 'description').
 *   controlIdColumn  {string}  Column whose value is a Control id to link (optional).
 *   policyIdColumn   {string}  Column whose value is a Policy id to link (optional).
 *   defaultTitle     {string}  Fallback title when the title column is null (optional).
 *   includeRowJson   {boolean} Store the full row as evidence content (optional).
 */

/**
 * @param {object} ctx - { prisma, params, secrets }.
 * @returns {Promise<Array>} Normalized evidence items.
 */
async function collect({ prisma, params }) {
  const sql = params && params.sql;
  if (!sql || typeof sql !== 'string') {
    throw new Error('SQL collector requires params.sql');
  }

  const rows = await prisma.$queryRawUnsafe(sql);
  const titleColumn = params.titleColumn || 'title';
  const descriptionColumn = params.descriptionColumn || 'description';
  const controlIdColumn = params.controlIdColumn || null;
  const policyIdColumn = params.policyIdColumn || null;

  return (rows || []).map((row) => ({
    title: String(row[titleColumn] != null ? row[titleColumn] : params.defaultTitle || 'Collected evidence'),
    description: row[descriptionColumn] != null ? String(row[descriptionColumn]) : null,
    content: params.includeRowJson ? JSON.stringify(row) : undefined,
    controlId: controlIdColumn ? String(row[controlIdColumn]) : undefined,
    policyId: policyIdColumn ? String(row[policyIdColumn]) : undefined,
  }));
}

module.exports = { type: 'sql', collect };
