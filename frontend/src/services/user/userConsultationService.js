// userConsultationService.js
// Handles user-side consultation discovery, health-profile based recommendations,
// professional filtering, appointment history, and dummy payment records.

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'
import { getAvailableXP, spendXP } from '../xpService.js'
import { getProfessionals, saveProfessionals } from '../professional/professionalAuthService.js'
import {
  getConsultationSettings,
  saveConsultationSettings,
  getAppointments,
  updateAppointmentStatus,
  generateDaySlots,
} from '../professional/professionalConsultationService.js'
import { getRatingSummary, getReviewsForProfessional } from '../professional/professionalReviewService.js'

export const USER_CONSULTATION_STORAGE_KEYS = {
  USER_PAYMENTS: 'fk_user_consultation_payments',
  USER_HEALTH_PROFILE: 'fk_user_health_profile',
}

// ─── Default Verified Professional Roster (for discovery) ─────────────────────

const SEED_PROFESSIONALS = [
  {
    id: 'prof_demo_001',
    name: 'Dr. Ananya Sharma',
    fullName: 'Dr. Ananya Sharma',
    email: 'dr.ananya@fitkey.com',
    phone: '+91 98765 43210',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    bio: 'Senior Consultant Cardiologist & Preventive Wellness Specialist with 10+ years of clinical practice.',
    profession: 'Doctor / Medical Practitioner',
    specialization: 'Cardiology & Preventive Medicine',
    qualifications: 'MBBS, MD (Medicine), DM (Cardiology)',
    yearsExperience: 10,
    licenseNumber: 'MCI-2014-98421',
    workplaceName: 'Metro Heart Institute & Wellness Center',
    workplaceAddress: 'Sector 44, Institutional Area',
    city: 'Gurugram',
    state: 'Haryana',
    onboardingCompleted: true,
    verificationStatus: 'Verified Practitioner',
    healthFocusAreas: ['Cardiovascular Health', 'Hypertension', 'Lipid Management', 'Heart Rate Recovery'],
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'prof_demo_002',
    name: 'Dr. Rohan Varma',
    fullName: 'Dr. Rohan Varma',
    email: 'dr.rohan@fitkey.com',
    phone: '+91 98111 55667',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    bio: 'Orthopaedic Rehabilitation & Sports Medicine Consultant specializing in endurance athletes and joint health.',
    profession: 'Doctor / Medical Practitioner',
    specialization: 'Sports Medicine & Joint Care',
    qualifications: 'MBBS, MS (Ortho), Fellowship in Sports Medicine',
    yearsExperience: 12,
    licenseNumber: 'KMC-2012-77123',
    workplaceName: 'Apex Center for Orthopaedics & Sports Health',
    workplaceAddress: 'Indiranagar 100ft Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    onboardingCompleted: true,
    verificationStatus: 'Verified Practitioner',
    healthFocusAreas: ['Injury Rehabilitation', 'Joint Health', 'Posture & Ergonomics', 'Athletic Training'],
    createdAt: '2026-01-05T10:00:00.000Z',
  },
  {
    id: 'prof_demo_003',
    name: 'Priya Nambiar',
    fullName: 'Priya Nambiar',
    email: 'priya.diet@fitkey.com',
    phone: '+91 98222 66778',
    photoUrl: 'https://images.unsplash.com/photo-1594824813589-982855140880?auto=format&fit=crop&q=80&w=400',
    bio: 'Certified Clinical Dietitian and Certified Diabetes Educator helping clients achieve metabolic flexibility.',
    profession: 'Clinical Nutritionist & Dietitian',
    specialization: 'Metabolic Nutrition & Diabetes',
    qualifications: 'M.Sc. Clinical Nutrition, CDE, RD',
    yearsExperience: 8,
    licenseNumber: 'IDA-2016-4432',
    workplaceName: 'NutriWell Clinic & Diabetes Center',
    workplaceAddress: 'Bandra West, Hill Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    onboardingCompleted: true,
    verificationStatus: 'Verified Practitioner',
    healthFocusAreas: ['Weight Management', 'Blood Sugar Control', 'Gut Health', 'Dietary Nutrition'],
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'prof_demo_004',
    name: 'Dr. Kabir Mehta',
    fullName: 'Dr. Kabir Mehta',
    email: 'dr.kabir@fitkey.com',
    phone: '+91 98333 77889',
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
    bio: 'Senior Psychiatrist focusing on sleep hygiene, chronic stress mitigation, and mind-body resilience.',
    profession: 'Doctor / Medical Practitioner',
    specialization: 'Sleep Medicine & Behavioral Health',
    qualifications: 'MBBS, MD (Psychiatry), Member of IPS',
    yearsExperience: 14,
    licenseNumber: 'DMC-2010-33901',
    workplaceName: 'Mind & Sleep Medicine Clinic',
    workplaceAddress: 'Vasant Vihar Institutional Area',
    city: 'Delhi NCR',
    state: 'Delhi',
    onboardingCompleted: true,
    verificationStatus: 'Verified Practitioner',
    healthFocusAreas: ['Sleep Optimization', 'Stress Resilience', 'Mental Wellness', 'Burnout Recovery'],
    createdAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'prof_demo_005',
    name: 'Shreya Kulkarni',
    fullName: 'Shreya Kulkarni',
    email: 'shreya.physio@fitkey.com',
    phone: '+91 98444 88990',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    bio: 'Musculoskeletal Physiotherapist focused on spine alignment, ergonomic correction, and active mobility.',
    profession: 'Physiotherapist',
    specialization: 'Spine & Postural Physiotherapy',
    qualifications: 'BPT, MPT (Musculoskeletal Disorders)',
    yearsExperience: 6,
    licenseNumber: 'IAP-2018-88219',
    workplaceName: 'RehabMotion Physical Therapy Clinic',
    workplaceAddress: 'Koregaon Park, North Main Road',
    city: 'Pune',
    state: 'Maharashtra',
    onboardingCompleted: true,
    verificationStatus: 'Verified Practitioner',
    healthFocusAreas: ['Back & Neck Pain', 'Ergonomics', 'Mobility & Flexibility', 'Core Stability'],
    createdAt: '2026-01-15T10:00:00.000Z',
  },
]

