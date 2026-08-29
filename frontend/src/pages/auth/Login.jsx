import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { SHOW_PASSWORD_LOGIN } from '../../config';
import Logo from '../../components/Logo';
import { Button, Field } from '../../components/ui';
import { ShieldIcon, CheckIcon } from '../../components/icons';

const HIGHLIGHTS = [
  'Framework-agnostic compliance across ISO 27001, SOC 2, GDPR and more',
  'Risk, incident, evidence and audit workflows in one workspace',
  'Self-hosted with your data, under your control',
];

export default function Login() {
  const { user, login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      // error surfaced via context
    }
  }

  return (
    <div className="flex min-h-full">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-charcoal-700 via-charcoal-800 to-charcoal-950 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/kompro-logo.png" alt="Kompro" className="h-9 w-auto" />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight">Compliance you actually own.</h2>
          <p className="mt-4 text-slate-200">
            The open-source platform to define, assess and continuously maintain your compliance posture.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-slate-100">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/15">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-300">© {new Date().getFullYear()} Kompro · Self-hosted compliance management</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col justify-center bg-slate-50 px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back. Please enter your details.</p>

          {SHOW_PASSWORD_LOGIN && (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Work email">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </Field>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span />
                <a href="/api/auth/forgot-password" className="font-medium text-charcoal-700 hover:text-charcoal-900">
                  Forgot password?
                </a>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldIcon className="h-4 w-4" /> Secured by Kompro
          </div>
        </div>
      </div>
    </div>
  );
}
