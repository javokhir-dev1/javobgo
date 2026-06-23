'use client';

import { useState, useEffect, useRef } from 'react';
import { Instagram, Link2, Trash2, CheckCircle, AlertCircle, Loader2, ExternalLink, Check } from 'lucide-react';
import { useInstagram, useInstagramRefresh } from '@/context/InstagramContext';
import { disconnectInstagramAccount } from '@/lib/api';

export default function SettingsPage() {
  const { accounts, selectedAccount, selectAccount } = useInstagram();
  const refreshInstagram = useInstagramRefresh();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
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
        <div className="max-w-xl mx-auto space-y-8">

          <header>
            <h2 className="text-[28px] font-semibold text-on-surface tracking-tight">Sozlamalar</h2>
            <p className="text-[15px] text-on-surface-variant mt-1">Instagram hisoblaringizni boshqaring</p>
          </header>

          {/* Xato / muvaffaqiyat */}
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

          {/* Akkauntlar ro'yxati */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-on-surface-variant uppercase tracking-wide px-1">
                Ulangan akkauntlar
              </p>
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

          {/* Yangi akkaunt ulash */}
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

          {/* Talablar */}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-5 space-y-2 text-sm text-on-surface-variant">
            <p className="font-medium text-on-surface mb-3">Ulanish uchun kerak:</p>
            <p>• Facebook sahifangiz bo'lishi kerak</p>
            <p>• Instagram Professional (Business/Creator) hisobi bo'lishi kerak</p>
            <p>• Instagram hisobi Facebook sahifasiga ulangan bo'lishi kerak</p>
            <p>• Meta Developer ilovasida <span className="font-mono text-xs">instagram_manage_messages</span> va <span className="font-mono text-xs">instagram_manage_comments</span> ruxsatlari bo'lishi kerak</p>
          </div>

        </div>
      </div>
    </div>
  );
}
