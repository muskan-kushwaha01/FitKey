// professionalAuthService.js
// Authentication management for FitKey Professional Portal (localStorage-based demo auth).
// Designed for seamless transition to Supabase or backend API.

import {
  getItem,
  setItem,
  removeItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'

// Pre-seeded demo account for easy testing
const DEMO_PROFESSIONAL = {
  id: 'prof_demo_001',
  name: 'Dr. Ananya Sharma',
  email: 'dr.ananya@fitkey.com',
  password: 'password123',
  phone: '+91 98765 43210',
  photoUrl: '',
  bio: 'Cardiologist & Preventive Wellness Consultant with 10+ years of clinical practice.',
  profession: 'Doctor / Medical Practitioner',
  specialization: 'Cardiology & Preventive Medicine',
  qualifications: 'MBBS, MD (Medicine), DM (Cardiology)',
  yearsExperience: 10,
  licenseNumber: 'MCI-2014-98421',
  workplaceName: 'Metro Heart Institute & Wellness Center',
  workplaceAddress: 'Sector 44, Institutional Area',
  city: 'Gurugram',
  state: 'Haryana',
  clinicPhotoUrl: '',
  documents: [
    { id: 'doc-1', name: 'MD_Medical_Degree.pdf', size: '2.4 MB', uploadedAt: '2026-01-10' },
    { id: 'doc-2', name: 'MCI_State_Council_License.pdf', size: '1.1 MB', uploadedAt: '2026-01-10' },
  ],
  onboardingCompleted: true,
  verificationStatus: 'Pending Verification',
  createdAt: '2026-01-01T10:00:00.000Z',
}

/**
 * Retrieve all registered professionals from storage.
 */
export function getProfessionals() {
  const professionals = getItem(STORAGE_KEYS.PROFESSIONALS, null)
  if (!professionals) {
    const initial = [DEMO_PROFESSIONAL]
    setItem(STORAGE_KEYS.PROFESSIONALS, initial)
    return initial
  }
  return professionals
}

/**
 * Persist list of professionals to storage.
 */
export function saveProfessionals(list) {
  return setItem(STORAGE_KEYS.PROFESSIONALS, list)
}

/**
 * Get currently authenticated professional session.
 */
export function getCurrentProfessional() {
  return getItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, null)
}

/**
 * Register a new professional account.
 */
export function registerProfessional({ name, email, password, confirmPassword }) {
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

  const list = getProfessionals()
  const existing = list.find((p) => p.email.toLowerCase() === cleanEmail)
  if (existing) {
    return {
      success: false,
      error: 'An account with this email already exists. Please log in.',
    }
  }

  const newProfessional = {
    id: `prof_${generateId()}`,
    name: cleanName,
    email: cleanEmail,
    password: cleanPass,
    phone: '',
    photoUrl: '',
    bio: '',
    profession: '',
    specialization: '',
    qualifications: '',
    yearsExperience: '',
    licenseNumber: '',
    workplaceName: '',
    workplaceAddress: '',
    city: '',
    state: '',
    clinicPhotoUrl: '',
    documents: [],
    onboardingCompleted: false,
    verificationStatus: 'Pending Verification',
    createdAt: new Date().toISOString(),
  }

  list.push(newProfessional)
  saveProfessionals(list)

  // Set active session
  setItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, newProfessional)

  return {
    success: true,
    professional: newProfessional,
    message: 'Registration successful! Please complete your onboarding.',
  }
}

/**
 * Log in an existing professional.
 */
export function loginProfessional({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPass = (password || '').trim()

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Please provide both email and password.' }
  }

  const list = getProfessionals()
  const found = list.find(
    (p) => p.email.toLowerCase() === cleanEmail && p.password === cleanPass
  )

  if (!found) {
    return {
      success: false,
      error: 'Invalid email or password. Please verify your credentials.',
    }
  }

  // Set active session
  setItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, found)

  return {
    success: true,
    professional: found,
    message: `Welcome back, ${found.name}!`,
  }
}

/**
 * End the professional session.
 */
export function logoutProfessional() {
  removeItem(STORAGE_KEYS.CURRENT_PROFESSIONAL)
  return { success: true }
}

/**
 * Update the current professional profile data and synchronize with storage list.
 */
export function updateCurrentProfessional(updates) {
  const current = getCurrentProfessional()
  if (!current) return { success: false, error: 'No active session.' }

  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // Update in session
  setItem(STORAGE_KEYS.CURRENT_PROFESSIONAL, updated)

  // Update in master list
  const list = getProfessionals()
  const index = list.findIndex((p) => p.id === current.id)
  if (index >= 0) {
    list[index] = updated
  } else {
    list.push(updated)
  }
  saveProfessionals(list)

  return { success: true, professional: updated }
}
