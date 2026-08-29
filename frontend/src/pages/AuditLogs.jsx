import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { PageHeader, Card, Badge, Button, Table, Modal, Spinner, statusColor } from '../components/ui';
import { ClipboardIcon } from '../components/icons';

const ENTITIES = [
  { value: '', label: 'All entities' },
  { value: 'framework', label: 'Framework' },
  { value: 'control', label: 'Control' },
  { value: 'policy', label: 'Policy' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'risk', label: 'Risk' },
  { value: 'incident', label: 'Incident' },
  { value: 'user', label: 'User' },
  { value: 'role', label: 'Role' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'audit', label: 'Audit' },
  { value: 'itsm', label: 'ITSM' },
  { value: 'integration', label: 'Integration' },
];

function buildQuery(filters, page) {
  const qs = new URLSearchParams();
  if (filters.from) qs.set('from', filters.from);
  if (filters.to) qs.set('to', filters.to);
  if (filters.entity) qs.set('entity', filters.entity);
  if (filters.action) qs.set('action', filters.action.trim());
  qs.set('page', String(page));
  qs.set('pageSize', '50');
  return qs.toString();
}

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function AuditLogs() {
  const [filters, setFilters] = useState({ from: '', to: '', entity: '', action: '' });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/audit?${buildQuery(filters, p)}`);
        setRows(res.data.data.entries || []);
        setTotal(res.data.data.total || 0);
        setPage(p);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  function update(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearFilters() {
    setFilters({ from: '', to: '', entity: '', action: '' });
  }

  const exportHref = `/api/audit/export?format=csv&${buildQuery(filters, 1)}`;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Audit logs"
        description="Immutable record of who changed what, when, and the before/after state."
        actions={
          <a href={exportHref}>
            <Button variant="secondary">Export CSV</Button>
          </a>
        }
      />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card className="mb-6 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">From</span>
            <input type="date" className="input" value={filters.from} onChange={(e) => update('from', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">To</span>
            <input type="date" className="input" value={filters.to} onChange={(e) => update('to', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Entity</span>
            <select className="input" value={filters.entity} onChange={(e) => update('entity', e.target.value)}>
              {ENTITIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Action</span>
            <input
              className="input"
              placeholder="e.g. delete, login, seed"
              value={filters.action}
              onChange={(e) => update('action', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={() => load(1)}>Apply filters</Button>
          <Button variant="ghost" onClick={clearFilters}>Clear</Button>
          <span className="ml-auto text-sm text-slate-500">{total} entries</span>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : (
          <Table
            columns={[
              { key: 'createdAt', label: 'When', render: (r) => <span className="whitespace-nowrap text-slate-500">{fmt(r.createdAt)}</span> },
              { key: 'actor', label: 'Actor', render: (r) => <span className="text-slate-700">{r.actor?.email || r.actor?.name || 'system'}</span> },
              { key: 'action', label: 'Action', render: (r) => <Badge color={statusColor(r.action)}>{r.action}</Badge> },
              { key: 'entity', label: 'Entity', render: (r) => <span className="text-slate-700">{r.entity}</span> },
              { key: 'entityId', label: 'ID', render: (r) => <span className="font-mono text-xs text-slate-400">{(r.entityId || '').slice(0, 10)}</span> },
              { key: 'ip', label: 'IP', render: (r) => <span className="text-slate-400">{r.ip || '—'}</span> },
              {
                key: 'actions',
                label: '',
                render: (r) => (
                  <button onClick={() => setDetail(r)} className="rounded-lg px-2 py-1 text-xs font-medium text-charcoal-600 hover:bg-slate-100">
                    Details
                  </button>
                ),
              },
            ]}
            rows={rows}
            empty="No audit entries match these filters."
          />
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</Button>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Audit entry detail"
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="label">Action</p><p className="text-slate-700">{detail.action}</p></div>
              <div><p className="label">Entity</p><p className="text-slate-700">{detail.entity} · {detail.entityId}</p></div>
              <div><p className="label">Actor</p><p className="text-slate-700">{detail.actor?.email || 'system'}</p></div>
              <div><p className="label">IP</p><p className="text-slate-700">{detail.ip || '—'}</p></div>
            </div>
            <div>
              <p className="label">Before</p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{detail.before ? JSON.stringify(detail.before, null, 2) : '—'}</pre>
            </div>
            <div>
              <p className="label">After</p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{detail.after ? JSON.stringify(detail.after, null, 2) : '—'}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
