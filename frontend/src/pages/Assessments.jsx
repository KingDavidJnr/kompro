import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, TableSkeleton, FrameworkSelect } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, ClipboardIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';

const STATUSES = ['draft', 'in_progress', 'complete'];

export default function Assessments() {
  const { data, loading, refetch, setData } = useGet('/assessments?pageSize=100');
  const frameworksRes = useGet('/frameworks?pageSize=100');
  const frameworks = frameworksRes.data?.frameworks || [];
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const assessments = data?.assessments || [];

  function openCreate() {
    setError(null);
    setModal({ name: '', description: '', frameworkId: frameworks[0]?.id || '', status: 'draft', dueDate: '' });
  }
  function openEdit(a) {
    setError(null);
    setModal({ id: a.id, name: a.name, description: a.description || '', frameworkId: a.frameworkId || '', status: a.status, dueDate: a.dueDate ? a.dueDate.slice(0, 10) : '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const body = {
        name: modal.name,
        description: modal.description,
        frameworkId: modal.frameworkId || null,
        status: modal.status,
        dueDate: modal.dueDate || null,
      };
      if (modal.id) {
        const res = await api.patch(`/assessments/${modal.id}`, body);
        const updated = res.data.data.assessment;
        setData((prev) => ({ ...prev, assessments: (prev.assessments || []).map((x) => x.id === updated.id ? updated : x) }));
      } else {
        const res = await api.post('/assessments', body);
        const created = res.data.data.assessment;
        setData((prev) => ({ ...prev, assessments: [...(prev.assessments || []), created] }));
      }
      setModal(null);
      refetch().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/assessments/${confirm.id}`);
      setData((prev) => ({ ...prev, assessments: (prev.assessments || []).filter((x) => x.id !== confirm.id) }));
      setConfirm(null);
      refetch().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Assessments"
        description="Evaluations of controls and their supporting evidence."
        actions={<><Button variant="secondary" onClick={() => exportCsv('assessments.csv', [{ key: '_row_num', label: '#' }, { key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }, { key: 'dueDate', label: 'Due' }], assessments)}><DocumentIcon className="h-4 w-4" /> Export CSV</Button><Button onClick={openCreate}><PlusIcon className="h-4 w-4" /> New assessment</Button></>}
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card>
        {loading ? (
          <TableSkeleton columns={6} />
        ) : (
          <Table
            numbered
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (a) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <ClipboardIcon className="h-4 w-4 text-charcoal-500" /> {a.name}
                  </span>
                ),
              },
              {
                key: 'framework',
                label: 'Framework',
                render: (a) => <span className="text-slate-500">{frameworks.find((f) => f.id === a.frameworkId)?.name || '—'}</span>,
              },
              { key: 'status', label: 'Status', render: (a) => <Badge color={statusColor(a.status)}>{a.status}</Badge> },
              {
                key: 'dueDate',
                label: 'Due',
                render: (a) => <span className="text-slate-500">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</span>,
              },
              {
                key: 'actions',
                label: '',
                render: (a) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(a)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={assessments}
            empty="No assessments yet."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit assessment' : 'New assessment'}
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
            <input required className="input" value={modal?.name || ''} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea className="input" rows={3} value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
          </Field>
          <Field label="Framework">
            <FrameworkSelect value={modal?.frameworkId || null} onChange={(id) => setModal({ ...modal, frameworkId: id })} />
          </Field>
          <Field label="Status">
            <select className="input" value={modal?.status || 'draft'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" className="input" value={modal?.dueDate || ''} onChange={(e) => setModal({ ...modal, dueDate: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete assessment"
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
