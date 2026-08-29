import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, Spinner } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, KeyIcon } from '../components/icons';

function groupPermissions(perms) {
  const groups = {};
  perms.forEach((p) => {
    const [resource] = p.name.split(':');
    (groups[resource] = groups[resource] || []).push(p);
  });
  return groups;
}

export default function Roles() {
  const { data, loading, refetch } = useGet('/roles');
  const permsRes = useGet('/roles/permissions');
  const allPerms = permsRes.data?.permissions || [];
  const groups = groupPermissions(allPerms);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const roles = data?.roles || [];

  function openCreate() {
    setError(null);
    setModal({ name: '', description: '', permissions: [] });
  }
  function openEdit(role) {
    setError(null);
    setModal({
      id: role.id,
      name: role.name,
      description: role.description || '',
      permissions: (role.permissions || []).map((p) => p.name),
    });
  }

  function togglePerm(name) {
    setModal((m) => ({
      ...m,
      permissions: m.permissions.includes(name) ? m.permissions.filter((x) => x !== name) : [...m.permissions, name],
    }));
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      if (modal.id) {
        await api.patch(`/roles/${modal.id}`, { description: modal.description, permissions: modal.permissions });
      } else {
        await api.post('/roles', { name: modal.name, description: modal.description, permissions: modal.permissions });
      }
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/roles/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Roles"
        description="Define roles and the permissions they grant."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> New role
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
              { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
              { key: 'description', label: 'Description' },
              {
                key: 'count',
                label: 'Permissions',
                render: (r) => <Badge color="brand">{(r.permissions || []).length}</Badge>,
              },
              {
                key: 'actions',
                label: '',
                render: (r) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={roles}
            empty="No roles yet."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit role' : 'New role'}
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
            <input className="input" required value={modal?.name || ''} disabled={!!modal?.id} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <input className="input" value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
          </Field>
          <div>
            <p className="label">Permissions</p>
            <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {Object.entries(groups).map(([resource, perms]) => (
                <div key={resource}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{resource}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <label key={p.name} className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={modal?.permissions?.includes(p.name)} onChange={() => togglePerm(p.name)} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete role"
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
          Delete role <span className="font-medium">{confirm?.name}</span>? It cannot be assigned to users afterwards.
        </p>
      </Modal>
    </div>
  );
}
