'use client';

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { verifyOtpAction } from '../actions/auth';

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
    const params = new URLSearchParams(window.location.search);
    const urlOtp = params.get('otp');
    if (urlOtp && /^\d{6}$/.test(urlOtp)) {
      setDigits(urlOtp.split(''));
      submit(urlOtp);
    }
  }, []);

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
    <main className="flex-grow flex min-h-screen bg-white dark:bg-[#020617]">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-blue-50 via-slate-100 to-blue-50 dark:from-[#020617] dark:via-[#0a1628] dark:to-[#020617]">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00d1ff 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4c9fff 0%, transparent 70%)' }} />

        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-600">
            <i className="fa fa-robot text-white text-sm" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">JavobGo</span>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
              Instagram botingizni<br />
              <span style={{ color: '#00d1ff' }}>JavobGo</span> orqali<br />
              avtomatlang
            </h2>
            <p className="text-base leading-relaxed text-slate-600 dark:text-[#7a9bb5]">
              Izohlar va xabarlarga avtomatik javob bering. Telegram bot orqali tizimga kiring.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'Tezkor', label: 'Ishga tushirish' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Avtomatik' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 border text-center bg-cyan-400/5 border-cyan-400/20">
                <div className="text-xl font-bold" style={{ color: '#00d1ff' }}>{s.value}</div>
                <div className="text-xs mt-0.5 text-slate-600 dark:text-[#7a9bb5]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-cyan-400/5 border-cyan-400/20">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 border border-cyan-400/30">
              <i className="fa fa-shield-alt text-[#00d1ff]" />
            </div>
            <p className="text-sm text-slate-700 dark:text-[#bbc9cf]">
              Barcha ma'lumotlaringiz eng so'nggi xavfsizlik standartlari asosida himoyalangan.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel — OTP */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white dark:bg-[#020617]">
        <div className="w-full max-w-md">

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-600">
              <i className="fa fa-robot text-white text-xs" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">JavobGo</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Xush kelibsiz!</h1>
            <p className="text-slate-500 dark:text-[#7a9bb5]">Telegram botdan 6 xonali kodni kiriting</p>
          </div>

          <div
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl mb-8"
            style={{
              background: 'rgba(41,182,246,0.08)',
              border: '1px solid rgba(41,182,246,0.25)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#29B6F6"/>
              <path d="M5.491 11.74l11.57-4.461c.537-.194 1.006.131.832.943l.001-.001-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953z" fill="white"/>
            </svg>
            <span className="text-sm text-slate-700 dark:text-[#a8c5d8]">
              Telegram botga kiring va{' '}
              <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[#29B6F6] font-mono text-xs">/login</code>
              {' '}yuboring — 1 daqiqalik kod keladi
            </span>
          </div>

          <div className="flex gap-3 justify-between mb-6">
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
                className="w-full aspect-square text-center font-bold rounded-xl outline-none transition-all duration-200 text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 focus:border-[#00d1ff] dark:focus:border-[#00d1ff]"
                style={{
                  borderColor: error ? '#ef4444' : digit ? '#00d1ff' : undefined,
                  boxShadow: digit && !error ? '0 0 0 3px rgba(0,209,255,0.08)' : 'none',
                  fontSize: 22,
                  opacity: isLoading ? 0.5 : 1,
                }}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-2 mb-4 text-sm text-slate-400 dark:text-[#7a9bb5]">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#00d1ff" strokeWidth="4"/>
                <path className="opacity-75" fill="#00d1ff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Tekshirilmoqda...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
              <i className="fa fa-exclamation-circle" style={{ fontSize: 14 }} />
              {error}
            </div>
          )}

          {countdown !== null && countdown > 0 && !isLoading && !error && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-[#7a9bb5] mt-3">
              <i className="fa fa-clock" style={{ fontSize: 13 }} />
              Kod {countdown} soniyada muddati tugaydi
            </div>
          )}
          {countdown === 0 && !isLoading && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 mt-3">
              <i className="fa fa-warning" style={{ fontSize: 14 }} />
              Kod muddati o'tdi. Botda /login yuboring
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
