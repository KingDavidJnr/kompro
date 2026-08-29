import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, Spinner } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon } from '../components/icons';

const SOURCES = ['manual', 'upload', 'integration', 'automated'];

export default function Evidence() {
  const { data, loading, refetch } = useGet('/evidence?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const evidence = data?.evidence || [];

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', source: 'manual', content: '', controlId: '', policyId: '' });
  }
  function openEdit(e) {
    setError(null);
    setModal({ id: e.id, title: e.title, description: e.description || '', source: e.source, content: e.content || '', controlId: e.controlId || '', policyId: e.policyId || '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const body = {
        title: modal.title,
        description: modal.description,
        source: modal.source,
        content: modal.content,
        controlId: modal.controlId || null,
        policyId: modal.policyId || null,
      };
      if (modal.id) await api.patch(`/evidence/${modal.id}`, body);
      else await api.post('/evidence', body);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/evidence/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Evidence"
        description="Proof supporting your controls and assessments."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> Add evidence
          </Button>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <Table
            columns={[
              {
                key: 'title',
                label: 'Title',
                render: (e) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <FolderIcon className="h-4 w-4 text-brand-500" /> {e.title}
                  </span>
                ),
              },
              { key: 'source', label: 'Source', render: (e) => <Badge color="info">{e.source}</Badge> },
              { key: 'status', label: 'Status', render: (e) => <Badge color={statusColor(e.status)}>{e.status}</Badge> },
              {
                key: 'collectedAt',
                label: 'Collected',
                render: (e) => <span className="text-slate-500">{e.collectedAt ? new Date(e.collectedAt).toLocaleDateString() : '—'}</span>,
              },
              {
                key: 'actions',
                label: '',
                render: (e) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={evidence}
            empty="No evidence yet."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit evidence' : 'Add evidence'}
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
          <Field label="Title">
            <input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <input className="input" value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
          </Field>
          <Field label="Source">
            <select className="input" value={modal?.source || 'manual'} onChange={(e) => setModal({ ...modal, source: e.target.value })}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Content / notes">
            <textarea className="input" rows={3} value={modal?.content || ''} onChange={(e) => setModal({ ...modal, content: e.target.value })} />
          </Field>
          <Field label="Control id" hint="Optional link to a control.">
            <input className="input" value={modal?.controlId || ''} onChange={(e) => setModal({ ...modal, controlId: e.target.value })} />
          </Field>
          <Field label="Policy id" hint="Optional link to a policy.">
            <input className="input" value={modal?.policyId || ''} onChange={(e) => setModal({ ...modal, policyId: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete evidence"
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
          Delete <span className="font-medium">{confirm?.title}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
