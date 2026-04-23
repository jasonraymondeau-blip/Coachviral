import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL manquante' }, { status: 400 });

  if (!url.includes('instagram.com')) {
    return NextResponse.json({ error: 'URL Instagram invalide' }, { status: 400 });
  }

  // Detect type from URL pattern (no scraping needed)
  let type = 'Photo';
  if (url.includes('/reel/') || url.includes('/tv/')) type = 'Reel';

  // Extract shortcode from URL for embed
  const shortcodeMatch = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = shortcodeMatch ? shortcodeMatch[2] : null;

  if (!shortcode) {
    return NextResponse.json({ error: 'URL invalide — exemple: https://www.instagram.com/p/XXXXX/' }, { status: 400 });
  }

  const cleanUrl = `https://www.instagram.com/${shortcodeMatch![1]}/${shortcode}/`;

  return NextResponse.json({
    type,
    shortcode,
    embedUrl: `${cleanUrl}embed/`,
    cleanUrl,
  });
}
