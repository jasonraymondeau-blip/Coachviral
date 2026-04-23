'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Sparkles, Copy, CheckCheck, Target, Compass, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateHashtags } from '@/lib/claude';
import { HashtagSet, UserProfile } from '@/types';

const CATEGORY_CONFIG = {
  niche:     { label: 'Niche', icon: Target,  color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', desc: 'Expat / Lifestyle / Ton univers' },
  discovery: { label: 'Discovery', icon: Compass, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', desc: 'Hashtags de découverte algorithmique' },
  longTail:  { label: 'Longue traîne', icon: Search, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Très ciblés, haute conversion' },
  micro:     { label: 'Micro (< 50K)', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: 'Idéal pour visibilité garantie' },
  medium:    { label: 'Moyen (50K–500K)', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', desc: 'Bon équilibre portée/concurrence' },
  large:     { label: 'Large (> 500K)', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', desc: 'Grand reach, forte concurrence' },
};

function CopyTagButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[#7A7A9D] hover:text-violet-400 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

function TagChip({ tag, color, bg, border }: { tag: string; color: string; bg: string; border: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.span whileTap={{ scale: 0.95 }}
      onClick={() => { navigator.clipboard.writeText(tag); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all hover:opacity-80 ${bg} ${copied ? 'text-emerald-400' : color} border ${border}`}
      title="Cliquer pour copier">
      {copied ? '✓' : tag}
    </motion.span>
  );
}

function ReachScoreBar({ score, explanation }: { score: number; explanation: string }) {
  const color = score < 40 ? '#EF4444' : score < 65 ? '#F59E0B' : '#10B981';
  return (
    <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/20 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-white">Potentiel de reach</span>
        </div>
        <span className="font-heading text-3xl font-bold" style={{ color }}>{score}<span className="text-base text-[#7A7A9D]">/100</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-[#2A2A3A] overflow-hidden mb-3">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
      <p className="text-sm text-[#7A7A9D]">{explanation}</p>
    </div>
  );
}

export default function HashtagsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState('');
  const [hashtagSet, setHashtagSet] = useState<HashtagSet | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setProfile(storage.getProfile()); }, []);

  const handleGenerate = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    if (!theme) return;
    setLoading(true);
    try {
      const result = await generateHashtags(theme, profile);
      setHashtagSet(result as HashtagSet);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération. Vérifie ta clé API.');
    } finally {
      setLoading(false);
    }
  };

  const topCategories = ['niche', 'discovery', 'longTail'] as const;
  const sizeCategories = ['micro', 'medium', 'large'] as const;

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Moteur Hashtags IA</h1>
            <p className="text-[#7A7A9D] text-sm">Hashtags stratégiques avec score de reach potentiel</p>
          </div>
        </div>

        {/* Search bar */}
        <Card className="mb-6 border-violet-500/20">
          <CardHeader>
            <CardTitle>Rechercher des hashtags</CardTitle>
            <CardDescription>Claude génère niche + discovery + longue traîne + 3 sets complets + score de reach</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input placeholder="Ex: vie d'expat à Maurice, lifestyle plage, digital nomad..."
                value={theme} onChange={e => setTheme(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
                className="flex-1" />
              <Button onClick={handleGenerate} disabled={loading || !theme || !profile} className="shrink-0">
                {loading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                Générer
              </Button>
            </div>
            {profile?.themes && profile.themes.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-[#7A7A9D] mb-2">Thèmes de ton profil :</p>
                <div className="flex flex-wrap gap-2">
                  {profile.themes.map(t => (
                    <button key={t} onClick={() => setTheme(t)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#1A1A24] border border-[#2A2A3A] text-[#7A7A9D] hover:text-white hover:border-violet-500/30 transition-all cursor-pointer">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <Spinner />
            <p className="text-[#7A7A9D]">Claude génère tes hashtags stratégiques...</p>
          </div>
        )}

        <AnimatePresence>
          {hashtagSet && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Reach Score */}
              <ReachScoreBar score={hashtagSet.reachScore || 72} explanation={hashtagSet.reachExplanation || 'Mix équilibré pour ta niche.'} />

              {/* Strategic categories */}
              <div>
                <h2 className="font-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-400" />
                  Par stratégie
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {topCategories.map(key => {
                    const config = CATEGORY_CONFIG[key] as typeof CATEGORY_CONFIG['niche'];
                    const tags = (hashtagSet[key] as string[] | undefined) || [];
                    const IconComponent = config.icon;
                    return (
                      <motion.div key={key} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className={`h-full border ${config.border}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IconComponent className={`w-4 h-4 ${config.color}`} />
                                <div>
                                  <CardTitle className={`text-sm ${config.color}`}>{config.label}</CardTitle>
                                  <CardDescription className="text-xs">{config.desc}</CardDescription>
                                </div>
                              </div>
                              <CopyTagButton text={tags.join(' ')} />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map(tag => (
                                <TagChip key={tag} tag={tag} color={config.color} bg={config.bg} border={config.border} />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Size categories */}
              <div>
                <h2 className="font-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-pink-400" />
                  Par taille de communauté
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {sizeCategories.map(key => {
                    const config = CATEGORY_CONFIG[key] as { label: string; color: string; bg: string; border: string; desc: string };
                    const tags = (hashtagSet[key] as string[] | undefined) || [];
                    return (
                      <Card key={key} className={`border ${config.border}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className={`text-sm ${config.color}`}>{config.label}</CardTitle>
                              <CardDescription className="text-xs">{config.desc}</CardDescription>
                            </div>
                            <CopyTagButton text={tags.join(' ')} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map(tag => (
                              <TagChip key={tag} tag={tag} color={config.color} bg={config.bg} border={config.border} />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Ready-to-use Sets */}
              <div>
                <h2 className="font-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Mix prêts à l&apos;emploi — 3 sets à alterner
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {hashtagSet.sets.map((set, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <Card className="h-full">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              <span className="gradient-text">Set {i + 1}</span>
                            </CardTitle>
                            <CopyTagButton text={set.hashtags.join(' ')} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {set.hashtags.map(tag => (
                              <span key={tag}
                                className="text-xs px-2 py-0.5 rounded-md bg-[#1A1A24] border border-[#2A2A3A] text-[#F1F0FF] hover:border-violet-500/30 cursor-pointer transition-colors"
                                onClick={() => navigator.clipboard.writeText(tag)}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="rounded-lg bg-[#0D0D14] border border-[#2A2A3A] p-3">
                            <p className="text-xs text-[#7A7A9D] leading-relaxed">{set.strategy}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* All hashtags copy */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const all = [
                      ...(hashtagSet.niche || []),
                      ...(hashtagSet.discovery || []),
                      ...(hashtagSet.longTail || []),
                      ...(hashtagSet.micro || []),
                      ...(hashtagSet.medium || []),
                    ].slice(0, 30).join(' ');
                    navigator.clipboard.writeText(all);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-all text-sm font-medium">
                  <Copy className="w-4 h-4" />
                  Copier les 30 meilleurs hashtags
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hashtagSet && !loading && (
          <div className="text-center py-16">
            <Hash className="w-12 h-12 text-[#2A2A3A] mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Aucun hashtag généré</p>
            <p className="text-[#7A7A9D] text-sm">Entre un thème pour voir les hashtags avec leur potentiel de reach</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
