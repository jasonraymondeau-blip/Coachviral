'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, CheckCircle, AlertCircle, FileJson, ArrowRight,
  Smartphone, Download, Package, Camera, Image, X,
  Sparkles, TrendingUp, User, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { storage } from '@/lib/storage';
import { analyzeScreenshot } from '@/lib/claude';
import { Post, PostType, ScreenshotMetrics } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedPost {
  caption: string;
  date: string;
  type: PostType;
  theme: string;
  hashtags: string;
  likes?: number;
  comments?: number;
  views?: number;
}

interface ScrapedProfile {
  username: string;
  fullName: string;
  followers: number;
  following: number;
  biography: string;
  mediaCount: number;
  profilePicUrl: string;
}

interface ScreenshotResult {
  file: File;
  preview: string;
  metrics: ScreenshotMetrics | null;
  loading: boolean;
  error: string;
}

// ─── ZIP / JSON helpers ───────────────────────────────────────────────────────

function detectType(uri: string, caption: string): PostType {
  if (uri?.includes('reel') || uri?.includes('video') || caption?.includes('#reel')) return 'Reel';
  return 'Photo';
}

function parseInstagramExport(json: unknown): ParsedPost[] {
  const posts: ParsedPost[] = [];
  const items = Array.isArray(json) ? json : (json as Record<string, unknown>)?.media ? [(json as Record<string, unknown>)] : [];
  const process = (item: unknown) => {
    const i = item as Record<string, unknown>;
    const mediaArr = Array.isArray(i.media) ? i.media : [i];
    for (const m of mediaArr) {
      const media = m as Record<string, unknown>;
      const caption = (media.title as string) || (i.title as string) || '';
      const ts = (media.creation_timestamp as number) || (i.creation_timestamp as number);
      const uri = (media.uri as string) || '';
      if (!ts && !caption) continue;
      const date = ts ? new Date(ts * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const hashtags = (caption.match(/#[\w\u00C0-\u024F]+/g) || []).join(' ');
      const theme = caption.split('\n')[0]?.replace(/#\w+/g, '').trim().slice(0, 80) || 'Post Instagram';
      posts.push({ caption, date, type: detectType(uri, caption), theme, hashtags, likes: (media.like_count as number) || undefined, comments: (media.comment_count as number) || undefined, views: (media.view_count as number) || undefined });
    }
  };
  if (Array.isArray(items)) { for (const item of items) process(item); }
  else process(items);
  return posts;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function processZip(file: File): Promise<ParsedPost[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const posts: ParsedPost[] = [];
  const postFiles = Object.keys(zip.files).filter(name =>
    name.match(/content\/posts_\d+\.json/) || name.match(/posts_\d+\.json/) || name.includes('your_posts')
  );
  for (const filename of postFiles) {
    const content = await zip.files[filename].async('text');
    try { posts.push(...parseInstagramExport(JSON.parse(content))); } catch {}
  }
  return posts;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImportPage() {
  // Tabs
  const [activeTab, setActiveTab] = useState<'username' | 'zip' | 'screenshot'>('username');

  // Username scraping tab
  const [username, setUsername] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedPosts, setScrapedPosts] = useState<ParsedPost[]>([]);
  const [scrapedProfile, setScrapedProfile] = useState<ScrapedProfile | null>(null);
  const [scrapeDone, setScrapeDone] = useState(false);

  // ZIP tab
  const [importStep, setImportStep] = useState<'guide' | 'upload' | 'preview' | 'done'>('guide');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zipError, setZipError] = useState('');
  const [parsed, setParsed] = useState<ParsedPost[]>([]);

  // Screenshot tab
  const [screenshots, setScreenshots] = useState<ScreenshotResult[]>([]);
  const [screenshotsDragging, setScreenshotsDragging] = useState(false);
  const [screenshotsDone, setScreenshotsDone] = useState(false);

  // ── Username scrape ──────────────────────────────────────────────────────────

  const handleScrape = async () => {
    if (!username.trim()) return;

    setScraping(true);
    setScrapeError('');
    setScrapedPosts([]);
    setScrapedProfile(null);

    try {
      const res = await fetch(`/api/instagram/apify?username=${encodeURIComponent(username.replace('@', ''))}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setScrapeError(data.error || 'Erreur lors du scraping');
        return;
      }

      setScrapedPosts(data.posts || []);
      setScrapedProfile(data.profile || null);
    } catch {
      setScrapeError('Erreur réseau. Vérifie ta connexion.');
    } finally {
      setScraping(false);
    }
  };

  const handleSaveScraped = () => {
    const posts: Post[] = scrapedPosts.map(p => ({
      id: crypto.randomUUID(),
      type: p.type, theme: p.theme, caption: p.caption,
      hashtags: p.hashtags, date: p.date,
      likes: p.likes, comments: p.comments, views: p.views,
    }));
    storage.setPosts(posts);

    // Also save profile data
    if (scrapedProfile) {
      const existing = storage.getProfile();
      if (existing) {
        storage.setProfile({ ...existing, username: scrapedProfile.username, followers: scrapedProfile.followers });
      }
    }
    setScrapeDone(true);
  };

  // ── ZIP/JSON ─────────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setZipError('');
    try {
      let posts: ParsedPost[] = [];
      if (file.name.endsWith('.zip')) posts = await processZip(file);
      else if (file.name.endsWith('.json')) posts = parseInstagramExport(JSON.parse(await readFileAsText(file)));
      else { setZipError('Fichier non supporté.'); return; }
      if (posts.length === 0) { setZipError('Aucun post trouvé.'); return; }
      setParsed(posts);
      setImportStep('preview');
    } catch { setZipError('Erreur de lecture du fichier.'); }
    finally { setLoading(false); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = () => {
    const posts: Post[] = parsed.map(p => ({
      id: crypto.randomUUID(), type: p.type, theme: p.theme,
      caption: p.caption, hashtags: p.hashtags, date: p.date,
      likes: p.likes, comments: p.comments, views: p.views,
    }));
    storage.setPosts(posts);
    setImportStep('done');
  };

  // ── Screenshots ──────────────────────────────────────────────────────────────

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addScreenshots = useCallback(async (files: FileList) => {
    const newItems: ScreenshotResult[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({ file, preview: URL.createObjectURL(file), metrics: null, loading: true, error: '' }));
    setScreenshots(prev => [...prev, ...newItems]);
    for (const item of newItems) {
      try {
        const base64 = await fileToBase64(item.file);
        const metrics = await analyzeScreenshot(base64, item.file.type || 'image/jpeg');
        setScreenshots(prev => prev.map(s => s.preview === item.preview ? { ...s, metrics, loading: false } : s));
      } catch {
        setScreenshots(prev => prev.map(s => s.preview === item.preview ? { ...s, loading: false, error: 'Erreur d\'analyse' } : s));
      }
    }
  }, []);

  const handleScreenshotDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setScreenshotsDragging(false);
    if (e.dataTransfer.files.length > 0) addScreenshots(e.dataTransfer.files);
  }, [addScreenshots]);

  const saveScreenshotMetrics = () => {
    const existing = storage.getPosts();
    const newPosts: Post[] = screenshots.filter(s => s.metrics && !s.error).map(s => {
      const m = s.metrics!;
      return {
        id: crypto.randomUUID(),
        type: (m.type === 'reel' ? 'Reel' : 'Photo') as PostType,
        theme: m.caption?.slice(0, 80) || 'Post importé via screenshot',
        caption: m.caption || '', hashtags: (m.caption?.match(/#[\w\u00C0-\u024F]+/g) || []).join(' '),
        date: m.date || new Date().toISOString().split('T')[0],
        likes: m.likes ?? undefined, comments: m.comments ?? undefined,
        saves: m.saves ?? undefined, views: m.views ?? undefined,
      };
    });
    storage.setPosts([...existing, ...newPosts]);
    setScreenshotsDone(true);
  };

  const tabs = [
    { id: 'username', icon: User, label: '@username', labelFull: '@username — Auto', badge: 'Recommandé' },
    { id: 'zip', icon: FileJson, label: 'ZIP', labelFull: 'Export ZIP' },
    { id: 'screenshot', icon: Camera, label: 'Photos', labelFull: 'Screenshots Insights' },
  ] as const;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-white">Import de données</h1>
            <p className="text-[#7A7A9D] text-xs md:text-sm">Récupère tes posts Instagram avec likes et commentaires</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-[#13131A] rounded-xl border border-[#2A2A3A] overflow-hidden">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1 px-2 py-2 md:px-3 md:py-2.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex-1 min-w-0 ${
                activeTab === tab.id ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white' : 'text-[#7A7A9D] hover:text-white'
              }`}>
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.labelFull}</span>
              {'badge' in tab && tab.badge && activeTab !== tab.id && (
                <span className="hidden md:inline text-[10px] px-1 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">✓</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ═══ TAB 1 : @USERNAME AUTO ═══ */}
          {activeTab === 'username' && (
            <motion.div key="username" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

              {scrapeDone ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-white mb-2">Import réussi !</h2>
                  <p className="text-[#7A7A9D] mb-6">{scrapedPosts.length} posts importés avec likes et commentaires</p>
                  <div className="flex gap-3 justify-center">
                    <a href="/posts"><Button>Voir mes posts</Button></a>
                    <a href="/dashboard"><Button variant="secondary">Dashboard</Button></a>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Import automatique */}
                  <Card className="border-violet-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-400" />
                        Import automatique depuis ton @username
                      </CardTitle>
                      <CardDescription>
                        Récupère tous tes posts avec likes, commentaires et vues en ~30 secondes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-4 space-y-2">
                        <p className="text-xs text-emerald-400 font-medium">✅ Fonctionne sur tous les comptes Instagram publics</p>
                        <p className="text-xs text-[#7A7A9D]">Assure-toi que ton compte n&apos;est pas en mode privé sur Instagram.</p>
                      </div>

                      <div className="space-y-3">
                        <Input
                          label="Ton @username Instagram"
                          placeholder="Ex: moncompte (sans le @)"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleScrape()}
                        />

                        <Button
                          onClick={handleScrape}
                          disabled={scraping || !username.trim()}
                          size="lg"
                          className="w-full"
                        >
                          {scraping ? <Spinner size="sm" /> : <RefreshCw className="w-5 h-5" />}
                          {scraping ? 'Récupération en cours (~30s)...' : 'Importer mes posts automatiquement'}
                        </Button>
                      </div>

                      {scrapeError && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-red-300 text-sm font-medium">Erreur</p>
                            <p className="text-red-300/70 text-xs mt-1">{scrapeError}</p>
                            {scrapeError.toLowerCase().includes('privé') && (
                              <p className="text-xs text-[#7A7A9D] mt-2">→ L&apos;import ne fonctionne que sur les comptes Instagram publics</p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Preview scraped posts */}
                  {scrapedPosts.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      {scrapedProfile && (
                        <div className="flex items-center gap-4 rounded-xl bg-[#0D0D14] border border-[#2A2A3A] p-4">
                          {scrapedProfile.profilePicUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={scrapedProfile.profilePicUrl} alt={scrapedProfile.username}
                              className="w-12 h-12 rounded-full object-cover border-2 border-violet-500/30" />
                          )}
                          <div>
                            <p className="text-white font-semibold">@{scrapedProfile.username}</p>
                            <p className="text-[#7A7A9D] text-xs">{scrapedProfile.fullName} · {scrapedProfile.followers.toLocaleString()} abonnés · {scrapedProfile.mediaCount} posts</p>
                          </div>
                        </div>
                      )}

                      <Card className="border-emerald-500/30">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                              {scrapedPosts.length} posts récupérés
                            </CardTitle>
                            <div className="flex gap-2">
                              <Badge variant="violet">{scrapedPosts.filter(p => p.type === 'Reel').length} Reels</Badge>
                              <Badge variant="pink">{scrapedPosts.filter(p => p.type === 'Carrousel').length} Carrousels</Badge>
                              <Badge variant="outline">{scrapedPosts.filter(p => p.type === 'Photo').length} Photos</Badge>
                            </div>
                          </div>
                          <CardDescription>
                            {scrapedPosts.some(p => p.likes !== undefined)
                              ? '✅ Likes et commentaires inclus automatiquement'
                              : 'ℹ️ Métriques non disponibles pour ce compte'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {scrapedPosts.slice(0, 20).map((p, i) => (
                              <div key={i} className="flex items-center gap-3 rounded-xl bg-[#0D0D14] border border-[#2A2A3A] px-4 py-2.5">
                                <Badge variant={p.type === 'Reel' ? 'violet' : p.type === 'Carrousel' ? 'pink' : 'outline'} className="shrink-0">{p.type}</Badge>
                                <p className="text-sm text-white truncate flex-1">{p.theme || '—'}</p>
                                <p className="text-xs text-[#7A7A9D] shrink-0">{p.date}</p>
                                {p.likes !== undefined && <span className="text-xs text-[#7A7A9D] shrink-0">❤️ {p.likes}</span>}
                                {p.comments !== undefined && <span className="text-xs text-[#7A7A9D] shrink-0">💬 {p.comments}</span>}
                              </div>
                            ))}
                            {scrapedPosts.length > 20 && <p className="text-center text-xs text-[#7A7A9D] py-2">+ {scrapedPosts.length - 20} autres posts</p>}
                          </div>
                        </CardContent>
                      </Card>

                      <Button onClick={handleSaveScraped} size="lg" className="w-full">
                        <CheckCircle className="w-5 h-5" />
                        Importer les {scrapedPosts.length} posts dans CoachViral
                      </Button>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ═══ TAB 2 : ZIP ═══ */}
          {activeTab === 'zip' && (
            <motion.div key="zip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnimatePresence mode="wait">
                {importStep === 'guide' && (
                  <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <Card className="border-violet-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-violet-400" />
                          Télécharger ton export Instagram
                        </CardTitle>
                        <CardDescription>Depuis ton téléphone — 2 minutes — aucun mot de passe requis</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { n: 1, t: 'Ouvre Instagram → ton profil', d: 'Clique sur les 3 barres en haut à droite' },
                          { n: 2, t: 'Paramètres et confidentialité', d: 'Tout en bas du menu' },
                          { n: 3, t: 'Télécharger vos informations', d: 'Dans la section "Vos activités"' },
                          { n: 4, t: 'Sélectionne "Certaines de vos informations"', d: 'Coche uniquement "Posts"' },
                          { n: 5, t: 'Format : JSON — Tout le temps', d: 'Puis clique "Créer des fichiers"' },
                          { n: 6, t: 'Instagram t\'envoie un email', d: 'Quelques minutes à quelques heures — vérifie tes spams' },
                          { n: 7, t: 'Télécharge le ZIP et reviens ici', d: 'Glisse le fichier ZIP sur la zone ci-dessous' },
                        ].map(s => (
                          <div key={s.n} className="flex items-start gap-4">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">{s.n}</div>
                            <div>
                              <p className="text-white text-sm font-medium">{s.t}</p>
                              <p className="text-[#7A7A9D] text-xs">{s.d}</p>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                          <p className="text-xs text-amber-300">💡 Si tu n&apos;as pas encore reçu l&apos;email, utilise l&apos;onglet <strong>@username Auto</strong> ci-dessus — c&apos;est plus rapide !</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Button onClick={() => setImportStep('upload')} size="lg" className="w-full">
                      <ArrowRight className="w-5 h-5" />
                      J&apos;ai le fichier ZIP, continuer
                    </Button>
                  </motion.div>
                )}

                {importStep === 'upload' && (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop} onClick={() => document.getElementById('fileInput')?.click()}
                      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 p-16 flex flex-col items-center justify-center cursor-pointer ${
                        dragging ? 'border-violet-500 bg-violet-500/10' : 'border-[#2A2A3A] hover:border-violet-500/50 hover:bg-violet-500/5'
                      }`}>
                      <input id="fileInput" type="file" accept=".zip,.json" className="hidden"
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                      {loading ? (<><Spinner size="lg" /><p className="text-white font-medium mt-4">Lecture...</p></>) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                            {dragging ? <Package className="w-8 h-8 text-violet-400" /> : <Upload className="w-8 h-8 text-violet-400" />}
                          </div>
                          <p className="text-white font-heading font-semibold text-lg mb-2">{dragging ? 'Lâche ici' : 'Glisse ton fichier ici'}</p>
                          <p className="text-[#7A7A9D] text-sm">ou clique pour sélectionner</p>
                          <div className="flex gap-2 mt-4">
                            <Badge variant="violet"><FileJson className="w-3 h-3 mr-1" />ZIP Instagram</Badge>
                            <Badge variant="outline">posts_1.json</Badge>
                          </div>
                        </>
                      )}
                    </div>
                    {zipError && <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-300 text-sm">{zipError}</p></div>}
                    <Button variant="ghost" onClick={() => setImportStep('guide')} className="w-full">← Revoir les instructions</Button>
                  </motion.div>
                )}

                {importStep === 'preview' && (
                  <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <Card className="border-emerald-500/30">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400" />{parsed.length} posts détectés</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="violet">{parsed.filter(p => p.type === 'Reel').length} Reels</Badge>
                            <Badge variant="pink">{parsed.filter(p => p.type === 'Carrousel').length} Carrousels</Badge>
                            <Badge variant="outline">{parsed.filter(p => p.type === 'Photo').length} Photos</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {parsed.slice(0, 20).map((p, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl bg-[#0D0D14] border border-[#2A2A3A] px-4 py-2.5">
                              <Badge variant={p.type === 'Reel' ? 'violet' : p.type === 'Carrousel' ? 'pink' : 'outline'} className="shrink-0">{p.type}</Badge>
                              <p className="text-sm text-white truncate flex-1">{p.theme || '—'}</p>
                              <p className="text-xs text-[#7A7A9D] shrink-0">{p.date}</p>
                              {p.likes !== undefined && <span className="text-xs text-[#7A7A9D] shrink-0">❤️ {p.likes}</span>}
                            </div>
                          ))}
                          {parsed.length > 20 && <p className="text-center text-xs text-[#7A7A9D] py-2">+ {parsed.length - 20} autres</p>}
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setImportStep('upload')} className="flex-1">Autre fichier</Button>
                      <Button onClick={handleImport} size="lg" className="flex-1"><CheckCircle className="w-5 h-5" />Importer les {parsed.length} posts</Button>
                    </div>
                  </motion.div>
                )}

                {importStep === 'done' && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-10 h-10 text-emerald-400" /></div>
                    <h2 className="font-heading text-2xl font-bold text-white mb-2">Import réussi !</h2>
                    <p className="text-[#7A7A9D] mb-6">{parsed.length} posts importés</p>
                    <div className="flex gap-3 justify-center">
                      <a href="/posts"><Button>Voir mes posts</Button></a>
                      <a href="/dashboard"><Button variant="secondary">Dashboard</Button></a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ TAB 3 : SCREENSHOTS ═══ */}
          {activeTab === 'screenshot' && (
            <motion.div key="screenshot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {screenshotsDone ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-10 h-10 text-emerald-400" /></div>
                  <h2 className="font-heading text-2xl font-bold text-white mb-2">Métriques importées !</h2>
                  <p className="text-[#7A7A9D] mb-6">{screenshots.filter(s => s.metrics).length} screenshots analysés</p>
                  <div className="flex gap-3 justify-center">
                    <a href="/posts"><Button>Voir mes posts</Button></a>
                    <a href="/dashboard"><Button variant="secondary">Dashboard</Button></a>
                  </div>
                </motion.div>
              ) : (
                <>
                  <Card className="border-pink-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-pink-400" />Analyse IA de tes screenshots Insights</CardTitle>
                      <CardDescription>Claude Vision lit tes captures d&apos;écran et extrait automatiquement les métriques</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div onDragOver={e => { e.preventDefault(); setScreenshotsDragging(true); }} onDragLeave={() => setScreenshotsDragging(false)}
                        onDrop={handleScreenshotDrop} onClick={() => document.getElementById('screenshotInput')?.click()}
                        className={`rounded-2xl border-2 border-dashed transition-all p-12 flex flex-col items-center justify-center cursor-pointer ${
                          screenshotsDragging ? 'border-pink-500 bg-pink-500/10' : 'border-[#2A2A3A] hover:border-pink-500/50 hover:bg-pink-500/5'
                        }`}>
                        <input id="screenshotInput" type="file" accept="image/*" multiple className="hidden"
                          onChange={e => e.target.files && addScreenshots(e.target.files)} />
                        <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-3">
                          <Image className="w-7 h-7 text-pink-400" />
                        </div>
                        <p className="text-white font-semibold mb-1">Glisse tes screenshots ici</p>
                        <p className="text-[#7A7A9D] text-sm">Plusieurs fichiers acceptés</p>
                      </div>
                    </CardContent>
                  </Card>

                  {screenshots.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-heading text-lg font-semibold text-white">{screenshots.length} screenshot{screenshots.length > 1 ? 's' : ''}</h2>
                        {screenshots.some(s => s.metrics && !s.error) && (
                          <Button onClick={saveScreenshotMetrics}><CheckCircle className="w-4 h-4" />Sauvegarder les métriques</Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {screenshots.map(ss => (
                          <motion.div key={ss.preview} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <Card className={`overflow-hidden ${ss.error ? 'border-red-500/20' : ss.metrics ? 'border-emerald-500/20' : 'border-[#2A2A3A]'}`}>
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={ss.preview} alt="screenshot" className="w-full h-40 object-cover" />
                                <button onClick={() => setScreenshots(prev => prev.filter(s => s.preview !== ss.preview))}
                                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                                  <X className="w-3.5 h-3.5 text-white" />
                                </button>
                                {ss.loading && <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2"><Spinner size="sm" /><p className="text-xs text-white">Analyse...</p></div>}
                              </div>
                              <CardContent className="pt-3 pb-3">
                                {ss.error && <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400 shrink-0" /><p className="text-xs text-red-400">{ss.error}</p></div>}
                                {ss.metrics && !ss.error && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="success" className="text-xs">Analysé</Badge>
                                      <Badge variant={ss.metrics.type === 'reel' ? 'violet' : 'outline'} className="text-xs capitalize">{ss.metrics.type}</Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {[{ label: 'Likes', value: ss.metrics.likes }, { label: 'Comments', value: ss.metrics.comments }, { label: 'Saves', value: ss.metrics.saves }, { label: 'Vues', value: ss.metrics.views }, { label: 'Reach', value: ss.metrics.reach }, { label: 'Impressions', value: ss.metrics.impressions }].filter(m => m.value !== null).map(m => (
                                        <div key={m.label} className="rounded-lg bg-[#0D0D14] p-2 text-center">
                                          <p className="text-xs text-[#7A7A9D]">{m.label}</p>
                                          <p className="text-sm font-bold text-white">{m.value?.toLocaleString()}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {!ss.loading && !ss.metrics && !ss.error && <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#7A7A9D]" /><p className="text-xs text-[#7A7A9D]">Aucune métrique détectée</p></div>}
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
