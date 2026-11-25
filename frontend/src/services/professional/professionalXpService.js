// professionalXpService.js
// Supabase-backed professional XP ledger, balance calculation, and earning rules.
// All writes go through SECURITY DEFINER RPCs — clients cannot directly modify XP tables.
// localStorage is used only as a read-through cache for instant UI rendering,
// and as a migration source for one-time legacy transfer.

import { supabase } from '../../lib/supabase.js'

// ─── XP Earning Rules (kept in sync with migration SQL) ───────────────────────
export const PROF_XP_RULES = {
  APPROVED_ARTICLE: 50,
  APPROVED_REEL: 75,
  APPROVED_DISCUSSION: 25,
  ENGAGEMENT_MILESTONE: 20,
  GENUINE_REVIEW: 10,
  QUALITY_CONTRIBUTION: 30,
  CREDENTIAL_VERIFICATION: 500,
  MONTHLY_EARNING_CAP: 3000,
}

// ─── Cache helpers ─────────────────────────────────────────────────────────────
const XP_CACHE_KEY = 'fk_prof_xp_cache'

function readXpCache(professionalId) {
  try {
    const raw = localStorage.getItem(XP_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.professionalId !== professionalId) return null
    // Cache valid for 30 seconds (UI freshness, not authoritative)
    if (Date.now() - (parsed.cachedAt || 0) > 30_000) return null
    return parsed
  } catch {
    return null
  }
}

function writeXpCache(professionalId, summary) {
  try {
    localStorage.setItem(XP_CACHE_KEY, JSON.stringify({
      professionalId,
      cachedAt: Date.now(),
      ...summary,
    }))
  } catch { /* storage full — ignore */ }
}

