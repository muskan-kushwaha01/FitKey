// professionalRewardService.js
// Handles professional reward catalog querying, balance validation, and persistent redemption.

import { PROFESSIONAL_REWARDS } from '../../data/professionalRewards.js'
import {
  getAvailableProfXP,
  spendProfXP,
} from './professionalXpService.js'
import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'

/**
 * Retrieve all professional redemptions across all professionals from storage.
 */
function getMasterRedemptions() {
  return getItem(STORAGE_KEYS.PROF_REDEMPTIONS, [])
}

/**
 * Save master redemptions array.
 */
function saveMasterRedemptions(list) {
  return setItem(STORAGE_KEYS.PROF_REDEMPTIONS, list)
}

/**
 * Get redemptions for a specific professional.
 */
export function getProfRedemptions(professionalId) {
  if (!professionalId) return []
  const master = getMasterRedemptions()
  return master
    .filter((r) => r.professionalId === professionalId)
    .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt))
}

/**
 * Get list of reward IDs claimed by a professional.
 */
export function getClaimedRewardIds(professionalId) {
  const redemptions = getProfRedemptions(professionalId)
  return redemptions.map((r) => r.rewardId)
}

/**
 * Get the professional reward catalog enriched with current affordability and claimed status.
 */
export function getProfRewardCatalog(professionalId) {
  const availableXP = getAvailableProfXP(professionalId)
  const claimedIds = getClaimedRewardIds(professionalId)

  return PROFESSIONAL_REWARDS.map((reward) => {
    const isClaimed = claimedIds.includes(reward.id)
    const canAfford = availableXP >= reward.points
    const progressPercent = Math.min(
      100,
      Math.round((availableXP / reward.points) * 100)
    )
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
 * Redeem a professional reward.
 */
export function redeemProfReward(professionalId, rewardId) {
  if (!professionalId) {
    return { success: false, reason: 'NO_PROFESSIONAL_ID', message: 'Professional session required.' }
  }

  const reward = PROFESSIONAL_REWARDS.find((r) => r.id === rewardId)
  if (!reward) {
    return { success: false, reason: 'NOT_FOUND', message: 'Reward item not found.' }
  }

  // Prevent duplicate redemption
  const claimedIds = getClaimedRewardIds(professionalId)
  if (claimedIds.includes(rewardId)) {
    return {
      success: false,
      reason: 'ALREADY_REDEEMED',
      message: 'You have already redeemed this benefit.',
    }
  }

  // Check available XP balance
  const availableXP = getAvailableProfXP(professionalId)
  if (availableXP < reward.points) {
    return {
      success: false,
      reason: 'INSUFFICIENT_XP',
      message: `You need ${reward.points - availableXP} more XP to redeem this reward.`,
    }
  }

  // Deduct XP through the professional transaction ledger
  const spendResult = spendProfXP({
    professionalId,
    amount: reward.points,
    refId: `prof-redeem-${reward.id}-${generateId()}`,
    description: `Redeemed ${reward.title}`,
  })

  if (!spendResult.success) {
    return {
      success: false,
      reason: spendResult.reason,
      message: spendResult.message || 'Failed to deduct XP for redemption.',
    }
  }

  // Persist redemption record
  const master = getMasterRedemptions()
  const record = {
    id: `pred_${generateId()}`,
    professionalId,
    rewardId: reward.id,
    title: reward.title,
    category: reward.category,
    points: reward.points,
    redeemedAt: new Date().toISOString(),
  }

  master.push(record)
  saveMasterRedemptions(master)

  return {
    success: true,
    redemption: record,
    availableXP: spendResult.availableXP,
    message: `Successfully redeemed "${reward.title}"!`,
  }
}
