'use client';

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, Zap, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { verifyAuthTokenAction } from '../actions/auth';
import { getSettings } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import type { Language } from '@/locales/translations';

const LANGS: { code: Language; label: string }[] = [
  { code: 'uz', label: "O'z" },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 p-1 rounded-full border border-outline-variant/30 bg-surface/50 backdrop-blur-md">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
            language === code
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          aria-label={`Switch language to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ first_name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      submitToken(token);
      return;
    }

    const isTgWebApp = window.location.hash.includes('tgWebAppData') ||
                       !!(window as any).Telegram?.WebApp?.initData;

    if (isTgWebApp) setIsLoading(true);

    const checkTgInitData = () => {
      const tgInitData = (window as any).Telegram?.WebApp?.initData;
      if (tgInitData) { submitInitData(tgInitData); return true; }
      return false;
    };

    if (checkTgInitData()) return;

    if (isTgWebApp) {
      const timer = setTimeout(() => {
        if (!checkTgInitData()) {
          getSettings().then(() => router.replace('/')).catch(() => setIsLoading(false));
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      getSettings().then(() => router.replace('/')).catch(() => setIsLoading(false));
    }
  }, [router, searchParams]);

  const submitInitData = async (initData: string) => {
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/auth/telegram-webapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      if (!res.ok) {
        setError(t('login.errAuth'));
        setIsLoading(false);
        return;
      }
      router.push('/');
    } catch {
      setError(t('login.errServer'));
      setIsLoading(false);
    }
  };

  const submitToken = async (token: string) => {
    setIsLoading(true); setError('');
    try {
      const result = await verifyAuthTokenAction(token);
      if (!result.ok) {
        if (result.error === 'invalid_or_expired_token') {
          setError(t('login.errTokenUsed'));
        } else if (result.error === 'too_many_requests') {
          setError(t('login.errTooMany'));
        } else if (result.error === 'backend_unreachable') {
          setError(t('login.errUnreachable'));
        } else {
          setError(t('login.errBadLink'));
        }
        setIsLoading(false);
        return;
      }
      router.push('/');
    } catch {
      setError(t('login.errGeneric'));
      setIsLoading(false);
    }
  };

  /** Backend xato kodini foydalanuvchiga ko'rinadigan matnga aylantiradi */
  const authErrorText = (status: number, payload: any): string => {
    const codes: string[] = Array.isArray(payload?.message)
      ? payload.message
      : [payload?.error ?? payload?.message].filter(Boolean);

    if (codes.includes('email_taken')) return t('auth.errEmailTaken');
    if (codes.includes('weak_password')) return t('auth.errWeakPassword');
    if (codes.includes('invalid_email')) return t('auth.errInvalidEmail');
    if (codes.includes('invalid_name')) return t('auth.errInvalidName');
    if (status === 401) return t('auth.errInvalidCredentials');
    if (status === 409) return t('auth.errEmailTaken');
    if (status === 429) return t('auth.errTooMany');
    if (status === 400) return t('auth.errInvalidEmail');
    return t('auth.errServer');
  };

  const submitEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');

    const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login';
    const body = mode === 'signup'
      ? form
      : { email: form.email, password: form.password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(authErrorText(res.status, payload));
        setSubmitting(false);
        return;
      }

      router.push('/');
    } catch {
      setError(t('auth.errServer'));
      setSubmitting(false);
    }
  };

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    setError('');
  };

  const hasToken = !!searchParams.get('token');
  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface ' +
    'placeholder:text-on-surface-variant/50 text-[15px] outline-none transition-colors ' +
    'focus:border-primary focus:ring-2 focus:ring-primary/20';

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
              {t('login.heroLine1')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#A78BFA]">{t('login.heroLine2')}</span><br />
              {t('login.heroLine3')}
            </h2>
            <p className="text-lg leading-relaxed text-on-surface-variant max-w-md">
              {t('login.heroDesc')}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { value: t('login.statFast'), label: t('login.statFastLabel'), icon: Zap },
              { value: '24/7', label: t('login.statAutoLabel'), icon: Bot },
              { value: '100%', label: t('login.statSecure'), icon: Shield },
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

      {/* Right Panel */}
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

        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-0 right-0 text-center px-4">
          <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            {t('nav.privacy')}
          </Link>
          <p className="text-[11px] text-on-surface-variant/40 mt-0.5">
            {t('nav.copyright')}
          </p>
        </div>

        <div className="w-full max-w-[420px] text-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <h1 className="text-[24px] font-extrabold text-on-surface tracking-tight">{t('login.loading')}</h1>
              <p className="text-[15px] text-on-surface-variant">{t('login.loadingWait')}</p>
            </div>
          ) : hasToken && !error ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <h1 className="text-[24px] font-extrabold text-on-surface tracking-tight">{t('login.verifying')}</h1>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <h1 className="text-[32px] font-extrabold text-on-surface tracking-tight mb-3">{t('login.welcome')}</h1>
                <p className="text-[15px] text-on-surface-variant">
                  {t('login.subtitle')}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-[14px] font-medium bg-error/10 border border-error/20 text-error mb-8 shadow-sm text-left">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Kirish / Ro'yxatdan o'tish almashtirgichi */}
              <div className="flex p-1 mb-6 rounded-2xl bg-surface-container border border-outline-variant/30">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                      mode === m
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {t(m === 'signin' ? 'auth.tabSignIn' : 'auth.tabSignUp')}
                  </button>
                ))}
              </div>

              <form onSubmit={submitEmailAuth} className="text-left space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="first_name" className="block text-[13px] font-medium text-on-surface-variant mb-1.5">
                      {t('auth.name')}
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={64}
                      autoComplete="name"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder={t('auth.namePh')}
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-on-surface-variant mb-1.5">
                    {t('auth.email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={t('auth.emailPh')}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-on-surface-variant mb-1.5">
                    {t('auth.password')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={mode === 'signup' ? 8 : undefined}
                    maxLength={128}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={t('auth.passwordPh')}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-on-primary font-bold text-[16px] hover:opacity-90 transition-opacity shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {t(mode === 'signup' ? 'auth.submitSignUp' : 'auth.submitSignIn')}
                </button>
              </form>

              {/* Ajratuvchi */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-outline-variant/30" />
                <span className="text-[12px] text-on-surface-variant/60 uppercase tracking-wide">
                  {t('auth.or')}
                </span>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              <a
                href={process.env.NEXT_PUBLIC_BOT_URL || 'https://t.me/javobgobot'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl border border-outline-variant/40 bg-surface-container text-on-surface font-semibold text-[15px] hover:border-primary/40 hover:bg-surface-container-high transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#229ED9">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.947l-2.963-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.991.612z"/>
                </svg>
                {t('auth.telegramBtn')}
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
