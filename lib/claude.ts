import {
  UserProfile, Post, PostAnalysis, Idea, IdeaParams, Script, Caption,
  HashtagSet, AuditReport, ContentScore, WeeklyPlan, DailyCoach,
  ScreenshotMetrics, StyleProfile, EnhancedContent,
  DailyAction, HookSet, StoryPlan, ReelBuilder,
} from '@/types';

async function callClaude(action: string, params: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Erreur API Claude');
  }
  return res.json();
}

// ── Existing functions ────────────────────────────────────────────────────────

export async function analyzePost(post: Post, profile: UserProfile): Promise<PostAnalysis> {
  return callClaude('analyzePost', { post, profile }) as Promise<PostAnalysis>;
}

export async function generateIdeas(params: IdeaParams, profile: UserProfile): Promise<Idea[]> {
  return callClaude('generateIdeas', { params, profile }) as Promise<Idea[]>;
}

export async function generateScript(idea: string, duration: number, profile: UserProfile): Promise<Script> {
  return callClaude('generateScript', { idea, duration, profile }) as Promise<Script>;
}

export async function generateCaption(subject: string, format: string, profile: UserProfile): Promise<Caption> {
  return callClaude('generateCaption', { subject, format, profile }) as Promise<Caption>;
}

export async function generateHashtags(theme: string, profile: UserProfile): Promise<HashtagSet> {
  return callClaude('generateHashtags', { theme, profile }) as Promise<HashtagSet>;
}

export async function generateAudit(profile: UserProfile, posts: Post[]): Promise<AuditReport> {
  return callClaude('generateAudit', { profile, posts }) as Promise<AuditReport>;
}

export async function getDailyTip(profile: UserProfile, posts?: Post[]): Promise<string> {
  return callClaude('getDailyTip', { profile, posts: posts || [] }) as Promise<string>;
}

// ── New functions ─────────────────────────────────────────────────────────────

/** Daily coaching brief: action + mistake + idea + motivation */
export async function getDailyCoach(profile: UserProfile, posts?: Post[]): Promise<DailyCoach> {
  return callClaude('getDailyCoach', { profile, posts: posts || [] }) as Promise<DailyCoach>;
}

/** Score a piece of content (caption/hook/script) before publishing */
export async function scoreContent(
  content: string,
  contentType: string,
  profile: UserProfile
): Promise<ContentScore> {
  return callClaude('scoreContent', { content, contentType, profile }) as Promise<ContentScore>;
}

/** Make content more viral or more personal */
export async function enhanceContent(
  content: string,
  mode: 'viral' | 'personal',
  profile: UserProfile
): Promise<EnhancedContent> {
  return callClaude('enhanceContent', { content, mode, profile }) as Promise<EnhancedContent>;
}

/** Generate a full weekly editorial plan */
export async function generateWeeklyPlan(profile: UserProfile, posts?: Post[]): Promise<WeeklyPlan> {
  return callClaude('generateWeeklyPlan', { profile, posts: posts || [] }) as Promise<WeeklyPlan>;
}

/** Learn user writing style from their posts */
export async function learnStyle(posts: Post[], profile: UserProfile): Promise<StyleProfile | null> {
  return callClaude('learnStyle', { posts, profile }) as Promise<StyleProfile | null>;
}

/** Analyze an Instagram Insights screenshot with Claude Vision */
export async function analyzeScreenshot(
  imageBase64: string,
  mediaType: string
): Promise<ScreenshotMetrics> {
  return callClaude('analyzeScreenshot', { imageBase64, mediaType }) as Promise<ScreenshotMetrics>;
}

// ── V2 functions ──────────────────────────────────────────────────────────────

/** Generate the actionable daily content plan (what to film + stories today) */
export async function generateDailyAction(
  profile: UserProfile,
  posts: Post[],
  weeklyPlan?: unknown
): Promise<DailyAction> {
  return callClaude('generateDailyAction', { profile, posts, weeklyPlan }) as Promise<DailyAction>;
}

/** Generate a set of hooks by category for a given topic */
export async function generateHooks(
  profile: UserProfile,
  category: string,
  topic: string
): Promise<HookSet> {
  return callClaude('generateHooks', { profile, category, topic }) as Promise<HookSet>;
}

/** Generate a daily story plan */
export async function generateStories(
  profile: UserProfile,
  posts: Post[],
  objective?: string
): Promise<StoryPlan> {
  return callClaude('generateStories', { profile, posts, objective }) as Promise<StoryPlan>;
}

/** Generate a full Reel with storyboard, script, caption, hashtags, pinned comment */
export async function generateReelBuilder(
  profile: UserProfile,
  posts: Post[],
  topic: string,
  duration: number
): Promise<ReelBuilder> {
  return callClaude('generateReelBuilder', { profile, posts, topic, duration }) as Promise<ReelBuilder>;
}

/** Remix a viral script/reel adapted to user's niche */
export async function viralRemix(
  profile: UserProfile,
  viralScript: string,
  targetTopic?: string
): Promise<{ originalStructure: string; viralTechniques: string[]; adaptedHook: string; adaptedScript: string; adaptedCaption: string; adaptedHashtags: string[]; keyInsight: string }> {
  return callClaude('viralRemix', { profile, viralScript, targetTopic }) as Promise<{ originalStructure: string; viralTechniques: string[]; adaptedHook: string; adaptedScript: string; adaptedCaption: string; adaptedHashtags: string[]; keyInsight: string }>;
}
