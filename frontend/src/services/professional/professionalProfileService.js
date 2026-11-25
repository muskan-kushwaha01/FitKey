// professionalProfileService.js
// Supabase-backed professional profile management, multi-step onboarding persistence,
// avatar upload, and verification status tracking.

import { supabase } from '../../lib/supabase.js'
import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'
import {
  getCurrentProfessional,
  fetchCurrentProfessional,
  normalizeProfessionalRecord,
} from './professionalAuthService.js'

export const AVATAR_BUCKET = 'avatars'
export const PROFESSIONAL_DOCUMENTS_BUCKET = 'professional-documents'
export const MAX_PROFESSIONAL_DOCUMENT_BYTES = 10 * 1024 * 1024
export const ALLOWED_PROFESSIONAL_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

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

  for (let attempt = 0; attempt < 20; attempt++) {
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

async function assertAuthenticatedSession(expectedUserId = null) {
  const { data, error } = await supabase.auth.getSession()
  const user = data?.session?.user
  if (error || !user?.id) {
    return { ok: false, error: 'Your session has expired. Please sign in again.' }
  }
  if (expectedUserId && user.id !== expectedUserId) {
    return { ok: false, error: 'Unauthorized: account mismatch.' }
  }
  return { ok: true, user }
}

/**
 * Synchronous helper checking cached onboarding state.
 */
export function isOnboardingCompleted(professionalId = null) {
  const current = getCurrentProfessional()
  if (!current) return false
  if (professionalId && current.id !== professionalId) return false
  return Boolean(current.onboardingCompleted)
}

/**
 * Authoritative async onboarding status check from Supabase.
 */
export async function isOnboardingCompletedAsync(professionalId = null) {
  const authCheck = await assertAuthenticatedSession(professionalId)
  if (!authCheck.ok) return false

  const { data, error } = await supabase
    .from('professional_profiles')
    .select('onboarding_completed, specialization, registration_number')
    .eq('user_id', authCheck.user.id)
    .maybeSingle()

  if (error || !data) return false
  if (typeof data.onboarding_completed === 'boolean') {
    return data.onboarding_completed
  }
  return Boolean(data.specialization && data.registration_number)
}

/**
 * Fetch the authenticated professional's full profile from Supabase.
 */
export async function fetchProfessionalProfile(professionalId = null) {
  const authCheck = await assertAuthenticatedSession(professionalId)
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error, professional: null }
  }

  const prof = await fetchCurrentProfessional(authCheck.user)
  if (!prof) {
    return { success: false, error: 'Could not load professional profile.', professional: null }
  }
  return { success: true, professional: prof }
}

/**
 * Synchronous cache getter for backward compatibility.
 */
export function getProfessionalProfile(professionalId = null) {
  const current = getCurrentProfessional()
  if (current && (!professionalId || current.id === professionalId)) {
    return current
  }
  return null
}

/**
 * Save draft data during the multi-step onboarding flow (scoped by professionalId).
 */
export function saveDraftOnboarding(professionalId, draftData) {
  if (!professionalId) return null
  const drafts = getItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, {})
  drafts[professionalId] = {
    ...drafts[professionalId],
    ...draftData,
    savedAt: new Date().toISOString(),
  }
  setItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, drafts)
  return drafts[professionalId]
}

/**
 * Retrieve saved draft onboarding data for a professional.
 */
export function getDraftOnboarding(professionalId) {
  if (!professionalId) return null
  const drafts = getItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, {})
  return drafts[professionalId] || null
}

/**
 * Clear draft onboarding data once onboarding completes.
 */
export function clearDraftOnboarding(professionalId) {
  if (!professionalId) return
  const drafts = getItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, {})
  if (drafts[professionalId]) {
    delete drafts[professionalId]
    setItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, drafts)
  }
}

/**
 * Complete the professional onboarding in Supabase:
 * - Updates `public.profiles` (full_name, phone, avatar_url — never account_type or email)
 * - Upserts `public.professional_profiles` (never self-approves verification_status)
 * - Clears onboarding draft
 */
