'use client';

import { useEffect, useState } from 'react';
import { useInstagram } from '@/context/InstagramContext';
import { Loader2, Instagram, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function InstagramRequired({ children }: { children: React.ReactNode }) {
  const { connected, refresh } = useInstagram();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.success !== undefined) {
        setConnecting(false);
        if (event.data.success) {
          setError('');
          refresh();
        } else {
          setError(event.data.error || 'Ulanishda xato yuz berdi');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [refresh]);

  async function handleConnect() {
    setError('');
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
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(url, 'Instagram Login', `width=${w},height=${h},top=${top},left=${left}`);
      if (popup) {
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setTimeout(() => {
              setConnecting(prev => {
                if (prev) return false;
                return prev;
              });
            }, 500);
          }
        }, 500);
      }
    } catch (err: any) {
      setError(err.message);
      setConnecting(false);
    }
  }

  if (connected === null) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-on-surface-variant animate-pulse">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <>
      {children}
      {connected === false && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="max-w-md w-full bg-surface border border-outline-variant/30 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(139,92,246,0.2)] text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
              <Instagram className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-[24px] font-extrabold text-on-surface mb-3">
              Instagram'ni ulang
            </h2>
            
            <p className="text-[15px] leading-relaxed text-on-surface-variant mb-8">
              JavobGo xizmatlaridan foydalanish uchun davom etishdan oldin Instagram biznes yoki kreator hisobingizni ulashingiz kerak.
            </p>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-error/10 border border-error/20 text-error rounded-xl mb-6 w-full text-left text-sm shadow-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-on-primary font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 shadow-lg shadow-primary/20"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kutilmoqda...
                </>
              ) : (
                <>
                  <Instagram className="w-5 h-5" />
                  Hisobni ulash
                </>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-[12px] font-medium text-on-surface-variant/70">
              <ShieldCheck className="w-4 h-4" />
              <span>Ma'lumotlaringiz xavfsizligi kafolatlangan</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
