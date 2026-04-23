import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/connect?error=${error || 'unknown'}`);
  }

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: `${appUrl}/api/instagram/callback`,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error_type || !tokenData.access_token) {
      const msg = tokenData.error_message || 'Token exchange failed';
      return NextResponse.redirect(`${appUrl}/connect?error=${encodeURIComponent(msg)}`);
    }

    // Exchange for long-lived token (60 days)
    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedRes.json();
    const finalToken = longLivedData.access_token || tokenData.access_token;

    return NextResponse.redirect(
      `${appUrl}/connect?token=${encodeURIComponent(finalToken)}&user_id=${tokenData.user_id}`
    );
  } catch (err) {
    console.error('Instagram OAuth error:', err);
    return NextResponse.redirect(`${appUrl}/connect?error=server_error`);
  }
}
