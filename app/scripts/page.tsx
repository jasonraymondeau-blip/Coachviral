'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool, Copy, CheckCheck, Sparkles, Film, Type, Gauge,
  TrendingUp, User, ArrowRight, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateScript, generateCaption, scoreContent, enhanceContent } from '@/lib/claude';
import { Script, Caption, UserProfile, PostType, ContentScore, EnhancedContent } from '@/types';
import { getScoreColor } from '@/lib/utils';

const DURATIONS = [
  { value: '15', label: '15 secondes' },
  { value: '30', label: '30 secondes' },
  { value: '60', label: '60 secondes' },
];

const FORMAT_OPTIONS: { value: PostType; label: string }[] = [
  { value: 'Reel', label: 'Reel' },
  { value: 'Carrousel', label: 'Carrousel' },
  { value: 'Photo', label: 'Photo' },
];

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-[#7A7A9D] hover:text-violet-400 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {label || (copied ? 'Copié !' : 'Copier')}
    </button>
  );
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  const color = value < 40 ? '#EF4444' : value < 65 ? '#F59E0B' : '#10B981';
  const circumference = 2 * Math.PI * 20;
  const dash = (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 50 50" className="w-full h-full -rotate-90">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#2A2A3A" strokeWidth="4" />
          <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <p className="text-xs text-[#7A7A9D] text-center leading-tight">{label}</p>
    </div>
  );
}

