// professionalConsultationService.js
// Supabase-backed consultation preferences, weekly availability (`professional_availability`),
// date overrides, slot generation, appointments (`appointments` + `consultations`),
// earnings summary, and payout configuration for FitKey professionals.

import { supabase } from '../../lib/supabase.js'
import {
  getItem,
  setItem,
  STORAGE_KEYS,
} from '../storageService.js'

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon', dow: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', dow: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', dow: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', dow: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', dow: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', dow: 6 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', dow: 0 },
]

const DOW_TO_KEY = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

const KEY_TO_DOW = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export const DURATION_OPTIONS = [15, 20, 30]
export const BUFFER_OPTIONS = [0, 5, 10]
export const MIN_CONSULTATION_FEE = 100
export const CONSULTATION_TYPES = ['phone']

export const DEFAULT_SCHEDULE = {
  monday: { enabled: true, startTime: '10:00', endTime: '18:00' },
  tuesday: { enabled: true, startTime: '10:00', endTime: '18:00' },
  wednesday: { enabled: true, startTime: '10:00', endTime: '18:00' },
  thursday: { enabled: true, startTime: '10:00', endTime: '18:00' },
  friday: { enabled: true, startTime: '10:00', endTime: '16:00' },
  saturday: { enabled: true, startTime: '11:00', endTime: '15:00' },
  sunday: { enabled: false, startTime: '10:00', endTime: '13:00' },
}

