import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(score: number): string {
  if (score < 40) return '#EF4444';
  if (score < 60) return '#F59E0B';
  return '#10B981';
}

export function getScoreLabel(score: number): string {
  if (score < 40) return 'Faible';
  if (score < 60) return 'Moyen';
  if (score < 80) return 'Bon';
  return 'Excellent';
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'facile': return '#10B981';
    case 'moyen': return '#F59E0B';
    case 'avancé': return '#EF4444';
    default: return '#7A7A9D';
  }
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