export default function ScriptsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<{ id: string; title: string }[]>([]);
  const [mode, setMode] = useState<'script' | 'caption' | 'scorer'>('script');

  // Script mode
  const [scriptIdea, setScriptIdea] = useState('');
  const [duration, setDuration] = useState('30');
  const [script, setScript] = useState<Script | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);

  // Caption mode
  const [captionSubject, setCaptionSubject] = useState('');
  const [captionFormat, setCaptionFormat] = useState<PostType>('Reel');
  const [caption, setCaption] = useState<Caption | null>(null);
  const [captionLoading, setCaptionLoading] = useState(false);

  // Enhance buttons
  const [enhanceLoading, setEnhanceLoading] = useState<'viral' | 'personal' | null>(null);
  const [enhanced, setEnhanced] = useState<EnhancedContent | null>(null);

  // Scorer mode
  const [scoreText, setScoreText] = useState('');
  const [scoreType, setScoreType] = useState('caption');
  const [scored, setScored] = useState<ContentScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  useEffect(() => {
    setProfile(storage.getProfile());
    setSavedIdeas(storage.getIdeas().map(i => ({ id: i.id, title: i.title })));
  }, []);

  const handleGenerateScript = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    if (!scriptIdea) return;
    setScriptLoading(true);
    setEnhanced(null);
    try {
      const result = await generateScript(scriptIdea, Number(duration), profile);
      setScript(result as Script);
    } catch (e) { console.error(e); alert('Erreur lors de la génération.'); }
    finally { setScriptLoading(false); }
  };

  const handleGenerateCaption = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    if (!captionSubject) return;
    setCaptionLoading(true);
    setEnhanced(null);
    try {
      const result = await generateCaption(captionSubject, captionFormat, profile);
      setCaption(result as Caption);
    } catch (e) { console.error(e); alert('Erreur lors de la génération.'); }
    finally { setCaptionLoading(false); }
  };

  const handleEnhance = async (mode: 'viral' | 'personal', text: string) => {
    if (!profile) return;
    setEnhanceLoading(mode);
    setEnhanced(null);
    try {
      const result = await enhanceContent(text, mode, profile);
      setEnhanced(result);
    } catch (e) { console.error(e); }
    finally { setEnhanceLoading(null); }
  };

  const handleScore = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    if (!scoreText) return;
    setScoreLoading(true);
    try {
      const result = await scoreContent(scoreText, scoreType, profile);
      setScored(result);
    } catch (e) { console.error(e); alert('Erreur lors du scoring.'); }
    finally { setScoreLoading(false); }
  };

  const tabs = [
    { id: 'script', icon: Film, label: 'Script Reel' },
    { id: 'caption', icon: Type, label: 'Caption' },
    { id: 'scorer', icon: Gauge, label: 'Scorer IA' },
  ] as const;

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">Scripts & Captions</h1>
            <p className="text-[#7A7A9D] text-sm">Génère, optimise et score ton contenu avant publication</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-[#13131A] rounded-xl border border-[#2A2A3A] w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                mode === tab.id ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white' : 'text-[#7A7A9D] hover:text-white'
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <AnimatePresence mode="wait">

            {/* ── Script Mode ── */}
            {mode === 'script' && (
              <motion.div key="script" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="col-span-12 grid grid-cols-12 gap-6">
                <div className="col-span-5 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Script Reel</CardTitle>
                      <CardDescription>Génère un script complet pour ton Reel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea label="Idée du Reel" placeholder="Décris ton idée ou sélectionne depuis la bibliothèque..."
                        rows={3} value={scriptIdea} onChange={e => setScriptIdea(e.target.value)} />
                      {savedIdeas.length > 0 && (
                        <div>
                          <p className="text-xs text-[#7A7A9D] mb-2">Depuis ta bibliothèque :</p>
                          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                            {savedIdeas.map(idea => (
                              <button key={idea.id} onClick={() => setScriptIdea(idea.title)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-[#1A1A24] border border-[#2A2A3A] text-[#7A7A9D] hover:text-white hover:border-violet-500/30 transition-all cursor-pointer">
                                {idea.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <Select label="Durée cible" options={DURATIONS} value={duration}
                        onChange={e => setDuration(e.target.value)} />
                      <Button onClick={handleGenerateScript} disabled={scriptLoading || !scriptIdea} className="w-full">
                        {scriptLoading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                        {scriptLoading ? 'Génération...' : 'Générer le script'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Enhance buttons */}
                  {script && (
                    <Card className="border-violet-500/20">
                      <CardHeader>
                        <CardTitle className="text-base">Optimiser le hook</CardTitle>
                        <CardDescription>Claude réécrit avec un angle différent</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="secondary" className="w-full justify-start gap-3"
                          disabled={!!enhanceLoading}
                          onClick={() => handleEnhance('viral', script.hook)}>
                          {enhanceLoading === 'viral' ? <Spinner size="sm" /> : <TrendingUp className="w-4 h-4 text-pink-400" />}
                          Rendre plus viral
                        </Button>
                        <Button variant="secondary" className="w-full justify-start gap-3"
                          disabled={!!enhanceLoading}
                          onClick={() => handleEnhance('personal', script.hook)}>
                          {enhanceLoading === 'personal' ? <Spinner size="sm" /> : <User className="w-4 h-4 text-violet-400" />}
                          Rendre plus personnel
                        </Button>
                        {enhanced && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-emerald-400">Version améliorée</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="success">+{enhanced.scoreGain} pts</Badge>
                                <CopyButton text={enhanced.enhanced} />
                              </div>
                            </div>
                            <p className="text-sm text-white">&ldquo;{enhanced.enhanced}&rdquo;</p>
                            <div className="flex flex-wrap gap-1">
                              {enhanced.changes.map((c, i) => (
                                <span key={i} className="text-xs text-[#7A7A9D] flex items-center gap-1">
                                  <ChevronRight className="w-3 h-3 text-emerald-400" />{c}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="col-span-7">
                  <AnimatePresence>
                    {script && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <Card className="border-violet-500/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-violet-400">Hook (0-3s)</CardTitle>
                              <CopyButton text={script.hook} />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-white text-lg font-medium">&ldquo;{script.hook}&rdquo;</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader><CardTitle>Scènes</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                            {script.scenes.map((scene, i) => (
                              <div key={i} className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="violet">Scène {i + 1}</Badge>
                                  <CopyButton text={`${scene.text}\n[${scene.action}]\nOverlay: ${scene.overlay}`} />
                                </div>
                                <p className="text-white text-sm mb-2">{scene.text}</p>
                                <p className="text-[#7A7A9D] text-xs italic">📹 {scene.action}</p>
                                {scene.overlay && <p className="text-violet-400 text-xs mt-1">Overlay: &ldquo;{scene.overlay}&rdquo;</p>}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-pink-400 text-base">CTA Final</CardTitle>
                                <CopyButton text={script.cta} />
                              </div>
                            </CardHeader>
                            <CardContent><p className="text-white text-sm">{script.cta}</p></CardContent>
                          </Card>
                          <Card>
                            <CardHeader><CardTitle className="text-amber-400 text-base">Musique</CardTitle></CardHeader>
                            <CardContent><p className="text-white text-sm">{script.music}</p></CardContent>
                          </Card>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!script && !scriptLoading && (
                    <div className="h-full flex items-center justify-center py-24 text-center">
                      <div><Film className="w-12 h-12 text-[#2A2A3A] mx-auto mb-3" />
                        <p className="text-[#7A7A9D]">Génère ton script pour le voir apparaître ici</p></div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Caption Mode ── */}
            {mode === 'caption' && (
              <motion.div key="caption" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="col-span-12 grid grid-cols-12 gap-6">
                <div className="col-span-5 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Caption Instagram</CardTitle>
                      <CardDescription>Génère une caption optimisée pour ton post</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea label="Sujet du post"
                        placeholder="Ex: coucher de soleil sur la plage de Flic en Flac..."
                        rows={3} value={captionSubject} onChange={e => setCaptionSubject(e.target.value)} />
                      <Select label="Format" options={FORMAT_OPTIONS} value={captionFormat}
                        onChange={e => setCaptionFormat(e.target.value as PostType)} />
                      <Button onClick={handleGenerateCaption} disabled={captionLoading || !captionSubject} className="w-full">
                        {captionLoading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                        {captionLoading ? 'Génération...' : 'Générer la caption'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Enhance buttons for caption */}
                  {caption && (
                    <Card className="border-violet-500/20">
                      <CardHeader>
                        <CardTitle className="text-base">Optimiser la caption</CardTitle>
                        <CardDescription>Réécriture intelligente en 1 clic</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="secondary" className="w-full justify-start gap-3"
                          disabled={!!enhanceLoading}
                          onClick={() => handleEnhance('viral', caption.long)}>
                          {enhanceLoading === 'viral' ? <Spinner size="sm" /> : <TrendingUp className="w-4 h-4 text-pink-400" />}
                          Rendre plus viral
                        </Button>
                        <Button variant="secondary" className="w-full justify-start gap-3"
                          disabled={!!enhanceLoading}
                          onClick={() => handleEnhance('personal', caption.long)}>
                          {enhanceLoading === 'personal' ? <Spinner size="sm" /> : <User className="w-4 h-4 text-violet-400" />}
                          Rendre plus personnel
                        </Button>
                        {enhanced && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-emerald-400">Version améliorée</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="success">+{enhanced.scoreGain} pts</Badge>
                                <CopyButton text={enhanced.enhanced} />
                              </div>
                            </div>
                            <p className="text-sm text-white whitespace-pre-line line-clamp-6">{enhanced.enhanced}</p>
                            <div className="space-y-0.5">
                              {enhanced.changes.map((c, i) => (
                                <p key={i} className="text-xs text-[#7A7A9D] flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />{c}
                                </p>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="col-span-7">
                  <AnimatePresence>
                    {caption && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="border-violet-500/20">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Caption courte</CardTitle>
                                <CopyButton text={caption.short} />
                              </div>
                            </CardHeader>
                            <CardContent><p className="text-white text-sm">{caption.short}</p></CardContent>
                          </Card>
                          <Card className="border-pink-500/20">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Caption longue</CardTitle>
                                <CopyButton text={caption.long} />
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-white text-sm whitespace-pre-line line-clamp-6">{caption.long}</p>
                            </CardContent>
                          </Card>
                        </div>
                        <Card>
                          <CardHeader>
                            <CardTitle>Hooks A/B Test</CardTitle>
                            <CardDescription>5 variantes à tester</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {caption.hooks.map((hook, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-[#0D0D14] border border-[#2A2A3A] p-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-violet-400 font-bold w-5">#{i + 1}</span>
                                  <p className="text-sm text-white">{hook}</p>
                                </div>
                                <CopyButton text={hook} />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>Hashtags stratégiques</CardTitle>
                              <CopyButton text={[...caption.hashtags.niche, ...caption.hashtags.large, ...caption.hashtags.local].join(' ')} label="Tout copier" />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(['niche', 'large', 'local'] as const).map(cat => (
                              <div key={cat}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-xs font-medium text-[#7A7A9D] capitalize">{cat}</p>
                                  <CopyButton text={caption.hashtags[cat].join(' ')} />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {caption.hashtags[cat].map(h => (
                                    <span key={h} className={`text-xs px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                                      cat === 'niche' ? 'bg-violet-500/10 text-violet-400' :
                                      cat === 'large' ? 'bg-pink-500/10 text-pink-400' :
                                      'bg-emerald-500/10 text-emerald-400'
                                    }`} onClick={() => navigator.clipboard.writeText(h)}>{h}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!caption && !captionLoading && (
                    <div className="h-full flex items-center justify-center py-24 text-center">
                      <div><Type className="w-12 h-12 text-[#2A2A3A] mx-auto mb-3" />
                        <p className="text-[#7A7A9D]">Génère ta caption pour la voir apparaître ici</p></div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Scorer Mode ── */}
            {mode === 'scorer' && (
              <motion.div key="scorer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="col-span-12 grid grid-cols-12 gap-6">
                <div className="col-span-5">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-violet-400" />
                        Scorer avant publication
                      </CardTitle>
                      <CardDescription>Score ton contenu AVANT de publier — hook, clarté, émotion, partage</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select
                        label="Type de contenu"
                        options={[
                          { value: 'caption', label: 'Caption Instagram' },
                          { value: 'hook', label: 'Hook / Première ligne' },
                          { value: 'script', label: 'Script Reel' },
                        ]}
                        value={scoreType}
                        onChange={e => setScoreType(e.target.value)}
                      />
                      <Textarea
                        label="Contenu à scorer"
                        placeholder="Colle ici ton hook, caption ou script à analyser..."
                        rows={8}
                        value={scoreText}
                        onChange={e => setScoreText(e.target.value)}
                      />
                      <Button onClick={handleScore} disabled={scoreLoading || !scoreText || !profile} size="lg" className="w-full">
                        {scoreLoading ? <Spinner size="sm" /> : <Gauge className="w-5 h-5" />}
                        {scoreLoading ? 'Analyse en cours...' : 'Scorer mon contenu'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="col-span-7">
                  <AnimatePresence>
                    {scored && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Global Score */}
                        <Card className="border-violet-500/20">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <div className="relative w-24 h-24">
                                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#2A2A3A" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="40" fill="none"
                                      stroke={getScoreColor(scored.total)} strokeWidth="8"
                                      strokeDasharray={`${(scored.total / 100) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`}
                                      strokeLinecap="round" />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="font-heading text-2xl font-bold text-white">{scored.total}</span>
                                    <span className="text-xs text-[#7A7A9D]">/100</span>
                                  </div>
                                </div>
                                <p className="text-xs text-[#7A7A9D] mt-1">Score global</p>
                              </div>
                              <div className="flex-1">
                                <p className="text-white text-sm leading-relaxed">{scored.feedback}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Breakdown */}
                        <Card>
                          <CardHeader><CardTitle>Analyse détaillée</CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                              <ScoreRing value={scored.hookStrength} label="Force du Hook" />
                              <ScoreRing value={scored.messageClarity} label="Clarté" />
                              <ScoreRing value={scored.emotionalImpact} label="Impact émotionnel" />
                              <ScoreRing value={scored.shareability} label="Potentiel partage" />
                              <ScoreRing value={scored.readability} label="Lisibilité" />
                              <ScoreRing value={scored.hashtagPotential} label="Hashtags" />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Hook rewrite */}
                        {scored.rewrittenHook && (
                          <Card className="border-emerald-500/20">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-emerald-400 text-base">Hook réécrit</CardTitle>
                                <CopyButton text={scored.rewrittenHook} />
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-white text-sm">&ldquo;{scored.rewrittenHook}&rdquo;</p>
                            </CardContent>
                          </Card>
                        )}

                        {/* Improvements */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Améliorations concrètes</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {scored.improvements.map((imp, i) => (
                              <div key={i} className="flex items-start gap-3 rounded-lg bg-[#0D0D14] border border-[#2A2A3A] p-3">
                                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                <p className="text-sm text-white">{imp}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!scored && !scoreLoading && (
                    <div className="h-full flex items-center justify-center py-24 text-center">
                      <div>
                        <Gauge className="w-12 h-12 text-[#2A2A3A] mx-auto mb-3" />
                        <p className="text-white font-medium mb-2">Scorer ton contenu avant de publier</p>
                        <p className="text-[#7A7A9D] text-sm max-w-xs">Colle ta caption ou ton hook, Claude analyse le potentiel viral en détail</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