// Default consultation settings for each seeded doctor
const SEED_CONSULTATION_SETTINGS = {
  prof_demo_001: {
    consultationsEnabled: true,
    offerPhoneConsultations: true,
    consultationFee: 650,
    durationMinutes: 20,
    bufferMinutes: 5,
    timezone: 'Asia/Kolkata',
  },
  prof_demo_002: {
    consultationsEnabled: true,
    offerPhoneConsultations: true,
    consultationFee: 800,
    durationMinutes: 30,
    bufferMinutes: 5,
    timezone: 'Asia/Kolkata',
  },
  prof_demo_003: {
    consultationsEnabled: true,
    offerPhoneConsultations: true,
    consultationFee: 500,
    durationMinutes: 20,
    bufferMinutes: 5,
    timezone: 'Asia/Kolkata',
  },
  prof_demo_004: {
    consultationsEnabled: true,
    offerPhoneConsultations: true,
    consultationFee: 1200,
    durationMinutes: 30,
    bufferMinutes: 10,
    timezone: 'Asia/Kolkata',
  },
  prof_demo_005: {
    consultationsEnabled: true,
    offerPhoneConsultations: true,
    consultationFee: 450,
    durationMinutes: 20,
    bufferMinutes: 0,
    timezone: 'Asia/Kolkata',
  },
}

// ─── Initial Dummy Consultation Payments Linked to Bookings ──────────────────

