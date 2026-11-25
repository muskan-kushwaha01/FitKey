// userProfileService.js
// Complete Supabase-backed user profile, health profile summary, privacy preferences,
// avatar Storage management, and ownership-verified localStorage migration.

import { supabase } from '../lib/supabase'
import {
  STORAGE_KEYS,
  getItem,
  setItem,
  getRawItem,
  removeRawItem,
  getKnownAuthUsers,
  emitSyncComplete,
} from './storageService'

export const AVATAR_BUCKET = 'avatars'
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
export const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export const GENDER_OPTIONS = ['Prefer not to say', 'Female', 'Male', 'Other']
export const BLOOD_GROUP_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "Don't know",
]
export const WELLNESS_GOAL_OPTIONS = [
  'Overall Wellness',
  'Fitness',
  'Better Sleep',
  'Healthy Nutrition',
  'Stress Management',
]
export const ACTIVITY_LEVEL_OPTIONS = [
  'Sedentary',
  'Lightly Active',
  'Moderately Active',
  'Very Active',
]
export const DIETARY_PREFERENCE_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non-veg', label: 'Non-vegetarian' },
]

const PROFILE_MIGRATION_LOCK_PREFIX = 'fk_profile_migrated_'
const LEGACY_OWNER_KEY = 'fk_legacy_storage_owner'
const LEGACY_PROFILE_KEYS = ['fk_user_health_profile', 'fk_user_profile', 'fk_profile']

const inFlightProfileFetches = new Map()
const inFlightProfileMigrations = new Map()

const ACTIVITY_ID_TO_LABEL = {
  sedentary: 'Sedentary',
  lightly: 'Lightly Active',
  'lightly active': 'Lightly Active',
  moderately: 'Moderately Active',
  'moderately active': 'Moderately Active',
  very: 'Very Active',
  'very active': 'Very Active',
}

const DIET_NORMALIZATION = {
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  eggetarian: 'eggetarian',
  'non-veg': 'non-veg',
  'non-vegetarian': 'non-veg',
  nonveg: 'non-veg',
}

export function normalizeActivityLevel(raw) {
  if (!raw || typeof raw !== 'string') return 'Moderately Active'
  const key = raw.trim().toLowerCase()
  return ACTIVITY_ID_TO_LABEL[key] || (ACTIVITY_LEVEL_OPTIONS.includes(raw.trim()) ? raw.trim() : 'Moderately Active')
}

export function normalizeDietPref(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const key = raw.trim().toLowerCase()
  return DIET_NORMALIZATION[key] || key
}

export function formatDietaryLabel(raw) {
  const norm = normalizeDietPref(raw)
  const matched = DIETARY_PREFERENCE_OPTIONS.find((opt) => opt.value === norm)
  return matched ? matched.label : (raw || 'Not specified')
}

export function calculateAgeFromDob(dobStr) {
  if (!dobStr || typeof dobStr !== 'string') return null
  const match = dobStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const dob = new Date(year, month - 1, day)
  if (
    Number.isNaN(dob.getTime()) ||
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null
  }

  const now = new Date()
  if (dob > now) return -1
  let age = now.getFullYear() - year
  const mDiff = now.getMonth() - (month - 1)
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < day)) {
    age -= 1
  }
  return age
}

function extractPrimaryGoal(hpRow) {
  if (hpRow?.primary_goal && typeof hpRow.primary_goal === 'string' && hpRow.primary_goal.trim()) {
    return hpRow.primary_goal.trim()
  }
  if (Array.isArray(hpRow?.wellness_goals) && hpRow.wellness_goals.length > 0) {
    return String(hpRow.wellness_goals[0] || '').trim() || 'Overall Wellness'
  }
  if (typeof hpRow?.wellness_goals === 'string' && hpRow.wellness_goals.trim()) {
    return hpRow.wellness_goals.split(',')[0].trim() || 'Overall Wellness'
  }
  return 'Overall Wellness'
}

function normalizeWellnessGoalsArray(primaryGoal, existingGoals = []) {
  const cleanPrimary = String(primaryGoal || '').trim() || 'Overall Wellness'
  const rest = Array.isArray(existingGoals)
    ? existingGoals.map((g) => String(g || '').trim()).filter((g) => g && g !== cleanPrimary)
    : []
  return [cleanPrimary, ...rest]
}

function isMissingColumnError(err) {
  if (!err) return null
  const code = String(err.code || '')
  const msg = String(err.message || '')
  if (code !== 'PGRST204' && code !== '42703') return null

  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i)
  if (pgrstMatch?.[1]) return pgrstMatch[1]

  const pgMatch = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+(?:of relation\s+"[^"]+"\s+)?does not exist/i)
  if (pgMatch?.[1]) return pgMatch[1]

  return '__UNKNOWN_COLUMN__'
}

