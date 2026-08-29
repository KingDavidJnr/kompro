/**
 * File / directory collector.
 *
 * Reads files already present on the server's filesystem (for example reports
 * dropped into a folder by an external job) and turns each into an evidence
 * item. Needs no external credentials or secrets - the path is configured by
 * the administering team. Content is capped so very large files do not bloat
 * the evidence table.
 *
 * params:
 *   path        {string}  Directory or single file path to read.
 *   pattern     {string}  Glob-like filter for directory mode (default '*').
 *   titleFrom   {string}  'filename' (default) or 'content' (first line).
 *   description {string}  Optional description override.
 *   maxBytes    {number}  Max characters of file content to store (default 100000).
 *   controlId   {string}  Optional literal control id to link.
 *   policyId    {string}  Optional literal policy id to link.
 */

const fs = require('fs');
const path = require('path');

/**
 * Converts a simple glob (* and ? wildcards) to a RegExp.
 * @param {string} pattern - Glob pattern.
 * @returns {RegExp} Equivalent regular expression.
 */
function wildcardToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/**
 * @param {object} ctx - { params }.
 * @returns {Promise<Array>} Normalized evidence items.
 */
async function collect({ params }) {
  if (!params || !params.path) {
    throw new Error('File collector requires params.path');
  }
  if (!fs.existsSync(params.path)) {
    throw new Error(`File collector path does not exist: ${params.path}`);
  }

  const stat = fs.statSync(params.path);
  let files = [];
  if (stat.isDirectory()) {
    const re = wildcardToRegExp(params.pattern || '*');
    files = fs
      .readdirSync(params.path)
      .filter((name) => re.test(name))
      .map((name) => path.join(params.path, name));
  } else {
    files = [params.path];
  }

  const maxBytes = params.maxBytes || 100000;

  return files.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const content = raw.length > maxBytes ? raw.slice(0, maxBytes) : raw;
    const title =
      params.titleFrom === 'content'
        ? content.split('\n')[0].trim() || path.basename(filePath)
        : path.basename(filePath);
    return {
      title,
      description: params.description || `Collected from ${filePath}`,
      content,
      controlId: params.controlId || undefined,
      policyId: params.policyId || undefined,
    };
  });
}

module.exports = { type: 'file', collect };
