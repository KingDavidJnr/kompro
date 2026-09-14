import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { API_URL } from '../config';
import { PageHeader, Badge, Button, Card, Field, Modal, Spinner, statusColor } from '../components/ui';
import { ArrowLeftIcon, DocumentIcon, TrashIcon, PlusIcon } from '../components/icons';
import MarkdownEditor from '../components/MarkdownEditor';

const STATUSES = ['draft', 'active', 'retired'];

function Section({ title, loading, items, onAdd, fields, render }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => Object.fromEntries((fields || []).map((f) => [f.key, ''])));

  async function submit(e) {
    e.preventDefault();
    await onAdd(form);
    setForm(Object.fromEntries((fields || []).map((f) => [f.key, ''])));
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {(fields || []).map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === 'textarea' ? (
                <textarea className="input" rows={3} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : f.type === 'select' ? (
                <select className="input" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">--</option>
                  {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type === 'date' ? 'date' : 'text'} className="input" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </Field>
          ))}
          <div className="flex gap-2">
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-4 text-center"><Spinner className="h-5 w-5" /></div>
      ) : items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              {render(it)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">None yet.</p>
      )}
    </div>
  );
}

export default function PolicyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, refetch } = useGet(`/policies/${id}`);
  const versionsRes = useGet(`/policies/${id}/versions`);
  const changesRes = useGet(`/policies/${id}/change-requests`);
  const reviewsRes = useGet(`/policies/${id}/reviews`);
  const exceptionsRes = useGet(`/policies/${id}/exceptions`);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [tab, setTab] = useState('content');
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  const policy = data?.policy;

  // Initialise form from loaded policy (only once).
  React.useEffect(() => {
    if (policy && form === null) {
      setForm({
        title: policy.title,
        description: policy.description || '',
        content: policy.content || '',
        status: policy.status,
        owner: policy.owner || '',
      });
    }
  }, [policy]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch(`/policies/${id}`, form);
      refetch();
      versionsRes.refetch();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/policies/${id}/file`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      refetch();
      versionsRes.refetch();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function removeFile() {
    try {
      await api.patch(`/policies/${id}`, { filePath: null, mimeType: null });
      refetch();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Remove failed.');
    }
  }

  async function deletePolicy() {
    try {
      await api.delete(`/policies/${id}`);
      navigate('/policies');
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Delete failed.');
    }
  }

  async function addSubResource(path, body, resRefetch) {
    try {
      await api.post(path, body);
      resRefetch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  }

  if (loading || form === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-sm font-semibold text-rose-700">Policy not found</p>
        <Link to="/policies" className="mt-4 inline-block text-sm font-medium text-charcoal-700 hover:underline">Back to policies</Link>
      </div>
    );
  }

  const fileUrl = `${API_URL}/policies/${id}/file`;
  const downloadUrl = `${API_URL}/policies/${id}/file?download=1`;
  const isPdf = policy.mimeType === 'application/pdf';

  const TABS = [
    { id: 'content', label: 'Content' },
    { id: 'versions', label: `Versions (${versionsRes.data?.versions?.length ?? 0})` },
    { id: 'changes', label: 'Change Requests' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'exceptions', label: 'Exceptions' },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <DocumentIcon className="h-5 w-5 text-charcoal-500" />
            <span className="truncate">{policy.title}</span>
          </span>
        }
        description={policy.description || ''}
        actions={
          <div className="flex items-center gap-2">
            <Badge color={statusColor(policy.status)}>{policy.status}</Badge>
            <Badge color="neutral">v{policy.version}</Badge>
            <Link to="/policies">
              <Button variant="secondary"><ArrowLeftIcon className="h-4 w-4" /> Policies</Button>
            </Link>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <TrashIcon className="h-4 w-4" /> Delete
            </Button>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 border-b border-slate-100 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content tab */}
      {tab === 'content' && (
        <form onSubmit={save} className="space-y-5">
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Title">
                  <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </Field>
              </div>
              <Field label="Status">
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Description">
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short summary of what this policy covers" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Owner">
                <input className="input" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Policy owner name or email" />
              </Field>
            </div>
          </Card>

          {/* Markdown content editor */}
          <Card className="p-5">
            <p className="mb-2 text-sm font-semibold text-slate-700">Policy Content</p>
            <p className="mb-3 text-xs text-slate-400">Write the policy text using Markdown. Use the toolbar for formatting. Switch to Preview to see the rendered output.</p>
            <MarkdownEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} rows={20} />
          </Card>

          {/* File attachment */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Document Attachment</p>
                <p className="mt-0.5 text-xs text-slate-400">Attach a PDF or Word document. It will be available for inline viewing and download.</p>
              </div>
              <div className="flex items-center gap-2">
                {policy.filePath && (
                  <>
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" type="button">Download</Button>
                    </a>
                    <Button variant="secondary" type="button" onClick={removeFile}>Remove file</Button>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} />
                <Button variant="secondary" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading...' : policy.filePath ? 'Replace file' : 'Attach file'}
                </Button>
              </div>
            </div>

            {uploadError && <p className="mt-2 text-sm text-rose-600">{uploadError}</p>}

            {policy.filePath && isPdf && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <embed
                  src={fileUrl}
                  type="application/pdf"
                  className="h-[600px] w-full"
                  title={policy.title}
                />
              </div>
            )}

            {policy.filePath && !isPdf && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <DocumentIcon className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Document attached</p>
                  <p className="text-xs text-slate-400">{policy.mimeType}</p>
                </div>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm font-medium text-brand-600 hover:underline">
                  Download
                </a>
              </div>
            )}
          </Card>

          {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      )}

      {/* Versions tab */}
      {tab === 'versions' && (
        <Card className="p-5">
          <div className="space-y-4">
            {versionsRes.loading ? (
              <div className="py-4 text-center"><Spinner className="h-5 w-5" /></div>
            ) : (versionsRes.data?.versions || []).length === 0 ? (
              <p className="text-sm text-slate-400">No version snapshots yet. Versions are created automatically when you save content changes.</p>
            ) : (
              (versionsRes.data?.versions || []).map((v) => (
                <div key={v.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge color="neutral">v{v.version}</Badge>
                      <Badge color={statusColor(v.status)}>{v.status}</Badge>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(v.createdAt).toLocaleString()}</span>
                  </div>
                  {v.content && (
                    <div
                      className="prose prose-sm mt-3 max-w-none rounded-lg bg-slate-50 p-3 text-slate-600"
                      dangerouslySetInnerHTML={{ __html: marked.parse(v.content) }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Change Requests tab */}
      {tab === 'changes' && (
        <Card className="p-5">
          <Section
            title="Change Requests"
            loading={changesRes.loading}
            items={changesRes.data?.changeRequests || []}
            onAdd={(body) => addSubResource(`/policies/${id}/change-requests`, body, changesRes.refetch)}
            fields={[
              { key: 'reason', label: 'Reason', type: 'textarea' },
              { key: 'proposedContent', label: 'Proposed content', type: 'textarea' },
            ]}
            render={(c) => (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700">{c.reason || 'Change request'}</p>
                <Badge color={statusColor(c.status)}>{c.status}</Badge>
              </div>
            )}
          />
        </Card>
      )}

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <Card className="p-5">
          <Section
            title="Reviews"
            loading={reviewsRes.loading}
            items={reviewsRes.data?.reviews || []}
            onAdd={(body) => addSubResource(`/policies/${id}/reviews`, body, reviewsRes.refetch)}
            fields={[
              { key: 'dueDate', label: 'Due date', type: 'date' },
              { key: 'notes', label: 'Notes', type: 'textarea' },
              { key: 'status', label: 'Status', type: 'select', options: ['pending', 'complete'] },
            ]}
            render={(r) => (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-700">{r.notes || 'Review'}</p>
                  {r.dueDate && <p className="mt-0.5 text-xs text-slate-400">Due {new Date(r.dueDate).toLocaleDateString()}</p>}
                </div>
                <Badge color={statusColor(r.status)}>{r.status}</Badge>
              </div>
            )}
          />
        </Card>
      )}

      {/* Exceptions tab */}
      {tab === 'exceptions' && (
        <Card className="p-5">
          <Section
            title="Exceptions"
            loading={exceptionsRes.loading}
            items={exceptionsRes.data?.exceptions || []}
            onAdd={(body) => addSubResource(`/policies/${id}/exceptions`, body, exceptionsRes.refetch)}
            fields={[
              { key: 'reason', label: 'Reason', type: 'textarea' },
              { key: 'expiresAt', label: 'Expires at', type: 'date' },
            ]}
            render={(ex) => (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-700">{ex.reason || 'Exception'}</p>
                  {ex.expiresAt && <p className="mt-0.5 text-xs text-slate-400">Expires {new Date(ex.expiresAt).toLocaleDateString()}</p>}
                </div>
                <Badge color={statusColor(ex.status)}>{ex.status}</Badge>
              </div>
            )}
          />
        </Card>
      )}

      {/* Delete confirmation */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete policy"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={deletePolicy}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-medium">{policy.title}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
