import React from 'react';
import { Link } from 'react-router-dom';
import { useGet } from '../lib/hooks';
import { useAuth } from '../auth/AuthContext';
import { Card, Badge, statusColor } from '../components/ui';
import { ShieldIcon, CubeIcon, FlagIcon, DocumentIcon, FolderIcon, ClipboardIcon, ArrowUpRightIcon } from '../components/icons';

function greetingFor(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const who = name ? `, ${name}` : '';
  return `Good ${part}${who}`;
}

function totalOf(payload, key) {
  if (!payload) return 0;
  if (typeof payload.total === 'number') return payload.total;
  const arr = payload[key] || payload.items || [];
  return Array.isArray(arr) ? arr.length : 0;
}

const STATS = [
  { key: 'frameworks', label: 'Frameworks', to: '/frameworks', Icon: ShieldIcon, accent: 'from-charcoal-600 to-charcoal-800' },
  { key: 'controls', label: 'Controls', to: '/controls', Icon: CubeIcon, accent: 'from-sky-500 to-sky-700' },
  { key: 'policies', label: 'Policies', to: '/policies', Icon: DocumentIcon, accent: 'from-violet-500 to-violet-700' },
  { key: 'evidence', label: 'Evidence', to: '/evidence', Icon: FolderIcon, accent: 'from-emerald-500 to-emerald-700' },
  { key: 'risks', label: 'Open risks', to: '/risk', Icon: FlagIcon, accent: 'from-amber-500 to-amber-700' },
  { key: 'incidents', label: 'Incidents', to: '/incidents', Icon: ClipboardIcon, accent: 'from-rose-500 to-rose-700' },
];

const READINESS_TONE = {
  emerald: { text: 'text-emerald-600', ring: 'bg-emerald-50', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-600', ring: 'bg-amber-50', bar: 'bg-amber-500' },
  rose: { text: 'text-rose-600', ring: 'bg-rose-50', bar: 'bg-rose-500' },
};

function ReadinessCard({ data }) {
  const readiness = data.readiness || 0;
  const toneKey = readiness >= 75 ? 'emerald' : readiness >= 50 ? 'amber' : 'rose';
  const tone = READINESS_TONE[toneKey];
  const items = [
    { label: 'Framework adoption', value: data.components.frameworkEnabled },
    { label: 'Control implementation', value: data.components.controlImplementation },
    { label: 'Evidence coverage', value: data.components.evidenceCoverage },
    { label: 'Assessment pass rate', value: data.components.assessmentPassRate },
  ];
  return (
    <Card className="mb-8 p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-5">
          <div className={`flex h-28 w-28 flex-none items-center justify-center rounded-full ${tone.ring}`}>
            <div className="text-center">
              <div className={`text-4xl font-bold ${tone.text}`}>{readiness}</div>
              <div className="text-xs text-slate-400">/ 100</div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Compliance readiness</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Weighted across framework adoption, control implementation, evidence coverage and assessment pass rate.
            </p>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map((it) => (
            <div key={it.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">{it.label}</span>
                <span className="font-semibold text-slate-900">{Math.round(it.value * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(it.value * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const frameworks = useGet('/frameworks?pageSize=1');
  const controls = useGet('/controls?pageSize=1');
  const policies = useGet('/policies?pageSize=1');
  const evidence = useGet('/evidence?pageSize=1');
  const risks = useGet('/risk?pageSize=1');
  const incidents = useGet('/incidents?pageSize=1');
  const activity = useGet('/audit?pageSize=6');
  const summary = useGet('/dashboard/summary');

  const values = {
    frameworks: totalOf(frameworks.data, 'frameworks'),
    controls: totalOf(controls.data, 'controls'),
    policies: totalOf(policies.data, 'policies'),
    evidence: totalOf(evidence.data, 'evidence'),
    risks: totalOf(risks.data, 'risks'),
    incidents: totalOf(incidents.data, 'incidents'),
  };

  const logs = (activity.data?.entries || activity.data?.logs || []).filter(Boolean);

  const name = user?.name || user?.email?.split('@')[0] || '';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{greetingFor(name)}</h1>
        <p className="mt-1 text-sm text-slate-500">Here is a snapshot of your compliance program.</p>
      </div>

      {summary.loading ? (
        <div className="mb-8 text-sm text-slate-400">Calculating compliance readiness…</div>
      ) : summary.data?.data ? (
        <ReadinessCard data={summary.data.data} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s) => (
          <Link key={s.key} to={s.to}>
            <Card className="group p-5 transition hover:shadow-soft">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${s.accent} text-white`}>
                  <s.Icon className="h-6 w-6" />
                </div>
                <ArrowUpRightIcon className="h-4 w-4 text-slate-300 transition group-hover:text-charcoal-600" />
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{values[s.key]}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent activity</h2>
            <Link to="/audit-program" className="text-sm font-medium text-charcoal-700 hover:text-brand-600">
              View all
            </Link>
          </div>
          {activity.loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {log.action} · <span className="text-slate-500">{log.entity}</span>
                    </p>
                    <p className="truncate text-xs text-slate-400">{log.detail || log.actorEmail || ''}</p>
                  </div>
                  <Badge color={statusColor(log.action)}>{log.action}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Program health</h2>
          <div className="space-y-4">
            {[
              { label: 'Evidence collected', value: values.evidence, tone: 'bg-emerald-500' },
              { label: 'Controls defined', value: values.controls, tone: 'bg-sky-500' },
              { label: 'Open incidents', value: values.incidents, tone: 'bg-rose-500' },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-semibold text-slate-900">{row.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${Math.min(100, row.value * 4 || 6)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
