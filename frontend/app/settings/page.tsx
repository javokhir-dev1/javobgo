'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Instagram, Link2, Trash2, CheckCircle, AlertCircle, Loader2, ExternalLink, 
  Check, User, LogOut, Hash, Pencil, X, Camera 
} from 'lucide-react';
import { useInstagram, useInstagramRefresh } from '@/context/InstagramContext';
import { disconnectInstagramAccount } from '@/lib/api';

interface UserInfo {
  telegram_id: string;
  first_name: string;
  username: string | null;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { accounts, selectedAccount, selectAccount } = useInstagram();
  const refreshInstagram = useInstagramRefresh();
  
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // ism tahrirlash
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // avatar yuklash
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      fetch('/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d)),
    ]).finally(() => setLoading(false));

    const handler = (event: MessageEvent) => {
      if (event.data?.success !== undefined) {
        setConnecting(false);
        if (event.data.success) {
          setSuccess(`@${event.data.instagram_username} muvaffaqiyatli ulandi!`);
          setError('');
          refreshInstagram();
        } else {
          setError(event.data.error || 'Ulanishda xato yuz berdi');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const avatarSrc = avatarPreview
    ?? (user?.avatar_url ? `/uploads/avatars/${user.avatar_url.split('/uploads/avatars/').pop()}` : null);

  /* ── Ism saqlash ─────────────────────────────────────────── */
  const startEditName = () => {
    setNameInput(user?.first_name ?? '');
    setEditingName(true);
  };

  const cancelEditName = () => setEditingName(false);

  const saveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === user?.first_name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch('/auth/update-profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: nameInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, first_name: data.user.first_name } : prev);
        setEditingName(false);
      }
    } finally {
      setSavingName(false);
    }
  };

  /* ── Avatar yuklash ──────────────────────────────────────── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch('/auth/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, avatar_url: data.avatar_url } : prev);
        setAvatarPreview(null);
      } else {
        setAvatarPreview(null);
      }
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
  };

  /* ── Instagram ulash/uzish ────────────────────────────────── */
  async function handleConnect() {
    setError('');
    setSuccess('');
    setConnecting(true);
    try {
      const res = await fetch('/api/instagram/oauth-url');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'OAuth URL olishda xato');
      }
      const { url } = await res.json();
      const w = 600, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top  = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(url, 'ig_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`);
      popupRef.current = popup;
      const timer = setInterval(() => {
        if (popup?.closed) { clearInterval(timer); setConnecting(false); }
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setConnecting(false);
    }
  }

  async function handleDisconnect(igId: string, username: string) {
    if (!confirm(`@${username} hisobini uzmoqchimisiz?`)) return;
    setDisconnecting(igId);
    try {
      await disconnectInstagramAccount(igId);
      refreshInstagram();
      setSuccess(`@${username} uzildi.`);
      setError('');
    } catch {
      setError('Uzishda xato yuz berdi.');
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleSelect(igId: string) {
    await selectAccount(igId);
    setSuccess('Aktiv akkaunt o\'zgartirildi.');
    setTimeout(() => setSuccess(''), 2000);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">

          <header>
            <h2 className="text-[28px] font-semibold text-on-surface tracking-tight">Sozlamalar</h2>
            <p className="text-[15px] text-on-surface-variant mt-1">Profil va Instagram hisoblaringizni boshqaring</p>
          </header>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 animate-pulse">
                  <div className="h-4 w-32 bg-surface-container rounded mb-4" />
                  <div className="h-6 w-48 bg-surface-container rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">

              {/* === PROFIL QISMI === */}
              <div className="space-y-4">
                <h3 className="text-[18px] font-semibold text-on-surface">Shaxsiy ma'lumotlar</h3>
                
                {/* Avatar + ism */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 flex items-center gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={user?.first_name} className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-3xl">
                        {user?.first_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                    >
                      {avatarUploading
                        ? <Loader2 size={13} className="text-white animate-spin" />
                        : <Camera size={13} className="text-white" />
                      }
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>

                  {/* Ism */}
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-surface-variant text-on-surface text-[17px] font-bold outline-none focus:ring-2 ring-primary/40"
                        />
                        <button onClick={saveName} disabled={savingName}
                          className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:opacity-90 disabled:opacity-50">
                          {savingName ? <Loader2 size={14} className="text-white animate-spin" /> : <Check size={14} className="text-white" />}
                        </button>
                        <button onClick={cancelEditName}
                          className="w-8 h-8 rounded-lg bg-surface-variant flex items-center justify-center hover:bg-surface-container transition-colors">
                          <X size={14} className="text-on-surface-variant" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <p className="text-[22px] font-bold text-on-surface truncate">{user?.first_name ?? '—'}</p>
                        <button onClick={startEditName}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-surface-container">
                          <Pencil size={14} className="text-on-surface-variant" />
                        </button>
                      </div>
                    )}
                    {user?.username && (
                      <p className="text-[15px] text-on-surface-variant mt-0.5">@{user.username}</p>
                    )}
                  </div>
                </div>

                {/* Telegram ma'lumotlari */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-outline-variant/20">
                    <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">Telegram</p>
                  </div>
                  <div className="divide-y divide-outline-variant/20">
                    <div className="px-6 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-on-surface-variant" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-on-surface-variant">Ism</p>
                        <p className="text-[15px] font-medium text-on-surface">{user?.first_name ?? '—'}</p>
                      </div>
                    </div>
                    {user?.username && (
                      <div className="px-6 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                          <span className="text-[15px] font-bold text-on-surface-variant">@</span>
                        </div>
                        <div>
                          <p className="text-[12px] text-on-surface-variant">Username</p>
                          <p className="text-[15px] font-medium text-on-surface">@{user.username}</p>
                        </div>
                      </div>
                    )}
                    <div className="px-6 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                        <Hash size={16} className="text-on-surface-variant" />
                      </div>
                      <div>
                        <p className="text-[12px] text-on-surface-variant">Telegram ID</p>
                        <p className="text-[15px] font-medium text-on-surface font-mono">{user?.telegram_id ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* === INSTAGRAM QISMI === */}
              <div className="space-y-4 pt-6 border-t border-outline-variant/30">
                <h3 className="text-[18px] font-semibold text-on-surface">Instagram hisoblar</h3>

                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-500 text-sm">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-500 text-sm">
                    <CheckCircle size={15} className="flex-shrink-0" /> {success}
                  </div>
                )}

                {accounts.length > 0 && (
                  <div className="space-y-2">
                    {accounts.map(acc => (
                      <div
                        key={acc.instagram_account_id}
                        className={`rounded-2xl border p-4 flex items-center gap-4 ${
                          acc.is_selected
                            ? 'bg-green-500/5 border-green-500/25'
                            : 'bg-surface-container-low border-outline-variant/40'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center flex-shrink-0">
                          <Instagram size={20} className="text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-on-surface">@{acc.instagram_username}</p>
                            {acc.is_selected && (
                              <span className="flex items-center gap-1 text-green-500 text-[11px] font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                                <Check size={10} /> Aktiv
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">ID: {acc.instagram_account_id}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!acc.is_selected && (
                            <button
                              onClick={() => handleSelect(acc.instagram_account_id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface-variant text-[12px] font-medium hover:bg-surface-container hover:text-on-surface transition-colors"
                            >
                              <Check size={13} /> Tanlash
                            </button>
                          )}
                          <button
                            onClick={() => handleDisconnect(acc.instagram_account_id, acc.instagram_username)}
                            disabled={disconnecting === acc.instagram_account_id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/8 transition-colors disabled:opacity-50"
                          >
                            {disconnecting === acc.instagram_account_id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm text-white transition-opacity disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
                  >
                    {connecting
                      ? <><Loader2 size={16} className="animate-spin" /> Kutilmoqda...</>
                      : <><ExternalLink size={16} /> {accounts.length > 0 ? 'Yangi akkaunt ulash' : 'Instagram orqali ulash'}</>
                    }
                  </button>
                </div>
              </div>

              {/* Chiqish */}
              <div className="pt-6 border-t border-outline-variant/30">
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
                  <button
                    onClick={handleLogout}
                    className="w-full px-6 py-4 flex items-center gap-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                      <LogOut size={16} className="text-red-500" />
                    </div>
                    <span className="text-[15px] font-medium">Hisobdan chiqish</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
