import { supabase } from '../../lib/supabase.js'

export const MAX_XP_DISCOUNT_PERCENT = 0.5
export const MAX_XP_DISCOUNT_POINTS = 200

function normalizeProfile(row) {
  const p = row?.profile || {}
  const rating = row?.rating || {}
  const professional = {
    id: p.id,
    fullName: p.full_name || 'Healthcare Professional',
    name: p.full_name || 'Healthcare Professional',
    displayName: p.full_name || 'Healthcare Professional',
    photoUrl: p.avatar_url || '',
    bio: p.bio || '',
    profession: p.profession || 'Healthcare Professional',
    specialization: p.specialization || '',
    qualifications: p.qualification || '',
    yearsExperience: Number(p.experience_years || 0),
    workplaceName: p.workplace_name || '',
    workplaceAddress: p.workplace_address || '',
    city: p.city || '',
    state: p.state || '',
    onboardingCompleted: true,
    verificationStatus: 'verified',
    consultation: {
      fee: Number(p.consultation_fee || 0),
      durationMinutes: Number(p.duration_minutes || 20),
      bufferMinutes: Number(p.buffer_minutes || 0),
      timezone: p.timezone || 'Asia/Kolkata',
      offerPhoneConsultations: Boolean(p.offer_phone_consultations),
      hasSlotsToday: false,
    },
    consultationSettings: {
      consultationsEnabled: Boolean(p.consultations_enabled),
      consultationFee: Number(p.consultation_fee || 0),
      durationMinutes: Number(p.duration_minutes || 20),
      bufferMinutes: Number(p.buffer_minutes || 0),
      timezone: p.timezone || 'Asia/Kolkata',
      blockedDates: p.blocked_dates || [],
      blockedSlots: p.blocked_slots || [],
      dateOverrides: p.date_overrides || {},
    },
    availability: row?.availability || [],
    bookedSlots: p.booked_slots || [],
    ratingSummary: { avg: Number(rating.avg || 0), total: Number(rating.total || 0) },
  }
  professional.consultation.hasSlotsToday = buildSlots(professional, getLocalDateString()).length > 0
  return professional
}

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function asMinutes(value) {
  const [h, m] = String(value || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function asTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function as12Hour(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function buildSlots(professional, date) {
  if (!professional?.id || !date) return []
  const settings = professional.consultationSettings || {}
  if (!settings.consultationsEnabled) return []
  const override = settings.dateOverrides?.[date]
  if (override?.unavailable || settings.blockedDates?.includes(date)) return []
  const weekday = new Date(`${date}T12:00:00`).getDay()
  const periods = override?.startTime && override?.endTime
    ? [{ start_time: override.startTime, end_time: override.endTime }]
    : (professional.availability || []).filter((a) => Number(a.day_of_week) === weekday && a.is_active !== false)
  if (!periods.length) return []

  const duration = Number(professional.consultation?.durationMinutes || 20)
  const buffer = Number(professional.consultation?.bufferMinutes || 0)
  const step = duration + buffer
  const blocked = new Set(settings.blockedSlots || [])
  const appointments = (professional.bookedSlots || []).filter((a) => a.date === date)
  const now = new Date()
  const minToday = date === getLocalDateString() ? now.getHours() * 60 + now.getMinutes() : -1
  const slots = []
  for (const period of periods) {
    for (let start = asMinutes(period.start_time); start + duration <= asMinutes(period.end_time); start += step) {
      const time24 = asTime(start)
      const end = start + duration
      const occupied = appointments.some((apt) =>
        start < asMinutes(apt.end_time) + buffer && end + buffer > asMinutes(apt.start_time)
      )
      if (!occupied && !blocked.has(`${date}_${time24}`) && start > minToday) {
        slots.push({ date, time24, time12: as12Hour(start), durationMinutes: duration })
      }
    }
  }
  return slots
}

export async function getConsultationProfessionals() {
  const { data, error } = await supabase.rpc('get_public_consultation_professionals')
  if (error) throw new Error(error.message || 'Could not load available practitioners.')
  return (Array.isArray(data) ? data : []).map(normalizeProfile)
}

export function getRecommendedProfessionals(userProfile = {}, professionals = []) {
  const goal = String(userProfile.goal || '').toLowerCase()
  const city = String(userProfile.city || '').toLowerCase()
  return [...professionals].map((professional) => {
    let score = 0
    const reasons = []
    const specialization = String(professional.specialization || '').toLowerCase()
    if (goal && (specialization.includes(goal) || goal.split(/\W+/).some((word) => word.length > 3 && specialization.includes(word)))) {
      score += 20
      reasons.push('Matches your wellness focus')
    }
    if (city && String(professional.city || '').toLowerCase().includes(city)) {
      score += 10
      reasons.push(`Practices in ${professional.city}`)
    }
    score += Math.min(Number(professional.yearsExperience || 0), 10)
    return { ...professional, recommendationScore: score, matchReason: reasons.slice(0, 2).join(' · ') }
  }).sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, 3)
}

export function filterProfessionals(list, {
  searchQuery = '', location = 'all', feeRange = 'all', ratingMin = 0,
  availability = 'all', specialization = 'all',
} = {}) {
  const q = searchQuery.trim().toLowerCase()
  return list.filter((p) => {
    if (q && ![p.displayName, p.profession, p.specialization, p.workplaceName].some((v) => String(v || '').toLowerCase().includes(q))) return false
    if (location !== 'all' && ![p.city, p.state].some((v) => String(v || '').toLowerCase().includes(location.toLowerCase()))) return false
    const fee = Number(p.consultation?.fee || 0)
    if (feeRange === 'under_500' && fee > 500) return false
    if (feeRange === '500_1000' && (fee < 500 || fee > 1000)) return false
    if (feeRange === 'above_1000' && fee < 1000) return false
    if (ratingMin > 0 && Number(p.ratingSummary?.avg || 0) < ratingMin) return false
    if (availability === 'today' && !p.consultation?.hasSlotsToday) return false
    if (specialization !== 'all' && !String(p.specialization || '').toLowerCase().includes(specialization.toLowerCase())) return false
    return true
  })
}

export async function getAvailableSlotsForDate(professionalId, dateString) {
  const byDate = await getAvailableSlotsForDateRange(professionalId, dateString, dateString)
  return byDate[dateString] || []
}

export async function getAvailableSlotsForDateRange(professionalId, startDate, endDate) {
  const { data, error } = await supabase.rpc('get_public_professional_booking_data', {
    p_professional_id: professionalId,
    p_start_date: startDate,
    p_end_date: endDate,
  })
  if (error) throw new Error(error.message || 'Could not load current appointment availability.')
  if (!data?.profile) return {}
  const professional = normalizeProfile({
    profile: { ...data.profile, booked_slots: data.booked_slots || [] },
    availability: data.availability,
    rating: {},
  })
  const slotsByDate = {}
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = getLocalDateString(cursor)
    slotsByDate[date] = buildSlots(professional, date)
  }
  return slotsByDate
}

export async function bookConsultationAppointment({
  professionalId, date, time24, patientName, patientPhone, phoneConsented,
  patientAge, patientGender, notes, healthDetails,
}) {
  if (!professionalId || !date || !time24) return { success: false, error: 'Choose a practitioner and an available appointment slot.' }
  if (!patientName?.trim()) return { success: false, error: 'Patient name is required.' }
  if (String(patientPhone || '').replace(/\D/g, '').length < 10) return { success: false, error: 'Enter a valid 10-digit phone number.' }
  if (!phoneConsented) return { success: false, error: 'Phone consultation consent is required.' }
  const { data, error } = await supabase.rpc('book_patient_appointment', {
    p_professional_id: professionalId,
    p_appointment_date: date,
    p_start_time: time24,
    p_patient_name: patientName.trim(),
    p_patient_phone: String(patientPhone).replace(/\D/g, ''),
    p_phone_consented: true,
    p_patient_age: patientAge ? Number(patientAge) : null,
    p_patient_gender: patientGender || null,
    p_notes: notes?.trim() || null,
    p_health_details: {
      blood_group: healthDetails?.bloodGroup || null,
      allergies: healthDetails?.allergies || [],
      current_medications: healthDetails?.currentMedications || [],
      chief_complaint: healthDetails?.chiefComplaint || null,
    },
  })
  if (error) {
    console.error('[userConsultationService] book_patient_appointment failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    const details = error.details ? ` ${error.details}` : ''
    return { success: false, error: `${error.message || 'Could not save this appointment.'}${details}` }
  }
  if (!data?.success || !data?.appointment) return { success: false, error: data?.error || 'Could not save this appointment.' }
  const row = data.appointment
  const minute = asMinutes(row.start_time)
  return {
    success: true,
    booking: {
      bookingReference: `FK-${String(row.id).slice(0, 8).toUpperCase()}`,
      appointment: {
        id: row.id, professionalId: row.professional_id, patientName: row.patient_name,
        patientPhone: row.patient_phone, date: String(row.appointment_date).slice(0, 10),
        time: as12Hour(minute), time24: String(row.start_time).slice(0, 5),
        fee: Number(row.fee || 0), status: row.status === 'confirmed' ? 'upcoming' : row.status,
        paymentStatus: 'pending',
      },
      amountDue: Number(row.fee || 0),
      paymentStatus: 'pending',
    },
  }
}

export async function getUserAppointments() {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user?.id) throw new Error('Sign in to view your consultations.')
  const { data: rows, error } = await supabase.from('appointments').select('*').eq('user_id', auth.user.id)
    .order('appointment_date', { ascending: false }).order('start_time', { ascending: false })
  if (error) throw new Error(error.message || 'Could not load your appointments.')

  const profMap = new Map()
  try {
    const professionals = await getConsultationProfessionals()
    professionals.forEach((p) => profMap.set(p.id, p))
  } catch (err) {
    console.warn('[userConsultationService] Could not load the professional directory:', err)
  }
  const missingIds = [...new Set((rows || []).map((r) => r.professional_id).filter((id) => id && !profMap.has(id)))]
  await Promise.all(missingIds.map(async (id) => {
    const { data } = await supabase.rpc('get_public_professional_summary', { p_user_id: id })
    if (data) profMap.set(id, {
      id, displayName: data.full_name || 'Healthcare Professional', fullName: data.full_name || 'Healthcare Professional',
      specialization: data.specialization || '', photoUrl: data.avatar_url || '',
      workplaceName: data.workplace_name || '', city: data.city || '',
    })
  }))

  const consultationResult = rows?.length
    ? await supabase.from('consultations').select('appointment_id, payment_status').in('appointment_id', rows.map((r) => r.id))
    : { data: [], error: null }
  if (consultationResult.error) throw new Error(consultationResult.error.message || 'Could not load consultation status.')
  const paymentByAppointment = new Map((consultationResult.data || []).map((c) => [c.appointment_id, c.payment_status]))
  return (rows || []).map((row) => {
    const professional = profMap.get(row.professional_id) || {}
    const minute = asMinutes(row.start_time)
    return {
      id: row.id, professionalId: row.professional_id,
      professionalName: professional.displayName || professional.fullName || 'Healthcare Professional',
      professionalSpecialization: professional.specialization || '', professionalPhoto: professional.photoUrl || '',
      professionalWorkplace: professional.workplaceName || '', professionalCity: professional.city || '',
      patientName: row.patient_name || '', patientPhone: row.phone_consented ? row.patient_phone || '' : '',
      bookingReference: `FK-${String(row.id).slice(0, 8).toUpperCase()}`,
      date: String(row.appointment_date).slice(0, 10), time: as12Hour(minute), time24: String(row.start_time).slice(0, 5),
      fee: Number(row.fee || 0),
      durationMinutes: Number(row.duration_minutes || 20),
      status: String(row.status || '').toLowerCase() === 'confirmed' ? 'upcoming' : String(row.status || '').toLowerCase(),
      paymentStatus: String(paymentByAppointment.get(row.id) || row.payment_status || 'pending').toUpperCase(),
      notes: row.notes || '', bookedAt: row.booked_at || row.created_at,
    }
  })
}

export async function getUserPaymentHistory() {
  // Payment processing is not configured; never present fabricated transactions or receipts.
  return []
}

export async function cancelUserAppointment(appointmentId, reason = 'Cancelled by patient') {
  const { data, error } = await supabase.rpc('cancel_patient_appointment', { p_appointment_id: appointmentId, p_reason: reason })
  if (error) return { success: false, error: error.message || 'Could not cancel this appointment.' }
  if (!data?.success) return { success: false, error: data?.error || 'Could not cancel this appointment.' }
  return { success: true, appointment: data.appointment }
}

export async function rescheduleAppointment(appointmentId, newDate, newTime24) {
  const { data, error } = await supabase.rpc('reschedule_patient_appointment', {
    p_appointment_id: appointmentId, p_appointment_date: newDate, p_start_time: newTime24,
  })
  if (error) return { success: false, error: error.message || 'Could not reschedule this appointment.' }
  if (!data?.success) return { success: false, error: data?.error || 'Could not reschedule this appointment.' }
  return { success: true, appointment: data.appointment, message: 'Appointment rescheduled successfully.' }
}
