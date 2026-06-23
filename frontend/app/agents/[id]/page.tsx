'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Bot, Trash2, Copy, Check } from 'lucide-react';
import { getAgent, streamChatWithAgent, getAgentMessages, saveAgentMessage, clearAgentMessages } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
function AgentAvatar({ value, className = 'w-8 h-8' }: { value: string; className?: string }) {
  if (value?.startsWith('dicebear:')) {
    const seed = value.split(':')[2] || 'Felix';
    return <img src={avatarUrl(seed)} className={className} alt="avatar" />;
  }
  return <span className="text-2xl leading-none">{value}</span>;
}

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

/* ─── Lightweight Markdown renderer ─── */
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

interface Message { role: 'user' | 'model'; text: string; }
interface Agent   { id: number; name: string; description: string; systemPrompt: string; emoji: string; }

export default function AgentChatPage() {
  const { t } = useLanguage();
  const { id }                  = useParams<{ id: string }>();
  const router                  = useRouter();
  const [agent, setAgent]       = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [typing, setTyping]     = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getAgent(+id).then(setAgent).catch(() => router.push('/agents'));
    getAgentMessages(+id).then((msgs: Message[]) => setMessages(msgs)).catch(() => {});
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
    // User xabarini DB ga saqlaymiz
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
      // AI javobini DB ga saqlaymiz
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

      {/* Top App Bar */}
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
      </header>

      {/* Main chat container */}
      <main className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm bg-surface-container backdrop-blur-xl relative">

        {/* Messages */}
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

              {/* Typing dots */}
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

        {/* Input area */}
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
            <p className="text-center mt-2.5 text-[11px] text-on-surface-variant/40 tracking-wide">
              {t('agents.chat.sendHint')}
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
