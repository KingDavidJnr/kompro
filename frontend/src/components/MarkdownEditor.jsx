import React, { useState, useRef } from 'react';
import { marked } from 'marked';

const TOOLBAR = [
  { label: 'B', title: 'Bold', wrap: ['**', '**'] },
  { label: 'I', title: 'Italic', wrap: ['_', '_'] },
  { label: 'H1', title: 'Heading 1', line: '# ' },
  { label: 'H2', title: 'Heading 2', line: '## ' },
  { label: '—', title: 'Horizontal rule', insert: '\n---\n' },
  { label: '• List', title: 'Unordered list', line: '- ' },
  { label: '1. List', title: 'Ordered list', line: '1. ' },
  { label: '> Quote', title: 'Blockquote', line: '> ' },
  { label: '`Code`', title: 'Inline code', wrap: ['`', '`'] },
];

/**
 * Markdown editor with toolbar and collapsed-by-default behaviour.
 *
 * Props:
 *  value    - Markdown string
 *  onChange - Called with new string on every keystroke
 *  rows     - Textarea row height when expanded (default 18)
 */
export default function MarkdownEditor({ value = '', onChange, rows = 18 }) {
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(false);
  const textRef = useRef(null);

  function insertMarkdown(action) {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    if (action.wrap) {
      const [before, after] = action.wrap;
      const next = value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(next);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length); }, 0);
    } else if (action.line) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const next = value.slice(0, lineStart) + action.line + value.slice(lineStart);
      onChange(next);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + action.line.length, end + action.line.length); }, 0);
    } else if (action.insert) {
      const next = value.slice(0, start) + action.insert + value.slice(end);
      onChange(next);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + action.insert.length, start + action.insert.length); }, 0);
    }
  }

  // Collapsed state: show a preview of the current content (or a placeholder).
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-brand-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        {value ? (
          <div
            className="prose prose-sm pointer-events-none max-w-none text-slate-600 line-clamp-4"
            dangerouslySetInnerHTML={{ __html: marked.parse(value) }}
          />
        ) : (
          <p className="text-sm text-slate-400">Click to write policy content in Markdown...</p>
        )}
        <p className="mt-2 text-xs text-brand-500">Click to edit</p>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        {TOOLBAR.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            onClick={() => insertMarkdown(t)}
            className="rounded px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm"
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded border border-slate-200 bg-white text-xs">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className={`px-2.5 py-1 ${!preview ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className={`px-2.5 py-1 ${preview ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
            >
              Preview
            </button>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Collapse editor"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* Content */}
      {preview ? (
        <div
          className="prose prose-sm max-w-none p-4 text-slate-700"
          dangerouslySetInnerHTML={{ __html: marked.parse(value || '') }}
        />
      ) : (
        <textarea
          ref={textRef}
          autoFocus
          className="block w-full resize-y border-0 bg-white p-3 font-mono text-sm text-slate-800 outline-none focus:ring-0"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'Write policy content in Markdown...\n\n## Section heading\n\n- Bullet point\n**Bold text**'}
          spellCheck={false}
        />
      )}
    </div>
  );
}
