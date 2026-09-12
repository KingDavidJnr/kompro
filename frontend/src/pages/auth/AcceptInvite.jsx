import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Button, Field } from '../../components/ui';
import Logo from '../../components/Logo';
import { EyeIcon, EyeOffIcon } from '../../components/icons';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/accept-invite', { token, password });
      setMessage('Account activated. Redirecting to sign in…');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not accept invitation.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-full flex-col justify-center bg-slate-50 px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-card text-center">
            <h1 className="text-xl font-bold text-slate-900">Invalid invite link</h1>
            <p className="mt-2 text-sm text-slate-500">
              This invitation link is missing a token. Please use the link from your invitation email.
            </p>
            <div className="mt-4">
              <a href="/login" className="text-sm font-medium text-charcoal-700 hover:text-charcoal-900">
                Back to sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-center bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-card">
          <h1 className="text-xl font-bold text-slate-900">Accept your invitation</h1>
          <p className="mt-1 text-sm text-slate-500">Set a password to activate your account.</p>
          {message && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password">
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  className={`input pr-10 ${mismatch ? 'border-rose-400 focus:ring-rose-400' : ''}`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="mt-1 text-xs text-rose-600">Passwords do not match.</p>
              )}
            </Field>
            <Button type="submit" disabled={loading || mismatch} className="w-full">
              {loading ? 'Activating…' : 'Activate account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <a href="/login" className="font-medium text-charcoal-700 hover:text-charcoal-900">
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
