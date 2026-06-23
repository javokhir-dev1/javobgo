'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Inbox, MessageSquare, Send, AlertCircle, CheckCircle2, Info, Layers, ShieldAlert, CheckCircle, Activity } from 'lucide-react';
import { getLogs, getTodayStats } from '@/lib/api';
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
  createdAt?: string;
}

type Filter = 'all' | 'success' | 'error' | 'info';

const TYPE_STYLES = {
  success: {
    dot: 'bg-emerald-500',
    glow: 'shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200/60 dark:border-emerald-800/30',
    icon: CheckCircle,
  },
  error: {
    dot: 'bg-red-500',
    glow: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]',
    text: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200/60 dark:border-red-800/30',
    icon: ShieldAlert,
  },
  info: {
    dot: 'bg-blue-500',
    glow: 'shadow-[0_0_6px_rgba(59,130,246,0.5)]',
    text: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200/60 dark:border-blue-800/30',
    icon: Activity,
  },
};

const FILTERS: { key: Filter; labelKey: string; icon: any }[] = [
  { key: 'all',     labelKey: 'logs.filterAll', icon: Layers },
  { key: 'success', labelKey: 'logs.filterSuccess', icon: CheckCircle },
  { key: 'error',   labelKey: 'logs.filterError', icon: ShieldAlert },
  { key: 'info',    labelKey: 'logs.filterInfo', icon: Activity },
];

