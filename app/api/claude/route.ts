import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { UserProfile, Post, IdeaParams, StyleProfile } from '@/types';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquant dans .env.local');
  return new Anthropic({ apiKey });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeRealMetrics(posts: Post[]) {
  if (posts.length === 0) return null;
  const withMetrics = posts.filter(p => p.likes !== undefined || p.comments !== undefined);
  const avgLikes = withMetrics.length > 0 ? Math.round(withMetrics.reduce((a, p) => a + (p.likes || 0), 0) / withMetrics.length) : 0;
  const avgComments = withMetrics.length > 0 ? Math.round(withMetrics.reduce((a, p) => a + (p.comments || 0), 0) / withMetrics.length) : 0;
  const avgSaves = withMetrics.length > 0 ? Math.round(withMetrics.reduce((a, p) => a + (p.saves || 0), 0) / withMetrics.length) : 0;
  const analysed = posts.filter(p => p.analysis);
  const avgScore = analysed.length > 0 ? Math.round(analysed.reduce((a, p) => a + p.analysis!.score, 0) / analysed.length) : 0;
  const now = new Date();
  const recentPosts = posts.filter(p => new Date(p.date) >= new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000));
  const postsPerWeek = Math.round((recentPosts.length / 8.57) * 10) / 10;
  const formats = ['Reel', 'Carrousel', 'Photo'];
  const bestFormat = formats.map(f => ({ f, c: posts.filter(p => p.type === f).length })).sort((a, b) => b.c - a.c)[0]?.f || '—';
  return { avgLikes, avgComments, avgSaves, avgScore, postsPerWeek, bestFormat, total: posts.length, analysed: analysed.length };
}

function computeAdvancedStats(posts: Post[]) {
  if (posts.length === 0) return null;
  const withMetrics = posts.filter(p => p.likes !== undefined);
  if (withMetrics.length === 0) return null;

  const engagements = withMetrics.map(p => (p.likes || 0) + (p.comments || 0) + (p.saves || 0));
  const sorted = [...engagements].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = engagements.reduce((a, b) => a + b, 0) / engagements.length;
  const threshold = sorted[Math.floor(sorted.length * 0.8)];
  const top20 = withMetrics.filter((_, i) => engagements[i] >= threshold).sort((a, b) =>
    ((b.likes || 0) + (b.comments || 0)) - ((a.likes || 0) + (a.comments || 0))
  ).slice(0, 3);
  const worst3 = withMetrics.filter((_, i) => engagements[i] < sorted[Math.floor(sorted.length * 0.2)]).slice(0, 3);

  // Caption length vs engagement correlation
  const captionEngCorr = withMetrics.map(p => ({ len: p.caption.length, eng: (p.likes || 0) + (p.comments || 0) }));
  const avgShortEng = captionEngCorr.filter(x => x.len < 150).reduce((a, b) => a + b.eng, 0) / (captionEngCorr.filter(x => x.len < 150).length || 1);
  const avgLongEng = captionEngCorr.filter(x => x.len >= 150).reduce((a, b) => a + b.eng, 0) / (captionEngCorr.filter(x => x.len >= 150).length || 1);

  // Type vs engagement
  const typeEng: Record<string, number[]> = {};
  withMetrics.forEach(p => {
    if (!typeEng[p.type]) typeEng[p.type] = [];
    typeEng[p.type].push((p.likes || 0) + (p.comments || 0));
  });
  const typeAvg = Object.entries(typeEng).map(([type, vals]) => ({
    type, avg: vals.reduce((a, b) => a + b, 0) / vals.length
  })).sort((a, b) => b.avg - a.avg);

  return { median, avg, top20, worst3, avgShortEng, avgLongEng, typeAvg };
}

