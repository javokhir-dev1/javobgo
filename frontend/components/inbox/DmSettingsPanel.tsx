'use client';

import { useEffect, useState } from 'react';
import { Settings, X, FileText, Bot, Trash2, Plus, ChevronRight } from 'lucide-react';
import { getSettings, updateSettings, getDmMessages, updateDmMessages, getAgents } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { AgentAvatar } from '@/components/ui/AgentAvatar';

interface Props {
  width: number | string;
  onClose?: () => void;
}

export function DmSettingsPanel({ width, onClose }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [enabled, setEnabled]       = useState(false);
  const [mode, setMode]             = useState<'template' | 'ai'>('template');
  const [agentId, setAgentId]       = useState<number | null>(null);
  const [agents, setAgents]         = useState<any[]>([]);
  const [templates, setTemplates]   = useState<string[]>(['']);

  const [initial, setInitial] = useState<{
    enabled: boolean; mode: string; agentId: number | null; templates: string[];
  } | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getDmMessages(), getAgents()]).then(([s, msgs, ags]) => {
      const en = s.dmAutoReplyEnabled ?? false;
      const md = s.dmMode === 'ai' ? 'ai' : 'template';
      const aid = s.dmAgentId ?? null;
      const texts = Array.isArray(msgs) ? msgs.map((m: any) => m.text || m) : [];
      const tmpl = texts.length ? texts : [''];
      setEnabled(en); setMode(md as any); setAgentId(aid);
      setAgents(Array.isArray(ags) ? ags : []);
      setTemplates(tmpl);
      setInitial({ enabled: en, mode: md, agentId: aid, templates: tmpl });
    }).finally(() => setLoading(false));
  }, []);

  const hasChanges = initial !== null && (
    enabled !== initial.enabled ||
    mode !== initial.mode ||
    agentId !== initial.agentId ||
    JSON.stringify(templates) !== JSON.stringify(initial.templates)
  );

  const validTemplates = templates.filter(t => t.trim());
  const templateError = mode === 'template' && enabled && validTemplates.length < 3
    ? `${t('inbox.settings.errTemplates')} (${validTemplates.length})`
    : null;
  const agentError = mode === 'ai' && enabled && (!agentId || !agents.some(a => a.id === agentId))
    ? true : null;

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await updateSettings({ dmAutoReplyEnabled: enabled, dmMode: mode, dmAgentId: agentId });
      if (mode === 'template') await updateDmMessages(templates.filter(t => t.trim()));
      setInitial({ enabled, mode, agentId, templates: [...templates] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  return (
    <div style={width === '100%' ? undefined : { width }}
      className={`flex-shrink-0 flex flex-col bg-surface-container-lowest ${width === '100%' ? 'fixed inset-0 z-50' : ''}`}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-primary" />
          <span className="text-[15px] font-semibold text-on-surface">{t('inbox.settings.title')}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-outline-variant/20 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">

          {/* Avto-javob toggle */}
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
            <div>
              <p className="text-[14px] font-medium text-on-surface">{t('inbox.settings.autoReply')}</p>
              <p className="text-[12px] text-on-surface-variant">{t('inbox.settings.autoReplyDesc')}</p>
            </div>
            <button
              onClick={() => setEnabled(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-outline-variant'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {enabled && (
            <>
              {/* Rejim */}
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">{t('inbox.settings.replyType')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['template', 'ai'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                        mode === m ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-outline-variant'
                      }`}>
                      {m === 'template' ? <FileText size={18} /> : <Bot size={18} />}
                      <span className="text-[12px] font-medium">
                        {m === 'template' ? t('inbox.settings.templates') : t('inbox.settings.aiAgent')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shablonlar */}
              {mode === 'template' && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">{t('inbox.settings.templates')}</p>
                  {templates.map((tmpl, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <textarea value={tmpl} rows={2}
                        onChange={e => { const next = [...templates]; next[i] = e.target.value; setTemplates(next); }}
                        placeholder={`${t('inbox.settings.templatePlaceholder')} ${i + 1}`}
                        className="flex-1 text-[13px] px-3 py-2 rounded-xl border border-outline-variant/40 bg-surface-container text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40 resize-none"
                      />
                      {templates.length > 1 && (
                        <button onClick={() => setTemplates(templates.filter((_, j) => j !== i))}
                          className="mt-1 w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setTemplates([...templates, ''])}
                    className="flex items-center gap-1.5 text-[13px] text-primary hover:underline">
                    <Plus size={14} /> {t('inbox.settings.addTemplate')}
                  </button>
                  {templateError && <p className="text-[12px] text-error mt-1">{templateError}</p>}
                </div>
              )}

              {/* AI Agent */}
              {mode === 'ai' && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">Agent</p>
                  {agents.length === 0 ? (
                    <p className="text-[13px] text-on-surface-variant">{t('inbox.settings.agentNotFound')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {agents.map((a: any) => (
                        <button key={a.id} onClick={() => setAgentId(a.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                            agentId === a.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'
                          }`}>
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <AgentAvatar value={a.emoji || '🤖'} size={28} />
                          </div>
                          <p className="flex-1 text-[13px] font-medium text-on-surface truncate">{a.name}</p>
                          {agentId === a.id && <ChevronRight size={14} className="text-primary flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Saqlash */}
      <div className="px-4 py-3 border-t border-outline-variant/20">
        <button onClick={save}
          disabled={saving || !hasChanges || !!templateError || !!agentError}
          className={`w-full py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
            saved ? 'bg-green-500 text-white'
              : hasChanges && !templateError && !agentError
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
          }`}>
          {saving ? t('inbox.settings.saving') : saved ? t('inbox.settings.saved') : t('general.save')}
        </button>
      </div>
    </div>
  );
}
