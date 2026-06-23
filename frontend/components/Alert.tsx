'use client';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  type: 'success' | 'error' | null;
  message: string;
}

export default function Alert({ type, message }: Props) {
  if (!type) return null;
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40',
    error:   'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40',
  };
  const Icon = type === 'success' ? CheckCircle2 : XCircle;
  return (
    <div className={`px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2 ${styles[type]}`}>
      <Icon size={16} className="flex-shrink-0" />
      {message}
    </div>
  );
}
