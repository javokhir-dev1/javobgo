'use client';
import InstagramRequired from '@/components/InstagramRequired';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Zap, MessageSquare, Send, ToggleLeft, ToggleRight,
  Trash2, ChevronRight, Globe, Hash, CheckCircle, ArrowLeft, Save,
} from 'lucide-react';
import {
  getAutomations, createAutomation, updateAutomation,
  toggleAutomation, deleteAutomation, getInstagramPosts, getAgents,
} from '@/lib/api';
import { useInstagramStatus } from '@/context/InstagramContext';

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
  createdAt: string;
}

interface FormState {
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
  replyAgentId: number | null;
  dmAgentId: number | null;
}

const EMPTY_FORM: FormState = {
  name: '',
  triggerType: 'any',
  keywords: [],
  replyEnabled: false,
  replyTemplates: [''],
  dmEnabled: false,
  dmTemplates: [''],
  postScope: 'all',
  postIds: [],
  postData: [],
  replyAgentId: null,
  dmAgentId: null,
};

export default function AutomationCommentsPage() {
  const router = useRouter();
  const connected = useInstagramStatus();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [kwInput, setKwInput] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [agents, setAgents] = useState<any[]>([]);

  const load = async () => {
    try { setAutomations(await getAutomations()); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (connected === false) return;
    load();
    getAgents().then(setAgents).catch(() => setAgents([]));
  }, [connected]);

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await getInstagramPosts();
      // backend { success, posts: [...] } qaytaradi
      setPosts(res?.posts || res?.data || []);
    } catch { setPosts([]); }
    finally { setPostsLoading(false); }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setKwInput('');
    setView('create');
    loadPosts();
  };

  const up = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const addKw = () => {
    const kw = kwInput.trim();
    if (kw && !form.keywords.includes(kw)) up({ keywords: [...form.keywords, kw] });
    setKwInput('');
  };

  const togglePost = (post: any) => {
    const id = post.id;
    if (form.postIds.includes(id)) {
      up({ postIds: form.postIds.filter(p => p !== id), postData: form.postData.filter(p => p.id !== id) });
    } else {
      up({
        postIds: [...form.postIds, id],
        postData: [...form.postData, {
          id,
          caption: post.caption?.substring(0, 80),
          thumbnail: post.thumbnail_url || post.media_url,
        }],
      });
    }
  };

  const save = async () => {
    setSaveError(null);
    if (!form.name.trim()) { setSaveError('Avtomatizatsiya nomini kiriting'); return; }
    if (!form.replyEnabled && !form.dmEnabled) { setSaveError('Kamida bitta amal yoqilishi kerak'); return; }

    const validReplyTemplates = (form.replyTemplates || []).filter(t => t?.trim());
    const validDmTemplates    = (form.dmTemplates    || []).filter(t => t?.trim());

    if (form.replyEnabled && form.replyAgentId === -1) {
      setSaveError('Izohga javob: avval AI agent yarating');
      return;
    }
    if (form.dmEnabled && form.dmAgentId === -1) {
      setSaveError('DM yuborish: avval AI agent yarating');
      return;
    }
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
      await createAutomation({ ...form, isActive: true });
      setView('list');
      load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleAutomation(id);
    load();
  };

  const handleDelete = async (id: number) => {
    await deleteAutomation(id);
    setDeleteId(null);
    load();
  };

  // ─── CREATE VIEW ─────────────────────────────────────────────────────────
  if (view === 'create') {
    const canSave = form.name.trim() && (form.replyEnabled || form.dmEnabled);
    return (
      <div className="h-full flex flex-col bg-background text-on-surface overflow-hidden">
        {/* Sticky header */}
        <div className="flex-shrink-0 bg-background/95 backdrop-blur border-b border-outline-variant/30 px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
              <ArrowLeft size={20} />
            </button>
            <span className="font-semibold text-on-surface">Yangi avtomatizatsiya</span>
          </div>
          <div className="flex items-center gap-3">
            {saveError && (
              <span className="text-[12px] text-red-500 max-w-xs text-right leading-tight">{saveError}</span>
            )}
            <button
              onClick={save}
              disabled={!canSave || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
            >
              <Save size={14} />
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          {/* Nom */}
          <Card title="Avtomatizatsiya nomi">
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={e => up({ name: e.target.value })}
              placeholder='Masalan: "Yangi post izohlari"'
              className="w-full px-4 py-3 rounded-xl bg-surface-variant text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 ring-primary/40 text-sm"
            />
          </Card>

          {/* Trigger */}
          <Card title="Trigger turi" desc="Qachon ishga tushsin?">
            <div className="space-y-2">
              {[
                { val: 'any', label: 'Har qanday izohda', desc: 'Barcha izohlarga javob beradi' },
                { val: 'keyword', label: "Kalit so'z bo'lganda", desc: "Faqat belgilangan so'zlarni o'z ichiga olgan izohlarda" },
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
                    placeholder="Kalit so'z kiriting, Enter bosing..."
                    className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-sm outline-none focus:ring-2 ring-primary/40"
                  />
                  <button onClick={addKw} className="px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium whitespace-nowrap">
                    Qo'sh
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
          <Card title="Amallar" desc="Trigger ishga tushganda nima qilsin? Kamida bittasini tanlang.">
            <div className="space-y-3">
              {/* Izohga javob */}
              <div className={`rounded-xl border transition-all ${form.replyEnabled ? 'border-primary/50' : 'border-outline-variant/30'}`}>
                <button
                  onClick={() => up({ replyEnabled: !form.replyEnabled })}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={16} className={form.replyEnabled ? 'text-primary' : 'text-on-surface-variant'} />
                    <span className="font-medium text-sm text-on-surface">Izohga javob berish</span>
                  </div>
                  <span style={{
                    width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                    border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                    backgroundColor: form.replyEnabled ? '#3B82F6' : '#E5E7EB',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    transition: 'background-color 0.25s ease',
                  }}>
                    <span style={{
                      display: 'block', width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      transform: form.replyEnabled ? 'translateX(16px)' : 'translateX(0px)',
                      transition: 'transform 0.25s ease',
                    }} />
                  </span>
                </button>
                {form.replyEnabled && (
                  <div className="px-4 pb-4 border-t border-outline-variant/20 pt-3 space-y-2">
                    {form.replyAgentId !== null && form.replyAgentId !== -1 && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
                        <span className="text-sm mt-0.5">🤖</span>
                        <p className="text-xs text-primary font-medium">
                          {form.triggerType === 'keyword'
                            ? 'Kalit so\'zlarga mos kelgan izohlarga shablon javob beradi. Mos kelmaganlarга AI agent avtomatik javob beradi.'
                            : 'AI agent javob beradi — shablonlar ishlatilmaydi'}
                        </p>
                      </div>
                    )}
                    <div className={form.replyAgentId !== null && form.replyAgentId !== -1 && form.triggerType !== 'keyword' ? 'opacity-40 pointer-events-none select-none' : ''}>
                      <p className="text-xs text-on-surface-variant mb-2">
                        Shablonlar — tasodifiy biri tanlanadi.{' '}
                        <code className="bg-surface-variant px-1 rounded">{'{name}'}</code> va{' '}
                        <code className="bg-surface-variant px-1 rounded">{'{comment}'}</code> o'zgaruvchilarini ishlatishingiz mumkin.
                      </p>
                      {form.replyTemplates.map((t, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <textarea
                            value={t}
                            onChange={e => {
                              const arr = [...form.replyTemplates];
                              arr[i] = e.target.value;
                              up({ replyTemplates: arr });
                            }}
                            rows={2}
                            placeholder={`Javob ${i + 1}...`}
                            className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40 resize-none"
                          />
                          {form.replyTemplates.length > 1 && (
                            <button onClick={() => up({ replyTemplates: form.replyTemplates.filter((_, j) => j !== i) })} className="text-on-surface-variant hover:text-error self-start p-1 mt-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => up({ replyTemplates: [...form.replyTemplates, ''] })} className="text-xs text-primary hover:underline">
                        + Shablon qo'shish
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
                            // ogohlantirish — quyida ko'rsatiladi
                            up({ replyAgentId: -1 }); // -1 = "urinish ammo agent yo'q"
                          } else {
                            up({ replyAgentId: agents[0].id });
                          }
                        }}
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
                      {form.replyAgentId === -1 && (
                        <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                          <span className="text-sm mt-0.5">⚠️</span>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Hali birorta AI agent yaratilmagan.{' '}
                            <a href="/agents" className="font-semibold underline hover:no-underline">
                              Agent yaratish →
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
                    <span className="font-medium text-sm text-on-surface">DM yuborish</span>
                  </div>
                  <span style={{
                    width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                    border: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                    backgroundColor: form.dmEnabled ? '#3B82F6' : '#E5E7EB',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    transition: 'background-color 0.25s ease',
                  }}>
                    <span style={{
                      display: 'block', width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      transform: form.dmEnabled ? 'translateX(16px)' : 'translateX(0px)',
                      transition: 'transform 0.25s ease',
                    }} />
                  </span>
                </button>
                {form.dmEnabled && (
                  <div className="px-4 pb-4 border-t border-outline-variant/20 pt-3 space-y-2">
                    {form.dmAgentId !== null && form.dmAgentId !== -1 && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
                        <span className="text-sm mt-0.5">🤖</span>
                        <p className="text-xs text-primary font-medium">
                          {form.triggerType === 'keyword'
                            ? 'Kalit so\'zlarga mos kelgan izohlarga shablon DM yuboriladi. Mos kelmaganlarга AI agent DM yuboradi.'
                            : 'AI agent DM yuboradi — shablonlar ishlatilmaydi'}
                        </p>
                      </div>
                    )}
                    <div className={form.dmAgentId !== null && form.dmAgentId !== -1 && form.triggerType !== 'keyword' ? 'opacity-40 pointer-events-none select-none' : ''}>
                      <p className="text-xs text-on-surface-variant mb-2">
                        DM shablonlari — tasodifiy biri tanlanadi.{' '}
                        <code className="bg-surface-variant px-1 rounded">{'{name}'}</code> va{' '}
                        <code className="bg-surface-variant px-1 rounded">{'{comment}'}</code> ishlatishingiz mumkin.
                      </p>
                      {form.dmTemplates.map((t, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <textarea
                            value={t}
                            onChange={e => {
                              const arr = [...form.dmTemplates];
                              arr[i] = e.target.value;
                              up({ dmTemplates: arr });
                            }}
                            rows={2}
                            placeholder={`DM ${i + 1}...`}
                            className="flex-1 px-3 py-2 rounded-lg bg-surface-variant text-on-surface text-xs outline-none focus:ring-2 ring-primary/40 resize-none"
                          />
                          {form.dmTemplates.length > 1 && (
                            <button onClick={() => up({ dmTemplates: form.dmTemplates.filter((_, j) => j !== i) })} className="text-on-surface-variant hover:text-error self-start p-1 mt-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => up({ dmTemplates: [...form.dmTemplates, ''] })} className="text-xs text-primary hover:underline">
                        + Shablon qo'shish
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
                      {form.dmAgentId === -1 && (
                        <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                          <span className="text-sm mt-0.5">⚠️</span>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Hali birorta AI agent yaratilmagan.{' '}
                            <a href="/agents" className="font-semibold underline hover:no-underline">
                              Agent yaratish →
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
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Postlar */}
          <Card title="Postlar" desc="Bu avtomatizatsiya qaysi postlarda ishlaydi?">
            <div className="space-y-2 mb-3">
              {[
                { val: 'all', label: 'Barcha postlar', desc: 'Hozirgi va kelajakdagi barcha postlar', Icon: Globe },
                { val: 'specific', label: 'Tanlangan postlar', desc: "Faqat o'zingiz belgilagan postlar", Icon: Hash },
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
                    Postlar topilmadi
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
              onClick={save}
              disabled={!canSave || saving}
              className="w-full py-3.5 rounded-2xl font-medium text-white text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
            >
              <Save size={16} />
              {saving ? 'Saqlanmoqda...' : 'Avtomatizatsiyani saqlash'}
            </button>
            {!form.name.trim() && (
              <p className="text-xs text-on-surface-variant text-center mt-2">Nom kiriting</p>
            )}
            {form.name.trim() && !form.replyEnabled && !form.dmEnabled && (
              <p className="text-xs text-on-surface-variant text-center mt-2">Kamida bitta amal tanlang</p>
            )}
          </div>
        </div>
        </div>{/* /overflow-y-auto */}
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <InstagramRequired>
    <div className="h-full overflow-y-auto bg-background text-on-surface p-6">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Izoh avtomatizatsiyalari</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Postlaringizga kelgan izohlarga avtomatik javob bering
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
          >
            <Plus size={16} />
            Yangi avtomatizatsiya
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface-variant animate-pulse" />
            ))}
          </div>
        ) : automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Zap size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-on-surface mb-2">Hali avtomatizatsiya yo'q</h3>
            <p className="text-on-surface-variant text-sm mb-6 max-w-xs">
              Birinchi avtomatizatsiyangizni yarating va izohlarga avtomatik javob bering
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
            >
              <Plus size={16} /> Avtomatizatsiya yaratish
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map(auto => (
              <div
                key={auto.id}
                className="group bg-surface border border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => router.push(`/automation/comments/${auto.id}`)}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={auto.isActive ? { background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' } : {}}
                >
                  <Zap size={18} className={auto.isActive ? 'text-white' : 'text-on-surface-variant'} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-on-surface truncate">{auto.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      auto.isActive
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {auto.isActive ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {auto.replyEnabled && (
                      <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <MessageSquare size={11} /> Izoh javob
                      </span>
                    )}
                    {auto.dmEnabled && (
                      <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <Send size={11} /> DM
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                      {auto.postScope === 'all' ? <Globe size={11} /> : <Hash size={11} />}
                      {auto.postScope === 'all' ? 'Barcha postlar' : `${auto.postIds.length} ta post`}
                    </span>
                    {auto.triggerType === 'keyword' && auto.keywords.length > 0 && (
                      <span className="text-xs text-on-surface-variant">
                        · {auto.keywords.slice(0, 2).join(', ')}{auto.keywords.length > 2 ? ` +${auto.keywords.length - 2}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => handleToggle(auto.id, e)}
                    role="switch"
                    aria-checked={auto.isActive}
                    style={{
                      width: '36px', height: '20px', borderRadius: '10px', padding: '2px',
                      border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                      backgroundColor: auto.isActive ? '#3B82F6' : '#E5E7EB',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                      transition: 'background-color 0.25s ease',
                      outline: 'none',
                    }}
                  >
                    <span style={{
                      display: 'block', width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      transform: auto.isActive ? 'translateX(16px