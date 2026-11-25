// professionalAuthService.js
// Supabase-backed authentication management for FitKey Professional Portal.
// Uses the authenticated Supabase user (auth.uid()) as the sole source of identity.

import { supabase } from '../../lib/supabase.js'
import {
  getItem,
  setItem,
  removeItem,
  getRawItem,
  STORAGE_KEYS,
  setStorageUser,
  clearUserScopedCache,
} from '../storageService.js'

const PROF_MIGRATION_LOCK_PREFIX = 'fk_prof_migrated_'
const inFlightProfAuthHydrations = new Map()

function isUnknownColumnError(err) {
  const msg = String(err?.message || '')
  return err?.code === 'PGRST204' || err?.code === '42703' || /column .* does not exist|Could not find the '.*' column/i.test(msg)
}

function extractMissingColumn(err) {
  const msg = String(err?.message || '')
  const pgMatch = msg.match(/column "([^"]+)" of relation/i) || msg.match(/column '([^']+)'/i)
  if (pgMatch) return pgMatch[1]
  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i)
  return pgrstMatch ? pgrstMatch[1] : null
}

async function runSchemaResilientMutation(payload, mutateFn) {
  const cleanPayload = { ...payload }
  const skippedColumns = []
  let lastError = null

  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await mutateFn(cleanPayload)
    if (!res?.error) {
      return { data: res?.data ?? null, error: null, skippedColumns }
    }
    lastError = res.error
    if (!isUnknownColumnError(res.error)) {
      return { data: null, error: res.error, skippedColumns }
    }
    const missing = extractMissingColumn(res.error)
    if (!missing || !(missing in cleanPayload)) {
      return { data: null, error: res.error, skippedColumns }
    }
    skippedColumns.push(missing)
    delete cleanPayload[missing]
  }

  return { data: null, error: lastError, skippedColumns }
}

/**
 * Normalize combined Supabase `profiles` + `professional_profiles` + `auth.user`
 * into the shape expected by Professional Portal UI components.
 */
export function normalizeProfessionalRecord(authUser, profileRow = null, profRow = null) {
  if (!authUser?.id) return null

  const fullName =
    profileRow?.full_name ||
    authUser.user_metadata?.full_name ||
    authUser.email?.split('@')[0] ||
    'Healthcare Professional'

  const photoUrl = profileRow?.avatar_url || ''
  const experienceVal = profRow?.experience_years ?? ''

  return {
    id: authUser.id,
    userId: authUser.id,
    name: fullName,
    fullName,
    email: profileRow?.email || authUser.email || '',
    phone: profileRow?.phone || '',
    photoUrl,
    avatarUrl: photoUrl,
    bio: profRow?.bio || '',
    profession: profRow?.profession || '',
    specialization: profRow?.specialization || '',
    qualifications: profRow?.qualification || '',
    yearsExperience: experienceVal === null ? '' : experienceVal,
    experienceYears: experienceVal === null ? '' : experienceVal,
    licenseNumber: profRow?.registration_number || '',
    registrationNumber: profRow?.registration_number || '',
    workplaceName: profRow?.workplace_name || '',
    workplaceAddress: profRow?.workplace_address || '',
    city: profRow?.city || '',
    state: profRow?.state || '',
    clinicPhotoUrl: profRow?.clinic_photo_url || '',
    documents: Array.isArray(profRow?.documents) ? profRow.documents : [],
    onboardingCompleted: Boolean(profRow?.onboarding_completed),
    verificationStatus: profRow?.verification_status || 'Pending Verification',
    consultationFee: profRow?.consultation_fee ?? 500,
    createdAt: profRow?.created_at || profileRow?.created_at || authUser.created_at || null,
    updatedAt: profRow?.updated_at || profileRow?.updated_at || null,
    hasProfessionalRow: Boolean(profRow),
  }
}

/**
 * Retrieve cached professionals list (legacy discovery compatibility).
 */
export function getProfessionals() {
  const professionals = getItem(STORAGE_KEYS.PROFESSIONALS, [])
  return Array.isArray(professionals) ? professionals : []
}

/**
 * Persist list of professionals to cache.
 */
export function saveProfessionals(list) {
  return setItem(STORAGE_KEYS.PROFESSIONALS, Array.isArray(list) ? list : [])
}

/**
 * Synchronous cache accessor for currently cached professional snapshot.
 * Authoritative identity always comes from Supabase Auth (`fetchCurrentProfessional`).
 */
export function getCurrentProfessional() {
  const cached = getItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, null)
  if (!cached?.id || cached.id === 'prof_demo_001') return null
  return cached
}

/**
 * Authoritative async fetcher for the authenticated Supabase professional.
 */
