import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

  try {
    // Fetch profile
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,followers_count,media_count,biography,website&access_token=${token}`
    );
    const profile = await profileRes.json();

    // Fetch recent media
    const mediaRes = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=20&access_token=${token}`
    );
    const media = await mediaRes.json();

    if (profile.error) {
      return NextResponse.json({ error: profile.error.message }, { status: 401 });
    }

    return NextResponse.json({ profile, media: media.data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
