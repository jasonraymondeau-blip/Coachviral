'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Sparkles, Copy, CheckCheck, RefreshCw,
  Film, Image, LayoutGrid, Clock, Target, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateWeeklyPlan } from '@/lib/claude';
import { WeeklyPlan, WeeklyPlanDay, UserProfile, Post, PostType } from '@/types';

const TYPE_CONFIG: Record<PostType, { icon: typeof Film; color: string; bg: string; border: string; label: string }> = {
  Reel:      { icon: Film,       color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', label: 'Reel' },
  Carrousel: { icon: LayoutGrid, color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30',   label: 'Carrousel' },
  Photo:     { icon: Image,      color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',label: 'Photo' },
};

const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[#7A7A9D] hover:text-violet-400 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

function DayCard({ day, index }: { day: WeeklyPlanDay; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const typeKey = day.type as PostType;
  const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG['Photo'];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <Card className={`border ${config.border} hover:shadow-lg transition-all duration-200 cursor-pointer`}
        onClick={() => setExpanded(e => !e)}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Day number + type icon */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${config.color}`} />
              </div>
              <p className="text-xs text-[#7A7A9D] font-medium">{day.bestTime}</p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-heading font-semibold text-white">{day.day}</h3>
                <Badge variant={day.type === 'Reel' ? 'violet' : day.type === 'Carrousel' ? 'pink' : 'outline'}>
                  {day.type}
                </Badge>
              </div>
              <p className="text-sm text-white font-medium mb-1">{day.idea}</p>
              <p className="text-xs text-[#7A7A9D] line-clamp-2">{day.hook}</p>
            </div>

            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}
              className="shrink-0 mt-1 text-[#7A7A9D]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </motion.div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden">
                <div className="mt-4 pt-4 border-t border-[#2A2A3A] space-y-3">
                  <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-violet-400">Hook</p>
                      <CopyButton text={day.hook} />
                    </div>
                    <p className="text-sm text-white">&ldquo;{day.hook}&rdquo;</p>
                  </div>
                  <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-3">
                    <p className="text-xs font-semibold text-pink-400 mb-1">Angle de traitement</p>
                    <p className="text-sm text-white">{day.angle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-xs text-[#7A7A9D]">Meilleur moment de publication : <span className="text-amber-400 font-medium">{day.bestTime}</span></p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PlanPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfile(storage.getProfile());
    setPosts(storage.getPosts());
    // Load saved plan from localStorage
    const saved = localStorage.getItem('viralcoach_weekly_plan');
    if (saved) { try { setPlan(JSON.parse(saved)); } catch {} }
  }, []);

  const handleGenerate = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    setLoading(true);
    try {
      const result = await generateWeeklyPlan(profile, posts);
      setPlan(result);
      localStorage.setItem('viralcoach_weekly_plan', JSON.stringify(result));
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération. Vérifie ta clé API.');
    } finally {
      setLoading(false);
    }
  };

  const copyAllPlan = () => {
    if (!plan) return;
    const text = plan.days.map(d =>
      `${d.day} — ${d.type} — ${d.bestTime}\n📌 ${d.idea}\n🎣 Hook: "${d.hook}"\n🎯 Angle: ${d.angle}`
    ).join('\n\n');
    navigator.clipboard.writeText(`PLAN DE LA SEMAINE\n${plan.focus}\n\n${text}`);
  };

  const sortedDays = plan?.days
    ? [...plan.days].sort((a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day))
    : [];

  // Stats
  const reelCount = sortedDays.filter(d => d.type === 'Reel').length;
  const carouselCount = sortedDays.filter(d => d.type === 'Carrousel').length;
  const photoCount = sortedDays.filter(d => d.type === 'Photo').length;

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Plan stratégique</h1>
              <p className="text-[#7A7A9D] text-sm">Planning éditorial hebdomadaire généré par IA selon ton profil</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {plan && (
              <Button variant="secondary" onClick={copyAllPlan}>
                <Copy className="w-4 h-4" />
                Copier le plan
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={loading || !profile}>
              {loading ? <Spinner size="sm" /> : plan ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Génération...' : plan ? 'Régénérer' : 'Générer mon plan'}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner size="lg" />
            <p className="text-white font-medium">Claude construit ton plan éditorial personnalisé...</p>
            <p className="text-[#7A7A9D] text-sm">Basé sur ta niche, tes posts performants et tes objectifs</p>
          </div>
        )}

        <AnimatePresence>
          {plan && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* Strategy header */}
              <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/20 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Thème de la semaine</p>
                    </div>
                    <h2 className="font-heading text-xl font-bold text-white mb-3">{plan.focus}</h2>
                    <p className="text-[#7A7A9D] text-sm leading-relaxed">{plan.strategy}</p>
                  </div>
                  <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-4 text-center shrink-0 min-w-36">
                    <Target className="w-5 h-5 text-pink-400 mx-auto mb-2" />
                    <p className="text-xs text-[#7A7A9D] mb-1">Objectif semaine</p>
                    <p className="text-sm text-white font-medium leading-tight">{plan.weeklyGoal}</p>
                  </div>
                </div>

                {/* Format summary */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-violet-500/20">
                  <p className="text-xs text-[#7A7A9D]">Cette semaine :</p>
                  <div className="flex gap-3">
                    {reelCount > 0 && <Badge variant="violet">{reelCount} Reel{reelCount > 1 ? 's' : ''}</Badge>}
                    {carouselCount > 0 && <Badge variant="pink">{carouselCount} Carrousel{carouselCount > 1 ? 's' : ''}</Badge>}
                    {photoCount > 0 && <Badge variant="outline">{photoCount} Photo{photoCount > 1 ? 's' : ''}</Badge>}
                    <Badge variant="outline">{sortedDays.length} posts / semaine</Badge>
                  </div>
                </div>
              </div>

              {/* Day cards */}
              <div className="grid grid-cols-1 gap-3">
                {sortedDays.map((day, i) => (
                  <DayCard key={day.day} day={day} index={i} />
                ))}
              </div>

              {/* Copy CTA */}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={copyAllPlan}>
                  <Copy className="w-4 h-4" />
                  Copier tout le plan semaine
                </Button>
                <Button className="flex-1" onClick={handleGenerate}>
                  <RefreshCw className="w-4 h-4" />
                  Régénérer un nouveau plan
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!plan && !loading && (
          <div className="text-center py-24">
            <Calendar className="w-16 h-16 text-[#2A2A3A] mx-auto mb-4" />
            <p className="text-white font-heading text-xl font-semibold mb-2">Ton planning de la semaine</p>
            <p className="text-[#7A7A9D] mb-2 max-w-md mx-auto">
              Claude génère un plan éditorial complet : 6 posts répartis sur la semaine avec idée, hook, angle et meilleur horaire de publication.
            </p>
            {posts.length > 0 && (
              <p className="text-violet-400 text-sm mb-6">Basé sur tes {posts.length} posts existants et leur performance</p>
            )}
            <Button onClick={handleGenerate} disabled={!profile} size="lg">
              <Sparkles className="w-5 h-5" />
              Générer mon plan de la semaine
            </Button>
            {!profile && (
              <p className="text-[#7A7A9D] text-xs mt-3">Configure ton profil d&apos;abord pour un plan personnalisé</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
