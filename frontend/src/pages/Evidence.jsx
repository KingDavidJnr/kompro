import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, TableSkeleton, SearchableSelect } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';

const SOURCES = ['manual', 'upload', 'integration', 'automated'];

export default function Evidence() {
  const { data, loading, refetch, silentRefetch, setData } = useGet('/evidence?pageSize=100');
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
      if (modal.id) {
        const res = await api.patch(`/evidence/${modal.id}`, body);
        const updated = res.data.data.evidence;
        setData((prev) => ({ ...prev, evidence: (prev.evidence || []).map((e) => e.id === updated.id ? updated : e) }));
      } else {
        const res = await api.post('/evidence', body);
        const created = res.data.data.evidence;
        setData((prev) => ({ ...prev, evidence: [...(prev.evidence || []), created] }));
      }
      setModal(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/evidence/${confirm.id}`);
      setData((prev) => ({ ...prev, evidence: (prev.evidence || []).filter((e) => e.id !== confirm.id) }));
      setConfirm(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  const controlLabel = (c) => `${c.title}${c.category ? ` · ${c.category}` : ''}`;
  const policyLabel = (p) => p.title;
  const loadControls = async (q) => {
    const res = await api.get(`/controls?pageSize=50${q ? `&search=${encodeURIComponent(q)}` : ''}`);
    return (res.data.data.controls || []).map((c) => ({ value: c.id, label: controlLabel(c) }));
  };
  const loadControl = async (id) => {
    const res = await api.get(`/controls/${id}`);
    const c = res.data.data.control;
    return { value: c.id, label: controlLabel(c) };
  };
  const loadPolicies = async (q) => {
    const res = await api.get(`/policies?pageSize=50${q ? `&search=${encodeURIComponent(q)}` : ''}`);
    return (res.data.data.policies || []).map((p) => ({ value: p.id, label: policyLabel(p) }));
  };
  const loadPolicy = async (id) => {
    const res = await api.get(`/policies/${id}`);
    const p = res.data.data.policy;
    return { value: p.id, label: policyLabel(p) };
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Evidence"
        description="Proof supporting your controls and assessments."
        actions={<><Button variant="secondary" onClick={() => exportCsv('evidence.csv', [{ key: '_row_num', label: '#' }, { key: 'title', label: 'Title' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' }, { key: 'collectedAt', label: 'Collected' }], evidence)}><DocumentIcon className="h-4 w-4" /> Export CSV</Button><Button onClick={openCreate}><PlusIcon className="h-4 w-4" /> Add evidence</Button></>}
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
                key: 'title',
                label: 'Title',
                render: (e) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <FolderIcon className="h-4 w-4 text-charcoal-500" /> {e.title}
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
                    <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700">
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
          <Field label="Control" hint="Optional link to a control.">
            <SearchableSelect
              value={modal?.controlId || null}
              onChange={(id) => setModal({ ...modal, controlId: id })}
              loadOptions={loadControls}
              loadValue={loadControl}
              placeholder="No control linked"
              searchPlaceholder="Search controls…"
            />
          </Field>
          <Field label="Policy" hint="Optional link to a policy.">
            <SearchableSelect
              value={modal?.policyId || null}
              onChange={(id) => setModal({ ...modal, policyId: id })}
              loadOptions={loadPolicies}
              loadValue={loadPolicy}
              placeholder="No policy linked"
              searchPlaceholder="Search policies…"
            />
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
