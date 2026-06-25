'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound } from 'next/navigation';
import {
  Users, Activity, Shield, AlertTriangle, CheckCircle2,
  RefreshCw, Settings, Ban, Unlock, ChevronLeft, ChevronRight,
  Clock, Zap, TrendingUp, Globe, Lock, Key, Download, Power,
  BarChart2, XCircle, Bot, Cpu,
} from 'lucide-react';
import {
  adminGetStats, adminGetHourlyStats, adminGetUsers, adminGetRateLimit,
  adminGetConfig, adminUpdateConfig, adminBlockAccount, adminUnblockAccount,
  adminGetRequests, adminGetEndpoints, adminSetUserRole, adminSetMaintenance,
  adminSetCustomLimit, adminGetIgTokens, adminExportRequests,
  adminGetAutomations, adminGetAgents,
} from '@/lib/api';

type Tab = 'overview' | 'users' | 'ratelimit' | 'igtokens' | 'automations' | 'agents';

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: any) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-500/10 text-blue-400',
    green:  'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red:    'bg-red-500/10 text-red-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex gap-4 items-center">
      <div className={`rounded-lg p-3 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ok:       'bg-green-500/20 text-green-400',
    warning:  'bg-yellow-500/20 text-yellow-400',
    exceeded: 'bg-red-500/20 text-red-400',
    blocked:  'bg-red-700/30 text-red-300',
    critical: 'bg-red-500/20 text-red-400',
    expired:  'bg-red-700/30 text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-white/10 text-white/50'}`}>
      {status}
    </span>
  );
}