export const DEFAULT_CONSULTATION_SETTINGS = {
  consultationsEnabled: false,
  offerPhoneConsultations: true,
  consultationTypes: ['phone'],
  consultationFee: 500,
  durationMinutes: 20,
  bufferMinutes: 5,
  timezone: 'Asia/Kolkata',
  schedule: DEFAULT_SCHEDULE,
  blockedDates: [],
  dateOverrides: {},
  blockedSlots: [],
  consultationPhone: '',
  consentPhoneSharing: false,
  payoutSetupStatus: 'pending',
  preferredPayoutMethod: 'upi',
  payoutUpiId: '',
  accountHolderName: '',
  bankName: '',
  accountNumberMasked: '',
  ifscCode: '',
  configuredAt: null,
  updatedAt: null,
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

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

  for (let attempt = 0; attempt < 25; attempt++) {
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

async function assertSession(expectedProfessionalId = null) {
  const { data, error } = await supabase.auth.getSession()
  const user = data?.session?.user
  if (error || !user?.id) {
    return { ok: false, error: 'Your session expired. Please sign in again.' }
  }
  if (expectedProfessionalId && user.id !== expectedProfessionalId) {
    return { ok: false, error: 'Unauthorized: you can only modify your own consultation data.' }
  }
  return { ok: true, user }
}

function parseMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = String(timeStr).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function formatMinutesTo24(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatMinutesTo12(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

function trimTimeToHHMM(timeStr) {
  if (!timeStr) return '10:00'
  return String(timeStr).slice(0, 5)
}

function buildScheduleFromAvailabilityRows(rows) {
  const schedule = {}
  for (const d of DAYS_OF_WEEK) {
    schedule[d.key] = { ...DEFAULT_SCHEDULE[d.key] }
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return schedule
  }

  // If rows exist in DB, treat days without active rows as disabled unless explicitly present
  for (const d of DAYS_OF_WEEK) {
    schedule[d.key] = {
      enabled: false,
      startTime: DEFAULT_SCHEDULE[d.key].startTime,
      endTime: DEFAULT_SCHEDULE[d.key].endTime,
    }
  }

  for (const row of rows) {
    const key = DOW_TO_KEY[Number(row.day_of_week)]
    if (!key) continue
    schedule[key] = {
      enabled: row.is_active !== false,
      startTime: trimTimeToHHMM(row.start_time),
      endTime: trimTimeToHHMM(row.end_time),
    }
  }
  return schedule
}

function normalizeSettingsFromDb(ppRow, availabilityRows = []) {
  const schedule = buildScheduleFromAvailabilityRows(availabilityRows)
  const isEnabled = Boolean(ppRow?.consultations_enabled)

  return {
    ...DEFAULT_CONSULTATION_SETTINGS,
    consultationsEnabled: isEnabled,
    isEnabled,
    offerPhoneConsultations: ppRow?.offer_phone_consultations ?? true,
    consultationTypes: Array.isArray(ppRow?.consultation_types) && ppRow.consultation_types.length > 0
      ? ppRow.consultation_types
      : ['phone'],
    consultationFee: ppRow?.consultation_fee != null ? Number(ppRow.consultation_fee) : 500,
    durationMinutes: ppRow?.duration_minutes != null ? Number(ppRow.duration_minutes) : 20,
    bufferMinutes: ppRow?.buffer_minutes != null ? Number(ppRow.buffer_minutes) : 5,
    timezone: ppRow?.timezone || 'Asia/Kolkata',
    schedule,
    blockedDates: Array.isArray(ppRow?.blocked_dates) ? [...ppRow.blocked_dates] : [],
    dateOverrides: ppRow?.date_overrides && typeof ppRow.date_overrides === 'object' ? ppRow.date_overrides : {},
    blockedSlots: Array.isArray(ppRow?.blocked_slots) ? [...ppRow.blocked_slots] : [],
    consultationPhone: ppRow?.consultation_phone || '',
    contactPhone: ppRow?.consultation_phone || '',
    consentPhoneSharing: Boolean(ppRow?.consent_phone_sharing),
    phoneConsent: Boolean(ppRow?.consent_phone_sharing),
    payoutSetupStatus: ppRow?.payout_setup_status || 'pending',
    preferredPayoutMethod: ppRow?.preferred_payout_method || 'upi',
    payoutUpiId: ppRow?.payout_upi_id || '',
    accountHolderName: ppRow?.account_holder_name || '',
    bankName: ppRow?.bank_name || '',
    accountNumberMasked: ppRow?.account_number_masked || '',
    ifscCode: ppRow?.ifsc_code || '',
    configuredAt: ppRow?.configured_at || null,
    updatedAt: ppRow?.updated_at || null,
  }
}

function cacheSettings(professionalId, settings) {
  if (!professionalId || !settings) return
  const all = getItem(STORAGE_KEYS.PROF_CONSULTATION_SETTINGS, {})
  all[professionalId] = settings
  setItem(STORAGE_KEYS.PROF_CONSULTATION_SETTINGS, all)
}

function cacheAppointments(professionalId, list) {
  if (!professionalId || !Array.isArray(list)) return
  const existing = getItem(STORAGE_KEYS.PROF_APPOINTMENTS, [])
  const others = Array.isArray(existing)
    ? existing.filter((a) => a.professionalId !== professionalId)
    : []
  setItem(STORAGE_KEYS.PROF_APPOINTMENTS, [...list, ...others])
}

export function validateScheduleSlots(schedule) {
  if (!schedule || typeof schedule !== 'object') {
    return { valid: true }
  }
  for (const d of DAYS_OF_WEEK) {
    const dayCfg = schedule[d.key]
    if (!dayCfg || !dayCfg.enabled) continue
    const startMin = parseMinutes(dayCfg.startTime)
    const endMin = parseMinutes(dayCfg.endTime)
    if (endMin <= startMin) {
      return {
        valid: false,
        error: `${d.label}: End time (${dayCfg.endTime}) must be after start time (${dayCfg.startTime}).`,
      }
    }
  }
  return { valid: true }
}

// ─── Settings API ────────────────────────────────────────────────────────────

/**
 * Synchronous cache getter for legacy / user-side discovery callers.
 */
export function getConsultationSettings(professionalId) {
  if (!professionalId) return { ...DEFAULT_CONSULTATION_SETTINGS, schedule: { ...DEFAULT_SCHEDULE } }
  const all = getItem(STORAGE_KEYS.PROF_CONSULTATION_SETTINGS, {})
  const found = all?.[professionalId]
  if (!found) {
    return {
      ...DEFAULT_CONSULTATION_SETTINGS,
      schedule: { ...DEFAULT_SCHEDULE },
      blockedDates: [],
      dateOverrides: {},
      blockedSlots: [],
    }
  }
  return {
    ...DEFAULT_CONSULTATION_SETTINGS,
    ...found,
    schedule: {
      ...DEFAULT_SCHEDULE,
      ...(found.schedule || {}),
    },
    blockedDates: Array.isArray(found.blockedDates) ? [...found.blockedDates] : [],
    dateOverrides: found.dateOverrides || {},
    blockedSlots: Array.isArray(found.blockedSlots) ? [...found.blockedSlots] : [],
  }
}

/**
 * Authoritative async fetcher for consultation settings & weekly availability from Supabase.
 */
export async function fetchConsultationSettings(professionalId = null) {
  const authCheck = await assertSession(professionalId)
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error, settings: getConsultationSettings(professionalId) }
  }

  const userId = authCheck.user.id
  const [ppRes, availRes] = await Promise.all([
    supabase.from('professional_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('professional_availability').select('*').eq('professional_id', userId),
  ])

  if (ppRes.error) {
    return {
      success: false,
      error: ppRes.error.message || 'Failed to load consultation settings.',
      settings: getConsultationSettings(userId),
    }
  }

  if (availRes.error) {
    return {
      success: false,
      error: availRes.error.message || 'Failed to load weekly availability.',
      settings: getConsultationSettings(userId),
    }
  }

  const normalized = normalizeSettingsFromDb(ppRes.data || {}, availRes.data || [])
  cacheSettings(userId, normalized)
  return { success: true, settings: normalized }
}

/**
 * Persist consultation settings & weekly availability (`professional_availability`) to Supabase.
 */
export async function saveConsultationSettings(professionalId, updates = {}) {
  const authCheck = await assertSession(professionalId)
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error }
  }
  const userId = authCheck.user.id

  const currentRes = await fetchConsultationSettings(userId)
  if (!currentRes.success) return currentRes
  const current = currentRes.settings || getConsultationSettings(userId)

  if (updates.consultationFee !== undefined) {
    const feeNum = Number(updates.consultationFee)
    if (Number.isNaN(feeNum) || feeNum < MIN_CONSULTATION_FEE) {
      return {
        success: false,
        error: `Consultation fee must be at least ₹${MIN_CONSULTATION_FEE}.`,
      }
    }
  }

  if (updates.durationMinutes !== undefined) {
    if (!DURATION_OPTIONS.includes(Number(updates.durationMinutes))) {
      return {
        success: false,
        error: 'Consultation duration must be 15, 20, or 30 minutes.',
      }
    }
  }

  if (updates.bufferMinutes !== undefined) {
    if (!BUFFER_OPTIONS.includes(Number(updates.bufferMinutes))) {
      return {
        success: false,
        error: 'Buffer time must be 0, 5, or 10 minutes.',
      }
    }
  }

  if (updates.schedule !== undefined) {
    const schedCheck = validateScheduleSlots(updates.schedule)
    if (!schedCheck.valid) {
      return { success: false, error: schedCheck.error }
    }
  }

  const resolvedEnabled = updates.consultationsEnabled !== undefined
    ? Boolean(updates.consultationsEnabled)
    : updates.isEnabled !== undefined
      ? Boolean(updates.isEnabled)
      : current.consultationsEnabled

  const resolvedPhone = updates.consultationPhone !== undefined
    ? String(updates.consultationPhone || '').trim()
    : updates.contactPhone !== undefined
      ? String(updates.contactPhone || '').trim()
      : current.consultationPhone

  if (resolvedEnabled && resolvedPhone && resolvedPhone.replace(/\D/g, '').length < 10) {
    return {
      success: false,
      error: 'Please provide a valid 10-digit consultation phone number.',
    }
  }

  const resolvedConsent = updates.consentPhoneSharing !== undefined
    ? Boolean(updates.consentPhoneSharing)
    : updates.phoneConsent !== undefined
      ? Boolean(updates.phoneConsent)
      : current.consentPhoneSharing

  const merged = {
    ...current,
    ...updates,
    consultationsEnabled: resolvedEnabled,
    isEnabled: resolvedEnabled,
    consultationPhone: resolvedPhone,
    contactPhone: resolvedPhone,
    consentPhoneSharing: resolvedConsent,
    phoneConsent: resolvedConsent,
    configuredAt: current.configuredAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Handle nested payoutDetails if passed from older modal forms
  if (updates.payoutDetails && typeof updates.payoutDetails === 'object') {
    if (updates.payoutDetails.method) merged.preferredPayoutMethod = updates.payoutDetails.method
    if (updates.payoutDetails.upiId !== undefined) merged.payoutUpiId = updates.payoutDetails.upiId
    if (updates.payoutDetails.bankName !== undefined) merged.bankName = updates.payoutDetails.bankName
    if (updates.payoutDetails.accountHolderName !== undefined) {
      merged.accountHolderName = updates.payoutDetails.accountHolderName
    }
    if (updates.payoutDetails.ifscCode !== undefined) merged.ifscCode = updates.payoutDetails.ifscCode
  }

  const ppPayload = {
    user_id: userId,
    consultations_enabled: Boolean(merged.consultationsEnabled),
    offer_phone_consultations: Boolean(merged.offerPhoneConsultations),
    consultation_types: Array.isArray(merged.consultationTypes) && merged.consultationTypes.length > 0
      ? merged.consultationTypes
      : ['phone'],
    consultation_fee: Number(merged.consultationFee) || 500,
    duration_minutes: Number(merged.durationMinutes) || 20,
    buffer_minutes: Number.isFinite(Number(merged.bufferMinutes)) ? Number(merged.bufferMinutes) : 5,
    timezone: merged.timezone || 'Asia/Kolkata',
    blocked_dates: Array.isArray(merged.blockedDates) ? merged.blockedDates : [],
    date_overrides: merged.dateOverrides || {},
    blocked_slots: Array.isArray(merged.blockedSlots) ? merged.blockedSlots : [],
    consultation_phone: merged.consultationPhone || null,
    consent_phone_sharing: Boolean(merged.consentPhoneSharing),
    payout_setup_status: merged.payoutSetupStatus || 'pending',
    preferred_payout_method: merged.preferredPayoutMethod || 'upi',
    payout_upi_id: merged.payoutUpiId || null,
    account_holder_name: merged.accountHolderName || null,
    bank_name: merged.bankName || null,
    account_number_masked: merged.accountNumberMasked || null,
    ifsc_code: merged.ifscCode || null,
    configured_at: merged.configuredAt,
    updated_at: merged.updatedAt,
  }

  const ppWrite = await runSchemaResilientMutation(ppPayload, (clean) =>
    supabase.from('professional_profiles').upsert(clean, { onConflict: 'user_id' })
  )

  if (ppWrite.error) {
    return {
      success: false,
      error: ppWrite.error.message || 'Failed to save consultation settings.',
    }
  }

  // Sync weekly schedule to `public.professional_availability` if schedule was updated or not yet seeded
  if (updates.schedule !== undefined || !current.configuredAt) {
    const slotRows = DAYS_OF_WEEK.map((d) => {
      const cfg = merged.schedule?.[d.key] || DEFAULT_SCHEDULE[d.key]
      return {
        day_of_week: KEY_TO_DOW[d.key],
        start_time: cfg.startTime || '10:00',
        end_time: cfg.endTime || '18:00',
        is_active: Boolean(cfg.enabled),
      }
    })

    const rpcRes = await supabase.rpc('upsert_professional_availability_schedule', {
      p_slots: slotRows,
    })

    if (rpcRes.error) {
      // Fallback if RPC isn't deployed yet: scoped delete + insert under RLS
      const delRes = await supabase
        .from('professional_availability')
        .delete()
        .eq('professional_id', userId)

      if (delRes.error) {
        return {
          success: false,
          error: delRes.error.message || 'Failed to update availability schedule.',
        }
      }

      const insertRows = slotRows.map((s) => ({
        professional_id: userId,
        ...s,
      }))
      const insRes = await supabase.from('professional_availability').insert(insertRows)
      if (insRes.error) {
        return {
          success: false,
          error: insRes.error.message || 'Failed to save availability slots.',
        }
      }
    }
  }

  cacheSettings(userId, merged)
  return {
    success: true,
    settings: merged,
    message: 'Consultation settings saved successfully!',
  }
}

export async function toggleConsultationStatus(professionalId) {
  const currentRes = await fetchConsultationSettings(professionalId)
  if (!currentRes.success) return currentRes
  return saveConsultationSettings(professionalId, {
    consultationsEnabled: !currentRes.settings.consultationsEnabled,
  })
}

// ─── Blocked Dates & Date-Specific Overrides ─────────────────────────────────

export async function addBlockedDate(professionalId, dateString) {
  if (!dateString) return { success: false, error: 'Date is required.' }
  const currentRes = await fetchConsultationSettings(professionalId)
  if (!currentRes.success) return currentRes
  const existing = currentRes.settings.blockedDates || []
  if (existing.includes(dateString)) {
    return { success: false, error: 'This date is already blocked.' }
  }
  const updated = [...existing, dateString].sort()
  return saveConsultationSettings(professionalId, { blockedDates: updated })
}

export async function removeBlockedDate(professionalId, dateString) {
  const currentRes = await fetchConsultationSettings(professionalId)
  if (!currentRes.success) return currentRes
  const existing = currentRes.settings.blockedDates || []
  const updated = existing.filter((d) => d !== dateString)
  return saveConsultationSettings(professionalId, { blockedDates: updated })
}

export async function setDateOverride(professionalId, dateString, overrideConfig) {
  if (!dateString) return { success: false, error: 'Date is required.' }

  if (!overrideConfig?.unavailable) {
    const startMin = parseMinutes(overrideConfig?.startTime || '10:00')
    const endMin = parseMinutes(overrideConfig?.endTime || '18:00')
    if (endMin <= startMin) {
      return { success: false, error: 'End time must be after start time.' }
    }
  }

  const currentRes = await fetchConsultationSettings(professionalId)
  if (!currentRes.success) return currentRes
  const dateOverrides = { ...(currentRes.settings.dateOverrides || {}) }

  dateOverrides[dateString] = {
    unavailable: Boolean(overrideConfig.unavailable),
    startTime: overrideConfig.startTime || '10:00',
    endTime: overrideConfig.endTime || '18:00',
    reason: overrideConfig.reason || 'Custom schedule for this date',
    updatedAt: new Date().toISOString(),
  }

  return saveConsultationSettings(professionalId, { dateOverrides })
}

export async function removeDateOverride(professionalId, dateString) {
  const currentRes = await fetchConsultationSettings(professionalId)
  if (!currentRes.success) return currentRes
  const dateOverrides = { ...(currentRes.settings.dateOverrides || {}) }
  delete dateOverrides[dateString]
  return saveConsultationSettings(professionalId, { dateOverrides })
}

export async function toggleSlotBlock(professionalId, dateString, time24) {
  const slotKey = `${dateString}_${time24}`
  const currentRes = await fetchConsultationSettings(professionalId)
  if (!currentRes.success) return currentRes
  const existing = currentRes.settings.blockedSlots || []

  let updated
  let isBlockedNow = false
  if (existing.includes(slotKey)) {
    updated = existing.filter((s) => s !== slotKey)
  } else {
    updated = [...existing, slotKey]
    isBlockedNow = true
  }

  const res = await saveConsultationSettings(professionalId, { blockedSlots: updated })
  return {
    ...res,
    slotKey,
    isBlocked: isBlockedNow,
  }
}

// ─── Slot Generation Engine ──────────────────────────────────────────────────

export function generateDaySlots(professionalId, dateString, preloaded = {}) {
  const settings = preloaded.settings || getConsultationSettings(professionalId)
  const appointments = preloaded.appointments || getAppointments(professionalId)

  const [year, month, day] = dateString.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayIndex = dateObj.getDay()
  const dayKey = DOW_TO_KEY[dayIndex]
  const dayLabel = DAYS_OF_WEEK.find((d) => d.key === dayKey)?.label || dayKey

  const isDateInBlocked = (settings.blockedDates || []).includes(dateString)
  const dateOverride = (settings.dateOverrides || {})[dateString]
  const isOverrideUnavailable = dateOverride?.unavailable === true

  if (isDateInBlocked || isOverrideUnavailable) {
    return {
      date: dateString,
      dayKey,
      dayLabel,
      isBlockedDate: true,
      isOffDay: false,
      reason: isOverrideUnavailable
        ? (dateOverride.reason || 'Marked unavailable for this date')
        : 'Marked unavailable on calendar',
      slots: [],
      stats: { total: 0, available: 0, booked: 0, blocked: 0 },
    }
  }

  const regularSchedule = settings.schedule?.[dayKey]
  const hasCustomHours = Boolean(dateOverride?.startTime && dateOverride?.endTime)

  if (!hasCustomHours && !regularSchedule?.enabled) {
    return {
      date: dateString,
      dayKey,
      dayLabel,
      isBlockedDate: false,
      isOffDay: true,
      reason: 'Regular day off',
      slots: [],
      stats: { total: 0, available: 0, booked: 0, blocked: 0 },
    }
  }

  const startTime = hasCustomHours ? dateOverride.startTime : regularSchedule.startTime
  const endTime = hasCustomHours ? dateOverride.endTime : regularSchedule.endTime

  const duration = Number(settings.durationMinutes) || 20
  const buffer = Number.isFinite(Number(settings.bufferMinutes)) ? Number(settings.bufferMinutes) : 5
  const step = duration + buffer

  const startMin = parseMinutes(startTime)
  const endMin = parseMinutes(endTime)

  const dayAppointments = appointments.filter(
    (a) =>
      a.date === dateString &&
      (a.status === 'upcoming' || a.status === 'confirmed' || a.status === 'in_progress' || a.status === 'completed')
  )

  const slots = []
  let currMin = startMin

  while (currMin + duration <= endMin) {
    const slotEndMin = currMin + duration
    const time24 = formatMinutesTo24(currMin)
    const time12 = formatMinutesTo12(currMin)
    const endTime24 = formatMinutesTo24(slotEndMin)
    const endTime12 = formatMinutesTo12(slotEndMin)
    const slotKey = `${dateString}_${time24}`

    const matchedApt = dayAppointments.find((a) => {
      if (a.time24 && a.time24 === time24) return true
      if (a.time && (a.time === time12 || a.time.replace(/^0/, '') === time12.replace(/^0/, ''))) return true
      if (a.time24) {
        const aMin = parseMinutes(a.time24)
        if (aMin >= currMin && aMin < currMin + duration) return true
      }
      return false
    })

    const isSlotBlocked = (settings.blockedSlots || []).includes(slotKey)

    let status = 'available'
    let reason = null
    if (matchedApt) {
      status = 'booked'
      reason = `Booked with ${matchedApt.patientName}`
    } else if (isSlotBlocked) {
      status = 'blocked'
      reason = 'Blocked by professional'
    }

    slots.push({
      id: slotKey,
      date: dateString,
      time24,
      time12,
      endTime24,
      endTime12,
      label: `${time12} – ${endTime12}`,
      durationMinutes: duration,
      bufferMinutes: buffer,
      status,
      reason,
      appointment: matchedApt || null,
    })

    currMin += step
  }

  const stats = {
    total: slots.length,
    available: slots.filter((s) => s.status === 'available').length,
    booked: slots.filter((s) => s.status === 'booked').length,
    blocked: slots.filter((s) => s.status === 'blocked').length,
  }

  return {
    date: dateString,
    dayKey,
    dayLabel,
    isBlockedDate: false,
    isOffDay: false,
    hasCustomHours,
    startTime,
    endTime,
    timezone: settings.timezone || 'Asia/Kolkata',
    slots,
    stats,
  }
}

export function generateWeekSlots(professionalId, mondayDateString, preloaded = {}) {
  const [year, month, day] = mondayDateString.split('-').map(Number)
  const mondayObj = new Date(year, month - 1, day)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayObj)
    d.setDate(mondayObj.getDate() + i)
    const yStr = d.getFullYear()
    const mStr = String(d.getMonth() + 1).padStart(2, '0')
    const dStr = String(d.getDate()).padStart(2, '0')
    const dateStr = `${yStr}-${mStr}-${dStr}`
    days.push(generateDaySlots(professionalId, dateStr, preloaded))
  }
  return days
}

