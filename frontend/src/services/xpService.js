// services/xpService.js
// User-scoped XP transaction ledger, balance calculations, level progression,
// and server-backed synchronization.

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
  getStorageUserId,
  enqueueOutboxOp,
  getOutboxOps,
  getTodayDateString,
} from './storageService.js'
import {
  syncXPFromSupabase,
  syncRedemptionsFromSupabase,
  syncProgressWithServer,
  flushSyncOutbox,
  scheduleOutboxFlush,
} from './syncService.js'

const inFlightHistoryFetches = new Map()

export { syncXPFromSupabase }

/**
 * Get all ledger transactions for the active user.
 * When authenticated, authoritative transactions come from Supabase via syncXPFromSupabase
 * & claim_welcome_xp_bonus RPC (never unverified client inserts).
 */
export function getXPTransactions() {
  const userId = getStorageUserId()
  const ledger = getItem(STORAGE_KEYS.XP_LEDGER, null)

  if (!ledger) {
    // Only seed local starter bonus in unauthenticated standalone mode
    if (!userId) {
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
    return []
  }

  return Array.isArray(ledger) ? ledger : []
}

/**
 * Check if a reward/transaction with a given refId has already been awarded.
 */
export function hasAwarded(refId) {
  if (!refId) return false
  const transactions = getXPTransactions()
  return transactions.some((t) => t.refId === refId && t.type === 'EARN')
}

/**
 * Optimistically record an earned XP entry in local cache while waiting for
 * server-side RPC reconciliation (challenges / badges). Does NOT write directly to DB.
 */
export function awardXP({ amount, source, refId, description }) {
  if (!amount || amount <= 0) return { success: false, reason: 'INVALID_AMOUNT' }

  if (refId && hasAwarded(refId)) {
    const existing = getXPTransactions().find(
      (t) => t.refId === refId && t.type === 'EARN'
    )
    return { success: false, reason: 'ALREADY_AWARDED', transaction: existing }
  }

  const transactions = [...getXPTransactions()]
  const record = {
    id: generateId(),
    type: 'EARN',
    amount: Math.round(amount),
    source: source || 'GENERAL',
    refId: refId || generateId(),
    description: description || 'Earned XP',
    timestamp: new Date().toISOString(),
    optimistic: Boolean(getStorageUserId()),
  }

  transactions.push(record)
  setItem(STORAGE_KEYS.XP_LEDGER, transactions)
  return { success: true, transaction: record }
}

/**
 * Spend XP (for consultation fee discounts via trusted RPC; reward store uses redeemReward RPC).
 */
export function spendXP({ amount, refId, description, source = 'CONSULTATION' }) {
  const parsedAmount = Math.round(amount)
  if (!parsedAmount || parsedAmount <= 0) {
    return { success: false, reason: 'INVALID_AMOUNT' }
  }

  const available = getAvailableXP()
  if (available < parsedAmount) {
    return { success: false, reason: 'INSUFFICIENT_XP', available }
  }

  const finalRefId = refId || generateId()
  const transactions = [...getXPTransactions()]
  const record = {
    id: generateId(),
    type: 'SPEND',
    amount: parsedAmount,
    source,
    refId: finalRefId,
    description: description || 'Redeemed XP',
    timestamp: new Date().toISOString(),
  }

  transactions.push(record)
  setItem(STORAGE_KEYS.XP_LEDGER, transactions)

  const userId = getStorageUserId()
  if (userId && source === 'CONSULTATION') {
    enqueueOutboxOp(userId, `spend:consultation:${finalRefId}`, 'CONSULTATION_XP_SPEND', {
      p_amount: parsedAmount,
      p_ref_id: finalRefId,
      p_description: record.description,
    })
    scheduleOutboxFlush(userId, 0)
  }

  return { success: true, transaction: record }
}

/**
 * Calculate total available spendable XP.
 */
export function getAvailableXP() {
  const transactions = getXPTransactions()
  let balance = 0
  for (const t of transactions) {
    if (t.type === 'EARN') balance += Number(t.amount) || 0
    else if (t.type === 'SPEND') balance -= Number(t.amount) || 0
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
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
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
    currentMin: currentTier.min,
    currentMax: currentTier.max,
    xpInTier: progressInTier,
    xpToNext,
    progressPercent,
    segmentFilledCount,
  }
}

function parseTimestampMs(ts) {
  if (!ts) return 0
  const parsed = Date.parse(ts)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Derive normalized category and linked domain metadata (challenge date, badge,
 * reward voucher, or consultation booking reference) for an XP ledger row.
 */
export function getXPTransactionMeta(tx, redemptionMap = new Map()) {
  const type = String(tx?.type || 'EARN').toUpperCase() === 'SPEND' ? 'SPEND' : 'EARN'
  const source = String(tx?.source || '').toUpperCase()
  const refId = tx?.refId ?? tx?.ref_id ?? null

  if (type === 'EARN') {
    if (source === 'INIT') {
      return {
        category: 'WELCOME',
        categoryLabel: 'Welcome Bonus',
        activityDate: null,
        challengeId: null,
        badgeId: null,
        rewardId: null,
        rewardTitle: null,
        voucherCode: null,
        redemptionStatus: null,
        redeemedAt: null,
        bookingReference: null,
      }
    }

    if (source === 'CHALLENGE') {
      const match = typeof refId === 'string'
        ? refId.match(/^challenge-(.+)-(\d{4}-\d{2}-\d{2})$/)
        : null
      return {
        category: 'CHALLENGE',
        categoryLabel: 'Daily Challenge',
        activityDate: match ? match[2] : null,
        challengeId: match ? match[1] : null,
        badgeId: null,
        rewardId: null,
        rewardTitle: null,
        voucherCode: null,
        redemptionStatus: null,
        redeemedAt: null,
        bookingReference: null,
      }
    }

    if (source === 'BONUS') {
      const match = typeof refId === 'string'
        ? refId.match(/^bonus-all-daily-(\d{4}-\d{2}-\d{2})$/)
        : null
      return {
        category: 'BONUS',
        categoryLabel: 'Daily Bonus',
        activityDate: match ? match[1] : null,
        challengeId: null,
        badgeId: null,
        rewardId: null,
        rewardTitle: null,
        voucherCode: null,
        redemptionStatus: null,
        redeemedAt: null,
        bookingReference: null,
      }
    }

    if (source === 'BADGE') {
      const badgeId = typeof refId === 'string' && refId.startsWith('badge-')
        ? refId.slice('badge-'.length)
        : null
      return {
        category: 'BADGE',
        categoryLabel: 'Badge Unlock',
        activityDate: null,
        challengeId: null,
        badgeId,
        rewardId: null,
        rewardTitle: null,
        voucherCode: null,
        redemptionStatus: null,
        redeemedAt: null,
        bookingReference: null,
      }
    }

    return {
      category: 'EARN_OTHER',
      categoryLabel: 'XP Reward',
      activityDate: null,
      challengeId: null,
      badgeId: null,
      rewardId: null,
      rewardTitle: null,
      voucherCode: null,
      redemptionStatus: null,
      redeemedAt: null,
      bookingReference: null,
    }
  }

  if (source === 'REWARD') {
    const inferredRewardId = tx?.rewardId ?? tx?.reward_id ?? (
      typeof refId === 'string' && refId.startsWith('redeem-')
        ? refId.slice('redeem-'.length)
        : null
    )
    const matched = inferredRewardId ? redemptionMap.get(inferredRewardId) : null

    return {
      category: 'REWARD',
      categoryLabel: 'Reward Redeem',
      activityDate: null,
      challengeId: null,
      badgeId: null,
      rewardId: inferredRewardId || matched?.rewardId || null,
      rewardTitle: tx?.rewardTitle ?? tx?.reward_title ?? matched?.title ?? null,
      voucherCode: tx?.voucherCode ?? tx?.voucher_code ?? matched?.voucherCode ?? null,
      redemptionStatus: tx?.redemptionStatus ?? tx?.redemption_status ?? matched?.status ?? null,
      redeemedAt: tx?.redeemedAt ?? tx?.redeemed_at ?? matched?.redeemedAt ?? null,
      bookingReference: null,
    }
  }

  if (source === 'CONSULTATION') {
    return {
      category: 'CONSULTATION',
      categoryLabel: 'Consultation Discount',
      activityDate: null,
      challengeId: null,
      badgeId: null,
      rewardId: null,
      rewardTitle: null,
      voucherCode: null,
      redemptionStatus: null,
      redeemedAt: null,
      bookingReference: refId || null,
    }
  }

  return {
    category: 'SPEND_OTHER',
    categoryLabel: 'XP Used',
    activityDate: null,
    challengeId: null,
    badgeId: null,
    rewardId: null,
    rewardTitle: null,
    voucherCode: null,
    redemptionStatus: null,
    redeemedAt: null,
    bookingReference: null,
  }
}

/**
 * Normalize transactions and redemptions into a consistent chronological ledger
 * with running balances and newest-first display ordering.
 */
export function buildXPHistoryData(
  transactions = [],
  redemptions = [],
  pendingRefIds = []
) {
  const redemptionMap = new Map()
  if (Array.isArray(redemptions)) {
    for (const r of redemptions) {
      const rewardId = r?.rewardId ?? r?.reward_id
      if (rewardId) {
        redemptionMap.set(rewardId, {
          id: r.id,
          rewardId,
          title: r.title,
          points: Number(r.points ?? r.xp_cost) || 0,
          status: r.status || 'active',
          voucherCode: r.voucherCode ?? r.voucher_code ?? null,
          redeemedAt: r.redeemedAt ?? r.created_at ?? null,
        })
      }
    }
  }

  const pendingSet = new Set(Array.isArray(pendingRefIds) ? pendingRefIds : pendingRefIds || [])
  const seenIds = new Set()
  const normalized = []

  for (const raw of Array.isArray(transactions) ? transactions : []) {
    if (!raw) continue
    const id = raw.id || `tx-${normalized.length}`
    if (seenIds.has(id)) continue
    seenIds.add(id)

    const type = String(raw.type || 'EARN').toUpperCase() === 'SPEND' ? 'SPEND' : 'EARN'
    const amount = Math.max(0, Number(raw.amount) || 0)
    const refId = raw.refId ?? raw.ref_id ?? null
    const timestamp = raw.timestamp ?? raw.created_at ?? null
    const meta = getXPTransactionMeta(raw, redemptionMap)
    const pendingSync = Boolean(raw.pendingSync || (refId && pendingSet.has(refId)))

    normalized.push({
      id,
      type,
      amount,
      source: String(raw.source || (type === 'EARN' ? 'GENERAL' : 'SPEND')).toUpperCase(),
      refId,
      description: raw.description || meta.categoryLabel,
      timestamp,
      pendingSync,
      optimistic: Boolean(raw.optimistic || pendingSync),
      ...meta,
    })
  }

  // Sort oldest-first with deterministic tie-breaking (EARN before SPEND at identical timestamps)
  normalized.sort((a, b) => {
    const tDiff = parseTimestampMs(a.timestamp) - parseTimestampMs(b.timestamp)
    if (tDiff !== 0) return tDiff
    if (a.type !== b.type) return a.type === 'EARN' ? -1 : 1
    return String(a.id).localeCompare(String(b.id))
  })

  let lifetimeEarned = 0
  let totalSpent = 0
  let earnedCount = 0
  let spentCount = 0

  const chronological = normalized.map((entry) => {
    if (entry.type === 'EARN') {
      lifetimeEarned += entry.amount
      earnedCount += 1
    } else {
      totalSpent += entry.amount
      spentCount += 1
    }

    const balanceAfter = Math.max(0, lifetimeEarned - totalSpent)
    return {
      ...entry,
      balanceAfter,
    }
  })

  return {
    summary: {
      availableXP: Math.max(0, lifetimeEarned - totalSpent),
      lifetimeEarned,
      totalSpent,
      earnedCount,
      spentCount,
      totalCount: chronological.length,
    },
    entries: [...chronological].reverse(),
  }
}

/**
 * Synchronously read the current user's cached XP history snapshot.
 */
export function getLocalXPHistory() {
  const userId = getStorageUserId()
  const transactions = getXPTransactions()
  const redemptions = getItem(STORAGE_KEYS.REDEMPTIONS, [], userId)
  const pendingOps = userId ? getOutboxOps(userId) : []
  const pendingRefIds = pendingOps
    .filter((op) => op.kind === 'CONSULTATION_XP_SPEND' && op.payload?.p_ref_id)
    .map((op) => op.payload.p_ref_id)

  return buildXPHistoryData(transactions, redemptions, pendingRefIds)
}

/**
 * Fetch authoritative XP & rewards redemption history from Supabase
 * (`xp_transactions` + `reward_redemptions`), reconciling pending outbox writes
 * and deduplicating concurrent in-flight requests per user.
 */
export async function fetchXPHistory(userId, options = {}) {
  const { reconcile = true } = options

  if (!userId) {
    return {
      success: true,
      source: 'local',
      data: getLocalXPHistory(),
    }
  }

    if (inFlightHistoryFetches.has(userId)) {
      return inFlightHistoryFetches.get(userId)
    }

    const run = (async () => {
      try {
        await flushSyncOutbox(userId)

        if (reconcile) {
          await syncProgressWithServer(userId, [getTodayDateString()])
        }

        const [xpRes, redRes] = await Promise.all([
          syncXPFromSupabase(userId),
          syncRedemptionsFromSupabase(userId),
        ])

              if (!xpRes.success || !redRes.success) {
                const failedErr = !xpRes.success ? xpRes.error : redRes.error
                return {
                  success: false,
                  source: 'cache',
                  error: failedErr?.message || 'Unable to sync XP history from server.',
                  data: getLocalXPHistory(),
                }
              }

              const pendingOps = getOutboxOps(userId)
              const pendingSpendRefs = new Set(
                pendingOps
                  .filter((op) => op.kind === 'CONSULTATION_XP_SPEND' && op.payload?.p_ref_id)
                  .map((op) => op.payload.p_ref_id)
              )

              const transactions = getItem(STORAGE_KEYS.XP_LEDGER, [], userId) || []
              const redemptions = getItem(STORAGE_KEYS.REDEMPTIONS, [], userId) || []

              return {
                success: true,
                source: 'tables',
                data: buildXPHistoryData(transactions, redemptions, pendingSpendRefs),
              }
            } catch (err) {
              return {
                success: false,
                source: 'cache',
                error: err?.message || 'Unexpected error while loading XP history.',
                data: getLocalXPHistory(),
              }
            } finally {
              inFlightHistoryFetches.delete(userId)
            }
          }) ()

        inFlightHistoryFetches.set(userId, run)
        return run
      }
