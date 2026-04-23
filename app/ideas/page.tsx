'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Sparkles, Bookmark, Trash2, Filter, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { generateIdeas } from '@/lib/claude';
import { Idea, IdeaParams, PostType, UserProfile } from '@/types';
import { getScoreColor, getDifficultyColor } from '@/lib/utils';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'Reel', label: 'Reel' },
  { value: 'Carrousel', label: 'Carrousel' },
  { value: 'Photo', label: 'Photo' },
];

const VIRAL_LEVELS = [
  { value: 'safe', label: 'Safe — Contenu classique optimisé' },
  { value: 'ambitieux', label: 'Ambitieux — Prise de risque calculée' },
  { value: 'viral', label: 'Viral — Potentiel maximal' },
];

export default function IdeasPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([]);
  const [generatedIdeas, setGeneratedIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterFormat, setFilterFormat] = useState('');
  const [params, setParams] = useState<IdeaParams>({
    format: 'Reel',
    theme: '',
    trend: '',
    viralLevel: 'ambitieux',
  });

  useEffect(() => {
    setProfile(storage.getProfile());
    setSavedIdeas(storage.getIdeas());
  }, []);

  const handleGenerate = async () => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    setLoading(true);
    try {
      const ideas = await generateIdeas(params, profile);
      const withIds = (ideas as Idea[]).map((i: Idea) => ({ ...i, id: i.id || crypto.randomUUID() }));
      setGeneratedIdeas(withIds);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération. Vérifie ta clé API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (idea: Idea) => {
    const toSave = { ...idea, savedAt: new Date().toISOString() };
    storage.addIdea(toSave);
    setSavedIdeas(storage.getIdeas());
  };

  const handleDeleteSaved = (id: string) => {
    storage.deleteIdea(id);
    setSavedIdeas(storage.getIdeas());
  };

  const filteredSaved = filterFormat
    ? savedIdeas.filter(i => i.format === filterFormat)
    : savedIdeas;

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Idées Virales</h1>
            <p className="text-[#7A7A9D] text-sm">Génère et sauvegarde des idées de posts virales</p>
          </div>
        </div>

        {/* Generator */}
        <Card className="mb-6 border-violet-500/20">
          <CardHeader>
            <CardTitle>Paramètres de génération</CardTitle>
            <CardDescription>Claude va générer 5 idées personnalisées pour ton profil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Format cible"
                options={POST_TYPES}
                value={params.format}
                onChange={e => setParams(p => ({ ...p, format: e.target.value as PostType }))}
              />
              <Input
                label="Thème"
                placeholder={`Ex: ${profile?.themes?.[0] || 'vie locale à Maurice'}`}
                value={params.theme}
                onChange={e => setParams(p => ({ ...p, theme: e.target.value }))}
              />
              <Input
                label="Tendance actuelle"
                placeholder="Ex: golden hour, silent walk, soft life..."
                value={params.trend}
                onChange={e => setParams(p => ({ ...p, trend: e.target.value }))}
              />
            </div>
            <Select
              label="Niveau de viralité visé"
              options={VIRAL_LEVELS}
              value={params.viralLevel}
              onChange={e => setParams(p => ({ ...p, viralLevel: e.target.value as IdeaParams['viralLevel'] }))}
            />
            <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full">
              {loading ? <Spinner size="sm" /> : <Sparkles className="w-5 h-5" />}
              {loading ? 'Génération en cours...' : 'Générer 5 idées virales'}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Ideas */}
        <AnimatePresence>
          {generatedIdeas.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h2 className="font-heading text-lg font-semibold text-white mb-4">Idées générées</h2>
              <div className="grid grid-cols-1 gap-4">
                {generatedIdeas.map((idea, idx) => {
                  const isSaved = savedIdeas.some(s => s.id === idea.id || s.title === idea.title);
                  const scoreColor = getScoreColor(idea.viralScore);
                  const diffColor = getDifficultyColor(idea.difficulty);
                  return (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                    >
                      <Card className="hover:border-violet-500/30 transition-all">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 font-heading text-lg font-bold"
                              style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}30` }}
                            >
                              {idea.viralScore}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="font-heading text-white font-semibold">{idea.title}</h3>
                                <Badge variant={idea.format === 'Reel' ? 'violet' : idea.format === 'Carrousel' ? 'pink' : 'outline'}>
                                  {idea.format}
                                </Badge>
                                <span className="text-xs px-2 py-0.5 rounded-md"
                                  style={{ color: diffColor, background: `${diffColor}15`, border: `1px solid ${diffColor}30` }}>
                                  {idea.difficulty}
                                </span>
                              </div>
                              <p className="text-[#7A7A9D] text-sm mb-3">{idea.concept}</p>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-violet-400 font-medium shrink-0 mt-0.5">Hook:</span>
                                  <span className="text-xs text-white">{idea.hook}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <span className="text-xs text-[#7A7A9D]">{idea.viralReason}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant={isSaved ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={() => !isSaved && handleSave(idea)}
                              disabled={isSaved}
                            >
                              <Bookmark className="w-4 h-4" />
                              {isSaved ? 'Sauvegardé' : 'Sauvegarder'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Ideas Library */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-white flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-violet-400" />
              Bibliothèque ({savedIdeas.length})
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#7A7A9D]" />
              <Select
                options={[
                  { value: '', label: 'Tous les formats' },
                  { value: 'Reel', label: 'Reels' },
                  { value: 'Carrousel', label: 'Carrousels' },
                  { value: 'Photo', label: 'Photos' },
                ]}
                value={filterFormat}
                onChange={e => setFilterFormat(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {filteredSaved.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-10 h-10 text-[#2A2A3A] mx-auto mb-3" />
              <p className="text-white font-medium">Aucune idée sauvegardée</p>
              <p className="text-[#7A7A9D] text-sm">Génère des idées et sauvegarde celles qui t&apos;inspirent</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSaved.map((idea, idx) => {
                const scoreColor = getScoreColor(idea.viralScore);
                return (
                  <motion.div key={idea.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-heading text-sm font-semibold text-white leading-snug">{idea.title}</h3>
                          <button onClick={() => handleDeleteSaved(idea.id)} className="text-[#7A7A9D] hover:text-red-400 transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={idea.format === 'Reel' ? 'violet' : idea.format === 'Carrousel' ? 'pink' : 'outline'}>
                            {idea.format}
                          </Badge>
                          <span className="text-xs font-bold" style={{ color: scoreColor }}>{idea.viralScore}/100</span>
                        </div>
                        <p className="text-[#7A7A9D] text-xs line-clamp-2">{idea.concept}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
