// healthService.js
// User-scoped health tracking data layer with persistent Supabase outbox sync and offline resilience.

import { supabase } from '../lib/supabase'
import {
  STORAGE_KEYS,
  getItem,
  setItem,
  getStorageUserId,
  enqueueOutboxOp,
  hasPendingOutboxOp,
  getOutboxOps,
  generateId,
  getTodayDateString,
  getLocalDateString,
  emitSyncComplete,
  normalizeMetricSource,
  buildActivitySyncKey,
  parseActivitySyncKey,
} from './storageService.js'
import { flushSyncOutbox, scheduleOutboxFlush } from './syncService.js'

// ─── Date & Storage Helpers ───────────────────────────────────────────────────
export { generateId }

export function today() {
  return getTodayDateString()
}

export function todayRecords(arr) {
  const t = today()
  return arr.filter((r) => r.date === t)
}

function load(key, userId = undefined) {
  const data = getItem(key, [], userId)
  return Array.isArray(data) ? data : []
}

function save(key, value, userId = undefined) {
  setItem(key, value, userId)
}

// ─── Goals ────────────────────────────────────────────────────────────────────
const DEFAULT_GOALS = { steps: 8000, waterMl: 2500, sleepHours: 8, activeMinutes: 30 }

export function getGoals() {
  const stored = getItem(STORAGE_KEYS.GOALS, null)
  return stored && typeof stored === 'object' ? { ...DEFAULT_GOALS, ...stored } : { ...DEFAULT_GOALS }
}

export function hasPersistedGoals() {
  const meta = getItem(STORAGE_KEYS.GOALS_META, null)
  return Boolean(meta?.hasRemoteGoals || meta?.customizedAt)
}

export function saveGoals(goals, { skipRemote = false, markCustom = true } = {}) {
  const cleanGoals = {
    steps: Number(goals?.steps) || DEFAULT_GOALS.steps,
    waterMl: Number(goals?.waterMl) || DEFAULT_GOALS.waterMl,
    sleepHours: Number(goals?.sleepHours) || DEFAULT_GOALS.sleepHours,
    activeMinutes: Number(goals?.activeMinutes) || DEFAULT_GOALS.activeMinutes,
  }

  setItem(STORAGE_KEYS.GOALS, cleanGoals)

  if (markCustom) {
    const prevMeta = getItem(STORAGE_KEYS.GOALS_META, {}) || {}
    setItem(STORAGE_KEYS.GOALS_META, {
      ...prevMeta,
      customizedAt: new Date().toISOString(),
    })
  }

  const userId = getStorageUserId()
  if (!skipRemote && userId) {
    enqueueOutboxOp(userId, 'goals:daily', 'GOALS_UPSERT', cleanGoals)
    scheduleOutboxFlush(userId, 0)
  }
}

// ─── Steps ────────────────────────────────────────────────────────────────────
export function getSteps() {
  return load(STORAGE_KEYS.STEPS)
}

export function todaySteps() {
  const records = todayRecords(getSteps())
  const steps = records.reduce((sum, r) => sum + (Number(r.steps) || 0), 0)
  return { steps }
}

export function logSteps(steps, options = {}) {
  const all = getSteps()
  const t = today()
  const safeSteps = Math.max(0, Math.round(Number(steps) || 0))
  const timestamp = new Date().toISOString()
  const syncKey = `steps:${t}`

  const idx = all.findIndex((r) => r.date === t)
  const source = normalizeMetricSource(options?.source, 'manual')

  if (idx >= 0) {
    all[idx] = { ...all[idx], steps: safeSteps, source, syncKey, timestamp }
  } else {
    all.push({ id: generateId(), date: t, steps: safeSteps, source, syncKey, timestamp })
  }
  save(STORAGE_KEYS.STEPS, all)

  saveSnapshot({ skipOutbox: true })

  const userId = getStorageUserId()
  if (userId) {
    enqueueOutboxOp(userId, `metric:steps:${t}`, 'METRIC_UPSERT', {
      date: t,
      metric_type: 'steps',
      value: safeSteps,
      unit: 'steps',
      recorded_at: timestamp,
      source,
      sync_key: syncKey,
    })
    enqueueSummaryOp(userId, t)
    scheduleOutboxFlush(userId, 450)
  }
}

// ─── Water ────────────────────────────────────────────────────────────────────
export function getWater() {
  return load(STORAGE_KEYS.WATER)
}

