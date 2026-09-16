import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, TableSkeleton, UserSelect } from '../components/ui';
import { PlusIcon, TrashIcon, ServerIcon, CogIcon, ChartIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';

const TABS = [
  { id: 'assets', label: 'Assets', Icon: ServerIcon },
  { id: 'changes', label: 'Changes', Icon: CogIcon },
  { id: 'capacity', label: 'Capacity', Icon: ChartIcon },
];

export default function ITSM() {
  const [tab, setTab] = useState('assets');
  const { setData: setAssetData, silentRefetch: silentRefetchAssets, ...assets } = useGet('/itsm/assets?pageSize=100');
  const { setData: setChangeData, silentRefetch: silentRefetchChanges, ...changes } = useGet('/itsm/changes?pageSize=100');
  const { setData: setCapacityData, silentRefetch: silentRefetchCapacity, ...capacity } = useGet('/itsm/capacity?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const res = { assets, changes, capacity }[tab];

  function openCreate() {
    setError(null);
    if (tab === 'assets') setModal({ type: 'assets', name: '', atype: '', description: '', owner: '', location: '', status: 'active' });
    if (tab === 'changes') setModal({ type: 'changes', title: '', description: '', status: 'requested', risk: '', assetId: '' });
    if (tab === 'capacity') setModal({ type: 'capacity', resource: '', unit: '', currentCapacity: '', plannedCapacity: '', notes: '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const m = modal;
      let body;
      if (m.type === 'assets') {
        body = { name: m.name, type: m.atype || null, description: m.description, owner: m.owner, location: m.location, status: m.status };
      } else if (m.type === 'changes') {
        body = { title: m.title, description: m.description, status: m.status, risk: m.risk, assetId: m.assetId || null };
      } else {
        body = {
          resource: m.resource,
          unit: m.unit,
          currentCapacity: m.currentCapacity === '' ? null : Number(m.currentCapacity),
          plannedCapacity: m.plannedCapacity === '' ? null : Number(m.plannedCapacity),
          notes: m.notes,
        };
      }
      const apiRes = await api.post(`/itsm/${m.type}`, body);
      if (m.type === 'assets') {
        const created = apiRes.data.data.asset;
        setAssetData((prev) => ({ ...prev, assets: [...(prev.assets || []), created] }));
      } else if (m.type === 'changes') {
        const created = apiRes.data.data.change;
        setChangeData((prev) => ({ ...prev, changes: [...(prev.changes || []), created] }));
      } else {
        const created = apiRes.data.data.plan;
        setCapacityData((prev) => ({ ...prev, plans: [...(prev.plans || []), created] }));
      }
      setModal(null);
      const sr = tab === 'assets' ? silentRefetchAssets : tab === 'changes' ? silentRefetchChanges : silentRefetchCapacity;
      sr();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/itsm/${confirm.type}/${confirm.id}`);
      if (confirm.type === 'assets') {
        setAssetData((prev) => ({ ...prev, assets: (prev.assets || []).filter((a) => a.id !== confirm.id) }));
      } else if (confirm.type === 'changes') {
        setChangeData((prev) => ({ ...prev, changes: (prev.changes || []).filter((c) => c.id !== confirm.id) }));
      } else {
        setCapacityData((prev) => ({ ...prev, plans: (prev.plans || []).filter((p) => p.id !== confirm.id) }));
      }
      setConfirm(null);
      const sr = confirm.type === 'assets' ? silentRefetchAssets : confirm.type === 'changes' ? silentRefetchChanges : silentRefetchCapacity;
      sr();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="IT Service Management" description="Assets, changes and capacity plans."
        actions={
          <Button variant="secondary" onClick={() => {
            if (tab === 'assets') exportCsv('itsm-assets.csv', [{ key: '_row_num', label: '#' }, { key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }], assets.data?.assets || []);
            else if (tab === 'changes') exportCsv('itsm-changes.csv', [{ key: '_row_num', label: '#' }, { key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }], changes.data?.changes || []);
            else exportCsv('itsm-capacity.csv', [{ key: '_row_num', label: '#' }, { key: 'resource', label: 'Resource' }, { key: 'currentCapacity', label: 'Current' }, { key: 'plannedCapacity', label: 'Planned' }], capacity.data?.plans || []);
          }}><DocumentIcon className="h-4 w-4" /> Export CSV</Button>
        } />

      <div className="mb-5 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'border-charcoal-800 text-charcoal-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.Icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card>
        {res.loading ? (
          <TableSkeleton columns={tab === 'changes' ? 4 : 5} />
        ) : tab === 'assets' ? (
          <TableWithAdd
            rows={assets.data?.assets || []}
            columns={[
              { key: 'name', label: 'Name', render: (a) => <span className="font-medium text-slate-900">{a.name}</span> },
              { key: 'type', label: 'Type', render: (a) => <span className="text-slate-500">{a.type || '—'}</span> },
              { key: 'status', label: 'Status', render: (a) => <Badge color={statusColor(a.status)}>{a.status}</Badge> },
            ]}
            onAdd={openCreate}
            onDelete={(a) => setConfirm({ type: 'assets', ...a })}
          />
        ) : tab === 'changes' ? (
          <TableWithAdd
            rows={changes.data?.changes || []}
            columns={[
              { key: 'title', label: 'Title', render: (c) => <span className="font-medium text-slate-900">{c.title}</span> },
              { key: 'status', label: 'Status', render: (c) => <Badge color={statusColor(c.status)}>{c.status}</Badge> },
            ]}
            onAdd={openCreate}
            onDelete={(c) => setConfirm({ type: 'changes', ...c })}
          />
        ) : (
          <TableWithAdd
            rows={capacity.data?.plans || []}
            columns={[
              { key: 'resource', label: 'Resource', render: (c) => <span className="font-medium text-slate-900">{c.resource}</span> },
              { key: 'currentCapacity', label: 'Current', render: (c) => <span className="text-slate-500">{c.currentCapacity ?? '—'}</span> },
              { key: 'plannedCapacity', label: 'Planned', render: (c) => <span className="text-slate-500">{c.plannedCapacity ?? '—'}</span> },
            ]}
            onAdd={openCreate}
            onDelete={(c) => setConfirm({ type: 'capacity', ...c })}
          />
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={`New ${tab.slice(0, -1)}`}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <form onSubmit={save} className="space-y-4">
          {modal?.type === 'assets' && (
            <>
              <Field label="Name" required><input required className="input" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} /></Field>
              <Field label="Type" optional><input className="input" value={modal.atype || ''} onChange={(e) => setModal({ ...modal, atype: e.target.value })} /></Field>
              <Field label="Description" optional><input className="input" value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} /></Field>
              <Field label="Owner" optional><UserSelect value={modal.owner || null} onChange={(v) => setModal({ ...modal, owner: v })} /></Field>
              <Field label="Location" optional><input className="input" value={modal.location} onChange={(e) => setModal({ ...modal, location: e.target.value })} /></Field>
              <Field label="Status" required>
                <select className="input" value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                  {['active', 'retired', 'disposed'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </>
          )}
          {modal?.type === 'changes' && (
            <>
              <Field label="Title" required><input required className="input" value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })} /></Field>
              <Field label="Description" optional><textarea className="input" rows={2} value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} /></Field>
              <Field label="Risk" optional><input className="input" value={modal.risk} onChange={(e) => setModal({ ...modal, risk: e.target.value })} /></Field>
              <Field label="Asset" optional>
                <select className="input" value={modal.assetId} onChange={(e) => setModal({ ...modal, assetId: e.target.value })}>
                  <option value="">None</option>
                  {(assets.data?.assets || []).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status" required>
                <select className="input" value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                  {['requested', 'approved', 'implemented', 'closed', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </>
          )}
          {modal?.type === 'capacity' && (
            <>
              <Field label="Resource" required><input required className="input" value={modal.resource} onChange={(e) => setModal({ ...modal, resource: e.target.value })} /></Field>
              <Field label="Unit" optional><input className="input" value={modal.unit} onChange={(e) => setModal({ ...modal, unit: e.target.value })} /></Field>
              <Field label="Current capacity" optional><input type="number" className="input" value={modal.currentCapacity} onChange={(e) => setModal({ ...modal, currentCapacity: e.target.value })} /></Field>
              <Field label="Planned capacity" optional><input type="number" className="input" value={modal.plannedCapacity} onChange={(e) => setModal({ ...modal, plannedCapacity: e.target.value })} /></Field>
              <Field label="Notes" optional><textarea className="input" rows={2} value={modal.notes} onChange={(e) => setModal({ ...modal, notes: e.target.value })} /></Field>
            </>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete"
        footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
        <p className="text-sm text-slate-600">Delete this record? This cannot be undone.</p>
      </Modal>
    </div>
  );
}

function TableWithAdd({ rows, columns, onAdd, onDelete }) {
  return (
    <>
      <div className="flex justify-end p-3">
        <Button size="sm" onClick={onAdd}><PlusIcon className="h-4 w-4" /> Add</Button>
      </div>
      <Table
        numbered
        columns={[
          ...columns,
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex justify-end">
                <button onClick={() => onDelete(row)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        rows={rows}
        empty="No records yet."
      />
    </>
  );
}
