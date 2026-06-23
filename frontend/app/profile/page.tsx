'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Hash, Pencil, Check, X, Camera, Loader2 } from 'lucide-react';
import { getInstagramStatus } from '@/lib/api';

interface UserInfo {
  telegram_id: string;
  first_name: string;
  username: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [account, setAccount] = useState<{ connected: boolean; username?: string } | null>(null);
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
      getInstagramStatus().then(d => setAccount({ connected: d.connected, username: d.account?.username })),
    ]).finally(() => setLoading(false));
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
        setAvatarPreview(null); // serverdan yangi URL ishlaydi endi
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">

          <header className="mb-8">
            <h2 className="text-[28px] font-semibold text-on-surface tracking-tight">Profil</h2>
            <p className="text-[15px] text-on-surface-variant mt-1">Ma'lumotlaringizni tahrirlang</p>
          </header>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 animate-pulse">
                  <div className="h-4 w-32 bg-surface-container rounded mb-4" />
                  <div className="h-6 w-48 bg-surface-container rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">

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

              {/* Instagram holati */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/20">
                  <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">Instagram</p>
                </div>
                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-on-surface-variant">Holat</p>
                    <p className="text-[15px] font-medium text-on-surface">
                      {account?.connected ? `@${account.username}` : 'Ulanmagan'}
                    </p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${account?.connected ? 'bg-green-500' : 'bg-outline-variant'}`} />
                </div>
              </div>

              {/* Chiqish */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="w-full px-6 py-4 flex items-center gap-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                    <LogOut size={16} className="text-red-500" />
                  </div>
                  <span className="text-[15px] font-medium">Chiqish</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
