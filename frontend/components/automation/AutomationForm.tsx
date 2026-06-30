'use client';

import {
  Plus, Zap, MessageSquare, Send, Trash2, Globe, Hash,
  CheckCircle, ArrowLeft, Save,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { Card } from '@/components/ui/Card';
import type { FormState } from './types';

interface AutomationFormProps {
  form: FormState;
  kwInput: string;
  setKwInput: (v: string) => void;
  up: (patch: Partial<FormState>) => void;
  addKw: () => void;
  togglePost: (post: any) => void;
  posts: any[];
  postsLoading: boolean;
  agents: any[];
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onBack: () => void;
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{
      width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
      border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
      backgroundColor: on ? '#3B82F6' : '#E5E7EB',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
      transition: 'background-color 0.25s ease',
    }}>
      <span style={{
        display: 'block', width: '16px', height: '16px', borderRadius: '50%',
        backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transform: on ? 'translateX(16px)' : 'translateX(0px)',
        transition: 'transform 0.25s ease',
      }} />
    </span>
  );
}

export function AutomationForm({
  form, kwInput, setKwInput, up, addKw, togglePost,
  posts, postsLoading, agents, saving, saveError, onSave, onBack,
}: AutomationFormProps) {
  const { t } = useLanguage();
  const canSave = form.name.trim() && (form.replyEnabled || form.dmEnabled);

  return (
    <div className="h-full flex flex-col bg-background text-on-surface overflow-hidden">
      {/* Sticky header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur border-b border-outline-variant/30 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
            <ArrowLeft size={20} />
          </button>
          <span className="font-semibold text-on-surface">{t('automation.new')}</span>
        </div>
        <button
          onClick={onSave}
          disabled={!canSave || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
        >
          <Save size={14} />
          {saving ? t('automation.form.saving') : t('general.save')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">

          {/* Nom */}
          <Card title={t('automation.form.nameLabel')}>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={e => up({ name: e.target.value })}
              placeholder={t('automation.form.namePlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-surface-variant text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 ring-primary/40 text-sm"
            />
          </Card>

          {/* Trigger */}
          <Card title={t('automation.form.triggerLabel')} desc={t('automation.form.triggerDesc')}>
            <div className="space-y-2">
              {[
                { val: 'any', label: t('automation.form.triggerAny'), desc: t('automation.form.triggerAnyDesc') },
                { val: 'keyword', label: t('automation.form.triggerKeyword'), desc: t('automation.form.triggerKeywordDesc') },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => up({ triggerType: opt.val as any })}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    form.triggerType === opt.val
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <div className="font-medium text-sm text-on-surface">{opt.label}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
            {form.triggerType === 'keyword' && (
              <div className="mt-3">
                <div className="flex gap-2 mb-2">
                  <input
                    value={kwInput}
                    onChange={e => setKwInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKw()}
                    placeholder={t('automation.form.kwPlaceholder')}
                    className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-sm outline-none focus:ring-2 ring-primary/40"
                  />
                  <button onClick={addKw} className="px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium whitespace-nowrap">
                    {t('automation.form.kwAdd')}
                  </button>
                </div>
                {form.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.keywords.map(kw => (
                      <span key={kw} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                        {kw}
                        <button onClick={() => up({ keywords: form.keywords.filter(k => k !== kw) })} className="hover:text-error leading-none">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Amallar */}
          <Card title={t('automation.form.actionsLabel')} desc={t('automation.form.actionsDesc')}>
            <div className="space-y-3">

              {/* Izohga javob */}
              <div className={`rounded-xl border transition-all ${form.replyEnabled ? 'border-primary/50' : 'border-outline-variant/30'}`}>
                <button
                  onClick={() => up({ replyEnabled: !form.replyEnabled })}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={16} className={form.replyEnabled ? 'text-primary' : 'text-on-surface-variant'} />
                    <span className="font-medium text-sm text-on-surface">{t('automation.form.replyAction')}</span>
                  </div>
                  <Toggle on={form.replyEnabled} />
                </button>
                {form.replyEnabled && (
                  <div className="px-4 pb-4 border-t border-outline-variant/20 pt-3 space-y-2">
                    {form.replyAgentId !== null && form.replyAgentId !== -1 && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
                        <span className="text-sm mt-0.5">🤖</span>
                        <p className="text-xs text-primary font-medium">
                          {form.triggerType === 'keyword'
                            ? t('automation.form.replyWarningKw')
                            : t('automation.form.replyWarningAi')}
                        </p>
                      </div>
                    )}
                    <div className={form.replyAgentId !== null && form.replyAgentId !== -1 && form.triggerType !== 'keyword' ? 'opacity-40 pointer-events-none select-none' : ''}>
                      <p className="text-xs text-on-surface-variant mb-2">
                        {t('automation.form.templateVars1')}
                        <code className="bg-surface-variant px-1 rounded">{'{name}'}</code>
                        {t('automation.form.templateVars2')}
                        <code className="bg-surface-variant px-1 rounded">{'{comment}'}</code>
                        {t('automation.form.templateVars3')}
                      </p>
                      {form.replyTemplates.map((tmpl, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <textarea
                            value={tmpl}
                            onChange={e => {
                              const arr = [...form.replyTemplates];
                              arr[i] = e.target.value;
                              up({ replyTemplates: arr });
                            }}
                            rows={2}
                            placeholder={`${t('automation.form.templateReplyPlaceholder')} ${i + 1}...`}
                            className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40 resize-none"
                          />
                          {form.replyTemplates.length > 1 && (
                            <button onClick={() => up({ replyTemplates: form.replyTemplates.filter((_, j) => j !== i) })} className="text-on-surface-variant hover:text-error self-start p-1 mt-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => up({ replyTemplates: [...form.replyTemplates, ''] })} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Plus size={12} /> {t('automation.form.addTemplate')}
                      </button>
                    </div>

                    {/* AI Agent toggle */}
                    <div className="pt-2 border-t border-outline-variant/20 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (form.replyAgentId !== null) {
                            up({ replyAgentId: null });
                          } else if (agents.length === 0) {
                            up({ replyAgentId: -1 });
                          } else {
                            up({ replyAgentId: agents[0].id });
                          }
                        }}
                        className="flex items-center justify-between w-full"
                      >
                        <span className="text-xs font-medium text-on-surface">{t('automation.form.aiToggle')}</span>
                        <Toggle on={form.replyAgentId !== null} />
                      </button>
                      {form.replyAgentId === -1 && (
                        <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                          <span className="text-sm mt-0.5">⚠️</span>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            {t('automation.form.createAgentPrompt')}
                            <a href="/agents" className="font-semibold underline hover:no-underline">
                              {t('automation.form.createAgentBtn')}
                            </a>
                          </p>
                        </div>
                      )}
                      {form.replyAgentId !== null && form.replyAgentId !== -1 && (
                        <div className="mt-2 space-y-1">
                          {agents.map(agent => (
                            <button
                              key={agent.id}
                              onClick={() => up({ replyAgentId: agent.id })}
                              className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                                form.replyAgentId === agent.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-outline-variant/30 hover:border-outline-variant'
                              }`}
                            >
                              <AgentAvatar value={agent.emoji || '🤖'} className="w-6 h-6" />
                              <span className="text-xs font-medium text-on-surface">{agent.name}</span>
                              {form.replyAgentId === agent.id && (
                                <span className="ml-auto text-xs text-primary font-medium">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* DM */}
              <div className={`rounded-xl border transition-all ${form.dmEnabled ? 'border-primary/50' : 'border-outline-variant/30'}`}>
                <button
                  onClick={() => up({ dmEnabled: !form.dmEnabled })}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <Send size={16} className={form.dmEnabled ? 'text-primary' : 'text-on-surface-variant'} />
                    <span className="font-medium text-sm text-on-surface">{t('automation.form.dmAction')}</span>
                  </div>
                  <Toggle on={form.dmEnabled} />
                </button>
                {form.dmEnabled && (
                  <div className="px-4 pb-4 border-t border-outline-variant/20 pt-3 space-y-2">
                    {form.dmAgentId !== null && form.dmAgentId !== -1 && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
                        <span className="text-sm mt-0.5">🤖</span>
                        <p className="text-xs text-primary font-medium">
                          {form.triggerType === 'keyword'
                            ? t('automation.form.dmWarningKw')
                            : t('automation.form.dmWarningAi')}
                        </p>
                      </div>
                    )}
                    <div className={form.dmAgentId !== null && form.dmAgentId !== -1 && form.triggerType !== 'keyword' ? 'opacity-40 pointer-events-none select-none' : ''}>
                      <p className="text-xs text-on-surface-variant mb-2">
                        {t('automation.form.templateVars1')}
                        <code className="bg-surface-variant px-1 rounded">{'{name}'}</code>
                        {t('automation.form.templateVars2')}
                        <code className="bg-surface-variant px-1 rounded">{'{comment}'}</code>
                        {t('automation.form.templateVars3')}
                      </p>
                      {form.dmTemplates.map((tmpl, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <textarea
                            value={tmpl}
                            onChange={e => {
                              const arr = [...form.dmTemplates];
                              arr[i] = e.target.value;
                              up({ dmTemplates: arr });
                            }}
                            rows={2}
                            placeholder={`${t('automation.form.templateDmPlaceholder')} ${i + 1}...`}
                            className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40 resize-none"
                          />
                          {form.dmTemplates.length > 1 && (
                            <button onClick={() => up({ dmTemplates: form.dmTemplates.filter((_, j) => j !== i) })} className="text-on-surface-variant hover:text-error self-start p-1 mt-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => up({ dmTemplates: [...form.dmTemplates, ''] })} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Plus size={12} /> {t('automation.form.addTemplate')}
                      </button>
                    </div>

                    {/* AI Agent toggle */}
                    <div className="pt-2 border-t border-outline-variant/20 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (form.dmAgentId !== null) {
                            up({ dmAgentId: null });
                          } else if (agents.length === 0) {
                            up({ dmAgentId: -1 });
                          } else {
                            up({ dmAgentId: agents[0].id });
                          }
                        }}
                        className="flex items-center justify-between w-full"
                      >
                        <span className="text-xs font-medium text-on-surface">{t('automation.form.aiToggle')}</span>
                        <Toggle on={form.dmAgentId !== null} />
                      </button>
                      {form.dmAgentId === -1 && (
                        <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                          <span className="text-sm mt-0.5">⚠️</span>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            {t('automation.form.createAgentPrompt')}
                            <a href="/agents" className="font-semibold underline hover:no-underline">
                              {t('automation.form.createAgentBtn')}
                            </a>
                          </p>
                        </div>
                      )}
                      {form.dmAgentId !== null && form.dmAgentId !== -1 && (
                        <div className="mt-2 space-y-1">
                          {agents.map(agent => (
                            <button
                              key={agent.id}
                              onClick={() => up({ dmAgentId: agent.id })}
                              className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                                form.dmAgentId === agent.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-outline-variant/30 hover:border-outline-variant'
                              }`}
                            >
                              <AgentAvatar value={agent.emoji || '🤖'} className="w-6 h-6" />
                              <span className="text-xs font-medium text-on-surface">{agent.name}</span>
                              {form.dmAgentId === agent.id && (
                                <span className="ml-auto text-xs text-primary font-medium">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* URL Tugmalar */}
                    <div className="pt-2 border-t border-outline-variant/20 mt-2">
                      <p className="text-xs font-medium text-on-surface mb-1">🔗 URL Tugmalar <span className="text-on-surface-variant font-normal">(barcha javoblar tagida)</span></p>
                      <p className="text-xs text-on-surface-variant mb-2">Shablon va agent javoblari yuborilgandan so'ng, quyidagi tugmalar ham DM ga qo'shilib yuboriladi.</p>
                      {(form.dmButtons || []).map((btn, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input
                            value={btn.title}
                            onChange={e => {
                              const arr = [...(form.dmButtons || [])];
                              arr[i] = { ...arr[i], title: e.target.value };
                              up({ dmButtons: arr });
                            }}
                            placeholder="Tugma nomi"
                            className="w-28 px-2 py-1.5 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40"
                          />
                          <input
                            value={btn.url}
                            onChange={e => {
                              const arr = [...(form.dmButtons || [])];
                              arr[i] = { ...arr[i], url: e.target.value };
                              up({ dmButtons: arr });
                            }}
                            placeholder="https://..."
                            className="flex-1 px-2 py-1.5 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40"
                          />
                          <button
                            onClick={() => up({ dmButtons: (form.dmButtons || []).filter((_, j) => j !== i) })}
                            className="text-on-surface-variant hover:text-error p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => up({ dmButtons: [...(form.dmButtons || []), { title: '', url: '' }] })}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus size={12} /> Tugma qo'shish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Postlar */}
          <Card title={t('automation.form.postsLabel')} desc={t('automation.form.postsDesc')}>
            <div className="space-y-2 mb-3">
              {[
                { val: 'all', label: t('automation.allPosts'), desc: t('automation.form.allPostsDesc'), Icon: Globe },
                { val: 'specific', label: t('automation.form.specificPostsLabel'), desc: t('automation.form.specificPostsDesc'), Icon: Hash },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => up({ postScope: opt.val as any, postIds: [], postData: [] })}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                    form.postScope === opt.val
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <opt.Icon size={16} className={form.postScope === opt.val ? 'text-primary' : 'text-on-surface-variant'} />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm text-on-surface">{opt.label}</div>
                    <div className="text-xs text-on-surface-variant mt-0.5">{opt.desc}</div>
                  </div>
                  {form.postScope === opt.val && opt.val === 'specific' && form.postIds.length > 0 && (
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                      {form.postIds.length} ta
                    </span>
                  )}
                </button>
              ))}
            </div>

            {form.postScope === 'specific' && (
              <div className="mt-2">
                {postsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg bg-surface-variant animate-pulse" />
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-6 text-on-surface-variant text-sm">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                    {t('automation.form.noPostsFound')}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-on-surface-variant mb-2">Postni bosib tanlang:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {posts.map((post: any) => {
                        const selected = form.postIds.includes(post.id);
                        const thumb = post.thumbnail_url || post.media_url;
                        return (
                          <button
                            key={post.id}
                            onClick={() => togglePost(post)}
                            className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                              selected ? 'border-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100 hover:border-outline-variant/40'
                            }`}
                          >
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-surface-variant flex items-center justify-center">
                                <MessageSquare size={14} className="text-on-surface-variant" />
                              </div>
                            )}
                            {selected && (
                              <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle size={14} className="text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Save button */}
          <div className="pb-8">
            <button
              onClick={onSave}
              disabled={!canSave || saving}
              className="w-full py-3.5 rounded-2xl font-medium text-white text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
            >
              <Save size={16} />
              {saving ? t('settings.waiting') || 'Saqlanmoqda...' : t('general.save')}
            </button>
            {saveError && (
              <p className="text-xs text-error text-center mt-2">{saveError}</p>
            )}
            {!saveError && !form.name.trim() && (
              <p className="text-xs text-on-surface-variant text-center mt-2">Nom kiriting</p>
            )}
            {!saveError && form.name.trim() && !form.replyEnabled && !form.dmEnabled && (
              <p className="text-xs text-on-surface-variant text-center mt-2">Kamida bitta amal tanlang</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
