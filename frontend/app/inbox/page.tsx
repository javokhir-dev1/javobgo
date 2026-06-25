'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, Search, X, RefreshCw, Zap } from 'lucide-react';
import { getConversations, getInboxMessages, sendInboxMessage, getInboxEventsUrl, syncInbox } from '@/lib/api';
import { useInstagramStatus } from '@/context/InstagramContext';
import { useLanguage } from '@/context/LanguageContext';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation, InboxMessage } from '@/components/inbox/types';
import { formatTime } from '@/components/inbox/types';
import { DmSettingsPanel } from '@/components/inbox/DmSettingsPanel';
import { ProfileModal } from '@/components/inbox/ProfileModal';

export default function InboxPage() {
  const { t } = useLanguage();
  const connected = useInstagramStatus();
  const [leftWidth, setLeftWidth]         = useState(320);
  const [rightWidth, setRightWidth]       = useState(288);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected]           = useState<Conversation | null>(null);
  const [messages, setMessages]           = useState<InboxMessage[]>([]);
  const [input, setInput]                 = useState('');
  const [search, setSearch]               = useState('');
  const [sending, setSending]             = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const [profileModal, setProfileModal]   = useState<Conversation | null>(null);
  const [showMobileDmSettings, setShowMobileDmSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // ─── Suhbatlarni yuklash ───
  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { if (connected !== false) loadConversations(); }, [connected, loadConversations]);

  useEffect(() => {
    const savedLeft = localStorage.getItem('inbox_left_width');
    const savedRight = localStorage.getItem('inbox_right_width');
    if (savedLeft) setLeftWidth(Number(savedLeft));
    if (savedRight) setRightWidth(Number(savedRight));
  }, []);

  const startLeftResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const onMouseMove = (ev: MouseEvent) => {
      let w = startWidth + (ev.clientX - startX);
      if (w < 250) w = 250;
      if (w > 600) w = 600;
      setLeftWidth(w);
    };
    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      let w = startWidth + (ev.clientX - startX);
      if (w < 250) w = 250;
      if (w > 600) w = 600;
      localStorage.setItem('inbox_left_width', w.toString());
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startRightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;
    const onMouseMove = (ev: MouseEvent) => {
      let w = startWidth - (ev.clientX - startX);
      if (w < 250) w = 250;
      if (w > 600) w = 600;
      setRightWidth(w);
    };
    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      let w = startWidth - (ev.clientX - startX);
      if (w < 250) w = 250;
      if (w > 600) w = 600;
      localStorage.setItem('inbox_right_width', w.toString());
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ─── SSE — real-time yangilanishlar ───
  useEffect(() => {
    if (connected === false) return;
    const url = getInboxEventsUrl();
    const es = new EventSource(url);

    es.addEventListener('new_message', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const { conversation, message } = payload;

        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === conversation.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...conversation };
            return updated.sort((a, b) =>
              (b.lastMessageTimestampMs ? Number(b.lastMessageTimestampMs) : new Date(b.lastMessageAt || b.updatedAt).getTime()) -
              (a.lastMessageTimestampMs ? Number(a.lastMessageTimestampMs) : new Date(a.lastMessageAt || a.updatedAt).getTime())
            );
          }
          return [conversation, ...prev];
        });

        setSelected(prev => {
          if (prev?.id === message.conversationId) {
            setMessages(msgs => {
              if (msgs.find(m => m.id === message.id)) return msgs;
              return [...msgs, message];
            });
          }
          return prev;
        });
      } catch {}
    });

    return () => { es.close(); };
  }, []);

  // ─── Suhbatni ochish ───
  const openConversation = async (conv: Conversation) => {
    setSelected(conv);
    setMessages([]);
    setLoadingMsgs(true);
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
    );
    try {
      const data = await getInboxMessages(conv.id);
      setMessages(Array.isArray(data) ? data : []);
    } catch {}
    setLoadingMsgs(false);
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncInbox();
      await loadConversations();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Xabar yuborish ───
  const send = async () => {
    if (!selected || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const tempMsg: InboxMessage = {
      id: Date.now(),
      conversationId: selected.id,
      participantIgsid: selected.participantIgsid,
      direction: 'out',
      messageText: text,
      igCreatedAt: new Date().toISOString(),
      timestampMs: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await sendInboxMessage(selected.participantIgsid, text);
      setConversations(prev =>
        prev.map(c => c.id === selected.id
          ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString(), lastMessageTimestampMs: Date.now().toString() }
          : c
        )
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setInput(text);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const filtered = conversations.filter(c =>
    (c.participantUsername || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    
    <div className="h-full flex overflow-hidden bg-surface-container-low">
      {profileModal && (
        <ProfileModal
          igsid={profileModal.participantIgsid}
          conv={profileModal}
          onClose={() => setProfileModal(null)}
        />
      )}

      {/* ── Chap panel ── */}
      <div 
        style={{ '--left-width': `${leftWidth}px` } as React.CSSProperties}
        className={`flex-shrink-0 flex-col bg-surface-container-lowest w-full md:w-[var(--left-width)] ${selected ? 'hidden md:flex' : 'flex'}`}
      >

        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-primary" />
            <h2 className="text-[17px] font-semibold text-on-surface">{t('inbox.chat.title')}</h2>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold leading-none">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobileDmSettings(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
            >
              <Zap size={14} />
              <span className="text-[12px] font-semibold tracking-wide">DM agent yoqish</span>
            </button>
          </div>
        </div>

        {/* Qidiruv */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30">
            <Search size={14} className="text-on-surface-variant flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('inbox.chat.search')}
              className="flex-1 bg-transparent text-[13px] text-on-surface placeholder:text-on-surface-variant/50 outline-none"
            />
          </div>
        </div>

        {/* Suhbatlar */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageCircle size={36} className="text-on-surface-variant/30 mb-3" />
              <p className="text-[14px] text-on-surface-variant">{t('inbox.chat.noMessages')}</p>
              <p className="text-[12px] text-on-surface-variant/60 mt-1">
                {t('inbox.chat.noMessagesDesc')}
              </p>
            </div>
          ) : (
            filtered.map(conv => {
              const isActive = selected?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left border-b border-outline-variant/10 ${
                    isActive
                      ? 'bg-primary/8 border-l-2 border-l-primary'
                      : 'hover:bg-surface-container-low border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0" onClick={e => { e.stopPropagation(); setProfileModal(conv); }}>
                    <Avatar username={conv.participantUsername || conv.participantIgsid} profilePic={conv.participantProfilePic} />
                    {(conv.unreadCount || 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={`text-[14px] truncate ${conv.unreadCount ? 'font-semibold text-on-surface' : 'font-medium text-on-surface'}`}>
                        @{conv.participantUsername || conv.participantIgsid}
                      </span>
                      <span className="text-[11px] text-on-surface-variant flex-shrink-0">
                        {formatTime(conv.lastMessageTimestampMs ? new Date(Number(conv.lastMessageTimestampMs)).toISOString() : conv.lastMessageAt || conv.updatedAt, t)}
                      </span>
                    </div>
                    <p className={`text-[12px] truncate mt-0.5 ${conv.unreadCount ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {conv.lastMessage || t('inbox.chat.noMessageText')}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chap va O'rta o'rtasidagi Resizer */}
      <div
        onMouseDown={startLeftResize}
        className="hidden md:block w-1 cursor-col-resize bg-outline-variant/20 hover:bg-primary active:bg-primary transition-colors shrink-0 z-10"
      />

      {/* ── O'rta panel ── */}
      <div className={`flex-1 flex-col overflow-hidden ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            {/* Chat header */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-outline-variant/30 bg-surface-container">
              <button onClick={() => setSelected(null)} className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-outline-variant/20 mr-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button onClick={() => setProfileModal(selected)} className="rounded-full hover:opacity-80 transition-opacity">
                <Avatar username={selected.participantUsername || selected.participantIgsid} profilePic={selected.participantProfilePic} size={36} />
              </button>
              <div>
                <p className="text-[15px] font-semibold text-on-surface leading-tight">
                  @{selected.participantUsername || selected.participantIgsid}
                </p>
                <p className="text-[12px] text-on-surface-variant">{t('inbox.chat.instagramDm')}</p>
              </div>
            </div>

            {/* Xabarlar */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingMsgs ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
                  <MessageCircle size={40} className="opacity-20 mb-2" />
                  <p className="text-[14px]">{t('inbox.chat.empty')}</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-1.5">
                  {messages.map((msg, i) => {
                    const isOut = msg.direction === 'out';
                    const prevMsg = messages[i - 1];
                    const msgTime = msg.timestampMs ? Number(msg.timestampMs) : new Date(msg.igCreatedAt || msg.createdAt).getTime();
                    const prevTime = prevMsg ? (prevMsg.timestampMs ? Number(prevMsg.timestampMs) : new Date(prevMsg.igCreatedAt || prevMsg.createdAt).getTime()) : 0;
                    const showTime = !prevMsg || msgTime - prevTime > 5 * 60 * 1000;

                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="text-center my-3">
                            <span className="text-[11px] text-on-surface-variant/50 bg-surface-container px-2 py-0.5 rounded-full">
                              {new Date(msgTime).toLocaleString(undefined, {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                                hour12: false,
                              })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed ${
                            isOut
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-surface-container text-on-surface rounded-bl-sm border border-outline-variant/20'
                          }`}>
                            {msg.messageText}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 px-5 py-3 border-t border-outline-variant/30 bg-surface-container">
              <div className="max-w-2xl mx-auto flex items-end gap-2">
                <div className="flex-1 flex items-end rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-2 focus-within:border-primary/40 transition-colors">
                  <textarea
                    ref={inputRef}
                    value={input}
                    rows={1}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={handleKey}
                    placeholder={t('inbox.chat.placeholder')}
                    disabled={sending}
                    className="flex-1 bg-transparent text-[14px] text-on-surface placeholder:text-on-surface-variant/50 outline-none resize-none leading-6 py-1 disabled:opacity-50"
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="hidden md:block text-center mt-1.5 text-[11px] text-on-surface-variant/40">{t('inbox.chat.sendHint')}</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <MessageCircle size={56} className="opacity-15" />
            <p className="text-[16px] font-medium">{t('inbox.chat.selectPrompt')}</p>
            <p className="text-[13px] opacity-60">{t('inbox.chat.selectDesc')}</p>
          </div>
        )}
      </div>

      {/* O'rta va O'ng o'rtasidagi Resizer */}
      <div
        onMouseDown={startRightResize}
        className="hidden md:block w-1 cursor-col-resize bg-outline-variant/20 hover:bg-primary active:bg-primary transition-colors shrink-0 z-10"
      />

      {/* ── DM Sozlamalari paneli ── */}
      <div className="hidden md:flex">
        <DmSettingsPanel width={rightWidth} />
      </div>

      {/* Mobile DM Settings Overlay */}
      {showMobileDmSettings && (
        <DmSettingsPanel width="100%" onClose={() => setShowMobileDmSettings(false)} />
      )}
    </div>
  );
}
