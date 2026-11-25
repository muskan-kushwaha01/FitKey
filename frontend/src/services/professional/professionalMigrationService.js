// professionalMigrationService.js
// One-time, authenticated, idempotent migration of localStorage professional data to Supabase.
// Safe to run multiple times — all inserts use ON CONFLICT DO NOTHING server-side.
// Never migrates demo data (prof_demo_*, cu_*, post_demo_*).

import { supabase } from '../../lib/supabase.js'
import { migrateLocalStoragePosts } from './professionalContentService.js'

const MIGRATION_FLAG_PREFIX = 'fk_prof_migrated_v1_'

/**
 * Run the full localStorage → Supabase migration for the authenticated professional.
 * Returns { success, results, alreadyMigrated }.
 */
export async function runProfessionalMigration(professionalId) {
  if (!professionalId) return { success: false, error: 'No professional ID.' }

  // Check if already migrated in this browser
  const flagKey = MIGRATION_FLAG_PREFIX + professionalId
  const alreadyMigrated = localStorage.getItem(flagKey) === 'done'
  if (alreadyMigrated) {
    return { success: true, alreadyMigrated: true, results: null }
  }

  // ── Gather localStorage data ──────────────────────────────────────────────
  const xpTransactions = readLocalXPTransactions(professionalId)
  const redemptions = readLocalRedemptions(professionalId)
  const reviews = readLocalReviews()
  const posts = readLocalPosts(professionalId)

  // ── Call the server-side migration RPC ───────────────────────────────────
  const { data, error } = await supabase.rpc('migrate_prof_localstorage_data', {
    p_xp_transactions: xpTransactions,
    p_redemptions: redemptions,
    p_reviews: reviews,
  })

  if (error) {
    console.warn('[professionalMigrationService] RPC error:', error.message)
    return { success: false, error: error.message }
  }

  // ── Migrate posts via direct Supabase insert ──────────────────────────────
  const postsResult = await migrateLocalStoragePosts(posts)

  const results = {
    xpTransactions: data?.xp_transactions ?? { inserted: 0, skipped: 0, errors: 0 },
    redemptions: data?.redemptions ?? { inserted: 0, skipped: 0 },
    reviews: data?.reviews ?? { inserted: 0, skipped: 0 },
    posts: postsResult,
  }

  // ── Mark migration complete locally only if no errors occurred ──
  const hasErrors = (results.xpTransactions?.errors ?? 0) > 0
  if (!hasErrors) {
    try { localStorage.setItem(flagKey, 'done') } catch { /* ignore */ }
  }

  return { success: !hasErrors, alreadyMigrated: false, results }
}

// ─── localStorage readers ──────────────────────────────────────────────────────

function readLocalXPTransactions(professionalId) {
  try {
    const ledger = JSON.parse(localStorage.getItem('fk_prof_xp_ledger') || '[]')
    return Array.isArray(ledger)
      ? ledger.filter((tx) => tx?.professionalId === professionalId)
      : []
  } catch { return [] }
}

function readLocalRedemptions(professionalId) {
  try {
    const list = JSON.parse(localStorage.getItem('fk_prof_redemptions') || '[]')
    return Array.isArray(list)
      ? list.filter((r) => r?.professionalId === professionalId)
      : []
  } catch { return [] }
}

function readLocalReviews() {
  // Reviews written BY this user (reviewer_id matches Supabase UUID)
  try {
    return JSON.parse(localStorage.getItem('fk_prof_reviews') || '[]')
  } catch { return [] }
}

function readLocalPosts(professionalId) {
  try {
    const posts = JSON.parse(localStorage.getItem('fk_prof_content') || '[]')
    return Array.isArray(posts)
      ? posts.filter((p) => p?.authorId === professionalId)
      : []
  } catch { return [] }
}

/**
 * Check whether the migration has already run for this professional in this browser.
 */
export function isMigrationDone(professionalId) {
  if (!professionalId) return false
  return localStorage.getItem(MIGRATION_FLAG_PREFIX + professionalId) === 'done'
}

/**
 * Reset the migration flag (for debugging/testing only).
 */
export function resetMigrationFlag(professionalId) {
  if (!professionalId) return
  try { localStorage.removeItem(MIGRATION_FLAG_PREFIX + professionalId) } catch { /* ignore */ }
}