export function generateMonthSummary(professionalId, year, month, preloaded = {}) {
  const numDays = new Date(year, month, 0).getDate()
  const days = []

  for (let i = 1; i <= numDays; i++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const dayData = generateDaySlots(professionalId, dStr, preloaded)
    days.push({
      date: dStr,
      dayNumber: i,
      dayKey: dayData.dayKey,
      dayLabel: dayData.dayLabel,
      isBlockedDate: dayData.isBlockedDate,
      isOffDay: dayData.isOffDay,
      hasCustomHours: dayData.hasCustomHours,
      stats: dayData.stats,
    })
  }
  return days
}

// ─── Appointments & Consultations API ────────────────────────────────────────

function normalizeAppointmentRow(row, consultationRow = null, patientProfile = null) {
  const time24 = row.start_time ? trimTimeToHHMM(row.start_time) : '10:00'
  const startMin = parseMinutes(time24)
  const time12 = formatMinutesTo12(startMin)

  const rawStatus = String(row.status || 'upcoming').toLowerCase()
  const status = rawStatus === 'confirmed' ? 'upcoming' : rawStatus

  return {
    id: row.id,
    professionalId: row.professional_id,
    userId: row.user_id,
    patientName: row.patient_name || patientProfile?.full_name || 'Patient',
    patientPhone: row.phone_consented ? (row.patient_phone || patientProfile?.phone || '') : '',
    phoneConsented: Boolean(row.phone_consented),
    patientAge: row.patient_age ?? '—',
    patientGender: row.patient_gender || '—',
    date: row.appointment_date ? String(row.appointment_date).slice(0, 10) : '',
    time: time12,
    time24,
    endTime24: row.end_time ? trimTimeToHHMM(row.end_time) : formatMinutesTo24(startMin + (Number(row.duration_minutes) || 20)),
    durationMinutes: Number(row.duration_minutes || consultationRow?.duration_minutes || 20),
    type: row.consultation_type || consultationRow?.consultation_type || 'Phone Consultation',
    fee: Number(row.fee ?? consultationRow?.fee ?? 0),
    status,
    rawStatus,
    consultationId: consultationRow?.id || null,
    consultationStatus: consultationRow?.status || null,
    paymentStatus: consultationRow?.payment_status || 'pending',
    notes: row.notes || consultationRow?.notes || '',
    healthDetails: row.health_details && typeof row.health_details === 'object' ? row.health_details : {},
    cancellationReason: row.cancellation_reason || null,
    bookedAt: row.booked_at || row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

/**
 * Synchronous cache getter for backward compatibility.
 */
export function getAppointments(professionalId, { status = 'all' } = {}) {
  if (!professionalId) return []
  const all = getItem(STORAGE_KEYS.PROF_APPOINTMENTS, [])
  let list = Array.isArray(all) ? all.filter((a) => a.professionalId === professionalId) : []

  if (status && status !== 'all') {
    const target = status.toLowerCase()
    list = list.filter((a) => a.status === target || (target === 'upcoming' && a.rawStatus === 'confirmed'))
  }

  if (status === 'upcoming') {
    return list.sort((a, b) => new Date(`${a.date} ${a.time24 || a.time}`) - new Date(`${b.date} ${b.time24 || b.time}`))
  }
  return list.sort((a, b) => new Date(`${b.date} ${b.time24 || b.time}`) - new Date(`${a.date} ${a.time24 || a.time}`))
}

/**
 * Authoritative async fetcher for appointments & linked consultations from Supabase.
 */
export async function fetchAppointments(professionalId, { status = 'all' } = {}) {
  const authCheck = await assertSession(professionalId)
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error, appointments: [] }
  }
  const userId = authCheck.user.id

  const [aptRes, consultRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('*')
      .eq('professional_id', userId)
      .order('appointment_date', { ascending: status === 'upcoming' }),
    supabase
      .from('consultations')
      .select('*')
      .eq('professional_id', userId),
  ])

  if (aptRes.error) {
    return {
      success: false,
      error: aptRes.error.message || 'Failed to load appointments.',
      appointments: [],
    }
  }

  if (consultRes.error) {
    return {
      success: false,
      error: consultRes.error.message || 'Failed to load consultation records.',
      appointments: [],
    }
  }

  const consultByApt = new Map()
  for (const c of consultRes.data || []) {
    if (c.appointment_id) consultByApt.set(c.appointment_id, c)
  }

  const normalizedAll = (aptRes.data || []).map((row) =>
    normalizeAppointmentRow(row, consultByApt.get(row.id) || null, null)
  )

  cacheAppointments(userId, normalizedAll)

  let filtered = normalizedAll
  if (status && status !== 'all') {
    const target = status.toLowerCase()
    filtered = normalizedAll.filter(
      (a) => a.status === target || (target === 'upcoming' && a.rawStatus === 'confirmed')
    )
  }

  if (status === 'upcoming') {
    filtered.sort((a, b) => new Date(`${a.date} ${a.time24}`) - new Date(`${b.date} ${b.time24}`))
  } else {
    filtered.sort((a, b) => new Date(`${b.date} ${b.time24}`) - new Date(`${a.date} ${a.time24}`))
  }

  return { success: true, appointments: filtered }
}