export async function completeOnboarding(professionalId, fullData) {
  const authCheck = await assertAuthenticatedSession(professionalId)
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error }
  }

  const userId = authCheck.user.id
  const nowIso = new Date().toISOString()

  const fullName = String(fullData.fullName || fullData.name || '').trim()
  const phone = String(fullData.phone || '').trim() || null
  const photoUrl = String(fullData.photoUrl || '').trim() || null

  // 1. Update `public.profiles`
  const profilePayload = {
    id: userId,
    ...(fullName ? { full_name: fullName } : {}),
    ...(phone !== null ? { phone } : {}),
    ...(photoUrl !== null ? { avatar_url: photoUrl } : {}),
    updated_at: nowIso,
  }
  const profWrite = await runSchemaResilientMutation(profilePayload, (clean) =>
    supabase.from('profiles').upsert(clean, { onConflict: 'id' })
  )
  if (profWrite.error) {
    return { success: false, error: profWrite.error.message || 'Failed to save personal details.' }
  }

  // 2. Upsert `public.professional_profiles` (never sending verification_status = 'Verified')
  const yearsNum =
    fullData.yearsExperience !== '' && fullData.yearsExperience != null
      ? Math.max(0, Math.round(Number(fullData.yearsExperience)))
      : null

  const feeNum =
    fullData.offerConsultations === 'yes' && fullData.consultationFee != null
      ? Math.max(100, Number(fullData.consultationFee))
      : null

  const ppPayload = {
    user_id: userId,
    profession: String(fullData.profession || '').trim() || null,
    specialization: String(fullData.specialization || '').trim() || null,
    qualification: String(fullData.qualifications || '').trim() || null,
    experience_years: Number.isFinite(yearsNum) ? yearsNum : null,
    registration_number: String(fullData.licenseNumber || '').trim() || null,
    bio: String(fullData.bio || '').trim() || null,
    workplace_name: String(fullData.workplaceName || '').trim() || null,
    workplace_address: String(fullData.workplaceAddress || '').trim() || null,
    city: String(fullData.city || '').trim() || null,
    state: String(fullData.state || '').trim() || null,
    clinic_photo_url: String(fullData.clinicPhotoUrl || '').trim() || null,
    documents: Array.isArray(fullData.documents) ? fullData.documents : [],
    onboarding_completed: true,
    ...(feeNum !== null ? { consultation_fee: feeNum } : {}),
    updated_at: nowIso,
  }

  const ppWrite = await runSchemaResilientMutation(ppPayload, (clean) =>
    supabase.from('professional_profiles').upsert(clean, { onConflict: 'user_id' })
  )
  if (ppWrite.error) {
    return { success: false, error: ppWrite.error.message || 'Failed to complete professional onboarding.' }
  }

  clearDraftOnboarding(userId)

  const refreshed = await fetchCurrentProfessional(authCheck.user)
  return {
    success: true,
    professional: refreshed || normalizeProfessionalRecord(authCheck.user, profilePayload, ppPayload),
    message: 'Onboarding completed successfully! Your profile is now under review.',
  }
}

/** Upload credential evidence to the owner's private Supabase Storage folder. */
export async function uploadProfessionalDocument(professionalId, file, documentType = 'qualification') {
  const authCheck = await assertAuthenticatedSession(professionalId)
  if (!authCheck.ok) return { success: false, error: authCheck.error }
  if (!file) return { success: false, error: 'Choose a document to upload.' }
  if (!ALLOWED_PROFESSIONAL_DOCUMENT_TYPES.has(file.type)) {
    return { success: false, error: 'Only PDF, JPEG, or PNG documents are supported.' }
  }
  if (file.size > MAX_PROFESSIONAL_DOCUMENT_BYTES) {
    return { success: false, error: 'Credential documents must be 10 MB or smaller.' }
  }

  const userId = authCheck.user.id
  const safeName = (file.name || 'credential').replace(/[^a-zA-Z0-9._-]/g, '_')
  const objectPath = `${userId}/${Date.now()}-${generateId()}-${safeName}`
  const { error } = await supabase.storage.from(PROFESSIONAL_DOCUMENTS_BUCKET).upload(objectPath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) return { success: false, error: error.message || 'Could not upload credential document.' }

  return {
    success: true,
    document: {
      id: objectPath,
      objectPath,
      name: file.name || safeName,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: documentType,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      status: 'Uploaded',
    },
  }
}

export async function deleteProfessionalDocument(professionalId, objectPath) {
  const authCheck = await assertAuthenticatedSession(professionalId)
  if (!authCheck.ok) return { success: false, error: authCheck.error }
  if (!objectPath || !objectPath.startsWith(`${authCheck.user.id}/`)) {
    return { success: false, error: 'You can only remove your own credential documents.' }
  }
  const { error } = await supabase.storage.from(PROFESSIONAL_DOCUMENTS_BUCKET).remove([objectPath])
  if (error) return { success: false, error: error.message || 'Could not remove credential document.' }
  return { success: true }
}

/**
 * Upload a professional avatar image to Supabase Storage `avatars` bucket
 * and persist `profiles.avatar_url`.
 */
