'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, Zap, Shield, AlertTriangle, Loader2, Send } from 'lucide-react';
import { verifyAuthTokenAction } from '../actions/auth';
import { getSettings } from '@/lib/api';

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      submitToken(token);
      return;
    }

    const isTgWebApp = window.location.hash.includes('tgWebAppData') || 
                       !!(window as any).Telegram?.WebApp?.initData;

    if (isTgWebApp) {
      setIsLoading(true);
    }

    const checkTgInitData = () => {
      const tgInitData = (window as any).Telegram?.WebApp?.initData;
      if (tgInitData) {
        submitInitData(tgInitData);
        return true;
      }
      return false;
    };

    if (checkTgInitData()) return;

    if (isTgWebApp) {
      const timer = setTimeout(() => {
        if (!checkTgInitData()) {
          getSettings()
            .then(() => router.replace('/'))
            .catch(() => setIsLoading(false));
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      getSettings()
        .then(() => router.replace('/'))
        .catch(() => setIsLoading(false));
    }
  }, [router, searchParams]);

  const submitInitData = async (initData: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/auth/telegram-webapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      });
      if (!res.ok) {
        setError("Avtorizatsiyadan o'tib bo'lmadi. Telegram orqali qayta kiring.");
        setIsLoading(false);
        return;
      }
      router.push('/');
    } catch {
      setError("Server bilan bog'lanishda xatolik.");
      setIsLoading(false);
    }
  };

  const submitToken = async (token: string) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await verifyAuthTokenAction(token);

      if (!result.ok) {
        if (result.error === 'invalid_or_expired_token') {
          setError("Ushbu tugma ishlatib bo'lingan. Iltimos botga qaytib qaytadan /start bosing.");
        } else if (result.error === 'too_many_requests') {
          setError("Juda ko'p urinish. Biroz kuting.");
        } else if (result.error === 'backend_unreachable') {
          setError("Server bilan bog'lanib bo'lmadi. Iltimos qayta urinib ko'ring.");
        } else {
          setError("Noto'g'ri havola formati.");
        }
        setIsLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setError("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
      setIsLoading(false);
    }
  };

  const hasToken = !!searchParams.get('token');

  return (
    <main className="flex-grow flex min-h-screen bg-background">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col p-12 overflow-hidden bg-surface-container-low border-r border-outline-variant/20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #A78BFA 0%, transparent 70%)' }} />

        <div className="relative z-10 flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 155" width="42" height="42" style={{ flexShrink: 0 }}>
            <path d="M 70 0 C 108.66 0 140 31.34 140 70 C 140 108.66 108.66 140 70 140 C 50 140 35 145 20 155 C 25 135 25 125 20 110 C 7 90 0 80 0 70 C 0 31.34 31.34 0 70 0 Z" fill="#8B5CF6"/>
            <path d="M 70 35 C 70 60 45 70 45 70 C 70 70 70 95 70 95 C 70 70 95 70 95 70 C 70 70 70 60 70 35 Z" fill="#FFFFFF"/>
          </svg>
          <span style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
            <span className="text-on-surface">Javob</span><span style={{ color: '#8B5CF6' }}>Go</span>
          </span>
        </div>

        <div className="relative z-10 space-y-8 flex-1 flex flex-col justify-center">
          <div>
            <h2 className="text-5xl font-extrabold text-on-surface tracking-tight leading-[1.1] mb-6">
              Instagram biznesingizni<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#A78BFA]">yangi bosqichga</span><br />
              olib chiqing
            </h2>
            <p className="text-lg leading-relaxed text-on-surface-variant max-w-md">
              Izohlar va xabarlarga avtomatik javob bering, mijozlarga kun-u tun tezkor xizmat ko'rsating.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { value: 'Tezkor', label: 'Ishga tushirish', icon: Zap },
              { value: '24/7', label: 'Avtomatik javob', icon: Bot },
              { value: '100%', label: 'Xavfsizlik', icon: Shield },
            ].map((s, idx) => (
              <div key={idx} className="rounded-2xl p-5 border border-outline-variant/30 bg-surface/50 backdrop-blur-md flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 hover:border-primary/30 hover:shadow-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                  <s.icon size={20} />
                </div>
                <div className="text-lg font-bold text-on-surface">{s.value}</div>
                <div className="text-xs text-on-surface-variant text-center leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 155" width="28" height="28" style={{ flexShrink: 0 }}>
            <path d="M 70 0 C 108.66 0 140 31.34 140 70 C 140 108.66 108.66 140 70 140 C 50 140 35 145 20 155 C 25 135 25 125 20 110 C 7 90 0 80 0 70 C 0 31.34 31.34 0 70 0 Z" fill="#8B5CF6"/>
            <path d="M 70 35 C 70 60 45 70 45 70 C 70 70 70 95 70 95 C 70 70 95 70 95 70 C 70 70 70 60 70 35 Z" fill="#FFFFFF"/>
          </svg>
          <span style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
            <span className="text-on-surface">Javob</span><span style={{ color: '#8B5CF6' }}>Go</span>
          </span>
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-0 right-0 text-center px-4">
          <Link href="/privacy-policy" className="text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            Maxfiylik siyosati
          </Link>
          <p className="text-[11px] text-on-surface-variant/40 mt-0.5">
            © {new Date().getFullYear()} Barcha huquqlar himoyalangan. Xizmatlar «ZO'R PLAY» MCHJ tomonidan ko'rsatiladi.
          </p>
        </div>

        <div className="w-full max-w-[420px] text-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <h1 className="text-[24px] font-extrabold text-on-surface tracking-tight">Kirish bajarilmoqda...</h1>
              <p className="text-[15px] text-on-surface-variant">Iltimos, kutib turing.</p>
            </div>
          ) : hasToken && !error ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <h1 className="text-[24px] font-extrabold text-on-surface tracking-tight">Tekshirilmoqda...</h1>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <h1 className="text-[32px] font-extrabold text-on-surface tracking-tight mb-3">Xush kelibsiz</h1>
                <p className="text-[15px] text-on-surface-variant">
                  Platformaga kirish uchun rasmiy Telegram botimizdan foydalaning yoki Telegram orqali kiring.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-[14px] font-medium bg-error/10 border border-error/20 text-error mb-8 shadow-sm text-left">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <a
                href={process.env.NEXT_PUBLIC_BOT_URL || 'https://t.me/javobgobot'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-primary text-on-primary font-bold text-[16px] transition-all hover:bg-primary/90 hover:scale-[1.02] shadow-[0_8px_30px_-4px_rgba(139,92,246,0.3)]"
              >
                <Send className="w-5 h-5" />
                Telegram orqali kirish
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
