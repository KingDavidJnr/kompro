import React, { useState, useMemo } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, statusColor, TableSkeleton } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, CubeIcon, DocumentIcon, SearchIcon } from '../components/icons';
import { exportCsv } from '../lib/csv';

const STATUSES = ['not_implemented', 'partial', 'implemented', 'needs_review'];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function Controls() {
  const { data, loading, silentRefetch, setData } = useGet('/controls?pageSize=100');
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  // Client-side search, filter, pagination state.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const controls = data?.controls || [];

  // Filtered list (search + status filter).
  const filtered = useMemo(() => {
    let list = controls;
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [controls, search, statusFilter]);

  // Paginated slice.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 whenever filters change.
  function handleSearch(v) { setSearch(v); setPage(1); }
  function handleStatusFilter(v) { setStatusFilter(v); setPage(1); }
  function handlePageSize(v) { setPageSize(Number(v)); setPage(1); }

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', category: '', status: 'not_implemented' });
  }
  function openEdit(c) {
    setError(null);
    setModal({ id: c.id, title: c.title, description: c.description || '', category: c.category || '', status: c.status });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      if (modal.id) {
        const res = await api.patch(`/controls/${modal.id}`, modal);
        const updated = res.data.data.control;
        setData((prev) => ({ ...prev, controls: (prev.controls || []).map((c) => c.id === updated.id ? updated : c) }));
      } else {
        const res = await api.post('/controls', modal);
        const created = res.data.data.control;
        setData((prev) => ({ ...prev, controls: [...(prev.controls || []), created] }));
      }
      setModal(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/controls/${confirm.id}`);
      setData((prev) => ({ ...prev, controls: (prev.controls || []).filter((c) => c.id !== confirm.id) }));
      setConfirm(null);
      silentRefetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Controls"
        description="Security, operational and compliance controls mapped to frameworks."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv('controls.csv', [{ key: '_row_num', label: '#' }, { key: 'title', label: 'Name' }, { key: 'category', label: 'Category' }, { key: 'status', label: 'Status' }], filtered)}>
              <DocumentIcon className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" /> New control
            </Button>
          </>
        }
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {/* Search + filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search controls..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
            className="text-xs text-brand-600 hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'control' : 'controls'}
          {(search || statusFilter) ? ' matching' : ' total'}
        </span>
      </div>

      <Card>
        {loading ? (
          <TableSkeleton columns={5} />
        ) : (
          <Table
            numbered
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (c) => (
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <CubeIcon className="h-4 w-4 text-charcoal-500" /> {c.title}
                  </span>
                ),
              },
              { key: 'category', label: 'Category', render: (c) => <span className="text-slate-500">{c.category || '—'}</span> },
              { key: 'status', label: 'Status', render: (c) => <Badge color={statusColor(c.status)}>{c.status}</Badge> },
              {
                key: 'actions',
                label: '',
                render: (c) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirm(c)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={paginated}
            empty={search || statusFilter ? 'No controls match your filters.' : 'No controls yet.'}
          />
        )}
      </Card>

      {/* Pagination bar */}
      {!loading && filtered.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: page info + page size selector */}
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Show</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSize(e.target.value)}
                className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-300"
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-xs">per page</span>
            </div>
          </div>

          {/* Right: prev/next + page numbers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition ${safePage === p ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500 disabled:opacity-40 hover:bg-slate-50"
            >
              ›
            </button>
          </div>
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Edit control' : 'New control'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Name">
            <input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea className="input" rows={3} value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
          </Field>
          <Field label="Category">
            <input className="input" value={modal?.category || ''} onChange={(e) => setModal({ ...modal, category: e.target.value })} placeholder="e.g. Access Control" />
          </Field>
          <Field label="Status">
            <select className="input" value={modal?.status || 'not_implemented'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete control"
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