function StatCard({
  value, label, icon: Icon, bgClass, textClass,
}: { value: number | string; label: string; icon: any; bgClass: string; textClass: string }) {
  return (
    <div className="relative bg-surface-container-lowest border border-outline-variant/30 rounded-2xl px-5 py-4 flex items-center gap-4 overflow-hidden group hover:shadow-md hover:border-outline-variant/50 hover:-translate-y-0.5 transition-all duration-300">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 opacity-30 transition-opacity group-hover:opacity-50 ${bgClass.split(' ')[0].replace('/10', '/30')}`} />
      <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass} border border-outline-variant/10 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} className={textClass} />
      </div>
      <div className="relative z-10">
        <p className="text-[26px] font-bold text-on-surface leading-none tracking-tight">{value}</p>
        <p className="text-[13px] font-medium text-on-surface-variant mt-1.5">{label}</p>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const connected = useInstagramStatus();
  const { t } = useLanguage();
  const [logs, setLogs]       = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>('all');
  const [stats, setStats]     = useState({ success: 0, error: 0, info: 0, total: 0, commentReplies: 0, dmUsers: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      getLogs(200).then(d => {
        const list: Log[] = d.logs || [];
        setLogs(list);
        setStats(prev => ({
          ...prev,
          success: list.filter(l => l.type === 'success').length,
          error:   list.filter(l => l.type === 'error').length,
          info:    list.filter(l => l.type === 'info').length,
          total:   list.length,
        }));
      }),
      getTodayStats().then(d => {
        setStats(prev => ({
          ...prev,
          commentReplies: d.commentReplies ?? 0,
          dmUsers:        d.dmUsers ?? 0,
        }));
      }),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { if (connected !== false) load(); }, [connected]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  const ts = (log: Log) => {
    const d = new Date(log.createdAt ?? log.timestamp);
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const dateLabel = (log: Log) => {
    const d = new Date(log.createdAt ?? log.timestamp);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('logs.today');
    if (d.toDateString() === yesterday.toDateString()) return t('logs.yesterday');
    return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
  };

  // date separators
  const withSeparators = (() => {
    const out: ({ type: 'separator'; label: string } | { type: 'log'; log: Log })[] = [];
    let lastDate = '';
    for (const log of filtered) {
      const label = dateLabel(log);
      if (label !== lastDate) {
        out.push({ type: 'separator', label });
        lastDate = label;
      }
      out.push({ type: 'log', log });
    }
    return out;
  })();

  return (
    
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <header className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-[28px] font-semibold text-on-surface tracking-tight">{t('logs.title')}</h2>
              <p className="text-[15px] text-on-surface-variant mt-1">{t('logs.subtitle')}</p>
            </div>
            <button onClick={load}
              className="group relative flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold rounded-xl bg-surface-container hover:bg-surface-container-high transition-all active:scale-95 text-on-surface overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <RefreshCw size={16} className={`text-primary transition-transform ${loading ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} />
              {t('logs.refresh')}
            </button>
          </header>

          {/* Stat cards */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl px-5 py-4 h-[72px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard value={stats.total}          label={t('logs.statTotal')}        icon={Info}          bgClass="bg-purple-500/10 dark:bg-purple-500/20" textClass="text-purple-600 dark:text-purple-400" />
              <StatCard value={stats.success}        label={t('logs.statSuccess')}      icon={CheckCircle2}  bgClass="bg-emerald-500/10 dark:bg-emerald-500/20" textClass="text-emerald-600 dark:text-emerald-400" />
              <StatCard value={stats.error}          label={t('logs.statErrors')}       icon={AlertCircle}   bgClass="bg-red-500/10 dark:bg-red-500/20" textClass="text-red-600 dark:text-red-400" />
              <StatCard value={stats.commentReplies} label={t('logs.statComments')}     icon={MessageSquare} bgClass="bg-blue-500/10 dark:bg-blue-500/20" textClass="text-blue-600 dark:text-blue-400" />
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 mb-5 bg-surface-container-low/50 border border-outline-variant/30 p-1.5 rounded-2xl w-fit backdrop-blur-sm">
            {FILTERS.map(f => {
              const count = f.key === 'all' ? logs.length
                : logs.filter(l => l.type === f.key).length;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-300 ${
                    filter === f.key
                      ? 'text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {filter === f.key && (
                    <div className="absolute inset-0 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 -z-10" />
                  )}
                  <Icon size={14} className={filter === f.key ? 'text-primary' : 'text-on-surface-variant/70'} />
                  {t(f.labelKey)}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                    filter === f.key
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-container text-on-surface-variant/70'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Log list */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-start px-6 py-4 border-b border-outline-variant/20 last:border-b-0">
                    <div className="mt-1.5 w-8 h-8 rounded-xl bg-surface-container shrink-0 animate-pulse" />
                    <div className="ml-4 flex-1 space-y-2">
                      <div className="h-4 w-40 bg-surface-container rounded animate-pulse" />
                      <div className="h-3 w-56 bg-surface-container rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-10 bg-surface-container rounded animate-pulse ml-4 mt-1" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                <Inbox size={40} className="mb-3 opacity-40" />
                <p className="text-[15px]">
                  {filter === 'all' ? t('logs.emptyAll') : `${t(FILTERS.find(f=>f.key===filter)?.labelKey ?? '')} ${t('logs.emptyFilter')}`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {withSeparators.map((item, idx) => {
                  if (item.type === 'separator') {
                    return (
                      <div key={`sep-${idx}`} className="flex items-center gap-3 px-6 py-2 bg-surface-container-low/50 border-b border-outline-variant/20">
                        <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{item.label}</span>
                      </div>
                    );
                  }
                  const log = item.log;
                  const style = TYPE_STYLES[log.type] ?? TYPE_STYLES.info;
                  const Icon = style.icon;
                  return (
                    <div key={log.id}
                      className="flex items-start px-6 py-3.5 border-b border-outline-variant/20 last:border-b-0 hover:bg-surface-container-low/60 transition-colors group">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${style.bg} border ${style.border} shadow-sm transition-transform group-hover:scale-110 duration-300`}>
                        <Icon size={18} className={style.text} />
                      </div>

                      {/* Content */}
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={`text-[14px] font-semibold ${style.text}`}>{log.action}</span>
                          {log.user && (
                            <span className="text-[12px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md">
                              @{log.user}
                            </span>
                          )}
                        </div>
                        {log.userMessage && (
                          <p className="text-[12px] text-on-surface-variant/60 mt-0.5 truncate max-w-lg">
                            <span className="mr-1 opacity-50">↳</span>{log.userMessage}
                          </p>
                        )}
                        {log.message && (
                          <p className="text-[13px] text-on-surface-variant mt-0.5 truncate max-w-lg">{log.message}</p>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-[12px] text-on-surface-variant/50 ml-4 shrink-0 mt-1 whitespace-nowrap">
                        {ts(log)}
                      </span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
    
  );
}