const INITIAL_USER_PAYMENTS = [
  {
    id: 'pay_user_001',
    bookingReference: 'BK-2026-9481',
    appointmentId: 'apt_demo_001',
    professionalId: 'prof_demo_001',
    professionalName: 'Dr. Ananya Sharma',
    professionalSpecialization: 'Cardiology & Preventive Medicine',
    professionalPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    originalFee: 650,
    xpDiscount: 50, // 50 XP redeemed for ₹50 discount
    amountPaid: 600,
    currency: 'INR',
    paymentMethod: 'UPI (Google Pay)',
    transactionId: 'TXN_UPI_983719248',
    paymentDate: '2026-11-22T08:35:00.000Z',
    appointmentDate: '2026-11-25',
    appointmentTime: '11:15 AM',
    paymentStatus: 'SUCCESSFUL', // 'SUCCESSFUL' | 'PENDING' | 'FAILED' | 'REFUNDED'
    invoiceNumber: 'INV-FK-2026-081',
  },
  {
    id: 'pay_user_002',
    bookingReference: 'BK-2026-8312',
    appointmentId: 'apt_demo_003',
    professionalId: 'prof_demo_001',
    professionalName: 'Dr. Ananya Sharma',
    professionalSpecialization: 'Cardiology & Preventive Medicine',
    professionalPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    originalFee: 650,
    xpDiscount: 0,
    amountPaid: 650,
    currency: 'INR',
    paymentMethod: 'Credit Card (Visa •••• 4012)',
    transactionId: 'TXN_CARD_77218390',
    paymentDate: '2026-11-18T10:05:00.000Z',
    appointmentDate: '2026-11-20',
    appointmentTime: '02:00 PM',
    paymentStatus: 'SUCCESSFUL',
    invoiceNumber: 'INV-FK-2026-072',
  },
  {
    id: 'pay_user_003',
    bookingReference: 'BK-2026-7294',
    appointmentId: 'apt_demo_005',
    professionalId: 'prof_demo_002',
    professionalName: 'Dr. Rohan Varma',
    professionalSpecialization: 'Sports Medicine & Joint Care',
    professionalPhoto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    originalFee: 800,
    xpDiscount: 100,
    amountPaid: 700,
    currency: 'INR',
    paymentMethod: 'UPI (PhonePe)',
    transactionId: 'TXN_UPI_66192837',
    paymentDate: '2026-11-14T09:15:00.000Z',
    appointmentDate: '2026-11-15',
    appointmentTime: '10:30 AM',
    paymentStatus: 'REFUNDED',
    refundReason: 'Appointment cancelled due to physician emergency duties. Full refund credited.',
    invoiceNumber: 'INV-FK-2026-065',
  },
  {
    id: 'pay_user_004',
    bookingReference: 'BK-2026-6102',
    appointmentId: 'apt_demo_007',
    professionalId: 'prof_demo_003',
    professionalName: 'Priya Nambiar',
    professionalSpecialization: 'Metabolic Nutrition & Diabetes',
    professionalPhoto: 'https://images.unsplash.com/photo-1594824813589-982855140880?auto=format&fit=crop&q=80&w=400',
    originalFee: 500,
    xpDiscount: 0,
    amountPaid: 500,
    currency: 'INR',
    paymentMethod: 'UPI (Paytm)',
    transactionId: 'TXN_UPI_55291847',
    paymentDate: '2026-11-11T16:20:00.000Z',
    appointmentDate: '2026-11-13',
    appointmentTime: '04:00 PM',
    paymentStatus: 'SUCCESSFUL',
    invoiceNumber: 'INV-FK-2026-059',
  },
]

// ─── Core Discovery Functions ────────────────────────────────────────────────

/**
 * Ensures the professionals list has our rich verified roster.
 */
function ensureSeededProfessionals() {
  const existing = getProfessionals()
  let modified = false
  const updated = [...existing]

  for (const seed of SEED_PROFESSIONALS) {
    const idx = updated.findIndex((p) => p.id === seed.id)
    if (idx === -1) {
      updated.push(seed)
      modified = true
    } else {
      // Ensure photoUrl and verified status exist
      if (!updated[idx].photoUrl || updated[idx].verificationStatus !== 'Verified Practitioner') {
        updated[idx] = { ...updated[idx], ...seed }
        modified = true
      }
    }

    // Ensure consultation settings exist and enabled
    const s = getConsultationSettings(seed.id)
    if (!s.consultationsEnabled && SEED_CONSULTATION_SETTINGS[seed.id]) {
      saveConsultationSettings(seed.id, SEED_CONSULTATION_SETTINGS[seed.id])
    }
  }

  if (modified) {
    saveProfessionals(updated)
  }
  return updated
}

/**
 * Get all professionals available for consultation.
 * Only returns professionals who:
 * 1. Have onboarding completed
 * 2. Have consultationEnabled: true in their consultation settings
 */
