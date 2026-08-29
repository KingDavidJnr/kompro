import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import api from '../lib/api';
import { PageHeader, Button, Card, Badge, Modal, Field, Table, Drawer, statusColor, Spinner } from '../components/ui';
import { AddList } from '../components/SubList';
import { PlusIcon, PencilIcon, TrashIcon, FlagIcon, EyeIcon } from '../components/icons';

function scoreOf(r) {
  return r.score != null ? r.score : (Number(r.likelihood) || 0) * (Number(r.impact) || 0);
}

function riskLevel(score) {
  if (score >= 15) return { label: 'Critical', color: 'danger' };
  if (score >= 9) return { label: 'High', color: 'warning' };
  if (score >= 4) return { label: 'Medium', color: 'info' };
  return { label: 'Low', color: 'success' };
}

const LEVEL_BG = { Critical: 'bg-rose-500', High: 'bg-amber-500', Medium: 'bg-sky-500', Low: 'bg-emerald-500' };

function SummaryStat({ label, value, tone = 'text-slate-900' }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </Card>
  );
}

function Heatmap({ risks }) {
  return (
    <div className="inline-grid grid-cols-6 gap-1">
      <div />
      {[1, 2, 3, 4, 5].map((l) => (
        <div key={l} className="flex items-center justify-center text-xs font-medium text-slate-400">{l}</div>
      ))}
      {[5, 4, 3, 2, 1].map((imp) => (
        <React.Fragment key={imp}>
          <div className="flex items-center justify-center text-xs font-medium text-slate-400">{imp}</div>
          {[1, 2, 3, 4, 5].map((lk) => {
            const s = imp * lk;
            const lvl = riskLevel(s);
            const here = risks.filter((r) => Number(r.likelihood) === lk && Number(r.impact) === imp);
            return (
              <div
                key={lk}
                title={`Impact ${imp} × Likelihood ${lk} — ${lvl.label} (${here.length} risk${here.length === 1 ? '' : 's'})`}
                className={`flex h-11 items-center justify-center rounded-md text-xs font-semibold text-white ${LEVEL_BG[lvl.label]} ${here.length ? 'ring-2 ring-white' : 'opacity-30'}`}
              >
                {here.length || ''}
              </div>
            );
          })}
        </React.Fragment>
      ))}
      <div />
      <div className="col-span-5 mt-1 text-[11px] text-slate-400">Likelihood →</div>
    </div>
  );
}

