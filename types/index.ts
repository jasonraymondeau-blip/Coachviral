export interface UserProfile {
  username: string;
  niche: string;
  subNiche: string;
  followers: number;
  engagementRate: number;
  publishingFrequency: number;
  goal: string;
  tone: string;
  themes: string[];
  styleProfile?: StyleProfile;
}

export type PostType = 'Reel' | 'Carrousel' | 'Photo';

export interface Post {
  id: string;
  type: PostType;
  theme: string;
  caption: string;
  hashtags: string;
  date: string;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  views?: number;
  analysis?: PostAnalysis;
}

export interface PostAnalysis {
  score: number;
  justification: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  missingHashtags: string[];
  bestRepublishTime: string;
}

export interface Idea {
  id: string;
  title: string;
  format: PostType;
  concept: string;
  hook: string;
  viralReason: string;
  viralScore: number;
  difficulty: 'facile' | 'moyen' | 'avancé';
  savedAt?: string;
}

export interface IdeaParams {
  format: PostType;
  theme: string;
  trend: string;
  viralLevel: 'safe' | 'ambitieux' | 'viral';
}

export interface Script {
  hook: string;
  scenes: { text: string; action: string; overlay: string }[];
  cta: string;
  music: string;
}

export interface Caption {
  short: string;
  long: string;
  hooks: string[];
  hashtags: {
    niche: string[];
    large: string[];
    local: string[];
  };
}

export interface HashtagSet {
  micro: string[];
  medium: string[];
  large: string[];
  niche: string[];
  discovery: string[];
  longTail: string[];
  reachScore: number;
  reachExplanation: string;
  sets: { hashtags: string[]; strategy: string }[];
}

export interface AuditReport {
  positioning: string;
  contentAudit: string;
  growthPlan: string;
  editorialCalendar: string;
  missedOpportunities: string[];
  scores: {
    regularity: number;
    engagement: number;
    captionQuality: number;
    formatDiversity: number;
    nicheConsistency: number;
    hashtagStrategy: number;
  };
  // Advanced audit fields
  globalScore?: number;
  criticalErrors?: string[];
  quickWins?: string[];
  mainStrategy?: string;
  correlations?: {
    hashtagsVsPerformance: string;
    captionLengthVsEngagement: string;
    contentTypeVsReach: string;
  };
  topPosts?: { theme: string; score: number; why: string }[];
  worstPosts?: { theme: string; score: number; why: string }[];
}

// ─── NEW FEATURES ────────────────────────────────────────────────────────────

export interface ContentScore {
  total: number;
  hookStrength: number;
  messageClarity: number;
  emotionalImpact: number;
  shareability: number;
  readability: number;
  hashtagPotential: number;
  feedback: string;
  improvements: string[];
  rewrittenHook: string;
}

export interface WeeklyPlanDay {
  day: string;
  type: PostType;
  idea: string;
  hook: string;
  angle: string;
  bestTime: string;
}

export interface WeeklyPlan {
  strategy: string;
  focus: string;
  days: WeeklyPlanDay[];
  weeklyGoal: string;
}

export interface DailyCoach {
  action: string;
  mistake: string;
  idea: string;
  motivation: string;
}

export interface ScreenshotMetrics {
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  engagementRate: number | null;
  type: 'post' | 'reel' | 'story' | 'compte';
  date: string | null;
  caption: string | null;
  raw: string;
}

export interface StyleProfile {
  dominantTone: string;           // 'storytelling' | 'éducatif' | 'émotionnel' | 'inspirationnel' | 'humour'
  structurePattern: string;       // how captions are typically structured
  recurringVocabulary: string[];  // keywords the user uses often
  averageCaptionLength: number;
  emojiStyle: string;             // heavy / moderate / minimal
  ctaStyle: string;               // style of their calls-to-action
  writingPersonality: string;     // 1 sentence describing their voice
  generatedAt: string;
}

export interface EnhancedContent {
  original: string;
  enhanced: string;
  changes: string[];
  scoreGain: number;
}

export interface ViralityScore {
  total: number;
  breakdown: {
    engagement: number;
    regularity: number;
    formatDiversity: number;
    captionQuality: number;
    nicheConsistency: number;
  };
}

// ─── V2 FEATURES ─────────────────────────────────────────────────────────────

export interface ReelScene {
  order: number;
  type: 'face-cam' | 'lifestyle' | 'text' | 'broll' | 'transition';
  description: string;
  duration: number; // seconds
  screenText?: string;
  emotion: string;
}

export interface ReelBuilder {
  hook: string;
  hookVariants: string[];
  scenes: ReelScene[];
  script: string;
  cta: string;
  caption: string;
  hashtags: string[];
  pinnedComment: string;
  totalDuration: number;
  targetEmotion: string;
  musicMood: string;
}

export type HookCategory = 'emotion' | 'curiosity' | 'controversy' | 'storytelling' | 'luxury' | 'business' | 'lifestyle';

export interface HookVariant {
  text: string;
  intensity: 'soft' | 'medium' | 'aggressive';
  length: 'short' | 'long';
}

export interface HookSet {
  category: HookCategory;
  categoryLabel: string;
  hooks: HookVariant[];
}

export interface StoryIdea {
  order: number;
  type: 'poll' | 'question' | 'teaser' | 'behind-scenes' | 'social-proof' | 'cta' | 'lifestyle';
  text: string;
  visual: string;
  interactive?: string;
}

export interface StoryPlan {
  date: string;
  theme: string;
  stories: StoryIdea[];
  goal: string;
}

export interface DailyAction {
  reelTitle: string;
  reelHook: string;
  reelDuration: string;
  plansToFilm: string[];
  storiesToPost: StoryIdea[];
  ctaOfTheDay: string;
  contentObjective: string;
}

export type ContentDirection = 'acquisition' | 'engagement' | 'fidelisation' | 'vente' | 'autorite' | 'branding';
