import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Calendar,
    Clock,
    Phone,
    CheckCircle2,
    X,
    ArrowRight,
    ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getAvailableSlotsForDateRange,
    bookConsultationAppointment,
} from '../../services/user/userConsultationService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchUserProfile } from '../../services/userProfileService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function AppointmentBookingModal({ professional, isOpen, onClose, onBookingSuccess }) {
    const navigate = useNavigate()
    const { user } = useAuth()

    // Steps: 1: 'slot_select', 2: 'patient_info', 3: 'payment_summary', 4: 'confirmed'
    const [step, setStep] = useState(1)

    // Doctor consultation settings
    const fee = Number(professional?.consultation?.fee || 0)
    const duration = Number(professional?.consultation?.durationMinutes || 20)

    // Date generation: next 14 days
    const next14Days = useMemo(() => {
        const days = []
        const now = new Date()
        for (let i = 0; i < 14; i++) {
            const d = new Date(now)
            d.setDate(now.getDate() + i)
            const yStr = d.getFullYear()
            const mStr = String(d.getMonth() + 1).padStart(2, '0')
            const dStr = String(d.getDate()).padStart(2, '0')
            const iso = `${yStr}-${mStr}-${dStr}`
            days.push({
                iso,
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: d.getDate(),
                monthName: d.toLocaleDateString('en-US', { month: 'short' }),
                isToday: i === 0,
            })
        }
        return days
    }, [])

    const [selectedDate, setSelectedDate] = useState(() => next14Days[0]?.iso || '')
    const [slotsByDate, setSlotsByDate] = useState({})
    const [slotsError, setSlotsError] = useState('')
    const [selectedSlot, setSelectedSlot] = useState(null) // { time24, time12 }
    const [slotsLoading, setSlotsLoading] = useState(false)

    // Patient Form State
    const [patientName, setPatientName] = useState('')
    const [patientPhone, setPatientPhone] = useState('')
    const [patientAge, setPatientAge] = useState('')
    const [patientGender, setPatientGender] = useState('Prefer not to say')
    const [phoneConsented, setPhoneConsented] = useState(false)
    const [chiefComplaint, setChiefComplaint] = useState('')
    const [bloodGroup, setBloodGroup] = useState('')
    const [allergies, setAllergies] = useState('')
    const [currentMedications, setCurrentMedications] = useState('')

    const [submitting, setSubmitting] = useState(false)
    const [confirmedBooking, setConfirmedBooking] = useState(null)

    useEffect(() => {
        if (!isOpen) return
        setStep(1)
        setSelectedDate(next14Days[0]?.iso || '')
        setSelectedSlot(null)
        setConfirmedBooking(null)
    }, [isOpen, professional?.id, next14Days])

    // Load the full 14-day availability window so the first open date with slots
    // is selected automatically instead of leaving users on an empty day.
    useEffect(() => {
        if (!isOpen || !professional?.id || !next14Days.length) return
        let cancelled = false
        setSlotsError('')
        setSlotsLoading(true)
        getAvailableSlotsForDateRange(professional.id, next14Days[0].iso, next14Days[next14Days.length - 1].iso)
            .then((slots) => {
                if (cancelled) return
                setSlotsByDate(slots)
                const firstAvailableDate = next14Days.find((day) => slots[day.iso]?.length)?.iso
                setSelectedDate((currentDate) => slots[currentDate]?.length ? currentDate : firstAvailableDate || next14Days[0].iso)
                setSelectedSlot(null)
            })
            .catch((error) => {
                if (!cancelled) {
                    setSlotsByDate({})
                    setSelectedSlot(null)
                    setSlotsError(error?.message || 'Could not load appointment availability.')
                    toast.error(error?.message || 'Could not load appointment availability.')
                }
            })
            .finally(() => { if (!cancelled) setSlotsLoading(false) })
        return () => { cancelled = true }
    }, [isOpen, professional?.id, next14Days])

    const availableSlots = slotsByDate[selectedDate] || []

    useEffect(() => {
        if (!isOpen || !user?.id) return
        fetchUserProfile(user).then((result) => {
            const data = result?.data
            if (!result?.success || !data) return
            setPatientName(data.personal?.fullName || '')
            setPatientPhone(data.personal?.phone || user.phone || '')
            setPatientAge(data.personal?.age || '')
            setPatientGender(data.personal?.gender || 'Prefer not to say')
            setBloodGroup(data.personal?.bloodGroup || '')
            setAllergies((data.healthSummary?.allergies || []).map((item) => item.allergen).filter(Boolean).join(', '))
            setCurrentMedications((data.healthSummary?.medications || []).map((item) => item.medication_name).filter(Boolean).join(', '))
        }).catch((error) => console.error('[BookingModal] Could not prefill profile details:', error))
    }, [isOpen, user?.id])

    if (!isOpen || !professional) return null

    // ─── Step 1 Validation ──────────────────────────────────────────────────
    const handleNextToPatientInfo = () => {
        if (!selectedSlot) {
            toast.error('Please select an available time slot.')
            return
        }
        setStep(2)
    }

    // ─── Step 2 Validation ──────────────────────────────────────────────────
    const handleNextToPayment = () => {
        if (!patientName.trim()) {
            toast.error('Please enter patient name.')
            return
        }
        const cleanDigits = patientPhone.replace(/\D/g, '')
        if (cleanDigits.length < 10) {
            toast.error('Please enter a valid 10-digit phone number.')
            return
        }
        if (!phoneConsented) {
            toast.error('Please accept the phone consultation consent.')
            return
        }
        setStep(3)
    }

    // ─── Step 3: Confirm & Book Appointment ─────────────────────────────────
    const handleConfirmBooking = async () => {
        setSubmitting(true)
        try {
            const res = await bookConsultationAppointment({
                professionalId: professional.id,
                date: selectedDate,
                time24: selectedSlot.time24,
                time12: selectedSlot.time12,
                patientName,
                patientPhone,
                phoneConsented,
                patientAge,
                patientGender,
                notes: chiefComplaint,
                healthDetails: {
                    bloodGroup,
                    allergies: allergies ? allergies.split(',').map((s) => s.trim()) : [],
                    currentMedications: currentMedications ? currentMedications.split(',').map((s) => s.trim()) : [],
                    chiefComplaint,
                },
            })

            if (res.success) {
                setConfirmedBooking(res.booking)
                setStep(4)
                toast.success('Appointment booked successfully.')
                if (onBookingSuccess) onBookingSuccess(res.booking)
            } else {
                toast.error(res.error || 'Failed to complete booking.')
            }
        } catch (err) {
            console.error('[BookingModal] Error:', err)
            toast.error(err?.message || 'An unexpected error occurred during booking.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
                {/* Modal Top Bar */}
                <div className="flex items-center justify-between border-b border-[#E8EFEB] px-6 py-4 bg-[#FAFBF9]">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135]">
                            <Phone size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#033135]">
                                Book Phone Consultation
                            </h3>
                            <p className="text-[11px] text-[#647572]">
                                with {professional.displayName || professional.name}
                            </p>
                        </div>
                    </div>

                    {step !== 4 && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Stepper Indicator (for steps 1-3) */}
                {step < 4 && (
                    <div className="px-6 pt-4 pb-1 border-b border-[#F0F4F2] bg-white">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#647572] mb-2">
                            <span className={step >= 1 ? 'text-[#033135]' : ''}>1. Select Slot</span>
                            <span className={step >= 2 ? 'text-[#033135]' : ''}>2. Patient Details</span>
                            <span className={step >= 3 ? 'text-[#033135]' : ''}>3. Review &amp; Pay</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#E8EFEB] overflow-hidden">
                            <div
                                className="h-full bg-[#033135] transition-all duration-300 rounded-full"
                                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                            />
                        </div>
                    </div>
                )}

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* STEP 1: SELECT DATE & AVAILABLE TIME SLOT                 */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {/* Consultation Fee & Overview Banner */}
                            <div className="rounded-2xl border border-[#DCE7E3] bg-[#E4F0EA]/40 p-3.5 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#647572]">Consultation Rate</span>
                                    <p className="text-base font-black text-[#033135]">
                                        ₹{fee} <span className="text-xs font-normal text-[#647572]">/ {duration}-minute phone session</span>
                                    </p>
                                </div>
                                <span className="rounded-full bg-white border border-[#DCE7E3] px-2.5 py-1 text-[11px] font-bold text-[#2F7B58] flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Direct Calling
                                </span>
                            </div>

                            {/* Date Picker Carousel */}
                            <div>
                                <label className="block text-xs font-bold text-[#033135] mb-2">
                                    Select Appointment Date
                                </label>
                                <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {next14Days.map((d) => (
                                        <button
                                            key={d.iso}
                                            type="button"
                                            onClick={() => { setSelectedDate(d.iso); setSelectedSlot(null) }}
                                            className={`flex flex-col items-center justify-center min-w-[62px] py-2.5 px-2 rounded-2xl border text-xs transition shrink-0 ${selectedDate === d.iso
                                                ? 'border-[#033135] bg-[#033135] !text-white shadow-xs font-bold'
                                                : 'border-[#E8EFEB] bg-[#FAFBF9] text-[#647572] hover:bg-white'
                                                }`}
                                            style={selectedDate === d.iso ? { color: '#ffffff' } : {}}
                                        >
                                            <span className="text-[10px] uppercase tracking-wider">{d.dayName}</span>
                                            <span className="text-base font-black my-0.5">{d.dayNumber}</span>
                                            <span className="text-[10px]">{d.monthName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Available Slots Grid */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-[#033135]">
                                        Available Time Slots ({availableSlots.length})
                                    </label>
                                    <span className="text-[11px] text-[#647572]">
                                        {selectedDate}
                                    </span>
                                </div>

                                {slotsLoading ? (
                                    <div className="rounded-2xl border border-dashed border-[#DCE7E3] bg-[#FAFBF9] p-8 text-center text-xs text-[#647572]">Loading live availability…</div>
                                ) : slotsError ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">{slotsError}</div>
                                ) : availableSlots.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-[#DCE7E3] bg-[#FAFBF9] p-8 text-center space-y-1">
                                        <Clock size={24} className="mx-auto text-[#9AA6A0]" />
                                        <p className="text-xs font-bold text-[#033135]">No slots available on this date</p>
                                        <p className="text-[11px] text-[#647572]">Choose another date above. Dates with open slots are selected first when available.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-0.5">
                                        {availableSlots.map((slot) => {
                                            const isSelected = selectedSlot?.time24 === slot.time24
                                            return (
                                                <button
                                                    key={slot.time24}
                                                    type="button"
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className={`rounded-xl border py-2.5 px-2 text-center text-xs font-bold transition ${isSelected
                                                        ? 'border-[#2F7B58] bg-[#E4F0EA] text-[#033135] ring-2 ring-[#2F7B58]/30 font-black'
                                                        : 'border-[#E8EFEB] bg-white text-[#033135] hover:border-[#DCE7E3] hover:bg-[#FAFBF9]'
                                                        }`}
                                                >
                                                    {slot.time12}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* STEP 2: PATIENT CONTACT & HEALTH CONSENT                   */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {step === 2 && (
                        <div className="space-y-4 text-xs">
                            <div className="rounded-2xl border border-[#E8EFEB] bg-[#FAFBF9] p-3 text-xs flex items-center justify-between">
                                <span className="text-[#647572]">Selected Slot:</span>
                                <span className="font-bold text-[#033135]">
                                    {selectedDate} at {selectedSlot?.time12} ({duration}m)
                                </span>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-[#033135] mb-1">Patient Full Name *</label>
                                    <input
                                        type="text"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        placeholder="Full Name"
                                        className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-2 text-xs font-semibold text-[#033135] outline-none focus:border-[#033135]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#033135] mb-1">Phone Number for Call *</label>
                                        <input
                                            type="text"
                                            value={patientPhone}
                                            onChange={(e) => setPatientPhone(e.target.value)}
                                            placeholder="+91 98765 43210"
                                            className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-2 text-xs font-semibold text-[#033135] outline-none focus:border-[#033135]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-[#033135] mb-1">Blood Group (Optional)</label>
                                        <select
                                            value={bloodGroup}
                                            onChange={(e) => setBloodGroup(e.target.value)}
                                            className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-2 text-xs font-semibold text-[#033135] outline-none"
                                        >
                                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                                                <option key={bg} value={bg}>{bg}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-[#033135] mb-1">
                                        Reason for Consultation / Chief Complaint *
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={chiefComplaint}
                                        onChange={(e) => setChiefComplaint(e.target.value)}
                                        placeholder="Briefly describe symptoms, health goals, or questions..."
                                        className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-2 text-xs outline-none focus:border-[#033135]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#033135] mb-1">Known Allergies (Optional)</label>
                                        <input
                                            type="text"
                                            value={allergies}
                                            onChange={(e) => setAllergies(e.target.value)}
                                            placeholder="e.g. Penicillin, Peanuts"
                                            className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-1.5 text-xs outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#033135] mb-1">Current Medications (Optional)</label>
                                        <input
                                            type="text"
                                            value={currentMedications}
                                            onChange={(e) => setCurrentMedications(e.target.value)}
                                            placeholder="e.g. Atorvastatin 10mg"
                                            className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-1.5 text-xs outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Explicit Patient Consent */}
                            <label className="flex items-start gap-2.5 rounded-2xl border border-[#DCE7E3] bg-[#E4F0EA]/30 p-3.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={phoneConsented}
                                    onChange={(e) => setPhoneConsented(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded accent-[#033135]"
                                />
                                <div className="text-[11px] text-[#033135] leading-relaxed">
                                    <strong>Phone Consultation Consent:</strong> I explicitly consent to receive a direct phone consultation from the practitioner at this phone number during my booked appointment slot.
                                </div>
                            </label>
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* STEP 3: FITKEY XP DISCOUNT & PAYMENT SUMMARY              */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {step === 3 && (
                        <div className="space-y-4 text-xs">
                            {/* Summary Card */}
                            <div className="rounded-2xl border border-[#E8EFEB] bg-[#FAFBF9] p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[#647572]">Practitioner:</span>
                                    <span className="font-bold text-[#033135]">{professional.displayName || professional.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#647572]">Appointment Date &amp; Time:</span>
                                    <span className="font-bold text-[#033135]">{selectedDate} at {selectedSlot?.time12}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#647572]">Patient:</span>
                                    <span className="font-semibold text-[#033135]">{patientName} ({patientPhone})</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#E8EFEB] p-4 space-y-2 bg-white">
                                <div className="flex items-center justify-between text-[#647572]">
                                    <span>Consultation fee:</span>
                                    <span className="font-semibold text-[#033135]">₹{fee.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-[#E8EFEB] pt-2 text-sm font-black text-[#033135]">
                                    <span>Payment status:</span>
                                    <span className="text-base text-amber-700">Pending</span>
                                </div>
                            </div>
                            <p className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                                Your appointment is saved. Payment processing is not available yet; no payment has been taken.
                            </p>
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* STEP 4: BOOKING CONFIRMATION SCREEN                       */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {step === 4 && confirmedBooking && (
                        <div className="text-center py-4 space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#E4F0EA] text-[#2F7B58]">
                                <CheckCircle2 size={36} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-[#033135]" style={{ fontFamily: SERIF }}>
                                    Appointment Booked
                                </h3>
                                <p className="text-xs text-[#647572] mt-1">
                                    Your appointment has been saved to the practitioner&apos;s schedule.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#DCE7E3] bg-[#FAFBF9] p-4 text-xs text-left space-y-2 max-w-md mx-auto">
                                <div className="flex items-center justify-between">
                                    <span className="text-[#647572]">Booking Reference</span>
                                    <span className="font-mono font-bold text-[#033135]">#{confirmedBooking.bookingReference}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#647572]">Doctor</span>
                                    <span className="font-bold text-[#033135]">{confirmedBooking.appointment.professionalName || professional.displayName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#647572]">Date &amp; Time</span>
                                    <span className="font-bold text-[#033135]">{confirmedBooking.appointment.date} at {confirmedBooking.appointment.time}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#647572]">Phone Number</span>
                                    <span className="font-bold text-[#033135]">{confirmedBooking.appointment.patientPhone}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-[#E8EFEB] pt-2">
                                    <span className="text-[#647572]">Payment status</span>
                                    <span className="font-black text-amber-700">Pending · ₹{confirmedBooking.amountDue?.toLocaleString('en-IN') || 0} due</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-[#647572] max-w-sm mx-auto leading-relaxed">
                                You will receive your direct consultation call on your phone during this appointment window.
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer Controls */}
                <div className="border-t border-[#E8EFEB] px-6 py-4 bg-[#FAFBF9] flex items-center justify-between">
                    {step === 1 && (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572] hover:bg-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleNextToPatientInfo}
                                disabled={!selectedSlot}
                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2.5 text-xs font-bold !text-white hover:bg-[#324C4D] transition disabled:opacity-40"
                                style={{ color: '#ffffff' }}
                            >
                                <span>Continue</span>
                                <ArrowRight size={13} />
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572] hover:bg-white"
                            >
                                <ArrowLeft size={13} />
                                <span>Back to Slots</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleNextToPayment}
                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2.5 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                <span>Review booking</span>
                                <ArrowRight size={13} />
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572] hover:bg-white"
                            >
                                <ArrowLeft size={13} />
                                <span>Back</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmBooking}
                                disabled={submitting}
                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-6 py-2.5 text-xs font-bold !text-white hover:bg-[#324C4D] transition shadow-xs disabled:opacity-50"
                                style={{ color: '#ffffff' }}
                            >
                                {submitting ? (
                                    <span>Confirming...</span>
                                ) : (
                                    <>
                                        <Calendar size={14} />
                                        <span>Confirm booking</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {step === 4 && (
                        <div className="w-full flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose()
                                    navigate('/consultation-history')
                                }}
                                className="flex items-center gap-1 rounded-xl bg-[#033135] px-5 py-2.5 text-xs font-bold !text-white hover:bg-[#324C4D] transition shadow-xs"
                                style={{ color: '#ffffff' }}
                            >
                                <span>View in My Consultations</span>
                                <ArrowRight size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2.5 text-xs font-semibold text-[#647572] hover:bg-white"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
