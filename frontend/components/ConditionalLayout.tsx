'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { InstagramProvider, useInstagram } from '@/context/InstagramContext';
import InstagramRequired from '@/components/InstagramRequired';

const AUTH_ROUTES = ['/login', '/auth', '/admin', '/privacy-policy'];

function AppShell({ children }: { children: React.ReactNode }) {
  const { selectedAccount } = useInstagram();
  return (
    <>
      <Sidebar />
      <BottomNav />
      <main
        key={selectedAccount?.instagram_account_id ?? 'no-account'}
        className="ml-0 md:ml-64 flex-1 flex flex-col h-full overflow-hidden w-full md:w-[calc(100%-256px)] pb-[68px] md:pb-0"
      >
        {children}
      </main>
    </>
  );
}

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    return <div className="flex flex-col flex-1 h-full overflow-auto">{children}</div>;
  }

  return (
    <InstagramProvider>
      <InstagramRequired>
        <AppShell>{children}</AppShell>
      </InstagramRequired>
    </InstagramProvider>
  );
}
