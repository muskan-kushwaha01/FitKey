// healthService.js
// Pure JS data layer — swap localStorage for Supabase/API with zero UI changes.

// ─── Keys ───────────────────────────────────────────────────────────────────
const KEYS = {
  steps: 'fk_steps',
  water: 'fk_water',
  sleep: 'fk_sleep',
  activities: 'fk_activities',
  goals: 'fk_goals',
  history: 'fk_history',
}

// ─── Generic helpers ─────────────────────────────────────────────────────────
export function generateId() {
  try { return crypto.randomUUID() } catch { return Date.now().toString() }
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function todayRecords(arr) {
  const t = today()
  return arr.filter((r) => r.date === t)
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? [] } catch { return [] }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Goals ───────────────────────────────────────────────────────────────────
const DEFAULT_GOALS = { steps: 8000, waterMl: 2500, sleepHours: 8, activeMinutes: 30 }

export function getGoals() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEYS.goals))
    return stored ? { ...DEFAULT_GOALS, ...stored } : { ...DEFAULT_GOALS }
  } catch {
    return { ...DEFAULT_GOALS }
  }
}

export function saveGoals(goals) {
  save(KEYS.goals, goals)
}

// ─── Steps ───────────────────────────────────────────────────────────────────
export function getSteps() {
  return load(KEYS.steps)
}

export function todaySteps() {
  const records = todayRecords(getSteps())
  const steps = records.reduce((sum, r) => sum + (r.steps || 0), 0)
  return { steps }
}

export function logSteps(steps) {
  const all = getSteps()
  const t = today()
  const idx = all.findIndex((r) => r.date === t)
  if (idx >= 0) {
    all[idx] = { ...all[idx], steps, timestamp: new Date().toISOString() }
  } else {
    all.push({ id: generateId(), date: t, steps, timestamp: new Date().toISOString() })
  }
  save(KEYS.steps, all)
}

// ─── Water ───────────────────────────────────────────────────────────────────
export function getWater() {
  return load(KEYS.water)
}

export function todayWaterLogs() {
  return todayRecords(getWater())
}

export function todayWaterTotal() {
  return todayWaterLogs().reduce((sum, r) => sum + (r.ml || 0), 0)
}

export function addWater(ml) {
  return adjustWater(ml)
}

export function adjustWater(deltaMl) {
  const currentTotal = todayWaterTotal()
  const newTotal = Math.max(0, currentTotal + deltaMl)
  return setWaterTotal(newTotal)
}

export function setWaterTotal(totalMl) {
  const all = getWater()
  const t = today()
  const safeTotal = Math.max(0, Math.round(totalMl))
  // Consolidate into a single record for today so it doesn't create multiple micro-logs
  const otherDays = all.filter((r) => r.date !== t)
  const record = { id: generateId(), date: t, ml: safeTotal, timestamp: new Date().toISOString() }
  otherDays.push(record)
  save(KEYS.water, otherDays)
  return record
}

export function removeWaterLog(id) {
  const all = getWater().filter((r) => r.id !== id)
  save(KEYS.water, all)
}

// ─── Sleep ───────────────────────────────────────────────────────────────────
export function getSleep() {
  return load(KEYS.sleep)
}

export function todaySleep() {
  return todayRecords(getSleep())[0] ?? null
}

export function logSleep(hoursOrBedtime, waketime) {
  const all = getSleep()
  const t = today()
  let durationHours = 0

  if (typeof hoursOrBedtime === 'number' || (typeof hoursOrBedtime === 'string' && !waketime)) {
    const parsed = parseFloat(hoursOrBedtime)
    durationHours = isNaN(parsed) ? 0 : Math.max(0, Math.min(24, Math.round(parsed * 10) / 10))
  } else if (hoursOrBedtime && waketime) {
    // Bedtime & wake-up calculation
    const [bH, bM] = hoursOrBedtime.split(':').map(Number)
    const [wH, wM] = waketime.split(':').map(Number)
    let durationMinutes = (wH * 60 + wM) - (bH * 60 + bM)
    if (durationMinutes <= 0) durationMinutes += 24 * 60 // next-day wake
    durationHours = Math.round((durationMinutes / 60) * 10) / 10
  }

  const record = {
    id: generateId(),
    date: t,
    durationHours,
    timestamp: new Date().toISOString(),
  }

  const idx = all.findIndex((r) => r.date === t)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...record }
  } else {
    all.push(record)
  }
  save(KEYS.sleep, all)
  return record
}