async function runSchemaResilientMutation(initialPayload, mutateFn) {
  const payload = { ...initialPayload }
  const skippedColumns = []

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await mutateFn(payload)
    if (!error) {
      return { data, error: null, skippedColumns }
    }

    const missingCol = isMissingColumnError(error)
    if (missingCol && missingCol !== '__UNKNOWN_COLUMN__' && missingCol in payload) {
      delete payload[missingCol]
      skippedColumns.push(missingCol)
      continue
    }

    return { data: null, error, skippedColumns }
  }

  return {
    data: null,
    error: { message: 'Profile schema update could not complete cleanly.' },
    skippedColumns,
  }
}

async function queryOwnProfileRow(userId) {
  const res = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (
    res.error &&
    (res.error.code === '42703' || String(res.error.message || '').includes('column "id" does not exist'))
  ) {
    const alt = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return { row: alt.data || null, error: alt.error || null, idColumn: 'user_id' }
  }

  return { row: res.data || null, error: res.error || null, idColumn: 'id' }
}

function findExistingMigratedOwner() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('fk_migrated_for_user_')) {
        return k.slice('fk_migrated_for_user_'.length)
      }
      if (k && k.startsWith(PROFILE_MIGRATION_LOCK_PREFIX)) {
        return k.slice(PROFILE_MIGRATION_LOCK_PREFIX.length)
      }
    }
  } catch {
    return null
  }
  return null
}

function canClaimLegacyProfileKeys(userId) {
  let hasLegacy = false
  for (const key of LEGACY_PROFILE_KEYS) {
    const val = getRawItem(key, null)
    if (val && typeof val === 'object' && Object.keys(val).length > 0) {
      hasLegacy = true
      break
    }
  }
  if (!hasLegacy) return { allowed: false, reason: 'NO_LEGACY_PROFILE' }

  let owner
  try {
    owner = localStorage.getItem(LEGACY_OWNER_KEY) || findExistingMigratedOwner()
  } catch {
    owner = null
  }

  if (owner) {
    return owner === userId
      ? { allowed: true, reason: 'OWNER_MATCHED' }
      : { allowed: false, reason: 'OWNED_BY_OTHER_ACCOUNT' }
  }

  const otherUsers = getKnownAuthUsers().filter((id) => id && id !== userId)
  if (otherUsers.length > 0) {
    return { allowed: false, reason: 'AMBIGUOUS_MULTI_ACCOUNT_BROWSER' }
  }

  return { allowed: true, reason: 'FIRST_OWNER_BOUND' }
}

function normalizeLegacyProfileBlob(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return {
    fullName: raw.fullName ?? raw.full_name ?? raw.name ?? null,
    phone: raw.phone ?? null,
    age: raw.age != null && raw.age !== '' ? Number(raw.age) : null,
    dateOfBirth: raw.dateOfBirth ?? raw.date_of_birth ?? null,
    gender: raw.gender ?? null,
    heightCm: raw.heightCm ?? raw.height_cm ?? raw.height ?? null,
    weightKg: raw.weightKg ?? raw.weight_kg ?? raw.weight ?? null,
    bloodGroup: raw.bloodGroup ?? raw.blood_group ?? null,
    primaryGoal: raw.primaryGoal ?? raw.primary_goal ?? raw.goal ?? null,
    activityLevel: raw.activityLevel ?? raw.activity_level ?? raw.activity ?? null,
    dietaryPreference: raw.dietaryPreference ?? raw.dietary_preference ?? raw.dietPref ?? null,
    healthDataSharing:
      typeof raw.healthDataSharing === 'boolean'
        ? raw.healthDataSharing
        : typeof raw.health_data_sharing === 'boolean'
          ? raw.health_data_sharing
          : null,
    leaderboardVisibility:
      typeof raw.leaderboardVisibility === 'boolean'
        ? raw.leaderboardVisibility
        : typeof raw.leaderboard_visibility === 'boolean'
          ? raw.leaderboard_visibility
          : null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  }
}

/**
 * Safely & idempotently migrate existing localStorage profile blobs to Supabase.
 * Never overwrites existing non-empty or newer Supabase fields. Only removes legacy
 * local keys after confirmed database persistence.
 */
