import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'CoachViral — Instagram Growth Coach',
  description: "Ton coach Instagram IA — stratégie virale personnalisée",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CoachViral',
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-dvh bg-[#0A0A0F]">
          {/* Sidebar visible uniquement sur desktop */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
          {/* Contenu principal — ml-64 sur desktop, plein écran sur mobile */}
          <main className="flex-1 md:ml-64 min-h-dvh pb-24 md:pb-0">
            {children}
          </main>
          {/* Bottom nav visible uniquement sur mobile */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
