import { supabase } from '../../lib/supabase.js'

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  pushNotifications: false,
  emailNotifications: false,
  wellnessReminders: false,
  communityUpdates: false,
})

export async function fetchNotificationPreferences(userId) {
  if (!userId) throw new Error('Sign in to load settings.')
  const { data, error } = await supabase.from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message || 'Could not load notification preferences.')
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(data?.notification_preferences || {}) }
}

export async function saveNotificationPreference(userId, key, value) {
  if (!userId || !(key in DEFAULT_NOTIFICATION_PREFERENCES)) {
    return { success: false, error: 'Invalid notification preference.' }
  }
  const current = await fetchNotificationPreferences(userId)
  const next = { ...current, [key]: Boolean(value) }
  const { error } = await supabase.from('profiles')
    .upsert({ id: userId, notification_preferences: next, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return { success: false, error: error.message || 'Could not save notification preference.' }
  return { success: true, preferences: next }
}