export async function migrateLocalProfileToSupabase(authUser) {
  if (!authUser?.id) return { success: false, reason: 'NO_USER' }
  const userId = authUser.id

  try {
    if (localStorage.getItem(`${PROFILE_MIGRATION_LOCK_PREFIX}${userId}`)) {
      return { success: true, alreadyMigrated: true }
    }
  } catch {
    // ignore storage access issues
  }

  if (inFlightProfileMigrations.has(userId)) {
    return inFlightProfileMigrations.get(userId)
  }

  const task = (async () => {
    try {
      const legacyClaim = canClaimLegacyProfileKeys(userId)
      const scopedHealthProfile = getItem(STORAGE_KEYS.USER_HEALTH_PROFILE, null, userId)
      const scopedProfileCache = getItem(STORAGE_KEYS.USER_PROFILE_CACHE, null, userId)

      let combinedRaw = {}
      const keysToClearOnSuccess = []

      if (legacyClaim.allowed) {
        for (const key of LEGACY_PROFILE_KEYS) {
          const val = getRawItem(key, null)
          if (val && typeof val === 'object') {
            combinedRaw = { ...combinedRaw, ...normalizeLegacyProfileBlob(val) }
            keysToClearOnSuccess.push(key)
          }
        }
      }

      if (scopedHealthProfile && typeof scopedHealthProfile === 'object') {
        combinedRaw = { ...combinedRaw, ...normalizeLegacyProfileBlob(scopedHealthProfile) }
      }
      if (scopedProfileCache && typeof scopedProfileCache === 'object' && !scopedProfileCache._syncedFromServer) {
        combinedRaw = { ...combinedRaw, ...normalizeLegacyProfileBlob(scopedProfileCache) }
      }

      const hasCandidateFields = Object.entries(combinedRaw).some(
        ([k, v]) => k !== 'updatedAt' && v !== null && v !== undefined && v !== ''
      )

      if (!hasCandidateFields) {
        if (legacyClaim.reason === 'NO_LEGACY_PROFILE' || legacyClaim.reason === 'OWNED_BY_OTHER_ACCOUNT') {
          try {
            localStorage.setItem(`${PROFILE_MIGRATION_LOCK_PREFIX}${userId}`, new Date().toISOString())
          } catch {
            // ignore
          }
        }
        return { success: true, skipped: true, reason: 'NO_LOCAL_PROFILE_DATA' }
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || sessionData?.session?.user?.id !== userId) {
        return { success: false, reason: 'AUTH_MISMATCH' }
      }

      const [{ row: existingProfile, idColumn, error: profFetchErr }, { data: existingHealth, error: hpFetchErr }] =
        await Promise.all([
          queryOwnProfileRow(userId),
          supabase.from('health_profiles').select('*').eq('user_id', userId).maybeSingle(),
        ])

      if (profFetchErr || hpFetchErr) {
        return { success: false, error: (profFetchErr || hpFetchErr).message }
      }

      const serverProfTime = existingProfile?.updated_at ? Date.parse(existingProfile.updated_at) : 0
      const serverHpTime = existingHealth?.updated_at ? Date.parse(existingHealth.updated_at) : 0
      const localTime = combinedRaw.updatedAt ? Date.parse(combinedRaw.updatedAt) : 0
      const localIsStrictlyOlderThanServer =
        Number.isFinite(localTime) &&
        localTime > 0 &&
        ((serverProfTime > 0 && localTime < serverProfTime) || (serverHpTime > 0 && localTime < serverHpTime))

      // Only fill fields that are missing/null on Supabase (and never let strictly older local blobs clobber server)
      const profilePatch = {}
      if (!existingProfile?.full_name && combinedRaw.fullName && !localIsStrictlyOlderThanServer) {
        profilePatch.full_name = String(combinedRaw.fullName).trim()
      }
      if (!existingProfile?.phone && combinedRaw.phone && !localIsStrictlyOlderThanServer) {
        profilePatch.phone = String(combinedRaw.phone).trim()
      }
      if (existingProfile?.health_data_sharing == null && typeof combinedRaw.healthDataSharing === 'boolean') {
        profilePatch.health_data_sharing = combinedRaw.healthDataSharing
      }
      if (existingProfile?.leaderboard_visibility == null && typeof combinedRaw.leaderboardVisibility === 'boolean') {
        profilePatch.leaderboard_visibility = combinedRaw.leaderboardVisibility
      }

      if (Object.keys(profilePatch).length > 0 || !existingProfile) {
        // Note: `email` is intentionally excluded — email sync is handled by Auth flow only
        const profPayload = {
          [idColumn]: userId,
          ...profilePatch,
          updated_at: new Date().toISOString(),
        }
        const profWrite = await runSchemaResilientMutation(profPayload, (cleanPayload) =>
          supabase.from('profiles').upsert(cleanPayload, { onConflict: idColumn })
        )
        if (profWrite.error) {
          return { success: false, error: profWrite.error.message }
        }
      }

      const hpPatch = {}
      if (existingHealth?.age == null && combinedRaw.age != null && Number(combinedRaw.age) >= 13 && !localIsStrictlyOlderThanServer) {
        hpPatch.age = Math.round(Number(combinedRaw.age))
      }
      if (!existingHealth?.date_of_birth && combinedRaw.dateOfBirth && !localIsStrictlyOlderThanServer) {
        hpPatch.date_of_birth = combinedRaw.dateOfBirth
      }
      if (!existingHealth?.gender && combinedRaw.gender && !localIsStrictlyOlderThanServer) {
        hpPatch.gender = combinedRaw.gender
      }
      if (existingHealth?.height_cm == null && combinedRaw.heightCm != null && !localIsStrictlyOlderThanServer) {
        hpPatch.height_cm = Number(combinedRaw.heightCm)
      }
      if (existingHealth?.weight_kg == null && combinedRaw.weightKg != null && !localIsStrictlyOlderThanServer) {
        hpPatch.weight_kg = Number(combinedRaw.weightKg)
      }
      if (!existingHealth?.blood_group && combinedRaw.bloodGroup && !localIsStrictlyOlderThanServer) {
        hpPatch.blood_group = combinedRaw.bloodGroup
      }
      if (!existingHealth?.activity_level && combinedRaw.activityLevel && !localIsStrictlyOlderThanServer) {
        hpPatch.activity_level = normalizeActivityLevel(combinedRaw.activityLevel)
      }
      if (!existingHealth?.dietary_preference && combinedRaw.dietaryPreference && !localIsStrictlyOlderThanServer) {
        hpPatch.dietary_preference = normalizeDietPref(combinedRaw.dietaryPreference)
      }
      if (
        !existingHealth?.primary_goal &&
        (!Array.isArray(existingHealth?.wellness_goals) || existingHealth.wellness_goals.length === 0) &&
        combinedRaw.primaryGoal &&
        !localIsStrictlyOlderThanServer
      ) {
        hpPatch.primary_goal = combinedRaw.primaryGoal
        hpPatch.wellness_goals = [combinedRaw.primaryGoal]
      }

      if (Object.keys(hpPatch).length > 0) {
        const hpPayload = {
          user_id: userId,
          ...hpPatch,
          updated_at: new Date().toISOString(),
        }
        const hpWrite = await runSchemaResilientMutation(hpPayload, (cleanPayload) =>
          supabase.from('health_profiles').upsert(cleanPayload, { onConflict: 'user_id' })
        )
        if (hpWrite.error) {
          return { success: false, error: hpWrite.error.message }
        }
      }

      try {
        localStorage.setItem(`${PROFILE_MIGRATION_LOCK_PREFIX}${userId}`, new Date().toISOString())
      } catch {
        // ignore
      }
      for (const legacyKey of keysToClearOnSuccess) {
        removeRawItem(legacyKey)
      }

      return { success: true, migrated: true }
    } catch (err) {
      return { success: false, error: err?.message || 'Profile migration failed' }
    }
  })().finally(() => {
    inFlightProfileMigrations.delete(userId)
  })

  inFlightProfileMigrations.set(userId, task)
  return task
}

