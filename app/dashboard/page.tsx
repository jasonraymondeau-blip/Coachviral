'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Camera, BookOpen, MessageSquare, Heart,
  RefreshCw, Copy, CheckCheck, ChevronRight,
  Zap, Target, Calendar, Sparkles, Play,
  Hash, Clock, TrendingUp, BarChart2,
  AlertCircle, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { computeMetrics } from '@/lib/metrics';
import { generateDailyAction } from '@/lib/claude';
import { UserProfile, Post, DailyAction, StoryIdea } from '@/types';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const STORY_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  'poll':          { label: 'Sondage',     color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', emoji: '📊' },
  'question':      { label: 'Question',    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   emoji: '❓' },
  'teaser':        { label: 'Teaser',      color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30',   emoji: '🔥' },
  'behind-scenes': { label: 'Coulisses',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  emoji: '🎬' },
  'social-proof':  { label: 'Preuve soc.', color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',emoji: '⭐' },
  'cta':           { label: 'CTA',         color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', emoji: '📣' },
  'lifestyle':     { label: 'Lifestyle',   color: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   emoji: '✨' },
};

const OBJECTIVE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  acquisition:  { label: 'Acquisition',  color: 'text-violet-400', bg: 'bg-violet-500/10' },
  engagement:   { label: 'Engagement',   color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
  fidelisation: { label: 'Fidélisation', color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  vente:        { label: 'Vente',        color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  autorite:     { label: 'Autorité',     color: 'text-amber-400',  bg: 'bg-amber-500/10'   },
  branding:     { label: 'Branding',     color: 'text-orange-400', bg: 'bg-orange-500/10'  },
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] text-[#7A7A9D] hover:text-violet-400 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10 shrink-0">
      {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

function StoryCard({ story }: { story: StoryIdea }) {
  const cfg = STORY_TYPE_CONFIG[story.type] || STORY_TYPE_CONFIG['lifestyle'];
  return (
    <div className={`rounded-xl ${cfg.bg} border ${cfg.border} p-3 flex items-start gap-3`}>
      <div className="text-lg shrink-0">{cfg.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
          {story.interactive && (
            <span className="text-[10px] text-[#7A7A9D] truncate">{story.interactive}</span>
          )}
        </div>
        <p className="text-sm text-white font-medium leading-snug">{story.text}</p>
        <p className="text-xs text-[#7A7A9D] mt-1 leading-snug">{story.visual}</p>
      </div>
      <CopyBtn text={story.text} />
    </div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [action, setAction] = useState<DailyAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [igUsername, setIgUsername] = useState<string | null>(null);
  const [metrics, setMetrics] = useState(computeMetrics([], null));
  const [checkedPlans, setCheckedPlans] = useState<Set<number>>(new Set());

  const today = new Date();
  const todayLabel = `${DAYS_FR[today.getDay()]} ${today.getDate()} ${MONTHS_FR[today.getMonth()]}`;

  useEffect(() => {
    const p = storage.getProfile();
    const ps = storage.getPosts();
    setProfile(p);
    setPosts(ps);
    setMetrics(computeMetrics(ps, p));
    setIgUsername(localStorage.getItem('viralcoach_ig_username'));
    const saved = localStorage.getItem('viralcoach_daily_action');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === new Date().toDateString()) setAction(parsed.data);
      } catch {}
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const weeklyPlan = localStorage.getItem('viralcoach_weekly_plan');
      const result = await generateDailyAction(
        profile,
        posts,
        weeklyPlan ? JSON.parse(weeklyPlan) : undefined
      );
      setAction(result);
      localStorage.setItem('viralcoach_daily_action', JSON.stringify({
        date: new Date().toDateString(),
        data: result,
      }));
      setCheckedPlans(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile, posts]);

  const hasPosts = posts.length > 0;
  const hasMetrics = posts.some(p => p.likes !== undefined);
  const objCfg = OBJECTIVE_CONFIG[action?.contentObjective || ''] || OBJECTIVE_CONFIG['acquisition'];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#7A7A9D] text-sm">{todayLabel}</span>
              {action && (
                <Badge variant="violet" className="text-[10px]">
                  Objectif : {objCfg.label}
                </Badge>
              )}
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">
              {igUsername ? `@${igUsername}` : profile?.username ? `@${profile.username}` : 'CoachViral'}
            </h1>
            <p className="text-[#7A7A9D] text-sm mt-0.5">
              {action ? 'Voici ton plan de contenu pour aujourd\'hui' : 'Génère ton plan d\'action du jour'}
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !profile} size="lg"
            className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 border-0 text-white shadow-lg shadow-violet-500/25">
            {loading ? <Spinner size="sm" /> : action ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Génération...' : action ? 'Actualiser' : 'Générer mon plan du jour'}
          </Button>
        </div>
      </motion.div>

      {/* Onboarding banner */}
      {!hasPosts && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/30 p-5 flex flex-col gap-3 md:flex-row md:items-center">
            <AlertCircle className="w-5 h-5 text-violet-400 shrink-0" />
            <div className="flex-1">
              <p className="text-white font-medium">Importe ton profil Instagram pour un plan 100% personnalisé</p>
              <p className="text-[#7A7A9D] text-sm">Connecte ton compte ou importe tes posts pour activer l'IA</p>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <Link href="/connect"><Button size="sm" variant="secondary">Connecter Instagram</Button></Link>
              <Link href="/import"><Button size="sm">Importer mes posts</Button></Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white font-heading text-xl font-semibold">Préparation de ton plan du jour...</p>
          <p className="text-[#7A7A9D] text-sm">Claude analyse ton profil et prépare tes actions concrètes</p>
        </div>
      )}

      <AnimatePresence>
        {action && !loading && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

            {/* Reel du jour */}
            <motion.div variants={item}>
              <div className="rounded-2xl bg-[#0D0D14] border border-violet-500/30 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600/15 to-pink-600/10 px-5 py-4 flex items-center gap-3 border-b border-violet-500/20">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">🎬 À filmer aujourd'hui</p>
                    <p className="text-white font-heading font-semibold text-base leading-tight">{action.reelTitle}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1A1A24] border border-[#2A2A3A]">
                      <Clock className="w-3 h-3 text-[#7A7A9D]" />
                      <span className="text-xs text-white font-medium">{action.reelDuration}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Hook */}
                  <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-violet-400">Hook — première phrase</span>
                      <CopyBtn text={action.reelHook} />
                    </div>
                    <p className="text-white text-sm leading-relaxed font-medium">«{action.reelHook}»</p>
                  </div>

                  {/* Plans à filmer */}
                  <div>
                    <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Plans à filmer
                    </p>
                    <div className="space-y-2">
                      {action.plansToFilm.map((plan, i) => (
                        <button
                          key={i}
                          onClick={() => setCheckedPlans(prev => {
                            const next = new Set(prev);
                            next.has(i) ? next.delete(i) : next.add(i);
                            return next;
                          })}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1A1A24] border border-[#2A2A3A] hover:border-violet-500/30 transition-all text-left"
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            checkedPlans.has(i)
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-[#3A3A4A]'
                          }`}>
                            {checkedPlans.has(i) && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm transition-all ${checkedPlans.has(i) ? 'text-[#7A7A9D] line-through' : 'text-white'}`}>{plan}</span>
                        </button>
                      ))}
                    </div>
                    {checkedPlans.size > 0 && checkedPlans.size === action.plansToFilm.length && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                        <p className="text-emerald-400 text-sm font-medium">✅ Tous les plans filmés ! Monte ton Reel.</p>
                      </motion.div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="rounded-xl bg-pink-500/5 border border-pink-500/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-pink-400">CTA du jour</span>
                      <CopyBtn text={action.ctaOfTheDay} />
                    </div>
                    <p className="text-white text-sm">{action.ctaOfTheDay}</p>
                  </div>

                  {/* Lien vers Reel Builder */}
                  <Link href={`/scripts?topic=${encodeURIComponent(action.reelTitle)}`}>
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/20 hover:border-violet-500/40 transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Play className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-white">Générer le script complet + storyboard</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-violet-400" />
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Stories du jour */}
            <motion.div variants={item}>
              <div className="rounded-2xl bg-[#0D0D14] border border-pink-500/30 overflow-hidden">
                <div className="bg-gradient-to-r from-pink-600/10 to-orange-600/5 px-5 py-4 flex items-center gap-3 border-b border-pink-500/20">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-pink-400 uppercase tracking-wide">📲 Stories à poster</p>
                    <p className="text-white font-heading font-semibold text-base">{action.storiesToPost.length} stories prévues</p>
                  </div>
                  <Link href="/stories" className="ml-auto">
                    <Button size="sm" variant="secondary" className="text-xs">
                      Planner stories <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
                <div className="p-5 space-y-3">
                  {action.storiesToPost.map((story, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <StoryCard story={story} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Quick stats + actions */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/plan', icon: Calendar, label: 'Plan semaine', sub: 'Planning éditorial', color: 'violet' },
                { href: '/hooks', icon: Zap, label: 'Hooks', sub: 'Bibliothèque accroches', color: 'pink' },
                { href: '/scripts', icon: Film, label: 'Reel Builder', sub: 'Script + storyboard', color: 'violet' },
                { href: '/audit', icon: BarChart2, label: 'Audit IA', sub: 'Analyse du compte', color: 'pink' },
              ].map(action => (
                <Link key={action.href} href={action.href}>
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                    className={`rounded-2xl border p-4 flex flex-col gap-2 cursor-pointer transition-all h-full ${
                      action.color === 'violet'
                        ? 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/10'
                        : 'bg-pink-500/5 border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/10'
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.color === 'violet' ? 'bg-violet-500/10' : 'bg-pink-500/10'}`}>
                      <action.icon className={`w-4 h-4 ${action.color === 'violet' ? 'text-violet-400' : 'text-pink-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{action.label}</p>
                      <p className="text-[10px] text-[#7A7A9D]">{action.sub}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>

            {/* Metrics strip */}
            {hasPosts && (
              <motion.div variants={item}>
                <div className="rounded-2xl bg-[#0D0D14] border border-[#2A2A3A] p-4">
                  <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Métriques réelles
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Taux d\'engagement', value: hasMetrics ? `${metrics.engagementRate}%` : '—', icon: Heart },
                      { label: 'Moy. likes / post', value: hasMetrics ? formatNumber(metrics.avgLikes) : '—', icon: TrendingUp },
                      { label: 'Meilleur format', value: metrics.bestFormat, icon: Film },
                      { label: 'Posts / semaine', value: `${metrics.avgPostsPerWeek}`, icon: Calendar },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center gap-2 p-2 rounded-xl bg-[#1A1A24]">
                        <stat.icon className="w-4 h-4 text-violet-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#7A7A9D] truncate">{stat.label}</p>
                          <p className="text-sm font-bold text-white">{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!hasMetrics && (
                    <p className="text-[10px] text-[#7A7A9D] mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Ajoute les likes/commentaires à tes posts pour des métriques réelles
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!action && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/20 to-pink-600/20 border border-violet-500/20 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-violet-400" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-white mb-2">Qu'est-ce qu'on poste aujourd'hui ?</h2>
          <p className="text-[#7A7A9D] max-w-sm mb-2">
            Génère ton plan d'action complet : Reel à filmer, plans à capturer, stories à poster.
          </p>
          {!profile && (
            <p className="text-violet-400 text-sm mb-6">Configure ton profil d'abord pour un plan personnalisé</p>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <Button onClick={handleGenerate} disabled={!profile || loading} size="lg"
              className="bg-gradient-to-r from-violet-600 to-pink-600 border-0 text-white">
              <Sparkles className="w-5 h-5" />
              Générer mon plan du jour
            </Button>
            {!profile && (
              <Link href="/profile">
                <Button variant="secondary" size="lg">
                  Configurer mon profil <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          {/* Quick access */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-lg">
            {[
              { href: '/plan', icon: Calendar, label: 'Plan de la semaine' },
              { href: '/hooks', icon: Hash, label: 'Bibliothèque de hooks' },
              { href: '/scripts', icon: Film, label: 'Reel Builder' },
              { href: '/stories', icon: MessageSquare, label: 'Story Planner' },
              { href: '/audit', icon: BarChart2, label: 'Audit IA' },
              { href: '/import', icon: TrendingUp, label: 'Importer mes posts' },
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0D0D14] border border-[#2A2A3A] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all cursor-pointer">
                  <item.icon className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-xs text-white font-medium leading-tight">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
