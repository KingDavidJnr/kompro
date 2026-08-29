import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, Spinner } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon, PlugIcon, ClockIcon } from '../components/icons';

const TYPES = [
  {
    value: 'sql',
    label: 'SQL (database query)',
    hint: 'Runs a read-only query against this app’s own PostgreSQL database. No secrets needed. params: sql, titleColumn, descriptionColumn, controlIdColumn, policyIdColumn, includeRowJson.',
  },
  {
    value: 'http',
    label: 'HTTP / REST',
    hint: 'Calls any REST API (GitHub, AWS, Okta/Entra, Jira, Snyk, …). Credentials go in “secrets” and are referenced as {{secret.KEY}} in url/headers/auth. params: method, url, headers, auth, itemsPath, mapping.',
  },
  {
    value: 'file',
    label: 'File / directory',
    hint: 'Reads files from a server path (e.g. reports dropped by an external job). No secrets needed. params: path, pattern, titleFrom, maxBytes, controlId, policyId.',
  },
];

function toJsonText(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '';
  }
}

function parseJson(text, field) {
  if (!text || !text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`"${field}" is not valid JSON: ${err.message}`);
  }
}

function statusBadge(status) {
  const map = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const cls = map[status] || map.pending;
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status || 'pending'}
    </span>
  );
}

