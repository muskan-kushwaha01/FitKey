// services/challengeService.js
// Challenge progress evaluation, completion checks, and XP award triggers.

import { CHALLENGE_TEMPLATES, DAILY_BONUS_XP } from '../data/challenges'
import {
  getGoals,
  todaySteps,
  todayWaterTotal,
  todaySleep,
  todayActiveMinutes,
} from './healthService'
import { awardXP, hasAwarded, getXPTransactions } from './xpService'
import { getTodayDateString } from './storageService'

/**
 * Evaluate today's daily challenges against actual health metrics.
 * Automatically checks and awards XP for completed challenges and daily bonus.
 */
export function evaluateDailyChallenges() {
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

    // Award XP if completed and not already awarded
    if (completed) {
      doneCount++
      if (!hasAwarded(refId)) {
        awardXP({
          amount: tmpl.reward,
          source: 'CHALLENGE',
          refId,
          description: `Completed ${tmpl.title} challenge`,
        })
      }
    }

    const isAwarded = hasAwarded(refId)
    if (isAwarded) {
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
      isAwarded,
    }
  })

  // Check Daily Bonus: all challenges completed
  const bonusRefId = `bonus-all-daily-${today}`
  const allDone = doneCount === CHALLENGE_TEMPLATES.length
  let bonusClaimed = hasAwarded(bonusRefId)

  if (allDone && !bonusClaimed) {
    awardXP({
      amount: DAILY_BONUS_XP,
      source: 'BONUS',
      refId: bonusRefId,
      description: 'Completed all daily missions bonus',
    })
    bonusClaimed = true
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
 * Get total number of challenge missions completed across all time.
 */
export function getTotalCompletedMissionsCount() {
  const transactions = getXPTransactions()
  return transactions.filter((t) => t.source === 'CHALLENGE' && t.type === 'EARN').length
}

