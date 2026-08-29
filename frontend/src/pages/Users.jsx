import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, Spinner } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '../components/icons';

export default function Users() {
  const { data, loading, refetch } = useGet('/users');
  const rolesRes = useGet('/roles');
  const roles = rolesRes.data?.roles || [];
  const [modal, setModal] = useState(null); // { id?, email, name, roleId, active }
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const users = data?.users || [];

  function openCreate() {
    setError(null);
    setModal({ email: '', name: '', roleId: roles[0]?.id || '', active: true });
  }
  function openEdit(u) {
    setError(null);
    setModal({ id: u.id, email: u.email, name: u.name || '', roleId: u.roleId, active: u.active });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      if (modal.id) {
        await api.patch(`/users/${modal.id}`, { name: modal.name, roleId: modal.roleId, active: modal.active });
      } else {
        await api.post('/users', { email: modal.email, name: modal.name, roleId: modal.roleId, active: modal.active });
      }
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/users/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Users"
        description="People with access to this organization."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> Invite user
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
              { key: 'name', label: 'Name', render: (u) => <span className="font-medium text-slate-900">{u.name || '—'}</span> },
              { key: 'email', label: 'Email' },
              {
                key: 'role',
                label: 'Role',
                render: (u) => <Badge color="brand">{u.role?.name || '—'}</Badge>,
              },
              {
                key: 'active',
                label: 'Status',
                render: (u) => <Badge color={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Invited'}</Badge>,
              },
              {
                key: 'actions',
                label: '',
                render: (u) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(u)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={users}
            empty="No users yet."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit user' : 'Invite user'}
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
          {!modal?.id && (
            <Field label="Email">
              <input type="email" required className="input" value={modal?.email || ''} onChange={(e) => setModal({ ...modal, email: e.target.value })} />
            </Field>
          )}
          <Field label="Name">
            <input className="input" value={modal?.name || ''} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
          </Field>
          <Field label="Role">
            <select className="input" value={modal?.roleId || ''} onChange={(e) => setModal({ ...modal, roleId: e.target.value })}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={!!modal?.active} onChange={(e) => setModal({ ...modal, active: e.target.checked })} />
            Active
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Remove user"
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
          Remove <span className="font-medium">{confirm?.email}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
