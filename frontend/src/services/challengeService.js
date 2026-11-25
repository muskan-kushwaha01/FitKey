// services/challengeService.js
// Challenge progress evaluation and server-verified completion checks.

import { CHALLENGE_TEMPLATES, DAILY_BONUS_XP } from '../data/challenges'
import {
  getGoals,
  todaySteps,
  todayWaterTotal,
  todaySleep,
  todayActiveMinutes,
} from './healthService'
import { awardXP, hasAwarded, getXPTransactions } from './xpService'
import { getTodayDateString, getStorageUserId } from './storageService'
import { syncProgressWithServer } from './syncService'

/**
 * Evaluate today's daily challenges against tracked metrics.
 * Pass `{ evaluateOnly: true }` when calling during React render so no side-effect writes occur.
 */
export function evaluateDailyChallenges({ evaluateOnly = false } = {}) {
  const today = getTodayDateString()
  const goals = getGoals()

  const healthData = {
    stepsTotal: todaySteps().steps,
    waterTotal: todayWaterTotal(),
    sleepHours: todaySleep()?.durationHours ?? 0,
    activeMinutes: todayActiveMinutes(),
  }

  let doneCount = 0
  let xpEarnedToday = 0
  let xpAvailableToday = 0

  const evaluatedChallenges = CHALLENGE_TEMPLATES.map((tmpl) => {
    const target = tmpl.getTarget(goals)
    const current = tmpl.getCurrentValue(healthData)
    const progress = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0)
    const completed = progress >= 100
    const refId = `challenge-${tmpl.id}-${today}`

    if (completed) {
      doneCount++
      if (!evaluateOnly && !hasAwarded(refId)) {
        awardXP({
          amount: tmpl.reward,
          source: 'CHALLENGE',
          refId,
          description: `Completed ${tmpl.title} challenge`,
        })
      }
    }

    const isAwarded = hasAwarded(refId) || (!evaluateOnly && completed)
    if (isAwarded || completed) {
      xpEarnedToday += tmpl.reward
    }
    xpAvailableToday += tmpl.reward

    return {
      id: tmpl.id,
      title: tmpl.title,
      description: tmpl.description,
      detail: tmpl.formatDetail(current, target),
      reward: tmpl.reward,
      progress,
      icon: tmpl.icon,
      color: tmpl.color,
      iconColor: tmpl.iconColor,
      completed,
      isAwarded: hasAwarded(refId),
    }
  })

  const bonusRefId = `bonus-all-daily-${today}`
  const allDone = doneCount === CHALLENGE_TEMPLATES.length
  let bonusClaimed = hasAwarded(bonusRefId)

  if (allDone && !bonusClaimed && !evaluateOnly) {
    awardXP({
      amount: DAILY_BONUS_XP,
      source: 'BONUS',
      refId: bonusRefId,
      description: 'Completed all daily missions bonus',
    })
    bonusClaimed = true
    xpEarnedToday += DAILY_BONUS_XP
  } else if (allDone && bonusClaimed) {
    xpEarnedToday += DAILY_BONUS_XP
  }

  return {
    challenges: evaluatedChallenges,
    summary: {
      doneCount,
      totalCount: CHALLENGE_TEMPLATES.length,
      xpEarnedToday,
      xpAvailableToday: xpAvailableToday + DAILY_BONUS_XP,
      bonusXP: DAILY_BONUS_XP,
      bonusClaimed,
      allDone,
    },
  }
}

/**
 * Trigger server-side verification & persistence of today's challenges and XP.
 */
export async function syncChallengesWithServer(userId = getStorageUserId()) {
  if (!userId) return { success: false, reason: 'NO_USER' }
  return syncProgressWithServer(userId, [getTodayDateString()])
}

/**
 * Get total number of challenge missions completed across all time.
 */
export function getTotalCompletedMissionsCount() {
  const transactions = getXPTransactions()
  return transactions.filter((t) => t.source === 'CHALLENGE' && t.type === 'EARN').length
}