/**
 * Validate personal and health profile form fields before hitting Supabase.
 */
export function validateProfileForm(form) {
  const errors = {}

  const fullName = String(form?.fullName ?? '').trim()
  if (fullName.length < 2 || fullName.length > 120) {
    errors.fullName = 'Please enter your full name (2–120 characters).'
  }

  const email = String(form?.email ?? '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.'
  }

  const phone = String(form?.phone ?? '').trim()
  if (phone) {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = 'Please enter a valid phone number (7–15 digits).'
    }
  }

  const dob = String(form?.dateOfBirth ?? '').trim()
  if (dob) {
    const computedAge = calculateAgeFromDob(dob)
    if (computedAge === null || computedAge < 13 || computedAge > 120) {
      errors.dateOfBirth = 'Date of birth must correspond to an age between 13 and 120.'
    }
  } else if (form?.age !== '' && form?.age !== null && form?.age !== undefined) {
    const numAge = Number(form.age)
    if (!Number.isFinite(numAge) || numAge < 13 || numAge > 120 || !Number.isInteger(numAge)) {
      errors.age = 'Age must be a whole number between 13 and 120.'
    }
  }

  if (form?.heightCm !== '' && form?.heightCm !== null && form?.heightCm !== undefined) {
    const numH = Number(form.heightCm)
    if (!Number.isFinite(numH) || numH < 50 || numH > 260) {
      errors.heightCm = 'Height must be between 50 cm and 260 cm.'
    }
  }

  if (form?.weightKg !== '' && form?.weightKg !== null && form?.weightKg !== undefined) {
    const numW = Number(form.weightKg)
    if (!Number.isFinite(numW) || numW < 20 || numW > 350) {
      errors.weightKg = 'Weight must be between 20 kg and 350 kg.'
    }
  }

  const keys = Object.keys(errors)
  return {
    valid: keys.length === 0,
    errors,
    firstError: keys.length > 0 ? errors[keys[0]] : null,
  }
}

export function buildEmptyUserProfile(authUser = null) {
  return {
    userId: authUser?.id || null,
    personal: {
      fullName: authUser?.user_metadata?.full_name || '',
      email: authUser?.email || '',
      pendingEmail: authUser?.new_email || null,
      emailVerified: Boolean(authUser?.email_confirmed_at),
      phone: authUser?.phone || '',
      avatarUrl: '',
      accountType: 'user',
      dateOfBirth: '',
      age: '',
      gender: 'Prefer not to say',
      heightCm: '',
      weightKg: '',
      bloodGroup: '',
    },
    wellness: {
      primaryGoal: 'Overall Wellness',
      wellnessGoals: ['Overall Wellness'],
      activityLevel: 'Moderately Active',
      dietaryPreference: '',
      onboardingCompleted: false,
    },
    healthSummary: {
      sleepHours: null,
      waterLitres: null,
      sittingHours: null,
      smoking: '',
      alcohol: '',
      stress: '',
      mealsPerDay: '',
      specificDiet: '',
      specificDietName: '',
      intolerances: [],
      deficiencies: [],
      digestiveIssues: [],
      supplements: [],
      inTreatment: '',
      treatmentCondition: '',
      treatmentType: '',
      treatmentRestrictions: '',
      conditions: [],
      medications: [],
      allergies: [],
      injuries: [],
    },
    privacy: {
      healthDataSharing: true,
      leaderboardVisibility: true,
      mfaEnabled: false,
    },
    meta: {
      createdAt: null,
      updatedAt: null,
      hasProfileRow: false,
      hasHealthProfileRow: false,
    },
  }
}

