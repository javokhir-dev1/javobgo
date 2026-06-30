'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Token tekshirilmoqda...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Token topilmadi');
      setTimeout(() => router.push('/login?error=missing_token'), 2000);
      return;
    }

    const validate = async () => {
      try {
        // /auth/validate — Next.js rewrite orqali backend ga yo'naltiriladi
        const res = await fetch(
          `/auth/validate?token=${encodeURIComponent(token)}`,
          { method: 'GET', credentials: 'include' },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'invalid_token');
        }

        const data = await res.json();
        const user = data.user;

        localStorage.setItem('user_name', user.first_name || '');
        localStorage.setItem('user_telegram_id', user.telegram_id || '');
        localStorage.setItem('auth_type', 'telegram');

        setStatus('success');
        setMessage("Muvaffaqiyatli! Bosh sahifaga o'tilmoqda...");
        setTimeout(() => router.push('/'), 800);
      } catch (err: any) {
        setStatus('error');
        const errMsg =
          err.message === 'invalid_or_expired_token'
            ? "Token muddati o'tgan yoki noto'g'ri. Iltimos qayta urinib ko'ring."
            : "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.";
        setMessage(errMsg);
        setTimeout(() => router.push('/login?error=invalid_token'), 3000);
      }
    };

    validate();
  }, [searchParams, router]);

  return (
    <main
      className="flex-grow flex items-center justify-center min-h-screen"
      style={{ background: '#020617' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background:
              status === 'error'
                ? 'rgba(239,68,68,0.1)'
                : 'linear-gradient(135deg, rgba(0,209,255,0.15), rgba(0,102,255,0.15))',
            border: `1px solid ${status === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(0,209,255,0.3)'}`,
          }}
        >
          {status === 'loading' && (
            <svg className="animate-spin w-7 h-7" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#00d1ff" strokeWidth="3" />
              <path className="opacity-80" fill="#00d1ff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {status === 'success' && (
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#00d1ff" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {status === 'error' && (
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#f87171" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold text-white mb-2">
            {status === 'loading' && 'Tekshirilmoqda...'}
            {status === 'success' && 'Muvaffaqiyatli!'}
            {status === 'error' && 'Xatolik yuz berdi'}
          </h1>
          <p className="text-sm" style={{ color: '#7a9bb5' }}>{message}</p>
        </div>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-grow flex items-center justify-center min-h-screen" style={{ background: '#020617' }}>
          <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#00d1ff" strokeWidth="3" />
            <path className="opacity-80" fill="#00d1ff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </main>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
