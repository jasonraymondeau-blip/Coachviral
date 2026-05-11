'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  User,
  FileText,
  BarChart3,
  Download,
  Calendar,
  Zap,
  BookOpen,
  Film,
  Hash,
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Aujourd\'hui',
    items: [
      { href: '/dashboard', label: 'Plan du jour', icon: LayoutDashboard },
      { href: '/connect', label: 'Connecter Instagram', icon: InstagramIcon, highlight: true },
    ],
  },
  {
    label: 'Créer',
    items: [
      { href: '/scripts',  label: 'Reel Builder',      icon: Film },
      { href: '/hooks',    label: 'Hook Engine',        icon: Zap },
      { href: '/stories',  label: 'Story Planner',      icon: BookOpen },
      { href: '/plan',     label: 'Plan de la semaine', icon: Calendar },
    ],
  },
  {
    label: 'Données',
    items: [
      { href: '/posts',    label: 'Mes Posts',     icon: FileText },
      { href: '/import',   label: 'Importer',      icon: Download },
      { href: '/profile',  label: 'Mon Profil',    icon: User },
      { href: '/audit',    label: 'Audit Complet', icon: BarChart3 },
      { href: '/hashtags', label: 'Hashtags',      icon: Hash },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0D0D14] border-r border-[#2A2A3A] flex flex-col z-50">
      <div className="p-6 border-b border-[#2A2A3A]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold text-white">CoachViral</span>
            <p className="text-xs text-[#7A7A9D]">Instagram Growth AI</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-[#555568] uppercase tracking-widest px-4 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href;
                const Icon = item.icon;
                const isHighlight = 'highlight' in item && item.highlight;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer',
                        active
                          ? 'bg-gradient-to-r from-violet-600/20 to-pink-600/10 border border-violet-500/30 text-white'
                          : isHighlight
                          ? 'bg-gradient-to-r from-[#833AB4]/15 to-[#FD1D1D]/10 border border-[#833AB4]/30 text-white hover:border-[#833AB4]/50'
                          : 'text-[#7A7A9D] hover:text-white hover:bg-[#1A1A24]'
                      )}
                    >
                      <Icon className={cn(
                        'w-4 h-4 shrink-0',
                        active ? 'text-violet-400' : isHighlight ? 'text-[#E1306C]' : ''
                      )} />
                      <span className="text-sm font-medium">{item.label}</span>
                      {active && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400"
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#2A2A3A]">
        <div className="rounded-xl bg-gradient-to-br from-violet-600/10 to-pink-600/10 border border-violet-500/20 p-3">
          <p className="text-xs font-medium text-violet-400 mb-0.5">Propulsé par Claude AI</p>
          <p className="text-[10px] text-[#7A7A9D]">Stratégie Instagram personnalisée</p>
        </div>
      </div>
    </aside>
  );
}