function profileContext(profile: UserProfile, posts?: Post[]): string {
  if (!profile) return '';
  const real = posts ? computeRealMetrics(posts) : null;
  const engRate = real && profile.followers > 0
    ? `${((real.avgLikes + real.avgComments + real.avgSaves) / profile.followers * 100).toFixed(2)}% (calculé depuis ${real.total} posts réels)`
    : `${profile.engagementRate}% (estimé)`;
  const freq = real ? `${real.postsPerWeek} posts/semaine (calculé sur 60 jours)` : `${profile.publishingFrequency} posts/semaine`;
  const styleCtx = profile.styleProfile
    ? `\nSTYLE D'ÉCRITURE APPRIS:\n- Ton dominant: ${profile.styleProfile.dominantTone}\n- Personnalité: ${profile.styleProfile.writingPersonality}\n- Vocabulaire récurrent: ${profile.styleProfile.recurringVocabulary.join(', ')}\n- Style CTA: ${profile.styleProfile.ctaStyle}`
    : '';
  return `
PROFIL UTILISATRICE:
- Username Instagram: @${profile.username}
- Niche: ${profile.niche} / ${profile.subNiche}
- Abonnés: ${profile.followers}
- Taux d'engagement: ${engRate}
- Fréquence de publication: ${freq}
- Objectif: ${profile.goal}
- Tonalité: ${profile.tone}
- Thèmes récurrents: ${profile.themes?.join(', ')}
${real ? `
MÉTRIQUES RÉELLES:
- Moyenne likes/post: ${real.avgLikes}
- Moyenne commentaires/post: ${real.avgComments}
- Moyenne sauvegardes/post: ${real.avgSaves}
- Score IA moyen: ${real.avgScore}/100
- Format le plus utilisé: ${real.bestFormat}
- Posts analysés: ${real.analysed}/${real.total}` : ''}${styleCtx}
`.trim();
}

