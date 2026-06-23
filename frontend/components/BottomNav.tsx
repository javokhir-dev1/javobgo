'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Zap,
  MessageCircle, Bot, Settings, FileText, User
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const navItems = [
  { href: '/',           icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/automation', icon: Zap,             labelKey: 'nav.automation' },
  { href: '/inbox',      icon: MessageCircle,   labelKey: 'nav.inbox' },
  { href: '/agents',     icon: Bot,             labelKey: 'nav.agents' },
  { href: '/profile',    icon: User,            labelKey: 'profile.title' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[68px] bg-surface-container-lowest border-t border-outline-variant/30 flex md:hidden items-center justify-around z-50 px-2">
      {navItems.map(item => {
        const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className={`flex items-center justify-center w-12 h-8 rounded-full transition-colors ${active ? 'bg-primary/10' : ''}`}>
              <item.icon size={20} className={active ? 'fill-primary/20' : ''} />
            </div>
            <span className="text-[10px] font-medium truncate w-full text-center px-1">
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
