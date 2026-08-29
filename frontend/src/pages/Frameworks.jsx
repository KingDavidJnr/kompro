import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, Spinner } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, ShieldIcon, CheckIcon } from '../components/icons';

export default function Frameworks() {
  const { data, loading, refetch } = useGet('/frameworks?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Frameworks"
        description="Compliance frameworks and their requirement catalogs."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> New framework
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
                key: 'name',
                label: 'Name',
                render: (f) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <ShieldIcon className="h-4 w-4 text-charcoal-500" /> {f.name}
                  </span>
                ),
              },
              { key: 'description', label: 'Description' },
              { key: 'version', label: 'Version', render: (f) => <span className="text-slate-500">{f.version}</span> },
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
                  <div className="flex justify-end gap-1">
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
    </div>
  );
}