/**
 * Temporary scoped cache helper (used only for fast initial hydration before Supabase responds).
 */
export function getCachedUserProfile(authUser = null) {
  if (!authUser?.id) return buildEmptyUserProfile(null)
  const cached = getItem(STORAGE_KEYS.USER_PROFILE_CACHE, null, authUser.id)
  if (cached && cached._syncedFromServer && cached.userId === authUser.id) {
    return cached
  }
  return buildEmptyUserProfile(authUser)
}

/**
 * Fetch the authenticated user's complete profile, health profile, privacy settings,
 * and read-only health history records from Supabase.
 */
export async function fetchUserProfile(authUser, { runMigration = true } = {}) {
  if (!authUser?.id) {
    return {
      success: false,
      error: 'You must be signed in to view your profile.',
      data: buildEmptyUserProfile(null),
    }
  }

  const userId = authUser.id

  if (inFlightProfileFetches.has(userId)) {
    return inFlightProfileFetches.get(userId)
  }

  const task = (async () => {
    try {
      if (runMigration) {
        await migrateLocalProfileToSupabase(authUser)
      }

      const [
        authRes,
        profRes,
        hpRes,
        condRes,
        medRes,
        algRes,
        injRes,
        mfaRes,
      ] = await Promise.all([
        supabase.auth.getUser(),
        queryOwnProfileRow(userId),
        supabase.from('health_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('medical_conditions').select('id, condition_name, diagnosis_year, is_controlled, status').eq('user_id', userId),
        supabase.from('medications').select('id, medication_name, dosage, frequency, reason, status').eq('user_id', userId),
        supabase.from('allergies').select('id, allergy_type, allergen, reaction, severity').eq('user_id', userId),
        supabase.from('injuries').select('id, injury_type, body_part, status').eq('user_id', userId),
        typeof supabase.auth.mfa?.listFactors === 'function'
          ? Promise.resolve(supabase.auth.mfa.listFactors()).catch(() => ({ data: null, error: null }))
          : Promise.resolve({ data: null, error: null }),
      ])

      const liveAuthUser = authRes?.data?.user?.id === userId ? authRes.data.user : authUser

      if (profRes.error || hpRes.error) {
        const primaryErr = profRes.error || hpRes.error
        return {
          success: false,
          error: primaryErr.message || 'Unable to load profile from Supabase.',
          data: getCachedUserProfile(liveAuthUser),
        }
      }

      const p = profRes.row || null
      const hp = hpRes.data || null

      // If user recently confirmed an email change via Supabase Auth, align profiles.email cleanly
      if (
        p &&
        liveAuthUser?.email &&
        liveAuthUser?.email_confirmed_at &&
        String(p.email || '').trim().toLowerCase() !== String(liveAuthUser.email).trim().toLowerCase()
      ) {
        try {
          await runSchemaResilientMutation(
            {
              [profRes.idColumn]: userId,
              email: liveAuthUser.email,
              updated_at: new Date().toISOString(),
            },
            (cleanPayload) => supabase.from('profiles').upsert(cleanPayload, { onConflict: profRes.idColumn })
          )
          p.email = liveAuthUser.email
        } catch {
          // Non-fatal alignment retry on next load
        }
      }

      const dobStr = hp?.date_of_birth ? String(hp.date_of_birth).slice(0, 10) : ''
      const dobAge = calculateAgeFromDob(dobStr)
      const resolvedAge =
        dobAge !== null && dobAge >= 13
          ? String(dobAge)
          : hp?.age != null
            ? String(hp.age)
            : ''

      const verifiedFactors = [
        ...(mfaRes?.data?.totp || []),
        ...(mfaRes?.data?.phone || []),
      ].filter((f) => f?.status === 'verified')

      const primaryGoal = extractPrimaryGoal(hp)

      const unified = {
        userId,
        _syncedFromServer: true,
        personal: {
          fullName: p?.full_name || liveAuthUser.user_metadata?.full_name || '',
          email: liveAuthUser.email || p?.email || '',
          pendingEmail: liveAuthUser.new_email || null,
          emailVerified: Boolean(liveAuthUser.email_confirmed_at),
          phone: p?.phone || liveAuthUser.phone || '',
          avatarUrl: p?.avatar_url || '',
          accountType: p?.account_type || 'user',
          dateOfBirth: dobStr,
          age: resolvedAge,
          gender: hp?.gender || 'Prefer not to say',
          heightCm: hp?.height_cm != null ? String(hp.height_cm) : '',
          weightKg: hp?.weight_kg != null ? String(hp.weight_kg) : '',
          bloodGroup: hp?.blood_group || '',
        },
        wellness: {
          primaryGoal,
          wellnessGoals: normalizeWellnessGoalsArray(primaryGoal, hp?.wellness_goals),
          activityLevel: normalizeActivityLevel(hp?.activity_level),
          dietaryPreference: normalizeDietPref(hp?.dietary_preference),
          onboardingCompleted: Boolean(hp?.onboarding_completed),
        },
        healthSummary: {
          sleepHours: hp?.sleep_hours != null ? Number(hp.sleep_hours) : null,
          waterLitres: hp?.water_litres != null ? Number(hp.water_litres) : null,
          sittingHours: hp?.sitting_hours != null ? Number(hp.sitting_hours) : null,
          smoking: hp?.smoking || '',
          alcohol: hp?.alcohol || '',
          stress: hp?.stress || '',
          mealsPerDay: hp?.meals_per_day || '',
          specificDiet: hp?.specific_diet || '',
          specificDietName: hp?.specific_diet_name || '',
          intolerances: Array.isArray(hp?.intolerances) ? hp.intolerances : [],
          deficiencies: Array.isArray(hp?.deficiencies) ? hp.deficiencies : [],
          digestiveIssues: Array.isArray(hp?.digestive_issues) ? hp.digestive_issues : [],
          supplements: Array.isArray(hp?.supplements) ? hp.supplements : [],
          inTreatment: hp?.in_treatment || '',
          treatmentCondition: hp?.treatment_condition || '',
          treatmentType: hp?.treatment_type || '',
          treatmentRestrictions: hp?.treatment_restrictions || '',
          conditions: !condRes.error && Array.isArray(condRes.data) ? condRes.data : [],
          medications: !medRes.error && Array.isArray(medRes.data) ? medRes.data : [],
          allergies: !algRes.error && Array.isArray(algRes.data) ? algRes.data : [],
          injuries: !injRes.error && Array.isArray(injRes.data) ? injRes.data : [],
        },
        privacy: {
          healthDataSharing: p?.health_data_sharing ?? true,
          leaderboardVisibility: p?.leaderboard_visibility ?? true,
          mfaEnabled: verifiedFactors.length > 0,
        },
        meta: {
          createdAt: p?.created_at || liveAuthUser.created_at || null,
          updatedAt: p?.updated_at || hp?.updated_at || null,
          hasProfileRow: Boolean(p),
          hasHealthProfileRow: Boolean(hp),
        },
      }

      setItem(STORAGE_KEYS.USER_PROFILE_CACHE, unified, userId)
      return { success: true, data: unified }
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Unexpected error while loading profile.',
        data: getCachedUserProfile(authUser),
      }
    }
  })().finally(() => {
    inFlightProfileFetches.delete(userId)
  })

  inFlightProfileFetches.set(userId, task)
  return task
}

