import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, TableSkeleton, statusColor, UserSelect } from '../components/ui';
import { PlusIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';

const STATUSES = ['draft', 'active', 'retired'];

export default function Policies() {
  const { data, loading, refetch, setData } = useGet('/policies');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const policies = data?.policies || [];

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', status: 'draft', owner: '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/policies', modal);
      const created = res.data.data.policy;
      setModal(null);
      // Navigate directly to the new policy's detail page.
      navigate(`/policies/${created.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Policies"
        description="Organization rules and requirements, with versioning and review workflows."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv('policies.csv', [
              { key: '_row_num', label: '#' },
              { key: 'title', label: 'Title' },
              { key: 'owner', label: 'Owner' },
              { key: 'version', label: 'Version' },
              { key: 'status', label: 'Status' },
            ], policies)}>
              <DocumentIcon className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" /> New policy
            </Button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <Card>
        {loading ? (
          <TableSkeleton columns={6} />
        ) : (
          <Table
            numbered
            onRowClick={(p) => navigate(`/policies/${p.id}`)}
            rowClassName="cursor-pointer"
            columns={[
              { key: 'title', label: 'Title', render: (p) => <span className="font-medium text-slate-900">{p.title}</span> },
              { key: 'description', label: 'Description', render: (p) => <span className="text-slate-500 text-sm">{p.description || '—'}</span> },
              { key: 'owner', label: 'Owner', render: (p) => <span className="text-slate-500">{p.owner || '—'}</span> },
              { key: 'version', label: 'Version', render: (p) => <Badge color="neutral">v{p.version}</Badge> },
              { key: 'status', label: 'Status', render: (p) => <Badge color={statusColor(p.status)}>{p.status}</Badge> },
            ]}
            rows={policies}
            empty="No policies yet. Click New policy to create one."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title="New policy"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save}>Create</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Title">
            <input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} placeholder="e.g. Information Security Policy" />
          </Field>
          <Field label="Description" hint="Short summary shown in the policies list.">
            <input className="input" value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} placeholder="What this policy covers" />
          </Field>
          <Field label="Status">
            <select className="input" value={modal?.status || 'draft'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Owner">
            <UserSelect value={modal?.owner || null} onChange={(v) => setModal({ ...modal, owner: v })} />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
