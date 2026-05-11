'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Copy, CheckCheck, Sparkles, RefreshCw,
  Heart, Eye, MessageCircle, Flame, TrendingUp,
  ShoppingBag, Sun, ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateHooks } from '@/lib/claude';
import { UserProfile, HookSet, HookVariant, HookCategory } from '@/types';

const CATEGORIES: { value: HookCategory; label: string; icon: typeof Zap; description: string; color: string; bg: string; border: string }[] = [
  { value: 'emotion',       label: 'Émotion',      icon: Heart,         description: 'Touche les sentiments',     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    },
  { value: 'curiosity',     label: 'Curiosité',    icon: Eye,           description: 'Crée du mystère',          color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { value: 'controversy',   label: 'Controverse',  icon: MessageCircle, description: 'Provoque la réaction',     color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { value: 'storytelling',  label: 'Storytelling', icon: Sparkles,      description: 'Raconte une histoire',     color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30'   },
  { value: 'luxury',        label: 'Luxe',         icon: Sun,           description: 'Inspire l\'aspiration',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  },
  { value: 'business',      label: 'Business',     icon: TrendingUp,    description: 'Valeur & résultats',       color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30'},
  { value: 'lifestyle',     label: 'Lifestyle',    icon: ShoppingBag,   description: 'Quotidien & authenticité', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
];

const INTENSITY_CONFIG = {
  soft:       { label: 'Soft',       color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  medium:     { label: 'Medium',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  aggressive: { label: 'Puissant',   color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
};

const LENGTH_CONFIG = {
  short: { label: 'Court', color: 'text-blue-400' },
  long:  { label: 'Long',  color: 'text-violet-400' },
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[#7A7A9D] hover:text-violet-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-violet-500/10 shrink-0">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

function HookCard({ hook, index }: { hook: HookVariant; index: number }) {
  const intensity = INTENSITY_CONFIG[hook.intensity];
  const length = LENGTH_CONFIG[hook.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group rounded-xl bg-[#0D0D14] border border-[#2A2A3A] hover:border-violet-500/30 p-4 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm leading-relaxed font-medium mb-3">{hook.text}</p>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${intensity.bg} ${intensity.color} border ${intensity.border}`}>
              {intensity.label}
            </span>
            <span className={`text-[10px] font-medium ${length.color}`}>
              {length.label}
            </span>
          </div>
        </div>
        <CopyBtn text={hook.text} />
      </div>
    </motion.div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function HooksPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HookCategory>('emotion');
  const [topic, setTopic] = useState('');
  const [hookSet, setHookSet] = useState<HookSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'soft' | 'medium' | 'aggressive'>('all');
  const [savedHooks, setSavedHooks] = useState<string[]>([]);

  useEffect(() => {
    setProfile(storage.getProfile());
    const saved = localStorage.getItem('viralcoach_saved_hooks');
    if (saved) { try { setSavedHooks(JSON.parse(saved)); } catch {} }
  }, []);

  const handleGenerate = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    setLoading(true);
    try {
      const result = await generateHooks(profile, selectedCategory, topic || profile.niche);
      setHookSet(result);
      setFilter('all');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleSave = (hookText: string) => {
    const next = savedHooks.includes(hookText)
      ? savedHooks.filter(h => h !== hookText)
      : [...savedHooks, hookText];
    setSavedHooks(next);
    localStorage.setItem('viralcoach_saved_hooks', JSON.stringify(next));
  };

  const filteredHooks = hookSet?.hooks.filter(h => filter === 'all' || h.intensity === filter) || [];
  const catConfig = CATEGORIES.find(c => c.value === selectedCategory)!;

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Hook Engine</h1>
              <p className="text-[#7A7A9D] text-sm">Bibliothèque d'accroches personnalisées à ta niche</p>
            </div>
          </div>
        </div>

        {/* Category selector */}
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
          <motion.div variants={item}>
            <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide mb-3">Choisis une catégorie</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.value;
                return (
                  <button key={cat.value} onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                      active
                        ? `${cat.bg} ${cat.border} ${cat.color}`
                        : 'bg-[#0D0D14] border-[#2A2A3A] text-[#7A7A9D] hover:border-violet-500/30 hover:text-white'
                    }`}>
                    <Icon className={`w-4 h-4 shrink-0 ${active ? cat.color : ''}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{cat.label}</p>
                      <p className={`text-[10px] leading-tight ${active ? 'opacity-70' : 'text-[#555568]'}`}>{cat.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Topic input + generate */}
          <motion.div variants={item} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder={`Sujet du Reel (ex: expatriation, liberté financière, routine matin...)`}
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading || !profile} className="shrink-0">
              {loading ? <Spinner size="sm" /> : hookSet ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Génération...' : hookSet ? 'Régénérer' : 'Générer les hooks'}
            </Button>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-white font-medium">Claude génère 8 hooks {catConfig.label.toLowerCase()}s personnalisés...</p>
              <p className="text-[#7A7A9D] text-sm">Adaptés à ta niche {profile?.niche}</p>
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {hookSet && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Filter + header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${catConfig.bg} border ${catConfig.border}`}>
                    <catConfig.icon className={`w-4 h-4 ${catConfig.color}`} />
                    <span className={`text-sm font-semibold ${catConfig.color}`}>
                      {hookSet.hooks.length} hooks {hookSet.categoryLabel || catConfig.label}
                      {topic && ` — "${topic}"`}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {(['all', 'soft', 'medium', 'aggressive'] as const).map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          filter === f
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'text-[#7A7A9D] hover:text-white hover:bg-[#1A1A24]'
                        }`}>
                        {f === 'all' ? 'Tous' : INTENSITY_CONFIG[f].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hook cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredHooks.map((hook, i) => (
                    <HookCard key={i} hook={hook} index={i} />
                  ))}
                </div>

                {/* Copy all */}
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1"
                    onClick={() => navigator.clipboard.writeText(hookSet.hooks.map(h => h.text).join('\n\n'))}>
                    <Copy className="w-4 h-4" />
                    Copier tous les hooks
                  </Button>
                  <Button className="flex-1" onClick={handleGenerate}>
                    <RefreshCw className="w-4 h-4" />
                    Régénérer
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!hookSet && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Flame className="w-8 h-8 text-violet-400" />
              </div>
              <p className="font-heading text-xl font-semibold text-white mb-2">Hook Engine</p>
              <p className="text-[#7A7A9D] max-w-xs mx-auto mb-6">
                Génère 8 hooks puissants adaptés à ta niche et à ton sujet. Plusieurs intensités, courts et longs.
              </p>
              {!profile && <p className="text-violet-400 text-sm">Configure ton profil d'abord pour des hooks personnalisés</p>}
            </div>
          )}

          {/* Saved hooks */}
          {savedHooks.length > 0 && (
            <motion.div variants={item}>
              <div className="rounded-2xl bg-[#0D0D14] border border-[#2A2A3A] p-4">
                <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Hooks sauvegardés ({savedHooks.length})
                </p>
                <div className="space-y-2">
                  {savedHooks.map((hook, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#1A1A24] border border-emerald-500/10">
                      <p className="text-sm text-white flex-1">{hook}</p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => navigator.clipboard.writeText(hook)}
                          className="p-1.5 rounded-lg hover:bg-violet-500/10 transition-colors">
                          <Copy className="w-3.5 h-3.5 text-[#7A7A9D]" />
                        </button>
                        <button onClick={() => toggleSave(hook)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                          <ChevronDown className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
