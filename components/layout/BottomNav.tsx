'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Download, FileText, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/posts',     label: 'Posts',     icon: FileText },
  { href: '/import',   label: 'Importer',  icon: Download },
  { href: '/plan',     label: 'Plan',      icon: Calendar },
  { href: '/audit',    label: 'Audit',     icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D14] border-t border-[#2A2A3A] safe-area-pb">
      <div className="flex items-center justify-around px-2 pb-safe">
        {navItems.map(item => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all duration-200 min-w-[60px]',
                active ? 'text-violet-400' : 'text-[#7A7A9D]'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                active ? 'bg-violet-500/20' : 'bg-transparent'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none',
                active ? 'text-violet-400' : 'text-[#7A7A9D]'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
