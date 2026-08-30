import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../lib/api';
import { PageHeader, Card, Field, Button } from '../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, password });
      setSuccess('Your password was changed successfully. You have been signed out of other sessions.');
      setCurrentPassword('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My settings" description="Manage your personal account preferences." />

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 flex-none text-slate-500">Name</dt>
              <dd className="text-slate-800">{user?.name || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 flex-none text-slate-500">Email</dt>
              <dd className="text-slate-800">{user?.email}</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 border-t border-slate-100 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
          )}
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <Field label="Current password">
            <input
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
