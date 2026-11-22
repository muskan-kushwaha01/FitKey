// professionalXpService.js
// Dedicated transaction ledger, balance calculation, and earning rules for professionals.
// Completely isolated from regular user XP to prevent mixing balances.

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'

// Configurable professional XP earning rules
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

// Initial seeded ledger for demo professional (Dr. Ananya Sharma)
const INITIAL_DEMO_PROF_LEDGER = [
  {
    id: 'tx_init_001',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 500,
    source: 'CREDENTIAL_VERIFICATION',
    refId: 'cred-verif-prof_demo_001',
    description: 'Clinical credentialing & medical council verification bonus',
    timestamp: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 'tx_init_002',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 700,
    source: 'QUALITY_CONTRIBUTION',
    refId: 'educator-baseline-prof_demo_001',
    description: 'Senior Clinical Educator recognition grant',
    timestamp: '2026-02-05T10:00:00.000Z',
  },
  {
    id: 'tx_init_003',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 50,
    source: 'APPROVED_CONTENT',
    refId: 'content-post_demo_001',
    description: 'Approved Article: "Understanding Blood Pressure"',
    timestamp: '2026-02-14T10:35:00.000Z',
  },
  {
    id: 'tx_init_004',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 75,
    source: 'APPROVED_CONTENT',
    refId: 'content-post_demo_002',
    description: 'Approved Reel: "3 Quick Thoracic Mobility Drills"',
    timestamp: '2026-02-18T08:20:00.000Z',
  },
  {
    id: 'tx_init_005',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 25,
    source: 'APPROVED_CONTENT',
    refId: 'content-post_demo_003',
    description: 'Approved Discussion: "Are Electrolyte Drinks Necessary?"',
    timestamp: '2026-02-21T12:05:00.000Z',
  },
  {
    id: 'tx_init_006',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 30,
    source: 'QUALITY_CONTRIBUTION',
    refId: 'milestone-3posts-prof_demo_001',
    description: 'Quality milestone: 3+ accredited educational posts published',
    timestamp: '2026-02-21T12:10:00.000Z',
  },
  {
    id: 'tx_init_007',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 20,
    source: 'ENGAGEMENT_MILESTONE',
    refId: 'milestone-100eng-prof_demo_001',
    description: 'Clinical engagement milestone: 100+ patient/peer interactions',
    timestamp: '2026-02-22T14:00:00.000Z',
  },
  {
    id: 'tx_init_008',
    professionalId: 'prof_demo_001',
    type: 'EARN',
    amount: 50,
    source: 'GENUINE_REVIEW',
    refId: 'review-batch-prof_demo_001',
    description: '5 verified patient consultations with 5-star clinical satisfaction',
    timestamp: '2026-02-22T16:00:00.000Z',
  },
]

/**
 * Retrieve all transactions across all professionals from storage.
 */
function getMasterLedger() {
  const ledger = getItem(STORAGE_KEYS.PROF_XP_LEDGER, null)
  if (!ledger) {
    setItem(STORAGE_KEYS.PROF_XP_LEDGER, INITIAL_DEMO_PROF_LEDGER)
    return INITIAL_DEMO_PROF_LEDGER
  }
  return ledger
}

/**
 * Save master ledger to storage.
 */
function saveMasterLedger(ledger) {
  return setItem(STORAGE_KEYS.PROF_XP_LEDGER, ledger)
}

/**
 * Get all transactions for a specific professional.
 */
export function getProfXPTransactions(professionalId) {
  if (!professionalId) return []
  const master = getMasterLedger()
  return master
    .filter((tx) => tx.professionalId === professionalId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

/**
 * Check if a transaction with a given refId has already been awarded.
 */
export function hasAwardedProfXP(professionalId, refId) {
  if (!professionalId || !refId) return false
  const txs = getProfXPTransactions(professionalId)
  return txs.some((tx) => tx.refId === refId && tx.type === 'EARN')
}

/**
 * Calculate total available spendable XP for a professional.
 */
export function getAvailableProfXP(professionalId) {
  if (!professionalId) return 0
  const txs = getProfXPTransactions(professionalId)
  let balance = 0
  for (const tx of txs) {
    if (tx.type === 'EARN') balance += tx.amount || 0
    else if (tx.type === 'SPEND') balance -= tx.amount || 0
  }
  return Math.max(0, balance)
}

/**
 * Calculate lifetime all-time earned XP for a professional.
 */
export function getLifetimeProfXP(professionalId) {
  if (!professionalId) return 0
  const txs = getProfXPTransactions(professionalId)
  return txs
    .filter((tx) => tx.type === 'EARN')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0)
}

/**
 * Calculate total XP redeemed (spent) by a professional.
 */
export function getTotalProfXPRedeemed(professionalId) {
  if (!professionalId) return 0
  const txs = getProfXPTransactions(professionalId)
  return txs
    .filter((tx) => tx.type === 'SPEND')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0)
}