/**
 * Save updated personal and health profile information to Supabase.
 * Never directly mutates `account_type`, `id`, or unverified `email` in `profiles`.
 * Email changes initiate Supabase Auth's verification email flow cleanly.
 */
export async function saveUserProfile(authUser, formInput, existingProfile = null) {
  if (!authUser?.id) {
    return { success: false, error: 'You must be signed in to update your profile.' }
  }

  const validation = validateProfileForm(formInput)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.firstError,
      validationErrors: validation.errors,
    }
  }

  const userId = authUser.id
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  const sessionUser = sessionData?.session?.user
  if (sessionErr || sessionUser?.id !== userId) {
    return { success: false, error: 'Your session expired. Please sign in again.' }
  }

  const fullName = String(formInput.fullName).trim()
  const nextEmail = String(formInput.email).trim().toLowerCase()
  const confirmedAuthEmail = String(sessionUser.email || authUser.email || '').trim().toLowerCase()
  const phone = String(formInput.phone ?? '').trim() || null
  const dob = String(formInput.dateOfBirth ?? '').trim() || null
  const dobAge = calculateAgeFromDob(dob)
  const ageVal =
    dobAge !== null && dobAge >= 13
      ? dobAge
      : formInput.age !== '' && formInput.age !== null && formInput.age !== undefined
        ? Math.round(Number(formInput.age))
        : null

  const gender = String(formInput.gender || 'Prefer not to say').trim()
  const heightCm =
    formInput.heightCm !== '' && formInput.heightCm !== null && formInput.heightCm !== undefined
      ? Number(formInput.heightCm)
      : null
  const weightKg =
    formInput.weightKg !== '' && formInput.weightKg !== null && formInput.weightKg !== undefined
      ? Number(formInput.weightKg)
      : null
  const bloodGroup = String(formInput.bloodGroup ?? '').trim() || null
  const primaryGoal = String(formInput.primaryGoal || 'Overall Wellness').trim()
  const activityLevel = normalizeActivityLevel(formInput.activityLevel)
  const dietaryPreference = normalizeDietPref(formInput.dietaryPreference) || null

  const skippedColumns = []
  let emailConfirmationSent = false
  let pendingEmail = sessionUser.new_email || null

  // 1. Handle Auth Email change carefully via Supabase Auth verification flow ONLY
  if (nextEmail && confirmedAuthEmail && nextEmail !== confirmedAuthEmail) {
    const { data: authEmailData, error: authEmailErr } = await supabase.auth.updateUser(
      { email: nextEmail },
      typeof window !== 'undefined'
        ? { emailRedirectTo: `${window.location.origin}/profile` }
        : undefined
    )
    if (authEmailErr) {
      return {
        success: false,
        error: authEmailErr.message || 'Could not initiate email update.',
      }
    }
    emailConfirmationSent = true
    pendingEmail = authEmailData?.user?.new_email || nextEmail
  }

  // 2. Keep auth user_metadata.full_name aligned if changed
  const prevMetaName = String(sessionUser.user_metadata?.full_name || '').trim()
  if (fullName !== prevMetaName) {
    try {
      await supabase.auth.updateUser({ data: { full_name: fullName } })
    } catch {
      // Non-fatal metadata alignment
    }
  }

  // 3. Upsert `public.profiles`
  // NOTE: `email` is intentionally excluded from this payload.
  // profiles.email is only written by the guard trigger when it already matches
  // the confirmed auth email. Sending it here causes 403 on tables without the
  // guard trigger, and is redundant where it exists. Auth email is updated
  // exclusively via supabase.auth.updateUser() (step 1 above).
  const { idColumn } = await queryOwnProfileRow(userId)
  const profilePayload = {
    [idColumn]: userId,
    full_name: fullName,
    phone,
    updated_at: new Date().toISOString(),
  }

  const profWrite = await runSchemaResilientMutation(profilePayload, (cleanPayload) =>
    supabase.from('profiles').upsert(cleanPayload, { onConflict: idColumn })
  )
  if (profWrite.error) {
    return {
      success: false,
      error: profWrite.error.message || 'Failed to save personal details.',
    }
  }
  skippedColumns.push(...profWrite.skippedColumns)

  // 4. Upsert `public.health_profiles` (explicitly preserving onboarding_completed & unrelated health fields)
  const existingWellness = existingProfile?.wellness?.wellnessGoals || []
  const healthPayload = {
    user_id: userId,
    date_of_birth: dob,
    age: ageVal,
    gender,
    height_cm: heightCm,
    weight_kg: weightKg,
    blood_group: bloodGroup,
    activity_level: activityLevel,
    dietary_preference: dietaryPreference,
    primary_goal: primaryGoal,
    wellness_goals: normalizeWellnessGoalsArray(primaryGoal, existingWellness),
    updated_at: new Date().toISOString(),
  }

  const hpWrite = await runSchemaResilientMutation(healthPayload, (cleanPayload) =>
    supabase.from('health_profiles').upsert(cleanPayload, { onConflict: 'user_id' })
  )
  if (hpWrite.error) {
    return {
      success: false,
      error: hpWrite.error.message || 'Failed to save wellness profile.',
    }
  }
  skippedColumns.push(...hpWrite.skippedColumns)

  const refreshed = await fetchUserProfile(authUser, { runMigration: false })
  emitSyncComplete()

  return {
    success: true,
    emailConfirmationSent,
    pendingEmail,
    skippedColumns,
    data: refreshed.data,
  }
}

