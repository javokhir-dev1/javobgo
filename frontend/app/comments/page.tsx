'use client';
import { useEffect, useState } from 'react';
import {
  Plus, Trash2, Edit2, RefreshCw, ChevronDown, ChevronUp,
  MessageSquare, Mail, Tag, X, Check, ToggleLeft, ToggleRight,
  AlertCircle, Shuffle,
} from 'lucide-react';
import Topbar from '@/components/Topbar';
import Toggle from '@/components/Toggle';
import Alert from '@/components/Alert';
import {
  getCommentRules, createCommentRule, updateCommentRule,
  deleteCommentRule, toggleCommentRule, getInstagramPosts,
} from '@/lib/api';

interface Post {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  comments_count?: number;
  like_count?: number;
}

interface CommentRule {
  id: number;
  postId: string;
  postCaption?: string;
  postThumbnail?: string;
  isActive: boolean;
  replyEnabled: boolean;
  replyTemplates: string[];
  keywordsEnabled: boolean;
  keywords: string[];
  dmEnabled: boolean;
  dmTemplates: string[];
  createdAt: string;
}

type Step = 'list' | 'select-post' | 'edit-rule';

const defaultForm = {
  replyEnabled: true,
  replyTemplates: [] as string[],
  keywordsEnabled: false,
  keywords: [] as string[],
  dmEnabled: false,
  dmTemplates: [] as string[],
};

