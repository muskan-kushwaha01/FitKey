// storageService.js
// User-isolated localStorage cache with legacy raw helpers, persistent sync outbox,
// and consistent local calendar date utilities.

export const STORAGE_KEYS = {
  STEPS: 'fk_steps',
  WATER: 'fk_water',
  SLEEP: 'fk_sleep',
  ACTIVITIES: 'fk_activities',
  GOALS: 'fk_goals',
  GOALS_META: 'fk_goals_meta',
  HISTORY: 'fk_history',
  XP_LEDGER: 'fk_xp_ledger',
  CHALLENGE_RECORDS: 'fk_challenge_records',
  BADGE_RECORDS: 'fk_badge_records',
  REDEMPTIONS: 'fk_redemptions',
  SYNC_OUTBOX: 'fk_sync_outbox',
  PROFESSIONALS: 'fk_professionals',
  CURRENT_PROFESSIONAL: 'fk_current_professional',
  PROF_DRAFT_ONBOARDING: 'fk_prof_draft_onboarding',
  PROF_CONTENT: 'fk_prof_content',
  CONTENT_INTERACTIONS: 'fk_content_interactions',
  PROF_XP_LEDGER: 'fk_prof_xp_ledger',
  PROF_REDEMPTIONS: 'fk_prof_redemptions',
  PROF_REVIEWS: 'fk_prof_reviews',
  COMMUNITY_USER: 'fk_community_user',
  PROF_CONSULTATION_SETTINGS: 'fk_prof_consultation_settings',
  PROF_APPOINTMENTS: 'fk_prof_appointments',
  USER_CONSULTATION_PAYMENTS: 'fk_user_consultation_payments',
  USER_HEALTH_PROFILE: 'fk_user_health_profile',
  USER_PROFILE_CACHE: 'fk_user_profile',
}

// Keys that contain personal/patient-specific data and MUST be strictly isolated per auth user ID.
export const USER_SCOPED_KEYS = new Set([
  STORAGE_KEYS.STEPS,
  STORAGE_KEYS.WATER,
  STORAGE_KEYS.SLEEP,
  STORAGE_KEYS.ACTIVITIES,
  STORAGE_KEYS.GOALS,
  STORAGE_KEYS.GOALS_META,
  STORAGE_KEYS.HISTORY,
  STORAGE_KEYS.XP_LEDGER,
  STORAGE_KEYS.CHALLENGE_RECORDS,
  STORAGE_KEYS.BADGE_RECORDS,
  STORAGE_KEYS.REDEMPTIONS,
  STORAGE_KEYS.SYNC_OUTBOX,
  'fk_user_consultation_payments',
  'fk_user_health_profile',
  'fk_user_profile',
])

const ACTIVE_USER_SESSION_KEY = 'fk_active_auth_user_id'
const KNOWN_USERS_KEY = 'fk_known_auth_users'

let activeUserIdMemory = null
try {
  if (typeof sessionStorage !== 'undefined') {
    activeUserIdMemory = sessionStorage.getItem(ACTIVE_USER_SESSION_KEY) || null
  }
} catch {
  activeUserIdMemory = null
}

/**
 * Set the currently authenticated user ID so all user-scoped reads/writes stay isolated.
 */
export function setStorageUser(userId) {
  const normalized = userId || null
  activeUserIdMemory = normalized
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (normalized) {
        sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, normalized)
      } else {
        sessionStorage.removeItem(ACTIVE_USER_SESSION_KEY)
      }
    }
    if (normalized && typeof localStorage !== 'undefined') {
      const knownRaw = localStorage.getItem(KNOWN_USERS_KEY)
      const known = knownRaw ? JSON.parse(knownRaw) : []
      if (Array.isArray(known) && !known.includes(normalized)) {
        known.push(normalized)
        localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(known))
      }
    }
  } catch (err) {
    console.warn('[storageService] Error updating active storage user:', err)
  }
}

export function getStorageUserId() {
  return activeUserIdMemory
}