export function todayWaterLogs() {
  return todayRecords(getWater())
}

export function todayWaterTotal() {
  return todayWaterLogs().reduce((sum, r) => sum + (Number(r.ml) || 0), 0)
}

export function addWater(ml) {
  return adjustWater(ml)
}

export function adjustWater(deltaMl) {
  const currentTotal = todayWaterTotal()
  const newTotal = Math.max(0, currentTotal + deltaMl)
  return setWaterTotal(newTotal)
}

export function setWaterTotal(totalMl, options = {}) {
  const all = getWater()
  const t = today()
  const safeTotal = Math.max(0, Math.round(Number(totalMl) || 0))
  const timestamp = new Date().toISOString()
  const syncKey = `water:${t}`

  const otherDays = all.filter((r) => r.date !== t)
  const existingToday = all.find((r) => r.date === t)
  const source = normalizeMetricSource(options?.source, 'manual')
  const record = {
    id: existingToday?.id || generateId(),
    date: t,
    ml: safeTotal,
    source,
    syncKey,
    timestamp,
  }
  otherDays.push(record)
  save(STORAGE_KEYS.WATER, otherDays)

  saveSnapshot({ skipOutbox: true })

  const userId = getStorageUserId()
  if (userId) {
    enqueueOutboxOp(userId, `metric:water:${t}`, 'METRIC_UPSERT', {
      date: t,
      metric_type: 'water',
      value: safeTotal,
      unit: 'ml',
      recorded_at: timestamp,
      source,
      sync_key: syncKey,
    })
    enqueueSummaryOp(userId, t)
    scheduleOutboxFlush(userId, 450)
  }

  return record
}

export function removeWaterLog(id) {
  const target = getWater().find((r) => r.id === id)
  if (!target) return
  if (target.date === today()) {
    setWaterTotal(0)
    return
  }
  const all = getWater().filter((r) => r.id !== id)
  save(STORAGE_KEYS.WATER, all)
  const userId = getStorageUserId()
  if (userId && target.syncKey) {
    enqueueOutboxOp(userId, `metric:water:${target.date}`, 'METRIC_UPSERT', {
      date: target.date,
      metric_type: 'water',
      value: 0,
      unit: 'ml',
      recorded_at: target.timestamp || new Date().toISOString(),
      source: normalizeMetricSource(target.source, 'manual'),
      sync_key: target.syncKey,
    })
    scheduleOutboxFlush(userId, 0)
  }
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
export function getSleep() {
  return load(STORAGE_KEYS.SLEEP)
}

export function todaySleep() {
  return todayRecords(getSleep())[0] ?? null
}

export function logSleep(hoursOrBedtime, waketime, options = {}) {
  const all = getSleep()
  const t = today()
  let durationHours = 0
  const wakeTimeStr = typeof waketime === 'string' ? waketime : undefined
  const resolvedOpts =
    waketime && typeof waketime === 'object' && !Array.isArray(waketime) ? waketime : options

  if (typeof hoursOrBedtime === 'number' || (typeof hoursOrBedtime === 'string' && !wakeTimeStr)) {
    const parsed = parseFloat(hoursOrBedtime)
    durationHours = isNaN(parsed) ? 0 : Math.max(0, Math.min(24, Math.round(parsed * 10) / 10))
  } else if (hoursOrBedtime && wakeTimeStr) {
    const [bH, bM] = hoursOrBedtime.split(':').map(Number)
    const [wH, wM] = wakeTimeStr.split(':').map(Number)
    let durationMinutes = (wH * 60 + wM) - (bH * 60 + bM)
    if (durationMinutes <= 0) durationMinutes += 24 * 60
    durationHours = Math.round((durationMinutes / 60) * 10) / 10
  }

  const timestamp = new Date().toISOString()
  const syncKey = `sleep:${t}`
  const existingToday = all.find((r) => r.date === t)
  const source = normalizeMetricSource(resolvedOpts?.source, 'manual')
  const record = {
    id: existingToday?.id || generateId(),
    date: t,
    durationHours,
    source,
    syncKey,
    timestamp,
  }

  const idx = all.findIndex((r) => r.date === t)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...record }
  } else {
    all.push(record)
  }
  save(STORAGE_KEYS.SLEEP, all)

  saveSnapshot({ skipOutbox: true })

  const userId = getStorageUserId()
  if (userId) {
    enqueueOutboxOp(userId, `metric:sleep:${t}`, 'METRIC_UPSERT', {
      date: t,
      metric_type: 'sleep',
      value: durationHours,
      unit: 'hours',
      recorded_at: timestamp,
      source,
      sync_key: syncKey,
    })
    enqueueSummaryOp(userId, t)
    scheduleOutboxFlush(userId, 450)
  }

  return record
}

