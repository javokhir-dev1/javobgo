'use client';

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Zap, Shield, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { verifyOtpAction } from '../actions/auth';
import { getSettings } from '@/lib/api';

const OTP_LENGTH = 6;

export default function LoginPage() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const focusNext = (index: number) => {
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };
  const focusPrev = (index: number) => {
    if (index > 0) inputRefs.current[index - 1]?.focus();
  };

  const submit = async (otp: string) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await verifyOtpAction(otp);

      if (!result.ok) {
        if (result.error === 'invalid_or_expired_otp') {
          setError("Kod noto'g'ri yoki muddati o'tgan. Yangi kod oling.");
        } else if (result.error === 'too_many_requests') {
          setError("Juda ko'p urinish. Biroz kuting.");
        } else if (result.error === 'backend_unreachable') {
          setError("Server bilan bog'lanib bo'lmadi. Iltimos qayta urinib ko'ring.");
        } else {
          setError("Noto'g'ri kod formati.");
        }
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
        return;
      }

      router.push('/');
    } catch {
      setError("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Akkaunt mavjud bo'lsa (valid token), bosh sahifaga qaytarish
    getSettings()
      .then(() => router.replace('/'))
      .catch(() => {}); // Token yo'q yoki yaroqsiz bo'lsa, shu yerda qoladi

    const params = new URLSearchParams(window.location.search);
    const urlOtp = params.get('otp');
    if (urlOtp && /^\d{6}$/.test(urlOtp)) {
      setDigits(urlOtp.split(''));
      submit(urlOtp);
    }
  }, [router]);

  useEffect(() => {
    const hasDigit = digits.some(d => d !== '');
    if (!hasDigit || countdown !== null) return;
    setCountdown(60);
  }, [digits]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    const otp = digits.join('');
    if (otp.length === OTP_LENGTH && !isLoading) {
      submit(otp);
    }
  }, [digits]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit) focusNext(index);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else {
        focusPrev(index);
      }
    } else if (e.key === 'ArrowLeft') {
      focusPrev(index);
    } else if (e.key === 'ArrowRight') {
      focusNext(index);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError('');
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

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

      {/* Right Panel — OTP */}
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

        <div className="w-full max-w-[420px]">
          <div className="text-center mb-10">
            <h1 className="text-[32px] font-extrabold text-on-surface tracking-tight mb-3">Xush kelibsiz</h1>
            <p className="text-[15px] text-on-surface-variant">
              Platformaga kirish uchun Telegram bot yuborgan tasdiqlash kodini kiriting
            </p>
          </div>

          <div className="flex items-start gap-4 w-full p-4 rounded-2xl mb-10 bg-primary/5 border border-primary/20">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="currentColor"/>
                <path d="M5.491 11.74l11.57-4.461c.537-.194 1.006.131.832.943l.001-.001-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953z" fill="var(--md-background)"/>
              </svg>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-[14px] text-on-surface leading-snug">
                Telegram botimizga o'ting va <code className="bg-surface-variant text-primary font-mono text-[13px] px-1.5 py-0.5 rounded-md font-semibold">/login</code> buyrug'ini yuboring. 1 daqiqa amal qiladigan parol olasiz.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-between mb-8">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={isLoading}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className={`
                  w-[60px] h-[68px] text-center text-2xl font-bold rounded-2xl outline-none transition-all duration-200
                  bg-surface text-on-surface border-[2px]
                  ${error ? 'border-error bg-error/5 text-error' : digit ? 'border-primary shadow-[0_4px_20px_-4px_rgba(139,92,246,0.15)] bg-surface-container-lowest' : 'border-outline-variant/40 hover:border-outline-variant/60 focus:border-primary/50 bg-surface'}
                `}
                style={{ opacity: isLoading ? 0.6 : 1 }}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2.5 py-3 mb-6 text-[14px] font-medium text-primary bg-primary/5 rounded-xl animate-pulse">
              <Loader2 className="animate-spin w-4 h-4" />
              Kodni tekshirmoqdamiz...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl text-[14px] font-medium bg-error/10 border border-error/20 text-error mb-6 shadow-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {countdown !== null && countdown > 0 && !isLoading && !error && (
            <div className="flex items-center justify-center gap-2.5 text-[14px] font-medium text-on-surface-variant mt-6 bg-surface-container-low py-3 rounded-xl">
              <Clock size={16} className="text-primary" />
              <span>Kod <span className="text-primary">{countdown}</span> soniyada o'z kuchini yo'qotadi</span>
            </div>
          )}
          {countdown === 0 && !isLoading && (
            <div className="flex items-center gap-3 p-4 rounded-xl text-[14px] font-medium bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#d97706] dark:text-[#fbbf24] mt-6 shadow-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>Kod muddati o'tdi. Telegram botda qaytadan <span className="font-bold">/login</span> yuboring.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
