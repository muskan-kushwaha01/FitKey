// services/rewardService.js
// Reward store items, server-verified atomic redemptions, and scoped cache hydration.

import {
  getItem,
  STORAGE_KEYS,
} from './storageService'
import { getAvailableXP } from './xpService'
import { REWARD_ITEMS } from '../data/rewards.js'
import { supabase } from '../lib/supabase.js'
import { syncRedemptionsFromSupabase, syncXPFromSupabase } from './syncService'

export { syncRedemptionsFromSupabase }

/**
 * Get all redemptions from active user's scoped cache.
 */
export function getRedemptions() {
  const list = getItem(STORAGE_KEYS.REDEMPTIONS, [])
  return Array.isArray(list) ? list : []
}

/**
 * Get list of IDs of claimed rewards.
 */
export function getClaimedRewardIds() {
  return getRedemptions().map((r) => r.rewardId)
}

/**
 * Get reward store items with live affordability and claim statuses.
 */
export function getRewardStoreItems() {
  const availableXP = getAvailableXP()
  const claimedIds = new Set(getClaimedRewardIds())
  return REWARD_ITEMS.map((item) => {
    const isClaimed = claimedIds.has(item.id)
    const canAfford = availableXP >= item.points
    return {
      ...item,
      isClaimed,
      canAfford,
      progressPercent: Math.min(100, Math.round((availableXP / item.points) * 100)),
      xpNeeded: Math.max(0, item.points - availableXP),
      availableXP,
    }
  })
}

/**
 * Redeem a reward item atomically through the trusted server-side `redeem_reward` RPC.
 * Never fabricates client-side redemptions or accepts client prices.
 */
export async function redeemReward(rewardId) {
  if (!REWARD_ITEMS.some((item) => item.id === rewardId)) {
    return { success: false, reason: 'ITEM_NOT_FOUND', message: 'Reward item not found.' }
  }
  const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId })
  if (error) {
    return { success: false, reason: error.code || 'REDEMPTION_FAILED', message: error.message || 'Could not redeem reward.' }
  }
  if (!data?.success) return data || { success: false, reason: 'REDEMPTION_FAILED', message: 'Could not redeem reward.' }

  const { data: authData } = await supabase.auth.getUser()
  if (authData?.user?.id) {
    await Promise.all([
      syncXPFromSupabase(authData.user.id),
      syncRedemptionsFromSupabase(authData.user.id),
    ])
  }
  return data
}
