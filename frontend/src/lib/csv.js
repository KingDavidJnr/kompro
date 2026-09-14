import api from './api';

/**
 * Export an array of objects to a CSV file and trigger a browser download.
 * After the download, an audit log entry is recorded on the server so the
 * export is captured in the audit trail.
 *
 * @param {string} filename - The download filename (e.g. "controls.csv").
 * @param {Array<{key: string, label: string}>} columns - Column definitions.
 *   Each entry maps a `key` (used to read from each row) to a human-readable
 *   `label` (used as the CSV header). If a `format` function is provided it
 *   will be called with the row value and should return a string.
 * @param {Array<object>} rows - The data rows to export.
 * @param {string} [entity] - Entity name for the audit log (e.g. "control").
 *   Defaults to the filename without extension.
 */
export function exportCsv(filename, columns, rows, entity) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row, i) =>
    columns.map((c) => {
      if (c.key === '_row_num') return i + 1;
      const val = c.format ? c.format(row) : row[c.key];
      return escape(val);
    }).join(',')
  ).join('\n');

  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Record the export in the audit log (fire-and-forget).
  const auditEntity = entity || filename.replace(/\.csv$/i, '').replace(/-/g, '_');
  api.post('/audit/export-log', { entity: auditEntity, filename, rowCount: rows.length }).catch(() => {});
}
