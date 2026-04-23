import { UserProfile, Post, Idea, AuditReport } from '@/types';

export const STORAGE_KEYS = {
  PROFILE: 'viralcoach_profile',
  POSTS: 'viralcoach_posts',
  IDEAS: 'viralcoach_ideas',
  ANALYSES: 'viralcoach_analyses',
  AUDIT: 'viralcoach_audit',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const storage = {
  getProfile: (): UserProfile | null => safeGet(STORAGE_KEYS.PROFILE, null),
  setProfile: (profile: UserProfile) => safeSet(STORAGE_KEYS.PROFILE, profile),

  getPosts: (): Post[] => safeGet(STORAGE_KEYS.POSTS, []),
  setPosts: (posts: Post[]) => safeSet(STORAGE_KEYS.POSTS, posts),
  addPost: (post: Post) => {
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, []);
    safeSet(STORAGE_KEYS.POSTS, [post, ...posts]);
  },
  updatePost: (id: string, updates: Partial<Post>) => {
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, []);
    safeSet(STORAGE_KEYS.POSTS, posts.map(p => p.id === id ? { ...p, ...updates } : p));
  },
  deletePost: (id: string) => {
    const posts = safeGet<Post[]>(STORAGE_KEYS.POSTS, []);
    safeSet(STORAGE_KEYS.POSTS, posts.filter(p => p.id !== id));
  },

  getIdeas: (): Idea[] => safeGet(STORAGE_KEYS.IDEAS, []),
  setIdeas: (ideas: Idea[]) => safeSet(STORAGE_KEYS.IDEAS, ideas),
  addIdea: (idea: Idea) => {
    const ideas = safeGet<Idea[]>(STORAGE_KEYS.IDEAS, []);
    safeSet(STORAGE_KEYS.IDEAS, [idea, ...ideas]);
  },
  deleteIdea: (id: string) => {
    const ideas = safeGet<Idea[]>(STORAGE_KEYS.IDEAS, []);
    safeSet(STORAGE_KEYS.IDEAS, ideas.filter(i => i.id !== id));
  },

  getAudit: (): AuditReport | null => safeGet(STORAGE_KEYS.AUDIT, null),
  setAudit: (audit: AuditReport) => safeSet(STORAGE_KEYS.AUDIT, audit),
};
