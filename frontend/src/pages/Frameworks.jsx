import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGet } from '../lib/hooks';
import { useConfirm } from '../lib/useConfirm.jsx';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, Spinner } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, ShieldIcon, CheckIcon } from '../components/icons';

export default function Frameworks() {
  const { data, loading, refetch } = useGet('/frameworks?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [reqModal, setReqModal] = useState(null);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState(null);
  const { confirm: ask, dialog } = useConfirm();

  const frameworks = data?.frameworks || [];

  function openCreate() {
    setError(null);
    setModal({ name: '', description: '', version: '1.0' });
  }
  function openEdit(f) {
    setError(null);
    setModal({ id: f.id, name: f.name, description: f.description || '', version: f.version });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      if (modal.id) await api.patch(`/frameworks/${modal.id}`, modal);
      else await api.post('/frameworks', modal);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function toggle(f) {
    try {
      await api.patch(`/frameworks/${f.id}`, { enabled: !f.enabled });
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/frameworks/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  async function seedCatalog() {
    setSeeding(true);
    setSeedError(null);
    try {
      await api.post('/frameworks/seed');
      refetch();
    } catch (err) {
      setSeedError(err.response?.data?.message || 'Seeding failed.');
    } finally {
      setSeeding(false);
    }
  }

  function seedWithConfirm() {
    ask({
      title: 'Seed framework catalog?',
      message:
        'This adds the standard SOC 2, ISO 27001 and GDPR frameworks with their requirement catalogs if they are not already present. Existing frameworks are left untouched.',
      confirmLabel: 'Seed catalog',
    }).then((ok) => ok && seedCatalog());
  }

  async function openRequirements(f) {
    setReqModal({ framework: f, requirements: null, loading: true, error: null, adding: false, form: { code: '', title: '', description: '' }, addError: null });
    try {
      const res = await api.get(`/requirements?frameworkId=${f.id}`);
      setReqModal((prev) => ({ ...prev, requirements: res.data.data.requirements, loading: false }));
    } catch (err) {
      setReqModal((prev) => ({ ...prev, error: err.response?.data?.message || 'Failed to load requirements.', loading: false }));
    }
  }

  function reqUpdate(patch) {
    setReqModal((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function addRequirement(e) {
    e.preventDefault();
    const fm = reqModal.framework;
    if (!reqModal.form.title.trim()) {
      reqUpdate({ addError: 'Requirement title is required.' });
      return;
    }
    reqUpdate({ addError: null });
    try {
      await api.post('/requirements', {
        frameworkId: fm.id,
        code: reqModal.form.code.trim() || undefined,
        title: reqModal.form.title.trim(),
        description: reqModal.form.description.trim() || undefined,
      });
      const res = await api.get(`/requirements?frameworkId=${fm.id}`);
      reqUpdate({ requirements: res.data.data.requirements, adding: false, form: { code: '', title: '', description: '' } });
    } catch (err) {
      reqUpdate({ addError: err.response?.data?.message || 'Failed to add requirement.' });
    }
  }

  async function deleteRequirement(r) {
    try {
      await api.delete(`/requirements/${r.id}`);
      const res = await api.get(`/requirements?frameworkId=${reqModal.framework.id}`);
      reqUpdate({ requirements: res.data.data.requirements });
    } catch (err) {
      reqUpdate({ error: err.response?.data?.message || 'Failed to delete requirement.' });
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Frameworks"
        description="Compliance frameworks and their requirement catalogs."
        actions={
          <>
            <Button variant="secondary" onClick={seedWithConfirm} disabled={seeding}>
              {seeding ? <Spinner className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
              {seeding ? 'Seeding…' : 'Seed catalog'}
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" /> New framework
            </Button>
          </>
        }
      />
      {(error || seedError) && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error || seedError}</div>
      )}

      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <Table
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (f) => (
                  <Link to={`/frameworks/${f.id}`} className="flex items-center gap-2 font-medium text-slate-900 hover:text-brand-700 hover:underline">
                    <ShieldIcon className="h-4 w-4 text-charcoal-500" /> {f.name}
                  </Link>
                ),
              },
              { key: 'description', label: 'Description' },
              { key: 'version', label: 'Version', render: (f) => <span className="text-slate-500">{f.version}</span> },
              {
                key: 'requirements',
                label: 'Requirements',
                render: (f) => <Badge color="charcoal">{f._count?.requirements ?? 0}</Badge>,
              },
              {
                key: 'enabled',
                label: 'Enabled',
                render: (f) => (
                  <button
                    onClick={() => toggle(f)}
                    className={`relative h-6 w-11 rounded-full transition ${f.enabled ? 'bg-charcoal-800' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${f.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (f) => (
                  <div className="flex justify-end items-center gap-1">
                    <button onClick={() => openRequirements(f)} className="rounded-lg px-2 py-1 text-xs font-medium text-charcoal-600 hover:bg-slate-100 hover:text-charcoal-900">
                      Requirements
                    </button>
                    <button onClick={() => openEdit(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(f)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={frameworks}
            empty="No frameworks yet."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit framework' : 'New framework'}
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
            <input className="input" value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
          </Field>
          <Field label="Version">
            <input className="input" value={modal?.version || ''} onChange={(e) => setModal({ ...modal, version: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete framework"
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
          Delete <span className="font-medium">{confirm?.name}</span>? Its requirements will be removed too.
        </p>
      </Modal>

      <Modal
        open={!!reqModal}
        onClose={() => setReqModal(null)}
        title={reqModal ? `Requirements — ${reqModal.framework.name}` : 'Requirements'}
        footer={
          <Button variant="secondary" onClick={() => setReqModal(null)}>
            Close
          </Button>
        }
      >
        {reqModal?.loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-7 w-7" />
          </div>
        ) : reqModal?.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{reqModal.error}</div>
        ) : reqModal ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => reqUpdate({ adding: !reqModal.adding, addError: null })}>
                <PlusIcon className="h-4 w-4" /> Add requirement
              </Button>
            </div>

            {reqModal.adding && (
              <form onSubmit={addRequirement} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Code">
                    <input className="input" value={reqModal.form.code} onChange={(e) => reqUpdate({ form: { ...reqModal.form, code: e.target.value } })} placeholder="e.g. A.1" />
                  </Field>
                  <Field label="Title">
                    <input required className="input" value={reqModal.form.title} onChange={(e) => reqUpdate({ form: { ...reqModal.form, title: e.target.value } })} placeholder="Requirement title" />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea className="input" rows={2} value={reqModal.form.description} onChange={(e) => reqUpdate({ form: { ...reqModal.form, description: e.target.value } })} />
                </Field>
                {reqModal.addError && <p className="text-sm text-rose-600">{reqModal.addError}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={() => reqUpdate({ adding: false })}>
                    Cancel
                  </Button>
                  <Button type="submit">Add</Button>
                </div>
              </form>
            )}

            {reqModal.requirements?.length ? (
              <div className="max-h-[50vh] space-y-3 overflow-y-auto">
                {reqModal.requirements.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="font-medium text-slate-900">{r.title}</p>
                        {r.code && <span className="flex-none font-mono text-xs text-slate-400">{r.code}</span>}
                      </div>
                      {r.description && <p className="mt-1 text-sm text-slate-500">{r.description}</p>}
                    </div>
                     <button
                       onClick={() => ask({
                         title: 'Delete requirement?',
                         message: `Delete "${r.title}"? This cannot be undone.`,
                         confirmLabel: 'Delete',
                       }).then((ok) => ok && deleteRequirement(r))}
                       className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                       aria-label="Delete requirement"
                     >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !reqModal.adding && <p className="text-sm text-slate-500">No requirements for this framework yet.</p>
            )}
          </div>
        ) : null}
        </Modal>
        {dialog}
    </div>
  );
}