export function getConsultationProfessionals() {
  const allProfs = ensureSeededProfessionals()
  const result = []

  for (const prof of allProfs) {
    if (!prof.onboardingCompleted) continue

    const settings = getConsultationSettings(prof.id)
    if (!settings.consultationsEnabled) continue

    const ratingSummary = getRatingSummary(prof.id)
    const todayIso = new Date().toISOString().split('T')[0]
    const daySlots = generateDaySlots(prof.id, todayIso)
    const availableTodaySlots = daySlots?.slots?.filter((s) => s.status === 'available') || []

    result.push({
      ...prof,
      displayName: prof.fullName || prof.name,
      ratingSummary: {
        avg: ratingSummary.avg || 4.8,
        total: ratingSummary.total || 14,
      },
      consultation: {
        fee: settings.consultationFee || 500,
        durationMinutes: settings.durationMinutes || 20,
        bufferMinutes: settings.bufferMinutes || 5,
        timezone: settings.timezone || 'Asia/Kolkata',
        offerPhoneConsultations: settings.offerPhoneConsultations ?? true,
        availableTodayCount: availableTodaySlots.length,
        hasSlotsToday: availableTodaySlots.length > 0,
      },
    })
  }

  return result
}

/**
 * Get Recommended Professionals based on user wellness needs, location, and credentials.
 * Prioritizes verified credentials and relevant specialization over XP/popularity.
 * Never diagnoses users.
 */
export function getRecommendedProfessionals(userProfile = {}) {
  const all = getConsultationProfessionals()

  // Extract user health goals & preferences
  const userGoal = (userProfile.goal || 'Overall Wellness').toLowerCase()
  const userCity = (userProfile.city || 'Gurugram').toLowerCase()

  const scored = all.map((prof) => {
    let score = 0
    const reasons = []

    // 1. Verified credential boost
    if ((prof.verificationStatus || '').toLowerCase().includes('verified')) {
      score += 25
      reasons.push('Verified credentials')
    }

    // 2. Specialization relevance to user wellness goals
    const spec = (prof.specialization || '').toLowerCase()
    const focusAreas = (prof.healthFocusAreas || []).map((f) => f.toLowerCase())

    if (
      userGoal.includes('heart') ||
      userGoal.includes('cardio') ||
      userGoal.includes('stamina')
    ) {
      if (spec.includes('cardio') || focusAreas.some((f) => f.includes('cardio'))) {
        score += 35
        reasons.push('Matches cardiovascular stamina goal')
      }
    } else if (
      userGoal.includes('weight') ||
      userGoal.includes('diet') ||
      userGoal.includes('metabol')
    ) {
      if (spec.includes('nutrition') || spec.includes('diet')) {
        score += 35
        reasons.push('Matches nutritional & metabolic goals')
      }
    } else if (
      userGoal.includes('joint') ||
      userGoal.includes('strength') ||
      userGoal.includes('active')
    ) {
      if (spec.includes('sports') || spec.includes('physio')) {
        score += 35
        reasons.push('Matches physical mobility & injury prevention')
      }
    } else {
      // Overall Wellness
      if (spec.includes('preventive') || spec.includes('nutrition') || spec.includes('wellness')) {
        score += 30
        reasons.push('Aligned with overall preventative wellness')
      }
    }

    // 3. Location proximity
    const profCity = (prof.city || '').toLowerCase()
    if (profCity && userCity && (profCity.includes(userCity) || userCity.includes(profCity))) {
      score += 15
      reasons.push(`Practices in your area (${prof.city})`)
    }

    // 4. Experience & Ratings
    const exp = Number(prof.yearsExperience) || 0
    if (exp >= 10) score += 10
    else if (exp >= 5) score += 5

    const rating = prof.ratingSummary?.avg || 0
    if (rating >= 4.5) score += 10

    // 5. Active availability today
    if (prof.consultation?.hasSlotsToday) {
      score += 10
      reasons.push('Slots available today')
    }

    return {
      ...prof,
      recommendationScore: score,
      matchReason: reasons.slice(0, 2).join(' · '),
    }
  })

  // Sort by recommendation score descending
  return scored.sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, 3)
}

/**
 * Filter professionals based on search query and criteria.
 */
