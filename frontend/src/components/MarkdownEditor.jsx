import React, { useState, useRef } from 'react';
import { Button, Field } from './ui';

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
 * Simple split-pane Markdown editor with toolbar.
 * No external dependencies -- uses a plain textarea + dangerouslySetInnerHTML
 * with the `marked` library for rendering.
 *
 * Props:
 *  value    - Markdown string
 *  onChange - Called with new string on every keystroke
 *  rows     - Textarea row height (default 18)
 */
export default function MarkdownEditor({ value = '', onChange, rows = 18 }) {
  const [preview, setPreview] = useState(false);
  const textRef = useRef(null);

  function insertMarkdown(action) {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    let next;

    if (action.wrap) {
      const [before, after] = action.wrap;
      next = value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + before.length, end + before.length);
      }, 0);
    } else if (action.line) {
      // Insert prefix at start of selected lines.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      next = value.slice(0, lineStart) + action.line + value.slice(lineStart);
      onChange(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + action.line.length, end + action.line.length);
      }, 0);
    } else if (action.insert) {
      next = value.slice(0, start) + action.insert + value.slice(end);
      onChange(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + action.insert.length, start + action.insert.length);
      }, 0);
    }
  }

  function renderHtml() {
    try {
      const { marked } = require('marked');
      return marked.parse(value || '');
    } catch {
      return value;
    }
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
        <div className="ml-auto flex rounded border border-slate-200 bg-white text-xs">
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
      </div>

      {/* Content */}
      {preview ? (
        <div
          className="prose prose-sm max-w-none p-4 text-slate-700"
          dangerouslySetInnerHTML={{ __html: renderHtml() }}
        />
      ) : (
        <textarea
          ref={textRef}
          className="block w-full resize-none border-0 bg-white p-3 font-mono text-sm text-slate-800 outline-none focus:ring-0"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write policy content in Markdown...&#10;&#10;## Section heading&#10;&#10;- Bullet point&#10;**Bold text**"
          spellCheck={false}
        />
      )}
    </div>
  );
}
