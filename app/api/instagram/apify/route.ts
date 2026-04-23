import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Appelle un actor Apify en mode synchrone et retourne les items du dataset.
 * Utilise run-sync-get-dataset-items pour éviter le polling.
 */
async function runApifyActor(actorId: string, token: string, input: Record<string, unknown>): Promise<unknown[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=50&memory=256`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error('Token Apify invalide. Vérifie ton token dans console.apify.com → Settings → Integrations.');
    if (res.status === 402) throw new Error('Crédit Apify épuisé. Recharge ton compte sur apify.com (gratuit avec $5/mois).');
    throw new Error(`Erreur Apify ${res.status} — ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Username manquant' }, { status: 400 });

  const token = request.headers.get('x-apify-token') || process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Token Apify manquant. Entre ton token dans la page d'import." }, { status: 500 });

  const cleanUsername = username.replace('@', '').trim();

  try {
    // ── 1. Posts + métriques via instagram-post-scraper ────────────────────────
    // Actor officiel Apify, conçu pour ça : likes, vues, commentaires, captions
    const postItems = await runApifyActor('apify~instagram-post-scraper', token, {
      username: [cleanUsername],
      resultsLimit: 30,
    });

    if (postItems.length === 0) {
      return NextResponse.json(
        { error: 'Aucun post trouvé. Le compte est peut-être privé ou introuvable.' },
        { status: 404 }
      );
    }

    // ── 2. Profil via instagram-profile-scraper (en parallèle) ────────────────
    let profileItems: unknown[] = [];
    try {
      profileItems = await runApifyActor('apify~instagram-profile-scraper', token, {
        usernames: [cleanUsername],
        resultsLimit: 1,
      });
    } catch {
      // Non bloquant — le profil est optionnel
    }

    // ── 3. Parser les posts ────────────────────────────────────────────────────
    const posts = postItems.map((item: unknown) => {
      const i = item as Record<string, unknown>;

      // Type : instagram-post-scraper retourne "Image" | "Video" | "Sidecar"
      const mediaType = (i.type as string) || '';
      let type: 'Reel' | 'Carrousel' | 'Photo' = 'Photo';
      if (mediaType === 'Video') type = 'Reel';
      else if (mediaType === 'Sidecar') type = 'Carrousel';

      const caption = (i.caption as string) || '';

      // Date : timestamp ISO ou unix
      const ts = i.timestamp as string | number | undefined;
      const date = ts
        ? (typeof ts === 'number'
          ? new Date(ts * 1000).toISOString().split('T')[0]
          : new Date(ts).toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0];

      // Hashtags — déjà parsés en tableau ou extraits de la caption
      const hashtagArr = Array.isArray(i.hashtags)
        ? (i.hashtags as string[]).map(h => (h.startsWith('#') ? h : `#${h}`))
        : caption.match(/#[\w\u00C0-\u024F]+/g) || [];
      const hashtags = hashtagArr.join(' ');

      const theme = caption.split('\n')[0]?.replace(/#\w+/g, '').trim().slice(0, 80) || 'Post Instagram';

      // Métriques — instagram-post-scraper expose ces champs directement
      const likes = (i.likesCount as number) ?? (i.likes as number) ?? undefined;
      const comments = (i.commentsCount as number) ?? (i.comments as number) ?? undefined;
      const views =
        (i.videoViewCount as number) ||
        (i.videoPlayCount as number) ||
        (i.playsCount as number) ||
        undefined;

      return { caption, date, type, theme, hashtags, likes, comments, views };
    });

    // ── 4. Parser le profil ────────────────────────────────────────────────────
    let profile = null;
    if (profileItems.length > 0) {
      const p = profileItems[0] as Record<string, unknown>;
      profile = {
        username: (p.username as string) || cleanUsername,
        fullName: (p.fullName as string) || (p.name as string) || '',
        followers: (p.followersCount as number) || 0,
        following: (p.followsCount as number) || (p.followingCount as number) || 0,
        biography: (p.biography as string) || (p.bio as string) || '',
        mediaCount: (p.postsCount as number) || posts.length,
        profilePicUrl: (p.profilePicUrl as string) || (p.profilePicUrlHD as string) || '',
      };
    } else {
      // Fallback : extraire depuis le premier post
      const first = postItems[0] as Record<string, unknown>;
      profile = {
        username: (first?.ownerUsername as string) || cleanUsername,
        fullName: (first?.ownerFullName as string) || '',
        followers: 0,
        following: 0,
        biography: '',
        mediaCount: posts.length,
        profilePicUrl: (first?.ownerProfilePicUrl as string) || '',
      };
    }

    return NextResponse.json({ posts, profile, total: posts.length });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau. Vérifie ta connexion.';
    console.error('Apify scrape error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
