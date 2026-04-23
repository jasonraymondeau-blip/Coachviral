'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Sparkles, Trash2, ChevronDown, ChevronUp, Trophy, X, Link2, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { analyzePost } from '@/lib/claude';
import { Post, PostType, UserProfile } from '@/types';
import { getScoreColor } from '@/lib/utils';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'Reel', label: 'Reel' },
  { value: 'Carrousel', label: 'Carrousel' },
  { value: 'Photo', label: 'Photo' },
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Par date' },
  { value: 'score', label: 'Par score' },
  { value: 'type', label: 'Par type' },
];

const emptyPost: Omit<Post, 'id'> = {
  type: 'Photo',
  theme: '',
  caption: '',
  hashtags: '',
  date: new Date().toISOString().split('T')[0],
};

function ScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <span className="inline-flex items-center rounded-lg px-2.5 py-0.5 text-sm font-bold border"
      style={{ color, borderColor: `${color}33`, background: `${color}15` }}>
      {score}/100
    </span>
  );
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Post, 'id'>>(emptyPost);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('date');

  // URL import
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [cleanUrl, setCleanUrl] = useState('');

  useEffect(() => {
    setPosts(storage.getPosts());
    setProfile(storage.getProfile());
  }, []);

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'score') return (b.analysis?.score || 0) - (a.analysis?.score || 0);
    if (sortBy === 'type') return a.type.localeCompare(b.type);
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const topPostId = posts.reduce((best, p) =>
    (p.analysis?.score || 0) > (best?.analysis?.score || 0) ? p : best, posts[0])?.id;

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlError('');
    setEmbedUrl('');
    try {
      const res = await fetch(`/api/instagram/post?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await res.json();
      if (data.error) { setUrlError(data.error); return; }

      setEmbedUrl(data.embedUrl);
      setCleanUrl(data.cleanUrl);
      setForm(f => ({ ...f, type: data.type as PostType }));
      setShowForm(true);
    } catch {
      setUrlError('Erreur réseau — réessaie.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleAdd = () => {
    if (!form.caption && !form.theme) return;
    const post: Post = { ...form, id: crypto.randomUUID() };
    storage.addPost(post);
    setPosts(storage.getPosts());
    setForm(emptyPost);
    setShowForm(false);
    setUrlInput('');
    setEmbedUrl('');
    setCleanUrl('');
    setUrlError('');
  };

  const handleDelete = (id: string) => {
    storage.deletePost(id);
    setPosts(storage.getPosts());
  };

  const handleAnalyze = async (post: Post) => {
    if (!profile) { alert('Configure ton profil d\'abord !'); return; }
    setAnalyzingId(post.id);
    try {
      const analysis = await analyzePost(post, profile);
      storage.updatePost(post.id, { analysis });
      setPosts(storage.getPosts());
      setExpandedId(post.id);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'analyse.');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Mes Posts</h1>
              <p className="text-[#7A7A9D] text-sm">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select options={SORT_OPTIONS} value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-40" />
            <Button onClick={() => { setShowForm(v => !v); setEmbedUrl(''); setUrlError(''); }}>
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Annuler' : 'Ajouter manuellement'}
            </Button>
          </div>
        </div>

        {/* URL Import */}
        <Card className="mb-6 border-violet-500/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#833AB4] to-[#FD1D1D] flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white shrink-0">Importer par URL</span>
              <input
                type="url"
                placeholder="https://www.instagram.com/p/XXXXX/ ou /reel/XXXXX/"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
                onKeyDown={e => e.key === 'Enter' && !urlLoading && handleUrlImport()}
                className="flex-1 rounded-xl bg-[#1A1A24] border border-[#2A2A3A] px-4 py-2 text-sm text-white placeholder:text-[#7A7A9D] outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <Button onClick={handleUrlImport} disabled={urlLoading || !urlInput.trim()} variant="secondary" className="shrink-0">
                {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Ouvrir
              </Button>
            </div>
            {urlError && <p className="text-red-400 text-xs ml-11">{urlError}</p>}
            <p className="text-[#7A7A9D] text-xs ml-11">
              Le post s&apos;affiche ici → copie la caption → remplis les métriques depuis ton app Instagram
            </p>
          </CardContent>
        </Card>

        {/* Embed preview + form side by side */}
        <AnimatePresence>
          {(showForm || embedUrl) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className={`grid gap-6 ${embedUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>

                {/* Embed preview */}
                {embedUrl && (
                  <Card className="border-[#833AB4]/30">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Aperçu du post</CardTitle>
                        <a href={cleanUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                          Ouvrir sur Instagram <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl overflow-hidden bg-white" style={{ minHeight: 400 }}>
                        <iframe
                          src={embedUrl}
                          className="w-full border-0"
                          style={{ minHeight: 480 }}
                          scrolling="no"
                          allowFullScreen
                        />
                      </div>
                      <p className="text-xs text-[#7A7A9D] mt-2 text-center">
                        Copie la caption depuis le post → colle-la dans le formulaire →
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Form */}
                <Card className="border-violet-500/30">
                  <CardHeader>
                    <CardTitle>{embedUrl ? 'Remplis les infos' : 'Ajouter un post'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Type" options={POST_TYPES} value={form.type}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value as PostType }))} />
                      <Input label="Date de publication" type="date" value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>

                    <Input label="Thème / Sujet" placeholder="Ex: coucher de soleil à Maurice"
                      value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} />

                    <Textarea
                      label={embedUrl ? 'Caption (copie depuis le post à gauche)' : 'Caption'}
                      placeholder="Colle la caption ici..."
                      rows={4}
                      value={form.caption}
                      onChange={e => {
                        const val = e.target.value;
                        const tags = (val.match(/#[\w\u00C0-\u024F]+/g) || []).join(' ');
                        setForm(f => ({ ...f, caption: val, hashtags: tags || f.hashtags }));
                      }}
                    />

                    <Input label="Hashtags" placeholder="#mauritius #expatlife..."
                      value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} />

                    <div>
                      <p className="text-sm font-medium text-[#F1F0FF] mb-2">
                        Métriques <span className="text-[#7A7A9D] font-normal text-xs">(depuis ton app Instagram)</span>
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Input label="Likes" type="number" placeholder="0"
                          value={form.likes || ''} onChange={e => setForm(f => ({ ...f, likes: Number(e.target.value) || undefined }))} />
                        <Input label="Commentaires" type="number" placeholder="0"
                          value={form.comments || ''} onChange={e => setForm(f => ({ ...f, comments: Number(e.target.value) || undefined }))} />
                        <Input label="Sauvegardes" type="number" placeholder="0"
                          value={form.saves || ''} onChange={e => setForm(f => ({ ...f, saves: Number(e.target.value) || undefined }))} />
                        {form.type === 'Reel'
                          ? <Input label="Vues" type="number" placeholder="0"
                              value={form.views || ''} onChange={e => setForm(f => ({ ...f, views: Number(e.target.value) || undefined }))} />
                          : <Input label="Partages" type="number" placeholder="0"
                              value={form.shares || ''} onChange={e => setForm(f => ({ ...f, shares: Number(e.target.value) || undefined }))} />
                        }
                      </div>
                    </div>

                    <Button onClick={handleAdd} className="w-full" disabled={!form.caption && !form.theme}>
                      <Plus className="w-4 h-4" />
                      Ajouter ce post
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts list */}
        <div className="space-y-3">
          <AnimatePresence>
            {sortedPosts.map((post, idx) => (
              <motion.div key={post.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ delay: idx * 0.04 }}>
                <Card className={post.id === topPostId && post.analysis ? 'border-amber-500/30' : ''}>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-5">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Badge variant={post.type === 'Reel' ? 'violet' : post.type === 'Carrousel' ? 'pink' : 'outline'}>
                          {post.type}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{post.theme || post.caption?.slice(0, 50) || 'Post sans titre'}</p>
                          <p className="text-[#7A7A9D] text-xs">{new Date(post.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {post.likes !== undefined && <span className="text-xs text-[#7A7A9D]">❤️ {post.likes}</span>}
                        {post.id === topPostId && post.analysis && (
                          <Badge variant="warning" className="gap-1"><Trophy className="w-3 h-3" />Top</Badge>
                        )}
                        {post.analysis && <ScoreBadge score={post.analysis.score} />}
                        <Button variant="secondary" size="sm" onClick={() => handleAnalyze(post)} disabled={analyzingId === post.id}>
                          {analyzingId === post.id ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                          {post.analysis ? 'Ré-analyser' : 'Analyser'}
                        </Button>
                        <button onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                          className="text-[#7A7A9D] hover:text-white transition-colors">
                          {expandedId === post.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="text-[#7A7A9D] hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === post.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-[#2A2A3A]">
                          <div className="p-5 space-y-3">
                            {post.caption && <div><p className="text-xs text-[#7A7A9D] mb-1">Caption</p><p className="text-sm text-white">{post.caption}</p></div>}
                            {post.hashtags && <div><p className="text-xs text-[#7A7A9D] mb-1">Hashtags</p><p className="text-sm text-violet-400">{post.hashtags}</p></div>}
                            {(post.likes !== undefined || post.comments !== undefined) && (
                              <div className="flex gap-4">
                                {post.likes !== undefined && <span className="text-xs text-[#7A7A9D]">❤️ {post.likes}</span>}
                                {post.comments !== undefined && <span className="text-xs text-[#7A7A9D]">💬 {post.comments}</span>}
                                {post.saves !== undefined && <span className="text-xs text-[#7A7A9D]">🔖 {post.saves}</span>}
                                {post.views !== undefined && <span className="text-xs text-[#7A7A9D]">👁 {post.views}</span>}
                              </div>
                            )}
                            {post.analysis && (
                              <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                  <ScoreBadge score={post.analysis.score} />
                                  <p className="text-sm text-[#7A7A9D]">{post.analysis.justification}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div><p className="text-xs font-medium text-emerald-400 mb-1">✓ Forces</p><ul className="space-y-1">{post.analysis.strengths.map((s, i) => <li key={i} className="text-xs text-[#7A7A9D]">• {s}</li>)}</ul></div>
                                  <div><p className="text-xs font-medium text-red-400 mb-1">✗ Faiblesses</p><ul className="space-y-1">{post.analysis.weaknesses.map((w, i) => <li key={i} className="text-xs text-[#7A7A9D]">• {w}</li>)}</ul></div>
                                  <div><p className="text-xs font-medium text-violet-400 mb-1">→ Améliorations</p><ul className="space-y-1">{post.analysis.improvements.map((imp, i) => <li key={i} className="text-xs text-[#7A7A9D]">• {imp}</li>)}</ul></div>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <div><p className="text-xs text-[#7A7A9D] mb-1">Hashtags manquants</p>
                                    <div className="flex flex-wrap gap-1">{post.analysis.missingHashtags.map(h => <span key={h} className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-md">{h}</span>)}</div>
                                  </div>
                                  <div className="ml-auto text-right">
                                    <p className="text-xs text-[#7A7A9D]">Meilleur moment</p>
                                    <p className="text-sm text-white font-medium">{post.analysis.bestRepublishTime}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-[#2A2A3A] mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Aucun post enregistré</p>
              <p className="text-[#7A7A9D] text-sm">Colle l&apos;URL d&apos;un post Instagram pour commencer</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
