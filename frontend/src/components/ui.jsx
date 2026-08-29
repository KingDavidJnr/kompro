import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './icons';

/**
 * Reusable UI primitives shared across the app. Keeping them in one module
 * enforces a consistent visual language (spacing, radii, focus rings, brand
 * accent) so individual pages stay focused on their domain logic.
 */

const VARIANTS = {
  primary: 'bg-charcoal-800 text-white hover:bg-charcoal-900 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size] || sizes.md} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const BADGE_COLORS = {
  neutral: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  info: 'bg-sky-50 text-sky-700',
};

export function Badge({ color = 'neutral', children }) {
  return <span className={`badge ${BADGE_COLORS[color] || BADGE_COLORS.neutral}`}>{children}</span>;
}

export function Card({ className = '', children }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin text-charcoal-500 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function statusColor(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'open', 'completed', 'passed', 'ok', 'done'].includes(s)) return 'success';
  if (['draft', 'pending', 'planned', 'requested', 'todo', 'warning'].includes(s)) return 'warning';
  if (['retired', 'closed', 'rejected', 'failed', 'breach', 'high'].includes(s)) return 'danger';
  return 'neutral';
}

export function Drawer({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Table({ columns, rows, empty }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                {empty || 'No records yet.'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || i} className="transition hover:bg-slate-50/60">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-sm text-slate-700">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Searchable single-select (combobox) for large, remote lists.
 *
 * Props:
 *  - value: currently selected id (or null)
 *  - onChange(id): called with the chosen id or null when cleared
 *  - loadOptions(query): Promise resolving to [{ value, label }] for the query
 *  - loadValue(id): optional; resolves a single id to { value, label } so an
 *    existing selection (e.g. when editing) can be labelled without loading the
 *    whole list
 *  - placeholder / searchPlaceholder
 *  - allowClear: show a clear (×) button to unset the value
 *  - getLabel(option): how to render an option's label
 */
export function SearchableSelect({
  value,
  onChange,
  loadOptions,
  loadValue,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  allowClear = true,
  disabled = false,
  getLabel = (o) => o.label,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const loadOptionsRef = useRef(loadOptions);
  const loadValueRef = useRef(loadValue);
  loadOptionsRef.current = loadOptions;
  loadValueRef.current = loadValue;

  // Resolve an existing value into a displayable label.
  useEffect(() => {
    if (value == null) {
      setSelected(null);
      return;
    }
    if (selected && selected.value === value) return;
    if (!loadValueRef.current) return;
    let active = true;
    loadValueRef.current(value).then((o) => {
      if (active && o) setSelected(o);
      else if (active) setSelected({ value, label: String(value) });
    }).catch(() => {
      if (active) setSelected({ value, label: String(value) });
    });
    return () => { active = false; };
  }, [value, selected]);

  // Fetch options (debounced) whenever the popover is open or the query changes.
  useEffect(() => {
    if (!open) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      Promise.resolve(loadOptionsRef.current(query))
        .then((opts) => setOptions(Array.isArray(opts) ? opts : []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [open, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  function choose(opt) {
    setSelected(opt);
    onChange(opt ? opt.value : null);
    setOpen(false);
    setQuery('');
  }

  function clear(e) {
    e.stopPropagation();
    setSelected(null);
    onChange(null);
  }

  const display = selected ? getLabel(selected) : placeholder;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-charcoal-400 focus:outline-none focus:ring-charcoal-300 disabled:opacity-60"
      >
        <span className={selected ? 'truncate text-slate-800' : 'text-slate-400'}>{display}</span>
        <span className="flex flex-none items-center gap-1">
          {allowClear && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clear}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear selection"
            >
              <XIcon className="h-4 w-4" />
            </span>
          )}
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(options.length - 1, h + 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(0, h - 1)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (options[highlight]) choose(options[highlight]); }
                else if (e.key === 'Escape') { setOpen(false); }
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-charcoal-400 focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {loading && <div className="px-3 py-2 text-sm text-slate-400">Searching…</div>}
            {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No matches.</div>}
            {!loading && options.map((o, i) => (
              <button
                type="button"
                key={o.value}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(o)}
                className={`block w-full px-3 py-2 text-left text-sm ${i === highlight ? 'bg-slate-100' : 'hover:bg-slate-50'} ${o.value === (selected && selected.value) ? 'font-medium text-charcoal-800' : 'text-slate-700'}`}
              >
                {getLabel(o)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
