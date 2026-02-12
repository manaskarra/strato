'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ExpandableTabs } from '@/components/ui/expandable-tabs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CloudSun, LayoutDashboard, PieChart, GraduationCap, TrendingUp } from 'lucide-react';

const navTabs = [
  { title: 'Intelligence', icon: LayoutDashboard },
  { title: 'Portfolio', icon: PieChart },
  { type: 'separator' as const },
  { title: 'Learning Lab', icon: GraduationCap },
  { title: 'Polymarket', icon: TrendingUp },
];

const routes = ['/intelligence', '/portfolio', null, '/learning', '/polymarket'];

function pathnameToTabIndex(pathname: string): number {
  const idx = routes.indexOf(pathname);
  return idx === -1 ? 0 : idx;
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const route = routes[index];
    if (route) router.push(route);
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50 shrink-0">
      <div className="h-full max-w-[1400px] mx-auto px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => router.push('/intelligence')}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shrink-0 group-hover:shadow-md group-hover:shadow-blue-500/20 transition-shadow">
            <CloudSun className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-foreground tracking-tight hidden sm:inline">
            Strato
          </span>
        </button>

        {/* Expandable Tabs Nav */}
        <ExpandableTabs
          tabs={navTabs}
          activeColor="text-primary"
          activeTab={pathnameToTabIndex(pathname)}
          onChange={handleTabChange}
        />

        {/* Theme Toggle */}
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
