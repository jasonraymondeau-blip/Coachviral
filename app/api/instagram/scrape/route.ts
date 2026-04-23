import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Username manquant' }, { status: 400 });

  const apiKey = request.headers.get('x-rapidapi-key-override') || process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Clé RapidAPI manquante. Entre ta clé dans l\'onglet @username Auto.' }, { status: 500 });

  try {
    // Fetch posts from RapidAPI Instagram Scraper
    const res = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/posts?username_or_id_or_url=${encodeURIComponent(username)}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('RapidAPI error:', res.status, text);
      return NextResponse.json(
        { error: `Erreur RapidAPI ${res.status} — vérifie ta clé ou que le compte est public` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Also fetch profile info
    const profileRes = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
        },
        next: { revalidate: 0 },
      }
    );

    let profileData = null;
    if (profileRes.ok) profileData = await profileRes.json();

    // Parse posts from RapidAPI response
    const items: unknown[] = data?.data?.items || data?.items || [];

    const posts = items.map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const caption = (i.caption as Record<string, unknown>)?.text as string || '';
      const mediaType = i.media_type as number; // 1=photo, 2=video/reel, 8=carousel
      const takenAt = i.taken_at as number;
      const likeCount = i.like_count as number || undefined;
      const commentCount = i.comment_count as number || undefined;
      const viewCount = (i.play_count as number) || (i.view_count as number) || undefined;

      let type: 'Reel' | 'Carrousel' | 'Photo' = 'Photo';
      if (mediaType === 2) type = 'Reel';
      else if (mediaType === 8) type = 'Carrousel';

      const date = takenAt
        ? new Date(takenAt * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const hashtags = (caption.match(/#[\w\u00C0-\u024F]+/g) || []).join(' ');
      const theme = caption.split('\n')[0]?.replace(/#\w+/g, '').trim().slice(0, 80) || 'Post Instagram';

      return { caption, date, type, theme, hashtags, likes: likeCount, comments: commentCount, views: viewCount };
    });

    // Parse profile info
    const pData = profileData?.data as Record<string, unknown> | null;
    const profile = pData ? {
      username: pData.username as string,
      fullName: pData.full_name as string,
      followers: pData.follower_count as number || 0,
      following: pData.following_count as number || 0,
      biography: pData.biography as string || '',
      mediaCount: pData.media_count as number || 0,
      profilePicUrl: pData.profile_pic_url as string || '',
    } : null;

    return NextResponse.json({ posts, profile, total: posts.length });
  } catch (err) {
    console.error('Scrape error:', err);
    return NextResponse.json({ error: 'Erreur réseau. Réessaie.' }, { status: 500 });
  }
}
