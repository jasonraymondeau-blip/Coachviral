'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Users, LogOut, PlusCircle, Sparkles } from 'lucide-react';
import { InstagramIcon } from '@/components/ui/instagram-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

const IG_USERNAME_KEY = 'viralcoach_ig_username';

export default function ConnectPage() {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState('');
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(IG_USERNAME_KEY);
    if (stored) {
      setConnected(stored);
      const profile = storage.getProfile();
      if (profile?.followers) setFollowers(profile.followers);
    }
  }, []);

  const handleConnect = () => {
    const clean = username.replace('@', '').trim();
    if (!clean) return;
    setLoading(true);

    // Save username and update profile
    localStorage.setItem(IG_USERNAME_KEY, clean);
    const existing = storage.getProfile();
    storage.setProfile({
      username: clean,
      niche: existing?.niche || 'lifestyle',
      subNiche: existing?.subNiche || '',
      followers: existing?.followers || 0,
      engagementRate: existing?.engagementRate || 0,
      publishingFrequency: existing?.publishingFrequency || 3,
      goal: existing?.goal || '',
      tone: existing?.tone || 'authentique',
      themes: existing?.themes || [],
    });

    setTimeout(() => {
      setConnected(clean);
      setLoading(false);
    }, 800);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(IG_USERNAME_KEY);
    setConnected('');
    setUsername('');
    setFollowers(null);
  };

  const avatarUrl = (u: string) => `https://unavatar.io/instagram/${u}`;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] flex items-center justify-center">
            <InstagramIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Connecter Instagram</h1>
            <p className="text-[#7A7A9D] text-sm">Associe ton compte pour personnaliser toutes les analyses IA</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Not connected */}
          {!connected && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <Card className="border-violet-500/20">
                <CardHeader>
                  <CardTitle>Entre ton username Instagram</CardTitle>
                  <CardDescription>Aucun mot de passe, aucune autorisation — juste ton nom d&apos;utilisateur</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A9D] text-sm">@</span>
                      <input
                        type="text"
                        placeholder="ton_username"
                        value={username}
                        onChange={e => setUsername(e.target.value.replace('@', ''))}
                        onKeyDown={e => e.key === 'Enter' && handleConnect()}
                        className="w-full rounded-xl bg-[#1A1A24] border border-[#2A2A3A] pl-8 pr-4 py-2.5 text-sm text-white placeholder:text-[#7A7A9D] outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                    <Button onClick={handleConnect} disabled={!username.trim() || loading}>
                      {loading ? <Spinner size="sm" /> : <InstagramIcon className="w-4 h-4" />}
                      Connecter
                    </Button>
                  </div>
                  <p className="text-xs text-[#7A7A9D]">
                    🔒 Ton username est sauvegardé uniquement sur ton appareil. CoachViral ne lit ni ne publie rien sur ton compte.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { n: '01', t: 'Entre ton username', d: 'Aucun mot de passe requis' },
                  { n: '02', t: 'Profil affiché', d: 'Ta photo et ton nom apparaissent dans l\'app' },
                  { n: '03', t: 'IA personnalisée', d: 'Claude adapte tous ses conseils à ton profil' },
                ].map(s => (
                  <Card key={s.n}>
                    <CardContent className="p-4">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white mb-3">{s.n}</div>
                      <p className="text-white text-sm font-medium mb-1">{s.t}</p>
                      <p className="text-[#7A7A9D] text-xs">{s.d}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Connected */}
          {connected && (
            <motion.div key="connected" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Profile card */}
              <Card className="border-emerald-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045]">
                        <img
                          src={avatarUrl(connected)}
                          alt={connected}
                          className="w-full h-full rounded-full object-cover bg-[#1A1A24]"
                          onError={e => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${connected}&background=8B5CF6&color=fff&size=80`;
                          }}
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-heading text-xl font-bold text-white">@{connected}</h2>
                        <Badge variant="success">Connecté</Badge>
                      </div>
                      <a
                        href={`https://instagram.com/${connected}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-violet-400 hover:underline flex items-center gap-1"
                      >
                        <InstagramIcon className="w-3.5 h-3.5" />
                        instagram.com/{connected}
                      </a>
                      {followers && (
                        <p className="text-[#7A7A9D] text-sm mt-1 flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {formatNumber(followers)} abonnés
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                        <LogOut className="w-4 h-4" />
                        Déconnecter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next steps */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="hover:border-violet-500/30 transition-all cursor-pointer">
                  <Link href="/profile">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Compléter le profil</p>
                        <p className="text-[#7A7A9D] text-xs">Abonnés, niche, objectif...</p>
                      </div>
                    </CardContent>
                  </Link>
                </Card>

                <Card className="hover:border-pink-500/30 transition-all cursor-pointer">
                  <Link href="/posts">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                        <PlusCircle className="w-5 h-5 text-pink-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Ajouter des posts</p>
                        <p className="text-[#7A7A9D] text-xs">Et les analyser avec Claude</p>
                      </div>
                    </CardContent>
                  </Link>
                </Card>

                <Card className="hover:border-amber-500/30 transition-all cursor-pointer col-span-2">
                  <Link href="/audit">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Lancer l&apos;audit complet</p>
                        <p className="text-[#7A7A9D] text-xs">Plan de croissance 90 jours généré par Claude</p>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
