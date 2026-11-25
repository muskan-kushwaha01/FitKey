// syncService.js
// Centralized outbox synchronization, retry scheduling, server-side progress reconciliation,
// and Supabase cache hydration with strict user scoping and error handling.

import { supabase } from '../lib/supabase'
import {
  STORAGE_KEYS,
  getItem,
  setItem,
  getOutboxOps,
  removeOutboxOp,
  markOutboxOpFailed,
  hasPendingOutboxOp,
  getTodayDateString,
  getLocalDayBounds,
  emitSyncComplete,
  normalizeMetricSource,
  normalizeMetricType,
} from './storageService.js'

const inFlightFlushes = new Map()
const debounceTimers = new Map()

function isRetryableError(err) {
  if (!err) return true
  const code = String(err.code || '')
  const msg = String(err.message || '').toLowerCase()
  // PostgreSQL data integrity / validation errors won't succeed on blind retry
  if (
    code === '23514' || // check_violation
    code === '22P02' || // invalid_text_representation
    code === '42883' || // undefined_function
    msg.includes('not authenticated')
  ) {
    return false
  }
  return true
}

/**
 * Cancel all pending debounced flush timers (e.g. during sign-out / account switch).
 */
export function cancelScheduledFlushes() {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
}

/**
 * Hydrate XP ledger from Supabase `xp_transactions`.
 * Preserves local optimistic transactions only while corresponding outbox operations are pending.
 */
export async function syncXPFromSupabase(userId) {
  if (!userId) return { success: false, reason: 'NO_USER' }

  try {
    const { data: rows, error } = await supabase
      .from('xp_transactions')
      .select('id, type, amount, source, ref_id, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      console.error('[syncService] Failed to fetch xp_transactions:', error)
      return { success: false, error }
    }

    const mapped = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      source: r.source,
      refId: r.ref_id,
      description: r.description,
      timestamp: r.created_at,
    }))

    // Keep pending consultation XP spends in optimistic view until outbox finishes flushing
    const pendingOps = getOutboxOps(userId)
    const pendingSpendRefs = new Set(
      pendingOps
        .filter((op) => op.kind === 'CONSULTATION_XP_SPEND' && op.payload?.p_ref_id)
        .map((op) => op.payload.p_ref_id)
    )

    if (pendingSpendRefs.size > 0) {
      const localLedger = getItem(STORAGE_KEYS.XP_LEDGER, [], userId) || []
      const dbRefIds = new Set(mapped.map((m) => m.refId).filter(Boolean))
      for (const tx of localLedger) {
        if (tx.refId && pendingSpendRefs.has(tx.refId) && !dbRefIds.has(tx.refId)) {
          mapped.push(tx)
        }
      }
    }

    setItem(STORAGE_KEYS.XP_LEDGER, mapped, userId)
    emitSyncComplete()
    return { success: true, count: mapped.length }
  } catch (err) {
    console.error('[syncService] Exception syncing XP from Supabase:', err)
    return { success: false, error: err }
  }
}

/**
 * Hydrate unlocked badges from Supabase `user_badges`.
 */
export async function syncBadgesFromSupabase(userId) {
  if (!userId) return { success: false, reason: 'NO_USER' }

  try {
    const { data: rows, error } = await supabase
      .from('user_badges')
      .select('badge_id, unlocked_at')
      .eq('user_id', userId)

    if (error) {
      console.error('[syncService] Failed to fetch user_badges:', error)
      return { success: false, error }
    }

    const records = {}
    if (Array.isArray(rows)) {
      rows.forEach((r) => {
        records[r.badge_id] = {
          unlocked: true,
          unlockedAt: r.unlocked_at,
        }
      })
    }

    setItem(STORAGE_KEYS.BADGE_RECORDS, records, userId)
    emitSyncComplete()
    return { success: true, count: Object.keys(records).length }
  } catch (err) {
    console.error('[syncService] Exception syncing badges from Supabase:', err)
    return { success: false, error: err }
  }
}

/**
 * Hydrate reward redemptions from Supabase `reward_redemptions`.
 */