/**
 * Cancel appointment as patient via `cancel_patient_appointment` RPC.
 */
export async function cancelPatientAppointment(appointmentId, reason = null) {
  const session = await supabase.auth.getSession()
  const user = session?.data?.session?.user
  if (!user?.id) {
    return { success: false, error: 'Not authenticated.' }
  }

  const rpcRes = await supabase.rpc('cancel_patient_appointment', {
    p_appointment_id: appointmentId,
    p_reason: reason || 'Cancelled by patient',
  })

  if (!rpcRes.error && rpcRes.data) {
    if (rpcRes.data.success === false) {
      return { success: false, error: rpcRes.data.error || 'Could not cancel appointment.' }
    }
    return { success: true, appointment: rpcRes.data.appointment }
  }

  return { success: false, error: rpcRes.error?.message || 'Failed to cancel appointment.' }
}

/**
 * Update appointment status atomically via Supabase RPC `update_professional_appointment_status`,
 * keeping `appointments` and `consultations` synchronized and enforcing `auth.uid() = professional_id`.
 */
export async function updateAppointmentStatus(appointmentId, professionalId, newStatus, reason = null, notes = null) {
  const authCheck = await assertSession(professionalId)
  if (!authCheck.ok) {
    if (newStatus === 'cancelled') {
      return cancelPatientAppointment(appointmentId, reason)
    }
    return { success: false, error: authCheck.error }
  }
  const userId = authCheck.user.id

  const rpcRes = await supabase.rpc('update_professional_appointment_status', {
    p_appointment_id: appointmentId,
    p_new_status: newStatus,
    p_reason: reason,
    p_notes: notes,
  })

  if (!rpcRes.error && rpcRes.data) {
    if (rpcRes.data.success === false) {
      return { success: false, error: rpcRes.data.error || 'Could not update appointment.' }
    }
    const refreshed = await fetchAppointments(userId)
    const updated = refreshed.appointments?.find((a) => a.id === appointmentId) || null
    return { success: true, appointment: updated }
  }

  // Fallback if RPC not yet deployed: direct RLS-scoped update on appointments
  const { data: existing, error: fetchErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('professional_id', userId)
    .maybeSingle()

  if (fetchErr || !existing) {
    return { success: false, error: fetchErr?.message || 'Appointment not found or unauthorized.' }
  }

  const updatePatch = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }
  if (newStatus === 'cancelled') {
    updatePatch.cancellation_reason = reason || 'Cancelled by practitioner'
  }
  if (notes) {
    updatePatch.notes = notes
  }

  const { error: updErr } = await supabase
    .from('appointments')
    .update(updatePatch)
    .eq('id', appointmentId)
    .eq('professional_id', userId)

  if (updErr) {
    return { success: false, error: updErr.message || 'Failed to update appointment.' }
  }

  const refreshed = await fetchAppointments(userId)
  const updated = refreshed.appointments?.find((a) => a.id === appointmentId) || null
  return { success: true, appointment: updated }
}

