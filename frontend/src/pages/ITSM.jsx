import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, Spinner, UserSelect } from '../components/ui';
import { PlusIcon, TrashIcon, ServerIcon, CogIcon, ChartIcon } from '../components/icons';

const TABS = [
  { id: 'assets', label: 'Assets', Icon: ServerIcon },
  { id: 'changes', label: 'Changes', Icon: CogIcon },
  { id: 'capacity', label: 'Capacity', Icon: ChartIcon },
];

export default function ITSM() {
  const [tab, setTab] = useState('assets');
  const assets = useGet('/itsm/assets?pageSize=100');
  const changes = useGet('/itsm/changes?pageSize=100');
  const capacity = useGet('/itsm/capacity?pageSize=100');
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
      await api.post(`/itsm/${m.type}`, body);
      setModal(null);
      res.refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/itsm/${confirm.type}/${confirm.id}`);
      setConfirm(null);
      res.refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="IT Service Management" description="Assets, changes and capacity plans." />

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
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
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
              <Field label="Name"><input required className="input" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} /></Field>
              <Field label="Type"><input className="input" value={modal.atype || ''} onChange={(e) => setModal({ ...modal, atype: e.target.value })} /></Field>
              <Field label="Description"><input className="input" value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} /></Field>
              <Field label="Owner"><UserSelect value={modal.owner || null} onChange={(v) => setModal({ ...modal, owner: v })} /></Field>
              <Field label="Location"><input className="input" value={modal.location} onChange={(e) => setModal({ ...modal, location: e.target.value })} /></Field>
              <Field label="Status">
                <select className="input" value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                  {['active', 'retired', 'disposed'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </>
          )}
          {modal?.type === 'changes' && (
            <>
              <Field label="Title"><input required className="input" value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })} /></Field>
              <Field label="Description"><textarea className="input" rows={2} value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} /></Field>
              <Field label="Risk"><input className="input" value={modal.risk} onChange={(e) => setModal({ ...modal, risk: e.target.value })} /></Field>
              <Field label="Asset id"><input className="input" value={modal.assetId} onChange={(e) => setModal({ ...modal, assetId: e.target.value })} /></Field>
              <Field label="Status">
                <select className="input" value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                  {['requested', 'approved', 'implemented', 'closed', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </>
          )}
          {modal?.type === 'capacity' && (
            <>
              <Field label="Resource"><input required className="input" value={modal.resource} onChange={(e) => setModal({ ...modal, resource: e.target.value })} /></Field>
              <Field label="Unit"><input className="input" value={modal.unit} onChange={(e) => setModal({ ...modal, unit: e.target.value })} /></Field>
              <Field label="Current capacity"><input type="number" className="input" value={modal.currentCapacity} onChange={(e) => setModal({ ...modal, currentCapacity: e.target.value })} /></Field>
              <Field label="Planned capacity"><input type="number" className="input" value={modal.plannedCapacity} onChange={(e) => setModal({ ...modal, plannedCapacity: e.target.value })} /></Field>
              <Field label="Notes"><textarea className="input" rows={2} value={modal.notes} onChange={(e) => setModal({ ...modal, notes: e.target.value })} /></Field>
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
