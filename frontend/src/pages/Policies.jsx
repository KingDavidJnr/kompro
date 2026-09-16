import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, TableSkeleton, statusColor, UserSelect } from '../components/ui';
import { PlusIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';
import { useListState, applyList, FilterBar, FilterSelect, PaginationBar } from '../components/listUtils';

const STATUSES = ['draft', 'active', 'retired'];

export default function Policies() {
  const { data, loading, refetch, setData } = useGet('/policies');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const policies = data?.policies || [];

  const list = useListState(50);

  const { filtered, paginated, totalPages, safePage } = applyList(
    policies,
    list,
    (p, q, filters) => {
      if (filters.status && p.status !== filters.status) return false;
      return !q || p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)) || (p.owner && p.owner.toLowerCase().includes(q));
    }
  );

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', status: 'draft', owner: '', version: '1.0' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    if (!modal.version?.trim()) {
      setError('Version label is required (e.g. "1.0").');
      return;
    }
    try {
      const res = await api.post('/policies', { ...modal, version: modal.version.trim() });
      const created = res.data.data.policy;
      setData((prev) => ({ ...prev, policies: [...(prev?.policies || []), created] }));
      setModal(null);
      // Navigate to the detail page so the user can add content.
      navigate(`/policies/${created.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Policies"
        description="Organization rules and requirements, with versioning and review workflows."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv('policies.csv', [
              { key: '_row_num', label: '#' },
              { key: 'title', label: 'Title' },
              { key: 'owner', label: 'Owner' },
              { key: 'version', label: 'Version' },
              { key: 'status', label: 'Status' },
            ], filtered)}>
              <DocumentIcon className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" /> New policy
            </Button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card>
        <FilterBar search={list.search} onSearch={list.setSearch} totalLabel="policy" filteredCount={filtered.length} hasFilters={list.hasFilters} onReset={list.reset}>
          <FilterSelect value={list.filters.status || ''} onChange={(e) => list.setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {['draft', 'active', 'retired'].map((s) => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
        </FilterBar>
        {loading ? (
          <TableSkeleton columns={7} />
        ) : (
          <Table
            numbered
            onRowClick={(p) => navigate(`/policies/${p.id}`)}
            rowClassName="cursor-pointer"
            columns={[
              { key: 'title', label: 'Title', render: (p) => <span className="font-medium text-slate-900">{p.title}</span> },
              { key: 'description', label: 'Description', render: (p) => <span className="text-slate-500 text-sm">{p.description || '—'}</span> },
              { key: 'owner', label: 'Owner', render: (p) => <span className="text-slate-500">{p.owner || '—'}</span> },
              { key: 'version', label: 'Version', render: (p) => <Badge color="neutral">v{p.version}</Badge> },
              { key: 'status', label: 'Status', render: (p) => <Badge color={statusColor(p.status)}>{p.status}</Badge> },
              {
                key: 'compliance',
                label: 'Compliance',
                render: (p) => {
                  const ev = p.evaluations?.[0];
                  if (!ev) return <span className="text-xs text-slate-300">Not evaluated</span>;
                  const color = ev.result === 'pass' ? 'success' : ev.result === 'partial' ? 'warning' : ev.result === 'fail' ? 'danger' : 'neutral';
                  const label = ev.result === 'pass' ? `Compliant ${ev.score}%` : ev.result === 'partial' ? `Partial ${ev.score}%` : ev.result === 'fail' ? `Non-compliant ${ev.score}%` : 'N/A';
                  return <Badge color={color}>{label}</Badge>;
                },
              },
            ]}
            rows={paginated}
            empty="No policies yet. Click New policy to create one."
          />
        )}
      </Card>

      <PaginationBar page={list.page} setPage={list.setPage} pageSize={list.pageSize} setPageSize={list.setPageSize} totalPages={totalPages} safePage={safePage} filteredCount={filtered.length} />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title="New policy"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save}>Create</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Title" required>
            <input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} placeholder="e.g. Information Security Policy" />
          </Field>
          <Field label="Description" hint="Short summary shown in the policies list." optional>
            <input className="input" value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} placeholder="What this policy covers" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Initial version" hint='e.g. "1.0" or "2.1.3"' required>
              <input
                required
                className="input"
                value={modal?.version || ''}
                onChange={(e) => setModal({ ...modal, version: e.target.value })}
                placeholder="1.0"
              />
            </Field>
            <Field label="Status" required>
              <select className="input" value={modal?.status || 'draft'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Owner" optional>
            <UserSelect value={modal?.owner || null} onChange={(v) => setModal({ ...modal, owner: v })} />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
