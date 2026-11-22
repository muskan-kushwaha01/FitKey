// services/rewardService.js
// Reward store items, XP balance validation, redemption logic, and purchase history.

import { REWARD_ITEMS } from '../data/rewards'
import { getAvailableXP, spendXP } from './xpService'
import { getItem, setItem, STORAGE_KEYS, generateId } from './storageService'

/**
 * Get all redemptions from storage.
 */
export function getRedemptions() {
  return getItem(STORAGE_KEYS.REDEMPTIONS, [])
}

/**
 * Get list of IDs of claimed rewards.
 */
export function getClaimedRewardIds() {
  const redemptions = getRedemptions()
  return redemptions.map((r) => r.rewardId)
}

/**
 * Get reward store items with live affordability and claim statuses.
 */
export function getRewardStoreItems() {
  const availableXP = getAvailableXP()
  const claimedIds = getClaimedRewardIds()

  return REWARD_ITEMS.map((item) => {
    const isClaimed = claimedIds.includes(item.id)
    const canAfford = availableXP >= item.points
    const progressPercent = Math.min(
      100,
      Math.round((availableXP / item.points) * 100)
    )
    const xpNeeded = Math.max(0, item.points - availableXP)

    return {
      ...item,
      isClaimed,
      canAfford,
      progressPercent,
      xpNeeded,
      availableXP,
    }
  })
}

/**
 * Redeem a reward item using available XP.
 */
export function redeemReward(rewardId) {
  const item = REWARD_ITEMS.find((r) => r.id === rewardId)
  if (!item) {
    return { success: false, reason: 'ITEM_NOT_FOUND', message: 'Reward item not found.' }
  }

  const claimedIds = getClaimedRewardIds()
  if (claimedIds.includes(rewardId)) {
    return {
      success: false,
      reason: 'ALREADY_CLAIMED',
      message: 'You have already claimed this reward.',
    }
  }

  const availableXP = getAvailableXP()
  if (availableXP < item.points) {
    return {
      success: false,
      reason: 'INSUFFICIENT_XP',
      message: `You need ${item.points - availableXP} more XP to unlock this reward.`,
    }
  }

  // Deduct XP via transaction ledger
  const spendResult = spendXP({
    amount: item.points,
    refId: `redeem-${item.id}-${generateId()}`,
    description: `Redeemed ${item.title}`,
  })

  if (!spendResult.success) {
    return {
      success: false,
      reason: spendResult.reason,
      message: 'Failed to deduct XP for this redemption.',
    }
  }

  // Persist redemption record
  const redemptions = getRedemptions()
  const record = {
    id: generateId(),
    rewardId: item.id,
    title: item.title,
    points: item.points,
    redeemedAt: new Date().toISOString(),
  }
  redemptions.push(record)
  setItem(STORAGE_KEYS.REDEMPTIONS, redemptions)

  return { success: true, item: record, message: `Successfully unlocked ${item.title}!` }
}

