'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Zap, MessageSquare, Send, ToggleLeft, ToggleRight,
  Trash2, Globe, Hash, CheckCircle, Save, Plus,
} from 'lucide-react';
import { getAutomation, updateAutomation, toggleAutomation, deleteAutomation, getInstagramPosts, getAgents } from '@/lib/api';

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
function AgentAvatar({ value, className = 'w-6 h-6' }: { value: string; className?: string }) {
  if (value?.startsWith('dicebear:')) {
    const seed = value.split(':')[2] || 'Felix';
    return <img src={avatarUrl(seed)} className={className} alt="avatar" />;
  }
  return <span className="text-base leading-none">{value}</span>;
}

interface Automation {
  id: number;
  name: string;
  triggerType: 'any' | 'keyword';
  keywords: string[];
  replyEnabled: boolean;
  replyTemplates: string[];
  dmEnabled: boolean;
  dmTemplates: string[];
  postScope: 'all' | 'specific';
  postIds: string[];
  postData: { id: string; caption?: string; thumbnail?: string }[];
  isActive: boolean;
  replyAgentId: number | null;
  dmAgentId: number | null;
}

export default function AutomationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [auto, setAuto] = useState<Automation | null>(null);
  const [form, setForm] = useState<Automation | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [kwInput, setKwInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getAutomation(Number(id)).then(data => {
      setAuto(data);
      setForm(data);
    });
    getInstagramPosts().then(p => setPosts(p?.posts || p?.data || [])).catch(() => setPosts([]));
    getAgents().then(setAgents).catch(() => setAgents([]));
  }, [id]);

  if (!form) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant">
      Yuklanmoqda...
    </div>
  );

  const update = (patch: Partial<Automation>) => setForm(f => f ? { ...f, ...patch } : f);

  const addKw = () => {
    const kw = kwInput.trim();
    if (kw && !form.keywords.includes(kw)) update({ keywords: [...form.keywords, kw] });
    setKwInput('');
  };

  const togglePost = (post: any) => {
    const postId = post.id;
    if (form.postIds.includes(postId)) {
      update({ postIds: form.postIds.filter(p => p !== postId), postData: form.postData.filter(p => p.id !== postId) });
    } else {
      update({
        postIds: [...form.postIds, postId],
        postData: [...form.postData, { id: postId, caption: post.caption?.substring(0, 80), thumbnail: post.thumbnail_url || post.media_url }],
      });
    }
  };

  const save = async () => {
    setSaveError(null);

    const validReplyTemplates = (form.replyTemplates || []).filter(t => t?.trim());
    const validDmTemplates    = (form.dmTemplates    || []).filter(t => t?.trim());

    if (form.replyEnabled && !form.replyAgentId && validReplyTemplates.length < 3) {
      setSaveError('Izohga javob: AI agentsiz kamida 3 ta shablon kiritilishi shart');
      return;
    }
    if (form.dmEnabled && !form.dmAgentId && validDmTemplates.length < 3) {
      setSaveError('DM yuborish: AI agentsiz kamida 3 ta shablon kiritilishi shart');
      return;
    }

    setSaving(true);
    try {
      await updateAutomation(form.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const updated = await toggleAutomation(form.id);
    update({ isActive: updated.isActive });
    setAuto(a => a ? { ...a, isActive: updated.isActive } : a);
  };

  const handleDelete = async () => {
    await deleteAutomation(form.id);
    router.push('/automation');
  };

  const hasChanges = JSON.stringify(form) !== JSON.stringify(auto);

  return (
    <div className="h-full flex flex-col bg-background text-on-surface overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur border-b border-outline-variant/30 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/automation')} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-on-surface text-sm leading-tight">{form.name}</h1>
            <span className={`text-xs ${form.isActive ? 'text-emerald-500' : 'text-on-surface-variant'}`}>
              {form.isActive ? 'Faol' : 'Nofaol'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggle} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant/40 text-on-surface-variant hover:border-outline-variant transition-all">
            <span style={{
              width: '32px', height: '18px', borderRadius: '9px', padding: '2px',
              border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
              backgroundColor: form.isActive ? '#3B82F6' : '#E5E7EB',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
              transition: 'background-color 0.25s ease',
            }}>
              <span style={{
                display: 'block', width: '14px', height: '14px', borderRadius: '50%',
                backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transform: form.isActive ? 'translateX(14px)' : 'translateX(0px)',
                transition: 'transform 0.25s ease',
              }} />
            </span>
            {form.isActive ? "O'chirish" : 'Yoqish'}
          </button>
          {hasChanges && (
            <div className="flex items-center gap-2">
              {saveError && (
                <span className="text-[11px] text-red-500 max-w-[180px] text-right leading-tight">{saveError}</span>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
              >
                {saved ? <><CheckCircle size={13} /> Saqlandi</> : saving ? 'Saqlanmoqda...' : <><Save size={13} /> Saqlash</>}
              </button>
            </div>
          )}
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-all">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Name */}
        <Section title="Nom">
          <input
            type="text"
            value={form.name}
            onChange={e => update({ name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-variant text-on-surface text-sm outline-none focus:ring-2 ring-primary/40"
          />
        </Section>

        {/* Trigger */}
        <Section title="Trigger">
          <div className="space-y-2 mb-3">
            {[
              { val: 'any', label: 'Har qanday izohda', desc: 'Barcha izohlarga javob beradi' },
              { val: 'keyword', label: "Kalit so'z bo'lganda", desc: "Faqat belgilangan so'zlarni o'z ichiga olgan izohlarda" },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => update({ triggerType: opt.val as any })}
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
            <div>
              <div className="flex gap-2 mb-2">
                <input
                  value={kwInput}
                  onChange={e => setKwInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addKw()}
                  placeholder="Kalit so'z kiriting..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-sm outline-none focus:ring-2 ring-primary/40"
                />
                <button onClick={addKw} className="px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium">Qo'sh</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.keywords.map(kw => (
                  <span key={kw} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    {kw}
                    <button onClick={() => update({ keywords: form.keywords.filter(k => k !== kw) })} className="hover:text-error">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Reply */}
        <Section title="Izohga javob">
          <div className={`rounded-xl border transition-all ${form.replyEnabled ? 'border-primary/40' : 'border-outline-variant/30'}`}>
            <button
              onClick={() => update({ replyEnabled: !form.replyEnabled })}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className={form.replyEnabled ? 'text-primary' : 'text-on-surface-variant'} />
                <span className="font-medium text-sm text-on-surface">Izohga javob berish</span>
              </div>
              <span style={{
                width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                backgroundColor: form.replyEnabled ? '#3B82F6' : '#E5E7EB',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                transition: 'background-color 0.25s ease',
              }}>
                <span style={{
                  display: 'block', width: '16px', height: '16px', borderRadius: '50%',
                  backgroundColor: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transform: form.replyEnabled ? 'translateX(16px)' : 'translateX(0px)',
                  transition: 'transform 0.25s ease',
                }} />
              </span>
            </button>
            {form.replyEnabled && (
              <div className="px-4 pb-4 border-t border-outline-variant/20 pt-3">
                {form.replyAgentId !== null && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 mb-3">
                    <span className="text-sm mt-0.5">🤖</span>
                    <p className="text-xs text-primary font-medium">
                      {form.triggerType === 'keyword'
                        ? "Kalit so'zlarga mos kelgan izohlarga shablon javob beradi. Mos kelmaganlarga AI agent avtomatik javob beradi."
                        : 'AI agent javob beradi — shablonlar ishlatilmaydi'}
                    </p>
                  </div>
                )}
                <div className={form.replyAgentId !== null && form.triggerType !== 'keyword' ? 'opacity-40 pointer-events-none select-none' : ''}>
                  <p className="text-xs text-on-surface-variant mb-2">Shablonlar (tasodifiy tanlanadi). <code className="bg-surface-variant px-1 rounded">{'{name}'}</code> = ism, <code className="bg-surface-variant px-1 rounded">{'{comment}'}</code> = izoh</p>
                  {form.replyTemplates.map((t, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <textarea
                        value={t}
                        onChange={e => {
                          const arr = [...form.replyTemplates];
                          arr[i] = e.target.value;
                          update({ replyTemplates: arr });
                        }}
                        rows={2}
                        placeholder={`Javob ${i + 1}...`}
                        className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40 resize-none"
                      />
                      {form.replyTemplates.length > 1 && (
                        <button onClick={() => update({ replyTemplates: form.replyTemplates.filter((_, j) => j !== i) })} className="text-on-surface-variant hover:text-error p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => update({ replyTemplates: [...form.replyTemplates, ''] })} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus size={12} /> Shablon qo'shish
                  </button>
                </div>

                {/* AI Agent toggle */}
                <div className="pt-2 border-t border-outline-variant/20 mt-2">
                  <button
                    type="button"
                    onClick={() => update({ replyAgentId: form.replyAgentId !== null ? null : (agents[0]?.id ?? null) })}
                    className="flex items-center justify-between w-full"
                  >
                    <span className="text-xs font-medium text-on-surface">🤖 AI agent yoqish</span>
                    <span style={{
                      width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                      border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                      backgroundColor: form.replyAgentId !== null ? '#3B82F6' : '#E5E7EB',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                      transition: 'background-color 0.25s ease',
                    }}>
                      <span style={{
                        display: 'block', width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        transform: form.replyAgentId !== null ? 'translateX(16px)' : 'translateX(0px)',
                        transition: 'transform 0.25s ease',
                      }} />
                    </span>
                  </button>
                  {form.replyAgentId !== null && (
                    <div className="mt-2 space-y-1">
                      {agents.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">Hali agent yaratilmagan</p>
                      ) : agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => update({ replyAgentId: agent.id })}
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
        </Section>

        {/* DM */}
        <Section title="DM yuborish">
          <div className={`rounded-xl border transition-all ${form.dmEnabled ? 'border-primary/40' : 'border-outline-variant/30'}`}>
            <button
              onClick={() => update({ dmEnabled: !form.dmEnabled })}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Send size={16} className={form.dmEnabled ? 'text-primary' : 'text-on-surface-variant'} />
                <span className="font-medium text-sm text-on-surface">DM yuborish</span>
              </div>
              <span style={{
                width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                backgroundColor: form.dmEnabled ? '#3B82F6' : '#E5E7EB',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                transition: 'background-color 0.25s ease',
              }}>
                <span style={{
                  display: 'block', width: '16px', height: '16px', borderRadius: '50%',
                  backgroundColor: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transform: form.dmEnabled ? 'translateX(16px)' : 'translateX(0px)',
                  transition: 'transform 0.25s ease',
                }} />
              </span>
            </button>
            {form.dmEnabled && (
              <div className="px-4 pb-4 border-t border-outline-variant/20 pt-3">
                {form.dmAgentId !== null && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 mb-3">
                    <span className="text-sm mt-0.5">🤖</span>
                    <p className="text-xs text-primary font-medium">
                      {form.triggerType === 'keyword'
                        ? "Kalit so'zlarga mos kelgan izohlarga shablon DM yuboriladi. Mos kelmaganlarga AI agent DM yuboradi."
                        : 'AI agent DM yuboradi — shablonlar ishlatilmaydi'}
                    </p>
                  </div>
                )}
                <div className={form.dmAgentId !== null && form.triggerType !== 'keyword' ? 'opacity-40 pointer-events-none select-none' : ''}>
                  <p className="text-xs text-on-surface-variant mb-2">Shablonlar. <code className="bg-surface-variant px-1 rounded">{'{name}'}</code> = ism, <code className="bg-surface-variant px-1 rounded">{'{comment}'}</code> = izoh</p>
                  {form.dmTemplates.map((t, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <textarea
                        value={t}
                        onChange={e => {
                          const arr = [...form.dmTemplates];
                          arr[i] = e.target.value;
                          update({ dmTemplates: arr });
                        }}
                        rows={2}
                        placeholder={`DM ${i + 1}...`}
                        className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40 resize-none"
                      />
                      {form.dmTemplates.length > 1 && (
                        <button onClick={() => update({ dmTemplates: form.dmTemplates.filter((_, j) => j !== i) })} className="text-on-surface-variant hover:text-error p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => update({ dmTemplates: [...form.dmTemplates, ''] })} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus size={12} /> Shablon qo'shish
                  </button>
                </div>

                {/* AI Agent toggle */}
                <div className="pt-2 border-t border-outline-variant/20 mt-2">
                  <button
                    type="button"
                    onClick={() => update({ dmAgentId: form.dmAgentId !== null ? null : (agents[0]?.id ?? null) })}
                    className="flex items-center justify-between w-full"
                  >
                    <span className="text-xs font-medium text-on-surface">🤖 AI agent yoqish</span>
                    <span style={{
                      width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                      border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                      backgroundColor: form.dmAgentId !== null ? '#3B82F6' : '#E5E7EB',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                      transition: 'background-color 0.25s ease',
                    }}>
                      <span style={{
                        display: 'block', width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        transform: form.dmAgentId !== null ? 'translateX(16px)' : 'translateX(0px)',
                        transition: 'transform 0.25s ease',
                      }} />
                    </span>
                  </button>
                  {form.dmAgentId !== null && (
                    <div className="mt-2 space-y-1">
                      {agents.length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">Hali agent yaratilmagan</p>
                      ) : agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => update({ dmAgentId: agent.id })}
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
              </div>
            )}
          </div>
        </Section>

        {/* Posts */}
        <Section title="Postlar">
          <div className="space-y-2 mb-3">
            {[
              { val: 'all', label: 'Barcha postlar', icon: Globe },
              { val: 'specific', label: 'Tanlangan postlar', icon: Hash },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => update({ postScope: opt.val as any, postIds: [], postData: [] })}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                  form.postScope === opt.val
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant/30 hover:border-outline-variant'
                }`}
              >
                <opt.icon size={16} className={form.postScope === opt.val ? 'text-primary' : 'text-on-surface-variant'} />
                <span className="font-medium text-sm text-on-surface">{opt.label}</span>
                {form.postScope === opt.val && opt.val === 'specific' && form.postIds.length > 0 && (
                  <span className="ml-auto text-xs text-primary font-medium">{form.postIds.length} ta tanlangan</span>
                )}
              </button>
            ))}
          </div>
          {form.postScope === 'specific' && (
            <div>
              {posts.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic">Postlar topilmadi</p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {posts.map((post: any) => {
                    const selected = form.postIds.includes(post.id);
                    return (
                      <button
                        key={post.id}
                        onClick={() => togglePost(post)}
                        className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                          selected ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {(post.thumbnail_url || post.media_url) ? (
                          <img src={post.thumbnail_url || post.media_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-surface-variant flex items-center justify-center">
                            <MessageSquare size={14} className="text-on-surface-variant" />
                          </div>
                        )}
                        {selected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <CheckCircle size={16} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Save button (bottom) */}
        {hasChanges && (
          <div className="sticky bottom-4 flex flex-col items-center gap-2">
            {saveError && (
              <span className="text-[12px] text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40">
                {saveError}
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
            >
              {saved ? <><CheckCircle size={16} /> Saqlandi</> : saving ? 'Saqlanmoqda...' : <><Save size={16} /> O'zgarishlarni saqlash</>}
            </button>
          </div>
        )}
      </div>
      </div>{/* /overflow-y-auto */}

      {/* Delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-on-surface mb-2">O'chirishni tasdiqlang</h3>
            <p className="text-sm text-on-surface-variant mb-5">"{form.name}" avtomatizatsiyasi butunlay o'chiriladi.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-variant">
                Bekor qilish
              </button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl text-sm font-medium bg-error text-on-error">
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/20">
        <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