function RiskDrawer({ risk, onClose, onChanged }) {
  const detail = useGet(`/risks/${risk.id}`);
  const r = detail.data?.risk || risk;

  async function add(path, body, refetchKey) {
    try {
      await api.post(path, body);
      detail.refetch();
      onChanged();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    }
  }

  return (
    <Drawer open onClose={onClose} title={risk.title} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {detail.loading ? (
        <Spinner className="h-8 w-8" />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge color={statusColor(r.status)}>{r.status}</Badge>
            <Badge color={riskLevel(scoreOf(r)).color}>{riskLevel(scoreOf(r)).label} · {scoreOf(r)}</Badge>
            {r.owner && <Badge color="brand">{r.owner}</Badge>}
          </div>

          <Section title="Scenarios" path={`/risks/${risk.id}/scenarios`} add={add} fields={[{ key: 'title', label: 'Title' }]} items={r.scenarios} render={(s) => <span className="text-sm text-slate-700">{s.title}</span>} />
          <Section title="Key Risk Indicators" path={`/risks/${risk.id}/kris`} add={add} fields={[{ key: 'title', label: 'Title' }, { key: 'threshold', label: 'Threshold', type: 'number' }, { key: 'currentValue', label: 'Current value', type: 'number' }]} items={r.kris} render={(k) => <span className="text-sm text-slate-700">{k.title} <Badge color={statusColor(k.status)}>{k.status}</Badge></span>} />
          <Section title="Treatments" path={`/risks/${risk.id}/treatments`} add={add} fields={[{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status', type: 'select', options: ['planned', 'in_progress', 'done'] }, { key: 'owner', label: 'Owner' }]} items={r.treatments} render={(t) => <span className="text-sm text-slate-700">{t.title} <Badge color={statusColor(t.status)}>{t.status}</Badge></span>} />
        </div>
      )}
    </Drawer>
  );
}

function Section({ title, path, add, fields, items, render }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-700">{title}</h4>
      <AddList loading={false} items={items} onAdd={(b) => add(path, b)} fields={fields} render={render} />
    </div>
  );
}

export default function Risk() {
  const { data, loading, refetch } = useGet('/risks?pageSize=100');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const risks = data?.risks || [];

  const levelCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let scoreSum = 0;
  risks.forEach((r) => {
    const s = scoreOf(r);
    levelCounts[riskLevel(s).label] += 1;
    scoreSum += s;
  });
  const avg = risks.length ? Math.round(scoreSum / risks.length) : 0;

  function openCreate() {
    setError(null);
    setModal({ title: '', description: '', category: '', likelihood: 3, impact: 3, status: 'open', owner: '' });
  }
  function openEdit(r) {
    setError(null);
    setModal({ id: r.id, title: r.title, description: r.description || '', category: r.category || '', likelihood: r.likelihood, impact: r.impact, status: r.status, owner: r.owner || '' });
  }

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      const body = {
        title: modal.title,
        description: modal.description,
        category: modal.category,
        likelihood: Number(modal.likelihood),
        impact: Number(modal.impact),
        status: modal.status,
        owner: modal.owner,
      };
      if (modal.id) await api.patch(`/risks/${modal.id}`, body);
      else await api.post('/risks', body);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
  }

  async function remove() {
    try {
      await api.delete(`/risks/${confirm.id}`);
      setConfirm(null);
      refetch();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Risk"
        description="Risk register with scenarios, indicators and treatments."
        actions={<Button onClick={openCreate}><PlusIcon className="h-4 w-4" /> New risk</Button>}
      />
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label="Total risks" value={risks.length} />
        <SummaryStat label="Critical / High" value={levelCounts.Critical + levelCounts.High} tone="text-rose-600" />
        <SummaryStat label="Average score" value={avg} />
        <SummaryStat label="Open" value={risks.filter((r) => r.status !== 'closed').length} />
      </div>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Risk heatmap (likelihood × impact)</h2>
        <Heatmap risks={risks} />
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : (
          <Table
            columns={[
              { key: 'title', label: 'Title', render: (r) => <span className="flex items-center gap-2 font-medium text-slate-900"><FlagIcon className="h-4 w-4 text-charcoal-500" /> {r.title}</span> },
              { key: 'category', label: 'Category', render: (r) => <span className="text-slate-500">{r.category || '—'}</span> },
              { key: 'score', label: 'Score', render: (r) => { const s = scoreOf(r); const l = riskLevel(s); return (<span className="inline-flex items-center gap-2"><Badge color={l.color}>{l.label}</Badge><span className="text-slate-500">{s}</span></span>); } },
              { key: 'status', label: 'Status', render: (r) => <Badge color={statusColor(r.status)}>{r.status}</Badge> },
              {
                key: 'actions',
                label: '',
                render: (r) => (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setSelected(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700" title="Details"><EyeIcon className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-charcoal-700"><PencilIcon className="h-4 w-4" /></button>
                    <button onClick={() => setConfirm(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                ),
              },
            ]}
            rows={risks}
            empty="No risks yet."
          />
        )}
      </Card>

      {selected && <RiskDrawer risk={selected} onClose={() => setSelected(null)} onChanged={refetch} />}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit risk' : 'New risk'}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title"><input required className="input" value={modal?.title || ''} onChange={(e) => setModal({ ...modal, title: e.target.value })} /></Field>
          <Field label="Description"><textarea className="input" rows={3} value={modal?.description || ''} onChange={(e) => setModal({ ...modal, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Likelihood (1-5)"><input type="number" min="1" max="5" className="input" value={modal?.likelihood ?? 3} onChange={(e) => setModal({ ...modal, likelihood: e.target.value })} /></Field>
            <Field label="Impact (1-5)"><input type="number" min="1" max="5" className="input" value={modal?.impact ?? 3} onChange={(e) => setModal({ ...modal, impact: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-slate-500">Computed risk score: <span className="font-semibold text-slate-700">{(Number(modal?.likelihood) || 0) * (Number(modal?.impact) || 0)}</span> ({riskLevel((Number(modal?.likelihood) || 0) * (Number(modal?.impact) || 0)).label})</p>
          <Field label="Category"><input className="input" value={modal?.category || ''} onChange={(e) => setModal({ ...modal, category: e.target.value })} /></Field>
          <Field label="Status">
            <select className="input" value={modal?.status || 'open'} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
              {['open', 'mitigated', 'closed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Owner"><input className="input" value={modal?.owner || ''} onChange={(e) => setModal({ ...modal, owner: e.target.value })} /></Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete risk"
        footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
        <p className="text-sm text-slate-600">Delete <span className="font-medium">{confirm?.title}</span>? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
