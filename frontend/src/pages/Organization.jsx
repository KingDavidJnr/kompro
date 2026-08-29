import React, { useEffect, useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Field, Button, Card, Spinner } from '../components/ui';
import { UsersIcon } from '../components/icons';

export default function Organization() {
  const { data, loading, refetch } = useGet('/org/settings');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (data?.organization && !form) {
      setForm({
        name: data.organization.name || '',
        displayName: data.organization.displayName || '',
        settings: JSON.stringify(data.organization.settings || {}, null, 2),
      });
    }
  }, [data, form]);

  if (loading || !form) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    let settings = {};
    try {
      settings = JSON.parse(form.settings || '{}');
    } catch {
      setMessage({ type: 'error', text: 'Settings must be valid JSON.' });
      setSaving(false);
      return;
    }
    try {
      await api.patch('/org/settings', { name: form.name, displayName: form.displayName, settings });
      setMessage({ type: 'success', text: 'Organization settings saved.' });
      refetch();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Organization"
        description="The single tenant this Kompro instance serves."
        actions={<UsersIcon className="h-6 w-6 text-brand-400" />}
      />
      <Card className="p-6">
        <form onSubmit={save} className="space-y-5">
          <Field label="Organization name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Display name">
            <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </Field>
          <Field label="Settings (JSON)" hint="Arbitrary configuration stored for this organization.">
            <textarea
              className="input font-mono text-xs"
              rows={6}
              value={form.settings}
              onChange={(e) => setForm({ ...form, settings: e.target.value })}
            />
          </Field>

          {message && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                message.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
