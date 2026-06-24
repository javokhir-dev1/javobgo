'use client';

import { useState } from 'react';
import { Plus, X, Shuffle, AlertCircle } from 'lucide-react';

interface TemplateListProps {
  label: string;
  placeholder: string;
  templates: string[];
  onChange: (v: string[]) => void;
}

export function TemplateList({ label, placeholder, templates, onChange }: TemplateListProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (templates.includes(t)) { setDraft(''); return; }
    onChange([...templates, t]);
    setDraft('');
  };

  const update = (i: number, val: string) => {
    const duplicate = templates.some((t, idx) => idx !== i && t === val.trim());
    if (duplicate) return;
    const next = [...templates];
    next[i] = val;
    onChange(next);
  };

  const remove = (i: number) => onChange(templates.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-gray-600">{label}</label>
        {templates.length > 1 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Shuffle size={11} /> Random tanlanadi
          </span>
        )}
      </div>

      {templates.length < 3 && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <AlertCircle size={13} className="flex-shrink-0" />
          {templates.length === 0
            ? "Kamida 3 ta variant qo'shing (spam xavfini kamaytiradi)"
            : `Yana ${3 - templates.length} ta variant qo'shing (minimum 3 ta)`}
        </div>
      )}

      {templates.map((tmpl, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-shrink-0 w-5 h-5 mt-2.5 rounded-full bg-accent-light flex items-center justify-center text-xs font-semibold text-accent-dark">
            {i + 1}
          </div>
          <textarea
            rows={2}
            value={tmpl}
            onChange={e => update(i, e.target.value)}
            className="flex-1 px-3 py-2 border-[1.5px] border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-accent bg-gray-50 focus:bg-white resize-none transition-colors"
          />
          <button onClick={() => remove(i)}
            className="mt-2 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <textarea
          rows={2}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border-[1.5px] border-dashed border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:border-accent bg-gray-50 focus:bg-white resize-none transition-colors"
        />
        <button onClick={add} disabled={!draft.trim()}
          className="px-3 py-2 bg-accent text-white rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-40 self-start mt-0.5">
          <Plus size={15} />
        </button>
      </div>
      <p className="text-xs text-gray-400">
        <code className="bg-accent-light text-accent-dark px-1.5 py-0.5 rounded">{'{name}'}</code> — ism &nbsp;|&nbsp;
        <code className="bg-accent-light text-accent-dark px-1.5 py-0.5 rounded">{'{comment}'}</code> — komment matni &nbsp;|&nbsp; Ctrl+Enter — qo'shish
      </p>
    </div>
  );
}
