import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGet } from '../lib/hooks';
import { PageHeader, Card, Badge, Spinner, Button } from '../components/ui';
import { ShieldIcon, ArrowLeftIcon, DocumentIcon } from '../components/icons';

// Status → badge colour + human label.
const REQUIREMENT_STATUS = {
  satisfied: { color: 'success', label: 'Satisfied' },
  partially_satisfied: { color: 'warning', label: 'Partially satisfied' },
  needs_review: { color: 'warning', label: 'Needs review' },
  unsatisfied: { color: 'danger', label: 'Unsatisfied' },
  unassessed: { color: 'neutral', label: 'Unassessed' },
  unmapped: { color: 'neutral', label: 'Unmapped' },
};

const CONTROL_STATUS = {
  implemented: { color: 'success', label: 'Implemented' },
  partially_implemented: { color: 'warning', label: 'Partially implemented' },
  not_implemented: { color: 'neutral', label: 'Not implemented' },
  planned: { color: 'neutral', label: 'Planned' },
  retired: { color: 'neutral', label: 'Retired' },
};

// Colours for the stacked breakdown bar.
const BAR_COLOR = {
  satisfied: 'bg-emerald-500',
  partially_satisfied: 'bg-amber-400',
  needs_review: 'bg-amber-500',
  unsatisfied: 'bg-rose-500',
  unassessed: 'bg-slate-300',
  unmapped: 'bg-slate-200',
};

function StatusBadge({ status, map }) {
  const m = (map[status] || {});
  return <Badge color={m.color || 'neutral'}>{m.label || String(status || '—')}</Badge>;
}

function readinessColor(pct) {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-rose-500';
}

export default function FrameworkDetail() {
  const { id } = useParams();
  const { data, loading, error } = useGet(`/frameworks/${id}/readiness`);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-sm font-semibold text-rose-700">Could not load framework</p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link to="/frameworks" className="mt-4 inline-block text-sm font-medium text-charcoal-700 hover:underline">
          Back to frameworks
        </Link>
      </div>
    );
  }

  const fw = data.framework;
  const { breakdown, evidence, requirements, gaps } = data;
  const total = data.totalRequirements;
  const gapCount = total - data.satisfied;

  const ordered = ['satisfied', 'partially_satisfied', 'needs_review', 'unsatisfied', 'unassessed', 'unmapped'];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldIcon className="h-6 w-6 text-charcoal-500" /> {fw.name}
          </span>
        }
        description="Framework readiness, control coverage and supporting evidence."
        actions={
          <Link to="/frameworks">
            <Button variant="secondary">
              <ArrowLeftIcon className="h-4 w-4" /> Frameworks
            </Button>
          </Link>
        }
      />

      <div className="mb-2 flex items-center gap-2">
        <Badge color={fw.enabled ? 'success' : 'neutral'}>{fw.enabled ? 'Enabled' : 'Disabled'}</Badge>
        <span className="text-sm text-slate-500">{total} requirements</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Readiness</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{data.readinessPercent}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${readinessColor(data.readinessPercent)}`} style={{ width: `${data.readinessPercent}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {data.satisfied} of {total} requirements fully satisfied
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Evidence coverage</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{evidence.coveragePercent}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${evidence.coveragePercent}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {evidence.controlsWithEvidence} of {evidence.mappedControlCount} mapped controls have evidence
            {evidence.totalEvidence ? ` · ${evidence.totalEvidence} file(s)` : ''}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Gaps</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{gapCount}</p>
          <p className="mt-2 text-sm text-slate-500">
            {breakdown.unsatisfied} unsatisfied · {breakdown.needs_review} needs review
          </p>
        </Card>
      </div>

      {/* Status breakdown */}
      <Card className="mt-4 p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Requirement status breakdown</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          {ordered.map((s) =>
            breakdown[s] ? (
              <div key={s} className={BAR_COLOR[s]} style={{ width: `${(breakdown[s] / total) * 100}%` }} title={`${REQUIREMENT_STATUS[s].label}: ${breakdown[s]}`} />
            ) : null
          )}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ordered.map((s) => (
            <li key={s} className="flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${BAR_COLOR[s]}`} />
              {REQUIREMENT_STATUS[s].label}
              <span className="font-medium text-slate-900">{breakdown[s]}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Requirements & Controls */}
      <Card className="mt-4 p-5">
        <p className="mb-4 text-sm font-semibold text-slate-700">Requirements &amp; mapped controls</p>
        {requirements.length === 0 ? (
          <p className="text-sm text-slate-400">This framework has no requirements yet.</p>
        ) : (
          <ul className="space-y-4">
            {requirements.map((req) => (
              <li key={req.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {req.code ? <span className="mr-2 font-mono text-xs text-slate-400">{req.code}</span> : null}
                      {req.title}
                    </p>
                    {req.description && <p className="mt-1 text-sm text-slate-500">{req.description}</p>}
                  </div>
                  <StatusBadge status={req.status} map={REQUIREMENT_STATUS} />
                </div>

                {req.controls.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">No controls mapped.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-50">
                    {req.controls.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span className="text-sm text-slate-700">{c.title}</span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={c.controlStatus} map={CONTROL_STATUS} />
                          <StatusBadge status={c.latestResult || 'unassessed'} map={REQUIREMENT_STATUS} />
                          <Badge color={c.hasEvidence ? 'info' : 'neutral'}>
                            <DocumentIcon className="mr-1 h-3 w-3" />
                            {c.evidenceCount}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
                  </ul>
                )}
          </Card>

      {gaps.length > 0 && (
        <Card className="mt-4 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-700">Prioritised gaps</p>
          <ul className="space-y-2">
            {gaps.map((g) => (
              <li key={g.requirement.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-700">
                  {g.requirement.code ? <span className="mr-2 font-mono text-xs text-slate-400">{g.requirement.code}</span> : null}
                  {g.requirement.title}
                </span>
                <StatusBadge status={g.status} map={REQUIREMENT_STATUS} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
