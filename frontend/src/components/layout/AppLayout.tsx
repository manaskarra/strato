'use client';

import { usePathname } from 'next/navigation';
import { TopNav } from '@/components/layout/TopNav';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show TopNav on the landing page
  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
