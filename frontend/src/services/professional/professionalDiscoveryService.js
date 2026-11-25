// professionalDiscoveryService.js
// Public feed and professional discovery logic for the user-facing Community section.
// Only shows approved posts from onboarded professionals.

import { supabase } from '../../lib/supabase.js'
import { isUuid, fetchApprovedCommunityFeed } from '../communityService.js'
import { getAllPosts } from './professionalContentService.js'
import { getProfessionals } from './professionalAuthService.js'
import { getReviewsForProfessional, getRatingSummary } from './professionalReviewService.js'

/**
 * Build a lookup map of professionalId → professional profile.
 */
function buildProfessionalMap() {
  const professionals = getProfessionals().filter((p) => p.onboardingCompleted)
  const map = {}
  for (const p of professionals) {
    map[p.id] = p
  }
  return map
}

/**
 * Get all public-facing posts for the Community feed.
 * Filters: approvalStatus === 'approved', author must have onboardingCompleted.
 * Joins professional profile data onto each post.
 * Optional filters: type ('article' | 'reel' | 'discussion'), category, limit.
 */
export function getPublicFeedPosts({ type = 'all', category = 'all', limit = 50 } = {}) {
  const profMap = buildProfessionalMap()
  let posts = getAllPosts().filter(
    (p) =>
      (p.approvalStatus === 'approved' || !p.approvalStatus) &&
      profMap[p.authorId]
  )

  if (type && type !== 'all') {
    posts = posts.filter((p) => p.type === type.toLowerCase())
  }

  if (category && category !== 'all') {
    posts = posts.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    )
  }

  // Sort newest first
  posts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (limit > 0) posts = posts.slice(0, limit)

  // Join professional verification badge
  return posts.map((p) => {
    const prof = profMap[p.authorId] || {}
    return {
      ...p,
      authorVerificationStatus: prof.verificationStatus || 'Pending Verification',
      authorProfession: prof.profession || '',
      // Ensure photo/specialty are present (may differ from post's authorPhoto if profile was updated)
      authorPhoto: prof.photoUrl || p.authorPhoto || '',
      authorSpecialty: prof.specialization || p.authorSpecialty || '',
    }
  })
}

/**
 * Get a professional's full public profile including posts, rating summary, and reviews.
 */
export function getPublicProfessionalProfile(professionalId) {
  const professionals = getProfessionals()
  const professional = professionals.find(
    (p) => p.id === professionalId && p.onboardingCompleted
  )
  if (!professional) return null

  const posts = getAllPosts().filter(
    (p) => p.authorId === professionalId && p.approvalStatus === 'approved'
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const ratingSummary = getRatingSummary(professionalId)
  const reviews = getReviewsForProfessional(professionalId)

  return {
    professional,
    posts,
    ratingSummary,
    reviews,
  }
}

/**
 * Async public profile loader compatible with both local/demo professionals
 * (e.g. `prof_demo_001`) and Supabase-authenticated verified practitioner UUIDs.
 */
export async function getPublicProfessionalProfileAsync(professionalId, viewerUserId = null) {
  if (!professionalId) return null

  const localProfile = getPublicProfessionalProfile(professionalId)
  if (localProfile) {
    return localProfile
  }

  if (!isUuid(professionalId)) {
    return null
  }

  try {
    const { data: summary, error } = await supabase.rpc('get_public_professional_summary', {
      p_user_id: professionalId,
    })

    if (error || !summary) {
      return null
    }

    const allAuthorPosts = await fetchApprovedCommunityFeed(viewerUserId, { limit: 60 })
    const posts = allAuthorPosts.filter((p) => p.authorId === professionalId)

    const professional = {
      id: summary.user_id,
      fullName: summary.full_name || 'Verified Practitioner',
      name: summary.full_name || 'Verified Practitioner',
      photoUrl: summary.avatar_url || '',
      profession: summary.profession || 'Healthcare Professional',
      specialization: summary.specialization || 'Clinical Wellness',
      qualification: summary.qualification || '',
      yearsExperience: summary.experience_years ?? null,
      bio: summary.bio || '',
      workplaceName: summary.workplace_name || '',
      workplaceAddress: summary.workplace_address || '',
      city: summary.city || '',
      state: summary.state || '',
      clinicPhotoUrl: summary.clinic_photo_url || '',
      consultationsEnabled: Boolean(summary.consultations_enabled),
      durationMinutes: summary.duration_minutes || 20,
      bufferMinutes: summary.buffer_minutes || 5,
      timezone: summary.timezone || 'Asia/Kolkata',
      verificationStatus: summary.verification_status || 'Verified Practitioner',
      licenseNumber: summary.is_verified ? 'Verified Registry' : '',
      consultationFee: summary.consultation_fee ?? null,
    }

    const [ratingSummary, reviews] = await Promise.all([
      getRatingSummary(professionalId),
      getReviewsForProfessional(professionalId),
    ])

    return {
      professional,
      posts,
      ratingSummary,
      reviews,
    }
  } catch (err) {
    console.error('[professionalDiscoveryService] getPublicProfessionalProfileAsync error:', err)
    return null
  }
}

/**
 * Search professionals by name, profession, specialization, or city.
 */
export function searchProfessionals(query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return getProfessionals().filter((p) => p.onboardingCompleted)

  return getProfessionals().filter((p) => {
    if (!p.onboardingCompleted) return false
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.fullName || '').toLowerCase().includes(q) ||
      (p.profession || '').toLowerCase().includes(q) ||
      (p.specialization || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q)
    )
  })
}