// ─── Earnings & Payment API ──────────────────────────────────────────────────

export function getEarningsSummary(professionalId, preloadedAppointments = null) {
  const appointments = Array.isArray(preloadedAppointments)
    ? preloadedAppointments
    : getAppointments(professionalId)

  const completed = appointments.filter((a) => a.status === 'completed')
  const totalCompletedCount = completed.length
  const grossEarnings = completed.reduce((sum, a) => sum + (Number(a.fee) || 0), 0)
  const platformFee = Math.round(grossEarnings * 0.1)
  const netEarnings = grossEarnings - platformFee

  // Preserve real payment_status if present instead of inventing paid payouts
  const settledCompleted = completed.filter((a) => a.paymentStatus === 'paid' || a.paymentStatus === 'settled')
  const settledNet = settledCompleted.reduce((sum, a) => sum + Math.round((Number(a.fee) || 0) * 0.9), 0)
  const pendingPayout = Math.max(0, netEarnings - settledNet)

  const history = completed.map((apt) => {
    const feeNum = Number(apt.fee) || 0
    const net = Math.round(feeNum * 0.9)
    return {
      id: `earn_${apt.id}`,
      appointmentId: apt.id,
      patientName: apt.patientName,
      date: apt.date,
      grossFee: feeNum,
      platformFee: Math.round(feeNum * 0.1),
      netEarned: net,
      status: apt.paymentStatus === 'paid' || apt.paymentStatus === 'settled' ? 'Settled' : 'Pending Settlement',
      payoutMethod: 'Direct Bank Transfer / UPI',
    }
  })

  return {
    totalConsultations: appointments.length,
    completedCount: totalCompletedCount,
    upcomingCount: appointments.filter((a) => a.status === 'upcoming').length,
    cancelledCount: appointments.filter((a) => a.status === 'cancelled').length,
    noShowCount: appointments.filter((a) => a.status === 'no_show').length,
    grossEarnings,
    platformFee,
    netEarnings,
    pendingPayout,
    completedPayouts: settledNet,
    history,
  }
}