/**
 * Persist user privacy preferences directly to Supabase `profiles`.
 */
export async function updatePrivacyPreferences(authUser, { healthDataSharing, leaderboardVisibility }) {
  if (!authUser?.id) {
    return { success: false, error: 'You must be signed in to update privacy settings.' }
  }

  const userId = authUser.id
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr || sessionData?.session?.user?.id !== userId) {
    return { success: false, error: 'Your session expired. Please sign in again.' }
  }

  const { idColumn } = await queryOwnProfileRow(userId)
  const payload = {
    [idColumn]: userId,
    updated_at: new Date().toISOString(),
  }
  if (typeof healthDataSharing === 'boolean') {
    payload.health_data_sharing = healthDataSharing
  }
  if (typeof leaderboardVisibility === 'boolean') {
    payload.leaderboard_visibility = leaderboardVisibility
  }

  const res = await runSchemaResilientMutation(payload, (cleanPayload) =>
    supabase.from('profiles').upsert(cleanPayload, { onConflict: idColumn })
  )

  if (res.error) {
    return { success: false, error: res.error.message || 'Failed to update privacy settings.' }
  }

  const missingPrivacyCol = res.skippedColumns.some(
    (c) => c === 'health_data_sharing' || c === 'leaderboard_visibility'
  )
  if (missingPrivacyCol) {
    return {
      success: false,
      error: 'Database migration required to persist privacy settings.',
      skippedColumns: res.skippedColumns,
    }
  }

  const refreshed = await fetchUserProfile(authUser, { runMigration: false })
  return { success: true, data: refreshed.data }
}