export async function syncRedemptionsFromSupabase(userId) {
  if (!userId) return { success: false, reason: 'NO_USER' }

  try {
    const { data: rows, error } = await supabase
      .from('reward_redemptions')
      .select('id, reward_id, title, xp_cost, status, voucher_code, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[syncService] Failed to fetch reward_redemptions:', error)
      return { success: false, error }
    }

    const mapped = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      rewardId: r.reward_id,
      title: r.title,
      points: Number(r.xp_cost),
      status: r.status || 'active',
      voucherCode: r.voucher_code || null,
      redeemedAt: r.created_at,
    }))

    setItem(STORAGE_KEYS.REDEMPTIONS, mapped, userId)
    emitSyncComplete()
    return { success: true, count: mapped.length }
  } catch (err) {
    console.error('[syncService] Exception syncing redemptions from Supabase:', err)
    return { success: false, error: err }
  }
}

/**
 * Claim the server-verified +250 starter XP bonus (idempotent per user).
 */
export async function claimWelcomeBonusFromServer(userId) {
  if (!userId) return { success: false, reason: 'NO_USER' }
  try {
    const { data, error } = await supabase.rpc('claim_welcome_xp_bonus')
    if (error) {
      console.error('[syncService] claim_welcome_xp_bonus RPC failed:', error)
      return { success: false, error }
    }
    return { success: true, data }
  } catch (err) {
    console.error('[syncService] claim_welcome_xp_bonus exception:', err)
    return { success: false, error: err }
  }
}

/**
 * Ask the database to verify & claim daily challenges and badges against persisted DB metrics.
 */
export async function syncProgressWithServer(userId, dates = [getTodayDateString()]) {
  if (!userId) return { success: false, reason: 'NO_USER' }

  try {
    const uniqueDates = Array.from(new Set((dates || []).filter(Boolean)))
    if (uniqueDates.length === 0) uniqueDates.push(getTodayDateString())

    for (const dateStr of uniqueDates) {
      const { startIso, endIso } = getLocalDayBounds(dateStr)
      const { error: chErr } = await supabase.rpc('evaluate_and_claim_daily_challenges', {
        p_date: dateStr,
        p_day_start: startIso,
        p_day_end: endIso,
      })
      if (chErr) {
        console.error('[syncService] evaluate_and_claim_daily_challenges failed:', chErr)
      }
    }

    const { error: badgeErr } = await supabase.rpc('evaluate_and_unlock_badges', {
      p_today: getTodayDateString(),
    })
    if (badgeErr) {
      console.error('[syncService] evaluate_and_unlock_badges failed:', badgeErr)
    }

    await Promise.allSettled([
      syncXPFromSupabase(userId),
      syncBadgesFromSupabase(userId),
      syncRedemptionsFromSupabase(userId),
    ])

    return { success: true }
  } catch (err) {
    console.error('[syncService] syncProgressWithServer exception:', err)
    return { success: false, error: err }
  }
}

/**
 * Flush all queued local writes in `fk_u_<userId>_sync_outbox` to Supabase.
 * Deduplicated via an in-flight lock per userId.
 */
