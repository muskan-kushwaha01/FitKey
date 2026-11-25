// professionalRewardService.js
// Supabase-backed professional reward redemptions.
// Spends XP and records redemptions via the spend_prof_xp_and_redeem SECURITY DEFINER RPC.
// Clients cannot directly write to professional_xp_transactions or professional_redemptions.

import { supabase } from '../../lib/supabase.js'
import { PROFESSIONAL_REWARDS } from '../../data/professionalRewards.js'
import { getAvailableProfXP } from './professionalXpService.js'

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Get redemptions for a specific professional from Supabase.
 */
export async function getProfRedemptions(professionalId) {
  if (!professionalId) return []

  const { data, error } = await supabase
    .from('professional_redemptions')
    .select('id, reward_id, title, category, points, redeemed_at')
    .eq('professional_id', professionalId)
    .order('redeemed_at', { ascending: false })

  if (error) {
    console.warn('[professionalRewardService] getProfRedemptions error:', error.message)
    return []
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    professionalId,
    rewardId: r.reward_id,
    title: r.title,
    category: r.category,
    points: r.points,
    redeemedAt: r.redeemed_at,
  }))
}

/**
 * Get list of reward IDs claimed by a professional.
 */
export async function getClaimedRewardIds(professionalId) {
  const redemptions = await getProfRedemptions(professionalId)
  return redemptions.map((r) => r.rewardId)
}

/**
 * Get the professional reward catalog enriched with current affordability and claimed status.
 * Requires availableXP as a parameter (read from cache or passed in).
 */
export function buildProfRewardCatalog(availableXP, claimedIds) {
  return PROFESSIONAL_REWARDS.map((reward) => {
    const isClaimed = claimedIds.includes(reward.id)
    const canAfford = availableXP >= reward.points
    const progressPercent = Math.min(100, Math.round((availableXP / reward.points) * 100))
    const xpNeeded = Math.max(0, reward.points - availableXP)

    return {
      ...reward,
      isClaimed,
      canAfford,
      progressPercent,
      xpNeeded,
      availableXP,
    }
  })
}

/**
 * Get the professional reward catalog from Supabase (async, authoritative).
 */
export async function getProfRewardCatalog(professionalId) {
  const [claimed, xpSummary] = await Promise.all([
    getClaimedRewardIds(professionalId),
    supabase.rpc('get_prof_xp_summary').then(({ data }) => data),
  ])

  const availableXP = xpSummary?.available_xp ?? 0
  return buildProfRewardCatalog(availableXP, claimed)
}

/**
 * Redeem a professional reward.
 * Calls the spend_prof_xp_and_redeem SECURITY DEFINER RPC — atomic XP deduction + redemption record.
 */
export async function redeemProfReward(professionalId, rewardId) {
  if (!professionalId) {
    return { success: false, reason: 'NO_PROFESSIONAL_ID', message: 'Professional session required.' }
  }

  const reward = PROFESSIONAL_REWARDS.find((r) => r.id === rewardId)
  if (!reward) {
    return { success: false, reason: 'NOT_FOUND', message: 'Reward item not found.' }
  }

  const { data, error } = await supabase.rpc('spend_prof_xp_and_redeem', {
    p_reward_id: reward.id,
    p_title: reward.title,
    p_category: reward.category || 'General',
    p_points: reward.points,
  })

  if (error) {
    return { success: false, reason: error.code || 'RPC_ERROR', message: error.message }
  }

  if (!data?.success) {
    return {
      success: false,
      reason: data?.reason || 'FAILED',
      message: data?.message || 'Failed to redeem reward.',
      availableXP: data?.available_xp,
    }
  }

  return {
    success: true,
    availableXP: data.available_xp ?? 0,
    message: data.message || `Successfully redeemed "${reward.title}"!`,
  }
}
