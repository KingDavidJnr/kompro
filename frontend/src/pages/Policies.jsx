import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, Drawer, statusColor, Spinner, UserSelect } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, DocumentIcon, EyeIcon } from '../components/icons';

const STATUSES = ['draft', 'active', 'retired'];

function PolicyDrawer({ policy, onClose, onChanged }) {
  const versions = useGet(`/policies/${policy.id}/versions`);
  const changes = useGet(`/policies/${policy.id}/change-requests`);
  const reviews = useGet(`/policies/${policy.id}/reviews`);
  const exceptions = useGet(`/policies/${policy.id}/exceptions`);
  const [tab, setTab] = useState('overview');

  async function post(path, body, resRefetch) {
    try {
      await api.post(path, body);
      resRefetch();
      onChanged();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'versions', label: 'Versions' },
    { id: 'changes', label: 'Change requests' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'exceptions', label: 'Exceptions' },
  ];

  return (
    <Drawer
      open
      onClose={onClose}
      title={policy.title}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="mb-5 flex gap-2 border-b border-slate-100 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id ? 'bg-charcoal-100 text-charcoal-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge color={statusColor(policy.status)}>{policy.status}</Badge>
            <Badge color="neutral">v{policy.version}</Badge>
          </div>
          <p className="text-sm text-slate-600">{policy.description || 'No description.'}</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs text-slate-600">{policy.content || 'No content.'}</pre>
        </div>
      )}

      {tab === 'versions' && (
        <Section
          loading={versions.loading}
          onAdd={(body) => post(`/policies/${policy.id}/versions`, body, versions.refetch)}
          fields={[
            { key: 'content', label: 'Content', type: 'textarea' },
            { key: 'status', label: 'Status', type: 'select', options: STATUSES },
          ]}
          items={versions.data?.versions || []}
          render={(v) => (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">Version {v.version}</span>
              <Badge color={statusColor(v.status)}>{v.status}</Badge>
            </div>
          )}
        />
      )}

      {tab === 'changes' && (
        <Section
          loading={changes.loading}
          onAdd={(body) => post(`/policies/${policy.id}/change-requests`, body, changes.refetch)}
          fields={[{ key: 'reason', label: 'Reason' }, { key: 'proposedContent', label: 'Proposed content', type: 'textarea' }]}
          items={changes.data?.changeRequests || []}
          render={(c) => (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{c.reason || 'Change request'}</span>
              <Badge color={statusColor(c.status)}>{c.status}</Badge>
            </div>
          )}
        />
      )}

      {tab === 'reviews' && (
        <Section
          loading={reviews.loading}
          onAdd={(body) => post(`/policies/${policy.id}/reviews`, body, reviews.refetch)}
          fields={[
            { key: 'reviewerId', label: 'Reviewer id' },
            { key: 'dueDate', label: 'Due date', type: 'date' },
            { key: 'notes', label: 'Notes' },
            { key: 'status', label: 'Status', type: 'select', options: ['pending', 'complete'] },
          ]}
          items={reviews.data?.reviews || []}
          render={(r) => (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{r.notes || 'Review'}</span>
              <Badge color={statusColor(r.status)}>{r.status}</Badge>
            </div>
          )}
        />
      )}

      {tab === 'exceptions' && (
        <Section
          loading={exceptions.loading}
          onAdd={(body) => post(`/policies/${policy.id}/exceptions`, body, exceptions.refetch)}
          fields={[
            { key: 'reason', label: 'Reason' },
            { key: 'grantedById', label: 'Granted by id' },
            { key: 'expiresAt', label: 'Expires at', type: 'date' },
          ]}
          items={exceptions.data?.exceptions || []}
          render={(e) => (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{e.reason || 'Exception'}</span>
              <Badge color={statusColor(e.status)}>{e.status}</Badge>
            </div>
          )}
        />
      )}
    </Drawer>
  );
}

function Section({ loading, items, onAdd, fields, render }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, ''])));
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <PlusIcon className="h-4 w-4" /> Add
        </Button>
      </div>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAdd(form);
            setForm(Object.fromEntries(fields.map((f) => [f.key, ''])));
            setOpen(false);
          }}
          className="space-y-3 rounded-xl border border-slate-200 p-4"
        >
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === 'textarea' ? (
                <textarea className="input" rows={3} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : f.type === 'select' ? (
                <select className="input" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input type={f.type === 'date' ? 'date' : 'text'} className="input" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </Field>
          ))}
          <Button type="submit" size="sm">
            Save
          </Button>
        </form>
      )}
      {loading ? (
        <Spinner className="h-6 w-6" />
      ) : (
        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-slate-400">None yet.</p>}
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              {render(it)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Policies() {
  const { data, loading, refetch } = useGet('/policies');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const policies = data?.policies || [];

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', content: '', status: 'draft', owner: '' });
  }
  function openEdit(p) {
    setError(null);
    setModal({ id: p.id, title: p.title, description: p.description || '', content: p.content || '', status: p.status, owner: p.owner || '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      if (modal.id) await api.patch(`/policies/${modal.id}`, modal);
      else await api.post('/policies', modal);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/policies/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Policies"
        description="Organization rules and requirements, with versioning and review workflows."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> New policy
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
              { key: 'title', label: 'Title', render: (p) => <span className="font-medium text-slate-900">{p.title}</span> },
              { key: 'owner', label: 'Owner' },
              { key: 'version', label: 'Version', render: (p) => <span className="text-slate-500">v{p.version}</span> },
              { key: 'status', label: 'Status', render: (p) => <Badge color={statusColor(p.status)}>{p.status}</Badge> },
              {
                key: 'actions',
                label: '',
                render: (p) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setSelected(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700" title="Details">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(p)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={policies}
            empty="No policies yet."
          />
        )}
      </Card>

      {selected && <PolicyDrawer policy={selected} onClose={() => setSelected(null)} onChanged={refetch} />}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit policy' : 'New policy'}
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
          <Field label="Content">
            <textarea className="input" rows={4} value={modal?.content || ''} onChange={(e) => setModal({ ...modal, content: e.target.value })} />
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
          <Field label="Owner">
            <UserSelect value={modal?.owner || null} onChange={(v) => setModal({ ...modal, owner: v })} />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete policy"
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
