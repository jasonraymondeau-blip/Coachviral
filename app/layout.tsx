import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';

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
        <div className="flex min-h-screen bg-[#0A0A0F]">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
