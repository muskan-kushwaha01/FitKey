// professionalLeaderboardService.js
// Composite ranking formula combining XP, average rating, review count, and content count.
// Only ranks professionals who have completed onboarding.

import { getProfessionals } from './professionalAuthService.js'
import { getLifetimeProfXP } from './professionalXpService.js'
import { getRatingSummary } from './professionalReviewService.js'
import { getPosts } from './professionalContentService.js'

/**
 * Scoring weights (configurable).
 * score = (lifetimeXP * 0.4) + (avgRating * 200 * 0.3) + (reviewCount * 20 * 0.15) + (approvedPostCount * 30 * 0.15)
 */
const WEIGHTS = {
  XP: 0.4,
  RATING: 0.3,
  REVIEWS: 0.15,
  POSTS: 0.15,
  RATING_SCALE: 200,
  REVIEW_SCALE: 20,
  POST_SCALE: 30,
}

function computeScore({ lifetimeXP, avgRating, reviewCount, postCount }) {
  return (
    lifetimeXP * WEIGHTS.XP +
    avgRating * WEIGHTS.RATING_SCALE * WEIGHTS.RATING +
    reviewCount * WEIGHTS.REVIEW_SCALE * WEIGHTS.REVIEWS +
    postCount * WEIGHTS.POST_SCALE * WEIGHTS.POSTS
  )
}

/**
 * Get ranked professional list.
 * Returns array of { rank, professional, lifetimeXP, avgRating, reviewCount, postCount, score }
 * sorted by score descending.
 */
export function getLeaderboardRankings() {
  const professionals = getProfessionals().filter((p) => p.onboardingCompleted)

  const ranked = professionals.map((p) => {
    const lifetimeXP = getLifetimeProfXP(p.id)
    const { avg: avgRating, total: reviewCount } = getRatingSummary(p.id)
    const posts = getPosts({ professionalId: p.id })
    const postCount = posts.filter((post) => post.approvalStatus === 'approved' || !post.approvalStatus).length
    const score = computeScore({ lifetimeXP, avgRating, reviewCount, postCount })

    return {
      professional: p,
      lifetimeXP,
      avgRating,
      reviewCount,
      postCount,
      score: Math.round(score),
    }
  })

  ranked.sort((a, b) => b.score - a.score)

  return ranked.map((entry, i) => ({ ...entry, rank: i + 1 }))
}

/**
 * Get this professional's rank number and score.
 */
export function getProfessionalRank(professionalId) {
  const rankings = getLeaderboardRankings()
  const entry = rankings.find((r) => r.professional.id === professionalId)
  return entry || null
}
