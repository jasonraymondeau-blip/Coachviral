'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Film, Zap, BookOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', labelFull: 'Aujourd\'hui', icon: LayoutDashboard },
  { href: '/scripts',   labelFull: 'Reel',        icon: Film },
  { href: '/hooks',     labelFull: 'Hooks',        icon: Zap },
  { href: '/stories',   labelFull: 'Stories',      icon: BookOpen },
  { href: '/plan',      labelFull: 'Plan',         icon: Calendar },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D14]/95 backdrop-blur-md border-t border-[#2A2A3A]">
      <div className="flex items-center justify-around" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {navItems.map(item => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-2 flex-1"
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                active ? 'bg-violet-500/25' : 'bg-transparent'
              )}>
                <Icon className={cn('w-[18px] h-[18px]', active ? 'text-violet-400' : 'text-[#7A7A9D]')} />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none truncate w-full text-center px-1',
                active ? 'text-violet-400' : 'text-[#7A7A9D]'
              )}>
                {item.labelFull}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