// ─── Activities ───────────────────────────────────────────────────────────────
export function getActivities() {
  return load(STORAGE_KEYS.ACTIVITIES)
}

export function todayActivities() {
  return todayRecords(getActivities())
}

export function logActivity(activity, durationMinutes, options = {}) {
  const all = getActivities()
  const t = today()
  const id = generateId()
  const timestamp = new Date().toISOString()
  const cleanActivity = String(activity || 'Exercise').trim() || 'Exercise'
  const syncKey = buildActivitySyncKey(t, cleanActivity, id)
  const safeDuration = Math.max(1, Math.round(Number(durationMinutes) || 0))
  const source = normalizeMetricSource(options?.source, 'manual')

  const record = {
    id,
    date: t,
    activity: cleanActivity,
    durationMinutes: safeDuration,
    source,
    syncKey,
    timestamp,
  }
  all.push(record)
  save(STORAGE_KEYS.ACTIVITIES, all)

  saveSnapshot({ skipOutbox: true })

  const userId = getStorageUserId()
  if (userId) {
    enqueueOutboxOp(userId, `metric:${syncKey}`, 'METRIC_UPSERT', {
      date: t,
      metric_type: 'active_minutes',
      value: safeDuration,
      unit: 'minutes',
      recorded_at: timestamp,
      source,
      sync_key: syncKey,
    })
    enqueueSummaryOp(userId, t)
    scheduleOutboxFlush(userId, 0)
  }

  return record
}

export function removeActivity(id) {
  const all = getActivities()
  const target = all.find((r) => r.id === id)
  const remaining = all.filter((r) => r.id !== id)
  save(STORAGE_KEYS.ACTIVITIES, remaining)

  saveSnapshot({ skipOutbox: true })

  const userId = getStorageUserId()
  if (userId && target) {
    const syncKey = target.syncKey || `activity:${target.date}:${target.id}`
    enqueueOutboxOp(userId, `metric:${syncKey}`, 'METRIC_DELETE', {
      date: target.date,
      sync_key: syncKey,
    })
    enqueueSummaryOp(userId, today())
    scheduleOutboxFlush(userId, 0)
  }
}

// ─── Computed Helpers ─────────────────────────────────────────────────────────
export function todayActiveMinutes() {
  return todayActivities().reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0)
}

export function overallProgress() {
  const goals = getGoals()
  const pct = (val, goal) => Math.min(100, goal > 0 ? Math.round((val / goal) * 100) : 0)
  return Math.round(
    (pct(todaySteps().steps, goals.steps) +
      pct(todayWaterTotal(), goals.waterMl) +
      pct(todaySleep()?.durationHours ?? 0, goals.sleepHours) +
      pct(todayActiveMinutes(), goals.activeMinutes)) /
      4
  )
}

export function goalsMet() {
  const goals = getGoals()
  let count = 0
  if (todaySteps().steps >= goals.steps) count++
  if (todayWaterTotal() >= goals.waterMl) count++
  if ((todaySleep()?.durationHours ?? 0) >= goals.sleepHours) count++
  if (todayActiveMinutes() >= goals.activeMinutes) count++
  return count
}

// ─── Weekly History & Daily Summaries ─────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function getWeeklyHistory() {
  const history = load(STORAGE_KEYS.HISTORY)
  const result = []
  const t = today()

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = getLocalDateString(d)
    const dayName = DAY_NAMES[d.getDay()]

    if (dateStr === t) {
      result.push({ day: dayName, date: dateStr, overallPct: overallProgress() })
    } else {
      const snap = history.find((h) => h.date === dateStr)
      result.push({ day: dayName, date: dateStr, overallPct: snap?.overallPct ?? 0 })
    }
  }
  return result
}

