// professionalConsultationService.js
// Handles consultation preferences, weekly schedule, availability, appointments,
// slot generation (day/week/month), date overrides, and payout configuration for FitKey professionals.
// Fully persistent via localStorage with defensive fallbacks.

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
]

export const DURATION_OPTIONS = [15, 20, 30]
export const BUFFER_OPTIONS = [0, 5, 10]
export const MIN_CONSULTATION_FEE = 100

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
  consultationFee: 500,
  durationMinutes: 20,
  bufferMinutes: 5,
  timezone: 'Asia/Kolkata',
  schedule: DEFAULT_SCHEDULE,
  blockedDates: [],
  dateOverrides: {}, // { 'YYYY-MM-DD': { unavailable: boolean, startTime?: string, endTime?: string, reason?: string } }
  blockedSlots: [],  // [ 'YYYY-MM-DD_10:00', ... ]
  consultationPhone: '',
  consentPhoneSharing: false,
  payoutSetupStatus: 'pending', // 'pending' | 'in_review' | 'active'
  preferredPayoutMethod: 'upi', // 'upi' | 'bank_transfer'
  payoutUpiId: '',
  accountHolderName: '',
  bankName: '',
  accountNumberMasked: '',
  ifscCode: '',
  configuredAt: null,
  updatedAt: null,
}

// Pre-seeded demo consultation data for Dr. Ananya Sharma (prof_demo_001)
const DEMO_CONSULTATION_SETTINGS = {
  prof_demo_001: {
    consultationsEnabled: true,
    offerPhoneConsultations: true,
    consultationFee: 650,
    durationMinutes: 20,
    bufferMinutes: 5,
    timezone: 'Asia/Kolkata',
    schedule: {
      monday: { enabled: true, startTime: '10:00', endTime: '18:00' },
      tuesday: { enabled: true, startTime: '10:00', endTime: '18:00' },
      wednesday: { enabled: true, startTime: '10:00', endTime: '18:00' },
      thursday: { enabled: true, startTime: '10:00', endTime: '18:00' },
      friday: { enabled: true, startTime: '10:00', endTime: '16:00' },
      saturday: { enabled: true, startTime: '11:00', endTime: '15:00' },
      sunday: { enabled: false, startTime: '10:00', endTime: '13:00' },
    },
    blockedDates: ['2026-12-25', '2027-01-01'],
    dateOverrides: {
      '2026-11-28': {
        unavailable: false,
        startTime: '14:00',
        endTime: '18:00',
        reason: 'Hospital clinical rounds in morning; afternoon slots open',
      },
    },
    blockedSlots: ['2026-11-25_14:30', '2026-11-26_11:15'],
    consultationPhone: '+91 98765 43210',
    consentPhoneSharing: true,
    payoutSetupStatus: 'active',
    preferredPayoutMethod: 'upi',
    payoutUpiId: 'ananya.sharma@okhdfcbank',
    accountHolderName: 'Dr. Ananya Sharma',
    bankName: 'HDFC Bank Ltd.',
    accountNumberMasked: '•••• •••• 4892',
    ifscCode: 'HDFC0001234',
    configuredAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-15T12:00:00.000Z',
  },
}