export function getKnownAuthUsers() {
  try {
    const raw = localStorage.getItem(KNOWN_USERS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getScopedKey(key, explicitUserId = undefined) {
  if (!USER_SCOPED_KEYS.has(key)) {
    return key
  }
  const uid = explicitUserId !== undefined ? explicitUserId : activeUserIdMemory
  return uid ? `fk_u_${uid}_${key}` : `fk_anon_${key}`
}

/**
 * Safely parse JSON from localStorage (automatically user-scoped for personal keys).
 */
export function getItem(key, defaultValue = null, explicitUserId = undefined) {
  const storageKey = getScopedKey(key, explicitUserId)
  return getRawItem(storageKey, defaultValue)
}

/**
 * Safely stringify and write to localStorage (automatically user-scoped for personal keys).
 */
export function setItem(key, value, explicitUserId = undefined) {
  const storageKey = getScopedKey(key, explicitUserId)
  return setRawItem(storageKey, value)
}

/**
 * Remove an item from localStorage (automatically user-scoped for personal keys).
 */
export function removeItem(key, explicitUserId = undefined) {
  const storageKey = getScopedKey(key, explicitUserId)
  return removeRawItem(storageKey)
}

/**
 * Direct unscoped localStorage accessors (for legacy migration & global metadata only).
 */
export function getRawItem(rawKey, defaultValue = null) {
  try {
    const raw = localStorage.getItem(rawKey)
    if (raw === null || raw === undefined) return defaultValue
    return JSON.parse(raw)
  } catch (error) {
    console.warn(`[storageService] Error reading key "${rawKey}":`, error)
    return defaultValue
  }
}

export function setRawItem(rawKey, value) {
  try {
    localStorage.setItem(rawKey, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[storageService] Error writing key "${rawKey}":`, error)
    return false
  }
}

export function removeRawItem(rawKey) {
  try {
    localStorage.removeItem(rawKey)
    return true
  } catch (error) {
    console.warn(`[storageService] Error removing key "${rawKey}":`, error)
    return false
  }
}

/**
 * Atomically read, update with a function, and save.
 */
export function updateItem(key, updaterFn, defaultValue = null, explicitUserId = undefined) {
  const current = getItem(key, defaultValue, explicitUserId)
  const updated = updaterFn(current)
  setItem(key, updated, explicitUserId)
  return updated
}

/**
 * Clear cached personal data for a user on sign-out.
 * If unsynced outbox items remain for that user, keep only that user's scoped cache
 * (isolated behind their user ID so no other account can read or migrate it) and clear
 * anonymous session buffers.
 */
export function clearUserScopedCache(userId, { preserveIfPendingOutbox = true } = {}) {
  try {
    // Always clear anonymous buffer
    USER_SCOPED_KEYS.forEach((k) => {
      removeRawItem(`fk_anon_${k}`)
    })

    if (!userId) return

    const pendingOutbox = getOutboxOps(userId)
    if (preserveIfPendingOutbox && pendingOutbox.length > 0) {
      return
    }

    USER_SCOPED_KEYS.forEach((k) => {
      removeRawItem(`fk_u_${userId}_${k}`)
    })
  } catch (err) {
    console.warn('[storageService] Error clearing user scoped cache:', err)
  }
}

// ─── Persistent Per-User Sync Outbox ──────────────────────────────────────────

export function getOutboxOps(userId) {
  if (!userId) return []
  const list = getItem(STORAGE_KEYS.SYNC_OUTBOX, [], userId)
  return Array.isArray(list) ? list : []
}

export function enqueueOutboxOp(userId, opKey, kind, payload) {
  if (!userId || !opKey) return []
  const ops = getOutboxOps(userId)
  const nowIso = new Date().toISOString()
  const idx = ops.findIndex((op) => op.opKey === opKey)
  if (idx >= 0) {
    ops[idx] = {
      ...ops[idx],
      kind,
      payload,
      updatedAt: nowIso,
      attempts: 0,
      lastError: null,
    }
  } else {
    ops.push({
      opKey,
      kind,
      payload,
      userId,
      createdAt: nowIso,
      updatedAt: nowIso,
      attempts: 0,
      lastError: null,
    })
  }
  setItem(STORAGE_KEYS.SYNC_OUTBOX, ops, userId)
  return ops
}

export function removeOutboxOp(userId, opKey) {
  if (!userId || !opKey) return
  const ops = getOutboxOps(userId).filter((op) => op.opKey !== opKey)
  setItem(STORAGE_KEYS.SYNC_OUTBOX, ops, userId)
}

export function markOutboxOpFailed(userId, opKey, errorMessage) {
  if (!userId || !opKey) return
  const ops = getOutboxOps(userId).map((op) =>
    op.opKey === opKey
      ? {
          ...op,
          attempts: (op.attempts || 0) + 1,
          lastError: errorMessage || 'Sync failed',
          updatedAt: new Date().toISOString(),
        }
      : op
  )
  setItem(STORAGE_KEYS.SYNC_OUTBOX, ops, userId)
}

export function hasPendingOutboxOp(userId, opKeyOrPrefix, { prefix = false } = {}) {
  if (!userId) return false
  const ops = getOutboxOps(userId)
  if (prefix) {
    return ops.some((op) => op.opKey && op.opKey.startsWith(opKeyOrPrefix))
  }
  return ops.some((op) => op.opKey === opKeyOrPrefix)
}

/**
 * Generate a unique ID (UUID or timestamp fallback).
 */
export function generateId() {
  try {
    return crypto.randomUUID()
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }
}

/**
 * Format a Date object or ISO string into local YYYY-MM-DD.
 */
export function getLocalDateString(dateInput = new Date()) {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(d.getTime())) {
    return getTodayDateString()
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format today's date in local YYYY-MM-DD.
 */
export function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Compute exact UTC ISO start/end boundaries for a local calendar YYYY-MM-DD date.
 */
export function getLocalDayBounds(dateStr) {
  const clean = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') ? dateStr : getTodayDateString()
  const [y, m, d] = clean.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  return {
    date: clean,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

export const VALID_METRIC_SOURCES = new Set(['manual', 'device', 'imported'])
export const VALID_METRIC_TYPES = new Set([
  'steps',
  'water',
  'sleep',
  'active_minutes',
  'weight',
  'heart_rate',
])

/**
 * Normalize application/legacy metric types to the permitted `health_metrics.metric_type` values:
 * `'steps' | 'water' | 'sleep' | 'active_minutes' | 'weight' | 'heart_rate'`.
 */
export function normalizeMetricType(rawMetricType, fallback = 'active_minutes') {
  const safeFallback = VALID_METRIC_TYPES.has(fallback) ? fallback : 'active_minutes'
  if (typeof rawMetricType !== 'string') return safeFallback

  const norm = rawMetricType.trim().toLowerCase()
  if (!norm) return safeFallback

  if (VALID_METRIC_TYPES.has(norm)) {
    return norm
  }

  if (
    norm === 'exercise' ||
    norm === 'workout' ||
    norm === 'activity' ||
    norm === 'activeminutes' ||
    norm === 'active_minutes' ||
    norm === 'active minutes'
  ) {
    return 'active_minutes'
  }

  if (norm === 'heartrate' || norm === 'heart_rate' || norm === 'heart rate') {
    return 'heart_rate'
  }

  return safeFallback
}

/**
 * Normalize application/legacy metric sources to the permitted `health_metrics.source` values:
 * `'manual' | 'device' | 'imported'`.
 */
export function normalizeMetricSource(rawSource, fallback = 'manual') {
  const safeFallback = VALID_METRIC_SOURCES.has(fallback) ? fallback : 'manual'
  if (typeof rawSource !== 'string') return safeFallback

  const norm = rawSource.trim().toLowerCase()
  if (!norm) return safeFallback

  if (VALID_METRIC_SOURCES.has(norm)) {
    return norm
  }

  if (
    norm === 'migration' ||
    norm === 'migrated' ||
    norm === 'import' ||
    norm.includes('import') ||
    norm.includes('migrat')
  ) {
    return 'imported'
  }

  if (
    norm === 'wearable' ||
    norm.includes('device') ||
    norm.includes('watch') ||
    norm.includes('fitbit') ||
    norm.includes('garmin') ||
    norm.includes('apple_health') ||
    norm.includes('apple health') ||
    norm.includes('google_fit') ||
    norm.includes('google fit') ||
    norm.includes('healthkit') ||
    norm.includes('health_connect') ||
    norm.includes('pedometer') ||
    norm.includes('sensor')
  ) {
    return 'device'
  }

  if (
    norm === 'fitkey_manual' ||
    norm === 'fitkey_water_log' ||
    norm === 'fitkey_sleep_log' ||
    norm.includes('manual') ||
    norm.includes('log')
  ) {
    return 'manual'
  }

  return safeFallback
}

export function buildActivitySyncKey(dateStr, activityName, id) {
  const cleanLabel = String(activityName || 'Exercise').trim() || 'Exercise'
  return `activity:${dateStr}:${encodeURIComponent(cleanLabel)}:${id}`
}

export function parseActivitySyncKey(syncKey, fallbackId, rawSource) {
  const safeId = fallbackId
  const sourceIsDbEnum =
    typeof rawSource === 'string' && VALID_METRIC_SOURCES.has(rawSource.trim().toLowerCase())

  if (typeof syncKey === 'string' && syncKey.startsWith('activity:')) {
    const parts = syncKey.split(':')
    if (parts.length >= 4) {
      let decodedActivity
      try {
        decodedActivity = decodeURIComponent(parts[2]) || 'Exercise'
      } catch {
        decodedActivity = parts[2] || 'Exercise'
      }
      return {
        localId: parts.slice(3).join(':') || safeId,
        activity: decodedActivity,
      }
    }
    if (parts.length === 3) {
      return {
        localId: parts[2] || safeId,
        activity: rawSource && !sourceIsDbEnum ? rawSource : 'Exercise',
      }
    }
  }

  return {
    localId: safeId,
    activity: rawSource && !sourceIsDbEnum ? rawSource : 'Exercise',
  }
}

export function emitSyncComplete() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('fitkey-sync-complete'))
  }
}
