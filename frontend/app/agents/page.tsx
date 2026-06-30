'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bot, Plus, ArrowRight, Trash2, X, Pencil, FileText, Upload, File, Loader2 } from 'lucide-react';
import { getAgents, createAgent, updateAgent, deleteAgent, getAgentDocuments, uploadAgentDocument, deleteAgentDocument } from '@/lib/api';
import { useInstagramStatus } from '@/context/InstagramContext';
import { useLanguage } from '@/context/LanguageContext';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Agent {
  id: number;
  name: string;
  description: string;
  systemPrompt: string;
  emoji: string;
  createdAt: string;
}

// Serverdan kelgan hujjat
interface DocItem { id: number; originalName: string; fileType: string; fileSize: number; }
// Hali yuklanmagan (yangi agent uchun pending)
interface PendingFile { key: string; file: File; }

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

const AVATARS = [
  'Felix', 'Jasmine', 'Max', 'Luna', 'Atlas',
  'Nova', 'Sage', 'Ember', 'Pixel', 'Bolt',
  'Spark', 'Echo', 'Orion', 'Zara', 'Kai',
];

function fileColor(type: string) {
  const map: Record<string, string> = {
    pdf: 'text-red-400', docx: 'text-blue-400', doc: 'text-blue-400',
    xlsx: 'text-green-400', xls: 'text-green-400',
    pptx: 'text-orange-400', txt: 'text-on-surface-variant',
    csv: 'text-emerald-400', md: 'text-purple-400',
  };
  return map[type] ?? 'text-on-surface-variant';
}

function fileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? 'txt';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function AgentsPage() {
  const connected = useInstagramStatus();
  const { t } = useLanguage();
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ name: '', description: '', systemPrompt: '', emoji: 'dicebear:bottts:Felix' });
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);
  const promptRef                 = useRef<HTMLTextAreaElement>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  // Serverda saqlangan hujjatlar (edit rejimi)
  const [savedDocs, setSavedDocs]       = useState<DocItem[]>([]);
  const [docsLoading, setDocsLoading]   = useState(false);
  // Hali yuklanmagan fayllar (har ikki rejimda ham)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [docError, setDocError]         = useState('');

  const autoResize = () => {
    const el = promptRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 280) + 'px';
  };

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
    setSavedDocs([]);
    setPendingFiles([]);
    setDocError('');
    setShowModal(true);
  };

  const openEdit = (agent: Agent, e: React.MouseEvent) => {
    e.preventDefault();
    setEditAgent(agent);
    setForm({ name: agent.name, description: agent.description, systemPrompt: agent.systemPrompt, emoji: agent.emoji });
    setSavedDocs([]);
    setPendingFiles([]);
    setDocError('');
    setShowModal(true);
    setTimeout(autoResize, 50);
    setDocsLoading(true);
    getAgentDocuments(agent.id)
      .then(d => setSavedDocs(Array.isArray(d) ? d : []))
      .catch(() => setSavedDocs([]))
      .finally(() => setDocsLoading(false));
  };

  const closeModal = () => {
    setShowModal(false);
    setEditAgent(null);
    setSavedDocs([]);
    setPendingFiles([]);
    setDocError('');
  };

  // Fayl tanlanganda — faqat local state ga qo'shamiz (hali yuklamaymiz)
  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    const newItems: PendingFile[] = Array.from(files).map(f => ({
      key: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
    }));
    setPendingFiles(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePending = (key: string) => {
    setPendingFiles(prev => prev.filter(p => p.key !== key));
  };

  const removeSaved = async (docId: number) => {
    if (!editAgent) return;
    await deleteAgentDocument(editAgent.id, docId).catch(() => {});
    setSavedDocs(prev => prev.filter(d => d.id !== docId));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    setSaving(true);
    setDocError('');
    try {
      let agentId: number;
      if (editAgent) {
        await updateAgent(editAgent.id, form);
        agentId = editAgent.id;
      } else {
        const created = await createAgent(form);
        agentId = created.id;
      }

      // Pending fayllarni yuklaymiz
      if (pendingFiles.length > 0) {
        setUploading(true);
        try {
          for (const { file } of pendingFiles) {
            await uploadAgentDocument(agentId, file);
          }
        } catch (e: any) {
          setDocError(e?.response?.data?.message ?? 'Ba\'zi fayllar yuklanmadi');
          setUploading(false);
          setSaving(false);
          return;
        }
        setUploading(false);
      }

      closeModal();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (agent: Agent, e: React.MouseEvent) => {
    e.preventDefault();
    setConfirmDelete(agent);
  };

  const confirmDoDelete = async () => {
    if (!confirmDelete) return;
    await deleteAgent(confirmDelete.id);
    setConfirmDelete(null);
    load();
  };

  const totalDocs = savedDocs.length + pendingFiles.length;
  const isBusy = saving || uploading;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConfirmDialog
        open={!!confirmDelete}
        title="Agentni o'chirish"
        message={`"${confirmDelete?.name}" agenti va uning barcha ma'lumotlari o'chirib yuboriladi.`}
        confirmLabel="O'chirish"
        cancelLabel="Bekor qilish"
        onConfirm={confirmDoDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          <header className="mb-8 flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Bot size={24} className="text-primary sm:w-7 sm:h-7" />
                <h2 className="text-[20px] sm:text-[28px] font-semibold text-on-surface tracking-tight truncate">{t('agents.title')}</h2>
              </div>
              <p className="text-[12px] sm:text-[15px] text-on-surface-variant truncate">{t('agents.subtitle')}</p>
            </div>
            <button onClick={openCreate}
              className="shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-primary text-white text-[13px] sm:text-[14px] font-semibold rounded-xl hover:bg-primary/90 transition-colors">
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> <span>{t('agents.newBtn')}</span>
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
                        className="p-2 rounded-xl bg-surface hover:bg-surface-variant border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all shadow-sm">
                        <Pencil size={15} />
                      </button>
                      <button onClick={e => handleDelete(agent, e)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h3 className="text-[18px] font-semibold text-on-surface">
                {editAgent ? t('agents.form.editTitle') : t('agents.form.createTitle')}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">

              {/* Avatar */}
              <div>
                <label className="block text-[13px] font-medium text-on-surface-variant mb-2">{t('agents.form.avatarLabel')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map(seed => {
                    const val = `dicebear:bottts:${seed}`;
                    const selected = form.emoji === val;
                    return (
                      <button key={seed} onClick={() => setForm(f => ({ ...f, emoji: val }))}
                        className={`w-full aspect-square rounded-xl p-1.5 transition-all ${selected ? 'bg-primary/15 ring-2 ring-primary' : 'bg-surface-container hover:bg-surface-container-high'}`}>
                        <img src={avatarUrl(seed)} alt={seed} className="w-full h-full" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5">{t('agents.form.nameLabel')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('agents.form.namePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5">{t('agents.form.descLabel')}</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('agents.form.descPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors" />
              </div>

              {/* System prompt */}
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

              {/* Documents */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} className="text-primary" />
                    <span className="text-[13px] font-medium text-on-surface-variant">Bilim bazasi</span>
                    {totalDocs > 0 && (
                      <span className="text-[11px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{totalDocs}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[12px] text-primary hover:text-primary/70 font-medium transition-colors"
                  >
                    <Upload size={12} /> Fayl qo'shish
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,.xls,.pptx,.txt,.csv,.md"
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files)}
                />

                {docError && <p className="text-[12px] text-error mb-2">{docError}</p>}

                {docsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-[12px] text-on-surface-variant/60">
                    <Loader2 size={13} className="animate-spin" /> Hujjatlar yuklanmoqda...
                  </div>
                ) : totalDocs === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-outline-variant/40 hover:border-primary/40 py-3 text-[12px] text-on-surface-variant/60 hover:text-on-surface-variant transition-colors text-center"
                  >
                    PDF · DOCX · XLSX · PPTX · TXT · CSV &nbsp;·&nbsp; Maks 20MB
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {/* Serverda saqlangan hujjatlar */}
                    {savedDocs.map(doc => (
                      <div key={`saved-${doc.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20">
                        <File size={13} className={`shrink-0 ${fileColor(doc.fileType)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-on-surface truncate">{doc.originalName}</p>
                          <p className="text-[11px] text-on-surface-variant/60">{formatBytes(doc.fileSize)}</p>
                        </div>
                        <button
                          onClick={() => removeSaved(doc.id)}
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Hali yuklanmagan fayllar */}
                    {pendingFiles.map(({ key, file }) => (
                      <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-dashed border-outline-variant/30">
                        <File size={13} className={`shrink-0 ${fileColor(fileExt(file.name))}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-on-surface truncate">{file.name}</p>
                          <p className="text-[11px] text-on-surface-variant/60">{formatBytes(file.size)} · saqlanmagan</p>
                        </div>
                        <button
                          onClick={() => removePending(key)}
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-[12px] text-primary/60 hover:text-primary py-1 text-center transition-colors"
                    >
                      + Yana fayl qo'shish
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20 flex-shrink-0">
              <button onClick={closeModal} disabled={isBusy}
                className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant/50 text-[14px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                {t('agents.form.cancel')}
              </button>
              <button onClick={handleSave} disabled={isBusy || !form.name.trim() || !form.systemPrompt.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {isBusy && <Loader2 size={14} className="animate-spin" />}
                {isBusy
                  ? (uploading ? 'Yuklanmoqda...' : t('agents.form.saving'))
                  : (editAgent ? t('agents.form.save') : t('agents.form.create'))}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
