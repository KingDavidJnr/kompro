import React, { useState } from 'react';
import { Button, Field, Spinner } from './ui';
import { PlusIcon } from './icons';

/**
 * Generic "list + inline add" block used by detail drawers for sub-resources
 * (risk scenarios, incident actions, etc.). `fields` describes the add form.
 */
export function AddList({ loading, items = [], onAdd, fields, render, empty = 'None yet.' }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, ''])));

  function submit(e) {
    e.preventDefault();
    const body = {};
    fields.forEach((f) => {
      if (f.type === 'number') body[f.key] = form[f.key] === '' ? undefined : Number(form[f.key]);
      else body[f.key] = form[f.key] || undefined;
    });
    onAdd(body);
    setForm(Object.fromEntries(fields.map((f) => [f.key, ''])));
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <PlusIcon className="h-4 w-4" /> Add
        </Button>
      </div>
      {open && (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 p-4">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === 'textarea' ? (
                <textarea className="input" rows={2} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
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
                <input
                  type={f.type === 'date' || f.type === 'number' ? f.type : 'text'}
                  className="input"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
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
          {items.length === 0 && <p className="text-sm text-slate-400">{empty}</p>}
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