/**
 * Validate and upload a profile photo to Supabase Storage (`avatars/<userId>/...`),
 * update `profiles.avatar_url`, and clean up old orphaned avatar objects.
 */
export async function uploadUserAvatar(authUser, file) {
  if (!authUser?.id) {
    return { success: false, error: 'You must be signed in to upload a profile photo.' }
  }
  if (!file) {
    return { success: false, error: 'Please select an image file to upload.' }
  }

  const mimeType = String(file.type || '').toLowerCase()
  if (!ALLOWED_AVATAR_TYPES.has(mimeType)) {
    return {
      success: false,
      error: 'Unsupported image format. Please choose a JPG, PNG, WebP, or GIF image.',
    }
  }

  if (Number(file.size) > MAX_AVATAR_BYTES) {
    return {
      success: false,
      error: 'Image size must be 2 MB or smaller.',
    }
  }

  const userId = authUser.id
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr || sessionData?.session?.user?.id !== userId) {
    return { success: false, error: 'Your session expired. Please sign in again.' }
  }

  const extFromName = String(file.name || '').split('.').pop()?.toLowerCase()
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extFromName)
    ? extFromName
    : mimeType.split('/')[1] || 'png'
  const newFileName = `avatar-${Date.now()}.${safeExt}`
  const newPath = `${userId}/${newFileName}`

  // List pre-existing files so we can clean up stale avatars only after the new upload succeeds
  let existingList = []
  try {
    const listRes = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 25 })
    if (Array.isArray(listRes?.data)) existingList = listRes.data
  } catch {
    existingList = []
  }

  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(newPath, file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadErr) {
    return {
      success: false,
      error: uploadErr.message || 'Failed to upload profile photo to storage.',
    }
  }

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(newPath)
  const publicUrl = urlData?.publicUrl
  if (!publicUrl) {
    try {
      await supabase.storage.from(AVATAR_BUCKET).remove([newPath])
    } catch {
      // ignore cleanup error
    }
    return { success: false, error: 'Could not resolve uploaded photo URL.' }
  }

  const { idColumn } = await queryOwnProfileRow(userId)
  const dbRes = await runSchemaResilientMutation(
    {
      [idColumn]: userId,
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    },
    (cleanPayload) => supabase.from('profiles').upsert(cleanPayload, { onConflict: idColumn })
  )

  if (dbRes.error || dbRes.skippedColumns.includes('avatar_url')) {
    try {
      await supabase.storage.from(AVATAR_BUCKET).remove([newPath])
    } catch {
      // ignore cleanup error
    }
    return {
      success: false,
      error: dbRes.error?.message || 'Could not save avatar URL to profile.',
    }
  }

  // Best-effort cleanup of prior orphaned avatar files inside this user's folder
  if (existingList.length > 0) {
    const stalePaths = existingList
      .map((item) => item?.name)
      .filter((name) => name && name !== newFileName)
      .map((name) => `${userId}/${name}`)
    if (stalePaths.length > 0) {
      try {
        await supabase.storage.from(AVATAR_BUCKET).remove(stalePaths)
      } catch {
        // ignore non-critical cleanup error
      }
    }
  }

  const refreshed = await fetchUserProfile(authUser, { runMigration: false })
  emitSyncComplete()

  return {
    success: true,
    avatarUrl: publicUrl,
    data: refreshed.data,
  }
}

/**
 * Remove the authenticated user's uploaded avatar from Storage and clear `profiles.avatar_url`.
 */
export async function removeUserAvatar(authUser) {
  if (!authUser?.id) {
    return { success: false, error: 'You must be signed in to remove your profile photo.' }
  }

  const userId = authUser.id
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
  if (sessionErr || sessionData?.session?.user?.id !== userId) {
    return { success: false, error: 'Your session expired. Please sign in again.' }
  }

  const { idColumn } = await queryOwnProfileRow(userId)
  const dbRes = await runSchemaResilientMutation(
    {
      [idColumn]: userId,
      avatar_url: null,
      updated_at: new Date().toISOString(),
    },
    (cleanPayload) => supabase.from('profiles').upsert(cleanPayload, { onConflict: idColumn })
  )

  if (dbRes.error) {
    return { success: false, error: dbRes.error.message || 'Failed to clear profile photo.' }
  }

  try {
    const { data: existingList } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId, { limit: 25 })

    if (Array.isArray(existingList) && existingList.length > 0) {
      const paths = existingList.map((f) => `${userId}/${f.name}`)
      await supabase.storage.from(AVATAR_BUCKET).remove(paths)
    }
  } catch {
    // ignore non-critical storage cleanup error
  }

  const refreshed = await fetchUserProfile(authUser, { runMigration: false })
  emitSyncComplete()

  return { success: true, data: refreshed.data }
}
