import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import {
    Calendar,
    Clock,
    Phone,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Settings,
    AlertCircle,
    CalendarCheck,
    ChevronRight,
    PhoneCall,
    Power,
    Eye,
    X,
    Activity,
    Pill,
    AlertTriangle,
    FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    fetchConsultationSettings,
    toggleConsultationStatus,
    fetchAppointments,
    fetchEarningsSummary,
    DAYS_OF_WEEK,
} from '../../../services/professional/professionalConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function ConsultationOverview() {
    const navigate = useNavigate()
    const { professional } = useOutletContext() || {}

    const [settings, setSettings] = useState(null)
    const [allAppointments, setAllAppointments] = useState([])
    const [upcomingAppointments, setUpcomingAppointments] = useState([])
    const [earnings, setEarnings] = useState(null)
    const [loading, setLoading] = useState(true)

    // Modals
    const [selectedAptDetails, setSelectedAptDetails] = useState(null)
    const [callConfirmApt, setCallConfirmApt] = useState(null)

    const loadData = useCallback(async () => {
        if (!professional?.id) return
        setLoading(true)
        try {

            const [s, allApts, apts, earn] = await Promise.all([
                fetchConsultationSettings(professional.id),
                fetchAppointments(professional.id),
                fetchAppointments(professional.id, { status: 'upcoming' }),
                fetchEarningsSummary(professional.id),
            ])

            setSettings(s.settings)
            if (!s.success) toast.error(s.error || 'Could not load saved consultation settings.')

            if (!allApts?.success) {
                console.error('[ConsultationOverview] All appointments:', allApts?.error)
            }

            setAllAppointments(
                Array.isArray(allApts?.appointments)
                    ? allApts.appointments
                    : []
            )

            if (!apts?.success) {
                console.error('[ConsultationOverview] Upcoming appointments:', apts?.error)
            }

            setUpcomingAppointments(
                Array.isArray(apts?.appointments)
                    ? apts.appointments
                    : []
            )

            setEarnings(earn)
            if (!allApts?.success) {
                console.error('[ConsultationOverview] All appointments:', allApts?.error)
            }

            if (!apts?.success) {
                console.error('[ConsultationOverview] Upcoming appointments:', apts?.error)
            }

        } catch (err) {
            console.error('[ConsultationOverview] Error loading data:', err)
            toast.error('Could not load consultation overview.')
        } finally {
            setLoading(false)
        }
    }, [professional?.id])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleToggleStatus = async () => {
        if (!professional?.id) return
        const res = await toggleConsultationStatus(professional.id)
        if (res.success) {
            setSettings(res.settings)
            toast.success(
                res.settings.consultationsEnabled
                    ? 'Consultations are now Active for patient bookings.'
                    : 'Consultations paused. You will not receive new bookings.'
            )
        } else {
            toast.error(res.error || 'Failed to update status.')
        }
    }

    const handleDirectDial = (phone) => {
        if (!phone) {
            toast.error('No phone number provided.')
            return
        }
        window.location.href = `tel:${phone}`
    }

    if (loading || !settings) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
    }

    const isEnabled = settings.consultationsEnabled
    const isConfigured = Boolean(settings.configuredAt)

    // Recent consultation activity (latest completed, cancelled, or updated records)
    const recentActivity = [...allAppointments]
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 5)

    return (
        <div className="space-y-6 sm:space-y-7">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1
                        className="mt-1 text-2xl sm:text-3xl lg:text-4xl text-[#033135] font-normal"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Consultation Overview
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Manage your patient consultation availability, phone scheduling, and practice earnings.
                    </p>
                </div>

                {/* Status Toggle & Quick Settings Button */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={handleToggleStatus}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs active:scale-[0.99] ${isEnabled
                            ? 'bg-[#E4F0EA] text-[#2F7B58] border border-[#2F7B58]/30 hover:bg-[#D5EAE0]'
                            : 'bg-[#FAFBF9] text-[#647572] border border-[#DCE7E3] hover:bg-[#F0F4F2]'
                            }`}
                    >
                        <Power size={14} className={isEnabled ? 'text-[#2F7B58]' : 'text-[#647572]'} />
                        <span>{isEnabled ? 'Availability: Active' : 'Availability: Paused'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/professional/consultations/schedule')}
                        className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2.5 text-xs font-bold !text-white shadow-xs hover:bg-[#324C4D] transition"
                        style={{ color: '#ffffff' }}
                    >
                        <Settings size={14} />
                        <span>Edit Schedule</span>
                    </button>
                </div>
            </div>

            {/* Unconfigured / Disabled Setup Callout Banner */}
            {!isEnabled && (
                <div className="rounded-2xl border border-[#E0AE3A]/50 bg-gradient-to-r from-[#F8E7A5]/40 via-[#FAFBF9] to-[#E4F0EA]/40 p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8E7A5] text-[#8B6D25] shadow-xs">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#033135]">
                                    {!isConfigured
                                        ? 'Set up phone consultations on FitKey'
                                        : 'Consultations are currently paused'}
                                </h3>
                                <p className="mt-0.5 text-xs text-[#647572] max-w-2xl leading-relaxed">
                                    {!isConfigured
                                        ? 'You have not configured your consultation preferences yet. Enable phone appointments to start accepting verified patient bookings.'
                                        : 'Patients cannot view or book your consultation slots while status is paused. Click the toggle above to resume.'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleToggleStatus}
                            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition shrink-0"
                            style={{ color: '#ffffff' }}
                        >
                            <span>Enable Consultations</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Main Two-Column Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Columns: Upcoming Appointments & Schedule Summary */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Upcoming Appointments Card */}
                    <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-4 border-b border-[#E8EFEB]">
                            <div className="flex items-center gap-2">
                                <CalendarCheck size={18} className="text-[#648C83]" />
                                <h2 className="text-base font-extrabold text-[#033135]">
                                    Upcoming Consultations ({upcomingAppointments.length})
                                </h2>
                            </div>
                            <Link
                                to="/professional/consultations/appointments"
                                className="text-xs font-bold text-[#033135] hover:text-[#648C83] flex items-center gap-1"
                            >
                                View all <ArrowRight size={13} />
                            </Link>
                        </div>

                        {upcomingAppointments.length > 0 ? (
                            <div className="mt-4 divide-y divide-[#F0F4F2]">
                                {upcomingAppointments.map((apt) => (
                                    <div
                                        key={apt.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135] font-bold text-sm">
                                                {apt.patientName?.charAt(0) || 'P'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-[#033135]">{apt.patientName}</p>
                                                    <span className="rounded-full bg-[#E4F0EA] px-2 py-0.2 text-[10px] font-bold text-[#2F7B58]">
                                                        Confirmed
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#647572] mt-0.5">
                                                    {apt.date} at <span className="font-semibold text-[#033135]">{apt.time}</span> ({apt.durationMinutes} mins)
                                                </p>
                                                {apt.notes && (
                                                    <p className="text-[11px] text-[#9AA6A0] mt-1 line-clamp-1 italic">
                                                        &ldquo;{apt.notes}&rdquo;
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 sm:self-center self-end">
                                            <span className="text-xs font-black text-[#033135] mr-1">
                                                ₹{apt.fee}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedAptDetails(apt)}
                                                className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-2.5 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                            >
                                                <Eye size={12} />
                                                <span>Details</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCallConfirmApt(apt)}
                                                disabled={!apt.phoneConsented}
                                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-3.5 py-1.5 text-xs font-bold !text-white shadow-xs hover:bg-[#324C4D] transition disabled:opacity-40"
                                                style={{ color: '#ffffff' }}
                                            >
                                                <Phone size={12} />
                                                <span>Call User</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center space-y-2">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAFBF9] border border-[#E8EFEB] text-[#9AA6A0]">
                                    <Calendar size={22} />
                                </div>
                                <h3 className="text-sm font-bold text-[#033135]">No upcoming consultations</h3>
                                <p className="text-xs text-[#647572] max-w-sm mx-auto">
                                    When patients book phone slots from your verified profile, their appointment details and calling time will appear here.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Schedule & Weekly Timings Snapshot Card */}
                    <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-4 border-b border-[#E8EFEB]">
                            <div className="flex items-center gap-2">
                                <Clock size={18} className="text-[#648C83]" />
                                <h2 className="text-base font-extrabold text-[#033135]">
                                    Active Consultation Hours
                                </h2>
                            </div>
                            <Link
                                to="/professional/consultations/schedule"
                                className="text-xs font-bold text-[#033135] hover:text-[#648C83] flex items-center gap-1"
                            >
                                Open Interactive Calendar <ArrowRight size={13} />
                            </Link>
                        </div>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {DAYS_OF_WEEK.map((day) => {
                                const dayConfig = settings.schedule?.[day.key] || { enabled: false }
                                return (
                                    <div
                                        key={day.key}
                                        className={`rounded-2xl border p-3 text-xs transition ${dayConfig.enabled
                                            ? 'bg-[#FAFBF9] border-[#DCE7E3]'
                                            : 'bg-white border-[#E8EFEB] opacity-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-[#033135]">{day.label}</span>
                                            <span
                                                className={`h-2 w-2 rounded-full ${dayConfig.enabled ? 'bg-[#2F7B58]' : 'bg-[#DCE7E3]'
                                                    }`}
                                            />
                                        </div>
                                        <p className="mt-1 text-[11px] text-[#647572]">
                                            {dayConfig.enabled
                                                ? `${dayConfig.startTime} – ${dayConfig.endTime}`
                                                : 'Unavailable'}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                </div>

                {/* Right Column: Settings, Payout & Recent Activity */}
                <div className="space-y-6">
                    {/* Recent Consultation Activity */}
                    <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                            <h3 className="text-sm font-bold text-[#033135]">Recent Practice Activity</h3>
                            <Link
                                to="/professional/consultations/history"
                                className="text-[11px] font-bold text-[#648C83] hover:text-[#033135]"
                            >
                                All History
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((act) => (
                                    <div
                                        key={act.id}
                                        className="flex items-start justify-between gap-2 border-b border-[#F0F4F2] pb-2.5 last:border-0 last:pb-0 text-xs"
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-bold text-[#033135]">{act.patientName}</p>
                                                <span
                                                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase ${act.status === 'completed'
                                                        ? 'bg-[#E4F0EA] text-[#2F7B58]'
                                                        : act.status === 'cancelled'
                                                            ? 'bg-rose-50 text-[#C0563B]'
                                                            : 'bg-[#FAFBF9] text-[#033135] border border-[#DCE7E3]'
                                                        }`}
                                                >
                                                    {act.status}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#647572]">
                                                {act.date} · {act.time}
                                            </p>
                                        </div>
                                        <span className="font-bold text-[#033135] text-xs">
                                            ₹{act.fee}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-[#9AA6A0] italic">No recent activity recorded.</p>
                            )}
                        </div>
                    </section>

                    {/* Consultation Contact Details */}
                    <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                            <h3 className="text-sm font-bold text-[#033135]">Contact &amp; Privacy</h3>
                            <span className="rounded-full bg-[#E4F0EA] px-2 py-0.5 text-[10px] font-bold text-[#2F7B58]">
                                Protected
                            </span>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-[#647572]">Consultation Line</span>
                                <p className="font-bold text-[#033135] text-sm flex items-center gap-1.5">
                                    <Phone size={14} className="text-[#648C83]" />
                                    {settings.consultationPhone || professional?.phone || 'Not provided'}
                                </p>
                            </div>

                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-[#647572]">Patient Phone Consent</span>
                                <p className="font-semibold text-[#033135] flex items-center gap-1.5">
                                    {settings.consentPhoneSharing ? (
                                        <>
                                            <CheckCircle2 size={14} className="text-[#2F7B58]" />
                                            <span>Consent granted for confirmed bookings</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={14} className="text-[#C0563B]" />
                                            <span>Direct phone number hidden</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-[#647572]">Practice Timezone</span>
                                <p className="font-semibold text-[#033135]">
                                    {settings.timezone || 'Asia/Kolkata'} (IST)
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/professional/consultations/schedule')}
                            className="w-full rounded-xl border border-[#DCE7E3] bg-white py-2 text-xs font-bold text-[#033135] hover:bg-[#FAFBF9] transition"
                        >
                            Update Consultation Settings
                        </button>
                    </section>

                    {/* Payout Status Snapshot */}
                    <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                            <h3 className="text-sm font-bold text-[#033135]">Payout Account</h3>
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${settings.payoutSetupStatus === 'active'
                                    ? 'bg-[#E4F0EA] text-[#2F7B58]'
                                    : 'bg-[#F8E7A5] text-[#8B6D25]'
                                    }`}
                            >
                                {settings.payoutSetupStatus === 'active' ? 'Active' : 'Setup Required'}
                            </span>
                        </div>

                        <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 space-y-1.5 text-xs">
                            <span className="text-[10px] uppercase font-bold text-[#647572]">Method</span>
                            <p className="font-bold text-[#033135]">
                                {settings.preferredPayoutMethod === 'upi' ? 'UPI Direct Payout' : 'Bank Transfer (NEFT/IMPS)'}
                            </p>
                            <p className="text-[11px] text-[#647572] truncate">
                                {settings.payoutUpiId || settings.accountNumberMasked || 'No payout account configured yet'}
                            </p>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-[#647572]">Pending Payout:</span>
                            <span className="font-black text-[#033135]">
                                ₹{(earnings?.pendingPayout || 0).toLocaleString()}
                            </span>
                        </div>

                        <Link
                            to="/professional/consultations/payments"
                            className="w-full flex items-center justify-center gap-1 rounded-xl bg-[#033135] py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                            style={{ color: '#ffffff' }}
                        >
                            <span>Manage Payout Settings</span>
                            <ChevronRight size={14} />
                        </Link>
                    </section>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 1: APPOINTMENT CLINICAL DETAILS MODAL                           */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {selectedAptDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-4">
                            <div>
                                <h3 className="text-base font-bold text-[#033135]">
                                    Appointment Details &amp; Health Profile
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    Booking #{selectedAptDetails.id}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAptDetails(null)}
                                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            {/* Patient Demographics */}
                            <div className="rounded-2xl border border-[#E8EFEB] bg-[#FAFBF9] p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-[#033135]">
                                        {selectedAptDetails.patientName}
                                    </h4>
                                    <span className="rounded-full bg-[#E4F0EA] px-2 py-0.5 text-[10px] font-black text-[#033135]">
                                        {selectedAptDetails.patientAge} YRS · {selectedAptDetails.patientGender}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[#647572]">
                                    <p>Phone: <strong className="text-[#033135]">{selectedAptDetails.phoneConsented ? selectedAptDetails.patientPhone : 'Hidden'}</strong></p>
                                    <p>Fee: <strong className="text-[#2F7B58]">₹{selectedAptDetails.fee} Confirmed</strong></p>
                                    <p>Date: <strong className="text-[#033135]">{selectedAptDetails.date}</strong></p>
                                    <p>Slot: <strong className="text-[#033135]">{selectedAptDetails.time} ({selectedAptDetails.durationMinutes}m)</strong></p>
                                </div>
                            </div>

                            {/* User-Shared Health Profile */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                    User-Shared Health Information
                                </h4>

                                {/* Blood Group & Allergies */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white">
                                        <p className="text-[10px] text-[#647572] font-semibold">Blood Group</p>
                                        <p className="text-sm font-black text-[#033135]">
                                            {selectedAptDetails.healthDetails?.bloodGroup || 'Not reported'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-rose-200 p-3 bg-rose-50/40">
                                        <div className="flex items-center gap-1 text-[10px] text-[#C0563B] font-bold">
                                            <AlertTriangle size={11} /> Known Allergies
                                        </div>
                                        <p className="text-xs font-bold text-[#C0563B] mt-0.5">
                                            {selectedAptDetails.healthDetails?.allergies?.join(', ') || 'None reported'}
                                        </p>
                                    </div>
                                </div>

                                {/* Current Medications */}
                                <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#647572] font-bold">
                                        <Pill size={12} className="text-[#648C83]" /> Current Medications
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {selectedAptDetails.healthDetails?.currentMedications?.map((med, i) => (
                                            <span key={i} className="rounded-md bg-[#FAFBF9] border border-[#E8EFEB] px-2 py-0.5 text-[11px] font-medium text-[#033135]">
                                                {med}
                                            </span>
                                        )) || <span className="text-[#9AA6A0] italic">No active medications</span>}
                                    </div>
                                </div>

                                {/* Medical History */}
                                <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#647572] font-bold">
                                        <Activity size={12} className="text-[#648C83]" /> Medical History
                                    </div>
                                    <ul className="list-disc list-inside text-xs text-[#033135] space-y-0.5 mt-1">
                                        {selectedAptDetails.healthDetails?.medicalHistory?.map((h, i) => (
                                            <li key={i}>{h}</li>
                                        )) || <li className="text-[#9AA6A0] italic">None declared</li>}
                                    </ul>
                                </div>

                                {/* Chief Complaint / Notes */}
                                <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                    <p className="text-[10px] text-[#647572] font-bold">Chief Clinical Complaint / Consultation Goal</p>
                                    <p className="text-xs text-[#033135] leading-relaxed">
                                        {selectedAptDetails.healthDetails?.chiefComplaint || selectedAptDetails.notes || 'General healthcare consultation.'}
                                    </p>
                                </div>

                                {/* Shared Documents */}
                                {selectedAptDetails.healthDetails?.sharedDocuments?.length > 0 && (
                                    <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                        <p className="text-[10px] text-[#647572] font-bold">User-Attached Medical Records</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAptDetails.healthDetails.sharedDocuments.map((doc, i) => (
                                                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-[#DCE7E3] bg-[#FAFBF9] px-2.5 py-1 text-[11px] font-medium text-[#033135]">
                                                    <FileText size={12} className="text-[#648C83]" />
                                                    <span>{doc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-6 flex items-center justify-between border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedAptDetails(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572] hover:bg-[#FAFBF9]"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedAptDetails(null)
                                    setCallConfirmApt(selectedAptDetails)
                                }}
                                disabled={!selectedAptDetails.phoneConsented}
                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition disabled:opacity-40"
                                style={{ color: '#ffffff' }}
                            >
                                <PhoneCall size={13} />
                                <span>Call Patient Now</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 2: CALL CONFIRMATION (Using Device Phone Dialler)              */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {callConfirmApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135]">
                                    <PhoneCall size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Call {callConfirmApt.patientName}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCallConfirmApt(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 space-y-3 text-xs">
                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 space-y-1">
                                <p className="text-[#647572]">Patient Phone: <strong className="text-[#033135] font-mono text-sm">{callConfirmApt.patientPhone}</strong></p>
                                <p className="text-[#647572]">Slot: <strong>{callConfirmApt.date} at {callConfirmApt.time}</strong></p>
                            </div>

                            <p className="text-[#647572] leading-relaxed">
                                FitKey will trigger your device phone dialler with the patient&apos;s consented phone number pre-filled.
                            </p>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setCallConfirmApt(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleDirectDial(callConfirmApt.patientPhone)
                                    setCallConfirmApt(null)
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                <PhoneCall size={14} />
                                <span>Open Device Dialler</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
