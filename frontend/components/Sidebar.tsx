'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Zap,
  FileText, Settings, ChevronDown, Plus, Check,
  Sun, Moon, Bot, MessageCircle,
} from 'lucide-react';
import { useInstagram, useInstagramRefresh } from '@/context/InstagramContext';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
  { href: '/',           icon: LayoutDashboard, label: 'Bosh sahifa' },
  { href: '/automation', icon: Zap,             label: 'Avtomatizatsiya' },
  { href: '/inbox',      icon: MessageCircle,   label: 'Xabarlar' },
  { href: '/agents',     icon: Bot,             label: 'AI Agentlar' },
  { href: '/logs',       icon: FileText,        label: 'Loglar' },
];

const bottomItems = [
  { href: '/settings', icon: Settings, label: 'Sozlamalar' },
];

const IgIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const NavLink = ({ href, icon: Icon, label, pathname }: { href: string; icon: any; label: string; pathname: string }) => {
  const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[15px] font-medium transition-all duration-200 ${
        active
          ? 'bg-primary-fixed text-primary'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      <Icon size={18} className={`flex-shrink-0 ${active ? 'text-primary' : ''}`} />
      {label}
    </Link>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { accounts, selectedAccount, selectAccount } = useInstagram();
  const refreshInstagram = useInstagramRefresh();
  const [user, setUser] = useState<{ first_name: string; username: string | null; avatar_url: string | null } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    fetch('/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setUser(data))
      .catch(() => {});

    const handler = (e: MessageEvent) => {
      if (e.data?.success !== undefined) {
        setConnecting(false);
        if (e.data.success) refreshInstagram();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Dropdown tashqarisini bosish — yopish
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openOAuth = async () => {
    if (connecting) return;
    setConnecting(true);
    setDropdownOpen(false);
    try {
      const res = await fetch('/api/instagram/oauth-url');
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      const w = 600, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top  = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(url, 'ig_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`);
      popupRef.current = popup;
    } catch {
      setConnecting(false);
    }
  };

  const handleSelect = async (igId: string) => {
    setDropdownOpen(false);
    await selectAccount(igId);
  };

  const avatarSrc = user?.avatar_url
    ? `/uploads/avatars/${user.avatar_url.split('/uploads/avatars/').pop()}`
    : null;

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col z-40">

      {/* Logo */}
      <div className="px-5 py-5 mb-1 flex items-center gap-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 155" width="42" height="42" style={{ flexShrink: 0 }}>
          <path d="M 70 0 C 108.66 0 140 31.34 140 70 C 140 108.66 108.66 140 70 140 C 50 140 35 145 20 155 C 25 135 25 125 20 110 C 7 90 0 80 0 70 C 0 31.34 31.34 0 70 0 Z" fill="#8B5CF6"/>
          <path d="M 70 35 C 70 60 45 70 45 70 C 70 70 70 95 70 95 C 70 70 95 70 95 70 C 70 70 70 60 70 35 Z" fill="#FFFFFF"/>
        </svg>
        <span style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
          <span style={{ color: 'currentColor' }}>Javob</span><span style={{ color: '#8B5CF6' }}>Go</span>
        </span>
      </div>

      {/* Instagram account switcher */}
      <div className="px-3 mb-5 relative" ref={dropdownRef}>
        {selectedAccount ? (
          <>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low hover:bg-surface-container transition-colors text-left group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white flex-shrink-0">
                  <IgIcon />
                </div>
                <span className="text-[14px] font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                  @{selectedAccount.instagram_username}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`text-on-surface-variant flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute left-3 right-3 top-full mt-1.5 bg-surface-container rounded-xl border border-outline-variant/40 shadow-lg overflow-hidden z-50">
                {accounts.map(acc => (
                  <button
                    key={acc.instagram_account_id}
                    onClick={() => handleSelect(acc.instagram_account_id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-high transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white flex-shrink-0">
                      <IgIcon size={13} />
                    </div>
                    <span className="text-[13px] font-medium text-on-surface truncate flex-1">
                      @{acc.instagram_username}
                    </span>
                    {acc.is_selected && <Check size={14} className="text-primary flex-shrink-0" />}
                  </button>
                ))}

                <div className="border-t border-outline-variant/30 mx-2" />

                <button
                  onClick={openOAuth}
                  disabled={connecting}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-high transition-colors text-left text-primary disabled:opacity-60"
                >
                  {connecting
                    ? <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    : <Plus size={16} className="flex-shrink-0" />
                  }
                  <span className="text-[13px] font-medium">
                    {connecting ? 'Ulanmoqda...' : 'Akkaunt qo\'shish'}
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={openOAuth}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
          >
            {connecting ? (
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            ) : (
              <IgIcon />
            )}
            {connecting ? 'Ulanmoqda...' : 'Instagram ulash'}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.href} {...item} pathname={pathname} />)}
      </nav>

      {/* Bottom nav */}
      <div className="px-2 pb-2 border-t border-outline-variant/30 pt-2">
        {bottomItems.map(item => <NavLink key={item.href} {...item} pathname={pathname} />)}
      </div>

      {/* User profile */}
      <div className="border-t border-outline-variant/30">
        <Link
          href="/profile"
          className={`px-4 py-4 flex items-center gap-3 transition-colors ${
            pathname === '/profile' ? 'bg-primary-fixed' : 'hover:bg-surface-container-low'
          }`}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt={user?.first_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {user ? user.first_name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-[14px] font-semibold leading-tight truncate ${pathname === '/profile' ? 'text-primary' : 'text-on-surface'}`}>
              {user?.first_name ?? '...'}
            </p>
            <p className="text-[12px] text-on-surface-variant truncate">
              {user?.username ? `@${user.username}` : 'Telegram foydalanuvchi'}
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); toggleTheme(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
            title={theme === 'dark' ? "Yorug' rejim" : "Qorong'u rejim"}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </Link>
      </div>
    </aside>
  );
}
