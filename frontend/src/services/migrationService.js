// migrationService.js
// Safe, concurrency-locked, ownership-verified migration of legacy un-scoped localStorage data
// to Supabase. Guarantees zero duplicate inserts, preserves timestamps/units, uses trusted RPCs
// for XP/badges/rewards, and never deletes legacy localStorage records until full DB commit succeeds.

import { supabase } from '../lib/supabase'
import {
  getRawItem,
  setRawItem,
  removeRawItem,
  getKnownAuthUsers,
  getTodayDateString,
  getLocalDateString,
  getLocalDayBounds,
  buildActivitySyncKey,
} from './storageService'

const MIGRATION_LOCK_KEY = 'fk_migrated_for_user_'
const LEGACY_OWNER_KEY = 'fk_legacy_storage_owner'

const LEGACY_UNSCOPED_KEYS = [
  'fk_steps',
  'fk_water',
  'fk_sleep',
  'fk_activities',
  'fk_goals',
  'fk_history',
  'fk_xp_ledger',
  'fk_badge_records',
  'fk_redemptions',
  'fk_challenge_records',
]

const inFlightMigrations = new Map()

export function isMigrated(userId) {
  if (!userId) return false
  try {
    return Boolean(localStorage.getItem(`${MIGRATION_LOCK_KEY}${userId}`))
  } catch {
    return false
  }
}

function hasAnyLegacyData() {
  for (const key of LEGACY_UNSCOPED_KEYS) {
    const val = getRawItem(key, null)
    if (Array.isArray(val) && val.length > 0) return true
    if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) return true
  }
  return false
}

function findExistingMigratedOwner() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(MIGRATION_LOCK_KEY)) {
        return k.slice(MIGRATION_LOCK_KEY.length)
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Determine whether legacy un-scoped keys clearly belong to `userId`.
 * Returns { allowed: boolean, reason: string }
 */
function verifyLegacyOwnership(userId) {
  if (!hasAnyLegacyData()) {
    return { allowed: false, noLegacyData: true, reason: 'NO_LEGACY_DATA' }
  }

  let declaredOwner
  try {
    declaredOwner = localStorage.getItem(LEGACY_OWNER_KEY) || findExistingMigratedOwner()
  } catch {
    declaredOwner = null
  }

  if (declaredOwner) {
    if (declaredOwner === userId) {
      return { allowed: true, reason: 'OWNER_MATCHED' }
    }
    return { allowed: false, foreignOwner: declaredOwner, reason: 'OWNED_BY_OTHER_ACCOUNT' }
  }

  // If multiple distinct auth users have already signed in on this browser without a legacy owner
  // declaration, ownership of pre-existing un-scoped keys is ambiguous — do NOT mix accounts!
  const knownUsers = getKnownAuthUsers().filter((id) => id && id !== userId)
  if (knownUsers.length > 0) {
    return { allowed: false, ambiguous: true, reason: 'AMBIGUOUS_MULTI_ACCOUNT_BROWSER' }
  }

  // Sole/first authenticated user on a pre-isolation browser: bind ownership explicitly before writing
  try {
    localStorage.setItem(LEGACY_OWNER_KEY, userId)
  } catch {
    // Non-fatal
  }
  return { allowed: true, reason: 'FIRST_OWNER_BOUND' }
}

function normalizeRecordedAt(dateStr, rawTimestamp) {
  if (rawTimestamp && !isNaN(new Date(rawTimestamp).getTime())) {
    return new Date(rawTimestamp).toISOString()
  }
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number)
    // Local midday avoids UTC midnight date-shift across all timezones
    return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString()
  }
  return new Date().toISOString()
}

/**
 * Safely migrate legacy un-scoped localStorage tracking data to Supabase for `user`.
 * Concurrency-locked and idempotent via `sync_key`, `onConflict`, and trusted RPCs.
 */
