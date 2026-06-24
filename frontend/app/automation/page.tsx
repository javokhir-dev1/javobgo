'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Zap, MessageSquare, Send, Globe, Hash } from 'lucide-react';
import {
  getAutomations, createAutomation,
  toggleAutomation, getInstagramPosts, getAgents,
} from '@/lib/api';
import { useInstagramStatus } from '@/context/InstagramContext';
import { useLanguage } from '@/context/LanguageContext';
import { AutomationForm } from '@/components/automation/AutomationForm';
import type { Automation, FormState } from '@/components/automation/types';
import { EMPTY_FORM } from '@/components/automation/types';

export default function AutomationPage() {
  const { t } = useLanguage();
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
    if (!form.name.trim()) { setSaveError(t('automation.form.errName')); return; }
    if (!form.replyEnabled && !form.dmEnabled) { setSaveError(t('automation.form.errAction')); return; }
    const validReply = (form.replyTemplates || []).filter(t => t?.trim());
    const validDm = (form.dmTemplates || []).filter(t => t?.trim());
    if (form.replyEnabled && !form.replyAgentId && validReply.length < 3) { setSaveError(t('automation.form.errReplyTemplate')); return; }
    if (form.dmEnabled && !form.dmAgentId && validDm.length < 3) { setSaveError(t('automation.form.errDmTemplate')); return; }
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

  if (view === 'create') {
    return (
      <AutomationForm
        form={form}
        kwInput={kwInput}
        setKwInput={setKwInput}
        up={up}
        addKw={addKw}
        togglePost={togglePost}
        posts={posts}
        postsLoading={postsLoading}
        agents={agents}
        saving={saving}
        saveError={saveError}
        onSave={save}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-background text-on-surface p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-on-surface">{t('automation.title')}</h1>
              <p className="text-on-surface-variant text-sm mt-1">{t('automation.subtitle')}</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
            >
              <Plus size={16} />
              {t('automation.new')}
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
              <h3 className="text-lg font-semibold text-on-surface mb-2">{t('automation.emptyTitle')}</h3>
              <p className="text-on-surface-variant text-sm mb-6 max-w-xs">{t('automation.emptyDesc')}</p>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
              >
                <Plus size={16} /> {t('automation.createBtn')}
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
                        {auto.isActive ? t('automation.active') : t('automation.inactive')}
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
                        {auto.postScope === 'all' ? t('automation.allPosts') : `${auto.postIds.length} ${t('automation.specificPosts')}`}
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
                        transform: auto.isActive ? 'translateX(16px)' : 'translateX(0)',
                        transition: 'transform 0.25s ease'
                      }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