export async function uploadProfessionalAvatar(professionalId, file) {
  const authCheck = await assertAuthenticatedSession(professionalId)
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error }
  }
  if (!file) {
    return { success: false, error: 'Please select an image file.' }
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { success: false, error: 'Only JPEG, PNG, WebP, or GIF images are allowed.' }
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { success: false, error: 'Profile photo must be smaller than 2 MB.' }
  }

  const userId = authCheck.user.id
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const filePath = `${userId}/prof-avatar-${Date.now()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadErr) {
    return { success: false, error: uploadErr.message || 'Failed to upload profile photo.' }
  }

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)
  const publicUrl = urlData?.publicUrl
  if (!publicUrl) {
    await supabase.storage.from(AVATAR_BUCKET).remove([filePath]).catch(() => {})
    return { success: false, error: 'Could not resolve uploaded photo URL.' }
  }

  const dbRes = await runSchemaResilientMutation(
    {
      id: userId,
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    },
    (clean) => supabase.from('profiles').upsert(clean, { onConflict: 'id' })
  )

  if (dbRes.error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([filePath]).catch(() => {})
    return { success: false, error: dbRes.error.message || 'Failed to save photo to profile.' }
  }

  const refreshed = await fetchCurrentProfessional(authCheck.user)
  return {
    success: true,
    photoUrl: publicUrl,
    professional: refreshed,
    message: 'Profile photo updated!',
  }
}

/**
 * Update professional profile details and persist changes to Supabase.
 * Never mutates `verification_status` or `account_type`.
 */
export async function updateProfessionalProfile(professionalId, updatedFields) {
  const authCheck = await assertAuthenticatedSession(professionalId)
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error }
  }

  const userId = authCheck.user.id
  const nowIso = new Date().toISOString()

  const profilePatch = {}
  if (updatedFields.fullName !== undefined) {
    const trimmed = String(updatedFields.fullName).trim()
    if (!trimmed) {
      return { success: false, error: 'Full name cannot be empty.' }
    }
    profilePatch.full_name = trimmed
  }
  if (updatedFields.photoUrl !== undefined) {
    profilePatch.avatar_url = String(updatedFields.photoUrl || '').trim() || null
  }
  if (updatedFields.phone !== undefined) {
    profilePatch.phone = String(updatedFields.phone || '').trim() || null
  }

  if (Object.keys(profilePatch).length > 0) {
    const profWrite = await runSchemaResilientMutation(
      { id: userId, ...profilePatch, updated_at: nowIso },
      (clean) => supabase.from('profiles').upsert(clean, { onConflict: 'id' })
    )
    if (profWrite.error) {
      return { success: false, error: profWrite.error.message || 'Failed to update profile.' }
    }
  }

  const ppPatch = {}
  if (updatedFields.profession !== undefined) {
    ppPatch.profession = String(updatedFields.profession || '').trim() || null
  }
  if (updatedFields.specialization !== undefined) {
    ppPatch.specialization = String(updatedFields.specialization || '').trim() || null
  }
  if (updatedFields.qualifications !== undefined) {
    ppPatch.qualification = String(updatedFields.qualifications || '').trim() || null
  }
  if (updatedFields.yearsExperience !== undefined) {
    const raw = String(updatedFields.yearsExperience ?? '').trim()
    if (raw === '') {
      ppPatch.experience_years = null
    } else {
      const yrs = Number(raw)
      if (Number.isNaN(yrs) || yrs < 0 || yrs > 80) {
        return { success: false, error: 'Years of experience must be between 0 and 80.' }
      }
      ppPatch.experience_years = Math.round(yrs)
    }
  }
  if (updatedFields.licenseNumber !== undefined) {
    ppPatch.registration_number = String(updatedFields.licenseNumber || '').trim() || null
  }
  if (updatedFields.bio !== undefined) {
    ppPatch.bio = String(updatedFields.bio || '').trim() || null
  }
  if (updatedFields.workplaceName !== undefined) {
    ppPatch.workplace_name = String(updatedFields.workplaceName || '').trim() || null
  }
  if (updatedFields.workplaceAddress !== undefined) {
    ppPatch.workplace_address = String(updatedFields.workplaceAddress || '').trim() || null
  }
  if (updatedFields.city !== undefined) {
    ppPatch.city = String(updatedFields.city || '').trim() || null
  }
  if (updatedFields.state !== undefined) {
    ppPatch.state = String(updatedFields.state || '').trim() || null
  }

  if (Object.keys(ppPatch).length > 0) {
    const ppWrite = await runSchemaResilientMutation(
      { user_id: userId, ...ppPatch, updated_at: nowIso },
      (clean) => supabase.from('professional_profiles').upsert(clean, { onConflict: 'user_id' })
    )
    if (ppWrite.error) {
      return { success: false, error: ppWrite.error.message || 'Failed to update professional details.' }
    }
  }

  const refreshed = await fetchCurrentProfessional(authCheck.user)
  return {
    success: true,
    professional: refreshed,
    message: 'Profile updated successfully!',
  }
}