// Pre-seeded demo appointments with rich health details and user consent
const INITIAL_DEMO_APPOINTMENTS = [
  {
    id: 'apt_demo_001',
    professionalId: 'prof_demo_001',
    patientName: 'Vikram Malhotra',
    patientPhone: '+91 98111 22334',
    phoneConsented: true,
    patientAge: 42,
    patientGender: 'Male',
    date: '2026-11-25',
    time: '11:15 AM',
    time24: '11:15',
    durationMinutes: 20,
    type: 'Phone Consultation',
    fee: 650,
    status: 'upcoming', // 'upcoming' | 'completed' | 'cancelled' | 'no_show'
    notes: 'Follow-up on resting systolic BP variation and exercise tolerance.',
    healthDetails: {
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      currentMedications: ['Amlodipine 5mg OD', 'Atorvastatin 10mg'],
      medicalHistory: ['Essential Hypertension (3 years)', 'Family history of CAD'],
      chiefComplaint: 'Experiencing mild palpitations after evening cardio sessions.',
      sharedDocuments: ['Lipid_Panel_Oct2026.pdf', 'ECG_Baseline.pdf'],
    },
    cancellationReason: null,
    bookedAt: '2026-11-22T08:30:00.000Z',
  },
  {
    id: 'apt_demo_002',
    professionalId: 'prof_demo_001',
    patientName: 'Sunita Rao',
    patientPhone: '+91 98222 33445',
    phoneConsented: true,
    patientAge: 37,
    patientGender: 'Female',
    date: '2026-11-26',
    time: '04:15 PM',
    time24: '16:15',
    durationMinutes: 20,
    type: 'Phone Consultation',
    fee: 650,
    status: 'upcoming',
    notes: 'Dietary sodium reduction queries and heart rate recovery check.',
    healthDetails: {
      bloodGroup: 'B+',
      allergies: ['No known drug allergies (NKDA)'],
      currentMedications: ['Thyronorm 50mcg OD', 'Vitamin D3 weekly'],
      medicalHistory: ['Hypothyroidism (well-controlled)', 'Postpartum gestational diabetes history'],
      chiefComplaint: 'Seeking optimal heart rate zones for HIIT workout plan.',
      sharedDocuments: ['Thyroid_Profile_Nov2026.pdf'],
    },
    cancellationReason: null,
    bookedAt: '2026-11-22T14:15:00.000Z',
  },
  {
    id: 'apt_demo_003',
    professionalId: 'prof_demo_001',
    patientName: 'Rohan Mehra',
    patientPhone: '+91 98333 44556',
    phoneConsented: true,
    patientAge: 29,
    patientGender: 'Male',
    date: '2026-11-20',
    time: '02:00 PM',
    time24: '14:00',
    durationMinutes: 20,
    type: 'Phone Consultation',
    fee: 650,
    status: 'completed',
    notes: 'Prescribed 4-week aerobic progression with weekly BP checkup.',
    healthDetails: {
      bloodGroup: 'A+',
      allergies: ['Sulfa drugs'],
      currentMedications: ['None'],
      medicalHistory: ['Mild asthma in childhood (resolved)', 'Marathon runner'],
      chiefComplaint: 'Pre-marathon cardiovascular assessment.',
      sharedDocuments: ['Echo_Report_2026.pdf'],
    },
    cancellationReason: null,
    bookedAt: '2026-11-18T10:00:00.000Z',
  },
  {
    id: 'apt_demo_004',
    patientName: 'Kavita Joshi',
    patientPhone: '+91 98444 55667',
    phoneConsented: true,
    patientAge: 51,
    patientGender: 'Female',
    date: '2026-11-19',
    time: '12:30 PM',
    time24: '12:30',
    durationMinutes: 20,
    type: 'Phone Consultation',
    fee: 650,
    status: 'completed',
    notes: 'Consultation conducted. Electrolyte hydration guidance provided.',
    healthDetails: {
      bloodGroup: 'O-',
      allergies: ['Aspirin'],
      currentMedications: ['Metformin 500mg BD', 'Telmisartan 40mg'],
      medicalHistory: ['Type 2 Diabetes (6 yrs)', 'Hypertension'],
      chiefComplaint: 'Adjustment of medication timing around morning walks.',
      sharedDocuments: ['HbA1c_Oct2026.pdf'],
    },
    cancellationReason: null,
    bookedAt: '2026-11-17T11:20:00.000Z',
  },
  {
    id: 'apt_demo_005',
    professionalId: 'prof_demo_001',
    patientName: 'Deepak Verma',
    patientPhone: '+91 98555 66778',
    phoneConsented: true,
    patientAge: 45,
    patientGender: 'Male',
    date: '2026-11-15',
    time: '05:00 PM',
    time24: '17:00',
    durationMinutes: 20,
    type: 'Phone Consultation',
    fee: 650,
    status: 'cancelled',
    notes: 'Cancelled due to hospital duty conflict. Reschedule offered.',
    cancellationReason: 'Doctor emergency clinical duty at hospital',
    healthDetails: {
      bloodGroup: 'AB+',
      allergies: ['None'],
      currentMedications: ['Fish Oil 1000mg'],
      medicalHistory: ['High LDL cholesterol'],
      chiefComplaint: 'Lipid management lifestyle discussion.',
      sharedDocuments: [],
    },
    bookedAt: '2026-11-14T09:00:00.000Z',
  },
  {
    id: 'apt_demo_006',
    professionalId: 'prof_demo_001',
    patientName: 'Anita Sengupta',
    patientPhone: '+91 98666 77889',
    phoneConsented: false,
    patientAge: 34,
    patientGender: 'Female',
    date: '2026-11-12',
    time: '03:40 PM',
    time24: '15:40',
    durationMinutes: 20,
    type: 'Phone Consultation',
    fee: 650,
    status: 'no_show',
    notes: 'Patient did not answer the phone call after 3 scheduled attempts.',
    cancellationReason: null,
    healthDetails: {
      bloodGroup: 'B+',
      allergies: ['None'],
      currentMedications: ['Iron supplement'],
      medicalHistory: ['Mild anemia'],
      chiefComplaint: 'Post-workout fatigue and heart rate spike.',
      sharedDocuments: [],
    },
    bookedAt: '2026-11-10T16:00:00.000Z',
  },
]

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function getAllConsultationSettings() {
  const data = getItem(STORAGE_KEYS.PROF_CONSULTATION_SETTINGS, null)
  if (!data) {
    setItem(STORAGE_KEYS.PROF_CONSULTATION_SETTINGS, DEMO_CONSULTATION_SETTINGS)
    return DEMO_CONSULTATION_SETTINGS
  }
  return data
}

