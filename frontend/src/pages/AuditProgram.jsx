import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, Drawer, statusColor, Spinner } from '../components/ui';
import { AddList } from '../components/SubList';
import { PlusIcon, PencilIcon, TrashIcon, ClipboardIcon, EyeIcon } from '../components/icons';

function PlanDrawer({ plan, onClose, onChanged }) {
  const detail = useGet(`/audit-program/${plan.id}`);
  const p = detail.data?.plan || plan;

  async function addNc(body) {
    try {
      await api.post(`/audit-program/${plan.id}/nonconformities`, body);
      detail.refetch();
      onChanged();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  }
  async function addCa(nid, body) {
    try {
      await api.post(`/audit-program/${plan.id}/nonconformities/${nid}/corrective-actions`, body);
      detail.refetch();
      onChanged();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  }

  return (
    <Drawer open onClose={onClose} title={p.title} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {detail.loading ? (
        <Spinner className="h-8 w-8" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge color={statusColor(p.status)}>{p.status}</Badge>
            {p.scope && <Badge color="neutral">{p.scope}</Badge>}
          </div>
          <h4 className="text-sm font-semibold text-slate-700">Nonconformities</h4>
          <AddList
            loading={false}
            items={p.nonconformities}
            onAdd={addNc}
            fields={[{ key: 'description', label: 'Description' }, { key: 'severity', label: 'Severity', type: 'select', options: ['minor', 'major', 'critical'] }, { key: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'closed'] }]}
            render={(nc) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{nc.description}</span>
                  <Badge color={statusColor(nc.status)}>{nc.status}</Badge>
                </div>
                <AddList
                  loading={false}
                  items={nc.actions}
                  onAdd={(b) => addCa(nc.id, b)}
                  fields={[{ key: 'description', label: 'Action' }, { key: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'closed'] }, { key: 'owner', label: 'Owner' }]}
                  render={(a) => (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{a.description}</span>
                      <Badge color={statusColor(a.status)}>{a.status}</Badge>
                    </div>
                  )}
                />
              </div>
            )}
          />
        </div>
      )}
    </Drawer>
  );
}

export default function AuditProgram() {
  const { data, loading, refetch } = useGet('/audit-program?pageSize=100');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const plans = data?.plans || [];

  function openCreate() {
    setError(null);
    setModal({ title: '', scope: '', status: 'planned', scheduledAt: '' });
  }
  function openEdit(p) {
    setError(null);
    setModal({ id: p.id, title: p.title, scope: p.scope || '', status: p.status, scheduledAt: p.scheduledAt ? p.scheduledAt.slice(0, 10) : '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const body = { title: modal.title, scope: modal.scope, status: modal.status, scheduledAt: modal.scheduledAt || null };
      if (modal.id) await api.patch(`/audit-program/${modal.id}`, body);
      else await api.post('/audit-program', body);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/audit-program/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Audit Program" description="Audit plans, nonconformities and corrective actions."
        actions={<Button onClick={openCreate}><PlusIcon className="h-4 w-4" /> New plan</Button>} />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : (
          <Table
            columns={[
              { key: 'title', label: 'Title', render: (p) => <span className="flex items-center gap-2 font-medium text-slate-900"><ClipboardIcon className="h-4 w-4 text-charcoal-500" /> {p.title}</span> },
              { key: 'scope', label: 'Scope', render: (p) => <span className="text-slate-500">{p.scope || '—'}</span> },
              { key: 'status', label: 'Status', render: (p) => <Badge color={statusColor(p.status)}>{p.status}</Badge> },
              {
                key: 'actions',
                label: '',
                render: (p) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setSelected(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700" title="Details"><EyeIcon className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => setConfirm(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                ),
              },
            ]}
            rows={plans}
            empty="No audit plans yet."
          />
        )}
      </Card>

      {selected && <PlanDrawer plan={selected} onClose={() => setSelected(null)} onChanged={refetch} />}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit plan' : 'New audit plan'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title"><input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} /></Field>
          <Field label="Scope"><input className="input" value={modal?.scope || ''} onChange={(e) => setModal({ ...modal, scope: e.target.value })} /></Field>
          <Field label="Status">
            <select className="input" value={modal?.status || 'planned'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {['planned', 'in_progress', 'complete'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Scheduled date"><input type="date" className="input" value={modal?.scheduledAt || ''} onChange={(e) => setModal({ ...modal, scheduledAt: e.target.value })} /></Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete plan"
        footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
        <p className="text-sm text-slate-600">Delete <span className="font-medium">{confirm?.title}</span>? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