export async function fetchCurrentProfessional(providedAuthUser = null) {
  let authUser = providedAuthUser
  if (!authUser?.id) {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user?.id) {
      removeItem(STORAGE_KEYS.CURRENT_PROFESSIONAL)
      return null
    }
    authUser = data.user
  }

  const userId = authUser.id
  setStorageUser(userId)

  const [profRes, ppRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('professional_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (ppRes.error) {
    console.error('[professionalAuthService] professional profile fetch failed:', ppRes.error)
    const cached = getCurrentProfessional()
    return cached?.id === userId ? cached : null
  }

  const normalized = normalizeProfessionalRecord(authUser, profRes.data || null, ppRes.data || null)
  if (normalized) {
    setItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, normalized)
  }
  return normalized
}

/**
 * Safely migrate ownership-verified legacy professional localStorage data to Supabase.
 * Never migrates `prof_demo_001` and never overwrites newer Supabase records.
 */
export async function migrateLegacyProfessionalData(authUser) {
  if (!authUser?.id) return { success: false, skipped: true, reason: 'NO_USER' }
  const userId = authUser.id

  if (inFlightProfAuthHydrations.has(userId)) {
    return inFlightProfAuthHydrations.get(userId)
  }

  const task = (async () => {
    try {
      try {
        if (localStorage.getItem(`${PROF_MIGRATION_LOCK_PREFIX}${userId}`)) {
          return { success: true, skipped: true, reason: 'ALREADY_MIGRATED' }
        }
      } catch {
        // ignore storage access error
      }

      const authEmail = String(authUser.email || '').trim().toLowerCase()
      const legacyList = getRawItem(STORAGE_KEYS.PROFESSIONALS, [])
      const legacyCurrent = getRawItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, null)

      const candidates = [
        ...(Array.isArray(legacyList) ? legacyList : []),
        ...(legacyCurrent && typeof legacyCurrent === 'object' ? [legacyCurrent] : []),
      ].filter((p) => p && p.id && p.id !== 'prof_demo_001')

      const ownedLegacy = candidates.find((p) => {
        const pEmail = String(p.email || '').trim().toLowerCase()
        return p.id === userId || (authEmail && pEmail && pEmail === authEmail)
      })

      if (!ownedLegacy) {
        try {
          localStorage.setItem(`${PROF_MIGRATION_LOCK_PREFIX}${userId}`, new Date().toISOString())
        } catch {
          // ignore
        }
        return { success: true, skipped: true, reason: 'NO_OWNED_LEGACY_DATA' }
      }

      const [profRes, ppRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('professional_profiles').select('*').eq('user_id', userId).maybeSingle(),
      ])

      if (profRes.error || ppRes.error) {
        return { success: false, error: (profRes.error || ppRes.error).message }
      }

      const existingProf = profRes.data || null
      const existingPp = ppRes.data || null

      const serverTime = existingPp?.updated_at ? Date.parse(existingPp.updated_at) : 0
      const localTime = ownedLegacy.updatedAt ? Date.parse(ownedLegacy.updatedAt) : 0
      const localIsStrictlyOlder = Number.isFinite(localTime) && localTime > 0 && serverTime > 0 && localTime < serverTime

      if (!localIsStrictlyOlder) {
        const profilePatch = {}
        if (!existingProf?.full_name && (ownedLegacy.fullName || ownedLegacy.name)) {
          profilePatch.full_name = String(ownedLegacy.fullName || ownedLegacy.name).trim()
        }
        if (!existingProf?.phone && ownedLegacy.phone) {
          profilePatch.phone = String(ownedLegacy.phone).trim()
        }
        if (!existingProf?.avatar_url && ownedLegacy.photoUrl) {
          profilePatch.avatar_url = ownedLegacy.photoUrl
        }
        if (Object.keys(profilePatch).length > 0 || !existingProf) {
          await runSchemaResilientMutation(
            { id: userId, ...profilePatch, updated_at: new Date().toISOString() },
            (clean) => supabase.from('profiles').upsert(clean, { onConflict: 'id' })
          )
        }

        const ppPatch = {}
        if (!existingPp?.profession && ownedLegacy.profession) ppPatch.profession = ownedLegacy.profession
        if (!existingPp?.specialization && ownedLegacy.specialization) ppPatch.specialization = ownedLegacy.specialization
        if (!existingPp?.qualification && ownedLegacy.qualifications) ppPatch.qualification = ownedLegacy.qualifications
        if (existingPp?.experience_years == null && ownedLegacy.yearsExperience !== '' && ownedLegacy.yearsExperience != null) {
          const yrs = Number(ownedLegacy.yearsExperience)
          if (!Number.isNaN(yrs) && yrs >= 0) ppPatch.experience_years = Math.round(yrs)
        }
        if (!existingPp?.registration_number && ownedLegacy.licenseNumber) ppPatch.registration_number = ownedLegacy.licenseNumber
        if (!existingPp?.bio && ownedLegacy.bio) ppPatch.bio = ownedLegacy.bio
        if (!existingPp?.workplace_name && ownedLegacy.workplaceName) ppPatch.workplace_name = ownedLegacy.workplaceName
        if (!existingPp?.workplace_address && ownedLegacy.workplaceAddress) ppPatch.workplace_address = ownedLegacy.workplaceAddress
        if (!existingPp?.city && ownedLegacy.city) ppPatch.city = ownedLegacy.city
        if (!existingPp?.state && ownedLegacy.state) ppPatch.state = ownedLegacy.state
        if (!existingPp?.onboarding_completed && ownedLegacy.onboardingCompleted) ppPatch.onboarding_completed = true

        if (Object.keys(ppPatch).length > 0 || !existingPp) {
          await runSchemaResilientMutation(
            {
              user_id: userId,
              ...ppPatch,
              updated_at: new Date().toISOString(),
            },
            (clean) => supabase.from('professional_profiles').upsert(clean, { onConflict: 'user_id' })
          )
        }
      }

      try {
        localStorage.setItem(`${PROF_MIGRATION_LOCK_PREFIX}${userId}`, new Date().toISOString())
      } catch {
        // ignore
      }
      return { success: true, migrated: true }
    } catch (err) {
      return { success: false, error: err?.message || 'Legacy professional migration failed' }
    }
  })().finally(() => {
    inFlightProfAuthHydrations.delete(userId)
  })

  inFlightProfAuthHydrations.set(userId, task)
  return task
}

