'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Zap, Mail, MessageSquare, Users, MessageCircle, ArrowRight, FileText } from 'lucide-react';
import { getInstagramStatus, getTodayStats, getLogs, getCommentRules } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

import { useInstagramStatus } from '@/context/InstagramContext';
import { useLanguage } from '@/context/LanguageContext';

interface Log {
  id: number;
  type: 'success' | 'error' | 'info';
  action: string;
  message: string;
  user: string;
  userMessage?: string;
  timestamp: string;
}

const logDotColor: Record<string, string> = {
  success: 'bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.4)]',
  error:   'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]',
  info:    'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]',
};

const logActionColor: Record<string, string> = {
  success: 'text-[#00885d]',
  error:   'text-red-500',
  info:    'text-blue-500',
};

export default function DashboardPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const connected = useInstagramStatus();
  const [account,      setAccount]      = useState<any>(null);
  const [stats,        setStats]        = useState<{ commentReplies: number; dmUsers: number } | null>(null);
  const [activeRules,  setActiveRules]  = useState<number | null>(null);
  const [logs,         setLogs]         = useState<Log[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (connected === false) return;
    getInstagramStatus().then(d => {
      setAccount(d.account);
      Promise.allSettled([
        getTodayStats().then(d => setStats(d)),
        getLogs(8).then(d => setLogs(d.logs || [])),
        getCommentRules().then(d => {
          const n = (d.rules || []).filter((r: any) => r.postId !== '__global__' && r.isActive).length;
          setActiveRules(n);
        }),
      ]).finally(() => setLoading(false));
    }).catch(() => {});
  }, [connected]);

  const statCards = [
    {
      label: t('dashboard.statComments'),
      value: stats?.commentReplies ?? null,
      icon: MessageSquare,
      iconBg: 'bg-[#ebebfc] text-[#7C3AED]',
    },
    {
      label: t('dashboard.statDMs'),
      value: stats?.dmUsers ?? null,
      icon: Mail,
      iconBg: 'bg-[#f3ebfc] text-[#8B5CF6]',
    },
    {
      label: t('dashboard.statActiveRules'),
      value: activeRules,
      icon: Zap,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
    },
  ];

  const quickActions = [
    { href: '/automation',          icon: Zap,            label: t('dashboard.actionAutomation'),    desc: '' },
    { href: '/automation/comments', icon: MessageCircle,  label: t('dashboard.actionComments'),    desc: t('dashboard.actionCommentsDesc') },
    { href: '/logs',                icon: FileText,       label: t('nav.logs'),             desc: t('dashboard.actionLogsDesc') },
  ];

  return (
    
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <main className="max-w-5xl mx-auto space-y-7">

          {/* Welcome Banner */}
          <section className="relative rounded-2xl overflow-hidden p-6 sm:p-8 text-white"
            style={{ background: theme === 'dark'
              ? 'linear-gradient(135deg, #0f0520 0%, #1e0a4a 40%, #2d1060 70%, #1a0533 100%)'
              : 'linear-gradient(135deg, #7C3AED 0%, #6344d8 30%, #8B5CF6 65%, #9b1dc0 100%)'
            }}
          >
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
            {theme === 'dark' && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.25) 0%, transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(99,60,180,0.2) 0%, transparent 50%)' }} />
            )}
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-white/70 mb-1">{t('dashboard.welcome')}</p>
                <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-tight">
                  {account ? `@${account.username}` : 'JavobGo'}
                </h1>
                <p className="text-[14px] text-white/70 mt-1.5">
                  {account ? t('dashboard.accountConnected') : t('dashboard.connectAccount')}
                </p>
                {account?.followers_count != null && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1.5">
                    <Users size={14} className="text-white/80" />
                    <span className="text-[14px] font-semibold text-white">
                      {account.followers_count.toLocaleString()}
                    </span>
                    <span className="text-[13px] text-white/70">{t('dashboard.followers')}</span>
                  </div>
                )}
              </div>
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </div>
            </div>
          </section>

          {/* Statistika kartlari */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map(({ label, value, icon: Icon, iconBg }) => (
              <div key={label} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-sm flex items-center gap-4">
                <div className={`w-11 h-11 shrink-0 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-on-surface-variant leading-[18px] mb-1">{label}</p>
                  <p className="text-[26px] font-bold text-on-surface leading-none">
                    {value === null ? (
                      <span className="inline-block w-8 h-6 bg-surface-container rounded animate-pulse" />
                    ) : value}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">

            {/* Tezkor harakatlar */}
            <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[16px] font-semibold text-on-surface mb-4">{t('dashboard.quickActions')}</h3>
              <div className="space-y-2">
                {quickActions.map(({ href, icon: Icon, label, desc }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors group">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-primary-fixed flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                      <Icon size={17} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-on-surface leading-tight">{label}</p>
                      <p className="text-[13px] text-on-surface-variant truncate">{desc}</p>
                    </div>
                    <ArrowRight size={15} className="text-outline-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                  </Link>
                ))}
              </div>
            </section>

            {/* So'nggi faollik */}
            <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
                <h3 className="text-[16px] font-semibold text-on-surface">{t('dashboard.recentActivity')}</h3>
                <Link href="/logs" className="text-[13px] text-primary hover:underline font-medium">{t('dashboard.viewAll')}</Link>
              </div>
              <div className="flex flex-col">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-6 py-4 border-b border-outline-variant/30 last:border-b-0">
                      <div className="h-4 w-40 bg-surface-container rounded animate-pulse mb-2" />
                      <div className="h-3 w-24 bg-surface-container rounded animate-pulse" />
                    </div>
                  ))
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                    <Users size={28} className="mb-2 opacity-40" />
                    <p className="text-[14px]">{t('dashboard.emptyActivity')}</p>
                  </div>
                ) : logs.map(log => (
                  <div key={log.id} className="flex items-start px-6 py-4 border-b border-outline-variant/30 last:border-b-0 hover:bg-surface-container-low transition-colors">
                    <span className={`mt-[6px] w-2 h-2 rounded-full shrink-0 ${logDotColor[log.type] ?? logDotColor.info}`} />
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className={`text-[15px] font-medium ${logActionColor[log.type] ?? logActionColor.info}`}>{log.action}</span>
                        {log.user && <span className="text-[13px] font-semibold text-on-surface-variant">@{log.user}</span>}
                      </div>
                      {log.userMessage && (
                        <p className="text-[12px] text-on-surface-variant/60 truncate">
                          <span className="mr-1 text-on-surface-variant/40">↳</span>{log.userMessage}
                        </p>
                      )}
                      {log.message && <p className="text-[14px] text-on-surface-variant mt-0.5 truncate">{log.message}</p>}
                    </div>
                    <span className="text-[12px] text-on-surface-variant/60 ml-4 shrink-0 mt-[2px]">
                      {new Date(log.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </main>
      </div>
    </div>
    
  );
}