export function filterProfessionals(list, {
  searchQuery = '',
  location = 'all',
  feeRange = 'all',
  ratingMin = 0,
  availability = 'all',
  specialization = 'all',
} = {}) {
  const q = searchQuery.trim().toLowerCase()

  return list.filter((prof) => {
    // 1. Search text (name, profession, specialization)
    if (q) {
      const name = (prof.displayName || '').toLowerCase()
      const profession = (prof.profession || '').toLowerCase()
      const spec = (prof.specialization || '').toLowerCase()
      const workplace = (prof.workplaceName || '').toLowerCase()
      const match = name.includes(q) || profession.includes(q) || spec.includes(q) || workplace.includes(q)
      if (!match) return false
    }

    // 2. Location
    if (location && location !== 'all') {
      const city = (prof.city || '').toLowerCase()
      const state = (prof.state || '').toLowerCase()
      const locTarget = location.toLowerCase()
      if (!city.includes(locTarget) && !state.includes(locTarget)) return false
    }

    // 3. Fee range
    const fee = prof.consultation?.fee || 0
    if (feeRange === 'under_500' && fee > 500) return false
    if (feeRange === '500_1000' && (fee < 500 || fee > 1000)) return false
    if (feeRange === 'above_1000' && fee < 1000) return false

    // 4. Rating minimum
    const rating = prof.ratingSummary?.avg || 0
    if (ratingMin > 0 && rating < ratingMin) return false

    // 5. Availability
    if (availability === 'today' && !prof.consultation?.hasSlotsToday) return false

    // 6. Specialization filter
    if (specialization && specialization !== 'all') {
      const spec = (prof.specialization || '').toLowerCase()
      if (!spec.includes(specialization.toLowerCase())) return false
    }

    return true
  })
}

// ─── User Consultation History API ───────────────────────────────────────────

/**
 * Get user consultation appointments.
 * Reads appointments from storage and pairs them with professional info.
 */
export function getUserAppointments() {
  const allProfs = ensureSeededProfessionals()
  const profMap = {}
  allProfs.forEach((p) => { profMap[p.id] = p })

  // Read all system appointments
  const allApts = getItem(STORAGE_KEYS.PROF_APPOINTMENTS, [])

  return allApts.map((apt) => {
    const prof = profMap[apt.professionalId] || {}
    // Link to payment if exists
    const payments = getUserPaymentHistory()
    const payment = payments.find((p) => p.appointmentId === apt.id || p.bookingReference?.includes(apt.id?.slice(-3)))

    return {
      ...apt,
      bookingReference: payment?.bookingReference || `BK-2026-${apt.id?.slice(-4).toUpperCase() || '7102'}`,
      professionalName: prof.fullName || prof.name || 'Verified Practitioner',
      professionalSpecialization: prof.specialization || 'Healthcare Consultant',
      professionalPhoto: prof.photoUrl || '',
      professionalWorkplace: prof.workplaceName || 'FitKey Telehealth Partner',
      professionalCity: prof.city || 'India',
      fee: apt.fee || 650,
      paymentStatus: payment?.paymentStatus || 'SUCCESSFUL',
    }
  })
}

/**
 * Cancel a user appointment.
 * Syncs with professionalConsultationService to free up the slot.
 */
export function cancelUserAppointment(appointmentId, reason = 'Cancelled by user') {
  const appointments = getItem(STORAGE_KEYS.PROF_APPOINTMENTS, [])
  const apt = appointments.find((a) => a.id === appointmentId)
  if (!apt) return { success: false, error: 'Appointment not found.' }

  const res = updateAppointmentStatus(appointmentId, apt.professionalId, 'cancelled', reason)
  if (res.success) {
    // Also update payment record if exists
    const payments = getUserPaymentHistory()
    const pIdx = payments.findIndex((p) => p.appointmentId === appointmentId)
    if (pIdx !== -1) {
      payments[pIdx] = {
        ...payments[pIdx],
        paymentStatus: 'REFUNDED',
        refundReason: 'User cancelled appointment. Refund credited to original payment source.',
      }
      setItem(USER_CONSULTATION_STORAGE_KEYS.USER_PAYMENTS, payments)
    }
    return { success: true }
  }
  return res
}

/**
 * Get user dummy payment records.
 */
export function getUserPaymentHistory() {
  const data = getItem(USER_CONSULTATION_STORAGE_KEYS.USER_PAYMENTS, null)
  if (!data) {
    setItem(USER_CONSULTATION_STORAGE_KEYS.USER_PAYMENTS, INITIAL_USER_PAYMENTS)
    return INITIAL_USER_PAYMENTS
  }
  return data
}

