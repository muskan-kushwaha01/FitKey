// professionalProfileService.js
// Profile management, multi-step onboarding persistence, and verification status tracking.

import {
  getItem,
  setItem,
  removeItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'
import {
  getCurrentProfessional,
  updateCurrentProfessional,
  getProfessionals,
  saveProfessionals,
} from './professionalAuthService.js'

/**
 * Check if the professional has finished their onboarding.
 */
export function isOnboardingCompleted(professionalId = null) {
  if (!professionalId) {
    const current = getCurrentProfessional()
    return Boolean(current?.onboardingCompleted)
  }
  const list = getProfessionals()
  const found = list.find((p) => p.id === professionalId)
  return Boolean(found?.onboardingCompleted)
}

/**
 * Retrieve professional profile by ID or current session.
 */
export function getProfessionalProfile(professionalId = null) {
  if (!professionalId) {
    return getCurrentProfessional()
  }
  const list = getProfessionals()
  return list.find((p) => p.id === professionalId) || null
}

/**
 * Save draft data during the multi-step onboarding flow.
 */
export function saveDraftOnboarding(professionalId, draftData) {
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
  const drafts = getItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, {})
  return drafts[professionalId] || null
}

/**
 * Clear draft onboarding data once onboarding completes.
 */
export function clearDraftOnboarding(professionalId) {
  const drafts = getItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, {})
  if (drafts[professionalId]) {
    delete drafts[professionalId]
    setItem(STORAGE_KEYS.PROF_DRAFT_ONBOARDING, drafts)
  }
}

/**
 * Complete the professional onboarding: saves all collected data,
 * marks onboarding as complete, sets verification to 'Pending Verification',
 * and updates storage.
 */
export function completeOnboarding(professionalId, fullData) {
  const list = getProfessionals()
  const index = list.findIndex((p) => p.id === professionalId)

  if (index === -1) {
    return { success: false, error: 'Professional account not found.' }
  }

  const existing = list[index]
  const updated = {
    ...existing,
    ...fullData,
    onboardingCompleted: true,
    verificationStatus: 'Pending Verification',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  list[index] = updated
  saveProfessionals(list)

  // Update current session
  const current = getCurrentProfessional()
  if (current?.id === professionalId) {
    updateCurrentProfessional(updated)
  }

  // Clear draft
  clearDraftOnboarding(professionalId)

  return {
    success: true,
    professional: updated,
    message: 'Onboarding completed successfully! Your profile is now under review.',
  }
}

/**
 * Simulate document upload by adding a document record.
 */
export function simulateDocumentUpload(professionalId, { name, size, type = 'qualification' }) {
  const doc = {
    id: `doc_${generateId()}`,
    name: name || 'Document.pdf',
    size: size || '1.5 MB',
    type,
    uploadedAt: new Date().toISOString(),
    status: 'Uploaded',
  }
  return doc
}

/**
 * Update professional profile details and persist changes.
 */
export function updateProfessionalProfile(professionalId, updatedFields) {
  const list = getProfessionals()
  const index = list.findIndex((p) => p.id === professionalId)

  if (index === -1) {
    return { success: false, error: 'Professional not found.' }
  }

  const existing = list[index]
  const updated = {
    ...existing,
    ...updatedFields,
    updatedAt: new Date().toISOString(),
  }

  list[index] = updated
  saveProfessionals(list)

  // Update current session if matching
  const current = getCurrentProfessional()
  if (current?.id === professionalId) {
    updateCurrentProfessional(updated)
  }

  return {
    success: true,
    professional: updated,
    message: 'Profile updated successfully!',
  }
}

