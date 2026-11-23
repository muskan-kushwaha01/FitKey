import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Calendar,
    Clock,
    Phone,
    Shield,
    CheckCircle2,
    X,
    Zap,
    CreditCard,
    AlertCircle,
    User,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Check,
    FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getAvailableSlotsForDate,
    calculateXpDiscount,
    bookConsultationAppointment,
    MAX_XP_DISCOUNT_PERCENT,
    MAX_XP_DISCOUNT_POINTS,
} from '../../services/user/userConsultationService.js'
import { getConsultationSettings } from '../../services/professional/professionalConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function AppointmentBookingModal({ professional, isOpen, onClose, onBookingSuccess }) {
    const navigate = useNavigate()

    // Steps: 1: 'slot_select', 2: 'patient_info', 3: 'payment_summary', 4: 'confirmed'
    const [step, setStep] = useState(1)

    // Doctor consultation settings
    const settings = useMemo(() => {
        if (!professional?.id) return null
        return getConsultationSettings(professional.id)
    }, [professional?.id])

    const fee = settings?.consultationFee || 500
    const duration = settings?.durationMinutes || 20

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
    const [availableSlots, setAvailableSlots] = useState([])
    const [selectedSlot, setSelectedSlot] = useState(null) // { time24, time12 }

    // Patient Form State
    const [patientName, setPatientName] = useState('Alex Morgan')
    const [patientPhone, setPatientPhone] = useState('+91 98765 12345')
    const [patientAge, setPatientAge] = useState('28')
    const [patientGender, setPatientGender] = useState('Female')
    const [phoneConsented, setPhoneConsented] = useState(true)
    const [chiefComplaint, setChiefComplaint] = useState('')
    const [bloodGroup, setBloodGroup] = useState('O+')
    const [allergies, setAllergies] = useState('')
    const [currentMedications, setCurrentMedications] = useState('')

    // XP Discount State
    const [applyXp, setApplyXp] = useState(false)
    const [requestedXp, setRequestedXp] = useState(50)
    const [submitting, setSubmitting] = useState(false)
    const [confirmedBooking, setConfirmedBooking] = useState(null)

    // Load available slots when date or professional changes
    useEffect(() => {
        if (!professional?.id || !selectedDate) return
        const slots = getAvailableSlotsForDate(professional.id, selectedDate)
        setAvailableSlots(slots)
        // Reset selected slot if not in the new date's available slots
        setSelectedSlot((prev) => {
            if (prev && slots.some((s) => s.time24 === prev.time24)) return prev
            return null
        })
    }, [professional?.id, selectedDate])

    // XP discount calculation
    const xpCalc = useMemo(() => {
        return calculateXpDiscount(fee, applyXp ? requestedXp : 0)
    }, [fee, applyXp, requestedXp])

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
    const handleConfirmBooking = () => {
        setSubmitting(true)
        try {
            const res = bookConsultationAppointment({
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
                xpPointsToRedeem: applyXp ? xpCalc.appliedXP : 0,
                paymentMethod: 'UPI (FitKey Simulated Tele-Payment)',
            })

            if (res.success) {
                setConfirmedBooking(res.booking)
                setStep(4)
                toast.success('Consultation booked successfully! 🎉')
                if (onBookingSuccess) onBookingSuccess(res.booking)
            } else {
                toast.error(res.error || 'Failed to complete booking.')
            }
        } catch (err) {
            console.error('[BookingModal] Error:', err)
            toast.error('An unexpected error occurred during booking.')
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
                                            onClick={() => setSelectedDate(d.iso)}
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

                                {availableSlots.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-[#DCE7E3] bg-[#FAFBF9] p-8 text-center space-y-1">
                                        <Clock size={24} className="mx-auto text-[#9AA6A0]" />
                                        <p className="text-xs font-bold text-[#033135]">No slots available on this date</p>
                                        <p className="text-[11px] text-[#647572]">The practitioner is off or fully booked. Please select another date above.</p>
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

                            {/* XP Redemption Section */}
                            <div className="rounded-2xl border border-[#E0AE3A]/50 bg-gradient-to-r from-[#F8E7A5]/25 via-white to-white p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8E7A5] text-[#8B6D25]">
                                            <Zap size={14} fill="currentColor" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#033135]">Apply FitKey Health XP</h4>
                                            <p className="text-[10px] text-[#647572]">
                                                Available balance: <strong>{xpCalc.availableXP} XP</strong> (1 XP = ₹1)
                                            </p>
                                        </div>
                                    </div>

                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={applyXp}
                                            disabled={xpCalc.availableXP <= 0}
                                            onChange={(e) => setApplyXp(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#033135]"></div>
                                    </label>
                                </div>

                                {applyXp && xpCalc.maxEligibleXP > 0 && (
                                    <div className="space-y-1 pt-1 border-t border-[#E8EFEB]">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-[#647572]">XP to Redeem:</span>
                                            <span className="font-black text-[#033135]">{xpCalc.appliedXP} XP</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max={xpCalc.maxEligibleXP}
                                            step="10"
                                            value={xpCalc.appliedXP}
                                            onChange={(e) => setRequestedXp(Number(e.target.value))}
                                            className="w-full accent-[#033135]"
                                        />
                                        <p className="text-[10px] text-[#2F7B58] font-semibold">
                                            ✓ Applying ₹{xpCalc.discountAmount} rebate towards consultation fee.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Fee Breakdown */}
                            <div className="rounded-2xl border border-[#E8EFEB] p-4 space-y-2 bg-white">
                                <div className="flex items-center justify-between text-[#647572]">
                                    <span>Consultation Base Fee:</span>
                                    <span className="font-semibold text-[#033135]">₹{fee}</span>
                                </div>

                                {applyXp && xpCalc.discountAmount > 0 && (
                                    <div className="flex items-center justify-between text-[#2F7B58] font-bold">
                                        <span>FitKey XP Discount:</span>
                                        <span>-₹{xpCalc.discountAmount}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between border-t border-[#E8EFEB] pt-2 text-sm font-black text-[#033135]">
                                    <span>Final Payable Amount:</span>
                                    <span className="text-base text-[#2F7B58]">₹{xpCalc.finalAmount}</span>
                                </div>
                            </div>

                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                                ℹ️ <strong>Simulated Telehealth Booking:</strong> Payment is simulated for prototype evaluation. No real bank deduction will occur.
                            </div>
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
                                    Appointment Confirmed!
                                </h3>
                                <p className="text-xs text-[#647572] mt-1">
                                    Your phone consultation has been booked and synced with the practitioner&apos;s schedule.
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
                                    <span className="text-[#647572]">Amount Paid</span>
                                    <span className="font-black text-[#2F7B58]">₹{confirmedBooking.amountPaid}</span>
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
                                <span>Proceed to Payment</span>
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
                                        <CreditCard size={14} />
                                        <span>Confirm &amp; Pay ₹{xpCalc.finalAmount}</span>
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