export async function flushSyncOutbox(userId) {
  if (!userId) return { success: false, reason: 'NO_USER', flushed: 0, failed: 0 }

  if (inFlightFlushes.has(userId)) {
    return inFlightFlushes.get(userId)
  }

  const run = (async () => {
    const ops = getOutboxOps(userId)
    if (ops.length === 0) {
      return { success: true, flushed: 0, failed: 0 }
    }

    // Verify auth session still belongs to this userId before flushing
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    const currentUid = sessionData?.session?.user?.id
    if (sessionErr || currentUid !== userId) {
      return { success: false, reason: 'AUTH_MISMATCH', flushed: 0, failed: ops.length }
    }

    // Process goals before metrics, metrics before summaries/XP spend
    const priority = {
      GOALS_UPSERT: 1,
      METRIC_UPSERT: 2,
      METRIC_DELETE: 2,
      SUMMARY_UPSERT: 3,
      CONSULTATION_XP_SPEND: 4,
    }
    const ordered = [...ops].sort((a, b) => (priority[a.kind] || 9) - (priority[b.kind] || 9))

    let flushed = 0
    let failed = 0
    let rejected = 0
    const modifiedDates = new Set()

    for (const op of ordered) {
      try {
        if (op.kind === 'GOALS_UPSERT') {
          const { error } = await supabase.rpc('upsert_health_goals', {
            p_goals: op.payload,
          })
          if (error) throw error
          removeOutboxOp(userId, op.opKey)
          flushed++
          modifiedDates.add(getTodayDateString())
        } else if (op.kind === 'METRIC_UPSERT') {
          const fallbackSource =
            typeof op.opKey === 'string' && op.opKey.startsWith('migration:')
              ? 'imported'
              : 'manual'
          const row = {
            user_id: userId,
            metric_type: normalizeMetricType(op.payload.metric_type),
            value: op.payload.value,
            unit: op.payload.unit,
            recorded_at: op.payload.recorded_at,
            source: normalizeMetricSource(op.payload.source, fallbackSource),
            sync_key: op.payload.sync_key,
            updated_at: new Date().toISOString(),
          }
          const { error } = await supabase
            .from('health_metrics')
            .upsert(row, { onConflict: 'user_id,sync_key' })
          if (error) throw error
          removeOutboxOp(userId, op.opKey)
          flushed++
          if (op.payload.date) modifiedDates.add(op.payload.date)
        } else if (op.kind === 'METRIC_DELETE') {
          const { error } = await supabase
            .from('health_metrics')
            .delete()
            .eq('user_id', userId)
            .eq('sync_key', op.payload.sync_key)
          if (error) throw error
          removeOutboxOp(userId, op.opKey)
          flushed++
          if (op.payload.date) modifiedDates.add(op.payload.date)
        } else if (op.kind === 'SUMMARY_UPSERT') {
          const row = {
            user_id: userId,
            date: op.payload.date,
            steps_total: op.payload.steps_total,
            water_ml: op.payload.water_ml,
            sleep_hours: op.payload.sleep_hours,
            active_minutes: op.payload.active_minutes,
            overall_pct: op.payload.overall_pct,
            updated_at: new Date().toISOString(),
          }
          const { error } = await supabase
            .from('daily_wellness_summaries')
            .upsert(row, { onConflict: 'user_id,date' })
          if (error) throw error
          removeOutboxOp(userId, op.opKey)
          flushed++
        } else if (op.kind === 'CONSULTATION_XP_SPEND') {
          const { data, error } = await supabase.rpc('spend_consultation_xp_discount', op.payload)
          if (error) throw error
          if (data && data.success === false) {
            console.warn('[syncService] Consultation XP spend rejected by server:', data)
            removeOutboxOp(userId, op.opKey)
            rejected++
          } else {
            removeOutboxOp(userId, op.opKey)
            flushed++
          }
        }
      } catch (err) {
        console.error(`[syncService] Outbox op "${op.opKey}" (${op.kind}) failed:`, err)
        if (!isRetryableError(err) && (op.attempts || 0) >= 2) {
          removeOutboxOp(userId, op.opKey)
          if (op.kind === 'CONSULTATION_XP_SPEND') rejected++
        } else {
          markOutboxOpFailed(userId, op.opKey, err?.message || String(err))
        }
        failed++
      }
    }

    if (modifiedDates.size > 0) {
      await syncProgressWithServer(userId, Array.from(modifiedDates))
    } else if (flushed > 0 || rejected > 0) {
      await syncXPFromSupabase(userId)
    }

    return { success: failed === 0, flushed, failed }
  })().finally(() => {
    inFlightFlushes.delete(userId)
  })

  inFlightFlushes.set(userId, run)
  return run
}

/**
 * Debounce outbox flush per user so high-frequency controls (e.g. water slider)
 * coalesce cleanly into a single database upsert.
 */
export function scheduleOutboxFlush(userId, delayMs = 450) {
  if (!userId) return
  if (debounceTimers.has(userId)) {
    clearTimeout(debounceTimers.get(userId))
  }
  if (delayMs <= 0) {
    debounceTimers.delete(userId)
    flushSyncOutbox(userId)
    return
  }
  const timer = setTimeout(() => {
    debounceTimers.delete(userId)
    flushSyncOutbox(userId)
  }, delayMs)
  debounceTimers.set(userId, timer)
}

export { hasPendingOutboxOp }