// ─── Activities ──────────────────────────────────────────────────────────────
export function getActivities() {
  return load(KEYS.activities)
}

export function todayActivities() {
  return todayRecords(getActivities())
}

export function logActivity(activity, durationMinutes) {
  const all = getActivities()
  const record = {
    id: generateId(),
    date: today(),
    activity,
    durationMinutes,
    timestamp: new Date().toISOString(),
  }
  all.push(record)
  save(KEYS.activities, all)
  return record
}

export function removeActivity(id) {
  const all = getActivities().filter((r) => r.id !== id)
  save(KEYS.activities, all)
}

// ─── Computed helpers ─────────────────────────────────────────────────────────
export function todayActiveMinutes() {
  return todayActivities().reduce((sum, r) => sum + (r.durationMinutes || 0), 0)
}

export function overallProgress() {
  const goals = getGoals()
  const pct = (val, goal) => Math.min(100, goal > 0 ? Math.round((val / goal) * 100) : 0)
  return Math.round(
    (pct(todaySteps().steps, goals.steps) +
      pct(todayWaterTotal(), goals.waterMl) +
      pct((todaySleep()?.durationHours ?? 0), goals.sleepHours) +
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

// ─── Weekly history ───────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function getWeeklyHistory() {
  const history = load(KEYS.history)
  const result = []
  const t = today()

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayName = DAY_NAMES[d.getDay()]

    if (dateStr === t) {
      // Live today data
      result.push({ day: dayName, date: dateStr, overallPct: overallProgress() })
    } else {
      const snap = history.find((h) => h.date === dateStr)
      result.push({ day: dayName, date: dateStr, overallPct: snap?.overallPct ?? 0 })
    }
  }
  return result
}

export function saveSnapshot() {
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

  const snapshot = { date: t, stepsTotal, waterMl, sleepHours, activeMinutes, overallPct }
  const history = load(KEYS.history).filter((h) => h.date !== t)
  history.push(snapshot)
  // keep only last 7 days
  const sorted = history.sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
  save(KEYS.history, sorted)
}

// ─── Health Aggregations & Streak for Rewards & Badges ─────────────────────────
export function getLifetimeHealthSummary() {
  const steps = getSteps()
  const water = getWater()
  const sleep = getSleep()
  const activities = getActivities()
  const goals = getGoals()

  const lifetimeSteps = steps.reduce((sum, r) => sum + (r.steps || 0), 0)
  const lifetimeWater = water.reduce((sum, r) => sum + (r.ml || 0), 0)
  const lifetimeActivitiesCount = activities.length
  const lifetimeActiveMinutes = activities.reduce((sum, r) => sum + (r.durationMinutes || 0), 0)

  // Group water by date to check days >= 2000ml
  const waterByDate = {}
  water.forEach((r) => {
    if (r.date) waterByDate[r.date] = (waterByDate[r.date] || 0) + (r.ml || 0)
  })
  const daysWithWaterAbove2L = Object.values(waterByDate).filter((ml) => ml >= 2000).length

  // Days with sleep >= 7h
  const daysWithSleepAbove7h = sleep.filter((r) => (r.durationHours || 0) >= 7).length
  const daysWithSleepCount = sleep.filter((r) => (r.durationHours || 0) > 0).length

  // Days with steps >= goal
  const daysWithStepsAboveGoal = steps.filter((r) => (r.steps || 0) >= goals.steps).length

  // Calculate streak of consecutive active days
  const activeDates = new Set([
    ...steps.filter((r) => (r.steps || 0) > 0).map((r) => r.date),
    ...water.filter((r) => (r.ml || 0) > 0).map((r) => r.date),
    ...sleep.filter((r) => (r.durationHours || 0) > 0).map((r) => r.date),
    ...activities.map((r) => r.date),
  ])

  let currentStreak = 0
  const cur = new Date()
  const todayStr = cur.toISOString().slice(0, 10)

  // If today is active, start counting from today.
  // Otherwise, if yesterday was active, streak is still alive from yesterday.
  let checkDate = new Date(cur)
  if (!activeDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10)
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

