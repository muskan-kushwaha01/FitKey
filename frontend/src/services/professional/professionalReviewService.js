// professionalReviewService.js
// Supabase-backed professional reviews and ratings.
// One review per authenticated reviewer per professional (enforced at DB level).
// Professionals cannot self-review (enforced at DB constraint + RPC level).
// XP is awarded server-side via submit_prof_review RPC.

import { supabase } from '../../lib/supabase.js'

// ─── Review helpers ────────────────────────────────────────────────────────────

function normalizeReview(row) {
  return {
    id: row.id,
    userId: row.reviewer_id,
    professionalId: row.professional_id,
    userName: row.reviewer_name ?? 'Community Member',
    rating: row.rating ?? 0,
    comment: row.comment ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

let _reviewsCache = new Map()

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Get all reviews for a professional, sorted newest-first.
 * Returns array of normalized review objects.
 */
export async function getReviewsForProfessional(professionalId) {
  if (!professionalId) return []

  const { data, error } = await supabase
    .from('professional_reviews')
    .select('id, reviewer_id, professional_id, reviewer_name, rating, comment, created_at, updated_at')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[professionalReviewService] getReviewsForProfessional error:', error.message)
    return _reviewsCache.get(professionalId) || []
  }

  const reviews = (data ?? []).map(normalizeReview)
  _reviewsCache.set(professionalId, reviews)
  return reviews
}

/**
 * Get the current user's existing review for a professional (if any).
 */
export async function getUserReviewForProfessional(professionalId) {
  if (!professionalId) return null

  const { data: authData } = await supabase.auth.getSession()
  if (!authData?.session?.user?.id) return null

  const { data, error } = await supabase
    .from('professional_reviews')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('reviewer_id', authData.session.user.id)
    .maybeSingle()

  if (error) return null
  return data ? normalizeReview(data) : null
}

/**
 * Submit a new review via the secure RPC.
 * Handles XP award, activity logging, and self-review prevention server-side.
 * Returns { success, reviewId, xpAwarded, error }.
 */
export async function submitReview({ professionalId, rating, comment = '' }) {
  if (!professionalId) return { success: false, error: 'Professional ID required.' }
  if (!rating || rating < 1 || rating > 5) return { success: false, error: 'Rating must be between 1 and 5.' }

  const { data: authData } = await supabase.auth.getSession()
  if (!authData?.session?.user?.id) return { success: false, error: 'User identity required.' }

  const { data, error } = await supabase.rpc('submit_prof_review', {
    p_professional_id: professionalId,
    p_rating: rating,
    p_comment: comment,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data?.success) {
    return { success: false, error: data?.error || 'Failed to submit review.' }
  }

  return {
    success: true,
    reviewId: data.review_id,
    xpAwarded: data.xp_awarded ?? 0,
  }
}

/**
 * Edit an existing review (comment and/or rating).
 * Does NOT award additional XP — XP is tied to the original review.
 */
export async function editReview({ reviewId, rating, comment = '' }) {
  if (!reviewId) return { success: false, error: 'Review ID required.' }
  if (!rating || rating < 1 || rating > 5) return { success: false, error: 'Rating must be between 1 and 5.' }

  const { data, error } = await supabase
    .from('professional_reviews')
    .update({ rating, comment: comment.trim() })
    .eq('id', reviewId)
    .select()
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: 'Review not found or not authorized.' }

  return { success: true, review: normalizeReview(data) }
}

/**
 * Delete a review.
 * xp_ref_id is preserved in the DB — prevents delete+resubmit XP farming.
 */
export async function deleteReview({ reviewId }) {
  if (!reviewId) return { success: false, error: 'Review ID required.' }

  const { error } = await supabase
    .from('professional_reviews')
    .delete()
    .eq('id', reviewId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Calculate aggregate rating summary for a professional (synchronous cache fallback).
 */
export function getRatingSummarySync(professionalId) {
  const reviews = _reviewsCache.get(professionalId) || []
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

/**
 * Calculate aggregate rating summary for a professional.
 * Returns { avg, total, distribution: {1,2,3,4,5} }
 */
export async function getRatingSummary(professionalId) {
  const reviews = await getReviewsForProfessional(professionalId)
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

// ─── Community user identity (legacy compatibility) ────────────────────────────
// These are kept for pages that still reference them but now use Supabase auth identity.

export function getCommunityUser() {
  return { id: 'supabase-auth', name: 'Community Member' }
}

export function setCommunityUserName(name) {
  // No-op: name is now taken from Supabase profiles table
  return { id: 'supabase-auth', name }
}
