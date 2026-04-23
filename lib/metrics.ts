import { Post, UserProfile } from '@/types';

export interface ComputedMetrics {
  engagementRate: number;
  publishingFrequency: number;
  avgLikes: number;
  avgComments: number;
  avgScore: number;
  totalPosts: number;
  analysedPosts: number;
  bestFormat: string;
  bestDay: string;
  avgPostsPerWeek: number;
}

export function computeMetrics(posts: Post[], profile: UserProfile | null): ComputedMetrics {
  const followers = profile?.followers || 0;

  if (posts.length === 0) {
    return {
      engagementRate: 0, publishingFrequency: 0,
      avgLikes: 0, avgComments: 0, avgScore: 0,
      totalPosts: 0, analysedPosts: 0,
      bestFormat: '—', bestDay: '—', avgPostsPerWeek: 0,
    };
  }

  const postsWithMetrics = posts.filter(p => p.likes !== undefined || p.comments !== undefined);

  // Engagement rate = (likes + comments + saves + shares) / followers * 100
  const avgEngagement = postsWithMetrics.length > 0
    ? postsWithMetrics.reduce((acc, p) => {
        const interactions = (p.likes || 0) + (p.comments || 0) + (p.saves || 0) + (p.shares || 0);
        return acc + interactions;
      }, 0) / postsWithMetrics.length
    : 0;
  const engagementRate = followers > 0 ? (avgEngagement / followers) * 100 : 0;

  const avgLikes = postsWithMetrics.length > 0
    ? postsWithMetrics.reduce((a, p) => a + (p.likes || 0), 0) / postsWithMetrics.length
    : 0;
  const avgComments = postsWithMetrics.length > 0
    ? postsWithMetrics.reduce((a, p) => a + (p.comments || 0), 0) / postsWithMetrics.length
    : 0;

  // Publishing frequency (posts/week over the last 60 days)
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const recentPosts = posts.filter(p => new Date(p.date) >= sixtyDaysAgo);
  const avgPostsPerWeek = recentPosts.length / 8.57; // 60 days = ~8.57 weeks

  // Best format by avg score
  const formats = ['Reel', 'Carrousel', 'Photo'] as const;
  const formatScores = formats.map(f => {
    const fp = posts.filter(p => p.type === f && p.analysis);
    const avg = fp.length > 0 ? fp.reduce((a, p) => a + p.analysis!.score, 0) / fp.length : 0;
    return { format: f, avg, count: fp.length };
  });
  const bestFormat = formatScores.sort((a, b) => b.avg - a.avg)[0];

  // Best day of week
  const dayCounts: Record<string, { total: number; count: number }> = {};
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  postsWithMetrics.forEach(p => {
    const day = dayNames[new Date(p.date).getDay()];
    if (!dayCounts[day]) dayCounts[day] = { total: 0, count: 0 };
    dayCounts[day].total += (p.likes || 0) + (p.comments || 0);
    dayCounts[day].count++;
  });
  const bestDay = Object.entries(dayCounts)
    .map(([day, d]) => ({ day, avg: d.count > 0 ? d.total / d.count : 0 }))
    .sort((a, b) => b.avg - a.avg)[0]?.day || '—';

  const analysedPosts = posts.filter(p => p.analysis).length;
  const avgScore = analysedPosts > 0
    ? posts.filter(p => p.analysis).reduce((a, p) => a + p.analysis!.score, 0) / analysedPosts
    : 0;

  return {
    engagementRate: Math.round(engagementRate * 10) / 10,
    publishingFrequency: Math.round(avgPostsPerWeek * 10) / 10,
    avgLikes: Math.round(avgLikes),
    avgComments: Math.round(avgComments),
    avgScore: Math.round(avgScore),
    totalPosts: posts.length,
    analysedPosts,
    bestFormat: bestFormat?.count > 0 ? bestFormat.format : '—',
    bestDay,
    avgPostsPerWeek: Math.round(avgPostsPerWeek * 10) / 10,
  };
}
