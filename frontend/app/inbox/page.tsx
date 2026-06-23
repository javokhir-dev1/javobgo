'use client';
import InstagramRequired from '@/components/InstagramRequired';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, Send, Search, X, Instagram, Settings, Bot, FileText, Plus, Trash2, ChevronRight, RefreshCw } from 'lucide-react';
import {
  getConversations, getInboxMessages, sendInboxMessage, getInboxEventsUrl, getInboxUserInfo,
  getSettings, updateSettings, getDmMessages, updateDmMessages, getAgents, syncInbox,
} from '@/lib/api';
import { useInstagramStatus } from '@/context/InstagramContext';

interface Conversation {
  id: number;
  igConversationId: string;
  participantIgsid: string;
  participantUsername: string;
  participantName: string | null;
  participantProfilePic: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
}

interface InboxMessage {
  id: number;
  conversationId: number;
  participantIgsid: string;
  direction: 'in' | 'out';
  messageText: string;
  igCreatedAt: string | null;
  createdAt: string;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Hozir';
  if (mins < 60) return `${mins}d`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}s`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}k`;
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
}

function avatarColor(username: string): string {
  const colors = [
    '#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444',
    '#06B6D4','#F97316','#84CC16','#EC4899','#6366F1',
  ];
  let hash = 0;
  for (const ch of username) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ username, profilePic, igsid, size = 40 }: { username: string; profilePic?: string | null; igsid?: string; size?: number }) {
  if (profilePic) {
    return (
      <img
        src={profilePic}
        alt={username}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        referrerPolicy="no-referrer"
      />
    );
  }
  const letter = (username || '?')[0].toUpperCase();
  const bg = avatarColor(username || '?');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 600, fontSize: size * 0.4, flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

interface UserInfo {
  id: string;
  username?: string;
  name?: string;
  profile_pic?: string;
}

// ─── Agent avatar helper ─────────────────────────────────────────────────────

function AgentAvatar({ value, size = 28 }: { value: string; size?: number }) {
  if (value?.startsWith('dicebear:')) {
    const seed = value.split(':')[2] || 'Felix';
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
    return <img src={url} alt="avatar" style={{ width: size, height: size, borderRadius: '50%' }} />;
  }
  return <span style={{ fontSize: size * 0.65 }} className="leading-none">{value}</span>;
}

// ─── DM Sozlamalari paneli ───────────────────────────────────────────────────

function DmSettingsPanel({ onClose: _ }: { onClose: () => void }) {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [enabled, setEnabled]       = useState(false);
  const [mode, setMode]             = useState<'template' | 'ai'>('template');
  const [agentId, setAgentId]       = useState<number | null>(null);
  const [agents, setAgents]         = useState<any[]>([]);
  const [templates, setTemplates]   = useState<string[]>(['']);

  // Dastlabki holat — o'zgarish borligini aniqlash uchun
  const [initial, setInitial] = useState<{ enabled: boolean; mode: string; agentId: number | null; templates: string[] } | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getDmMessages(), getAgents()]).then(([s, msgs, ags]) => {
      const en = s.dmAutoReplyEnabled ?? false;
      const md = s.dmMode === 'ai' ? 'ai' : 'template';
      const aid = s.dmAgentId ?? null;
      const texts = Array.isArray(msgs) ? msgs.map((m: any) => m.text || m) : [];
      const tmpl = texts.length ? texts : [''];
      setEnabled(en); setMode(md as any); setAgentId(aid);
      setAgents(Array.isArray(ags) ? ags : []);
      setTemplates(tmpl);
      setInitial({ enabled: en, mode: md, agentId: aid, templates: tmpl });
    }).finally(() => setLoading(false));
  }, []);

  const hasChanges = initial !== null && (
    enabled !== initial.enabled ||
    mode !== initial.mode ||
    agentId !== initial.agentId ||
    JSON.stringify(templates) !== JSON.stringify(initial.templates)
  );

  const validTemplates = templates.filter(t => t.trim());
  const templateError = mode === 'template' && enabled && validTemplates.length < 3
    ? `Kamida 3 ta shablon kerak (hozir ${validTemplates.length} ta)`
    : null;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings({ dmAutoReplyEnabled: enabled, dmMode: mode, dmAgentId: agentId });
      if (mode === 'template') {
        await updateDmMessages(templates.filter(t => t.trim()));
      }
      setInitial({ enabled, mode, agentId, templates: [...templates] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-outline-variant/30 bg-surface-container-lowest">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <Settings size={16} className="text-primary" />
        <span className="text-[15px] font-semibold text-on-surface">DM Sozlamalari</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">

          {/* Avto-javob toggle */}
          <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
            <div>
              <p className="text-[14px] font-medium text-on-surface">Avto-javob</p>
              <p className="text-[12px] text-on-surface-variant">DM larga avtomatik javob</p>
            </div>
            <button
              onClick={() => setEnabled(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-outline-variant'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {enabled && (
            <>
              {/* Rejim tanlash */}
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">Javob turi</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('template')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                      mode === 'template' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <FileText size={18} />
                    <span className="text-[12px] font-medium">Shablonlar</span>
                  </button>
                  <button
                    onClick={() => setMode('ai')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                      mode === 'ai' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <Bot size={18} />
                    <span className="text-[12px] font-medium">AI Agent</span>
                  </button>
                </div>
              </div>

              {/* Shablonlar */}
              {mode === 'template' && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">Shablonlar</p>
                  {templates.map((t, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <textarea
                        value={t}
                        rows={2}
                        onChange={e => {
                          const next = [...templates];
                          next[i] = e.target.value;
                          setTemplates(next);
                        }}
                        placeholder={`Shablon ${i + 1}`}
                        className="flex-1 text-[13px] px-3 py-2 rounded-xl border border-outline-variant/40 bg-surface-container text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40 resize-none"
                      />
                      {templates.length > 1 && (
                        <button
                          onClick={() => setTemplates(templates.filter((_, j) => j !== i))}
                          className="mt-1 w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setTemplates([...templates, ''])}
                    className="flex items-center gap-1.5 text-[13px] text-primary hover:underline"
                  >
                    <Plus size={14} /> Shablon qo'shish
                  </button>
                  {templateError && (
                    <p className="text-[12px] text-error mt-1">{templateError}</p>
                  )}
                </div>
              )}

              {/* AI Agent tanlash */}
              {mode === 'ai' && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">Agent</p>
                  {agents.length === 0 ? (
                    <p className="text-[13px] text-on-surface-variant">Agent topilmadi</p>
                  ) : (
                    <div className="space-y-1.5">
                      {agents.map((a: any) => (
                        <button
                          key={a.id}
                          onClick={() => setAgentId(a.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                            agentId === a.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <AgentAvatar value={a.emoji || '🤖'} size={28} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-on-surface truncate">{a.name}</p>
                          </div>
                          {agentId === a.id && <ChevronRight size={14} className="text-primary flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Saqlash */}
      <div className="px-4 py-3 border-t border-outline-variant/20">
        <button
          onClick={save}
          disabled={saving || !hasChanges || !!templateError}
          className={`w-full py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : hasChanges && !templateError
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
          }`}
        >
          {saving ? 'Saqlanmoqda...' : saved ? '✓ Saqlandi' : 'Saqlash'}
        </button>
      </div>
    </div>
  );
}

function ProfileModal({ igsid, conv, onClose }: { igsid: string; conv: Conversation; onClose: () => void }) {
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgZoom, setImgZoom] = useState(false);

  useEffect(() => {
    getInboxUserInfo(igsid)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [igsid]);

  const pic = info?.profile_pic || conv.participantProfilePic;
  const username = info?.username || conv.participantUsername;
  const name = info?.name || conv.participantName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl shadow-2xl w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Yopish */}
        <div className="flex justify-end p-3 pb-0">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 pb-6 flex flex-col items-center text-center">
            {/* Rasm */}
            {pic ? (
              <>
                <button onClick={() => setImgZoom(true)} className="mb-3 rounded-full hover:opacity-90 transition-opacity focus:outline-none">
                  <img src={pic} alt={username} className="w-20 h-20 rounded-full object-cover border-2 border-outline-variant/30" referrerPolicy="no-referrer" />
                </button>
                {imgZoom && (
                  <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setImgZoom(false)}
                  >
                    <img
                      src={pic}
                      alt={username}
                      className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                      onClick={e => e.stopPropagation()}
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => setImgZoom(false)}
                      className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: avatarColor(username || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 32 }} className="mb-3">
                {(username || '?')[0].toUpperCase()}
              </div>
            )}

            {/* Ism */}
            {name && <p className="text-[16px] font-semibold text-on-surface">{name}</p>}

            {/* Username */}
            <p className="text-[14px] text-on-surface-variant mt-0.5">@{username}</p>

            {/* Instagram havolasi */}
            <a
              href={`https://instagram.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-[13px] text-primary hover:underline"
            >
              <Instagram size={14} />
              Instagram da ko'rish
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const connected = useInstagramStatus();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected]           = useState<Conversation | null>(null);
  const [messages, setMessages]           = useState<InboxMessage[]>([]);
  const [input, setInput]                 = useState('');
  const [search, setSearch]               = useState('');
  const [sending, setSending]             = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const [profileModal, setProfileModal]   = useState<Conversation | null>(null);
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
              new Date(b.lastMessageAt || b.updatedAt).getTime() -
              new Date(a.lastMessageAt || a.updatedAt).getTime()
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
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await sendInboxMessage(selected.participantIgsid, text);
      setConversations(prev =>
        prev.map(c => c.id === selected.id
          ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() }
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
    <InstagramRequired>
    <div className="h-full flex overflow-hidden bg-surface-container-low">
      {profileModal && (
        <ProfileModal
          igsid={profileModal.participantIgsid}
          conv={profileModal}
          onClose={() => setProfileModal(null)}
        />
      )}

      {/* ── Chap panel ── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-outline-variant/30 bg-surface-container-lowest">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-primary" />
            <h2 className="text-[17px] font-semibold text-on-surface">Xabarlar</h2>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold leading-none">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors ${syncing ? 'opacity-50' : ''}`}
            title="Sinxronizatsiya"
          >
            <RefreshCw size={16} className={`text-on-surface-variant ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Qidiruv */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30">
            <Search size={14} className="text-on-surface-variant flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="flex-1 bg-transparent text-[13px] text-on-surface placeholder:text-on-surface-variant/50 outline-none"
            />
          </div>
        </div>

        {/* Suhbatlar */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MessageCircle size={36} className="text-on-surface-variant/30 mb-3" />
              <p className="text-[14px] text-on-surface-variant">Hali xabar yo'q</p>
              <p className="text-[12px] text-on-surface-variant/60 mt-1">
                Yangi DM kelganda bu yerda ko'rinadi
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
                    <Avatar username={conv.participantUsername || conv.participantIgsid} profilePic={conv.participantProfilePic} igsid={conv.participantIgsid} />
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
                        {formatTime(conv.lastMessageAt || conv.updatedAt)}
                      </span>
                    </div>
                    <p className={`text-[12px] truncate mt-0.5 ${conv.unreadCount ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {conv.lastMessage || 'Xabar yo\'q'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── O'ng panel ── */}
      <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Chat header */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-outline-variant/30 bg-surface-container">
              <button onClick={() => setProfileModal(selected)} className="rounded-full hover:opacity-80 transition-opacity">
                <Avatar username={selected.participantUsername || selected.participantIgsid} profilePic={selected.participantProfilePic} igsid={selected.participantIgsid} size={36} />
              </button>
              <div>
                <p className="text-[15px] font-semibold text-on-surface leading-tight">
                  @{selected.participantUsername || selected.participantIgsid}
                </p>
                <p className="text-[12px] text-on-surface-variant">Instagram DM</p>
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
                  <p className="text-[14px]">Xabarlar yo'q</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-1.5">
                  {messages.map((msg, i) => {
                    const isOut = msg.direction === 'out';
                    const prevMsg = messages[i - 1];
                    const showTime = !prevMsg ||
                      new Date(msg.igCreatedAt || msg.createdAt).getTime() -
                      new Date(prevMsg.igCreatedAt || prevMsg.createdAt).getTime() > 5 * 60 * 1000;

                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="text-center my-3">
                            <span className="text-[11px] text-on-surface-variant/50 bg-surface-container px-2 py-0.5 rounded-full">
                              {new Date(msg.igCreatedAt || msg.createdAt).toLocaleString('uz-UZ', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
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
                    placeholder="Xabar yozing..."
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
              <p className="text-center mt-1.5 text-[11px] text-on-surface-variant/40">Enter — yuborish</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <MessageCircle size={56} className="opacity-15" />
            <p className="text-[16px] font-medium">Suhbatni tanlang</p>
            <p className="text-[13px] opacity-60">Chap tomondagi ro'yxatdan birini bosing</p>
          </div>
        )}
      </div>

      {/* ── DM Sozlamalari paneli ── */}
      <DmSettingsPanel onClose={() => {}} />
      </div>
    </div>
    </InstagramRequired>
  );
}
