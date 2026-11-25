// professionalLeaderboardService.js
// Supabase-backed professional leaderboard.
// Rankings are computed server-side from persistent XP, reviews, and content data.
// Never uses localStorage-computed rankings or demo professionals.

import { supabase } from '../../lib/supabase.js'

// ─── Leaderboard cache ─────────────────────────────────────────────────────────
const BOARD_CACHE_KEY = 'fk_prof_leaderboard_cache'
const BOARD_CACHE_TTL_MS = 60_000 // 60 seconds

function readBoardCache() {
  try {
    const raw = localStorage.getItem(BOARD_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.cachedAt || 0) > BOARD_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeBoardCache(data) {
  try {
    localStorage.setItem(BOARD_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), ...data }))
  } catch { /* storage full */ }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch leaderboard from Supabase.
 * Returns { success, entries, myRank, error }.
 * entries = [{ rank, professionalId, fullName, specialization, lifetimeXP, availableXP,
 *              reviewCount, avgRating, postCount, score }]
 * myRank = { rank, lifetimeXP, availableXP, score, reviewCount, avgRating, postCount } | null
 */
export async function getLeaderboardAsync(limit = 20) {
  const { data, error } = await supabase.rpc('get_prof_leaderboard', { p_limit: limit })

  if (error) {
    console.warn('[professionalLeaderboardService] get_prof_leaderboard error:', error.message)
    return { success: false, error: error.message, entries: [], myRank: null }
  }

  if (!data?.success) {
    return { success: false, error: 'Unexpected response', entries: [], myRank: null }
  }

  const entries = (data.entries ?? []).map(normalizeEntry)
  const myRank = data.my_rank ? {
    rank: data.my_rank.rank,
    lifetimeXP: data.my_rank.lifetime_xp ?? 0,
    availableXP: data.my_rank.available_xp ?? 0,
    score: data.my_rank.score ?? 0,
    reviewCount: data.my_rank.review_count ?? 0,
    avgRating: data.my_rank.avg_rating ?? 0,
    postCount: data.my_rank.post_count ?? 0,
  } : null

  const result = { success: true, entries, myRank }
  writeBoardCache(result)
  return result
}

function normalizeEntry(e) {
  return {
    rank: e.rank,
    professionalId: e.professional_id,
    fullName: e.full_name ?? 'Verified Practitioner',
    specialization: e.specialization ?? 'Clinical Specialist',
    avatarUrl: e.avatar_url ?? '',
    lifetimeXP: e.lifetime_xp ?? 0,
    availableXP: e.available_xp ?? 0,
    reviewCount: e.review_count ?? 0,
    avgRating: Number(e.avg_rating ?? 0),
    postCount: e.post_count ?? 0,
    score: e.score ?? 0,
  }
}

/**
 * Synchronous leaderboard rankings from cache.
 * Compatible with ProfessionalLeaderboard.jsx existing API shape.
 * Returns array of { rank, professional: { id, fullName, specialization }, lifetimeXP, score }
 */
export function getLeaderboardRankings() {
  const cached = readBoardCache()
  if (!cached?.entries?.length) return []
  return cached.entries.map((e) => ({
    rank: e.rank,
    professional: {
      id: e.professionalId,
      fullName: e.fullName,
      name: e.fullName,
      specialization: e.specialization,
      avatarUrl: e.avatarUrl,
    },
    lifetimeXP: e.lifetimeXP,
    availableXP: e.availableXP,
    avgRating: e.avgRating,
    reviewCount: e.reviewCount,
    postCount: e.postCount,
    score: e.score,
  }))
}

/**
 * Get a specific professional's rank from cache.
 * Returns { rank, professional, lifetimeXP, score } or null.
 */
export function getProfessionalRank(professionalId) {
  const rankings = getLeaderboardRankings()
  return rankings.find((r) => r.professional.id === professionalId) || null
}

/**
 * Load leaderboard into cache.
 */
export async function loadLeaderboard(limit = 20) {
  return getLeaderboardAsync(limit)
}