export async function fetchEarningsSummary(professionalId) {
  const res = await fetchAppointments(professionalId)
  if (!res.success) {
    return { success: false, error: res.error, summary: getEarningsSummary(professionalId, []) }
  }
  return {
    success: true,
    summary: getEarningsSummary(professionalId, res.appointments),
  }
}

export function getPayoutSettings(professionalId) {
  const settings = getConsultationSettings(professionalId)
  return {
    payoutSetupStatus: settings.payoutSetupStatus || 'pending',
    preferredPayoutMethod: settings.preferredPayoutMethod || 'upi',
    payoutUpiId: settings.payoutUpiId || '',
    accountHolderName: settings.accountHolderName || '',
    bankName: settings.bankName || '',
    accountNumberMasked: settings.accountNumberMasked || '',
    ifscCode: settings.ifscCode || '',
    updatedAt: settings.updatedAt || null,
  }
}

export async function fetchPayoutSettings(professionalId) {
  const res = await fetchConsultationSettings(professionalId)
  const s = res.settings || getConsultationSettings(professionalId)
  return {
    success: res.success,
    error: res.error,
    payoutSettings: {
      payoutSetupStatus: s.payoutSetupStatus || 'pending',
      preferredPayoutMethod: s.preferredPayoutMethod || 'upi',
      payoutUpiId: s.payoutUpiId || '',
      accountHolderName: s.accountHolderName || '',
      bankName: s.bankName || '',
      accountNumberMasked: s.accountNumberMasked || '',
      ifscCode: s.ifscCode || '',
      updatedAt: s.updatedAt || null,
    },
  }
}

export async function savePayoutSettings(professionalId, payoutData) {
  const {
    preferredPayoutMethod,
    payoutUpiId,
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
  } = payoutData

  const updates = {
    preferredPayoutMethod: preferredPayoutMethod === 'bank_transfer' ? 'bank_transfer' : 'upi',
    payoutUpiId: (payoutUpiId || '').trim(),
    accountHolderName: (accountHolderName || '').trim(),
    bankName: (bankName || '').trim(),
    ifscCode: (ifscCode || '').trim().toUpperCase(),
    payoutSetupStatus: 'active',
  }

  if (accountNumber && accountNumber.trim().length >= 4) {
    const raw = accountNumber.trim()
    const last4 = raw.slice(-4)
    updates.accountNumberMasked = `•••• •••• ${last4}`
  }

  return saveConsultationSettings(professionalId, updates)
}