async function callModel(systemPrompt: string, userMessage: string): Promise<string> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  const text = content.text.trim();
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json();
    const baseSystem = `Tu es CoachViral, un expert en stratégie de contenu Instagram.
Tu réponds TOUJOURS en JSON valide uniquement, sans markdown, sans commentaires.
Tu es spécialisé dans la croissance de comptes lifestyle/expatriation/voyage.`;

    let result: unknown;

    switch (action) {

      // ── Existing actions ────────────────────────────────────────────────────

      case 'analyzePost': {
        const { post, profile } = params as { post: Post; profile: UserProfile };
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `Analyse ce post Instagram et retourne un JSON avec cette structure exacte:
{
  "score": (0-100),
  "justification": "explication du score",
  "strengths": ["force 1", "force 2", "force 3"],
  "weaknesses": ["faiblesse 1", "faiblesse 2"],
  "improvements": ["amélioration 1", "amélioration 2", "amélioration 3"],
  "missingHashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "bestRepublishTime": "Meilleur moment pour republier"
}

POST À ANALYSER:
Type: ${post.type}
Thème: ${post.theme}
Caption: ${post.caption}
Hashtags: ${post.hashtags}
Likes: ${post.likes || 'N/A'}, Commentaires: ${post.comments || 'N/A'}, Partages: ${post.shares || 'N/A'}, Sauvegardes: ${post.saves || 'N/A'}${post.type === 'Reel' ? `\nVues: ${post.views || 'N/A'}` : ''}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateIdeas': {
        const { params: ideaParams, profile } = params as { params: IdeaParams; profile: UserProfile };
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `Génère 5 idées de posts Instagram virales. Niveau de viralité visé: ${ideaParams.viralLevel}.
Format cible: ${ideaParams.format}. Thème: ${ideaParams.theme}. Tendance actuelle: ${ideaParams.trend}.

Retourne un tableau JSON:
[
  {
    "id": "uuid-unique",
    "title": "Titre accrocheur",
    "format": "${ideaParams.format}",
    "concept": "Description du concept en 2-3 phrases",
    "hook": "Première phrase/slide d'accroche — pattern interrupt puissant",
    "viralReason": "Pourquoi ça peut virer viral en 1 phrase précise",
    "viralScore": (0-100),
    "difficulty": "facile|moyen|avancé"
  }
]`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateScript': {
        const { idea, duration, profile } = params as { idea: string; duration: number; profile: UserProfile };
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `Génère un script Reel Instagram complet pour cette idée: "${idea}"
Durée cible: ${duration} secondes.

Retourne un JSON avec cette structure exacte:
{
  "hook": "Phrase d'accroche parlée (0-3 secondes) — ultra fort, pattern interrupt",
  "scenes": [
    {
      "text": "Texte parlé de la scène",
      "action": "Action visuelle suggérée",
      "overlay": "Texte overlay à afficher"
    }
  ],
  "cta": "Appel à l'action final engageant",
  "music": "Recommandation musicale/ambiance"
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateCaption': {
        const { subject, format, profile } = params as { subject: string; format: string; profile: UserProfile };
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `Génère une caption Instagram complète pour: "${subject}" (format: ${format}).
Adapte au style de l'utilisatrice si un style a été appris.

Retourne un JSON avec cette structure exacte:
{
  "short": "Caption courte < 150 caractères avec emojis",
  "long": "Caption longue avec storytelling complet, emojis et CTA intégré",
  "hooks": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"],
  "hashtags": {
    "niche": ["#hashtag_niche_1", "#hashtag_niche_2", "#hashtag_niche_3", "#hashtag_niche_4", "#hashtag_niche_5"],
    "large": ["#hashtag_large_1", "#hashtag_large_2", "#hashtag_large_3", "#hashtag_large_4", "#hashtag_large_5"],
    "local": ["#hashtag_local_1", "#hashtag_local_2", "#hashtag_local_3", "#hashtag_local_4", "#hashtag_local_5"]
  }
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateHashtags': {
        const { theme, profile } = params as { theme: string; profile: UserProfile };
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `Génère 30 hashtags Instagram pour le thème: "${theme}".
Trie-les par stratégie et fournis un score de reach potentiel.

Retourne un JSON avec cette structure exacte:
{
  "micro": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "medium": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "large": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "niche": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "discovery": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "longTail": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "reachScore": (0-100),
  "reachExplanation": "Explication courte du potentiel de reach de ce mix",
  "sets": [
    {
      "hashtags": ["#h1", "#h2", "#h3", "#h4", "#h5", "#h6", "#h7", "#h8", "#h9", "#h10"],
      "strategy": "Explication de la stratégie de ce set"
    },
    {
      "hashtags": ["#h1", "#h2", "#h3", "#h4", "#h5", "#h6", "#h7", "#h8", "#h9", "#h10"],
      "strategy": "Explication de la stratégie de ce set"
    },
    {
      "hashtags": ["#h1", "#h2", "#h3", "#h4", "#h5", "#h6", "#h7", "#h8", "#h9", "#h10"],
      "strategy": "Explication de la stratégie de ce set"
    }
  ]
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateAudit': {
        const { profile, posts } = params as { profile: UserProfile; posts: Post[] };
        const adv = computeAdvancedStats(posts);
        const postsContext = posts.length > 0
          ? `\nDÉTAIL DES POSTS (${posts.length} posts):\n${posts.slice(0, 20).map(p =>
              `- ${p.type}: "${p.theme}" | Score IA: ${p.analysis?.score || 'non analysé'} | Likes: ${p.likes || '?'} | Comments: ${p.comments || '?'} | Saves: ${p.saves || '?'} | Caption: ${p.caption.length} chars | Date: ${p.date}`
            ).join('\n')}`
          : '\nAucun post enregistré.';
        const statsContext = adv ? `\nSTATISTIQUES AVANCÉES:
- Engagement médian: ${Math.round(adv.median)} vs moyenne: ${Math.round(adv.avg)}
- Captions courtes (<150 chars) avg engagement: ${Math.round(adv.avgShortEng)}
- Captions longues (>150 chars) avg engagement: ${Math.round(adv.avgLongEng)}
- Performance par type: ${adv.typeAvg.map(t => `${t.type}=${Math.round(t.avg)}`).join(', ')}
- Top posts: ${adv.top20.map(p => `"${p.theme}" (likes:${p.likes})`).join(', ')}
- Pires posts: ${adv.worst3.map(p => `"${p.theme}" (likes:${p.likes})`).join(', ')}` : '';
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile, posts)}${postsContext}${statsContext}`,
          `Effectue un audit complet Instagram avancé. Retourne un JSON avec cette structure exacte:
{
  "globalScore": (0-100),
  "criticalErrors": ["erreur critique 1", "erreur critique 2", "erreur critique 3"],
  "quickWins": ["quick win 1", "quick win 2", "quick win 3"],
  "mainStrategy": "La 1 stratégie claire à suivre en priorité absolue",
  "positioning": "Analyse détaillée du positionnement et de la différenciation",
  "contentAudit": "Audit du contenu: patterns, ce qui fonctionne, ce qui ne fonctionne pas",
  "growthPlan": "Plan de croissance 90 jours avec objectifs hebdomadaires",
  "editorialCalendar": "Calendrier éditorial: fréquence, jours, formats pour la semaine type",
  "missedOpportunities": ["Opportunité 1", "Opportunité 2", "Opportunité 3"],
  "correlations": {
    "hashtagsVsPerformance": "Analyse de la corrélation hashtags vs performance",
    "captionLengthVsEngagement": "Analyse caption courte vs longue",
    "contentTypeVsReach": "Quel format performe le mieux et pourquoi"
  },
  "topPosts": [
    {"theme": "thème du post", "score": (0-100), "why": "pourquoi ce post a bien marché"}
  ],
  "worstPosts": [
    {"theme": "thème du post", "score": (0-100), "why": "pourquoi ce post a mal marché"}
  ],
  "scores": {
    "regularity": (0-10),
    "engagement": (0-10),
    "captionQuality": (0-10),
    "formatDiversity": (0-10),
    "nicheConsistency": (0-10),
    "hashtagStrategy": (0-10)
  }
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'getDailyTip': {
        const { profile, posts: tipPosts } = params as { profile: UserProfile; posts?: Post[] };
        const text = await callModel(
          `${baseSystem}\n${profileContext(profile, tipPosts || [])}`,
          `Donne UN seul conseil court (1-2 phrases max) et actionnable pour aujourd'hui.
Retourne UNIQUEMENT la chaîne de texte du conseil, pas de JSON.`
        );
        result = text.replace(/^["']|["']$/g, '').trim();
        break;
      }

      // ── New actions ─────────────────────────────────────────────────────────

      case 'getDailyCoach': {
        const { profile, posts: coachPosts } = params as { profile: UserProfile; posts?: Post[] };
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile, coachPosts || [])}`,
          `Tu es le coach Instagram personnel de @${profile.username}. Génère le brief quotidien.
Retourne un JSON avec cette structure exacte:
{
  "action": "1 action concrète à faire AUJOURD'HUI (ultra spécifique, pas générique)",
  "mistake": "1 erreur à absolument éviter cette semaine (basée sur son profil réel)",
  "idea": "1 idée de contenu rapide à créer dans les prochaines 24h",
  "motivation": "1 phrase de motivation personnalisée pour @${profile.username}"
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'scoreContent': {
        const { content, contentType, profile } = params as { content: string; contentType: string; profile: UserProfile };
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `Score ce contenu Instagram AVANT publication. Analyse en profondeur.
Type de contenu: ${contentType}
Contenu à scorer:
"""
${content}
"""

Retourne un JSON avec cette structure exacte:
{
  "total": (0-100),
  "hookStrength": (0-100),
  "messageClarity": (0-100),
  "emotionalImpact": (0-100),
  "shareability": (0-100),
  "readability": (0-100),
  "hashtagPotential": (0-100),
  "feedback": "Feedback global en 2-3 phrases",
  "improvements": ["amélioration concrète 1", "amélioration concrète 2", "amélioration concrète 3"],
  "rewrittenHook": "Version améliorée de la première ligne/phrase d'accroche"
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'enhanceContent': {
        const { content, mode, profile } = params as { content: string; mode: 'viral' | 'personal'; profile: UserProfile };
        const instructions = mode === 'viral'
          ? 'Rends ce contenu PLUS VIRAL: renforce le hook (pattern interrupt), augmente l\'émotion, ajoute urgence et curiosity gap, optimise pour le partage.'
          : 'Rends ce contenu PLUS PERSONNEL: ajoute du storytelling authentique, parle en JE, inclus des détails concrets de la vie de @' + profile.username + ', rends ça vulnérable et relatable.';
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `${instructions}

CONTENU ORIGINAL:
"""
${content}
"""

Retourne un JSON avec cette structure exacte:
{
  "original": "${content.replace(/"/g, '\\"').slice(0, 200)}...",
  "enhanced": "Version améliorée complète du contenu",
  "changes": ["Changement effectué 1", "Changement effectué 2", "Changement effectué 3"],
  "scoreGain": (score gagné estimé, 5-30)
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateWeeklyPlan': {
        const { profile, posts: planPosts } = params as { profile: UserProfile; posts?: Post[] };
        const real = planPosts ? computeRealMetrics(planPosts) : null;
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile, planPosts || [])}`,
          `Génère un planning éditorial hebdomadaire complet et stratégique pour @${profile.username}.
Basé sur: niche ${profile.niche}, ${real ? `format le plus performant: ${real.bestFormat}` : 'aucune donnée de performance'}, objectif: ${profile.goal}.

Structure idéale: 3 posts + 2 reels + 1 contenu storytelling répartis sur la semaine.
Optimise les jours de publication selon les données disponibles.

Retourne un JSON avec cette structure exacte:
{
  "strategy": "Stratégie globale de la semaine en 2 phrases",
  "focus": "Thème principal de la semaine",
  "weeklyGoal": "Objectif mesurable pour cette semaine",
  "days": [
    {
      "day": "Lundi",
      "type": "Reel|Carrousel|Photo",
      "idea": "Idée concrète du post",
      "hook": "Phrase d'accroche spécifique",
      "angle": "Angle de traitement unique",
      "bestTime": "HH:MM"
    },
    {
      "day": "Mardi",
      "type": "...",
      "idea": "...",
      "hook": "...",
      "angle": "...",
      "bestTime": "HH:MM"
    },
    {
      "day": "Mercredi",
      "type": "...",
      "idea": "...",
      "hook": "...",
      "angle": "...",
      "bestTime": "HH:MM"
    },
    {
      "day": "Jeudi",
      "type": "...",
      "idea": "...",
      "hook": "...",
      "angle": "...",
      "bestTime": "HH:MM"
    },
    {
      "day": "Vendredi",
      "type": "...",
      "idea": "...",
      "hook": "...",
      "angle": "...",
      "bestTime": "HH:MM"
    },
    {
      "day": "Samedi",
      "type": "...",
      "idea": "...",
      "hook": "...",
      "angle": "...",
      "bestTime": "HH:MM"
    }
  ]
}`
        );
        result = JSON.parse(json);
        break;
      }

      case 'learnStyle': {
        const { posts: stylePosts, profile } = params as { posts: Post[]; profile: UserProfile };
        if (stylePosts.length === 0) {
          result = null;
          break;
        }
        const captionSamples = stylePosts.filter(p => p.caption.length > 50).slice(0, 15).map(p =>
          `---\n${p.caption.slice(0, 300)}`
        ).join('\n');
        const avgLen = Math.round(stylePosts.reduce((a, p) => a + p.caption.length, 0) / stylePosts.length);
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile)}`,
          `Analyse les captions de @${profile.username} et génère son profil de style d'écriture.

ÉCHANTILLON DE CAPTIONS (${stylePosts.length} posts, longueur moyenne: ${avgLen} chars):
${captionSamples}

Retourne un JSON avec cette structure exacte:
{
  "dominantTone": "storytelling|éducatif|émotionnel|inspirationnel|humour|lifestyle",
  "structurePattern": "Description de la structure typique de ses captions",
  "recurringVocabulary": ["mot1", "mot2", "mot3", "mot4", "mot5"],
  "averageCaptionLength": ${avgLen},
  "emojiStyle": "heavy|moderate|minimal",
  "ctaStyle": "Description du style de call-to-action utilisé",
  "writingPersonality": "Une phrase qui capture parfaitement sa voix et sa personnalité rédactionnelle",
  "generatedAt": "${new Date().toISOString()}"
}`
        );
        result = JSON.parse(json) as StyleProfile;
        break;
      }

      case 'analyzeScreenshot': {
        const { imageBase64, mediaType } = params as { imageBase64: string; mediaType: string };
        const message = await getClient().messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Analyse cette capture d'écran Instagram Insights et extrait TOUTES les métriques visibles.
Retourne UNIQUEMENT ce JSON (pas de markdown):
{
  "likes": null ou nombre,
  "comments": null ou nombre,
  "saves": null ou nombre,
  "shares": null ou nombre,
  "views": null ou nombre,
  "reach": null ou nombre,
  "impressions": null ou nombre,
  "engagementRate": null ou pourcentage en nombre,
  "type": "post" ou "reel" ou "story" ou "compte",
  "date": null ou "YYYY-MM-DD",
  "caption": null ou texte si visible,
  "raw": "description courte de ce qui est visible"
}
Si une métrique n'est pas visible, mets null.`,
              },
            ],
          }],
        });
        const content = message.content[0];
        if (content.type !== 'text') throw new Error('No text response');
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : content.text);
        break;
      }

      // ── V2 Actions ────────────────────────────────────────────────────────────

      case 'generateDailyAction': {
        const { profile, posts: daPosts, weeklyPlan } = params as { profile: UserProfile; posts: Post[]; weeklyPlan?: unknown };
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const today = dayNames[new Date().getDay()];
        const json = await callModel(
          `${baseSystem}\n${profileContext(profile, daPosts)}`,
          `C'est ${today}. Génère le plan d'action d'aujourd'hui pour @${profile.username}.
Plan de la semaine disponible: ${weeklyPlan ? JSON.stringify(weeklyPlan) : 'non généré encore'}.

Retourne un JSON avec cette structure exacte:
{
  "reelTitle": "Titre du Reel à filmer aujourd'hui",
  "reelHook": "Hook exact à dire face caméra",
  "reelDuration": "22 secondes",
  "plansToFilm": ["Plan 1: face caméra intro", "Plan 2: lifestyle/extérieur", "Plan 3: texte à l'écran", "Plan 4: outro CTA"],
  "storiesToPost": [
    { "order": 1, "type": "poll", "text": "Texte de la story", "visual": "Description visuelle", "interactive": "Question du sondage" },
    { "order": 2, "type": "teaser", "text": "Texte teaser", "visual": "Description visuelle" },
    { "order": 3, "type": "cta", "text": "Texte CTA", "visual": "Description visuelle" }
  ],
  "ctaOfTheDay": "CTA précis à utiliser dans le Reel et stories",
  "contentObjective": "acquisition|engagement|fidelisation|vente"
}
Tout doit être ultra concret, adapté à la niche ${profile.niche} de @${profile.username}.`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateHooks': {
        const { profile: hookProfile, category, topic } = params as { profile: UserProfile; category: string; topic: string };
        const json = await callModel(
          `${baseSystem}\n${profileContext(hookProfile)}`,
          `Génère 8 hooks Instagram pour @${hookProfile.username} dans la catégorie "${category}" sur le sujet: "${topic}".
Niche: ${hookProfile.niche}.

Retourne un JSON:
{
  "category": "${category}",
  "categoryLabel": "Libellé français",
  "hooks": [
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" },
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" },
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" },
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" },
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" },
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" },
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" },
    { "text": "Hook complet", "intensity": "soft|medium|aggressive", "length": "short|long" }
  ]
}
Les hooks doivent être personnalisés à la niche "${hookProfile.niche}" et au ton "${hookProfile.tone}".
Mix: 2 soft courts, 2 soft longs, 2 medium, 1 aggressive court, 1 aggressive long.`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateStories': {
        const { profile: spProfile, posts: spPosts, objective } = params as { profile: UserProfile; posts: Post[]; objective: string };
        const dayNames2 = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const today2 = dayNames2[new Date().getDay()];
        const json = await callModel(
          `${baseSystem}\n${profileContext(spProfile, spPosts)}`,
          `Génère le plan stories Instagram pour @${spProfile.username} aujourd'hui (${today2}).
Objectif: ${objective || spProfile.goal}.

Retourne un JSON:
{
  "date": "${today2}",
  "theme": "Thème cohérent des stories du jour",
  "goal": "Objectif des stories",
  "stories": [
    { "order": 1, "type": "lifestyle", "text": "Texte exact à afficher", "visual": "Description du visuel à utiliser", "interactive": null },
    { "order": 2, "type": "poll", "text": "Texte de la story", "visual": "Fond suggéré", "interactive": "Question | Option A | Option B" },
    { "order": 3, "type": "behind-scenes", "text": "Texte coulisses", "visual": "Description visuelle", "interactive": null },
    { "order": 4, "type": "teaser", "text": "Texte teaser Reel", "visual": "Aperçu flou ou extrait", "interactive": null },
    { "order": 5, "type": "cta", "text": "Texte CTA direct", "visual": "Fond coloré / texte gros", "interactive": "Swipe up ou lien sticker" }
  ]
}
Les stories doivent raconter une histoire cohérente sur la journée et la niche ${spProfile.niche}.`
        );
        result = JSON.parse(json);
        break;
      }

      case 'generateReelBuilder': {
        const { profile: rbProfile, posts: rbPosts, topic, duration } = params as { profile: UserProfile; posts: Post[]; topic: string; duration: number };
        const json = await callModel(
          `${baseSystem}\n${profileContext(rbProfile, rbPosts)}`,
          `Génère un Reel complet et détaillé pour @${rbProfile.username} sur le sujet: "${topic}".
Durée cible: ${duration} secondes. Niche: ${rbProfile.niche}.

Retourne un JSON avec cette structure exacte:
{
  "hook": "Hook principal (première phrase face caméra)",
  "hookVariants": ["variante 1", "variante 2", "variante 3"],
  "scenes": [
    { "order": 1, "type": "face-cam", "description": "Ce que tu fais/dis dans ce plan", "duration": 3, "screenText": "Texte à afficher à l'écran", "emotion": "Émotion recherchée" },
    { "order": 2, "type": "broll", "description": "Plan lifestyle ou b-roll", "duration": 4, "screenText": null, "emotion": "Émotion" },
    { "order": 3, "type": "text", "description": "Plan texte pur", "duration": 3, "screenText": "Texte à l'écran", "emotion": "Émotion" },
    { "order": 4, "type": "face-cam", "description": "Suite face caméra", "duration": 5, "screenText": null, "emotion": "Émotion" },
    { "order": 5, "type": "lifestyle", "description": "Plan lifestyle", "duration": 4, "screenText": null, "emotion": "Émotion" },
    { "order": 6, "type": "face-cam", "description": "CTA face caméra", "duration": 3, "screenText": "CTA à l'écran", "emotion": "Urgence/Invitation" }
  ],
  "script": "Script complet mot à mot pour les parties face caméra",
  "cta": "Call-to-action exact à dire et afficher",
  "caption": "Légende complète avec emojis et structure",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"],
  "pinnedComment": "Commentaire épinglé à poster après publication",
  "totalDuration": ${duration},
  "targetEmotion": "Émotion principale que l'audience doit ressentir",
  "musicMood": "Type de musique recommandée (ex: upbeat, cinématique, trap, lo-fi)"
}
Tout doit être ultra personnalisé à la niche "${rbProfile.niche}" et au ton "${rbProfile.tone}" de @${rbProfile.username}.`
        );
        result = JSON.parse(json);
        break;
      }

      case 'viralRemix': {
        const { profile: vrProfile, viralScript, targetTopic } = params as { profile: UserProfile; viralScript: string; targetTopic: string };
        const json = await callModel(
          `${baseSystem}\n${profileContext(vrProfile)}`,
          `Analyse ce script/contenu viral et adapte-le à la niche de @${vrProfile.username}.

CONTENU VIRAL À ANALYSER:
${viralScript}

ADAPTATION DEMANDÉE:
- Sujet cible: ${targetTopic || 'même sujet adapté à la niche'}
- Niche: ${vrProfile.niche}
- Ton: ${vrProfile.tone}

Retourne un JSON:
{
  "originalStructure": "Analyse de la structure du contenu viral (hook, développement, CTA)",
  "viralTechniques": ["Technique 1", "Technique 2", "Technique 3"],
  "adaptedHook": "Hook adapté à ta niche",
  "adaptedScript": "Script complet adapté",
  "adaptedCaption": "Légende adaptée",
  "adaptedHashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "keyInsight": "Ce qui rend ce contenu viral et comment tu l'as appliqué"
}`
        );
        result = JSON.parse(json);
        break;
      }

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Claude API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