// Variant qo'shish komponenti
function TemplateList({
  label,
  placeholder,
  templates,
  onChange,
}: {
  label: string;
  placeholder: string;
  templates: string[];
  onChange: (v: string[]) => void;
}) {
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
            ? 'Kamida 3 ta variant qo\'shing (spam xavfini kamaytiradi)'
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

export default function CommentsPage() {
  const [rules, setRules] = useState<CommentRule[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [step, setStep] = useState<Step>('list');
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    setLoadingRules(true);
    try {
      const d = await getCommentRules();
      setRules(d.rules || []);
    } finally {
      setLoadingRules(false);
    }
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const d = await getInstagramPosts();
      setPosts(d.posts || []);
    } catch {
      showAlert('error', 'Postlarni yuklashda xato');
    } finally {
      setLoadingPosts(false);
    }
  };

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const openNew = () => {
    setSelectedPost(null);
    setEditingId(null);
    setForm({ ...defaultForm });
    setKeywordInput('');
    setStep('select-post');
    loadPosts();
  };

  const openEdit = (rule: CommentRule) => {
    setEditingId(rule.id);
    setSelectedPost({
      id: rule.postId,
      caption: rule.postCaption,
      thumbnail_url: rule.postThumbnail,
      media_type: 'IMAGE',
      timestamp: rule.createdAt,
    });
    setForm({
      replyEnabled: rule.replyEnabled,
      replyTemplates: rule.replyTemplates?.filter(Boolean) || [],
      keywordsEnabled: rule.keywordsEnabled,
      keywords: rule.keywords?.filter(Boolean) || [],
      dmEnabled: rule.dmEnabled,
      dmTemplates: rule.dmTemplates?.filter(Boolean) || [],
    });
    setKeywordInput('');
    setStep('edit-rule');
  };

  const selectPostForNew = (post: Post) => {
    const existing = rules.find(r => r.postId === post.id);
    if (existing) { showAlert('error', 'Bu post uchun qoida allaqachon mavjud'); return; }
    setSelectedPost(post);
    setForm({ ...defaultForm });
    setStep('edit-rule');
  };

  const save = async () => {
    if (!selectedPost) return;

    // Validatsiya: variantlar tekshiruvi
    if (form.replyEnabled && form.replyTemplates.filter(Boolean).length < 3) {
      showAlert('error', 'Spam xavfini kamaytirish uchun kamida 3 ta komment javob varianti kerak');
      return;
    }
    if (form.dmEnabled && form.dmTemplates.filter(Boolean).length < 3) {
      showAlert('error', 'Spam xavfini kamaytirish uchun kamida 3 ta DM varianti kerak');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        replyTemplates: form.replyTemplates.filter(Boolean),
        dmTemplates: form.dmTemplates.filter(Boolean),
        keywords: form.keywords.filter(Boolean),
      };
      if (editingId) {
        await updateCommentRule(editingId, payload);
        showAlert('success', 'Qoida yangilandi');
      } else {
        await createCommentRule({
          postId: selectedPost.id,
          postCaption: selectedPost.caption,
          postThumbnail: selectedPost.thumbnail_url || (selectedPost as any).media_url,
          ...payload,
        });
        showAlert('success', 'Yangi qoida qo\'shildi');
      }
      await loadRules();
      setStep('list');
    } catch {
      showAlert('error', 'Saqlashda xato');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: number) => {
    if (!confirm('Bu qoidani o\'chirmoqchimisiz?')) return;
    try {
      await deleteCommentRule(id);
      setRules(r => r.filter(x => x.id !== id));
      showAlert('success', 'Qoida o\'chirildi');
    } catch { showAlert('error', 'O\'chirishda xato'); }
  };

  const toggle = async (id: number) => {
    try {
      const d = await toggleCommentRule(id);
      setRules(r => r.map(x => x.id === id ? d.rule : x));
    } catch { showAlert('error', 'Xato yuz berdi'); }
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !form.keywords.includes(kw)) setForm(f => ({ ...f, keywords: [...f.keywords, kw] }));
    setKeywordInput('');
  };

  const truncate = (text?: string, n = 70) =>
    !text ? 'Caption yo\'q' : text.length > n ? text.slice(0, n) + '...' : text;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });

  // -------- LIST --------
  if (step === 'list') {
    return (
      <>
        <Topbar title="Post avto javob" subtitle="Har bir post uchun alohida sozlamalar" />
        <div className="p-7 max-w-3xl space-y-4">
          {alert && <Alert type={alert.type} message={alert.msg} />}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">{rules.length} ta qoida</div>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-colors">
              <Plus size={15} /> Yangi qo'shish
            </button>
          </div>

          {loadingRules ? (
            <div className="text-center py-16 text-sm text-gray-400">Yuklanmoqda...</div>
          ) : rules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <MessageSquare size={32} className="text-gray-200 mx-auto mb-3" />
              <div className="text-sm font-semibold text-gray-500 mb-1">Qoidalar yo'q</div>
              <div className="text-xs text-gray-400 mb-4">Har bir post uchun alohida qoida qo'shing</div>
              <button onClick={openNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-colors">
                <Plus size={14} /> Yangi qo'shish
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => {
                const expanded = expandedId === rule.id;
                const replyCount = rule.replyTemplates?.filter(Boolean).length || 0;
                const dmCount = rule.dmTemplates?.filter(Boolean).length || 0;
                return (
                  <div key={rule.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        {rule.postThumbnail ? (
                          <img src={rule.postThumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MessageSquare size={16} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-700 truncate">{truncate(rule.postCaption)}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {rule.replyEnabled && replyCount > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                              {replyCount} javob varianti
                            </span>
                          )}
                          {rule.replyEnabled && replyCount === 0 && (
                            <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle size={10} /> Variant yo'q
                            </span>
                          )}
                          {rule.keywordsEnabled && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                              Kalit so'z
                            </span>
                          )}
                          {rule.dmEnabled && dmCount > 0 && (
                            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                              {dmCount} DM varianti
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggle(rule.id)}
                          className={`p-1.5 rounded-lg transition-colors ${rule.isActive ? 'text-accent hover:bg-accent-light' : 'text-gray-300 hover:bg-gray-50'}`}>
                          {rule.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button onClick={() => openEdit(rule)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => deleteRule(rule.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                        <button onClick={() => setExpandedId(expanded ? null : rule.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors">
                          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3 text-sm">
                        {replyCount > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Komment javob variantlari ({replyCount})
                            </span>
                            <div className="mt-1.5 space-y-1.5">
                              {rule.replyTemplates.filter(Boolean).map((t, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                  <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5 flex-1">{t}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {rule.keywordsEnabled && rule.keywords?.filter(Boolean).length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kalit so'zlar</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {rule.keywords.filter(Boolean).map(kw => (
                                <span key={kw} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {rule.dmEnabled && dmCount > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              DM variantlari ({dmCount})
                            </span>
                            <div className="mt-1.5 space-y-1.5">
                              {rule.dmTemplates.filter(Boolean).map((t, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                  <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5 flex-1">{t}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  // -------- SELECT POST --------
  if (step === 'select-post') {
    const usedPostIds = new Set(rules.map(r => r.postId));
    return (
      <>
        <Topbar title="Post tanlash" subtitle="Qoida qo'shmoqchi bo'lgan postni tanlang" />
        <div className="p-7 max-w-3xl space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('list')} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Bekor qilish
            </button>
            <button onClick={loadPosts} disabled={loadingPosts}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500">
              <RefreshCw size={12} className={loadingPosts ? 'animate-spin' : ''} /> Yangilash
            </button>
          </div>

          {loadingPosts ? (
            <div className="text-center py-16 text-sm text-gray-400">Postlar yuklanmoqda...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">Postlar topilmadi</div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => {
                const thumb = post.thumbnail_url || post.media_url;
                const alreadyUsed = usedPostIds.has(post.id);
                return (
                  <button key={post.id} onClick={() => !alreadyUsed && selectPostForNew(post)}
                    disabled={alreadyUsed}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[1.5px] transition-all text-left ${
                      alreadyUsed
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-100 bg-white hover:border-accent hover:bg-accent-light/20'
                    }`}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                      {thumb
                        ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><MessageSquare size={16} className="text-gray-400" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700 truncate">{truncate(post.caption)}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{formatDate(post.timestamp)}</span>
                        <span>{post.comments_count ?? 0} komment</span>
                        <span>{post.like_count ?? 0} like</span>
                      </div>
                    </div>
                    {alreadyUsed && <span className="text-xs text-gray-400 flex-shrink-0">Qoida bor</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  // -------- EDIT RULE --------
  return (
    <>
      <Topbar
        title={editingId ? 'Qoidani tahrirlash' : 'Yangi qoida'}
        subtitle={selectedPost ? truncate(selectedPost.caption, 50) : ''}
      />
      <div className="p-7 max-w-2xl space-y-5">
        {alert && <Alert type={alert.type} message={alert.msg} />}

        {/* Post preview */}
        {selectedPost && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
              {selectedPost.thumbnail_url || (selectedPost as any).media_url ? (
                <img src={selectedPost.thumbnail_url || (selectedPost as any).media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><MessageSquare size={16} className="text-gray-300" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-500 mb-0.5">Tanlangan post</div>
              <div className="text-sm text-gray-700 truncate">{truncate(selectedPost.caption)}</div>
            </div>
          </div>
        )}

        {/* Kommentga javob */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">Kommentga javob</span>
          </div>
          <Toggle
            checked={form.replyEnabled}
            onChange={v => setForm(f => ({ ...f, replyEnabled: v }))}
            label="Kommentga avtomatik javob berish"
          />
          {form.replyEnabled && (
            <TemplateList
              label="Javob variantlari"
              placeholder="Variant yozing... (Ctrl+Enter — qo'shish)"
              templates={form.replyTemplates}
              onChange={v => setForm(f => ({ ...f, replyTemplates: v }))}
            />
          )}
        </div>

        {/* Kalit so'z filtri */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">Kalit so'z filtri</span>
          </div>
          <Toggle
            checked={form.keywordsEnabled}
            onChange={v => setForm(f => ({ ...f, keywordsEnabled: v }))}
            label="Faqat kalit so'zli kommentlarga javob berish"
          />
          {form.keywordsEnabled && (
            <div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                  placeholder="Kalit so'z kiriting va Enter bosing"
                  className="flex-1 px-3 py-2 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent bg-gray-50 focus:bg-white transition-colors"
                />
                <button onClick={addKeyword}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-xl hover:bg-accent-dark transition-colors">
                  <Plus size={15} />
                </button>
              </div>
              {form.keywords.filter(Boolean).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.keywords.filter(Boolean).map(kw => (
                    <span key={kw} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">
                      {kw}
                      <button onClick={() => setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }))}
                        className="hover:text-red-500 transition-colors"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Hali kalit so'z qo'shilmagan</p>
              )}
            </div>
          )}
        </div>

        {/* DM */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">Kommentdan DM yuborish</span>
          </div>
          <Toggle
            checked={form.dmEnabled}
            onChange={v => setForm(f => ({ ...f, dmEnabled: v }))}
            label="Komment qoldirganlarga DM yuborish"
          />
          {form.dmEnabled && (
            <TemplateList
              label="DM variantlari"
              placeholder="DM varianti yozing... (Ctrl+Enter — qo'shish)"
              templates={form.dmTemplates}
              onChange={v => setForm(f => ({ ...f, dmTemplates: v }))}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pb-4">
          <button onClick={() => setStep('list')}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Bekor qilish
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60">
            <Check size={15} /> {saving ? 'Saqlanmoqda...' : editingId ? 'Yangilash' : 'Saqlash'}
          </button>
        </div>
      </div>
    </>
  );
}
