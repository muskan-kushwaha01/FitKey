// storageService.js
// Reusable, robust storage layer for localStorage with fallback handling.
// Modular interface so it can later be easily replaced or hooked into Supabase.

export const STORAGE_KEYS = {
  STEPS: 'fk_steps',
  WATER: 'fk_water',
  SLEEP: 'fk_sleep',
  ACTIVITIES: 'fk_activities',
  GOALS: 'fk_goals',
  HISTORY: 'fk_history',
  XP_LEDGER: 'fk_xp_ledger',
  CHALLENGE_RECORDS: 'fk_challenge_records',
  BADGE_RECORDS: 'fk_badge_records',
  REDEMPTIONS: 'fk_redemptions',
  PROFESSIONALS: 'fk_professionals',
  CURRENT_PROFESSIONAL: 'fk_current_professional',
  PROF_DRAFT_ONBOARDING: 'fk_prof_draft_onboarding',
  PROF_CONTENT: 'fk_prof_content',
  CONTENT_INTERACTIONS: 'fk_content_interactions',
  PROF_XP_LEDGER: 'fk_prof_xp_ledger',
  PROF_REDEMPTIONS: 'fk_prof_redemptions',
  PROF_REVIEWS: 'fk_prof_reviews',
  COMMUNITY_USER: 'fk_community_user',
}

/**
 * Safely parse JSON from localStorage.
 */
export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === undefined) return defaultValue
    return JSON.parse(raw)
  } catch (error) {
    console.warn(`[storageService] Error reading key "${key}":`, error)
    return defaultValue
  }
}

/**
 * Safely stringify and write to localStorage.
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[storageService] Error writing key "${key}":`, error)
    return false
  }
}

/**
 * Remove an item from localStorage.
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn(`[storageService] Error removing key "${key}":`, error)
    return false
  }
}

/**
 * Atomically read, update with a function, and save.
 */
export function updateItem(key, updaterFn, defaultValue = null) {
  const current = getItem(key, defaultValue)
  const updated = updaterFn(current)
  setItem(key, updated)
  return updated
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
 * Format today's date in local YYYY-MM-DD.
 */
export function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
