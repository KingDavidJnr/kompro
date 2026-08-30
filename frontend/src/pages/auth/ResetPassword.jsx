import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Button, Field } from '../../components/ui';
import Logo from '../../components/Logo';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submitReset(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
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
      await api.post('/auth/reset-password', { token, password });
      setMessage('Password reset. Redirecting to sign in…');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  async function requestReset(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('If that account exists, a reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not request reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-card">
          {token ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">Set a new password</h1>
              <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
              {message && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>
              )}
              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
              )}
              <form onSubmit={submitReset} className="mt-4 space-y-4">
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
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Saving…' : 'Reset password'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
              <p className="mt-1 text-sm text-slate-500">Enter your email and we will send a reset link.</p>
              {message && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>
              )}
              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
              )}
              <form onSubmit={requestReset} className="mt-4 space-y-4">
                <Field label="Work email">
                  <input
                    type="email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
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
