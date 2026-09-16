import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, Drawer, statusColor, Spinner, TableSkeleton, UserSelect } from '../components/ui';
import { AddList } from '../components/SubList';
import { PlusIcon, PencilIcon, TrashIcon, ClipboardIcon, EyeIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';
import { useListState, applyList, FilterBar, FilterSelect, PaginationBar } from '../components/listUtils';

function IncidentDrawer({ incident, onClose, onChanged }) {
  const detail = useGet(`/incidents/${incident.id}`);
  const inc = detail.data?.incident || incident;

  async function addAction(body) {
    try {
      await api.post(`/incidents/${incident.id}/actions`, body);
      detail.refetch();
      onChanged();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  }

  return (
    <Drawer open onClose={onClose} title={inc.title} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {detail.loading ? (
        <Spinner className="h-8 w-8" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={statusColor(inc.status)}>{inc.status}</Badge>
            <Badge color={inc.severity === 'high' ? 'danger' : inc.severity === 'medium' ? 'warning' : 'neutral'}>{inc.severity}</Badge>
            {inc.classification && <Badge color="brand">{inc.classification}</Badge>}
            {inc.owner && <Badge color="neutral">{inc.owner}</Badge>}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Response actions</h4>
            <AddList
              loading={false}
              items={inc.actions}
              onAdd={addAction}
              fields={[{ key: 'action', label: 'Action' }, { key: 'status', label: 'Status', type: 'select', options: ['todo', 'in_progress', 'done'] }, { key: 'owner', label: 'Owner', type: 'user' }]}
              render={(a) => (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{a.action}</span>
                  <Badge color={statusColor(a.status)}>{a.status}</Badge>
                </div>
              )}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function Incidents() {
  const { data, loading, refetch, silentRefetch, setData } = useGet('/incidents?pageSize=100');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const incidents = data?.incidents || [];
  const list = useListState(50);
  const { filtered, paginated, totalPages, safePage } = applyList(
    incidents,
    list,
    (i, q, filters) => {
      if (filters.severity && i.severity !== filters.severity) return false;
      if (filters.status && i.status !== filters.status) return false;
      return !q || i.title.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q) || (i.classification || '').toLowerCase().includes(q);
    }
  );

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', category: '', severity: 'low', classification: '', status: 'open', owner: '' });
  }
  function openEdit(i) {
    setError(null);
    setModal({ id: i.id, title: i.title, description: i.description || '', category: i.category || '', severity: i.severity, classification: i.classification || '', status: i.status, owner: i.owner || '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const body = { title: modal.title, description: modal.description, category: modal.category, severity: modal.severity, classification: modal.classification, status: modal.status, owner: modal.owner };
      if (modal.id) {
        const res = await api.patch(`/incidents/${modal.id}`, body);
        const updated = res.data.data.incident;
        setData((prev) => ({ ...prev, incidents: (prev.incidents || []).map((i) => i.id === updated.id ? updated : i) }));
      } else {
        const res = await api.post('/incidents', body);
        const created = res.data.data.incident;
        setData((prev) => ({ ...prev, incidents: [...(prev.incidents || []), created] }));
      }
      setModal(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/incidents/${confirm.id}`);
      setData((prev) => ({ ...prev, incidents: (prev.incidents || []).filter((i) => i.id !== confirm.id) }));
      setConfirm(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Incidents" description="Security and operational incidents and their response."
        actions={<><Button variant="secondary" onClick={() => exportCsv('incidents.csv', [{ key: '_row_num', label: '#' }, { key: 'title', label: 'Title' }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }], filtered)}><DocumentIcon className="h-4 w-4" /> Export CSV</Button><Button onClick={openCreate}><PlusIcon className="h-4 w-4" /> New incident</Button></>} />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <FilterBar search={list.search} onSearch={list.setSearch} totalLabel="incident" filteredCount={filtered.length} hasFilters={list.hasFilters} onReset={list.reset}>
        <FilterSelect value={list.filters.severity || ''} onChange={(e) => list.setFilter('severity', e.target.value)}>
          <option value="">All severities</option>
          {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
        <FilterSelect value={list.filters.status || ''} onChange={(e) => list.setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {['open', 'contained', 'resolved'].map((s) => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
      </FilterBar>
      <Card>
        {loading ? (
          <TableSkeleton columns={5} />
        ) : (
          <Table
            numbered
            columns={[
              { key: 'title', label: 'Title', render: (i) => <span className="flex items-center gap-2 font-medium text-slate-900"><ClipboardIcon className="h-4 w-4 text-charcoal-500" /> {i.title}</span> },
              { key: 'severity', label: 'Severity', render: (i) => <Badge color={i.severity === 'high' ? 'danger' : i.severity === 'medium' ? 'warning' : 'neutral'}>{i.severity}</Badge> },
              { key: 'status', label: 'Status', render: (i) => <Badge color={statusColor(i.status)}>{i.status}</Badge> },
              {
                key: 'actions',
                label: '',
                render: (i) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setSelected(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700" title="Details"><EyeIcon className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => setConfirm(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                ),
              },
            ]}
            rows={paginated}
            empty="No incidents yet."
          />
        )}
      </Card>
      <PaginationBar page={list.page} setPage={list.setPage} pageSize={list.pageSize} setPageSize={list.setPageSize} totalPages={totalPages} safePage={safePage} filteredCount={filtered.length} />

      {selected && <IncidentDrawer incident={selected} onClose={() => setSelected(null)} onChanged={refetch} />}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit incident' : 'New incident'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title" required><input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} /></Field>
          <Field label="Description" optional><textarea className="input" rows={3} value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} /></Field>
          <Field label="Severity" required>
            <select className="input" value={modal?.severity || 'low'} onChange={(e) => setModal({ ...modal, severity: e.target.value })}>
              {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Classification" optional><input className="input" value={modal?.classification || ''} onChange={(e) => setModal({ ...modal, classification: e.target.value })} /></Field>
          <Field label="Status" required>
            <select className="input" value={modal?.status || 'open'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {['open', 'contained', 'resolved'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Owner" optional><UserSelect value={modal?.owner || null} onChange={(v) => setModal({ ...modal, owner: v })} /></Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete incident"
        footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
        <p className="text-sm text-slate-600">Delete <span className="font-medium">{confirm?.title}</span>? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