// ─── Booking & Rescheduling API ──────────────────────────────────────────────

export const MAX_XP_DISCOUNT_PERCENT = 0.5 // Max 50% of the consultation fee
export const MAX_XP_DISCOUNT_POINTS = 200 // Max 200 XP can be redeemed per consultation (₹200 discount)
export const XP_TO_INR_RATIO = 1 // 1 XP = ₹1 discount

/**
 * Calculate eligible XP discount and final payable amount.
 */
export function calculateXpDiscount(fee, requestedXp = 0) {
  const availableXP = getAvailableXP()
  const maxByFee = Math.floor(fee * MAX_XP_DISCOUNT_PERCENT)
  const maxEligibleXP = Math.max(0, Math.min(maxByFee, MAX_XP_DISCOUNT_POINTS, availableXP))
  const appliedXP = Math.max(0, Math.min(Number(requestedXp) || 0, maxEligibleXP))
  const discountAmount = appliedXP * XP_TO_INR_RATIO
  const finalAmount = Math.max(0, fee - discountAmount)

  return {
    availableXP,
    maxEligibleXP,
    appliedXP,
    discountAmount,
    finalAmount,
  }
}

/**
 * Retrieve available slots for a specific date.
 */
export function getAvailableSlotsForDate(professionalId, dateString) {
  if (!professionalId || !dateString) return []
  const dayData = generateDaySlots(professionalId, dateString)
  if (!dayData || dayData.isBlockedDate || dayData.isOffDay) return []
  return (dayData.slots || []).filter((s) => s.status === 'available')
}

/**
 * Complete appointment booking flow.
 * - Deducts eligible XP discount
 * - Adds to professional's upcoming appointments
 * - Locks the slot on the calendar
 * - Adds to user appointment and payment history
 */
export function bookConsultationAppointment({
  professionalId,
  date,
  time24,
  time12,
  patientName,
  patientPhone,
  phoneConsented,
  patientAge,
  patientGender,
  notes,
  healthDetails,
  xpPointsToRedeem = 0,
  paymentMethod = 'UPI (Direct Tele-Payment)',
}) {
  if (!professionalId) return { success: false, error: 'Professional ID is required.' }
  if (!date || !time24) return { success: false, error: 'Appointment date and slot time are required.' }
  if (!patientName?.trim()) return { success: false, error: 'Patient name is required.' }

  const cleanPhone = (patientPhone || '').replace(/\D/g, '')
  if (cleanPhone.length < 10) {
    return { success: false, error: 'Please provide a valid 10-digit mobile number for phone consultation.' }
  }
  if (!phoneConsented) {
    return { success: false, error: 'Explicit consent to receive phone calls from practitioner is required.' }
  }

  // 1. Verify slot is still available
  const availableSlots = getAvailableSlotsForDate(professionalId, date)
  const matchedSlot = availableSlots.find((s) => s.time24 === time24)
  if (!matchedSlot) {
    return { success: false, error: 'The selected slot is no longer available. Please choose another time.' }
  }

  // 2. Load professional and consultation settings
  const profs = ensureSeededProfessionals()
  const prof = profs.find((p) => p.id === professionalId)
  if (!prof) return { success: false, error: 'Practitioner not found.' }
  const settings = getConsultationSettings(professionalId)
  const fee = Number(settings.consultationFee) || 500

  // 3. Calculate and apply XP discount
  const { appliedXP, discountAmount, finalAmount } = calculateXpDiscount(fee, xpPointsToRedeem)
  const bookingReference = `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`
  const appointmentId = `apt_${generateId()}`

  if (appliedXP > 0) {
    const spendRes = spendXP({
      amount: appliedXP,
      refId: bookingReference,
      description: `Consultation fee discount for ${prof.fullName || prof.name}`,
    })
    if (!spendRes.success) {
      return { success: false, error: 'Could not redeem XP discount. Please try booking without XP.' }
    }
  }

  // 4. Create appointment
  const newAppointment = {
    id: appointmentId,
    professionalId,
    patientName: patientName.trim(),
    patientPhone: patientPhone.trim(),
    phoneConsented: true,
    patientAge: Number(patientAge) || 28,
    patientGender: patientGender || 'Prefer not to say',
    date,
    time: time12 || matchedSlot.time12,
    time24,
    durationMinutes: settings.durationMinutes || 20,
    type: 'Phone Consultation',
    fee,
    status: 'upcoming',
    notes: notes?.trim() || 'Direct telehealth phone consultation',
    healthDetails: {
      bloodGroup: healthDetails?.bloodGroup || '',
      allergies: healthDetails?.allergies || [],
      currentMedications: healthDetails?.currentMedications || [],
      medicalHistory: healthDetails?.medicalHistory || [],
      chiefComplaint: notes?.trim() || 'General health consultation',
      sharedDocuments: healthDetails?.sharedDocuments || [],
    },
    cancellationReason: null,
    bookedAt: new Date().toISOString(),
  }

  const allApts = getItem(STORAGE_KEYS.PROF_APPOINTMENTS, [])
  allApts.push(newAppointment)
  setItem(STORAGE_KEYS.PROF_APPOINTMENTS, allApts)

  // 5. Create linked payment
  const newPayment = {
    id: `pay_${generateId()}`,
    bookingReference,
    appointmentId,
    professionalId,
    professionalName: prof.fullName || prof.name,
    professionalSpecialization: prof.specialization,
    professionalPhoto: prof.photoUrl,
    originalFee: fee,
    xpDiscount: discountAmount,
    amountPaid: finalAmount,
    currency: 'INR',
    paymentMethod,
    transactionId: `TXN_SIM_${Math.floor(10000000 + Math.random() * 90000000)}`,
    paymentDate: new Date().toISOString(),
    appointmentDate: date,
    appointmentTime: time12 || matchedSlot.time12,
    paymentStatus: 'SUCCESSFUL',
    invoiceNumber: `INV-FK-2026-${Math.floor(100 + Math.random() * 900)}`,
  }

  const allPayments = getUserPaymentHistory()
  allPayments.unshift(newPayment)
  setItem(USER_CONSULTATION_STORAGE_KEYS.USER_PAYMENTS, allPayments)

  return {
    success: true,
    booking: {
      bookingReference,
      appointment: newAppointment,
      payment: newPayment,
      discountApplied: discountAmount,
      amountPaid: finalAmount,
    },
  }
}

