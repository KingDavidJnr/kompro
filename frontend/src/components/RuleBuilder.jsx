import React, { useState } from 'react';
import { Field, Button, Badge } from './ui';
import { PlusIcon, TrashIcon } from './icons';

const FIELDS = [
  { value: 'evidence.count', label: 'Evidence count', hint: 'Total evidence linked to this policy' },
  { value: 'evidence.accepted.count', label: 'Accepted evidence count', hint: 'Evidence with status "accepted"' },
  { value: 'evidence.source', label: 'Evidence source', hint: 'Any evidence has this source' },
  { value: 'evidence.status', label: 'Evidence status', hint: 'Any evidence has this status' },
  { value: 'evidence.hasFile', label: 'Evidence has file', hint: 'Any evidence has a file attachment' },
  { value: 'evidence.collectedWithin', label: 'Evidence collected within (days)', hint: 'Most recent evidence was collected within N days' },
  { value: 'control.count', label: 'Linked controls count', hint: 'Distinct controls linked via evidence' },
  { value: 'control.status', label: 'Control status', hint: 'Any linked control has this status' },
  { value: 'control.implemented.count', label: 'Implemented controls count', hint: 'Controls with status "implemented"' },
  { value: 'assessment.count', label: 'Assessments count', hint: 'Total assessments across linked controls' },
  { value: 'assessment.result', label: 'Assessment result', hint: 'Any assessment has this result' },
  { value: 'assessment.satisfied.count', label: 'Satisfied assessments count', hint: 'Assessments with result "satisfied"' },
  { value: 'assessment.latestResult', label: 'Latest assessment result', hint: 'Most recent assessment result' },
  { value: 'policy.hasContent', label: 'Policy has content', hint: 'Policy has written markdown content' },
  { value: 'policy.hasFile', label: 'Policy has file', hint: 'Policy has a document attachment' },
  { value: 'policy.status', label: 'Policy status', hint: 'The policy lifecycle status' },
  { value: 'policy.version', label: 'Policy version', hint: 'The version label string' },
];

const OPS = [
  { value: 'eq', label: '= equals' },
  { value: 'neq', label: '≠ not equals' },
  { value: 'gte', label: '≥ at least' },
  { value: 'lte', label: '≤ at most' },
  { value: 'gt', label: '> greater than' },
  { value: 'lt', label: '< less than' },
  { value: 'contains', label: 'contains' },
  { value: 'exists', label: 'exists' },
  { value: 'notExists', label: 'does not exist' },
];

// Suggested values per field for convenience.
const FIELD_SUGGESTIONS = {
  'evidence.source': ['manual', 'documentation', 'policy', 'integration', 'automated_check', 'infrastructure', 'other'],
  'evidence.status': ['submitted', 'accepted', 'rejected', 'requested'],
  'evidence.hasFile': ['true', 'false'],
  'control.status': ['not_implemented', 'partial', 'implemented', 'needs_review'],
  'assessment.result': ['satisfied', 'partially_satisfied', 'unsatisfied', 'needs_review'],
  'assessment.latestResult': ['satisfied', 'partially_satisfied', 'unsatisfied', 'needs_review'],
  'policy.hasContent': ['true', 'false'],
  'policy.hasFile': ['true', 'false'],
  'policy.status': ['draft', 'active', 'retired'],
};

const NO_VALUE_OPS = ['exists', 'notExists'];

function ConditionRow({ condition, index, onChange, onRemove }) {
  const fieldMeta = FIELDS.find((f) => f.value === condition.field);
  const suggestions = FIELD_SUGGESTIONS[condition.field] || [];
  const needsValue = !NO_VALUE_OPS.includes(condition.op);

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
      {/* Field */}
      <div>
        <select
          className="input text-sm"
          value={condition.field || ''}
          onChange={(e) => onChange(index, { ...condition, field: e.target.value, value: '' })}
        >
          <option value="">Select field...</option>
          {FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        {fieldMeta && <p className="mt-0.5 text-[11px] text-slate-400">{fieldMeta.hint}</p>}
      </div>

      {/* Operator */}
      <select
        className="input text-sm"
        value={condition.op || 'eq'}
        onChange={(e) => onChange(index, { ...condition, op: e.target.value })}
      >
        {OPS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Value */}
      <div>
        {needsValue && (
          suggestions.length > 0 ? (
            <select
              className="input text-sm"
              value={condition.value ?? ''}
              onChange={(e) => onChange(index, { ...condition, value: e.target.value })}
            >
              <option value="">Select value...</option>
              {suggestions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input
              className="input text-sm"
              placeholder="value"
              value={condition.value ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                // Auto-cast to number for numeric fields.
                const numericFields = [
                  'evidence.count', 'evidence.accepted.count', 'evidence.collectedWithin',
                  'control.count', 'control.implemented.count',
                  'assessment.count', 'assessment.satisfied.count',
                ];
                onChange(index, { ...condition, value: numericFields.includes(condition.field) ? (v === '' ? '' : Number(v)) : v });
              }}
            />
          )
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="mt-1 rounded p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
        title="Remove condition"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Visual policy rule builder.
 *
 * Props:
 *  rules    - Current rules object ({ match, conditions })
 *  onChange - Called with updated rules object
 */
export default function RuleBuilder({ rules, onChange }) {
  const match = rules?.match || 'all';
  const conditions = rules?.conditions || [];

  function updateMatch(v) {
    onChange({ ...rules, match: v, conditions });
  }

  function addCondition() {
    onChange({
      ...rules,
      match,
      conditions: [...conditions, { field: 'evidence.count', op: 'gte', value: 1 }],
    });
  }

  function updateCondition(index, updated) {
    const next = conditions.map((c, i) => (i === index ? updated : c));
    onChange({ ...rules, match, conditions: next });
  }

  function removeCondition(index) {
    onChange({ ...rules, match, conditions: conditions.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      {/* Match mode */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Policy passes when</span>
        <div className="flex rounded-lg border border-slate-200 text-sm overflow-hidden">
          {['all', 'any'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => updateMatch(m)}
              className={`px-3 py-1.5 font-medium transition ${match === m ? 'bg-charcoal-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {m === 'all' ? 'ALL conditions pass' : 'ANY condition passes'}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      {conditions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
          No conditions yet. Click "Add condition" to define your first rule.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Field</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Operator</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Value</p>
            <div />
          </div>
          {conditions.map((c, i) => (
            <ConditionRow
              key={i}
              condition={c}
              index={i}
              onChange={updateCondition}
              onRemove={removeCondition}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addCondition}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
      >
        <PlusIcon className="h-4 w-4" /> Add condition
      </button>
    </div>
  );
}
