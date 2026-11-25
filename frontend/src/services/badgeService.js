// services/badgeService.js
// Evaluate badge unlock criteria locally for UI display and reconcile server-verified badges.

import { BADGE_DEFINITIONS } from '../data/badges'
import {
  getLifetimeHealthSummary,
  todayWaterTotal,
} from './healthService'
import { getTotalCompletedMissionsCount } from './challengeService'
import { awardXP, getLifetimeXP } from './xpService'
import { getItem, setItem, STORAGE_KEYS } from './storageService'
import { syncBadgesFromSupabase } from './syncService'

export { syncBadgesFromSupabase }

function getUnlockedBadgeRecords() {
  const records = getItem(STORAGE_KEYS.BADGE_RECORDS, {})
  return records && typeof records === 'object' ? records : {}
}

/**
 * Evaluate badge progress against health summary and stored server unlocks.
 * Pass `{ evaluateOnly: true }` to keep React render side-effect free.
 */
export function evaluateBadges({ evaluateOnly = false } = {}) {
  const healthSummary = getLifetimeHealthSummary()
  const todayWater = todayWaterTotal()
  const totalCompletedMissions = getTotalCompletedMissionsCount()
  const lifetimeXP = getLifetimeXP()
  const badgeRecords = { ...getUnlockedBadgeRecords() }
  let newlyUnlockedLocal = false

  const stats = {
    ...healthSummary,
    todayWater,
    totalCompletedMissions,
    lifetimeXP,
  }

  const evaluatedBadges = BADGE_DEFINITIONS.map((badge) => {
    const evalResult = badge.evaluate(stats)
    const wasAlreadyUnlocked = Boolean(badgeRecords[badge.id]?.unlocked)
    const isNowUnlocked = wasAlreadyUnlocked || evalResult.isUnlocked

    if (!evaluateOnly && isNowUnlocked && !wasAlreadyUnlocked) {
      badgeRecords[badge.id] = {
        unlocked: true,
        unlockedAt: new Date().toISOString(),
        optimistic: true,
      }
      newlyUnlockedLocal = true

      awardXP({
        amount: badge.reward,
        source: 'BADGE',
        refId: `badge-${badge.id}`,
        description: `Unlocked ${badge.title} badge`,
      })
    }

    return {
      id: badge.id,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      unlocked: isNowUnlocked,
      color: badge.color,
      iconColor: badge.iconColor,
      rarity: badge.rarity,
      progress: isNowUnlocked ? badge.goal : evalResult.progress,
      goal: badge.goal,
      unit: badge.unit,
      unlockedAt: badgeRecords[badge.id]?.unlockedAt || null,
    }
  })

  if (!evaluateOnly && newlyUnlockedLocal) {
    setItem(STORAGE_KEYS.BADGE_RECORDS, badgeRecords)
  }

  const unlockedCount = evaluatedBadges.filter((b) => b.unlocked).length
  const totalBadges = evaluatedBadges.length
  const percentComplete = Math.round((unlockedCount / totalBadges) * 100)
  const badgesLeft = totalBadges - unlockedCount

  const lockedBadges = evaluatedBadges.filter((b) => !b.unlocked)
  const nextBadge =
    lockedBadges.length > 0
      ? [...lockedBadges].sort((a, b) => b.progress / b.goal - a.progress / a.goal)[0]
      : null

  return {
    badges: evaluatedBadges,
    summary: {
      unlockedCount,
      totalBadges,
      percentComplete,
      badgesLeft,
      nextBadge,
    },
  }
}

export function getUnlockedBadgesCount() {
  const records = getUnlockedBadgeRecords()
  return Object.values(records).filter((r) => r.unlocked).length
}