/**
 * Reschedule an upcoming appointment to a new date and slot.
 */
export function rescheduleAppointment(appointmentId, newDate, newTime24, newTime12) {
  if (!appointmentId) return { success: false, error: 'Appointment ID is required.' }
  if (!newDate || !newTime24) return { success: false, error: 'New appointment date and slot are required.' }

  const appointments = getItem(STORAGE_KEYS.PROF_APPOINTMENTS, [])
  const aptIndex = appointments.findIndex((a) => a.id === appointmentId)
  if (aptIndex === -1) return { success: false, error: 'Appointment not found.' }
  const currentApt = appointments[aptIndex]

  if (currentApt.status !== 'upcoming') {
    return { success: false, error: 'Only upcoming appointments can be rescheduled.' }
  }

  // Verify new slot is available
  const availableSlots = getAvailableSlotsForDate(currentApt.professionalId, newDate)
  const matchedSlot = availableSlots.find((s) => s.time24 === newTime24)
  if (!matchedSlot) {
    return { success: false, error: 'The chosen slot is unavailable. Please pick another time.' }
  }

  // Update appointment
  appointments[aptIndex] = {
    ...currentApt,
    date: newDate,
    time24: newTime24,
    time: newTime12 || matchedSlot.time12,
    rescheduledAt: new Date().toISOString(),
  }
  setItem(STORAGE_KEYS.PROF_APPOINTMENTS, appointments)

  // Update linked payment
  const payments = getUserPaymentHistory()
  const pIndex = payments.findIndex((p) => p.appointmentId === appointmentId)
  if (pIndex !== -1) {
    payments[pIndex] = {
      ...payments[pIndex],
      appointmentDate: newDate,
      appointmentTime: newTime12 || matchedSlot.time12,
    }
    setItem(USER_CONSULTATION_STORAGE_KEYS.USER_PAYMENTS, payments)
  }

  return {
    success: true,
    appointment: appointments[aptIndex],
    message: `Rescheduled successfully to ${newDate} at ${newTime12 || matchedSlot.time12}.`,
  }
}
