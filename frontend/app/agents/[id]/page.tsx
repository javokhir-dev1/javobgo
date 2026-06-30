'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, Bot, Trash2, Copy, Check,
  FileText, Upload, X, File, Loader2,
} from 'lucide-react';
import {
  getAgent, streamChatWithAgent, getAgentMessages, saveAgentMessage, clearAgentMessages,
  getAgentDocuments, uploadAgentDocument, deleteAgentDocument,
} from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { AgentAvatar } from '@/components/ui/AgentAvatar';

function CopyButton({ text }: { text: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1 rounded-md hover:bg-surface-container-high"
    >
      {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
      {copied ? t('agents.chat.copied') : t('agents.chat.copy')}
    </button>
  );
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined)      parts.push(<strong key={m.index} className="font-semibold">{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4] !== undefined) parts.push(
      <code key={m.index} className="bg-surface-container-high text-on-surface rounded px-1 py-0.5 text-[13px] font-mono">
        {m[4]}
      </code>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^`{3,}/.test(line)) {
      const code: string[] = [];
      const fence = line.match(/^(`{3,})/)?.[1] ?? '```';
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) { code.push(lines[i]); i++; }
      const codeText = code.join('\n');
      nodes.push(
        <div key={i} className="my-2 rounded-lg border border-outline-variant/20 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container border-b border-outline-variant/20">
            <span className="text-[11px] text-on-surface-variant font-mono">{line.slice(3).trim() || 'code'}</span>
            <CopyButton text={codeText} />
          </div>
          <pre className="bg-surface-container-high text-on-surface p-3 text-[12px] font-mono overflow-x-auto whitespace-pre-wrap">
            {codeText}
          </pre>
        </div>
      );
    } else if (/^#{4,} /.test(line)) {
      const lvl = line.match(/^(#+) /)?.[1].length ?? 4;
      nodes.push(<p key={i} className="font-semibold text-[13px] mt-1.5">{parseInline(line.slice(lvl + 1))}</p>);
    } else if (/^### /.test(line)) {
      nodes.push(<p key={i} className="font-semibold text-[14px] mt-2">{parseInline(line.slice(4))}</p>);
    } else if (/^## /.test(line)) {
      nodes.push(<p key={i} className="font-bold text-[15px] mt-2">{parseInline(line.slice(3))}</p>);
    } else if (/^# /.test(line)) {
      nodes.push(<p key={i} className="font-bold text-[17px] mt-2">{parseInline(line.slice(2))}</p>);
    } else if (/^[*-] /.test(line)) {
      nodes.push(
        <div key={i} className="flex gap-2">
          <span className="text-primary shrink-0 mt-0.5">•</span>
          <span>{parseInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\. /.test(line)) {
      const m = line.match(/^(\d+)\. (.*)/);
      if (m) nodes.push(
        <div key={i} className="flex gap-2">
          <span className="text-primary font-medium shrink-0">{m[1]}.</span>
          <span>{parseInline(m[2])}</span>
        </div>
      );
    } else if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-outline-variant/30 my-1" />);
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-1.5" />);
    } else {
      nodes.push(<p key={i} className="leading-relaxed">{parseInline(line)}</p>);
    }
    i++;
  }
  return <div className="space-y-0.5 text-[14px]">{nodes}</div>;
}

function fileColor(type: string): string {
  const map: Record<string, string> = {
    pdf: 'text-red-400', docx: 'text-blue-400', doc: 'text-blue-400',
    xlsx: 'text-green-400', xls: 'text-green-400',
    pptx: 'text-orange-400', txt: 'text-on-surface-variant',
    csv: 'text-emerald-400', md: 'text-purple-400',
  };
  return map[type] ?? 'text-on-surface-variant';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface DocItem { id: number; originalName: string; fileType: string; fileSize: number; createdAt: string; }

function DocumentsPanel({ agentId, onClose }: { agentId: number; onClose: () => void }) {
  const [docs, setDocs]           = useState<DocItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const inputRef                  = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    getAgentDocuments(agentId).then(setDocs).catch(() => {});
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        await uploadAgentDocument(agentId, file);
      }
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Yuklashda xatolik');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (docId: number) => {
    await deleteAgentDocument(agentId, docId).catch(() => {});
    setDocs(prev => prev.filter(d => d.id !== docId));
  };

  return (
    <div className="absolute inset-0 z-20 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-80 h-full bg-surface-container border-l border-outline-variant/30 flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <span className="text-[14px] font-semibold text-on-surface">Hujjatlar</span>
            {docs.length > 0 && (
              <span className="text-[11px] text-on-surface-variant bg-surface-container-high rounded-full px-2 py-0.5">
                {docs.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3 shrink-0">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !uploading && inputRef.current?.click()}
            className="border-2 border-dashed border-outline-variant/40 hover:border-primary/50 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors group"
          >
            {uploading
              ? <Loader2 size={20} className="text-primary animate-spin" />
              : <Upload size={20} className="text-on-surface-variant group-hover:text-primary transition-colors" />}
            <p className="text-[12px] text-on-surface-variant text-center">
              {uploading ? 'Yuklanmoqda...' : 'Fayl tanlang yoki bu yerga tashlang'}
            </p>
            <p className="text-[11px] text-on-surface-variant/50 text-center">
              PDF · DOCX · XLSX · PPTX · TXT · CSV · Max 20MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.xls,.pptx,.txt,.csv,.md"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {error && <p className="mt-2 text-[12px] text-error">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-center opacity-50">
              <FileText size={24} className="text-on-surface-variant mb-1" />
              <p className="text-[12px] text-on-surface-variant">Hujjatlar yo'q</p>
            </div>
          ) : docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 group">
              <File size={14} className={`shrink-0 ${fileColor(doc.fileType)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-on-surface truncate">{doc.originalName}</p>
                <p className="text-[11px] text-on-surface-variant">{formatBytes(doc.fileSize)}</p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error/10 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-outline-variant/20 shrink-0">
          <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
            Yuklangan hujjatlar AI ga bilim bazasi sifatida uzatiladi — agent shu ma'lumotlar asosida aniqroq javob beradi.
          </p>
        </div>
      </div>
    </div>
  );
}

interface Message { role: 'user' | 'model'; text: string; }
interface Agent   { id: number; name: string; description: string; systemPrompt: string; emoji: string; }

export default function AgentChatPage() {
  const { t } = useLanguage();
  const { id }                      = useParams<{ id: string }>();
  const router                      = useRouter();
  const [agent, setAgent]           = useState<Agent | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [typing, setTyping]         = useState(false);
  const [showDocs, setShowDocs]     = useState(false);
  const [docCount, setDocCount]     = useState(0);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLTextAreaElement>(null);

  const refreshDocCount = useCallback(() => {
    getAgentDocuments(+id).then((docs: any[]) => setDocCount(docs.length)).catch(() => {});
  }, [id]);

  useEffect(() => {
    getAgent(+id).then(setAgent).catch(() => router.push('/agents'));
    getAgentMessages(+id).then((msgs: Message[]) => setMessages(msgs)).catch(() => {});
    refreshDocCount();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setTyping(true);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'model', text: '' }]);
    setTyping(false);
    await saveAgentMessage(+id, 'user', text).catch(() => {});

    try {
      let fullResponse = '';
      await streamChatWithAgent(+id, newMessages, (chunk) => {
        fullResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'model') updated[updated.length - 1] = { ...last, text: last.text + chunk };
          return updated;
        });
      });
      if (fullResponse) await saveAgentMessage(+id, 'model', fullResponse).catch(() => {});
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'model', text: t('agents.chat.error') };
        return updated;
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!agent) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden px-6 pt-4 pb-6 gap-3 bg-surface-container-low">

      <header className="shrink-0 flex items-center justify-between px-4 py-3 rounded-2xl border border-outline-variant/30 shadow-sm bg-surface-container backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/agents')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden shrink-0">
            <AgentAvatar value={agent.emoji} className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-on-surface leading-tight">{agent.name}</p>
            {agent.description && (
              <p className="text-[12px] text-on-surface-variant truncate">{agent.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowDocs(v => !v)}
            title="Hujjatlar"
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showDocs
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <FileText size={18} />
            {docCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {docCount > 9 ? '9+' : docCount}
              </span>
            )}
          </button>

          <button
            onClick={async () => {
              if (!confirm(t('agents.chat.clearConfirm'))) return;
              await clearAgentMessages(+id);
              setMessages([]);
            }}
            title={t('agents.chat.clearHistory')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm bg-surface-container backdrop-blur-xl relative">

        {showDocs && (
          <DocumentsPanel
            agentId={+id}
            onClose={() => {
              setShowDocs(false);
              refreshDocCount();
            }}
          />
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-xs mx-auto gap-3 opacity-80">
              <div className="w-20 h-20 rounded-2xl bg-primary-fixed shadow-sm flex items-center justify-center overflow-hidden mb-1">
                <AgentAvatar value={agent.emoji} className="w-16 h-16" />
              </div>
              <h2 className="text-[22px] font-semibold text-on-surface">{agent.name}</h2>
              <p className="text-[15px] text-on-surface-variant">{t('agents.chat.startChat')}</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3">
              {messages.map((msg, i) => msg.role === 'model' && msg.text === '' ? null : (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5`}>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                      <AgentAvatar value={agent.emoji} className="w-7 h-7" />
                    </div>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl leading-relaxed ${
                    msg.role === 'user'
                      ? 'max-w-[72%] bg-primary text-white rounded-br-sm text-[14px] whitespace-pre-wrap'
                      : 'flex-1 bg-surface-container-low border border-outline-variant/20 text-on-surface rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.role === 'user' ? msg.text : <MarkdownText text={msg.text} />}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {loading && messages.at(-1)?.role === 'model' && messages.at(-1)?.text === '' && (
                <div className="flex justify-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden shrink-0">
                    <AgentAvatar value={agent.emoji} className="w-7 h-7" />
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 px-6 pb-6 pt-2 bg-gradient-to-t from-surface-container via-surface-container to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center rounded-2xl px-4 py-2 border border-outline-variant/40 shadow-sm transition-all duration-300 focus-within:border-primary/40 bg-surface-container-low backdrop-blur-xl">
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={input}
                rows={1}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyDown={handleKey}
                placeholder={t('agents.chat.placeholder')}
                disabled={loading}
                autoFocus
                className="flex-1 bg-transparent text-[15px] text-on-surface placeholder:text-on-surface-variant/50 outline-none disabled:opacity-50 ml-2 resize-none overflow-y-auto leading-6 py-2"
                style={{ maxHeight: '160px' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary ml-2 hover:bg-primary-fixed/80 transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="hidden md:block text-center mt-2.5 text-[11px] text-on-surface-variant/40 tracking-wide">
              {t('agents.chat.sendHint')}
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
