'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, Film, BarChart2,
  RefreshCw, Heart, MessageCircle, Calendar,
  AlertCircle, Zap, Target, Brain, Lightbulb,
  CheckCircle2, XCircle, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { computeMetrics } from '@/lib/metrics';
import { getDailyCoach, learnStyle } from '@/lib/claude';
import { UserProfile, Post, DailyCoach } from '@/types';
import { getScoreColor, getScoreLabel, formatNumber } from '@/lib/utils';
import Link from 'next/link';

function computeViralityScore(profile: UserProfile | null, posts: Post[], engagementRate: number, freq: number): number {
  if (!profile && posts.length === 0) return 0;
  let score = 0;
  score += (Math.min(engagementRate, 10) / 10) * 30;
  score += (Math.min(freq, 7) / 7) * 20;
  if (posts.length > 0) {
    const formats = new Set(posts.map(p => p.type));
    score += (formats.size / 3) * 20;
  }
  if (posts.length > 0) {
    const avg = posts.reduce((a, p) => a + p.caption.length, 0) / posts.length;
    score += Math.min(avg / 300, 1) * 15;
  }
  const themes = profile?.themes?.length || 0;
  score += (Math.min(themes, 3) / 3) * 15;
  return Math.round(Math.min(score, 100));
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [coach, setCoach] = useState<DailyCoach | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);
  const [viralScore, setViralScore] = useState(0);
  const [metrics, setMetrics] = useState(computeMetrics([], null));
  const [igUsername, setIgUsername] = useState<string | null>(null);

  useEffect(() => {
    const p = storage.getProfile();
    const ps = storage.getPosts();
    setProfile(p);
    setPosts(ps);
    const m = computeMetrics(ps, p);
    setMetrics(m);
    setViralScore(computeViralityScore(p, ps, m.engagementRate, m.avgPostsPerWeek));
    setIgUsername(localStorage.getItem('viralcoach_ig_username'));
  }, []);

  const fetchCoach = useCallback(async () => {
    if (!profile) return;
    setCoachLoading(true);
    try {
      const c = await getDailyCoach(profile, posts);
      setCoach(c);
    } catch {
      setCoach({ action: 'Configure ton profil pour obtenir ton brief.', mistake: '—', idea: '—', motivation: '—' });
    } finally {
      setCoachLoading(false);
    }
  }, [profile, posts]);

  const handleLearnStyle = useCallback(async () => {
    if (!profile || posts.length < 3) return;
    setStyleLoading(true);
    try {
      const styleProfile = await learnStyle(posts, profile);
      if (styleProfile) {
        const updated = { ...profile, styleProfile };
        storage.setProfile(updated);
        setProfile(updated);
      }
    } catch (e) { console.error(e); }
    finally { setStyleLoading(false); }
  }, [profile, posts]);

  useEffect(() => {
    if (profile) fetchCoach();
  }, [profile, fetchCoach]);

  const scoreColor = getScoreColor(viralScore);
  const radialData = [{ value: viralScore, fill: scoreColor }];
  const chartData = posts.filter(p => p.analysis).slice(-10).map((p, i) => ({
    name: `P${i + 1}`, score: p.analysis!.score,
  }));
  const hasPosts = posts.length > 0;
  const hasMetrics = posts.some(p => p.likes !== undefined);
  const hasStyle = !!profile?.styleProfile;

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">
                Bonjour{igUsername ? `, @${igUsername}` : profile?.username ? `, @${profile.username}` : ''} 👋
              </h1>
              <p className="text-[#7A7A9D] text-sm">Dashboard — métriques calculées depuis tes posts réels</p>
            </div>
          </div>
          {hasPosts && (
            <div className="flex flex-wrap items-center gap-3">
              {hasStyle && (
                <div className="flex items-center gap-2 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <div>
                    <p className="text-xs text-violet-400 font-medium">Style appris</p>
                    <p className="text-xs text-[#7A7A9D] truncate max-w-32">{profile?.styleProfile?.dominantTone}</p>
                  </div>
                </div>
              )}
              <Button variant="secondary" size="sm" onClick={handleLearnStyle}
                disabled={styleLoading || posts.length < 3}>
                {styleLoading ? <Spinner size="sm" /> : <Brain className="w-4 h-4" />}
                {hasStyle ? 'Mettre à jour le style' : 'Apprendre mon style'}
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {!hasPosts && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/30 p-5 flex flex-col gap-3 md:flex-row md:items-center">
            <AlertCircle className="w-5 h-5 text-violet-400 shrink-0" />
            <div>
              <p className="text-white font-medium">Ajoute tes posts pour des métriques réelles</p>
              <p className="text-[#7A7A9D] text-sm">Import via ZIP Instagram ou ajoute manuellement</p>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <Link href="/import"><Button size="sm" variant="secondary">Importer</Button></Link>
              <Link href="/posts"><Button size="sm">Ajouter</Button></Link>
            </div>
          </div>
        </motion.div>
      )}
      {hasPosts && !hasMetrics && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 flex flex-col gap-3 md:flex-row md:items-center">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-white font-medium">Ajoute les likes/commentaires à tes posts</p>
              <p className="text-[#7A7A9D] text-sm">Ou importe des screenshots Insights pour les remplir automatiquement.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <Link href="/import"><Button size="sm" variant="secondary">Screenshots</Button></Link>
              <Link href="/posts"><Button size="sm">Mes posts</Button></Link>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-12 gap-6">
        {/* Virality Score */}
        <motion.div variants={item} className="col-span-12 md:col-span-4">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Score de Viralité</CardTitle>
              <CardDescription>Calculé depuis tes vraies métriques</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="relative w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="60%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#1A1A24' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-heading text-4xl font-bold text-white">{viralScore}</span>
                  <Badge variant={viralScore < 40 ? 'danger' : viralScore < 60 ? 'warning' : 'success'} className="mt-1">
                    {getScoreLabel(viralScore)}
                  </Badge>
                </div>
              </div>
              {hasStyle && profile?.styleProfile && (
                <div className="mt-1 text-center">
                  <p className="text-xs text-[#7A7A9D] mb-1">Ton d&apos;écriture</p>
                  <Badge variant="violet">{profile.styleProfile.dominantTone}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div variants={item} className="col-span-12 md:col-span-8">
          <div className="grid grid-cols-2 gap-4 h-full">
            {[
              { label: 'Taux d\'engagement', value: hasMetrics ? `${metrics.engagementRate}%` : '—', sub: hasMetrics ? 'calculé depuis tes posts' : 'ajoute les likes/comments', icon: TrendingUp, color: 'violet', badge: hasMetrics ? (metrics.engagementRate > 5 ? ('success' as const) : metrics.engagementRate > 2 ? ('warning' as const) : ('danger' as const)) : undefined, badgeLabel: hasMetrics ? (metrics.engagementRate > 5 ? 'Excellent' : metrics.engagementRate > 2 ? 'Bon' : 'Faible') : undefined },
              { label: 'Fréquence réelle', value: hasPosts ? `${metrics.avgPostsPerWeek}/sem` : '—', sub: hasPosts ? 'calculé sur 60 jours' : 'ajoute des posts', icon: Calendar, color: 'pink' },
              { label: 'Moy. likes / post', value: hasMetrics ? formatNumber(metrics.avgLikes) : '—', sub: hasMetrics ? `${metrics.avgComments} commentaires` : 'métriques manquantes', icon: Heart, color: 'violet' },
              { label: 'Meilleur format', value: metrics.bestFormat, sub: metrics.analysedPosts > 0 ? `sur ${metrics.analysedPosts} posts analysés` : 'analyse tes posts', icon: Film, color: 'pink' },
              { label: 'Score moyen IA', value: metrics.avgScore > 0 ? `${metrics.avgScore}/100` : '—', sub: metrics.analysedPosts > 0 ? `${metrics.analysedPosts} posts analysés` : 'analyse un post', icon: BarChart2, color: 'violet' },
              { label: 'Meilleur jour', value: metrics.bestDay, sub: hasMetrics ? 'par engagement moyen' : 'données insuffisantes', icon: MessageCircle, color: 'pink' },
            ].map(stat => (
              <Card key={stat.label} className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.color === 'violet' ? 'bg-violet-500/10' : 'bg-pink-500/10'}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color === 'violet' ? 'text-violet-400' : 'text-pink-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[#7A7A9D] text-xs">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-xl font-bold text-white truncate">{stat.value}</p>
                    {'badge' in stat && stat.badge && stat.badgeLabel && (
                      <Badge variant={stat.badge} className="shrink-0">{stat.badgeLabel}</Badge>
                    )}
                  </div>
                  <p className="text-[#7A7A9D] text-xs truncate">{stat.sub}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Daily Coach */}
        <motion.div variants={item} className="col-span-12">
          <Card className="border-violet-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle>Coach IA du jour</CardTitle>
                    {hasMetrics && <p className="text-xs text-[#7A7A9D] mt-0.5">Personnalisé depuis tes vraies métriques</p>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchCoach} disabled={coachLoading || !profile}>
                  <RefreshCw className={`w-4 h-4 ${coachLoading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {coachLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <Spinner size="sm" />
                  <span className="text-[#7A7A9D] text-sm">Claude prépare ton brief du jour...</span>
                </div>
              ) : coach ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: CheckCircle2, color: 'emerald', label: 'Action du jour', text: coach.action },
                    { icon: XCircle, color: 'red', label: 'Erreur à éviter', text: coach.mistake },
                    { icon: Lightbulb, color: 'amber', label: 'Idée rapide à créer', text: coach.idea },
                    { icon: Target, color: 'violet', label: 'Motivation du jour', text: coach.motivation, italic: true },
                  ].map(({ icon: Icon, color, label, text, italic }) => (
                    <div key={label} className={`rounded-xl bg-${color}-500/5 border border-${color}-500/20 p-4 flex items-start gap-3`}>
                      <Icon className={`w-5 h-5 text-${color}-400 shrink-0 mt-0.5`} />
                      <div>
                        <p className={`text-xs font-semibold text-${color}-400 mb-1`}>{label}</p>
                        <p className={`text-sm text-white leading-relaxed ${italic ? 'italic' : ''}`}>{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#7A7A9D] text-sm py-2">Configure ton profil pour obtenir ton brief quotidien personnalisé.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Style Profile */}
        {hasStyle && profile?.styleProfile && (
          <motion.div variants={item} className="col-span-12">
            <Card className="border-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-pink-400" />
                  <CardTitle>Profil de style IA</CardTitle>
                  <Badge variant="pink">Auto-appris</Badge>
                </div>
                <CardDescription>{profile.styleProfile.writingPersonality}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-3">
                    <p className="text-xs text-[#7A7A9D] mb-1.5">Ton dominant</p>
                    <Badge variant="violet">{profile.styleProfile.dominantTone}</Badge>
                  </div>
                  <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-3">
                    <p className="text-xs text-[#7A7A9D] mb-1.5">Style emojis</p>
                    <p className="text-sm text-white capitalize">{profile.styleProfile.emojiStyle}</p>
                  </div>
                  <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-3">
                    <p className="text-xs text-[#7A7A9D] mb-1.5">Longueur moy.</p>
                    <p className="text-sm text-white">{profile.styleProfile.averageCaptionLength} chars</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.styleProfile.recurringVocabulary.map(word => (
                    <span key={word} className="text-xs px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">{word}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <p className="text-xs text-[#7A7A9D]">Ce profil personnalise automatiquement toutes les générations IA</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Score Evolution */}
        {chartData.length > 0 && (
          <motion.div variants={item} className="col-span-12">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des scores IA</CardTitle>
                <CardDescription>Score de tes {chartData.length} derniers posts analysés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-40 md:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                      <XAxis dataKey="name" tick={{ fill: '#7A7A9D', fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#7A7A9D', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: '#13131A', border: '1px solid #2A2A3A', borderRadius: 12 }} labelStyle={{ color: '#F1F0FF' }} itemStyle={{ color: '#8B5CF6' }} />
                      <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6, fill: '#EC4899' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={item} className="col-span-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/audit', icon: BarChart2, label: 'Analyser mon compte', color: 'violet' },
              { href: '/import', icon: Film, label: 'Importer mes posts', color: 'pink' },
              { href: '/scripts', icon: Zap, label: 'Générer du contenu', color: 'violet' },
              { href: '/plan', icon: Calendar, label: 'Plan de la semaine', color: 'pink' },
            ].map(action => (
              <Link key={action.href} href={action.href}>
                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                  className={`rounded-2xl border p-4 flex items-center gap-3 cursor-pointer transition-all ${
                    action.color === 'violet'
                      ? 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/10'
                      : 'bg-pink-500/5 border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/10'
                  }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.color === 'violet' ? 'bg-violet-500/10' : 'bg-pink-500/10'}`}>
                    <action.icon className={`w-5 h-5 ${action.color === 'violet' ? 'text-violet-400' : 'text-pink-400'}`} />
                  </div>
                  <p className="text-sm font-medium text-white">{action.label}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
