import React from 'react';
import { Link } from 'react-router-dom';
import { useGet } from '../lib/hooks';
import { Card, Badge, statusColor } from '../components/ui';
import { ShieldIcon, CubeIcon, FlagIcon, DocumentIcon, FolderIcon, ClipboardIcon, ArrowUpRightIcon } from '../components/icons';

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

export default function Dashboard() {
  const frameworks = useGet('/frameworks?pageSize=1');
  const controls = useGet('/controls?pageSize=1');
  const policies = useGet('/policies?pageSize=1');
  const evidence = useGet('/evidence?pageSize=1');
  const risks = useGet('/risk?pageSize=1');
  const incidents = useGet('/incidents?pageSize=1');
  const activity = useGet('/audit?pageSize=6');

  const values = {
    frameworks: totalOf(frameworks.data, 'frameworks'),
    controls: totalOf(controls.data, 'controls'),
    policies: totalOf(policies.data, 'policies'),
    evidence: totalOf(evidence.data, 'evidence'),
    risks: totalOf(risks.data, 'risks'),
    incidents: totalOf(incidents.data, 'incidents'),
  };

  const logs = (activity.data?.entries || activity.data?.logs || []).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Good to see you</h1>
        <p className="mt-1 text-sm text-slate-500">Here is a snapshot of your compliance program.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s) => (
          <Link key={s.key} to={s.to}>
            <Card className="group p-5 transition hover:shadow-soft">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} text-white`}>
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