export default function Integrations() {
  const { data, loading, refetch } = useGet('/evidence/collectors');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [runningId, setRunningId] = useState(null);

  const collectors = data?.collectors || [];

  function openCreate() {
    setError(null);
    setMessage(null);
    setModal({
      id: null,
      name: '',
      description: '',
      type: 'sql',
      enabled: true,
      cadenceMinutes: 360,
      paramsText: '{\n  "sql": "SELECT id, title FROM controls LIMIT 50"\n}',
      secretsText: '',
    });
  }

  function openEdit(c) {
    setError(null);
    setMessage(null);
    setModal({
      id: c.id,
      name: c.name,
      description: c.description || '',
      type: c.type,
      enabled: c.enabled,
      cadenceMinutes: c.cadenceMinutes,
      paramsText: toJsonText(c.params),
      secretsText: '', // secrets are encrypted server-side; never sent back to the client
    });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    let params;
    let secrets;
    try {
      params = parseJson(modal.paramsText, 'params');
      // Only send secrets when the operator actually entered them.
      secrets = modal.secretsText.trim() ? parseJson(modal.secretsText, 'secrets') : undefined;
    } catch (err) {
      setError(err.message);
      return;
    }
    try {
      const payload = {
        name: modal.name,
        description: modal.description || undefined,
        type: modal.type,
        enabled: modal.enabled,
        cadenceMinutes: Number(modal.cadenceMinutes) || 360,
        params,
      };
      if (secrets !== undefined) payload.secrets = secrets;
      if (modal.id) await api.patch(`/evidence/collectors/${modal.id}`, payload);
      else await api.post('/evidence/collectors', payload);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function toggle(c) {
    try {
      await api.patch(`/evidence/collectors/${c.id}`, { enabled: !c.enabled });
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/evidence/collectors/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  async function runNow(c) {
    setRunningId(c.id);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post(`/evidence/collectors/${c.id}/run`);
      const result = res.data.data;
      setMessage(`Run complete: ${result.status}${result.added != null ? `, ${result.added} item(s) added` : ''}${result.error ? ` — ${result.error}` : ''}`);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Run failed.');
    } finally {
      setRunningId(null);
    }
  }

  async function openRuns(c) {
    setRuns({ collector: c, loading: true, items: [], error: null, total: 0 });
    try {
      const res = await api.get(`/evidence/collectors/${c.id}/runs`);
      setRuns({ collector: c, loading: false, items: res.data.data.runs || [], error: null, total: res.data.data.total || 0 });
    } catch (err) {
      setRuns({ collector: c, loading: false, items: [], error: err.response?.data?.message || 'Failed to load runs.', total: 0 });
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Integrations"
        description="Automated evidence collectors that pull data from databases, REST APIs and files on a schedule."
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> New collector
          </Button>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

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
                render: (c) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <PlugIcon className="h-4 w-4 text-charcoal-500" /> {c.name}
                  </span>
                ),
              },
              { key: 'type', label: 'Type', render: (c) => <Badge color="charcoal">{c.type}</Badge> },
              {
                key: 'status',
                label: 'Status',
                render: (c) => (
                  <button
                    onClick={() => toggle(c)}
                    className={`relative h-6 w-11 rounded-full transition ${c.enabled ? 'bg-charcoal-800' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${c.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                ),
              },
              {
                key: 'lastRun',
                label: 'Last run',
                render: (c) =>
                  c.lastRunAt ? (
                    <span className="text-sm text-slate-500">
                      {new Date(c.lastRunAt).toLocaleString()}
                      <span className="ml-2">{statusBadge(c.lastStatus)}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">never</span>
                  ),
              },
              {
                key: 'actions',
                label: '',
                render: (c) => (
                  <div className="flex justify-end items-center gap-1">
                    <button
                      onClick={() => runNow(c)}
                      disabled={runningId === c.id}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700"
                      aria-label="Run now"
                    >
                      {runningId === c.id ? <Spinner className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openRuns(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700" aria-label="Run history">
                      <ClockIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700" aria-label="Edit">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600" aria-label="Delete">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={collectors}
            empty="No collectors yet. Add one to start automating evidence collection."
          />
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit collector' : 'New collector'}
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
          <Field label="Type">
            <select className="input" value={modal?.type || 'sql'} onChange={(e) => setModal({ ...modal, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">{TYPES.find((t) => t.value === modal?.type)?.hint}</p>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Enabled">
              <input type="checkbox" checked={!!modal?.enabled} onChange={(e) => setModal({ ...modal, enabled: e.target.checked })} className="mt-2 h-4 w-4" />
            </Field>
            <Field label="Cadence (minutes)">
              <input type="number" min="1" className="input" value={modal?.cadenceMinutes ?? 360} onChange={(e) => setModal({ ...modal, cadenceMinutes: e.target.value })} />
            </Field>
          </div>
          <Field label="Parameters (JSON)">
            <textarea className="input font-mono text-xs" rows={6} value={modal?.paramsText || ''} onChange={(e) => setModal({ ...modal, paramsText: e.target.value })} />
          </Field>
          <Field label="Secrets (JSON)" hint={modal?.id ? 'Leave blank to keep the existing encrypted secrets.' : 'Credentials referenced from parameters, e.g. {"token":"…"}. Stored encrypted.'}>
            <textarea className="input font-mono text-xs" rows={4} value={modal?.secretsText || ''} onChange={(e) => setModal({ ...modal, secretsText: e.target.value })} placeholder='{ "token": "…" }' />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete collector"
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
          Delete <span className="font-medium">{confirm?.name}</span>? This stops its scheduled runs.
        </p>
      </Modal>

      <Modal
        open={!!runs}
        onClose={() => setRuns(null)}
        title={runs ? `Run history — ${runs.collector.name}` : 'Run history'}
        footer={
          <Button variant="secondary" onClick={() => setRuns(null)}>
            Close
          </Button>
        }
      >
        {runs?.loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-7 w-7" />
          </div>
        ) : runs?.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{runs.error}</div>
        ) : runs?.items?.length ? (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {runs.items.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                  {statusBadge(r.after?.status)}
                </div>
                {r.after?.added != null && <p className="mt-1 text-sm text-slate-600">{r.after.added} item(s) added</p>}
                {r.after?.error && <p className="mt-1 text-sm text-rose-600">{r.after.error}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No runs recorded yet.</p>
        )}
      </Modal>
    </div>
  );
}
