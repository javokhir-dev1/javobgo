import type { Metadata } from 'next';
import './globals.css';
import ConditionalLayout from '@/components/ConditionalLayout';
import { ThemeProvider } from '@/components/ThemeProvider';
import NavigationProgress from '@/components/NavigationProgress';

export const metadata: Metadata = {
  title: 'JavobGo — Boshqaruv Paneli',
  description: 'JavobGo — Instagram AI Avtomatizatsiya',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-surface antialiased flex h-screen overflow-hidden selection:bg-brand-100 selection:text-brand-900">
        <ThemeProvider>
          <NavigationProgress />
          <ConditionalLayout>{children}</ConditionalLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
