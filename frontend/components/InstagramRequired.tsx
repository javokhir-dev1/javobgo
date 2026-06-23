'use client';
import { useRouter } from 'next/navigation';
import { Instagram } from 'lucide-react';
import { useInstagramStatus } from '@/context/InstagramContext';

interface Props {
  children: React.ReactNode;
}

export default function InstagramRequired({ children }: Props) {
  const router = useRouter();
  const connected = useInstagramStatus();

  if (connected === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (connected === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
          <Instagram size={32} className="text-outline-variant" />
        </div>
        <div>
          <p className="text-[16px] font-semibold text-on-surface mb-1">Instagram ulanmagan</p>
          <p className="text-[14px] text-on-surface-variant">Bu bo'limdan foydalanish uchun Instagram hisobingizni ulang.</p>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="px-5 py-2.5 bg-primary text-white text-[14px] font-medium rounded-xl hover:opacity-90 transition-opacity"
        >
          Sozlamalarga o'tish
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