/** Sodda SVG bar chart — tashqi kutubxonasiz */
function HourlyChart({ data }: { data: { hour: string; count: number; errors: number }[] }) {
  if (!data || data.length === 0) return <p className="text-white/30 text-sm text-center py-8">Ma'lumot yo'q</p>;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const W = 800, H = 140, barW = Math.floor(W / data.length) - 2, padB = 24;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + padB}`} className="w-full" style={{ minWidth: 500 }}>
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d.count / maxCount) * H));
          const errH = d.count > 0 ? Math.round((d.errors / d.count) * barH) : 0;
          const x    = i * (barW + 2);
          return (
            <g key={i}>
              {/* ok part */}
              <rect x={x} y={H - barH} width={barW} height={barH - errH}
                fill="rgba(168,85,247,0.5)" rx={2} />
              {/* error part */}
              {errH > 0 && (
                <rect x={x} y={H - errH} width={barW} height={errH}
                  fill="rgba(239,68,68,0.7)" rx={1} />
              )}
              {/* hour label every 4 bars */}
              {i % 4 === 0 && (
                <text x={x + barW / 2} y={H + 16} textAnchor="middle"
                  fontSize={9} fill="rgba(255,255,255,0.3)">
                  {d.hour}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-2 justify-end text-xs text-white/40">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-purple-400/50" /> So'rovlar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-red-400/70" /> Xatolar</span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab]             = useState<Tab>('overview');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const [stats, setStats]         = useState<any>(null);
  const [hourly, setHourly]       = useState<any[]>([]);
  const [users, setUsers]         = useState<any>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [rateLimit, setRateLimit] = useState<any[]>([]);
  const [config, setConfig]       = useState<any>(null);
  const [requests, setRequests]   = useState<any>(null);
  const [reqPage, setReqPage]     = useState(1);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [igTokens, setIgTokens]   = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [agents, setAgents]       = useState<any[]>([]);

  const [editMax, setEditMax]     = useState('');
  const [editWarn, setEditWarn]   = useState('');
  const [editDmLimit, setEditDmLimit] = useState('');
  const [editCommentLimit, setEditCommentLimit] = useState('');
  const [saving, setSaving]       = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Custom limit editing state: igId -> draft string
  const [customLimitDraft, setCustomLimitDraft] = useState<Record<string, string>>({});
  const [customLimitSaving, setCustomLimitSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'overview') {
        const [s, h] = await Promise.all([adminGetStats(), adminGetHourlyStats()]);
        setStats(s);
        setHourly(h);
        setMaintenance(s.maintenanceMode ?? false);
      } else if (tab === 'users') {
        const u = await adminGetUsers(usersPage, 20);
        setUsers(u);
      } else if (tab === 'ratelimit') {
        const [rl, cfg] = await Promise.all([adminGetRateLimit(), adminGetConfig()]);
        setRateLimit(rl);
        setConfig(cfg);
        setEditMax(String(cfg.maxRequestsPerHour));
        setEditWarn(String(cfg.warningThresholdPct));
        setEditDmLimit(String(cfg.dmLimit ?? 10));
        setEditCommentLimit(String(cfg.commentLimit ?? 10));
      } else if (tab === 'requests') {
        const r = await adminGetRequests(reqPage, 50);
        setRequests(r);
      } else if (tab === 'endpoints') {
        const e = await adminGetEndpoints();
        setEndpoints(e);
      } else if (tab === 'igtokens') {
        const t = await adminGetIgTokens();
        setIgTokens(t);
      } else if (tab === 'automations') {
        const a = await adminGetAutomations();
        setAutomations(a);
      } else if (tab === 'agents') {
        const ag = await adminGetAgents();
        setAgents(ag);
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setIsNotFound(true);
      } else if (err?.response?.status === 401) {
        setError('Tizimga kiring');
      } else {
        setError('Ma\'lumot yuklanmadi');
      }
    } finally {
      setLoading(false);
    }
  }, [tab, usersPage, reqPage]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await adminUpdateConfig({ 
        maxRequestsPerHour: +editMax, 
        warningThresholdPct: +editWarn,
        dmLimit: +editDmLimit,
        commentLimit: +editCommentLimit
      });
      await load();
    } finally { setSaving(false); }
  };

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true);
    try {
      await adminSetMaintenance(!maintenance);
      setMaintenance(!maintenance);
    } finally { setMaintenanceLoading(false); }
  };

  const saveCustomLimit = async (igId: string) => {
    const val = customLimitDraft[igId];
    const parsed = val === '' || val === '0' ? null : parseInt(val, 10);
    setCustomLimitSaving(igId);
    try {
      await adminSetCustomLimit(igId, isNaN(parsed as number) ? null : parsed);
      await load();
      setCustomLimitDraft(prev => { const n = { ...prev }; delete n[igId]; return n; });
    } finally { setCustomLimitSaving(null); }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview',  label: 'Umumiy',      icon: Activity  },
    { key: 'users',     label: 'Userlar',     icon: Users     },
    { key: 'ratelimit', label: 'Rate Limit',  icon: Shield    },
    { key: 'igtokens',  label: 'IG Akkauntlar', icon: Key       },
    { key: 'automations',label: 'Avtomatizatsiyalar', icon: Zap },
    { key: 'agents',    label: 'AI Agentlar', icon: Bot       },
  ];

  if (isNotFound) {
    notFound();
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white gap-4">
        <Lock size={48} className="text-red-400" />
        <p className="text-xl font-semibold">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-white/10 rounded-lg text-sm">Qayta urinish</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden relative z-0 w-full">
      
      {/* Sidebar (Yon menyu) */}
      <div className="w-64 border-r border-white/10 flex flex-col flex-shrink-0 bg-[#0f0f0f]">
        {/* Header / Logo */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <Shield size={24} className="text-purple-400" />
          <span className="text-lg font-bold tracking-tight">Admin Panel</span>
        </div>
        
        {/* Tabs as vertical nav */}
        <div className="flex flex-col p-4 gap-1.5 overflow-y-auto flex-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); }}
              className={`flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
                tab === t.key
                  ? 'bg-purple-500/20 text-purple-400 font-medium border border-purple-500/30 shadow-[0_0_15px_-3px_rgba(168,85,247,0.15)]'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80 border border-transparent'
              }`}
            >
              <t.icon size={16} className={tab === t.key ? 'text-purple-400' : 'text-white/40'} />
              {t.label}
            </button>
          ))}
        </div>
        
        {/* Back to App */}
        <div className="p-4 border-t border-white/10 mt-auto">
          <button onClick={() => window.location.href = '/'} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-sm font-medium">
            <ChevronLeft size={16} />
            Asosiy dasturga qaytish
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-end bg-[#0a0a0a]">
          <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition text-sm text-white/60 hover:text-white">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Yangilash
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
        {loading && (
          <div className="flex justify-center py-16">
            <RefreshCw size={24} className="animate-spin text-white/30" />
          </div>
        )}

        {/* ── OVERVIEW ───────────────────────────────────── */}
        {!loading && tab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Maintenance Mode toggle */}
            <div className={`rounded-xl border p-4 flex items-center justify-between ${
              maintenance ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-[#1a1a1a]'
            }`}>
              <div className="flex items-center gap-3">
                <Power size={18} className={maintenance ? 'text-red-400' : 'text-white/40'} />
                <div>
                  <p className="font-medium text-sm">Texnik ish rejimi (Maintenance)</p>
                  <p className="text-xs text-white/40">
                    {maintenance ? 'Barcha API so\'rovlari bloklangan (admin bundan mustasno)' : 'Tizim odatdagidek ishlayapti'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleMaintenance}
                disabled={maintenanceLoading}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  maintenance ? 'bg-red-500' : 'bg-white/20'
                } disabled:opacity-50`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  maintenance ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard icon={Users}        label="Jami userlar"       value={stats.totalUsers}        color="blue" />
              <StatCard icon={Activity}     label="IG akkauntlar"      value={stats.totalIgAccounts}   color="purple" />
              <StatCard icon={TrendingUp}   label="So'nggi 1 soat"     value={stats.requestsLastHour}  sub="so'rov" color="green" />
              <StatCard icon={TrendingUp}   label="So'nggi 24 soat"    value={stats.requestsLastDay}   sub="so'rov" color="blue" />
              <StatCard icon={Clock}        label="O'rtacha kechikish" value={`${stats.avgLatencyMs}ms`} color="yellow" />
              <StatCard icon={AlertTriangle} label="Xato darajasi"     value={`${stats.errorRate}%`}   color={stats.errorRate > 5 ? 'red' : 'green'} />
              <StatCard icon={Globe}        label="Jami so'rovlar"     value={stats.totalRequests}     color="purple" />
              <StatCard icon={Shield}       label="Limit / soat"       value={stats.rateLimitConfig?.maxRequestsPerHour} sub="har bir IG akkaunt" color="blue" />
            </div>

            {/* Hourly traffic chart */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                <BarChart2 size={16} className="text-purple-400" /> So'nggi 24 soat trafigi
              </h3>
              <HourlyChart data={hourly} />
            </div>
          </div>
        )}

        {/* ── USERS ──────────────────────────────────────── */}
        {!loading && tab === 'users' && users && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-3">Foydalanuvchi</th>
                    <th className="text-left py-2 px-3">Telegram ID</th>
                    <th className="text-center py-2 px-3">IG akkauntlar</th>
                    <th className="text-center py-2 px-3">1 soatda</th>
                    <th className="text-center py-2 px-3">Jami</th>
                    <th className="text-center py-2 px-3">Kechikish</th>
                    <th className="text-center py-2 px-3">Rol</th>
                    <th className="text-center py-2 px-3">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((u: any) => (
                    <tr key={u.telegram_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="font-medium">{u.first_name}</div>
                        <div className="text-xs text-white/40">@{u.username || '—'}</div>
                      </td>
                      <td className="py-2 px-3 text-white/60 font-mono text-xs">{u.telegram_id}</td>
                      <td className="py-2 px-3 text-center text-white/70">{u.igAccountsCount}</td>
                      <td className="py-2 px-3 text-center text-white/70">{u.reqLastHour}</td>
                      <td className="py-2 px-3 text-center text-white/50">{u.reqTotal}</td>
                      <td className="py-2 px-3 text-center text-white/50">{u.avgLatency}ms</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/50'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={async () => { await adminSetUserRole(u.telegram_id, u.role === 'admin' ? 'user' : 'admin'); load(); }}
                          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
                        >
                          {u.role === 'admin' ? 'User qil' : 'Admin qil'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>Jami: {users.total} ta</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setUsersPage(p => Math.max(1, p - 1))} disabled={usersPage === 1}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span>{usersPage} / {users.totalPages}</span>
                <button onClick={() => setUsersPage(p => Math.min(users.totalPages, p + 1))} disabled={usersPage >= users.totalPages}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── RATE LIMIT ─────────────────────────────────── */}
        {!loading && tab === 'ratelimit' && (
          <div className="space-y-6">
            {config && (
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                  <Settings size={16} className="text-purple-400" /> Global sozlamalar
                </h3>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Soatlik bot javoblari (har bir IG akkaunt)</label>
                    <input type="number" value={editMax} onChange={e => setEditMax(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white w-36 focus:outline-none focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Ogohlantirish chegarasi (%)</label>
                    <input type="number" value={editWarn} onChange={e => setEditWarn(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white w-28 focus:outline-none focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Maks. DM Limit</label>
                    <input type="number" value={editDmLimit} onChange={e => setEditDmLimit(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Maks. Izoh Limit</label>
                    <input type="number" value={editCommentLimit} onChange={e => setEditCommentLimit(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-purple-400" />
                  </div>
                  <button onClick={saveConfig} disabled={saving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition disabled:opacity-50">
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-3">IG akkaunt</th>
                    <th className="text-left py-2 px-3">Telegram ID</th>
                    <th className="text-center py-2 px-3">Ishlatildi</th>
                    <th className="text-center py-2 px-3">Qoldi</th>
                    <th className="text-left py-2 px-3">Progress</th>
                    <th className="text-center py-2 px-3">Reset</th>
                    <th className="text-center py-2 px-3">Maxsus limit</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-center py-2 px-3">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimit.map((row: any) => (
                    <tr key={row.instagram_account_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="font-medium">@{row.instagram_username || '—'}</div>
                        <div className="text-xs text-white/40 font-mono">{row.instagram_account_id}</div>
                      </td>
                      <td className="py-2 px-3 text-white/50 font-mono text-xs">{row.telegram_id}</td>
                      <td className="py-2 px-3 text-center font-medium">{row.usedLastHour}</td>
                      <td className="py-2 px-3 text-center text-white/60">{row.remaining}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${
                              row.usedPct >= 100 ? 'bg-red-500' : row.usedPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`} style={{ width: `${Math.min(100, row.usedPct)}%` }} />
                          </div>
                          <span className="text-xs text-white/40 w-10 text-right">{row.usedPct}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center text-xs text-white/40">
                        {row.resetAt ? new Date(row.resetAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            placeholder={String(config?.maxRequestsPerHour ?? 200)}
                            value={customLimitDraft[row.instagram_account_id] ?? (row.customRateLimit ?? '')}
                            onChange={e => setCustomLimitDraft(prev => ({ ...prev, [row.instagram_account_id]: e.target.value }))}
                            className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
                          />
                          {customLimitDraft[row.instagram_account_id] !== undefined && (
                            <button
                              onClick={() => saveCustomLimit(row.instagram_account_id)}
                              disabled={customLimitSaving === row.instagram_account_id}
                              className="text-xs px-2 py-1 bg-purple-600/60 hover:bg-purple-500/60 rounded transition disabled:opacity-50"
                            >
                              {customLimitSaving === row.instagram_account_id ? '...' : 'OK'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center"><StatusBadge status={row.status} /></td>
                      <td className="py-2 px-3 text-center">
                        {row.isBlocked ? (
                          <button onClick={async () => { await adminUnblockAccount(row.instagram_account_id); load(); }}
                            className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition">
                            <Unlock size={10} /> Ochish
                          </button>
                        ) : (
                          <button onClick={async () => { await adminBlockAccount(row.instagram_account_id); load(); }}
                            className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition">
                            <Ban size={10} /> Bloklash
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rateLimit.length === 0 && (
                    <tr><td colSpan={9} className="py-8 text-center text-white/30">IG akkauntlar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── REQUESTS ───────────────────────────────────── */}
        {!loading && tab === 'requests' && requests && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <a
                href={adminExportRequests()}
                download
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
              >
                <Download size={14} /> CSV yuklab olish
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-3">Vaqt</th>
                    <th className="text-left py-2 px-3">Metod</th>
                    <th className="text-left py-2 px-3">Endpoint</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-center py-2 px-3">Kechikish</th>
                    <th className="text-left py-2 px-3">Telegram ID</th>
                    <th className="text-left py-2 px-3">IG akkaunt</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.data.map((r: any) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-1.5 px-3 text-xs text-white/40">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-1.5 px-3">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          r.method === 'GET'    ? 'bg-blue-500/20 text-blue-300'   :
                          r.method === 'POST'   ? 'bg-green-500/20 text-green-300' :
                          r.method === 'DELETE' ? 'bg-red-500/20 text-red-300'     :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>{r.method}</span>
                      </td>
                      <td className="py-1.5 px-3 text-xs font-mono text-white/70 max-w-xs truncate">{r.endpoint}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={`text-xs font-bold ${
                          r.statusCode < 300 ? 'text-green-400' : r.statusCode < 500 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{r.statusCode}</span>
                      </td>
                      <td className="py-1.5 px-3 text-center text-xs text-white/50">{r.durationMs}ms</td>
                      <td className="py-1.5 px-3 text-xs text-white/40 font-mono">{r.telegram_id || '—'}</td>
                      <td className="py-1.5 px-3 text-xs text-white/40">{r.instagram_account_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>Jami: {requests.total} ta</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setReqPage(p => Math.max(1, p - 1))} disabled={reqPage === 1}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span>{reqPage} / {requests.totalPages}</span>
                <button onClick={() => setReqPage(p => Math.min(requests.totalPages, p + 1))} disabled={reqPage >= requests.totalPages}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── ENDPOINTS ──────────────────────────────────── */}
        {!loading && tab === 'endpoints' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left py-2 px-3">Endpoint</th>
                  <th className="text-center py-2 px-3">So'rovlar (24s)</th>
                  <th className="text-center py-2 px-3">O'rtacha ms</th>
                  <th className="text-center py-2 px-3">Xato %</th>
                  <th className="text-left py-2 px-3">Yuklanish</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 font-mono text-xs text-white/80">{e.endpoint}</td>
                    <td className="py-2 px-3 text-center font-medium">{e.count}</td>
                    <td className="py-2 px-3 text-center text-white/60">
                      <span className={e.avgMs > 1000 ? 'text-red-400' : e.avgMs > 500 ? 'text-yellow-400' : ''}>
                        {e.avgMs}ms
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={e.errorRate > 10 ? 'text-red-400' : e.errorRate > 5 ? 'text-yellow-400' : 'text-green-400'}>
                        {e.errorRate}%
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="h-1.5 bg-white/10 rounded-full w-full max-w-24">
                        <div className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, (e.count / (endpoints[0]?.count || 1)) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
                {endpoints.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-white/30">Ma'lumot yo'q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── IG TOKENS ──────────────────────────────────── */}
        {!loading && tab === 'igtokens' && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Key size={16} className="text-purple-400" /> Barcha Instagram Akkauntlar
            </h3>
            <p className="text-xs text-white/40">
              Instagram long token ~60 kun davom etadi. Token tugashidan 14 kun oldin ogohlantirish ko'rsatiladi.
              Asterisk (*) — aniq muddat saqlanmagan, taxminiy hisob (ulangan sana + 60 kun).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-3">IG akkaunt</th>
                    <th className="text-left py-2 px-3">Telegram ID</th>
                    <th className="text-center py-2 px-3">Token tugash sanasi</th>
                    <th className="text-center py-2 px-3">Qolgan kun</th>
                    <th className="text-center py-2 px-3">Holat</th>
                    <th className="text-center py-2 px-3">Faol</th>
                  </tr>
                </thead>
                <tbody>
                  {igTokens.map((t: any) => (
                    <tr key={t.instagram_account_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3">
                        <div className="font-medium">@{t.instagram_username || '—'}</div>
                        <div className="text-xs text-white/40 font-mono">{t.instagram_account_id}</div>
                      </td>
                      <td className="py-2 px-3 text-white/50 font-mono text-xs">{t.telegram_id}</td>
                      <td className="py-2 px-3 text-center text-xs">
                        {new Date(t.token_expires_at).toLocaleDateString()}
                        {!t.token_expires_known && <span className="text-white/30 ml-1">*</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-bold text-sm ${
                          t.daysLeft <= 0 ? 'text-red-400' :
                          t.daysLeft <= 7 ? 'text-red-400' :
                          t.daysLeft <= 14 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {t.daysLeft <= 0 ? '0' : t.daysLeft}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center"><StatusBadge status={t.status} /></td>
                      <td className="py-2 px-3 text-center">
                        {t.is_active
                          ? <CheckCircle2 size={16} className="text-green-400 mx-auto" />
                          : <XCircle      size={16} className="text-red-400 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                  {igTokens.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-white/30">IG akkauntlar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
        )}

        {/* ── AUTOMATIONS ────────────────────────────────── */}
        {!loading && tab === 'automations' && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Zap size={16} className="text-purple-400" /> Barcha Avtomatizatsiyalar
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-left py-2 px-3">ID</th>
                    <th className="text-left py-2 px-3">Nomi</th>
                    <th className="text-left py-2 px-3">IG Akkaunt</th>
                    <th className="text-center py-2 px-3">Holat</th>
                    <th className="text-center py-2 px-3">Izoh/DM</th>
                    <th className="text-center py-2 px-3">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {automations.map((a: any) => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 font-mono text-white/50">#{a.id}</td>
                      <td className="py-2 px-3 font-medium">{a.name}</td>
                      <td className="py-2 px-3 text-white/70">
                        {a.instagram_username ? `@${a.instagram_username}` : 'Barcha'}
                        <br />
                        <span className="text-xs text-white/40 font-mono">{a.telegram_id}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {a.isActive
                          ? <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-medium">Faol</span>
                          : <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-medium">To'xtatilgan</span>}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        <div className="flex gap-2 justify-center">
                          {a.replyEnabled ? <span className="text-blue-400 border border-blue-400/30 px-1.5 rounded">Izoh</span> : <span className="text-white/20 border border-white/10 px-1.5 rounded">Izoh</span>}
                          {a.dmEnabled ? <span className="text-purple-400 border border-purple-400/30 px-1.5 rounded">DM</span> : <span className="text-white/20 border border-white/10 px-1.5 rounded">DM</span>}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center text-xs text-white/50">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {automations.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-white/30">Avtomatizatsiyalar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AGENTS ─────────────────────────────────────── */}
        {!loading && tab === 'agents' && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Bot size={16} className="text-purple-400" /> Barcha AI Agentlar
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="text-center py-2 px-3 w-10">#</th>
                    <th className="text-left py-2 px-3">Agent Nomi</th>
                    <th className="text-left py-2 px-3">Tavsif / Prompt</th>
                    <th className="text-left py-2 px-3">IG Akkaunt / Egasi</th>
                    <th className="text-center py-2 px-3">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((ag: any) => (
                    <tr key={ag.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 text-center text-xl">{ag.emoji}</td>
                      <td className="py-2 px-3 font-medium text-white">{ag.name}</td>
                      <td className="py-2 px-3">
                        <div className="text-xs text-white/70 mb-1">{ag.description || 'Tavsif yo\'q'}</div>
                        <div className="text-[10px] text-white/40 max-w-xs truncate">{ag.systemPrompt}</div>
                      </td>
                      <td className="py-2 px-3 text-white/70">
                        {ag.instagram_username ? `@${ag.instagram_username}` : 'Umumiy'}
                        <br />
                        <span className="text-xs text-white/40 font-mono">{ag.telegram_id}</span>
                      </td>
                      <td className="py-2 px-3 text-center text-xs text-white/50">
                        {new Date(ag.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {agents.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-white/30">AI Agentlar yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