function saveAllConsultationSettings(map) {
  return setItem(STORAGE_KEYS.PROF_CONSULTATION_SETTINGS, map)
}

function getAllAppointments() {
  const data = getItem(STORAGE_KEYS.PROF_APPOINTMENTS, null)
  if (!data) {
    setItem(STORAGE_KEYS.PROF_APPOINTMENTS, INITIAL_DEMO_APPOINTMENTS)
    return INITIAL_DEMO_APPOINTMENTS
  }
  return data
}

function saveAllAppointments(list) {
  return setItem(STORAGE_KEYS.PROF_APPOINTMENTS, list)
}

// ─── Settings API ────────────────────────────────────────────────────────────

export function getConsultationSettings(professionalId) {
  if (!professionalId) return { ...DEFAULT_CONSULTATION_SETTINGS }
  const all = getAllConsultationSettings()
  const found = all[professionalId]

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

export function saveConsultationSettings(professionalId, updates) {
  if (!professionalId) {
    return { success: false, error: 'Professional ID is required.' }
  }

  const current = getConsultationSettings(professionalId)

  if (updates.consultationFee !== undefined) {
    const feeNum = Number(updates.consultationFee)
    if (isNaN(feeNum) || feeNum < MIN_CONSULTATION_FEE) {
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

  const willBeEnabled = updates.consultationsEnabled !== undefined
    ? Boolean(updates.consultationsEnabled)
    : current.consultationsEnabled

  const candidatePhone = updates.consultationPhone !== undefined
    ? String(updates.consultationPhone).trim()
    : current.consultationPhone

  if (willBeEnabled && candidatePhone && candidatePhone.replace(/\D/g, '').length < 10) {
    return {
      success: false,
      error: 'Please provide a valid 10-digit consultation phone number.',
    }
  }

  const updatedSettings = {
    ...current,
    ...updates,
    configuredAt: current.configuredAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const all = getAllConsultationSettings()
  all[professionalId] = updatedSettings
  saveAllConsultationSettings(all)

  return {
    success: true,
    settings: updatedSettings,
    message: 'Consultation settings saved successfully!',
  }
}

export function toggleConsultationStatus(professionalId) {
  const current = getConsultationSettings(professionalId)
  return saveConsultationSettings(professionalId, {
    consultationsEnabled: !current.consultationsEnabled,
  })
}

// ─── Blocked Dates & Date-Specific Overrides ─────────────────────────────────

export function addBlockedDate(professionalId, dateString, reason = 'Unavailable') {
  if (!dateString) return { success: false, error: 'Date is required.' }
  const current = getConsultationSettings(professionalId)
  const existing = current.blockedDates || []
  if (existing.includes(dateString)) {
    return { success: false, error: 'This date is already blocked.' }
  }

  const updated = [...existing, dateString].sort()
  return saveConsultationSettings(professionalId, { blockedDates: updated })
}

export function removeBlockedDate(professionalId, dateString) {
  const current = getConsultationSettings(professionalId)
  const existing = current.blockedDates || []
  const updated = existing.filter((d) => d !== dateString)
  return saveConsultationSettings(professionalId, { blockedDates: updated })
}

/**
 * Set custom hours or override for a specific date (overrides weekly schedule).
 */
export function setDateOverride(professionalId, dateString, overrideConfig) {
  if (!dateString) return { success: false, error: 'Date is required.' }
  const current = getConsultationSettings(professionalId)
  const dateOverrides = { ...(current.dateOverrides || {}) }

  dateOverrides[dateString] = {
    unavailable: Boolean(overrideConfig.unavailable),
    startTime: overrideConfig.startTime || '10:00',
    endTime: overrideConfig.endTime || '18:00',
    reason: overrideConfig.reason || 'Custom schedule for this date',
    updatedAt: new Date().toISOString(),
  }

  return saveConsultationSettings(professionalId, { dateOverrides })
}

export function removeDateOverride(professionalId, dateString) {
  const current = getConsultationSettings(professionalId)
  const dateOverrides = { ...(current.dateOverrides || {}) }
  delete dateOverrides[dateString]
  return saveConsultationSettings(professionalId, { dateOverrides })
}

/**
 * Block or unblock an individual slot (format: 'YYYY-MM-DD_HH:MM').
 */
export function toggleSlotBlock(professionalId, dateString, time24) {
  const slotKey = `${dateString}_${time24}`
  const current = getConsultationSettings(professionalId)
  const existing = current.blockedSlots || []

  let updated
  let isBlockedNow = false
  if (existing.includes(slotKey)) {
    updated = existing.filter((s) => s !== slotKey)
  } else {
    updated = [...existing, slotKey]
    isBlockedNow = true
  }

  const res = saveConsultationSettings(professionalId, { blockedSlots: updated })
  return {
    ...res,
    slotKey,
    isBlocked: isBlockedNow,
  }
}

// ─── Slot Generation Engine ──────────────────────────────────────────────────

function parseMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
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

/**
 * Generate all appointment slots for a specific date.
 * Takes into account:
 * - Weekly schedule for the weekday
 * - Date-specific blocked status (blockedDates)
 * - Date-specific custom hours (dateOverrides)
 * - Individual slot blocks (blockedSlots)
 * - Booked appointments (Availability Sync: booked slots cannot be re-booked)
 * - Duration + buffer time
 * - Strict working hours boundary (never generates slots outside working hours)
 */
export function generateDaySlots(professionalId, dateString) {
  const settings = getConsultationSettings(professionalId)
  const appointments = getAppointments(professionalId)

  // Determine weekday
  const [year, month, day] = dateString.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayIndex = dateObj.getDay()
  const dayKeyMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayKey = dayKeyMap[dayIndex]
  const dayLabel = DAYS_OF_WEEK.find((d) => d.key === dayKey)?.label || dayKey

  // Check date-level overrides
  const isDateInBlocked = (settings.blockedDates || []).includes(dateString)
  const dateOverride = (settings.dateOverrides || {})[dateString]
  const isOverrideUnavailable = dateOverride?.unavailable === true

  // Is entire date blocked?
  if (isDateInBlocked || isOverrideUnavailable) {
    return {
      date: dateString,
      dayKey,
      dayLabel,
      isBlockedDate: true,
      isOffDay: false,
      reason: isOverrideUnavailable ? (dateOverride.reason || 'Marked unavailable for this date') : 'Marked unavailable on calendar',
      slots: [],
      stats: { total: 0, available: 0, booked: 0, blocked: 0 },
    }
  }

  // Base schedule for the day
  const regularSchedule = settings.schedule?.[dayKey]
  const hasCustomHours = Boolean(dateOverride?.startTime && dateOverride?.endTime)

  // Is day off?
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

  // Determine working time limits
  const startTime = hasCustomHours ? dateOverride.startTime : regularSchedule.startTime
  const endTime = hasCustomHours ? dateOverride.endTime : regularSchedule.endTime

  const duration = Number(settings.durationMinutes) || 20
  const buffer = Number(settings.bufferMinutes) || 5
  const step = duration + buffer

  const startMin = parseMinutes(startTime)
  const endMin = parseMinutes(endTime)

  // Find active appointments on this date
  const dayAppointments = appointments.filter(
    (a) => a.date === dateString && (a.status === 'upcoming' || a.status === 'completed')
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

    // Check if booked by appointment
    const matchedApt = dayAppointments.find((a) => {
      if (a.time24 && a.time24 === time24) return true
      if (a.time && (a.time === time12 || a.time.replace(/^0/, '') === time12.replace(/^0/, ''))) return true
      if (a.time24) {
        const aMin = parseMinutes(a.time24)
        if (aMin >= currMin && aMin < currMin + duration) return true
      }
      return false
    })

    // Check if slot blocked individually
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
      status, // 'available' | 'booked' | 'blocked'
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

/**
 * Generate slots for a full week (Monday through Sunday).
 */
export function generateWeekSlots(professionalId, mondayDateString) {
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

    days.push(generateDaySlots(professionalId, dateStr))
  }

  return days
}

/**
 * Generate month calendar overview for a given year and month (1-indexed).
 */
export function generateMonthSummary(professionalId, year, month) {
  const settings = getConsultationSettings(professionalId)
  const appointments = getAppointments(professionalId)

  const numDays = new Date(year, month, 0).getDate()
  const days = []

  for (let i = 1; i <= numDays; i++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const dayData = generateDaySlots(professionalId, dStr)
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

// ─── Appointments API ────────────────────────────────────────────────────────

export function getAppointments(professionalId, { status = 'all' } = {}) {
  if (!professionalId) return []
  const all = getAllAppointments()
  let list = all.filter((a) => a.professionalId === professionalId)

  if (status && status !== 'all') {
    list = list.filter((a) => a.status === status.toLowerCase())
  }

  // Chronological sorting
  if (status === 'upcoming') {
    return list.sort((a, b) => new Date(`${a.date} ${a.time24 || a.time}`) - new Date(`${b.date} ${b.time24 || b.time}`))
  }

  return list.sort((a, b) => new Date(`${b.date} ${b.time24 || b.time}`) - new Date(`${a.date} ${a.time24 || a.time}`))
}

/**
 * Update appointment status with optional cancellation reason.
 * Availability sync: When cancelled, the appointment is marked cancelled,
 * freeing the corresponding slot on the calendar.
 */
export function updateAppointmentStatus(appointmentId, professionalId, newStatus, reason = null) {
  const all = getAllAppointments()
  const index = all.findIndex((a) => a.id === appointmentId && a.professionalId === professionalId)
  if (index === -1) return { success: false, error: 'Appointment not found.' }

  all[index] = {
    ...all[index],
    status: newStatus,
    cancellationReason: newStatus === 'cancelled' ? (reason || 'Cancelled by practitioner') : all[index].cancellationReason,
    updatedAt: new Date().toISOString(),
  }

  saveAllAppointments(all)
  return { success: true, appointment: all[index] }
}

// ─── Earnings & Payment API ──────────────────────────────────────────────────

export function getEarningsSummary(professionalId) {
  const appointments = getAppointments(professionalId)
  const completed = appointments.filter((a) => a.status === 'completed')

  const totalCompletedCount = completed.length
  const grossEarnings = completed.reduce((sum, a) => sum + (Number(a.fee) || 0), 0)
  const platformFee = Math.round(grossEarnings * 0.1)
  const netEarnings = grossEarnings - platformFee

  const pendingPayout = Math.round(netEarnings * 0.25)
  const completedPayouts = netEarnings - pendingPayout

  const history = completed.map((apt) => {
    const net = Math.round(apt.fee * 0.9)
    return {
      id: `earn_${apt.id}`,
      appointmentId: apt.id,
      patientName: apt.patientName,
      date: apt.date,
      grossFee: apt.fee,
      platformFee: Math.round(apt.fee * 0.1),
      netEarned: net,
      status: 'Settled',
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
    completedPayouts,
    history,
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

export function savePayoutSettings(professionalId, payoutData) {
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
