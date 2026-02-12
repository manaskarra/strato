'use client';

import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  PieChart,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Sun,
  Moon,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { id: 'intelligence', label: 'Intelligence Hub', icon: LayoutDashboard, description: 'Daily AI market briefs' },
  { id: 'portfolio', label: 'Portfolio Analysis', icon: PieChart, description: 'Analyze your holdings' },
  { id: 'learning', label: 'Learning Lab', icon: GraduationCap, description: 'Interactive workflows' },
  { id: 'polymarket', label: 'Polymarket', icon: TrendingUp, description: 'Prediction market signals' },
];

export function Sidebar({ currentView, onNavigate, collapsed, onToggle }: SidebarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'h-screen flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out relative',
          collapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shrink-0 glow-blue-sm">
            <CloudSun className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-foreground tracking-tight">Strato</h1>
              <p className="text-[10px] text-primary/50 leading-none tracking-wide uppercase">
                Above the Market Noise
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 p-3 pt-4">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const btn = (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                {!collapsed && (
                  <div className="text-left overflow-hidden">
                    <div className="truncate">{item.label}</div>
                    <div className={cn('text-[11px] truncate', isActive ? 'text-primary/60' : 'text-muted-foreground/60')}>
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        {/* Theme Toggle + Collapse */}
        <div className="p-3 border-t border-border space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {!collapsed && <span className="ml-2 text-xs">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Toggle theme</TooltipContent>}
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
