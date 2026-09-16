import React, { useState, useEffect } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import {
  PageHeader, Button, Card, Badge, Modal, Field, Table,
  statusColor, TableSkeleton, Drawer, Spinner, UserSelect,
} from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, ClipboardIcon, DocumentIcon, EyeIcon, CheckIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';
import { useListState, applyList, FilterBar, PaginationBar } from '../components/listUtils';

const RESULTS = ['satisfied', 'partially_satisfied', 'unsatisfied', 'needs_review'];
const RESULT_COLOR = {
  satisfied: 'success',
  partially_satisfied: 'warning',
  needs_review: 'warning',
  unsatisfied: 'danger',
};
const STATUS_COLOR = { pending: 'neutral', in_progress: 'warning', complete: 'success' };

// ── Complete Assessment Drawer ────────────────────────────────────────────────

function CompleteDrawer({ assessment, onClose, onUpdated }) {
  const [form, setForm] = useState({
    status: assessment.status === 'complete' ? 'complete' : 'in_progress',
    result: assessment.result || 'satisfied',
    notes: assessment.notes || '',
    assessmentDate: assessment.assessmentDate
      ? new Date(assessment.assessmentDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    evidenceIds: assessment.evidenceLinks?.map((l) => l.evidence.id) || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load evidence linked to the control for quick selection.
  const evidenceRes = useGet(`/evidence?pageSize=100${assessment.controlId ? `&controlId=${assessment.controlId}` : ''}`);
  const allEvidence = evidenceRes.data?.evidence || [];

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(`/assessments/${assessment.id}`, {
        ...form,
        status: 'complete',
        assessmentDate: form.assessmentDate || null,
      });
      onUpdated(res.data.data.assessment);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function markInProgress() {
    try {
      const res = await api.patch(`/assessments/${assessment.id}`, { status: 'in_progress' });
      onUpdated(res.data.data.assessment);
    } catch {}
  }

  function toggleEvidence(id) {
    setForm((prev) => ({
      ...prev,
      evidenceIds: prev.evidenceIds.includes(id)
        ? prev.evidenceIds.filter((e) => e !== id)
        : [...prev.evidenceIds, id],
    }));
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Complete Assessment`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {assessment.status === 'pending' && (
            <Button variant="secondary" onClick={markInProgress}>Mark In Progress</Button>
          )}
          <Button onClick={submit} disabled={saving}>
            <CheckIcon className="h-4 w-4" />
            {saving ? 'Saving...' : 'Submit Assessment'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Context */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1.5 text-sm">
          <p><span className="font-medium text-slate-500">Control:</span> <span className="text-slate-800">{assessment.control?.title}</span></p>
          {assessment.framework && <p><span className="font-medium text-slate-500">Framework:</span> <span className="text-slate-800">{assessment.framework.name}</span></p>}
          {assessment.requirement && (
            <p>
              <span className="font-medium text-slate-500">Requirement:</span>{' '}
              <span className="text-slate-800">
                {assessment.requirement.code && <span className="mr-1.5 font-mono text-xs text-slate-400">{assessment.requirement.code}</span>}
                {assessment.requirement.title}
              </span>
            </p>
          )}
          {assessment.assessor && <p><span className="font-medium text-slate-500">Assessor:</span> <span className="text-slate-800">{assessment.assessor.name || assessment.assessor.email}</span></p>}
          {assessment.dueDate && <p><span className="font-medium text-slate-500">Due:</span> <span className="text-slate-800">{new Date(assessment.dueDate).toLocaleDateString()}</span></p>}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Result" hint="Your verdict on this control's effectiveness.">
            <div className="grid grid-cols-2 gap-2">
              {RESULTS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, result: r }))}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${form.result === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full ${RESULT_COLOR[r] === 'success' ? 'bg-emerald-500' : RESULT_COLOR[r] === 'warning' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                  {r.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes & Findings" hint="Describe what was reviewed, any gaps found, and recommendations.">
            <textarea
              className="input"
              rows={5}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="What evidence was reviewed? Were there any gaps? What do you recommend?"
            />
          </Field>

          <Field label="Assessment date">
            <input
              type="date"
              className="input"
              value={form.assessmentDate}
              onChange={(e) => setForm((p) => ({ ...p, assessmentDate: e.target.value }))}
            />
          </Field>

          {/* Evidence reviewed */}
          <Field label="Evidence reviewed" hint="Select the evidence records you reviewed for this assessment.">
            {evidenceRes.loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400"><Spinner className="h-4 w-4" /> Loading evidence...</div>
            ) : allEvidence.length === 0 ? (
              <p className="text-sm text-slate-400">No evidence linked to this control yet.</p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 p-2">
                {allEvidence.map((ev) => (
                  <label key={ev.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={form.evidenceIds.includes(ev.id)}
                      onChange={() => toggleEvidence(ev.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    />
                    <span className="text-sm text-slate-700">{ev.title}</span>
                    <Badge color="info" className="ml-auto">{ev.source}</Badge>
                  </label>
                ))}
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </div>
    </Drawer>
  );
}

// ── Schedule Assessment Modal ─────────────────────────────────────────────────

function ScheduleModal({ onClose, onCreated }) {
  const frameworksRes = useGet('/frameworks?pageSize=100');
  const frameworks = frameworksRes.data?.frameworks || [];

  const [form, setForm] = useState({ frameworkId: '', requirementId: '', controlId: '', assessorId: '', dueDate: '' });
  const [requirements, setRequirements] = useState([]);
  const [controls, setControls] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [loadingControls, setLoadingControls] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load requirements when framework changes.
  useEffect(() => {
    if (!form.frameworkId) { setRequirements([]); setForm((p) => ({ ...p, requirementId: '', controlId: '' })); return; }
    setLoadingReqs(true);
    api.get(`/requirements?frameworkId=${form.frameworkId}`)
      .then((res) => setRequirements(res.data.data.requirements || []))
      .catch(() => setRequirements([]))
      .finally(() => setLoadingReqs(false));
    setForm((p) => ({ ...p, requirementId: '', controlId: '' }));
    setControls([]);
  }, [form.frameworkId]);

  // Load controls mapped to the selected requirement.
  useEffect(() => {
    if (!form.requirementId) { setControls([]); setForm((p) => ({ ...p, controlId: '' })); return; }
    setLoadingControls(true);
    api.get(`/assessments/requirement/${form.requirementId}/controls`)
      .then((res) => setControls(res.data.data.controls || []))
      .catch(() => setControls([]))
      .finally(() => setLoadingControls(false));
    setForm((p) => ({ ...p, controlId: '' }));
  }, [form.requirementId]);

  async function save(e) {
    e.preventDefault();
    setError(null);
    if (!form.controlId) { setError('Please select a control.'); return; }
    setSaving(true);
    try {
      const res = await api.post('/assessments', {
        controlId: form.controlId,
        frameworkId: form.frameworkId || null,
        requirementId: form.requirementId || null,
        assessorId: form.assessorId || null,
        dueDate: form.dueDate || null,
      });
      onCreated(res.data.data.assessment);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule assessment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Schedule Assessment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Scheduling...' : 'Schedule'}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <Field label="Framework" hint="Which compliance framework is this assessment for?">
          <select
            className="input"
            value={form.frameworkId}
            onChange={(e) => setForm((p) => ({ ...p, frameworkId: e.target.value }))}
          >
            <option value="">Select framework...</option>
            {frameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>

        <Field label="Requirement" hint="The specific requirement being assessed.">
          {loadingReqs ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><Spinner className="h-4 w-4" /> Loading...</div>
          ) : (
            <select
              className="input"
              value={form.requirementId}
              onChange={(e) => setForm((p) => ({ ...p, requirementId: e.target.value }))}
              disabled={!form.frameworkId}
            >
              <option value="">{form.frameworkId ? 'Select requirement...' : 'Select a framework first'}</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code ? `${r.code} — ` : ''}{r.title}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Control" hint="Only controls already mapped to this requirement are shown.">
          {loadingControls ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><Spinner className="h-4 w-4" /> Loading...</div>
          ) : (
            <select
              className="input"
              value={form.controlId}
              onChange={(e) => setForm((p) => ({ ...p, controlId: e.target.value }))}
              disabled={!form.requirementId}
            >
              <option value="">{form.requirementId ? (controls.length ? 'Select control...' : 'No controls mapped yet') : 'Select a requirement first'}</option>
              {controls.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}{c.category ? ` · ${c.category}` : ''}
                </option>
              ))}
            </select>
          )}
          {form.requirementId && controls.length === 0 && !loadingControls && (
            <p className="mt-1 text-xs text-amber-600">No controls are mapped to this requirement yet. Map controls on the framework detail page first.</p>
          )}
        </Field>

        <Field label="Assessor" hint="Who will conduct this assessment. Defaults to you.">
          <UserSelect
            value={form.assessorId || null}
            onChange={(v) => setForm((p) => ({ ...p, assessorId: v }))}
            placeholder="Assign to me (default)"
            valueKey="id"
          />
        </Field>

        <Field label="Due date">
          <input
            type="date"
            className="input"
            value={form.dueDate}
            onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
          />
        </Field>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}

// ── Main Assessments Page ─────────────────────────────────────────────────────

export default function Assessments() {
  const { data, loading, silentRefetch, setData } = useGet('/assessments?pageSize=100');
  const [showSchedule, setShowSchedule] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const assessments = data?.assessments || [];
  const list = useListState(50);

  const { filtered, paginated, totalPages, safePage } = applyList(
    assessments,
    list,
    (a, q, filters) => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.result && a.result !== filters.result) return false;
      const controlTitle = (a.control?.title || '').toLowerCase();
      const reqTitle = (a.requirement?.title || '').toLowerCase();
      const fwName = (a.framework?.name || '').toLowerCase();
      return !q || controlTitle.includes(q) || reqTitle.includes(q) || fwName.includes(q);
    }
  );

  function handleCreated(assessment) {
    setData((prev) => ({ ...prev, assessments: [assessment, ...(prev.assessments || [])] }));
    silentRefetch();
  }

  function handleUpdated(assessment) {
    setData((prev) => ({
      ...prev,
      assessments: (prev.assessments || []).map((a) => a.id === assessment.id ? assessment : a),
    }));
    silentRefetch();
  }

  async function remove() {
    try {
      await api.delete(`/assessments/${confirm.id}`);
      setData((prev) => ({ ...prev, assessments: (prev.assessments || []).filter((a) => a.id !== confirm.id) }));
      setConfirm(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Assessments"
        description="Evaluate controls against specific framework requirements."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv('assessments.csv', [
              { key: '_row_num', label: '#' },
              { key: 'control', label: 'Control', format: (a) => a.control?.title || '' },
              { key: 'framework', label: 'Framework', format: (a) => a.framework?.name || '' },
              { key: 'requirement', label: 'Requirement', format: (a) => a.requirement ? `${a.requirement.code || ''} ${a.requirement.title}`.trim() : '' },
              { key: 'status', label: 'Status' },
              { key: 'result', label: 'Result', format: (a) => a.result || '' },
              { key: 'assessor', label: 'Assessor', format: (a) => a.assessor?.name || a.assessor?.email || '' },
              { key: 'dueDate', label: 'Due', format: (a) => a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '' },
            ], filtered)}>
              <DocumentIcon className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => setShowSchedule(true)}>
              <PlusIcon className="h-4 w-4" /> Schedule assessment
            </Button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <FilterBar search={list.search} onSearch={list.setSearch} totalLabel="assessment" filteredCount={filtered.length} hasFilters={list.hasFilters} onReset={list.reset}>
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
          value={list.filters.status || ''}
          onChange={(e) => list.setFilter('status', e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="complete">Complete</option>
        </select>
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
          value={list.filters.result || ''}
          onChange={(e) => list.setFilter('result', e.target.value)}
        >
          <option value="">All results</option>
          {RESULTS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </FilterBar>

      <Card>
        {loading ? (
          <TableSkeleton columns={7} />
        ) : (
          <Table
            numbered
            columns={[
              {
                key: 'control',
                label: 'Control',
                render: (a) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <ClipboardIcon className="h-4 w-4 shrink-0 text-charcoal-500" />
                    <span className="truncate max-w-[180px]">{a.control?.title || '—'}</span>
                  </span>
                ),
              },
              {
                key: 'requirement',
                label: 'Requirement',
                render: (a) => a.requirement ? (
                  <span className="text-slate-600 text-sm">
                    {a.requirement.code && <span className="mr-1 font-mono text-xs text-slate-400">{a.requirement.code}</span>}
                    <span className="truncate">{a.requirement.title}</span>
                    {a.framework && <span className="ml-1 text-xs text-slate-400">({a.framework.name})</span>}
                  </span>
                ) : <span className="text-slate-400">—</span>,
              },
              {
                key: 'status',
                label: 'Status',
                render: (a) => <Badge color={STATUS_COLOR[a.status] || 'neutral'}>{a.status}</Badge>,
              },
              {
                key: 'result',
                label: 'Result',
                render: (a) => a.result
                  ? <Badge color={RESULT_COLOR[a.result] || 'neutral'}>{a.result.replace(/_/g, ' ')}</Badge>
                  : <span className="text-xs text-slate-300">—</span>,
              },
              {
                key: 'assessor',
                label: 'Assessor',
                render: (a) => <span className="text-slate-500 text-sm">{a.assessor?.name || a.assessor?.email || '—'}</span>,
              },
              {
                key: 'dueDate',
                label: 'Due',
                render: (a) => a.dueDate
                  ? <span className={`text-sm ${new Date(a.dueDate) < new Date() && a.status !== 'complete' ? 'font-medium text-rose-600' : 'text-slate-500'}`}>{new Date(a.dueDate).toLocaleDateString()}</span>
                  : <span className="text-slate-300">—</span>,
              },
              {
                key: 'actions',
                label: '',
                render: (a) => (
                  <div className="flex justify-end gap-1">
                    {a.status !== 'complete' && (
                      <button
                        onClick={() => setCompleting(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title="Complete assessment"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    {a.status === 'complete' && (
                      <button
                        onClick={() => setCompleting(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700"
                        title="View / edit assessment"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setConfirm(a)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={paginated}
            empty={list.hasFilters ? 'No assessments match your filters.' : 'No assessments yet. Click "Schedule assessment" to begin.'}
          />
        )}
      </Card>
      <PaginationBar page={list.page} setPage={list.setPage} pageSize={list.pageSize} setPageSize={list.setPageSize} totalPages={totalPages} safePage={safePage} filteredCount={filtered.length} />

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onCreated={handleCreated} />}
      {completing && <CompleteDrawer assessment={completing} onClose={() => setCompleting(null)} onUpdated={handleUpdated} />}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete assessment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={remove}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete the assessment for <span className="font-medium">{confirm?.control?.title || 'this control'}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
