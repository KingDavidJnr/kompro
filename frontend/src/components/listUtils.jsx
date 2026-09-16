/**
 * Reusable client-side list utilities:
 *
 *  useListState(defaultPageSize)  — hook for search/filter/page state
 *  applyFilters(items, state, filterFn) — filter + paginate a list
 *  FilterBar    — search box + arbitrary filter slots + count
 *  PaginationBar — page size selector + prev/page buttons/next
 */

import React, { useState, useMemo } from 'react';
import { SearchIcon } from './icons';

export const PAGE_SIZE_OPTIONS = [25, 50, 100];

/**
 * A styled select for use inside FilterBar. Renders with a custom chevron so
 * the native OS arrow never overlaps the option text on any screen size.
 */
export function FilterSelect({ value, onChange, children }) {
  return (
    <div className="relative flex-none">
      <select
        value={value}
        onChange={onChange}
        className="h-9 min-w-[120px] appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Hook that owns all list-view state: search, generic filters object,
 * current page, and page size.
 *
 * @param {number} defaultPageSize
 * @returns {{ search, setSearch, filters, setFilter, page, setPage, pageSize, setPageSize, reset }}
 */
export function useListState(defaultPageSize = 50) {
  const [search, setSearchRaw] = useState('');
  const [filters, setFiltersRaw] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  function setSearch(v) { setSearchRaw(v); setPage(1); }
  function setFilter(key, v) { setFiltersRaw((prev) => ({ ...prev, [key]: v })); setPage(1); }
  function setPageSize(v) { setPageSizeRaw(Number(v)); setPage(1); }
  function reset() { setSearchRaw(''); setFiltersRaw({}); setPage(1); }

  const hasFilters = !!search || Object.values(filters).some(Boolean);

  return { search, setSearch, filters, setFilter, page, setPage, pageSize, setPageSize, reset, hasFilters };
}

/**
 * Filters and paginates a list of items.
 *
 * @param {Array}    items      — full list
 * @param {object}   state      — from useListState
 * @param {Function} filterFn   — (item, search, filters) => boolean
 * @returns {{ filtered, paginated, totalPages, safePage }}
 */
export function applyList(items, state, filterFn) {
  const { search, filters, page, pageSize } = state;
  const filtered = useMemo(() => {
    if (!search.trim() && !Object.values(filters).some(Boolean)) return items;
    return items.filter((item) => filterFn(item, search.trim().toLowerCase(), filters));
  }, [items, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { filtered, paginated, totalPages, safePage };
}

/**
 * A search box + optional filter dropdowns + count display.
 *
 * Props:
 *  search, onSearch       — search string + setter
 *  totalLabel             — unit label e.g. "control" (pluralised automatically)
 *  filteredCount          — how many items match current filters
 *  hasFilters             — whether any filter is active
 *  onReset                — clears all filters
 *  children               — extra filter elements (selects etc.)
 */
export function FilterBar({ search, onSearch, totalLabel = 'record', filteredCount, hasFilters, onReset, children }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={`Search ${totalLabel}s...`}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      {children}
      {hasFilters && (
        <button onClick={onReset} className="text-xs text-brand-600 hover:underline">
          Clear filters
        </button>
      )}
      <span className="ml-auto text-xs text-slate-400">
        {filteredCount} {filteredCount === 1 ? totalLabel : `${totalLabel}s`}
        {hasFilters ? ' matching' : ' total'}
      </span>
    </div>
  );
}

/**
 * A "Show N per page" selector + prev/page/next pagination bar.
 *
 * Props:
 *  page, setPage
 *  pageSize, setPageSize
 *  totalPages
 *  safePage
 *  filteredCount
 */
export function PaginationBar({ page, setPage, pageSize, setPageSize, totalPages, safePage, filteredCount }) {
  if (filteredCount === 0) return null;

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filteredCount);

  // Build page number list with ellipsis.
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>{start}–{end} of {filteredCount}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">Show</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="h-7 appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-300"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <span className="text-xs">per page</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        >
          ‹
        </button>
        {pageNums.map((p, i) =>
          p === '…' ? (
            <span key={`el-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-slate-400">…</span>
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
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
