// services/xpService.js
// XP transaction ledger, balance calculations, level progression, and award deduplication.

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from './storageService.js'

/**
 * Get all ledger transactions.
 */
export function getXPTransactions() {
  const ledger = getItem(STORAGE_KEYS.XP_LEDGER, null)
  if (!ledger) {
    // Seed initial starter XP transaction so user has baseline balance
    const initial = [
      {
        id: 'init-welcome-bonus',
        type: 'EARN',
        amount: 250,
        source: 'INIT',
        refId: 'init-starter-bonus',
        description: 'Welcome to FitKey Rewards',
        timestamp: new Date().toISOString(),
      },
    ]
    setItem(STORAGE_KEYS.XP_LEDGER, initial)
    return initial
  }
  return ledger
}

/**
 * Check if a reward/transaction with a given refId has already been awarded.
 */
export function hasAwarded(refId) {
  const transactions = getXPTransactions()
  return transactions.some((t) => t.refId === refId && t.type === 'EARN')
}

/**
 * Award XP into the ledger (idempotent; guarantees no double-spending or duplicate awards).
 */
export function awardXP({ amount, source, refId, description }) {
  if (!amount || amount <= 0) return { success: false, reason: 'INVALID_AMOUNT' }

  if (refId && hasAwarded(refId)) {
    const existing = getXPTransactions().find(
      (t) => t.refId === refId && t.type === 'EARN'
    )
    return { success: false, reason: 'ALREADY_AWARDED', transaction: existing }
  }

  const transactions = getXPTransactions()
  const record = {
    id: generateId(),
    type: 'EARN',
    amount: Math.round(amount),
    source: source || 'GENERAL',
    refId: refId || generateId(),
    description: description || 'Earned XP',
    timestamp: new Date().toISOString(),
  }

  transactions.push(record)
  setItem(STORAGE_KEYS.XP_LEDGER, transactions)
  return { success: true, transaction: record }
}

/**
 * Spend XP for rewards.
 */
export function spendXP({ amount, refId, description }) {
  const parsedAmount = Math.round(amount)
  if (!parsedAmount || parsedAmount <= 0) {
    return { success: false, reason: 'INVALID_AMOUNT' }
  }

  const available = getAvailableXP()
  if (available < parsedAmount) {
    return { success: false, reason: 'INSUFFICIENT_XP', available }
  }

  const transactions = getXPTransactions()
  const record = {
    id: generateId(),
    type: 'SPEND',
    amount: parsedAmount,
    source: 'REWARD',
    refId: refId || generateId(),
    description: description || 'Redeemed reward',
    timestamp: new Date().toISOString(),
  }

  transactions.push(record)
  setItem(STORAGE_KEYS.XP_LEDGER, transactions)
  return { success: true, transaction: record }
}

/**
 * Calculate total available spendable XP.
 */
export function getAvailableXP() {
  const transactions = getXPTransactions()
  let balance = 0
  for (const t of transactions) {
    if (t.type === 'EARN') balance += t.amount || 0
    else if (t.type === 'SPEND') balance -= t.amount || 0
  }
  return Math.max(0, balance)
}

/**
 * Calculate all-time earned XP (lifetime).
 */
export function getLifetimeXP() {
  const transactions = getXPTransactions()
  return transactions
    .filter((t) => t.type === 'EARN')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
}

/**
 * Format large XP numbers (e.g. 1250 -> '1.3K' or '1,250').
 */
export function formatXP(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

/**
 * Calculate level progression from lifetime XP.
 * Thresholds:
 * Lvl 1: 0-200 (span 200)
 * Lvl 2: 201-500 (span 300)
 * Lvl 3: 501-900 (span 400)
 * Lvl 4: 901-1400 (span 500)
 * Lvl 5: 1401-2000 (span 600)
 */
export function calculateLevel(lifetimeXP = null) {
  const xp = lifetimeXP !== null ? lifetimeXP : getLifetimeXP()

  const levelTiers = [
    { level: 1, min: 0, max: 200 },
    { level: 2, min: 200, max: 500 },
    { level: 3, min: 500, max: 900 },
    { level: 4, min: 900, max: 1400 },
    { level: 5, min: 1400, max: 2000 },
    { level: 6, min: 2000, max: 2700 },
    { level: 7, min: 2700, max: 3500 },
    { level: 8, min: 3500, max: 4500 },
  ]

  let currentTier = levelTiers[levelTiers.length - 1]
  for (const tier of levelTiers) {
    if (xp < tier.max) {
      currentTier = tier
      break
    }
  }

  const span = currentTier.max - currentTier.min
  const progressInTier = Math.max(0, xp - currentTier.min)
  const progressPercent = Math.min(100, Math.round((progressInTier / span) * 100))
  const xpToNext = Math.max(0, currentTier.max - xp)
  const segmentFilledCount = Math.min(10, Math.round((progressPercent / 100) * 10))

  return {
    level: currentTier.level,
    nextLevel: currentTier.level + 1,
    lifetimeXP: xp,
    progressPercent,
    xpToNext,
    segmentFilledCount,
  }
}

