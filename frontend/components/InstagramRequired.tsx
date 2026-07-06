'use client';

import { useEffect, useState } from 'react';
import { useInstagram } from '@/context/InstagramContext';
import { useLanguage } from '@/context/LanguageContext';
import { connectInstagram } from '@/lib/connectInstagram';
import { Loader2, Instagram, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function InstagramRequired({ children }: { children: React.ReactNode }) {
  const { connected, refresh } = useInstagram();
  const { t } = useLanguage();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // OAuth to'liq redirect oqimi: Instagram'dan qaytгач natija URL query-param'да keladi
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ig_connected') === '1') {
      setError('');
      refresh();
      // query-paramларni tozalaymiz
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('ig_error')) {
      setError(decodeURIComponent(params.get('ig_error') || 'Ulanishda xato yuz berdi'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refresh]);

  async function handleConnect() {
    setError('');
    setConnecting(true);
    try {
      const result = await connectInstagram();
      if (result.status === 'redirecting') return; // mobil: sahifa o'tyapti
      if (result.status === 'connected') {
        refresh();
      } else if (result.status === 'error') {
        setError(result.error);
      }
      // cancelled: hech narsa qilmaymiz
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }

  if (connected === null) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-on-surface-variant animate-pulse">{t('settings.waiting')}</p>
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
              {t('instagram.connectTitle')}
            </h2>
            
            <p className="text-[15px] leading-relaxed text-on-surface-variant mb-8">
              {t('instagram.connectDesc')}
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
                  {t('settings.waiting')}
                </>
              ) : (
                <>
                  <Instagram className="w-5 h-5" />
                  {t('instagram.connectBtn')}
                </>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-[12px] font-medium text-on-surface-variant/70">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('instagram.secure')}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
