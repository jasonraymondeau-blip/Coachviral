'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Sparkles, RefreshCw, Copy, CheckCheck,
  BarChart2, HelpCircle, Film, Star, Megaphone,
  Camera, ChevronRight, Clock, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateStories } from '@/lib/claude';
import { UserProfile, Post, StoryPlan, StoryIdea } from '@/types';

const OBJECTIVE_OPTIONS = [
  { value: 'acquisition',  label: 'Acquisition',  description: 'Toucher de nouveaux abonnés' },
  { value: 'engagement',   label: 'Engagement',   description: 'Maximiser les interactions' },
  { value: 'fidelisation', label: 'Fidélisation', description: 'Renforcer la communauté' },
  { value: 'vente',        label: 'Vente',        description: 'Convertir et vendre' },
];

const STORY_TYPE_CONFIG: Record<string, {
  label: string; icon: typeof BookOpen; color: string; bg: string; border: string; emoji: string
}> = {
  'poll':          { label: 'Sondage',     icon: BarChart2,    color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', emoji: '📊' },
  'question':      { label: 'Question',    icon: HelpCircle,   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   emoji: '❓' },
  'teaser':        { label: 'Teaser',      icon: Film,         color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30',   emoji: '🔥' },
  'behind-scenes': { label: 'Coulisses',   icon: Camera,       color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  emoji: '🎬' },
  'social-proof':  { label: 'Preuve soc.', icon: Star,         color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',emoji: '⭐' },
  'cta':           { label: 'CTA',         icon: Megaphone,    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', emoji: '📣' },
  'lifestyle':     { label: 'Lifestyle',   icon: Camera,       color: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   emoji: '✨' },
};

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[#7A7A9D] hover:text-violet-400 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10 shrink-0">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

function StoryCard({ story, index }: { story: StoryIdea; index: number }) {
  const [checked, setChecked] = useState(false);
  const cfg = STORY_TYPE_CONFIG[story.type] || STORY_TYPE_CONFIG['lifestyle'];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-2xl border transition-all ${checked ? 'opacity-60' : ''} ${cfg.border} bg-[#0D0D14]`}
    >
      <div className={`flex items-center gap-3 px-4 py-3 ${cfg.bg} rounded-t-2xl border-b ${cfg.border}`}>
        <span className="text-xl">{cfg.emoji}</span>
        <div className="flex-1">
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>Story {story.order} — {cfg.label}</span>
        </div>
        <button onClick={() => setChecked(c => !c)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            checked ? `${cfg.bg} border-current ${cfg.color}` : 'border-[#3A3A4A]'
          }`}>
          {checked && <CheckCheck className={`w-3 h-3 ${cfg.color}`} />}
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs text-[#7A7A9D] mb-1">Texte à afficher</p>
          <div className="flex items-start gap-2">
            <p className="text-white text-sm font-medium leading-snug flex-1">{story.text}</p>
            <CopyBtn text={story.text} />
          </div>
        </div>

        <div>
          <p className="text-xs text-[#7A7A9D] mb-1">Visuel suggéré</p>
          <p className="text-sm text-[#A0A0BB] leading-snug">{story.visual}</p>
        </div>

        {story.interactive && (
          <div className={`rounded-xl ${cfg.bg} border ${cfg.border} px-3 py-2`}>
            <p className="text-xs text-[#7A7A9D] mb-0.5">Interactif</p>
            <p className={`text-sm font-medium ${cfg.color}`}>{story.interactive}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function StoriesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [plan, setPlan] = useState<StoryPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [objective, setObjective] = useState('engagement');

  const today = new Date();
  const todayLabel = `${DAYS_FR[today.getDay()]} ${today.getDate()} ${MONTHS_FR[today.getMonth()]}`;

  useEffect(() => {
    setProfile(storage.getProfile());
    setPosts(storage.getPosts());
    const saved = localStorage.getItem('viralcoach_story_plan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === new Date().toDateString()) setPlan(parsed.data);
      } catch {}
    }
  }, []);

  const handleGenerate = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    setLoading(true);
    try {
      const result = await generateStories(profile, posts, objective);
      setPlan(result);
      localStorage.setItem('viralcoach_story_plan', JSON.stringify({
        date: new Date().toDateString(),
        data: result,
      }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const copyAll = () => {
    if (!plan) return;
    const text = plan.stories.map(s =>
      `Story ${s.order} (${STORY_TYPE_CONFIG[s.type]?.label || s.type})\n📝 ${s.text}\n🎨 Visuel: ${s.visual}${s.interactive ? `\n💬 ${s.interactive}` : ''}`
    ).join('\n\n');
    navigator.clipboard.writeText(`STORIES — ${plan.date}\nThème: ${plan.theme}\n\n${text}`);
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Story Planner</h1>
              <p className="text-[#7A7A9D] text-sm">Plan stories du jour — {todayLabel}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {plan && (
              <Button variant="secondary" onClick={copyAll}>
                <Copy className="w-4 h-4" />
                Copier tout
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={loading || !profile}>
              {loading ? <Spinner size="sm" /> : plan ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Génération...' : plan ? 'Régénérer' : 'Générer mes stories'}
            </Button>
          </div>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

          {/* Objective selector */}
          {!plan && !loading && (
            <motion.div variants={item}>
              <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide mb-3">Objectif des stories</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {OBJECTIVE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setObjective(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      objective === opt.value
                        ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                        : 'bg-[#0D0D14] border-[#2A2A3A] text-[#7A7A9D] hover:border-violet-500/20 hover:text-white'
                    }`}>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-600/20 to-orange-500/20 border border-pink-500/20 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-pink-400 animate-pulse" />
              </div>
              <p className="text-white font-medium">Claude prépare tes stories du jour...</p>
              <p className="text-[#7A7A9D] text-sm">5 stories cohérentes adaptées à ta niche</p>
            </div>
          )}

          <AnimatePresence>
            {plan && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Plan header */}
                <motion.div variants={item} className="rounded-2xl bg-gradient-to-r from-pink-600/10 to-orange-500/5 border border-pink-500/20 p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Clock className="w-4 h-4 text-pink-400" />
                        <span className="text-xs font-semibold text-pink-400 uppercase tracking-wide">{plan.date || todayLabel}</span>
                      </div>
                      <h2 className="font-heading text-xl font-bold text-white mb-1">{plan.theme}</h2>
                      <p className="text-[#7A7A9D] text-sm">{plan.goal}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-white font-heading">{plan.stories.length}</p>
                        <p className="text-[10px] text-[#7A7A9D]">stories planifiées</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Story cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.stories.map((story, i) => (
                    <StoryCard key={i} story={story} index={i} />
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col md:flex-row gap-3">
                  <Button variant="secondary" className="flex-1" onClick={copyAll}>
                    <Copy className="w-4 h-4" />
                    Copier toutes les stories
                  </Button>
                  <Button className="flex-1" onClick={handleGenerate}>
                    <RefreshCw className="w-4 h-4" />
                    Régénérer
                  </Button>
                </div>

                {/* Objective selector for regen */}
                <div className="rounded-2xl bg-[#0D0D14] border border-[#2A2A3A] p-4">
                  <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide mb-3">Changer d'objectif</p>
                  <div className="flex flex-wrap gap-2">
                    {OBJECTIVE_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setObjective(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          objective === opt.value
                            ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                            : 'border-[#2A2A3A] text-[#7A7A9D] hover:text-white hover:border-violet-500/20'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!plan && !loading && (
            <motion.div variants={item} className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-pink-400" />
              </div>
              <p className="font-heading text-xl font-semibold text-white mb-2">Stories du jour</p>
              <p className="text-[#7A7A9D] max-w-sm mx-auto mb-6">
                5 stories pensées pour créer une vraie journée narrative : engagement, coulisses, teaser et CTA.
              </p>
              <Button onClick={handleGenerate} disabled={!profile} size="lg"
                className="bg-gradient-to-r from-pink-600 to-orange-500 border-0 text-white">
                <Sparkles className="w-5 h-5" />
                Générer mes stories du jour
              </Button>
              {!profile && <p className="text-[#7A7A9D] text-xs mt-3">Configure ton profil d'abord</p>}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