/**
 * Register a new professional account via Supabase Auth.
 */
export async function registerProfessional({ name, email, password, confirmPassword }) {
  const cleanName = (name || '').trim()
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPass = (password || '').trim()
  const cleanConfirm = (confirmPassword || '').trim()

  if (!cleanName) {
    return { success: false, error: 'Please enter your full name.' }
  }
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' }
  }
  if (cleanPass !== cleanConfirm) {
    return { success: false, error: 'Passwords do not match.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPass,
    options: {
      data: {
        full_name: cleanName,
        portal_role: 'professional',
      },
    },
  })

  if (error) {
    return { success: false, error: error.message || 'Registration failed.' }
  }

  const user = data?.user
  if (!user?.id) {
    return { success: false, error: 'Unable to create professional account.' }
  }

  // If session is active immediately, initialize profile & professional_profiles rows
  if (data.session) {
    setStorageUser(user.id)
    await runSchemaResilientMutation(
      {
        id: user.id,
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      },
      (clean) => supabase.from('profiles').upsert(clean, { onConflict: 'id' })
    )
    await runSchemaResilientMutation(
      {
        user_id: user.id,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      },
      (clean) => supabase.from('professional_profiles').upsert(clean, { onConflict: 'user_id' })
    )
    const prof = await fetchCurrentProfessional(user)
    return {
      success: true,
      professional: prof,
      requiresEmailConfirmation: false,
      message: 'Registration successful! Please complete your onboarding.',
    }
  }

  return {
    success: true,
    professional: normalizeProfessionalRecord(user, { full_name: cleanName }, { onboarding_completed: false }),
    requiresEmailConfirmation: true,
    message: 'Account created! Please check your email to confirm, then sign in.',
  }
}

/**
 * Log in an existing professional via Supabase Auth.
 */
export async function loginProfessional({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPass = (password || '').trim()

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Please provide both email and password.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPass,
  })

  if (error) {
    return {
      success: false,
      error: error.message || 'Invalid email or password. Please verify your credentials.',
    }
  }

  const user = data?.user
  if (!user?.id) {
    return { success: false, error: 'Authentication succeeded but user session is missing.' }
  }

  setStorageUser(user.id)
  await migrateLegacyProfessionalData(user)

  // Ensure professional_profiles row exists for onboarding tracking
  const existingPp = await supabase
    .from('professional_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingPp.error && !existingPp.data) {
    await runSchemaResilientMutation(
      {
        user_id: user.id,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      },
      (clean) => supabase.from('professional_profiles').upsert(clean, { onConflict: 'user_id' })
    )
  }

  const professional = await fetchCurrentProfessional(user)
  return {
    success: true,
    professional,
    message: `Welcome back, ${professional?.fullName || cleanEmail}!`,
  }
}

/**
 * End the professional Supabase Auth session cleanly.
 */
export async function logoutProfessional() {
  try {
    await supabase.auth.signOut()
  } finally {
    removeItem(STORAGE_KEYS.CURRENT_PROFESSIONAL)
    clearUserScopedCache()
    setStorageUser(null)
  }
  return { success: true }
}

/**
 * Update cached snapshot after a Supabase profile mutation.
 */
export function updateCurrentProfessional(updates) {
  const current = getCurrentProfessional()
  if (!current) return { success: false, error: 'No active session.' }

  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  setItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, updated)
  return { success: true, professional: updated }
}
