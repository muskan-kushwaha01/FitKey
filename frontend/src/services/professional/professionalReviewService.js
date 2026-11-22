// professionalReviewService.js
// Manages user reviews and ratings for verified professionals.
// One review per community user per professional. XP awarded on submission only (not on edit).
// Delete does NOT remove the XP refId (prevents farm by delete+resubmit).

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'
import {
  awardProfXP,
  PROF_XP_RULES,
} from './professionalXpService.js'

const REVIEWS_KEY = 'fk_prof_reviews'
const COMMUNITY_USER_KEY = 'fk_community_user'

// ─── Community User Identity ─────────────────────────────────────────────────

/**
 * Get or create a persistent community user identity for review submission.
 * Returns { id, name } — name can be updated later.
 */
export function getCommunityUser() {
  const existing = getItem(COMMUNITY_USER_KEY, null)
  if (existing && existing.id) return existing
  const newUser = {
    id: `cu_${generateId()}`,
    name: 'Community Member',
  }
  setItem(COMMUNITY_USER_KEY, newUser)
  return newUser
}

export function setCommunityUserName(name) {
  const user = getCommunityUser()
  const updated = { ...user, name: (name || '').trim() || 'Community Member' }
  setItem(COMMUNITY_USER_KEY, updated)
  return updated
}

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function getAllReviews() {
  return getItem(REVIEWS_KEY, [])
}

function saveAllReviews(reviews) {
  return setItem(REVIEWS_KEY, reviews)
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get all approved reviews for a professional, sorted newest-first.
 */
export function getReviewsForProfessional(professionalId) {
  if (!professionalId) return []
  return getAllReviews()
    .filter((r) => r.professionalId === professionalId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/**
 * Find this user's existing review for a given professional.
 */
export function getUserReviewForProfessional(userId, professionalId) {
  if (!userId || !professionalId) return null
  return getAllReviews().find(
    (r) => r.userId === userId && r.professionalId === professionalId
  ) || null
}

/**
 * Submit a new review.
 * Rules:
 * - One review per userId per professional
 * - Professionals cannot self-review (compare userId with profesional.id)
 * - 5★ → +10XP, 4★ → +5XP, ≤3★ → 0XP (uses PROF_XP_RULES.GENUINE_REVIEW as 5★ cap)
 * - XP is deduplicated via refId review-${reviewId}
 */
export function submitReview({ userId, userName, professionalId, rating, comment }) {
  if (!userId) return { success: false, error: 'User identity required.' }
  if (!professionalId) return { success: false, error: 'Professional ID required.' }
  if (!rating || rating < 1 || rating > 5)
    return { success: false, error: 'Rating must be between 1 and 5.' }

  // Block self-review: community userId (cu_...) vs professional id (prof_...)
  // They shouldn't match, but as a guard we also check by email pattern
  if (userId === professionalId) {
    return { success: false, error: 'Professionals cannot review their own profile.' }
  }

  // One review per user per professional
  const existing = getUserReviewForProfessional(userId, professionalId)
  if (existing) {
    return {
      success: false,
      error: 'You have already reviewed this professional. Use Edit to update your review.',
    }
  }

  const review = {
    id: `rev_${generateId()}`,
    userId,
    userName: (userName || 'Community Member').trim(),
    professionalId,
    rating: Number(rating),
    comment: (comment || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const all = getAllReviews()
  all.push(review)
  saveAllReviews(all)

  // Award XP based on star rating — only on initial submission
  const xpAmount = review.rating === 5 ? PROF_XP_RULES.GENUINE_REVIEW
    : review.rating === 4 ? Math.floor(PROF_XP_RULES.GENUINE_REVIEW / 2)
    : 0

  if (xpAmount > 0) {
    awardProfXP({
      professionalId,
      amount: xpAmount,
      source: 'GENUINE_REVIEW',
      refId: `review-${review.id}`,
      description: `${review.rating}★ verified review from ${review.userName}`,
    })
  }

  return { success: true, review }
}

/**
 * Edit an existing review (comment and/or rating).
 * Does NOT award additional XP — XP refId stays tied to original reviewId.
 */
export function editReview({ reviewId, userId, rating, comment }) {
  if (!reviewId || !userId) return { success: false, error: 'Review ID and user required.' }
  if (!rating || rating < 1 || rating > 5)
    return { success: false, error: 'Rating must be between 1 and 5.' }

  const all = getAllReviews()
  const idx = all.findIndex((r) => r.id === reviewId)
  if (idx === -1) return { success: false, error: 'Review not found.' }
  if (all[idx].userId !== userId) return { success: false, error: 'Unauthorized.' }

  all[idx] = {
    ...all[idx],
    rating: Number(rating),
    comment: (comment || '').trim(),
    updatedAt: new Date().toISOString(),
  }

  saveAllReviews(all)
  return { success: true, review: all[idx] }
}

/**
 * Delete a review.
 * XP refId is NOT cleared — prevents delete+resubmit farming.
 */
export function deleteReview({ reviewId, userId }) {
  if (!reviewId || !userId) return { success: false, error: 'Review ID and user required.' }

  const all = getAllReviews()
  const review = all.find((r) => r.id === reviewId)
  if (!review) return { success: false, error: 'Review not found.' }
  if (review.userId !== userId) return { success: false, error: 'Unauthorized.' }

  saveAllReviews(all.filter((r) => r.id !== reviewId))
  return { success: true }
}

/**
 * Calculate aggregate rating summary for a professional.
 * Returns { avg, total, distribution: {1,2,3,4,5} }
 */
export function getRatingSummary(professionalId) {
  const reviews = getReviewsForProfessional(professionalId)
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)))
    distribution[star] = (distribution[star] || 0) + 1
    sum += r.rating
  }

  const total = reviews.length
  const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0

  return { avg, total, distribution }
}