function buildTodaySnapshot() {
  const t = today()
  const goals = getGoals()
  const pct = (val, goal) => Math.min(100, goal > 0 ? Math.round((val / goal) * 100) : 0)
  const stepsTotal = todaySteps().steps
  const waterMl = todayWaterTotal()
  const sleepHours = todaySleep()?.durationHours ?? 0
  const activeMinutes = todayActiveMinutes()
  const overallPct = Math.round(
    (pct(stepsTotal, goals.steps) +
      pct(waterMl, goals.waterMl) +
      pct(sleepHours, goals.sleepHours) +
      pct(activeMinutes, goals.activeMinutes)) /
      4
  )
  return { date: t, stepsTotal, waterMl, sleepHours, activeMinutes, overallPct }
}

function enqueueSummaryOp(userId, dateStr) {
  const snap = buildTodaySnapshot()
  enqueueOutboxOp(userId, `summary:${dateStr}`, 'SUMMARY_UPSERT', {
    date: dateStr,
    steps_total: snap.stepsTotal,
    water_ml: snap.waterMl,
    sleep_hours: snap.sleepHours,
    active_minutes: snap.activeMinutes,
    overall_pct: snap.overallPct,
  })
}

export function saveSnapshot({ skipOutbox = false } = {}) {
  const snap = buildTodaySnapshot()
  const history = load(STORAGE_KEYS.HISTORY).filter((h) => h.date !== snap.date)
  history.push(snap)
  const sorted = history.sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
  save(STORAGE_KEYS.HISTORY, sorted)

  const userId = getStorageUserId()
  if (!skipOutbox && userId) {
    enqueueSummaryOp(userId, snap.date)
    scheduleOutboxFlush(userId, 450)
  }
}