function clearXpCache() {
  try { localStorage.removeItem(XP_CACHE_KEY) } catch { /* ignore */ }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Get full XP summary from Supabase.
 * Returns { availableXP, lifetimeXP, redeemedXP, monthlyXP, transactions, success, error }.
 */
export async function getProfXPSummaryAsync(professionalId) {
  if (!professionalId) {
    return { success: false, error: 'No professional ID', availableXP: 0, lifetimeXP: 0,
      redeemedXP: 0, monthlyXP: 0, transactions: [] }
  }

  const { data, error } = await supabase.rpc('get_prof_xp_summary')

  if (error) {
    console.warn('[professionalXpService] get_prof_xp_summary RPC error:', error.message)
    return { success: false, error: error.message, availableXP: 0, lifetimeXP: 0,
      redeemedXP: 0, monthlyXP: 0, transactions: [] }
  }

  if (!data?.success) {
    return { success: false, error: 'Unexpected response', availableXP: 0, lifetimeXP: 0,
      redeemedXP: 0, monthlyXP: 0, transactions: [] }
  }

  const summary = {
    success: true,
    availableXP: data.available_xp ?? 0,
    lifetimeXP: data.lifetime_xp ?? 0,
    redeemedXP: data.redeemed_xp ?? 0,
    monthlyXP: data.monthly_xp ?? 0,
    transactions: (data.transactions ?? []).map(normalizeTransaction),
  }

  writeXpCache(professionalId, summary)
  return summary
}

function normalizeTransaction(tx) {
  return {
    id: tx.id,
    professionalId: tx.professional_id,
    type: tx.type,
    amount: tx.amount ?? 0,
    source: tx.source ?? 'GENERAL',
    refId: tx.ref_id ?? '',
    description: tx.description ?? '',
    timestamp: tx.timestamp ?? tx.created_at ?? new Date().toISOString(),
  }
}

/**
 * Synchronous available XP — reads from cache.
 * Returns 0 when cache is cold. Use getProfXPSummaryAsync for authoritative value.
 */
export function getAvailableProfXP(professionalId) {
  if (!professionalId) return 0
  const cached = readXpCache(professionalId)
  return cached?.availableXP ?? 0
}

/**
 * Synchronous lifetime XP — reads from cache.
 */
export function getLifetimeProfXP(professionalId) {
  if (!professionalId) return 0
  const cached = readXpCache(professionalId)
  return cached?.lifetimeXP ?? 0
}

/**
 * Synchronous redeemed XP — reads from cache.
 */
export function getTotalProfXPRedeemed(professionalId) {
  if (!professionalId) return 0
  const cached = readXpCache(professionalId)
  return cached?.redeemedXP ?? 0
}

/**
 * Synchronous monthly XP — reads from cache.
 */
export function getMonthlyProfXP(professionalId) {
  if (!professionalId) return 0
  const cached = readXpCache(professionalId)
  return cached?.monthlyXP ?? 0
}

/**
 * Synchronous transaction list — reads from cache.
 */
export function getProfXPTransactions(professionalId) {
  if (!professionalId) return []
  const cached = readXpCache(professionalId)
  return cached?.transactions ?? []
}

/**
 * Synchronous summary — reads from cache (compatible with existing ProfessionalXP.jsx).
 * Call loadProfXPData() first to populate the cache.
 */
export function getProfXPSummary(professionalId) {
  if (!professionalId) {
    return { availableXP: 0, lifetimeXP: 0, redeemedXP: 0, monthlyXP: 0, transactions: [] }
  }
  const cached = readXpCache(professionalId)
  if (cached) {
    return {
      availableXP: cached.availableXP ?? 0,
      lifetimeXP: cached.lifetimeXP ?? 0,
      redeemedXP: cached.redeemedXP ?? 0,
      monthlyXP: cached.monthlyXP ?? 0,
      transactions: cached.transactions ?? [],
    }
  }
  return { availableXP: 0, lifetimeXP: 0, redeemedXP: 0, monthlyXP: 0, transactions: [] }
}

/**
 * Load XP data from Supabase into cache for synchronous reads.
 * Call this on component mount.
 */
export async function loadProfXPData(professionalId) {
  return getProfXPSummaryAsync(professionalId)
}

/**
 * Award XP through the secure Supabase RPC.
 * Idempotent: duplicate refId for EARN type is silently ignored.
 */
export async function awardProfXP({
  professionalId,
  amount,
  source = 'GENERAL',
  refId,
  description = 'Professional XP Award',
}) {
  if (!professionalId) return { success: false, reason: 'NO_PROFESSIONAL_ID' }

  const numAmount = Math.round(Number(amount))
  if (isNaN(numAmount) || numAmount <= 0) return { success: false, reason: 'INVALID_AMOUNT' }

  const { data, error } = await supabase.rpc('award_prof_xp', {
    p_professional_id: professionalId,
    p_amount: numAmount,
    p_source: source,
    p_ref_id: refId || `award_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    p_description: description,
  })

  if (error) {
    console.warn('[professionalXpService] award_prof_xp error:', error.message)
    return { success: false, reason: error.code || 'RPC_ERROR', message: error.message }
  }

  if (!data?.success) {
    return { success: false, reason: data?.reason || 'UNKNOWN', message: data?.message }
  }

  clearXpCache()
  return { success: true, availableXP: data.available_xp ?? 0 }
}

/**
 * Spend XP through the secure Supabase redemption RPC.
 */
export async function spendProfXP({
  professionalId,
  amount,
  rewardId,
  rewardTitle,
  rewardCategory,
  description = 'Redeemed professional reward',
}) {
  if (!professionalId) return { success: false, reason: 'NO_PROFESSIONAL_ID' }

  const numAmount = Math.round(Number(amount))
  if (isNaN(numAmount) || numAmount <= 0) return { success: false, reason: 'INVALID_AMOUNT' }

  const { data, error } = await supabase.rpc('spend_prof_xp_and_redeem', {
    p_reward_id: rewardId,
    p_title: rewardTitle || description,
    p_category: rewardCategory || 'General',
    p_points: numAmount,
  })

  if (error) {
    return { success: false, reason: error.code || 'RPC_ERROR', message: error.message }
  }

  if (!data?.success) {
    return {
      success: false,
      reason: data?.reason || 'FAILED',
      message: data?.message,
      availableXP: data?.available_xp,
    }
  }

  clearXpCache()
  return { success: true, availableXP: data.available_xp ?? 0, message: data.message }
}

/**
 * Check if a transaction with refId has been awarded (uses cache).
 */
export function hasAwardedProfXP(professionalId, refId) {
  if (!professionalId || !refId) return false
  const txs = getProfXPTransactions(professionalId)
  return txs.some((tx) => tx.refId === refId && tx.type === 'EARN')
}