/**
 * Calculate XP earned in current calendar month.
 */
export function getMonthlyProfXP(professionalId) {
  if (!professionalId) return 0
  const txs = getProfXPTransactions(professionalId)
  const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  return txs
    .filter((tx) => tx.type === 'EARN' && tx.timestamp.startsWith(currentMonth))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0)
}

/**
 * Award XP to a professional (Idempotent and subject to monthly limits).
 */
export function awardProfXP({
  professionalId,
  amount,
  source = 'GENERAL',
  refId,
  description = 'Professional XP Award',
}) {
  if (!professionalId) {
    return { success: false, reason: 'NO_PROFESSIONAL_ID' }
  }

  const numAmount = Math.round(Number(amount))
  if (isNaN(numAmount) || numAmount <= 0) {
    return { success: false, reason: 'INVALID_AMOUNT' }
  }

  // Prevent duplicate awards
  if (refId && hasAwardedProfXP(professionalId, refId)) {
    return {
      success: false,
      reason: 'ALREADY_AWARDED',
      message: 'This event has already been rewarded.',
    }
  }

  // Monthly earning limit check
  const monthlyEarned = getMonthlyProfXP(professionalId)
  if (monthlyEarned + numAmount > PROF_XP_RULES.MONTHLY_EARNING_CAP) {
    return {
      success: false,
      reason: 'MONTHLY_CAP_EXCEEDED',
      message: `Monthly professional earning cap of ${PROF_XP_RULES.MONTHLY_EARNING_CAP} XP reached.`,
    }
  }

  const master = getMasterLedger()
  const record = {
    id: `ptx_${generateId()}`,
    professionalId,
    type: 'EARN',
    amount: numAmount,
    source,
    refId: refId || `award_${generateId()}`,
    description,
    timestamp: new Date().toISOString(),
  }

  master.push(record)
  saveMasterLedger(master)

  return {
    success: true,
    transaction: record,
    availableXP: getAvailableProfXP(professionalId),
  }
}

/**
 * Spend XP for reward redemption.
 */
export function spendProfXP({
  professionalId,
  amount,
  refId,
  description = 'Redeemed professional reward',
}) {
  if (!professionalId) {
    return { success: false, reason: 'NO_PROFESSIONAL_ID' }
  }

  const numAmount = Math.round(Number(amount))
  if (isNaN(numAmount) || numAmount <= 0) {
    return { success: false, reason: 'INVALID_AMOUNT' }
  }

  const available = getAvailableProfXP(professionalId)
  if (available < numAmount) {
    return {
      success: false,
      reason: 'INSUFFICIENT_XP',
      availableXP: available,
      message: `Insufficient XP. You need ${numAmount - available} more XP.`,
    }
  }

  const master = getMasterLedger()
  const record = {
    id: `ptx_${generateId()}`,
    professionalId,
    type: 'SPEND',
    amount: numAmount,
    source: 'REWARD_REDEMPTION',
    refId: refId || `redeem_${generateId()}`,
    description,
    timestamp: new Date().toISOString(),
  }

  master.push(record)
  saveMasterLedger(master)

  return {
    success: true,
    transaction: record,
    availableXP: getAvailableProfXP(professionalId),
  }
}

/**
 * Get comprehensive XP summary for a professional.
 */
export function getProfXPSummary(professionalId) {
  if (!professionalId) {
    return {
      availableXP: 0,
      lifetimeXP: 0,
      redeemedXP: 0,
      monthlyXP: 0,
      transactions: [],
    }
  }

  return {
    availableXP: getAvailableProfXP(professionalId),
    lifetimeXP: getLifetimeProfXP(professionalId),
    redeemedXP: getTotalProfXPRedeemed(professionalId),
    monthlyXP: getMonthlyProfXP(professionalId),
    transactions: getProfXPTransactions(professionalId),
  }
}
