'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  BarChart3, Sparkles, RefreshCw, Printer, AlertTriangle, Target,
  Calendar, TrendingUp, Search, Zap, XCircle, CheckCircle2,
  TrendingDown, Trophy, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateAudit } from '@/lib/claude';
import { AuditReport, UserProfile, Post } from '@/types';
import { getScoreColor } from '@/lib/utils';

const SCORE_LABELS: Record<string, string> = {
  regularity: 'Régularité',
  engagement: 'Engagement',
  captionQuality: 'Qualité caption',
  formatDiversity: 'Diversité formats',
  nicheConsistency: 'Cohérence niche',
  hashtagStrategy: 'Hashtags',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value < 4 ? '#EF4444' : value < 7 ? '#F59E0B' : '#10B981';
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[#7A7A9D] w-40 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[#2A2A3A] overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${(value / 10) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold w-8 text-right" style={{ color }}>{value}/10</span>
    </div>
  );
}

function GlobalScoreRing({ score }: { score: number }) {
  const color = getScoreColor(score);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2A2A3A" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-[#7A7A9D]">/100</span>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfile(storage.getProfile());
    setPosts(storage.getPosts());
    setAudit(storage.getAudit());
  }, []);

  const handleGenerate = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    setLoading(true);
    try {
      const result = await generateAudit(profile, posts) as AuditReport;
      setAudit(result);
      storage.setAudit(result);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération. Vérifie ta clé API.');
    } finally {
      setLoading(false);
    }
  };

  const radarData = audit
    ? Object.entries(audit.scores).map(([key, value]) => ({
        subject: SCORE_LABELS[key] || key, value, fullMark: 10,
      }))
    : [];

  return (
    <div className="p-4 md:p-8" id="audit-content">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Audit Complet</h1>
              <p className="text-[#7A7A9D] text-sm">Analyse approfondie data-driven de ta stratégie Instagram</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {audit && (
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                Exporter PDF
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={loading || !profile}>
              {loading ? <Spinner size="sm" /> : audit ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Analyse en cours...' : audit ? 'Régénérer l\'audit' : 'Lancer l\'audit'}
            </Button>
          </div>
        </div>

        {!profile && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 flex items-center gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-amber-300">Configure ton profil avant de lancer l&apos;audit pour des résultats personnalisés.</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner size="lg" />
            <p className="text-white font-medium">Claude analyse ta stratégie Instagram en profondeur...</p>
            <p className="text-[#7A7A9D] text-sm">Corrélations, patterns, opportunités — 30 à 60 secondes</p>
          </div>
        )}

        <AnimatePresence>
          {audit && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* Global Score + Critical errors + Quick wins */}
              {(audit.globalScore !== undefined || audit.criticalErrors || audit.quickWins || audit.mainStrategy) && (
                <div className="grid grid-cols-12 gap-4">
                  {/* Global Score */}
                  <div className="col-span-12 md:col-span-3">
                    <Card className="h-full flex flex-col items-center justify-center py-6">
                      <p className="text-xs text-[#7A7A9D] mb-3">Score global</p>
                      <GlobalScoreRing score={audit.globalScore ?? 0} />
                      <p className="text-xs text-[#7A7A9D] mt-3 text-center px-4">
                        {(audit.globalScore ?? 0) < 40 ? 'Beaucoup de marge de progression' :
                         (audit.globalScore ?? 0) < 65 ? 'Bonne base, améliorations identifiées' :
                         'Compte bien optimisé'}
                      </p>
                    </Card>
                  </div>

                  {/* Critical errors */}
                  <div className="col-span-12 md:col-span-4">
                    <Card className="h-full border-red-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-400 text-base">
                          <XCircle className="w-4 h-4" />
                          3 erreurs critiques
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(audit.criticalErrors || []).map((err, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-xs text-white leading-relaxed">{err}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick wins */}
                  <div className="col-span-12 md:col-span-5">
                    <Card className="h-full border-emerald-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-400 text-base">
                          <CheckCircle2 className="w-4 h-4" />
                          3 quick wins immédiats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(audit.quickWins || []).map((win, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-white leading-relaxed">{win}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main strategy */}
                  {audit.mainStrategy && (
                    <div className="col-span-12">
                      <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/30 p-5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shrink-0">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-violet-400 text-xs font-semibold mb-1 uppercase tracking-wide">Stratégie prioritaire à appliquer maintenant</p>
                          <p className="text-white font-medium leading-relaxed">{audit.mainStrategy}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Radar + Score bars */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-5">
                  <Card>
                    <CardHeader><CardTitle>Score par pilier</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="#2A2A3A" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#7A7A9D', fontSize: 11 }} />
                            <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} strokeWidth={2} />
                            <Tooltip contentStyle={{ background: '#13131A', border: '1px solid #2A2A3A', borderRadius: 12 }} labelStyle={{ color: '#F1F0FF' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="col-span-12 md:col-span-7">
                  <Card className="h-full">
                    <CardHeader><CardTitle>Détail des scores</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(audit.scores).map(([key, value]) => (
                        <ScoreBar key={key} label={SCORE_LABELS[key] || key} value={value} />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Correlations */}
              {audit.correlations && (
                <div>
                  <h2 className="font-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    Corrélations data
                    <Badge variant="violet" className="text-xs">Calculé depuis tes posts réels</Badge>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { icon: TrendingUp, color: 'violet', label: 'Hashtags vs Performance', text: audit.correlations.hashtagsVsPerformance },
                      { icon: Search, color: 'pink', label: 'Longueur caption vs Engagement', text: audit.correlations.captionLengthVsEngagement },
                      { icon: BarChart3, color: 'amber', label: 'Type de contenu vs Reach', text: audit.correlations.contentTypeVsReach },
                    ].map(({ icon: Icon, color, label, text }) => (
                      <Card key={label} className={`border-${color === 'amber' ? 'amber' : color}-500/20`}>
                        <CardHeader>
                          <CardTitle className={`text-sm flex items-center gap-2 text-${color === 'amber' ? 'amber' : color}-400`}>
                            <Icon className="w-4 h-4" />
                            {label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-white leading-relaxed">{text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Top / Worst posts */}
              {(audit.topPosts?.length || audit.worstPosts?.length) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {audit.topPosts && audit.topPosts.length > 0 && (
                    <Card className="border-emerald-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-400">
                          <Trophy className="w-5 h-5" />
                          Top posts
                        </CardTitle>
                        <CardDescription>Ce qui fonctionne — à reproduire</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {audit.topPosts.map((p, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-white">{p.theme}</p>
                              <p className="text-xs text-[#7A7A9D] mt-0.5">{p.why}</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 ml-auto shrink-0">{p.score}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {audit.worstPosts && audit.worstPosts.length > 0 && (
                    <Card className="border-red-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-400">
                          <TrendingDown className="w-5 h-5" />
                          Posts à éviter
                        </CardTitle>
                        <CardDescription>Ce qui ne fonctionne pas — à corriger</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {audit.worstPosts.map((p, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-red-500/5 border border-red-500/15 p-3">
                            <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-white">{p.theme}</p>
                              <p className="text-xs text-[#7A7A9D] mt-0.5">{p.why}</p>
                            </div>
                            <span className="text-xs font-bold text-red-400 ml-auto shrink-0">{p.score}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}

              {/* Analysis sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Search className="w-5 h-5 text-violet-400" />
                      <CardTitle>Positionnement</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#7A7A9D] text-sm leading-relaxed whitespace-pre-line">{audit.positioning}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-pink-400" />
                      <CardTitle>Audit du contenu</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#7A7A9D] text-sm leading-relaxed whitespace-pre-line">{audit.contentAudit}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-emerald-400" />
                      <CardTitle>Plan de croissance 90 jours</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#7A7A9D] text-sm leading-relaxed whitespace-pre-line">{audit.growthPlan}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-400" />
                      <CardTitle>Calendrier éditorial</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#7A7A9D] text-sm leading-relaxed whitespace-pre-line">{audit.editorialCalendar}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Missed Opportunities */}
              <Card className="border-amber-500/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <CardTitle>Opportunités manquées</CardTitle>
                    <CardDescription className="ml-auto">Ce que la concurrence fait que tu ne fais pas encore</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audit.missedOpportunities.map((opp, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
                      <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                      <p className="text-sm text-white">{opp}</p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {!audit && !loading && (
          <div className="text-center py-24">
            <BarChart3 className="w-16 h-16 text-[#2A2A3A] mx-auto mb-4" />
            <p className="text-white font-heading text-xl font-semibold mb-2">Prêt pour ton audit avancé ?</p>
            <p className="text-[#7A7A9D] mb-2 max-w-md mx-auto">
              Claude analyse tes corrélations data, identifie tes 3 erreurs critiques et génère un plan de croissance 90 jours.
            </p>
            {posts.length > 0 && (
              <p className="text-violet-400 text-sm mb-6">{posts.length} posts détectés — analyse data-driven disponible</p>
            )}
            <Button onClick={handleGenerate} disabled={!profile} size="lg">
              <Sparkles className="w-5 h-5" />
              Lancer l&apos;audit complet
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
