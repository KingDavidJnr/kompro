import React, { useState, useRef, useEffect } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import {
  PageHeader, Button, Card, Badge, Modal, Field, Table,
  statusColor, TableSkeleton, SearchableSelect, Drawer, Spinner,
} from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon, DocumentIcon, EyeIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';

const SOURCES = ['manual', 'upload', 'documentation', 'policy', 'integration', 'automated_check', 'infrastructure', 'other'];

// Determine how to render a file based on its MIME type.
function fileCategory(mimeType) {
  if (!mimeType) return null;
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
}

// A drawer that shows the full evidence record plus file preview.
function EvidenceDrawer({ evidenceId, onClose, onEdit }) {
  const { data, loading } = useGet(`/evidence/${evidenceId}`);
  const ev = data?.evidence;
  const [blobUrl, setBlobUrl] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);

  useEffect(() => {
    if (!ev?.filePath) { setBlobUrl(null); return; }
    setFileLoading(true);
    api.get(`/evidence/${evidenceId}/file`, { responseType: 'blob' })
      .then((res) => setBlobUrl(URL.createObjectURL(res.data)))
      .catch(() => setBlobUrl(null))
      .finally(() => setFileLoading(false));
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [ev?.filePath]);

  async function downloadFile() {
    try {
      const res = await api.get(`/evidence/${evidenceId}/file`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = ev?.title || 'evidence';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  const cat = fileCategory(ev?.mimeType);

  return (
    <Drawer
      open
      onClose={onClose}
      title={ev?.title || 'Evidence'}
      footer={
        <div className="flex gap-2">
          {ev && <Button variant="secondary" onClick={() => onEdit(ev)}>Edit</Button>}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
      ) : ev ? (
        <div className="space-y-5">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge color={statusColor(ev.status)}>{ev.status}</Badge>
            {ev.source && <Badge color="info">{ev.source}</Badge>}
            {ev.collectedAt && (
              <span className="text-xs text-slate-400">
                Collected {new Date(ev.collectedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {ev.description && <p className="text-sm text-slate-600">{ev.description}</p>}

          {ev.content && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Notes</p>
              <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{ev.content}</pre>
            </div>
          )}

          {/* Linked resources */}
          {(ev.controlId || ev.policyId) && (
            <div className="flex flex-wrap gap-2">
              {ev.control && <Badge color="neutral">Control: {ev.control.title}</Badge>}
              {ev.policy && <Badge color="neutral">Policy: {ev.policy.title}</Badge>}
            </div>
          )}

          {/* File preview */}
          {ev.filePath && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Attachment</p>
                <Button variant="secondary" onClick={downloadFile}>Download</Button>
              </div>

              {fileLoading ? (
                <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50">
                  <Spinner className="h-5 w-5" />
                </div>
              ) : blobUrl && cat === 'image' ? (
                <img
                  src={blobUrl}
                  alt={ev.title}
                  className="max-h-[500px] w-full rounded-lg border border-slate-200 object-contain"
                />
              ) : blobUrl && cat === 'pdf' ? (
                <iframe
                  src={blobUrl}
                  className="h-[500px] w-full rounded-lg border border-slate-200"
                  title={ev.title}
                />
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <DocumentIcon className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{ev.mimeType || 'File attached'}</p>
                    <button onClick={downloadFile} className="text-xs text-brand-600 hover:underline">
                      Click to download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Evidence not found.</p>
      )}
    </Drawer>
  );
}

export default function Evidence() {
  const { data, loading, silentRefetch, setData } = useGet('/evidence?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const evidence = data?.evidence || [];

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', source: 'manual', content: '', controlId: '', policyId: '', file: null });
  }
  function openEdit(e) {
    setError(null);
    setModal({
      id: e.id,
      title: e.title,
      description: e.description || '',
      source: e.source || 'manual',
      content: e.content || '',
      controlId: e.controlId || '',
      policyId: e.policyId || '',
      file: null,
      existingFile: !!e.filePath,
      mimeType: e.mimeType,
    });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Always use FormData so the optional file is sent correctly via multer.
      const fd = new FormData();
      if (modal.title) fd.append('title', modal.title);
      if (modal.description) fd.append('description', modal.description);
      if (modal.source) fd.append('source', modal.source);
      if (modal.content) fd.append('content', modal.content);
      if (modal.controlId) fd.append('controlId', modal.controlId);
      if (modal.policyId) fd.append('policyId', modal.policyId);
      if (modal.file) fd.append('file', modal.file);

      let result;
      if (modal.id) {
        const res = await api.patch(`/evidence/${modal.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        result = res.data.data.evidence;
        setData((prev) => ({ ...prev, evidence: (prev.evidence || []).map((ev) => ev.id === result.id ? result : ev) }));
      } else {
        const res = await api.post('/evidence', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        result = res.data.data.evidence;
        setData((prev) => ({ ...prev, evidence: [...(prev.evidence || []), result] }));
      }
      setModal(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
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
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv('evidence.csv', [
              { key: '_row_num', label: '#' },
              { key: 'title', label: 'Title' },
              { key: 'source', label: 'Source' },
              { key: 'status', label: 'Status' },
              { key: 'collectedAt', label: 'Collected' },
            ], evidence)}>
              <DocumentIcon className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" /> Add evidence
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
              { key: 'source', label: 'Source', render: (e) => <Badge color="info">{e.source || '—'}</Badge> },
              { key: 'status', label: 'Status', render: (e) => <Badge color={statusColor(e.status)}>{e.status}</Badge> },
              {
                key: 'file',
                label: 'File',
                render: (e) => e.filePath ? (
                  <span className="flex items-center gap-1 text-xs text-brand-600">
                    <DocumentIcon className="h-3.5 w-3.5" />
                    {e.mimeType?.startsWith('image/') ? 'Image' : e.mimeType === 'application/pdf' ? 'PDF' : 'File'}
                  </span>
                ) : <span className="text-xs text-slate-300">—</span>,
              },
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
                    <button onClick={() => setViewing(e.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700" title="View">
                      <EyeIcon className="h-4 w-4" />
                    </button>
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

      {/* Detail drawer */}
      {viewing && (
        <EvidenceDrawer
          evidenceId={viewing}
          onClose={() => setViewing(null)}
          onEdit={(ev) => { setViewing(null); openEdit(ev); }}
        />
      )}

      {/* Create / Edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit evidence' : 'Add evidence'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
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
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          {/* File upload */}
          <Field label="File attachment" hint="Upload an image, PDF, or document as evidence.">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center hover:border-brand-300 hover:bg-white transition cursor-pointer"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) setModal((m) => ({ ...m, file }));
              }}
            >
              {modal?.file ? (
                <div className="flex items-center gap-2">
                  <DocumentIcon className="h-5 w-5 text-brand-500" />
                  <span className="text-sm font-medium text-slate-700">{modal.file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setModal((m) => ({ ...m, file: null })); }}
                    className="ml-2 text-xs text-rose-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : modal?.existingFile ? (
                <div className="text-sm text-slate-500">
                  <DocumentIcon className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                  File already attached. Drop or click to replace.
                </div>
              ) : (
                <div>
                  <DocumentIcon className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  <p className="text-sm text-slate-500">Drag & drop or <span className="text-brand-600">browse</span></p>
                  <p className="mt-0.5 text-xs text-slate-400">Images, PDFs, Word documents, text files</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setModal((m) => ({ ...m, file }));
                  e.target.value = '';
                }}
              />
            </div>
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

      {/* Delete confirmation */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete evidence"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={remove}>Delete</Button>
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
