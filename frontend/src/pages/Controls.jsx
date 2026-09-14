import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, TableSkeleton } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, CubeIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';

const STATUSES = ['not_implemented', 'partial', 'implemented', 'needs_review'];

export default function Controls() {
  const { data, loading, refetch, setData } = useGet('/controls?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const controls = data?.controls || [];

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', category: '', status: 'not_implemented' });
  }
  function openEdit(c) {
    setError(null);
    setModal({ id: c.id, title: c.title, description: c.description || '', category: c.category || '', status: c.status });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      if (modal.id) {
        const res = await api.patch(`/controls/${modal.id}`, modal);
        const updated = res.data.data.control;
        setData((prev) => ({ ...prev, controls: (prev.controls || []).map((c) => c.id === updated.id ? updated : c) }));
      } else {
        const res = await api.post('/controls', modal);
        const created = res.data.data.control;
        setData((prev) => ({ ...prev, controls: [...(prev.controls || []), created] }));
      }
      setModal(null);
      refetch().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/controls/${confirm.id}`);
      setData((prev) => ({ ...prev, controls: (prev.controls || []).filter((c) => c.id !== confirm.id) }));
      setConfirm(null);
      refetch().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Controls"
        description="Security, operational and compliance controls mapped to frameworks."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv('controls.csv', [{ key: '_row_num', label: '#' }, { key: 'title', label: 'Name' }, { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' }], controls)}>
              <DocumentIcon className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" /> New control
            </Button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card>
        {loading ? (
          <TableSkeleton columns={5} />
        ) : (
          <Table
            numbered
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (c) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <CubeIcon className="h-4 w-4 text-charcoal-500" /> {c.title}
                  </span>
                ),
              },
              { key: 'category', label: 'Category', render: (c) => <span className="text-slate-500">{c.category || '—'}</span> },
              { key: 'status', label: 'Status', render: (c) => <Badge color={statusColor(c.status)}>{c.status}</Badge> },
              {
                key: 'actions',
                label: '',
                render: (c) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={controls}
            empty="No controls yet."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit control' : 'New control'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Name">
            <input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea className="input" rows={3} value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
          </Field>
          <Field label="Category">
            <input className="input" value={modal?.category || ''} onChange={(e) => setModal({ ...modal, category: e.target.value })} placeholder="e.g. Access Control" />
          </Field>
          <Field label="Status">
            <select className="input" value={modal?.status || 'planned'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete control"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-medium">{confirm?.name}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
