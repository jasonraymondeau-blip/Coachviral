'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Save, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { storage } from '@/lib/storage';
import { UserProfile } from '@/types';

const NICHES = [
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'expat', label: 'Expatriation' },
  { value: 'voyage', label: 'Voyage' },
  { value: 'fitness', label: 'Fitness & Santé' },
  { value: 'mode', label: 'Mode & Beauté' },
  { value: 'food', label: 'Food & Cuisine' },
  { value: 'business', label: 'Business & Finance' },
  { value: 'education', label: 'Éducation' },
  { value: 'famille', label: 'Famille & Parentalité' },
  { value: 'autre', label: 'Autre' },
];

const TONES = [
  { value: 'inspirant', label: 'Inspirant' },
  { value: 'humoristique', label: 'Humoristique' },
  { value: 'educatif', label: 'Éducatif' },
  { value: 'authentique', label: 'Authentique' },
  { value: 'motivant', label: 'Motivant' },
  { value: 'informatif', label: 'Informatif' },
];

const THEMES = [
  'plage', 'cuisine locale', 'admin expat', 'logement', 'culture',
  'transport', 'shopping', 'vie nocturne', 'famille', 'travail',
  'santé', 'sport', 'nature', 'architecture', 'rencontres', 'finances',
];

const defaultProfile: UserProfile = {
  username: '',
  niche: 'lifestyle',
  subNiche: '',
  followers: 0,
  engagementRate: 0,
  publishingFrequency: 3,
  goal: '',
  tone: 'authentique',
  themes: [],
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = storage.getProfile();
    if (stored) setProfile(stored);
  }, []);

  const handleSave = () => {
    storage.setProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleTheme = (theme: string) => {
    setProfile(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme],
    }));
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Profil Instagram</h1>
          </div>
          <p className="text-[#7A7A9D]">Ces informations sont utilisées par Claude pour personnaliser tous tes conseils</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de base</CardTitle>
              <CardDescription>Ton compte Instagram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="username"
                label="Nom d'utilisateur Instagram"
                placeholder="@ton_username"
                value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="niche"
                  label="Niche principale"
                  options={NICHES}
                  value={profile.niche}
                  onChange={e => setProfile(p => ({ ...p, niche: e.target.value }))}
                  required
                />
                <Select
                  id="tone"
                  label="Tonalité souhaitée"
                  options={TONES}
                  value={profile.tone}
                  onChange={e => setProfile(p => ({ ...p, tone: e.target.value }))}
                />
              </div>
              <Textarea
                id="subNiche"
                label="Sous-niche / Description"
                placeholder="Ex: vie d'expat à l'île Maurice, famille franco-mauricienne..."
                rows={2}
                value={profile.subNiche}
                onChange={e => setProfile(p => ({ ...p, subNiche: e.target.value }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métriques actuelles</CardTitle>
              <CardDescription>Ton état actuel sur Instagram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  id="followers"
                  label="Abonnés"
                  type="number"
                  placeholder="5000"
                  value={profile.followers || ''}
                  onChange={e => setProfile(p => ({ ...p, followers: Number(e.target.value) }))}
                />
                <Input
                  id="engagement"
                  label="Taux d'engagement (%)"
                  type="number"
                  step="0.1"
                  placeholder="3.5"
                  value={profile.engagementRate || ''}
                  onChange={e => setProfile(p => ({ ...p, engagementRate: Number(e.target.value) }))}
                />
                <Input
                  id="frequency"
                  label="Posts/semaine"
                  type="number"
                  placeholder="3"
                  value={profile.publishingFrequency || ''}
                  onChange={e => setProfile(p => ({ ...p, publishingFrequency: Number(e.target.value) }))}
                />
              </div>
              <Textarea
                id="goal"
                label="Objectif"
                placeholder="Ex: Atteindre 10K abonnés engagés dans 6 mois et monétiser mon compte"
                rows={2}
                value={profile.goal}
                onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thèmes récurrents</CardTitle>
              <CardDescription>Les sujets que tu abordes le plus souvent (sélectionne tout ce qui s&apos;applique)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {THEMES.map(theme => (
                  <motion.button
                    key={theme}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleTheme(theme)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      profile.themes.includes(theme)
                        ? 'bg-gradient-to-r from-violet-600/30 to-pink-600/20 border border-violet-500/50 text-violet-300'
                        : 'bg-[#1A1A24] border border-[#2A2A3A] text-[#7A7A9D] hover:border-violet-500/30 hover:text-white'
                    }`}
                  >
                    {theme}
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSave} size="lg" className="w-full">
              {saved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Profil sauvegardé !
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Sauvegarder le profil
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
