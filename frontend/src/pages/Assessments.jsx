import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, TableSkeleton, SearchableSelect } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, ClipboardIcon, DocumentIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';
import { useListState, applyList, FilterBar, PaginationBar } from '../components/listUtils';

const RESULTS = ['satisfied', 'partially_satisfied', 'unsatisfied', 'needs_review'];

const RESULT_COLOR = {
  satisfied: 'success',
  partially_satisfied: 'warning',
  needs_review: 'warning',
  unsatisfied: 'danger',
};

export default function Assessments() {
  const { data, loading, silentRefetch, setData } = useGet('/assessments?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const assessments = data?.assessments || [];
  const list = useListState(50);

  const { filtered, paginated, totalPages, safePage } = applyList(
    assessments,
    list,
    (a, q, filters) => {
      if (filters.result && a.result !== filters.result) return false;
      const controlTitle = (a.control?.title || '').toLowerCase();
      const notes = (a.notes || '').toLowerCase();
      return !q || controlTitle.includes(q) || notes.includes(q);
    }
  );

  // Control search helpers for the SearchableSelect.
  const controlLabel = (c) => `${c.title}${c.category ? ` · ${c.category}` : ''}`;
  const loadControls = async (q) => {
    const res = await api.get(`/controls?pageSize=50${q ? `&search=${encodeURIComponent(q)}` : ''}`);
    return (res.data.data.controls || []).map((c) => ({ value: c.id, label: controlLabel(c) }));
  };
  const loadControl = async (id) => {
    const res = await api.get(`/controls/${id}`);
    const c = res.data.data.control;
    return { value: c.id, label: controlLabel(c) };
  };

  function openCreate() {
    setError(null);
    setModal({ controlId: null, result: 'satisfied', notes: '', assessmentDate: '', dueDate: '' });
  }
  function openEdit(a) {
    setError(null);
    setModal({
      id: a.id,
      controlId: a.controlId || null,
      result: a.result,
      notes: a.notes || '',
      assessmentDate: a.assessmentDate ? a.assessmentDate.slice(0, 10) : '',
      dueDate: a.dueDate ? a.dueDate.slice(0, 10) : '',
    });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    if (!modal.controlId) { setError('A control is required.'); return; }
    try {
      const body = {
        controlId: modal.controlId,
        result: modal.result,
        notes: modal.notes || null,
        assessmentDate: modal.assessmentDate || null,
        dueDate: modal.dueDate || null,
      };
      if (modal.id) {
        const res = await api.patch(`/assessments/${modal.id}`, body);
        const updated = res.data.data.assessment;
        setData((prev) => ({ ...prev, assessments: (prev.assessments || []).map((x) => x.id === updated.id ? updated : x) }));
      } else {
        const res = await api.post('/assessments', body);
        const created = res.data.data.assessment;
        setData((prev) => ({ ...prev, assessments: [...(prev.assessments || []), created] }));
      }
      setModal(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/assessments/${confirm.id}`);
      setData((prev) => ({ ...prev, assessments: (prev.assessments || []).filter((x) => x.id !== confirm.id) }));
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
        description="Evaluations of controls and their supporting evidence."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv('assessments.csv', [
              { key: '_row_num', label: '#' },
              { key: 'control', label: 'Control', format: (a) => a.control?.title || a.controlId || '' },
              { key: 'result', label: 'Result' },
              { key: 'assessmentDate', label: 'Date', format: (a) => a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString() : '' },
              { key: 'dueDate', label: 'Due', format: (a) => a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '' },
              { key: 'notes', label: 'Notes' },
            ], filtered)}>
              <DocumentIcon className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}><PlusIcon className="h-4 w-4" /> New assessment</Button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <FilterBar search={list.search} onSearch={list.setSearch} totalLabel="assessment" filteredCount={filtered.length} hasFilters={list.hasFilters} onReset={list.reset}>
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
          value={list.filters.result || ''}
          onChange={(e) => list.setFilter('result', e.target.value)}
        >
          <option value="">All results</option>
          {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </FilterBar>

      <Card>
        {loading ? (
          <TableSkeleton columns={6} />
        ) : (
          <Table
            numbered
            columns={[
              {
                key: 'control',
                label: 'Control',
                render: (a) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <ClipboardIcon className="h-4 w-4 text-charcoal-500" />
                    {a.control?.title || <span className="text-slate-400 italic">Unknown control</span>}
                  </span>
                ),
              },
              {
                key: 'result',
                label: 'Result',
                render: (a) => <Badge color={RESULT_COLOR[a.result] || 'neutral'}>{a.result}</Badge>,
              },
              {
                key: 'assessor',
                label: 'Assessor',
                render: (a) => <span className="text-slate-500">{a.assessor?.name || a.assessor?.email || '—'}</span>,
              },
              {
                key: 'assessmentDate',
                label: 'Date',
                render: (a) => <span className="text-slate-500">{a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString() : '—'}</span>,
              },
              {
                key: 'dueDate',
                label: 'Due',
                render: (a) => <span className="text-slate-500">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</span>,
              },
              {
                key: 'actions',
                label: '',
                render: (a) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(a)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={paginated}
            empty={list.hasFilters ? 'No assessments match your filters.' : 'No assessments yet.'}
          />
        )}
      </Card>
      <PaginationBar page={list.page} setPage={list.setPage} pageSize={list.pageSize} setPageSize={list.setPageSize} totalPages={totalPages} safePage={safePage} filteredCount={filtered.length} />

      {/* Create / Edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit assessment' : 'New assessment'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Control" hint="Which control is being assessed.">
            <SearchableSelect
              value={modal?.controlId || null}
              onChange={(id) => setModal({ ...modal, controlId: id })}
              loadOptions={loadControls}
              loadValue={loadControl}
              placeholder="Select a control..."
              searchPlaceholder="Search controls..."
            />
          </Field>
          <Field label="Result" hint="The outcome of this assessment.">
            <select
              className="input"
              value={modal?.result || 'satisfied'}
              onChange={(e) => setModal({ ...modal, result: e.target.value })}
            >
              {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Notes" hint="Observations, findings, and recommendations.">
            <textarea
              className="input"
              rows={4}
              value={modal?.notes || ''}
              onChange={(e) => setModal({ ...modal, notes: e.target.value })}
              placeholder="Describe what was evaluated and any findings..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assessment date">
              <input type="date" className="input" value={modal?.assessmentDate || ''} onChange={(e) => setModal({ ...modal, assessmentDate: e.target.value })} />
            </Field>
            <Field label="Due date">
              <input type="date" className="input" value={modal?.dueDate || ''} onChange={(e) => setModal({ ...modal, dueDate: e.target.value })} />
            </Field>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      {/* Delete confirmation */}
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
