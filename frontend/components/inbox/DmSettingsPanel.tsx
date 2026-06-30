'use client';

import { useEffect, useState } from 'react';
import { Settings, X, Trash2, Plus, Link2, Send } from 'lucide-react';
import { getSettings, updateSettings, getDmMessages, updateDmMessages, getAgents, DmMessageItem } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { AgentAvatar } from '@/components/ui/AgentAvatar';

interface DmButton {
  title: string;
  url: string;
}

interface Props {
  width: number | string;
  onClose?: () => void;
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{
      width: 36, height: 20, borderRadius: 10, padding: 2,
      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
      backgroundColor: on ? '#3B82F6' : '#E5E7EB',
      transition: 'background-color 0.25s ease',
    }}>
      <span style={{
        display: 'block', width: 16, height: 16, borderRadius: '50%',
        backgroundColor: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        transform: on ? 'translateX(16px)' : 'translateX(0px)',
        transition: 'transform 0.25s ease',
      }} />
    </span>
  );
}

export function DmSettingsPanel({ width, onClose }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [enabled, setEnabled]     = useState(false);
  const [agentId, setAgentId]     = useState<number | null>(null);
  const [agents, setAgents]       = useState<any[]>([]);
  const [templates, setTemplates] = useState<DmMessageItem[]>([{ text: '' }]);
  const [dmButtons, setDmButtons] = useState<DmButton[]>([]);

  const [initial, setInitial] = useState<{
    enabled: boolean; agentId: number | null; templates: DmMessageItem[]; dmButtons: DmButton[];
  } | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getDmMessages(), getAgents()]).then(([s, msgs, ags]) => {
      const en  = s.dmAutoReplyEnabled ?? false;
      const aid = s.dmMode === 'ai' ? (s.dmAgentId ?? null) : null;
      const raw: DmMessageItem[] = Array.isArray(msgs?.messages) && msgs.messages.length
        ? msgs.messages.map((m: any) => typeof m === 'string' ? { text: m } : { text: m.text || '', buttonText: m.buttonText ?? undefined, buttonUrl: m.buttonUrl ?? undefined })
        : [{ text: '' }];
      const btns: DmButton[] = Array.isArray(s.dmButtons) ? s.dmButtons : [];
      setEnabled(en); setAgentId(aid);
      setAgents(Array.isArray(ags) ? ags : []);
      setTemplates(raw);
      setDmButtons(btns);
      setInitial({ enabled: en, agentId: aid, templates: raw, dmButtons: btns });
    }).finally(() => setLoading(false));
  }, []);

  const hasChanges = initial !== null && (
    enabled !== initial.enabled ||
    agentId !== initial.agentId ||
    JSON.stringify(templates) !== JSON.stringify(initial.templates) ||
    JSON.stringify(dmButtons) !== JSON.stringify(initial.dmButtons)
  );

  const validTemplates = templates.filter(t => t.text.trim());
  const aiEnabled = agentId !== null;

  const templateError = !aiEnabled && enabled && validTemplates.length < 3
    ? `${t('inbox.settings.errTemplates')} (${validTemplates.length})`
    : null;
  const agentError = aiEnabled && enabled && (!agentId || !agents.some(a => a.id === agentId))
    ? true : null;

  const updateTemplate = (i: number, field: keyof DmMessageItem, val: string) => {
    const next = [...templates];
    next[i] = { ...next[i], [field]: val };
    setTemplates(next);
  };

  const updateDmButton = (i: number, field: keyof DmButton, val: string) => {
    const next = [...dmButtons];
    next[i] = { ...next[i], [field]: val };
    setDmButtons(next);
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const mode = aiEnabled ? 'ai' : 'template';
      await updateSettings({
        dmAutoReplyEnabled: enabled,
        dmMode: mode,
        dmAgentId: aiEnabled ? agentId : null,
        dmButtons: dmButtons.filter(b => b.title.trim() && b.url.trim()),
      });
      if (!aiEnabled) {
        const toSave = validTemplates.map(t => ({
          text: t.text,
          buttonText: t.buttonText?.trim() || undefined,
          buttonUrl: t.buttonUrl?.trim() || undefined,
        }));
        await updateDmMessages(toSave);
      }
      setInitial({ enabled, agentId, templates: [...templates], dmButtons: [...dmButtons] });
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
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">

          {/* Send DM toggle card */}
          <div className={`rounded-xl border transition-all ${enabled ? 'border-primary/40' : 'border-outline-variant/30'}`}>
            {/* Header row */}
            <button
              onClick={() => setEnabled(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Send size={16} className={enabled ? 'text-primary' : 'text-on-surface-variant'} />
                <span className="font-medium text-sm text-on-surface">{t('inbox.settings.autoReply')}</span>
              </div>
              <Toggle on={enabled} />
            </button>

            {enabled && (
              <div className="px-4 pb-4 border-t border-outline-variant/20 pt-3 space-y-4">

                {/* Templates */}
                <div>
                  {aiEnabled && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 mb-3">
                      <span className="text-sm mt-0.5">🤖</span>
                      <p className="text-xs text-primary font-medium">
                        {t('automation.form.dmWarningAi')}
                      </p>
                    </div>
                  )}
                  <div className={aiEnabled ? 'opacity-40 pointer-events-none select-none' : ''}>
                    <p className="text-xs text-on-surface-variant mb-2">
                      {t('automation.form.templateVars1')}
                      <code className="bg-surface-variant px-1 rounded">{'{name}'}</code>
                      {t('automation.form.templateVars2')}
                      <code className="bg-surface-variant px-1 rounded">{'{comment}'}</code>
                      {t('automation.form.templateVars3')}
                    </p>
                    {templates.map((tmpl, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <textarea
                          value={tmpl.text}
                          onChange={e => updateTemplate(i, 'text', e.target.value)}
                          rows={2}
                          placeholder={`${t('inbox.settings.templatePlaceholder')} ${i + 1}`}
                          className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40 resize-none"
                        />
                        {templates.length > 1 && (
                          <button onClick={() => setTemplates(templates.filter((_, j) => j !== i))} className="text-on-surface-variant hover:text-error p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setTemplates([...templates, { text: '' }])} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Plus size={12} /> {t('inbox.settings.addTemplate')}
                    </button>
                    {templateError && <p className="text-[12px] text-error mt-1">{templateError}</p>}
                  </div>
                </div>

                {/* AI Agent toggle */}
                <div className="border-t border-outline-variant/20 pt-3">
                  <button
                    type="button"
                    onClick={() => setAgentId(agentId !== null ? null : (agents[0]?.id ?? null))}
                    className="flex items-center justify-between w-full"
                  >
                    <span className="text-xs font-medium text-on-surface">{t('automation.form.aiToggle')}</span>
                    <Toggle on={agentId !== null} />
                  </button>
                  {agentId !== null && (
                    <div className="mt-2 space-y-1">
                      {agents.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">{t('automation.form.noAgents')}</p>
                      ) : agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => setAgentId(agent.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                            agentId === agent.id
                              ? 'border-primary bg-primary/5'
                              : 'border-outline-variant/30 hover:border-outline-variant'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <AgentAvatar value={agent.emoji || '🤖'} size={24} />
                          </div>
                          <span className="text-xs font-medium text-on-surface">{agent.name}</span>
                          {agentId === agent.id && <span className="ml-auto text-xs text-primary font-medium">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Global URL Buttons */}
                <div className="border-t border-outline-variant/20 pt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Link2 size={13} className="text-primary" />
                    <p className="text-xs font-medium text-on-surface">
                      URL Tugmalar <span className="text-on-surface-variant font-normal">(barcha javoblar tagida)</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mb-2">
                    Shablon va agent javoblari yuborilgandan so'ng, quyidagi tugmalar ham DM ga qo'shilib yuboriladi.
                  </p>
                  {dmButtons.map((btn, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center">
                      <input
                        type="text"
                        value={btn.title}
                        onChange={e => updateDmButton(i, 'title', e.target.value)}
                        placeholder="Tugma matni"
                        className="w-28 flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40"
                      />
                      <input
                        type="url"
                        value={btn.url}
                        onChange={e => updateDmButton(i, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40"
                      />
                      <button onClick={() => setDmButtons(dmButtons.filter((_, j) => j !== i))} className="text-on-surface-variant hover:text-error flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {dmButtons.length < 3 && (
                    <button
                      onClick={() => setDmButtons([...dmButtons, { title: '', url: '' }])}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Plus size={12} /> Tugma qo'shish
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* Save button */}
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
