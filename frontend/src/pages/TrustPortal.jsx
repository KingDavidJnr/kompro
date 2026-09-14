import React, { useEffect, useState } from 'react';
import { Badge, Spinner } from '../components/ui';
import { ShieldIcon, DocumentIcon } from '../components/icons';
import api from '../lib/api';

function readinessColor(pct) {
  if (pct >= 75) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function barColor(pct) {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-rose-500';
}

export default function TrustPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/public/trust')
      .then((res) => setData(res.data.data))
      .catch((err) => {
        if (err.response && err.response.status === 404) {
          setError('This trust portal is not available.');
        } else {
          setError('Unable to load trust portal.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <ShieldIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-700">{error}</p>
          <p className="mt-1 text-sm text-slate-400">Contact the organization for access.</p>
        </div>
      </div>
    );
  }

  const { organization, portal, readiness, stats, frameworks, policies } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{organization.displayName}</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Trust Portal</p>
          </div>
          <ShieldIcon className="h-7 w-7 shrink-0 text-brand-600 sm:h-8 sm:w-8" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero */}
        <section className="mb-6 sm:mb-10">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{portal.headline}</h2>
          {portal.description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-3 sm:max-w-3xl sm:text-base">{portal.description}</p>
          )}
        </section>

        {/* Readiness score */}
        {readiness && (
          <section className="mb-6 sm:mb-10">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="text-center sm:min-w-[120px]">
                  <p className={`text-4xl font-bold sm:text-5xl ${readinessColor(readiness.score)}`}>{readiness.score}%</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">Overall Readiness</p>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
                  {[
                    { label: 'Framework Adoption', value: readiness.components.frameworkAdoption },
                    { label: 'Control Implementation', value: readiness.components.controlImplementation },
                    { label: 'Evidence Coverage', value: readiness.components.evidenceCoverage },
                    { label: 'Assessment Pass Rate', value: readiness.components.assessmentPassRate },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span className="truncate pr-2">{c.label}</span>
                        <span className="shrink-0 font-semibold text-slate-700">{c.value}%</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full ${barColor(c.value)}`} style={{ width: `${c.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        {stats && (
          <section className="mb-6 sm:mb-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                { label: 'Controls', value: stats.totalControls },
                { label: 'Implemented', value: stats.implementedControls },
                { label: 'Evidence Items', value: stats.totalEvidence },
                { label: 'Assessments Passed', value: `${stats.passedAssessments}/${stats.totalAssessments}` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:p-5">
                  <p className="text-xl font-bold text-slate-900 sm:text-2xl">{s.value}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 sm:mt-1 sm:text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Frameworks */}
        {frameworks && frameworks.length > 0 && (
          <section className="mb-6 sm:mb-10">
            <h3 className="mb-3 text-base font-semibold text-slate-800 sm:mb-4 sm:text-lg">Compliance Frameworks</h3>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {frameworks.map((fw) => (
                <div key={fw.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ShieldIcon className="h-4 w-4 shrink-0 text-brand-600 sm:h-5 sm:w-5" />
                      <span className="truncate text-sm font-semibold text-slate-900 sm:text-base">{fw.name}</span>
                      {fw.version && <span className="hidden text-xs text-slate-400 sm:inline">v{fw.version}</span>}
                    </div>
                    <span className={`shrink-0 text-base font-bold sm:text-lg ${readinessColor(fw.readinessPercent)}`}>
                      {fw.readinessPercent}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:mt-3">
                    <div className={`h-2 rounded-full ${barColor(fw.readinessPercent)}`} style={{ width: `${fw.readinessPercent}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500 sm:mt-2 sm:text-xs">
                    {fw.satisfiedRequirements} of {fw.totalRequirements} requirements satisfied
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Policies */}
        {policies && policies.length > 0 && (
          <section className="mb-6 sm:mb-10">
            <h3 className="mb-3 text-base font-semibold text-slate-800 sm:mb-4 sm:text-lg">Active Policies</h3>
            <div className="space-y-2 sm:space-y-3">
              {policies.map((p) => (
                <div key={p.title} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-3 sm:p-4">
                  <DocumentIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 sm:h-5 sm:w-5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{p.title}</p>
                    {p.description && <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">{p.description}</p>}
                    {p.version && <Badge color="neutral" className="mt-1">v{p.version}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Custom sections */}
        {portal.customSections && portal.customSections.length > 0 && (
          <section className="mb-6 space-y-4 sm:mb-10 sm:space-y-6">
            {portal.customSections.map((sec, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h3 className="mb-1.5 text-base font-semibold text-slate-800 sm:mb-2 sm:text-lg">{sec.title}</h3>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 sm:text-sm">{sec.body}</p>
              </div>
            ))}
          </section>
        )}

        {/* Contact / Request Access */}
        {(portal.contactEmail || portal.contactNote) && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-10 sm:p-6">
            <h3 className="mb-1.5 text-base font-semibold text-slate-800 sm:mb-2 sm:text-lg">Request Access</h3>
            {portal.contactNote && (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 sm:text-sm">{portal.contactNote}</p>
            )}
            {portal.contactEmail && (
              <p className="mt-2 text-xs text-slate-600 sm:mt-3 sm:text-sm">
                Email us at{' '}
                <a href={`mailto:${portal.contactEmail}`} className="font-medium text-brand-600 hover:underline">
                  {portal.contactEmail}
                </a>
              </p>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 sm:py-6">
        Powered by Kompro
      </footer>
    </div>
  );
}
