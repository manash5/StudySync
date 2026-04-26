import type { NoteItem } from './api'

const DAY_MS = 1000 * 60 * 60 * 24

export function computeRetentionScore(note?: Pick<NoteItem, 'createdAt' | 'reviewed' | 'lastReviewedAt' | 'reviewCount'>): number {
  if (!note) return 0

  const reference = note.lastReviewedAt || note.createdAt
  const referenceTime = new Date(reference).getTime()
  const ageDays = Math.max((Date.now() - referenceTime) / DAY_MS, 0)
  const decay = Math.exp(-ageDays / 14)
  const reviewBoost = Math.min((note.reviewCount || 0) * 0.08, 0.24)
  const reviewedBoost = note.reviewed ? 0.08 : 0
  const score = 26 + decay * 56 + reviewBoost * 100 + reviewedBoost * 100

  return Math.max(5, Math.min(100, Math.round(score)))
}

export function getRetentionLabel(score: number): string {
  if (score < 40) return 'Critical'
  if (score < 60) return 'Needs review'
  if (score < 80) return 'Stable'
  return 'Strong'
}