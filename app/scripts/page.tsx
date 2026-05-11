'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Copy, CheckCheck, Sparkles, RefreshCw,
  Play, Camera, Type, Clock, Heart, Music,
  Hash, MessageSquare, Pin, ChevronRight, ChevronDown,
  Zap, User, Mountain, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateReelBuilder } from '@/lib/claude';
import { UserProfile, Post, ReelBuilder, ReelScene } from '@/types';

const DURATION_OPTIONS = [
  { value: 15,  label: '15 sec', sub: 'Ultra court' },
  { value: 22,  label: '22 sec', sub: 'Viral optimal' },
  { value: 30,  label: '30 sec', sub: 'Court' },
  { value: 60,  label: '60 sec', sub: 'Standard' },
  { value: 90,  label: '90 sec', sub: 'Long' },
];

const SCENE_TYPE_CONFIG: Record<string, { label: string; icon: typeof Film; color: string; bg: string; border: string }> = {
  'face-cam':   { label: 'Face caméra',  icon: User,     color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  'lifestyle':  { label: 'Lifestyle',    icon: Mountain, color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30'   },
  'text':       { label: 'Texte écran',  icon: Type,     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  'broll':      { label: 'B-roll',       icon: Camera,   color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30' },
  'transition': { label: 'Transition',   icon: Layers,   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  },
};

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[#7A7A9D] hover:text-violet-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-violet-500/10 shrink-0">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {label || (copied ? 'Copié !' : 'Copier')}
    </button>
  );
}

function SceneCard({ scene, index }: { scene: ReelScene; index: number }) {
  const cfg = SCENE_TYPE_CONFIG[scene.type] || SCENE_TYPE_CONFIG['broll'];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-xl bg-[#0D0D14] border ${cfg.border} overflow-hidden`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-2.5 ${cfg.bg} border-b ${cfg.border}`}>
        <div className="w-7 h-7 rounded-lg bg-[#0D0D14]/50 flex items-center justify-center shrink-0">
          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <span className={`text-xs font-semibold ${cfg.color}`}>{scene.order}. {cfg.label}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#7A7A9D]" />
          <span className="text-xs text-[#7A7A9D] font-medium">{scene.duration}s</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm text-white leading-snug">{scene.description}</p>
        {scene.screenText && (
          <div className="rounded-lg bg-[#1A1A24] border border-[#2A2A3A] px-3 py-2 flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-400 font-medium">{scene.screenText}</p>
            <CopyBtn text={scene.screenText} />
          </div>
        )}
        <p className="text-xs text-[#7A7A9D] italic">{scene.emotion}</p>
      </div>
    </motion.div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ScriptsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(22);
  const [reel, setReel] = useState<ReelBuilder | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'storyboard' | 'script' | 'caption' | 'extras'>('storyboard');
  const [hookVariantIdx, setHookVariantIdx] = useState(0);
  const topicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(storage.getProfile());
    setPosts(storage.getPosts());
    // Pre-fill topic from URL param (e.g. from dashboard)
    const params = new URLSearchParams(window.location.search);
    const t = params.get('topic');
    if (t) setTopic(t);
  }, []);

  const handleGenerate = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    if (!topic.trim()) { topicRef.current?.focus(); return; }
    setLoading(true);
    try {
      const result = await generateReelBuilder(profile, posts, topic, duration);
      setReel(result);
      setActiveTab('storyboard');
      setHookVariantIdx(0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'storyboard', label: 'Storyboard', icon: Film },
    { id: 'script',     label: 'Script',     icon: Type },
    { id: 'caption',    label: 'Légende',    icon: MessageSquare },
    { id: 'extras',     label: 'Extras',     icon: Hash },
  ] as const;

  const totalDuration = reel?.scenes.reduce((a, s) => a + s.duration, 0) || 0;

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Reel Builder</h1>
              <p className="text-[#7A7A9D] text-sm">Script · Storyboard · Légende · Hashtags</p>
            </div>
          </div>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

          {/* Inputs */}
          <motion.div variants={item} className="rounded-2xl bg-[#0D0D14] border border-[#2A2A3A] p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide block mb-2">
                Sujet du Reel
              </label>
              <Input
                ref={topicRef}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="Ex: Pourquoi j'ai quitté la France, Ma routine matin, Mon secret pour gagner de l'argent..."
                className="text-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide block mb-2">
                Durée cible
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map(d => (
                  <button key={d.value} onClick={() => setDuration(d.value)}
                    className={`flex flex-col items-center px-4 py-2.5 rounded-xl border transition-all min-w-[60px] ${
                      duration === d.value
                        ? 'bg-violet-500/15 border-violet-500/40 text-violet-400'
                        : 'bg-[#1A1A24] border-[#2A2A3A] text-[#7A7A9D] hover:border-violet-500/20 hover:text-white'
                    }`}>
                    <span className="text-sm font-bold">{d.label}</span>
                    <span className={`text-[10px] ${duration === d.value ? 'text-violet-400/70' : 'text-[#555568]'}`}>{d.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={loading || !profile || !topic.trim()} className="w-full" size="lg">
              {loading ? <Spinner size="sm" /> : reel ? <RefreshCw className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              {loading ? 'Génération du Reel...' : reel ? 'Régénérer le Reel' : 'Générer mon Reel complet'}
            </Button>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-pink-600/20 border border-violet-500/20 flex items-center justify-center">
                <Play className="w-8 h-8 text-violet-400 animate-pulse" />
              </div>
              <p className="text-white font-heading text-xl font-semibold">Claude construit ton Reel...</p>
              <p className="text-[#7A7A9D] text-sm">Storyboard · Script · Légende · Hashtags · Commentaire épinglé</p>
            </div>
          )}

          <AnimatePresence>
            {reel && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                {/* Hook section */}
                <motion.div variants={item}>
                  <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/30 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Hook — Première phrase</p>
                    </div>
                    <p className="text-white font-heading text-lg font-semibold mb-4">«{reel.hookVariants?.[hookVariantIdx] || reel.hook}»</p>

                    {/* Hook variants */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[reel.hook, ...(reel.hookVariants || [])].slice(0, 4).map((h, i) => (
                        <button key={i} onClick={() => setHookVariantIdx(i)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            hookVariantIdx === i
                              ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                              : 'border-[#2A2A3A] text-[#7A7A9D] hover:text-white hover:border-violet-500/20'
                          }`}>
                          Variante {i + 1}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <CopyBtn text={reel.hookVariants?.[hookVariantIdx] || reel.hook} label="Copier ce hook" />
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0D14] border border-[#2A2A3A]">
                        <Heart className="w-3.5 h-3.5 text-pink-400" />
                        <span className="text-xs text-[#7A7A9D]">{reel.targetEmotion}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D0D14] border border-[#2A2A3A]">
                        <Music className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-[#7A7A9D]">{reel.musicMood}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Duration bar */}
                <motion.div variants={item} className="flex items-center gap-2 px-2">
                  <Clock className="w-4 h-4 text-[#7A7A9D] shrink-0" />
                  <div className="flex-1 flex gap-1 h-2 rounded-full overflow-hidden">
                    {reel.scenes.map((scene, i) => {
                      const cfg = SCENE_TYPE_CONFIG[scene.type] || SCENE_TYPE_CONFIG['broll'];
                      const pct = (scene.duration / (totalDuration || reel.totalDuration)) * 100;
                      return (
                        <div key={i} className={`h-full rounded-full ${cfg.bg.replace('/10', '/60')}`}
                          style={{ width: `${pct}%`, minWidth: 4 }} title={`${cfg.label} — ${scene.duration}s`} />
                      );
                    })}
                  </div>
                  <span className="text-xs text-[#7A7A9D] shrink-0">{totalDuration || reel.totalDuration}s</span>
                </motion.div>

                {/* Tab nav */}
                <motion.div variants={item} className="flex gap-1 p-1 bg-[#0D0D14] border border-[#2A2A3A] rounded-xl">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          activeTab === tab.id
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'text-[#7A7A9D] hover:text-white'
                        }`}>
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </motion.div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeTab === 'storyboard' && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide">
                          {reel.scenes.length} scènes — visualise ton Reel avant de filmer
                        </p>
                        {reel.scenes.map((scene, i) => (
                          <SceneCard key={i} scene={scene} index={i} />
                        ))}
                      </div>
                    )}

                    {activeTab === 'script' && (
                      <div className="rounded-2xl bg-[#0D0D14] border border-[#2A2A3A] p-5">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide">Script complet</p>
                          <CopyBtn text={reel.script} label="Copier le script" />
                        </div>
                        <p className="text-white text-sm leading-relaxed whitespace-pre-line">{reel.script}</p>
                        <div className="mt-4 pt-4 border-t border-[#2A2A3A]">
                          <div className="flex items-center gap-2 mb-2">
                            <ChevronRight className="w-4 h-4 text-pink-400" />
                            <p className="text-xs font-semibold text-pink-400">CTA</p>
                            <CopyBtn text={reel.cta} />
                          </div>
                          <p className="text-white text-sm font-medium">{reel.cta}</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'caption' && (
                      <div className="rounded-2xl bg-[#0D0D14] border border-[#2A2A3A] p-5">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide">Légende Instagram</p>
                          <CopyBtn text={reel.caption} label="Copier la légende" />
                        </div>
                        <p className="text-white text-sm leading-relaxed whitespace-pre-line">{reel.caption}</p>
                      </div>
                    )}

                    {activeTab === 'extras' && (
                      <div className="space-y-4">
                        {/* Hashtags */}
                        <div className="rounded-2xl bg-[#0D0D14] border border-[#2A2A3A] p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-violet-400" />
                              <p className="text-xs font-semibold text-[#7A7A9D] uppercase tracking-wide">Hashtags</p>
                            </div>
                            <CopyBtn text={reel.hashtags.join(' ')} label="Copier les hashtags" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {reel.hashtags.map((tag, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 cursor-pointer hover:bg-violet-500/20 transition-all"
                                onClick={() => navigator.clipboard.writeText(tag)}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Pinned comment */}
                        <div className="rounded-2xl bg-[#0D0D14] border border-pink-500/20 p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Pin className="w-4 h-4 text-pink-400" />
                              <p className="text-xs font-semibold text-pink-400 uppercase tracking-wide">Commentaire épinglé</p>
                            </div>
                            <CopyBtn text={reel.pinnedComment} />
                          </div>
                          <p className="text-white text-sm leading-relaxed">{reel.pinnedComment}</p>
                        </div>

                        {/* Music + Emotion */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Music className="w-4 h-4 text-emerald-400" />
                              <p className="text-xs font-semibold text-[#7A7A9D]">Musique</p>
                            </div>
                            <p className="text-white text-sm font-medium capitalize">{reel.musicMood}</p>
                          </div>
                          <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Heart className="w-4 h-4 text-red-400" />
                              <p className="text-xs font-semibold text-[#7A7A9D]">Émotion cible</p>
                            </div>
                            <p className="text-white text-sm font-medium">{reel.targetEmotion}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Regen */}
                <Button variant="secondary" className="w-full" onClick={handleGenerate}>
                  <RefreshCw className="w-4 h-4" />
                  Régénérer le Reel
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!reel && !loading && (
            <motion.div variants={item} className="text-center py-16">
              <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                <Film className="w-10 h-10 text-violet-400" />
              </div>
              <p className="font-heading text-xl font-semibold text-white mb-2">Reel Builder</p>
              <p className="text-[#7A7A9D] max-w-sm mx-auto">
                Génère un Reel complet : hook, storyboard scène par scène, script, légende, hashtags et commentaire épinglé.
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
