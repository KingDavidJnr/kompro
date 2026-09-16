import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { PageHeader, Card, Button, Field, Badge, Spinner } from '../components/ui';
import { ShieldIcon, PlusIcon, TrashIcon } from '../components/icons';

export default function TrustPortalSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  useEffect(() => {
    api.get('/trust/settings')
      .then((res) => setSettings(res.data.data.trustPortal))
      .catch(() => setSettings({
        enabled: false, headline: 'Security & Compliance', description: '',
        contactEmail: '', contactNote: '',
        showReadiness: true, showFrameworks: true, showPolicies: true, showStats: true,
        customSections: [],
      }))
      .finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.patch('/trust/settings', settings);
      setSettings(res.data.data.trustPortal);
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  }

  function updateField(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function addSection() {
    setSettings((prev) => ({
      ...prev,
      customSections: [...(prev.customSections || []), { title: '', body: '' }],
    }));
  }

  function updateSection(index, key, value) {
    setSettings((prev) => {
      const sections = [...(prev.customSections || [])];
      sections[index] = { ...sections[index], [key]: value };
      return { ...prev, customSections: sections };
    });
  }

  function removeSection(index) {
    setSettings((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const portalUrl = `${window.location.origin}/trust`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldIcon className="h-6 w-6 text-charcoal-500" /> Trust Portal
          </span>
        }
        description="Configure the public compliance portal for external stakeholders."
        actions={
          settings.enabled ? (
            <a href="/trust" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">View portal</Button>
            </a>
          ) : null
        }
      />

      <form onSubmit={save} className="space-y-6">
        {/* Enable toggle */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Portal Status</p>
              <p className="text-sm text-slate-500">
                When enabled, the portal is publicly accessible at{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{portalUrl}</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField('enabled', !settings.enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition ${settings.enabled ? 'bg-brand-600' : 'bg-slate-200'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <Badge color={settings.enabled ? 'success' : 'neutral'} className="mt-2">
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </Card>

        {/* Branding & text */}
        <Card className="space-y-4 p-5">
          <p className="font-semibold text-slate-900">Portal Content</p>

          <Field label="Headline" hint="Main heading shown on the portal.">
            <input
              className="input"
              value={settings.headline || ''}
              onChange={(e) => updateField('headline', e.target.value)}
              placeholder="Security & Compliance"
            />
          </Field>

          <Field label="Description" hint="Introductory paragraph below the headline.">
            <textarea
              className="input"
              rows={3}
              value={settings.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Our organization is committed to maintaining the highest standards of security and compliance..."
            />
          </Field>
        </Card>

        {/* Contact / Access request */}
        <Card className="space-y-4 p-5">
          <p className="font-semibold text-slate-900">Contact & Access Requests</p>

          <Field label="Contact Email" hint="Email address for compliance inquiries.">
            <input
              className="input"
              type="email"
              value={settings.contactEmail || ''}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="compliance@yourcompany.com"
            />
          </Field>

          <Field label="Access Request Instructions" hint="Explain how stakeholders can request full audit reports, NDA documents, etc.">
            <textarea
              className="input"
              rows={4}
              value={settings.contactNote || ''}
              onChange={(e) => updateField('contactNote', e.target.value)}
              placeholder="To request access to detailed compliance reports or our SOC 2 audit package, please email us with your company name and the documents you need. We typically respond within 2 business days."
            />
          </Field>
        </Card>

        {/* Visibility toggles */}
        <Card className="space-y-4 p-5">
          <p className="font-semibold text-slate-900">Visibility</p>
          <p className="text-sm text-slate-500">Choose which sections appear on the public portal.</p>

          {[
            { key: 'showReadiness', label: 'Overall readiness score', desc: 'The composite compliance readiness percentage and its four components.' },
            { key: 'showFrameworks', label: 'Framework readiness', desc: 'Per-framework readiness percentages for all enabled frameworks.' },
            { key: 'showPolicies', label: 'Active policies', desc: 'Titles and descriptions of policies with status "active".' },
            { key: 'showStats', label: 'Aggregate statistics', desc: 'Total controls, evidence items, and assessment counts.' },
          ].map((toggle) => (
            <label key={toggle.key} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={!!settings[toggle.key]}
                onChange={(e) => updateField(toggle.key, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">{toggle.label}</p>
                <p className="text-xs text-slate-500">{toggle.desc}</p>
              </div>
            </label>
          ))}
        </Card>

        {/* Custom sections */}
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Custom Sections</p>
              <p className="text-sm text-slate-500">Add freeform content sections to the portal.</p>
            </div>
            <button type="button" onClick={addSection} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">
              <PlusIcon className="h-3.5 w-3.5" /> Add section
            </button>
          </div>

          {(settings.customSections || []).map((sec, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400">Section {i + 1}</p>
                <button type="button" onClick={() => removeSection(i)} className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                className="input"
                value={sec.title || ''}
                onChange={(e) => updateSection(i, 'title', e.target.value)}
                placeholder="Section title"
              />
              <textarea
                className="input"
                rows={3}
                value={sec.body || ''}
                onChange={(e) => updateSection(i, 'body', e.target.value)}
                placeholder="Section content..."
              />
            </div>
          ))}

          {(!settings.customSections || settings.customSections.length === 0) && (
            <p className="text-sm text-slate-400">No custom sections added yet.</p>
          )}
        </Card>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
          {message && (
            <span className={`text-sm ${message.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {message.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
