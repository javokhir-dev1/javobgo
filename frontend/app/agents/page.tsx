'use client';
import InstagramRequired from '@/components/InstagramRequired';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Plus, ArrowRight, Trash2, X, Pencil } from 'lucide-react';
import { getAgents, createAgent, updateAgent, deleteAgent } from '@/lib/api';
import { useInstagramStatus } from '@/context/InstagramContext';
import { useLanguage } from '@/context/LanguageContext';

interface Agent {
  id: number;
  name: string;
  description: string;
  systemPrompt: string;
  emoji: string;
  createdAt: string;
}

// DiceBear avatar seeds — bottts uslubi (robotlar)
const AVATARS = [
  'Felix', 'Jasmine', 'Max', 'Luna', 'Atlas',
  'Nova', 'Sage', 'Ember', 'Pixel', 'Bolt',
  'Spark', 'Echo', 'Orion', 'Zara', 'Kai',
];

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export function AgentAvatar({ value, className = 'w-10 h-10' }: { value: string; className?: string }) {
  if (value?.startsWith('dicebear:')) {
    const seed = value.split(':')[2] || 'Felix';
    return <img src={avatarUrl(seed)} className={className} alt="avatar" />;
  }
  return <span className="text-2xl leading-none">{value}</span>;
}

export default function AgentsPage() {
  const connected = useInstagramStatus();
  const { t } = useLanguage();
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [saving, setSaving]     = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = promptRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 320) + 'px';
  };
  const [form, setForm]         = useState({ name: '', description: '', systemPrompt: '', emoji: 'dicebear:bottts:Felix'});

  const load = () => {
    setLoading(true);
    getAgents()
      .then(d => setAgents(Array.isArray(d) ? d : []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (connected !== false) load(); }, [connected]);

  const openCreate = () => {
    setEditAgent(null);
    setForm({ name: '', description: '', systemPrompt: '', emoji: 'dicebear:bottts:Felix' });
    setShowModal(true);
  };

  const openEdit = (agent: Agent, e: React.MouseEvent) => {
    e.preventDefault();
    setEditAgent(agent);
    setForm({ name: agent.name, description: agent.description, systemPrompt: agent.systemPrompt, emoji: agent.emoji });
    setShowModal(true);
    setTimeout(autoResize, 50);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    setSaving(true);
    try {
      if (editAgent) {
        await updateAgent(editAgent.id, form);
      } else {
        await createAgent(form);
      }
      setShowModal(false);
      setEditAgent(null);
      setForm({ name: '', description: '', systemPrompt: '', emoji: 'dicebear:bottts:Felix' });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(t('agents.confirmDelete'))) return;
    await deleteAgent(id);
    load();
  };

  return (
    <InstagramRequired>
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">

          <header className="mb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Bot size={28} className="text-primary" />
                <h2 className="text-[28px] font-semibold text-on-surface tracking-tight">{t('agents.title')}</h2>
              </div>
              <p className="text-[15px] text-on-surface-variant">
                {t('agents.subtitle')}
              </p>
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[14px] font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              <Plus size={18} /> {t('agents.newBtn')}
            </button>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-surface-container mb-4" />
                  <div className="h-5 w-32 bg-surface-container rounded mb-2" />
                  <div className="h-4 w-48 bg-surface-container rounded" />
                </div>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant">
              <Bot size={48} className="mb-4 opacity-30" />
              <p className="text-[16px] font-medium mb-1">{t('agents.emptyTitle')}</p>
              <p className="text-[14px] opacity-60 mb-6">{t('agents.emptyDesc')}</p>
              <button onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[14px] font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                <Plus size={17} /> {t('agents.createBtn')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {agents.map(agent => (
                <Link key={agent.id} href={`/agents/${agent.id}`}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:border-primary/20 transition-all duration-300 group cursor-pointer relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-fixed dark:bg-primary/20 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                      <AgentAvatar value={agent.emoji} className="w-10 h-10" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={e => openEdit(agent, e)}
                        className="p-1.5 rounded-lg text-outline-variant hover:text-primary hover:bg-primary/10 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={e => handleDelete(agent.id, e)}
                        className="p-1.5 rounded-lg text-outline-variant hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                        <Trash2 size={15} />
                      </button>
                      <ArrowRight size={18} className="text-outline-variant group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </div>
                  <h3 className="text-[17px] font-semibold text-on-surface mb-1.5">{agent.name}</h3>
                  <p className="text-[14px] text-on-surface-variant leading-[22px] flex-1">
                    {agent.description || t('agents.noDescription')}
                  </p>
                  <div className="mt-4 pt-4 border-t border-outline-variant/30">
                    <span className="text-[12px] text-on-surface-variant/60">
                      {new Date(agent.createdAt).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditAgent(null); }} />
          <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h3 className="text-[18px] font-semibold text-on-surface">
                {editAgent ? t('agents.form.editTitle') : t('agents.form.createTitle')}
              </h3>
              <button onClick={() => { setShowModal(false); setEditAgent(null); }} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              {/* Avatar tanlash */}
              <div className="mb-5">
                <label className="block text-[13px] font-medium text-on-surface-variant mb-2">{t('agents.form.avatarLabel')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map(seed => {
                    const val = `dicebear:bottts:${seed}`;
                    const selected = form.emoji === val;
                    return (
                      <button
                        key={seed}
                        onClick={() => setForm(f => ({ ...f, emoji: val }))}
                        className={`w-full aspect-square rounded-xl p-1.5 transition-all ${
                          selected
                            ? 'bg-primary/15 ring-2 ring-primary'
                            : 'bg-surface-container hover:bg-surface-container-high'
                        }`}
                      >
                        <img src={avatarUrl(seed)} alt={seed} className="w-full h-full" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5">{t('agents.form.nameLabel')}</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t('agents.form.namePlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5">{t('agents.form.descLabel')}</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t('agents.form.descPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5">{t('agents.form.promptLabel')}</label>
                  <p className="text-[12px] text-on-surface-variant/60 mb-2">{t('agents.form.promptDesc')}</p>
                  <textarea
                    ref={promptRef}
                    value={form.systemPrompt}
                    onChange={e => { setForm(f => ({ ...f, systemPrompt: e.target.value })); autoResize(); }}
                    onFocus={autoResize}
                    rows={4}
                    placeholder={t('agents.form.promptPlaceholder')}
                    style={{ minHeight: '96px', maxHeight: '280px', overflowY: 'auto' }}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors resize-none" />
                </div>
              </div>
            </div>

            {/* Footer — always visible */}
            <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20 flex-shrink-0">
              <button onClick={() => { setShowModal(false); setEditAgent(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant/50 text-[14px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                {t('agents.form.cancel')}
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.systemPrompt.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? t('agents.form.saving') : editAgent ? t('agents.form.save') : t('agents.form.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </InstagramRequired>
  );
}
