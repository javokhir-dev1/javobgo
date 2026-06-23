'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { InstagramProvider, useInstagram } from '@/context/InstagramContext';
import InstagramRequired from '@/components/InstagramRequired';

const AUTH_ROUTES = ['/login', '/auth'];

function AppShell({ children }: { children: React.ReactNode }) {
  const { selectedAccount } = useInstagram();
  return (
    <>
      <Sidebar />
      <main
        key={selectedAccount?.instagram_account_id ?? 'no-account'}
        className="ml-64 flex-1 flex flex-col h-full overflow-hidden w-[calc(100%-256px)]"
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