export async function migrateLocalStorageToSupabase(user) {
  if (!user?.id) {
    return { success: false, reason: 'NO_USER' }
  }

  const userId = user.id

  if (isMigrated(userId)) {
    return { success: true, alreadyMigrated: true }
  }

  if (inFlightMigrations.has(userId)) {
    return inFlightMigrations.get(userId)
  }

  const promise = (async () => {
    const ownership = verifyLegacyOwnership(userId)
    if (!ownership.allowed) {
      if (ownership.noLegacyData || ownership.foreignOwner) {
        // Safe to mark this user as migrated so empty checks don't repeat endlessly
        try {
          localStorage.setItem(`${MIGRATION_LOCK_KEY}${userId}`, new Date().toISOString())
        } catch {
          // ignore
        }
        return { success: true, skipped: true, reason: ownership.reason }
      }
      // Ambiguous multi-account legacy data: preserve legacy records untouched without merging into wrong account
      console.warn('[migrationService] Skipping legacy migration due to ambiguous multi-account ownership.')
      return { success: true, skipped: true, reason: ownership.reason }
    }

    const errors = []
    const migratedDates = new Set()

    try {
      // Confirm session matches target user before writing
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || sessionData?.session?.user?.id !== userId) {
        return { success: false, reason: 'AUTH_MISMATCH' }
      }

      // 1. Migrate Goals -> health_goals via trusted upsert RPC
      const rawGoals = getRawItem('fk_goals', null)
      if (rawGoals && typeof rawGoals === 'object') {
        const { error: goalsErr } = await supabase.rpc('upsert_health_goals', {
          p_goals: {
            steps: Number(rawGoals.steps) > 0 ? Number(rawGoals.steps) : null,
            waterMl: Number(rawGoals.waterMl) > 0 ? Number(rawGoals.waterMl) : null,
            sleepHours: Number(rawGoals.sleepHours) > 0 ? Number(rawGoals.sleepHours) : null,
            activeMinutes: Number(rawGoals.activeMinutes) > 0 ? Number(rawGoals.activeMinutes) : null,
          },
        })
        if (goalsErr) {
          console.error('[migrationService] Error migrating health_goals:', goalsErr)
          errors.push(`goals: ${goalsErr.message}`)
        }
      }

      // 2. Migrate & Deduplicate Metrics (Steps, Water, Sleep, Activities) -> health_metrics
      //    Deduplicating per sync_key prevents ON CONFLICT self-collision in upsert batches.
      const metricsBySyncKey = new Map()

      const rawSteps = getRawItem('fk_steps', [])
      if (Array.isArray(rawSteps)) {
        for (const item of rawSteps) {
          if (!item || item.steps == null || Number(item.steps) < 0) continue
          const dateStr = item.date || getLocalDateString(item.timestamp || new Date())
          const syncKey = `steps:${dateStr}`
          migratedDates.add(dateStr)
          metricsBySyncKey.set(syncKey, {
            user_id: userId,
            metric_type: 'steps',
            value: Math.round(Number(item.steps)),
            unit: 'steps',
            recorded_at: normalizeRecordedAt(dateStr, item.timestamp),
            updated_at: new Date().toISOString(),
            source: 'imported',
            sync_key: syncKey,
          })
        }
      }

      const rawWater = getRawItem('fk_water', [])
      if (Array.isArray(rawWater)) {
        const waterTotals = new Map()
        for (const item of rawWater) {
          if (!item || item.ml == null || Number(item.ml) < 0) continue
          const dateStr = item.date || getLocalDateString(item.timestamp || new Date())
          const prev = waterTotals.get(dateStr)
          const nextMl = Math.round(Number(item.ml))
          waterTotals.set(dateStr, {
            ml: prev ? Math.max(prev.ml, nextMl) : nextMl,
            timestamp: item.timestamp || prev?.timestamp,
          })
        }
        for (const [dateStr, entry] of waterTotals.entries()) {
          const syncKey = `water:${dateStr}`
          migratedDates.add(dateStr)
          metricsBySyncKey.set(syncKey, {
            user_id: userId,
            metric_type: 'water',
            value: entry.ml,
            unit: 'ml',
            recorded_at: normalizeRecordedAt(dateStr, entry.timestamp),
            updated_at: new Date().toISOString(),
            source: 'imported',
            sync_key: syncKey,
          })
        }
      }

      const rawSleep = getRawItem('fk_sleep', [])
      if (Array.isArray(rawSleep)) {
        for (const item of rawSleep) {
          if (!item || item.durationHours == null || Number(item.durationHours) < 0) continue
          const dateStr = item.date || getLocalDateString(item.timestamp || new Date())
          const syncKey = `sleep:${dateStr}`
          migratedDates.add(dateStr)
          metricsBySyncKey.set(syncKey, {
            user_id: userId,
            metric_type: 'sleep',
            value: Math.min(24, Number(item.durationHours)),
            unit: 'hours',
            recorded_at: normalizeRecordedAt(dateStr, item.timestamp),
            updated_at: new Date().toISOString(),
            source: 'imported',
            sync_key: syncKey,
          })
        }
      }

      const rawActivities = getRawItem('fk_activities', [])
      if (Array.isArray(rawActivities)) {
        rawActivities.forEach((item, idx) => {
          if (!item || item.durationMinutes == null || Number(item.durationMinutes) <= 0) return
          const dateStr = item.date || getLocalDateString(item.timestamp || new Date())
          const activityName = String(item.activity || 'Exercise').trim() || 'Exercise'
          const stableId = item.id || `legacy-${idx}-${activityName.replace(/\W+/g, '')}`
          const syncKey = item.syncKey || buildActivitySyncKey(dateStr, activityName, stableId)
          migratedDates.add(dateStr)
          metricsBySyncKey.set(syncKey, {
            user_id: userId,
            metric_type: 'active_minutes',
            value: Math.round(Number(item.durationMinutes)),
            unit: 'minutes',
            recorded_at: normalizeRecordedAt(dateStr, item.timestamp),
            updated_at: new Date().toISOString(),
            source: 'imported',
            sync_key: syncKey,
          })
        })
      }

      const metricRows = Array.from(metricsBySyncKey.values())
      for (let i = 0; i < metricRows.length; i += 50) {
        const batch = metricRows.slice(i, i + 50)
        const { error: metricsErr } = await supabase
          .from('health_metrics')
          .upsert(batch, { onConflict: 'user_id,sync_key' })

        if (metricsErr) {
          console.error('[migrationService] Error upserting health_metrics batch:', metricsErr)
          errors.push(`health_metrics[${i}]: ${metricsErr.message}`)
        }
      }

      // 3. Migrate Daily Wellness History -> daily_wellness_summaries (deduplicated by date)
      const rawHistory = getRawItem('fk_history', [])
      if (Array.isArray(rawHistory) && rawHistory.length > 0) {
        const summaryMap = new Map()
        for (const h of rawHistory) {
          if (!h || !h.date) continue
          summaryMap.set(h.date, {
            user_id: userId,
            date: h.date,
            steps_total: Math.max(0, Math.round(Number(h.stepsTotal || 0))),
            water_ml: Math.max(0, Number(h.waterMl || 0)),
            sleep_hours: Math.max(0, Math.min(24, Number(h.sleepHours || 0))),
            active_minutes: Math.max(0, Math.round(Number(h.activeMinutes || 0))),
            overall_pct: Math.max(0, Math.min(100, Math.round(Number(h.overallPct || 0)))),
            updated_at: new Date().toISOString(),
          })
        }
        const summariesToUpsert = Array.from(summaryMap.values())
        if (summariesToUpsert.length > 0) {
          const { error: summariesErr } = await supabase
            .from('daily_wellness_summaries')
            .upsert(summariesToUpsert, { onConflict: 'user_id,date' })

          if (summariesErr) {
            console.error('[migrationService] Error migrating daily_wellness_summaries:', summariesErr)
            errors.push(`daily_wellness_summaries: ${summariesErr.message}`)
          }
        }
      }

      // 4. Reconcile XP, Challenges & Badges via trusted server-side RPCs ONLY
      //    (Only proceed if metrics/goals succeeded so server sees migrated data.)
      if (errors.length === 0) {
        const { error: bonusErr } = await supabase.rpc('claim_welcome_xp_bonus')
        if (bonusErr) {
          console.error('[migrationService] Error claiming welcome XP:', bonusErr)
          errors.push(`welcome_xp: ${bonusErr.message}`)
        }

        const dateWindows = Array.from(migratedDates)
          .sort()
          .slice(-90)
          .map((d) => {
            const bounds = getLocalDayBounds(d)
            return {
              date: d,
              start_ts: bounds.startIso,
              end_ts: bounds.endIso,
            }
          })

        if (dateWindows.length > 0) {
          const { error: chalErr } = await supabase.rpc('reconcile_historical_challenges', {
            p_windows: dateWindows,
          })
          if (chalErr) {
            console.error('[migrationService] Error reconciling challenges:', chalErr)
            errors.push(`challenges: ${chalErr.message}`)
          }
        }

        const { error: badgeErr } = await supabase.rpc('evaluate_and_unlock_badges', {
          p_today: getTodayDateString(),
        })
        if (badgeErr) {
          console.error('[migrationService] Error evaluating badges:', badgeErr)
          errors.push(`badges: ${badgeErr.message}`)
        }
      }

      // 5. Migrate valid historical reward redemptions through atomic server RPC
      if (errors.length === 0) {
        const rawRedemptions = getRawItem('fk_redemptions', [])
        if (Array.isArray(rawRedemptions) && rawRedemptions.length > 0) {
          const seenRewards = new Set()
          for (const r of rawRedemptions) {
            if (!r?.rewardId || seenRewards.has(r.rewardId)) continue
            seenRewards.add(r.rewardId)
            const { data: redData, error: redErr } = await supabase.rpc('redeem_reward', {
              p_reward_id: r.rewardId,
            })
            if (redErr) {
              console.error('[migrationService] Error migrating redemption:', redErr)
              errors.push(`redemption(${r.rewardId}): ${redErr.message}`)
            } else if (redData && !redData.success && redData.reason !== 'ALREADY_CLAIMED') {
              // Do not fail entire migration if legacy client XP didn't match server-verified metrics
              console.warn(`[migrationService] Legacy redemption "${r.rewardId}" not replayed:`, redData.reason)
            }
          }
        }
      }

      // 6. CRITICAL: Only lock & clear legacy un-scoped keys if ALL DB migrations succeeded!
      if (errors.length > 0) {
        console.error('[migrationService] Migration finished with errors; preserving legacy records for retry:', errors)
        return { success: false, partialFailure: true, errors }
      }

      // Seed scoped local cache with legacy copies before clearing raw keys so UI stays instant while hydration finishes
      for (const key of LEGACY_UNSCOPED_KEYS) {
        const legacyVal = getRawItem(key, undefined)
        if (legacyVal !== undefined && legacyVal !== null) {
          const scopedKey = `fk_u_${userId}_${key}`
          if (getRawItem(scopedKey, null) === null) {
            setRawItem(scopedKey, legacyVal)
          }
        }
      }

      // Confirmed committed to Supabase — set lock and remove un-scoped legacy keys
      try {
        localStorage.setItem(`${MIGRATION_LOCK_KEY}${userId}`, new Date().toISOString())
      } catch {
        // ignore
      }
      for (const key of LEGACY_UNSCOPED_KEYS) {
        removeRawItem(key)
      }

      return { success: true }
    } catch (error) {
      console.error('[migrationService] Fatal error during migration (preserving legacy data):', error)
      return { success: false, error }
    }
  })().finally(() => {
    inFlightMigrations.delete(userId)
  })

  inFlightMigrations.set(userId, promise)
  return promise
}