// ─── Lifetime Aggregations & Streak ───────────────────────────────────────────
export function getLifetimeHealthSummary() {
  const steps = getSteps()
  const water = getWater()
  const sleep = getSleep()
  const activities = getActivities()
  const goals = getGoals()

  const lifetimeSteps = steps.reduce((sum, r) => sum + (Number(r.steps) || 0), 0)
  const lifetimeWater = water.reduce((sum, r) => sum + (Number(r.ml) || 0), 0)
  const lifetimeActivitiesCount = activities.length
  const lifetimeActiveMinutes = activities.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0)

  const waterByDate = {}
  water.forEach((r) => {
    if (r.date) waterByDate[r.date] = (waterByDate[r.date] || 0) + (Number(r.ml) || 0)
  })
  const daysWithWaterAbove2L = Object.values(waterByDate).filter((ml) => ml >= 2000).length

  const daysWithSleepAbove7h = sleep.filter((r) => (Number(r.durationHours) || 0) >= 7).length
  const daysWithSleepCount = sleep.filter((r) => (Number(r.durationHours) || 0) > 0).length
  const daysWithStepsAboveGoal = steps.filter((r) => (Number(r.steps) || 0) >= goals.steps).length

  const activeDates = new Set([
    ...steps.filter((r) => (Number(r.steps) || 0) > 0).map((r) => r.date),
    ...water.filter((r) => (Number(r.ml) || 0) > 0).map((r) => r.date),
    ...sleep.filter((r) => (Number(r.durationHours) || 0) > 0).map((r) => r.date),
    ...activities.filter((r) => (Number(r.durationMinutes) || 0) > 0).map((r) => r.date),
  ])

  let currentStreak = 0
  const checkDate = new Date()
  const todayStr = getLocalDateString(checkDate)

  if (!activeDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (currentStreak <= 3650) {
    const dStr = getLocalDateString(checkDate)
    if (activeDates.has(dStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    lifetimeSteps,
    lifetimeWater,
    lifetimeActivitiesCount,
    lifetimeActiveMinutes,
    daysWithWaterAbove2L,
    daysWithSleepAbove7h,
    daysWithSleepCount,
    daysWithStepsAboveGoal,
    currentStreak,
    activeDatesCount: activeDates.size,
  }
}

export function getCurrentStreak() {
  return getLifetimeHealthSummary().currentStreak
}

// ─── Supabase Hydration (Outbox-Safe) ─────────────────────────────────────────
function resolveMetricDate(row) {
  if (row.sync_key && /^(steps|water|sleep|activity):(\d{4}-\d{2}-\d{2})/.test(row.sync_key)) {
    const match = row.sync_key.match(/^(?:steps|water|sleep|activity):(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  return getLocalDateString(row.recorded_at || new Date())
}

export async function syncHealthDataFromSupabase(userId) {
  if (!userId) return { success: false, reason: 'NO_USER' }

  try {
    // 1. Flush any unsynced local writes BEFORE hydrating from DB
    await flushSyncOutbox(userId)

    // 2. Fetch active goals
    const { data: goalsData, error: goalsErr } = await supabase
      .from('health_goals')
      .select('metric_type, target_value, is_active, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (goalsErr) {
      console.error('[healthService] Error fetching health_goals:', goalsErr)
    } else if (!hasPendingOutboxOp(userId, 'goals:daily')) {
      const activeGoals = (Array.isArray(goalsData) ? goalsData : []).filter(
        (g) => g.is_active !== false
      )
      if (activeGoals.length > 0) {
        const merged = { ...DEFAULT_GOALS }
        activeGoals.forEach((row) => {
          const val = Number(row.target_value)
          if (!val || isNaN(val)) return
          if (row.metric_type === 'steps') merged.steps = val
          if (row.metric_type === 'water') merged.waterMl = val
          if (row.metric_type === 'sleep') merged.sleepHours = val
          if (row.metric_type === 'active_minutes') merged.activeMinutes = val
        })
        setItem(STORAGE_KEYS.GOALS, merged, userId)
        const prevMeta = getItem(STORAGE_KEYS.GOALS_META, {}, userId) || {}
        setItem(STORAGE_KEYS.GOALS_META, { ...prevMeta, hasRemoteGoals: true }, userId)
      }
    }

    // 3. Fetch Daily Wellness Summaries (past 30 days)
    const { data: summaries, error: sumErr } = await supabase
      .from('daily_wellness_summaries')
      .select('date, steps_total, water_ml, sleep_hours, active_minutes, overall_pct')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)

    if (sumErr) {
      console.error('[healthService] Error fetching daily_wellness_summaries:', sumErr)
    } else {
      const remoteSummaries = (Array.isArray(summaries) ? summaries : []).map((s) => ({
        date: s.date,
        stepsTotal: Number(s.steps_total || 0),
        waterMl: Number(s.water_ml || 0),
        sleepHours: Number(s.sleep_hours || 0),
        activeMinutes: Number(s.active_minutes || 0),
        overallPct: Number(s.overall_pct || 0),
      }))

      const localHistory = load(STORAGE_KEYS.HISTORY, userId)
      const dateMap = new Map()
      remoteSummaries.forEach((item) => dateMap.set(item.date, item))
      // Preserve local history for dates that still have a failed/pending summary write
      localHistory.forEach((item) => {
        if (!dateMap.has(item.date) || hasPendingOutboxOp(userId, `summary:${item.date}`)) {
          dateMap.set(item.date, item)
        }
      })
      const mergedHistory = Array.from(dateMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
      save(STORAGE_KEYS.HISTORY, mergedHistory, userId)
    }

    // 4. Fetch Metrics from health_metrics (ordered chronologically so newer updates take precedence)
    const { data: metrics, error: metErr } = await supabase
      .from('health_metrics')
      .select('id, metric_type, value, unit, recorded_at, updated_at, source, sync_key')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true })
      .limit(2000)

    if (metErr) {
      console.error('[healthService] Error fetching health_metrics:', metErr)
    } else {
      const rows = Array.isArray(metrics) ? metrics : []
      const stepsByDate = new Map()
      const waterByDate = new Map()
      const sleepByDate = new Map()
      const remoteActivities = []

      for (const m of rows) {
        const d = resolveMetricDate(m)
        const val = Number(m.value || 0)
        const ts = m.updated_at || m.recorded_at || new Date().toISOString()

        if (m.metric_type === 'steps') {
          const prev = stepsByDate.get(d)
          // Prefer sync_key authoritative row or latest timestamp
          if (!prev || m.sync_key || !prev.hasSyncKey) {
            stepsByDate.set(d, {
              id: m.id,
              date: d,
              steps: val,
              syncKey: m.sync_key || `steps:${d}`,
              hasSyncKey: Boolean(m.sync_key),
              timestamp: ts,
            })
          }
        } else if (m.metric_type === 'water') {
          const prev = waterByDate.get(d)
          if (!prev || m.sync_key || !prev.hasSyncKey) {
            waterByDate.set(d, {
              id: m.id,
              date: d,
              ml: val,
              syncKey: m.sync_key || `water:${d}`,
              hasSyncKey: Boolean(m.sync_key),
              timestamp: ts,
            })
          }
        } else if (m.metric_type === 'sleep') {
          const prev = sleepByDate.get(d)
          if (!prev || m.sync_key || !prev.hasSyncKey) {
            sleepByDate.set(d, {
              id: m.id,
              date: d,
              durationHours: val,
              syncKey: m.sync_key || `sleep:${d}`,
              hasSyncKey: Boolean(m.sync_key),
              timestamp: ts,
            })
          }
        } else if (m.metric_type === 'exercise' || m.metric_type === 'active_minutes') {
          const { localId, activity } = parseActivitySyncKey(m.sync_key, m.id, m.source)
          remoteActivities.push({
            id: localId,
            date: d,
            activity,
            durationMinutes: val,
            source: normalizeMetricSource(m.source, 'manual'),
            syncKey: m.sync_key || `activity:${d}:${localId}`,
            timestamp: m.recorded_at || ts,
          })
        }
      }

      // Preserve pending outbox mutations instead of overwriting with stale DB values
      const pendingOps = getOutboxOps(userId)

      // Merge Steps
      const existingSteps = load(STORAGE_KEYS.STEPS, userId)
      const finalStepsMap = new Map()
      stepsByDate.forEach((rec, d) => {
        finalStepsMap.set(d, {
          id: rec.id,
          date: rec.date,
          steps: rec.steps,
          syncKey: rec.syncKey,
          timestamp: rec.timestamp,
        })
      })
      existingSteps.forEach((localRec) => {
        if (hasPendingOutboxOp(userId, `metric:steps:${localRec.date}`)) {
          finalStepsMap.set(localRec.date, localRec)
        }
      })
      save(STORAGE_KEYS.STEPS, Array.from(finalStepsMap.values()), userId)

      // Merge Water
      const existingWater = load(STORAGE_KEYS.WATER, userId)
      const finalWaterMap = new Map()
      waterByDate.forEach((rec, d) => {
        finalWaterMap.set(d, {
          id: rec.id,
          date: rec.date,
          ml: rec.ml,
          syncKey: rec.syncKey,
          timestamp: rec.timestamp,
        })
      })
      existingWater.forEach((localRec) => {
        if (hasPendingOutboxOp(userId, `metric:water:${localRec.date}`)) {
          finalWaterMap.set(localRec.date, localRec)
        }
      })
      save(STORAGE_KEYS.WATER, Array.from(finalWaterMap.values()), userId)

      // Merge Sleep
      const existingSleep = load(STORAGE_KEYS.SLEEP, userId)
      const finalSleepMap = new Map()
      sleepByDate.forEach((rec, d) => {
        finalSleepMap.set(d, {
          id: rec.id,
          date: rec.date,
          durationHours: rec.durationHours,
          syncKey: rec.syncKey,
          timestamp: rec.timestamp,
        })
      })
      existingSleep.forEach((localRec) => {
        if (hasPendingOutboxOp(userId, `metric:sleep:${localRec.date}`)) {
          finalSleepMap.set(localRec.date, localRec)
        }
      })
      save(STORAGE_KEYS.SLEEP, Array.from(finalSleepMap.values()), userId)

      // Merge Activities (respecting pending deletes and pending inserts)
      const pendingDeleteSyncKeys = new Set(
        pendingOps
          .filter((op) => op.kind === 'METRIC_DELETE' && op.payload?.sync_key)
          .map((op) => op.payload.sync_key)
      )
      const filteredRemoteActs = remoteActivities.filter(
        (a) => !pendingDeleteSyncKeys.has(a.syncKey)
      )
      const remoteSyncKeys = new Set(filteredRemoteActs.map((a) => a.syncKey))
      const existingActs = load(STORAGE_KEYS.ACTIVITIES, userId)
      const pendingLocalActs = existingActs.filter(
        (a) =>
          !remoteSyncKeys.has(a.syncKey || `activity:${a.date}:${a.id}`) &&
          hasPendingOutboxOp(userId, `metric:${a.syncKey || `activity:${a.date}:${a.id}`}`)
      )
      save(STORAGE_KEYS.ACTIVITIES, [...filteredRemoteActs, ...pendingLocalActs], userId)
    }

    emitSyncComplete()
    return { success: true }
  } catch (err) {
    console.error('[healthService] Error during Supabase health sync:', err)
    return { success: false, error: err }
  }
}
