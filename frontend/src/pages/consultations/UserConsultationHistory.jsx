import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
    Calendar,
    Clock,
    Phone,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowLeft,
    FileText,
    CreditCard,
    X,
    Receipt,
    RefreshCw,
    Search,
    ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getUserAppointments,
    cancelUserAppointment,
    getUserPaymentHistory,
    rescheduleAppointment,
    getAvailableSlotsForDate,
} from '../../services/user/userConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function UserConsultationHistory() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    // Active primary tab: 'appointments' or 'payments'
    const initialTab = searchParams.get('tab') === 'payments' ? 'payments' : 'appointments'
    const [activeTab, setActiveTab] = useState(initialTab)

    const [appointments, setAppointments] = useState([])
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [aptFilter, setAptFilter] = useState('all') // all, upcoming, completed, cancelled, no_show
    const [payFilter, setPayFilter] = useState('all') // all, SUCCESSFUL, PENDING, REFUNDED, FAILED
    const [searchTerm, setSearchTerm] = useState('')

    // Modals
    const [selectedApt, setSelectedApt] = useState(null)
    const [cancellingApt, setCancellingApt] = useState(null)
    const [cancelReason, setCancelReason] = useState('Personal schedule conflict')
    const [selectedPayment, setSelectedPayment] = useState(null)

    // Rescheduling Modal State
    const [reschedulingApt, setReschedulingApt] = useState(null)
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [rescheduleSlots, setRescheduleSlots] = useState([])
    const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null)
    const [rescheduleLoading, setRescheduleLoading] = useState(false)

    // Next 14 days for rescheduling
    const next14Days = useMemo(() => {
        const days = []
        const now = new Date()
        for (let i = 0; i < 14; i++) {
            const d = new Date(now)
            d.setDate(now.getDate() + i)
            const yStr = d.getFullYear()
            const mStr = String(d.getMonth() + 1).padStart(2, '0')
            const dStr = String(d.getDate()).padStart(2, '0')
            days.push({
                iso: `${yStr}-${mStr}-${dStr}`,
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: d.getDate(),
                monthName: d.toLocaleDateString('en-US', { month: 'short' }),
            })
        }
        return days
    }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [apts, pays] = await Promise.all([getUserAppointments(), getUserPaymentHistory()])
            setAppointments(apts)
            setPayments(pays)
        } catch (error) {
            console.error('[UserConsultationHistory] Load error:', error)
            toast.error(error?.message || 'Could not load consultation history.')
            setAppointments([])
            setPayments([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Load available slots when rescheduling date changes
    useEffect(() => {
        if (!reschedulingApt || !rescheduleDate) return
        let cancelled = false
        setRescheduleLoading(true)
        getAvailableSlotsForDate(reschedulingApt.professionalId, rescheduleDate)
            .then((slots) => { if (!cancelled) setRescheduleSlots(slots) })
            .catch((error) => {
                if (!cancelled) {
                    setRescheduleSlots([])
                    toast.error(error?.message || 'Could not load available slots.')
                }
            })
            .finally(() => { if (!cancelled) setRescheduleLoading(false) })
        setSelectedRescheduleSlot(null)
        return () => { cancelled = true }
    }, [reschedulingApt, rescheduleDate])

    const handleOpenReschedule = (apt) => {
        setReschedulingApt(apt)
        setRescheduleDate(apt.date)
    }

    const handleConfirmReschedule = async () => {
        if (!reschedulingApt || !rescheduleDate || !selectedRescheduleSlot) {
            toast.error('Please select an available date and time slot.')
            return
        }
        setRescheduleLoading(true)
        const res = await rescheduleAppointment(
            reschedulingApt.id,
            rescheduleDate,
            selectedRescheduleSlot.time24
        )
        setRescheduleLoading(false)
        if (res.success) {
            toast.success(res.message || 'Appointment rescheduled successfully!')
            setReschedulingApt(null)
            loadData()
        } else {
            toast.error(res.error || 'Failed to reschedule.')
        }
    }

    const handleSwitchTab = (tab) => {
        setActiveTab(tab)
        setSearchParams(tab === 'payments' ? { tab: 'payments' } : {})
    }

    // Appointment cancellation
    const handleConfirmCancel = async () => {
        if (!cancellingApt) return
        const res = await cancelUserAppointment(cancellingApt.id, cancelReason)
        if (res.success) {
            toast.success('Appointment cancelled and slot released.')
            setCancellingApt(null)
            loadData()
        } else {
            toast.error(res.error || 'Failed to cancel appointment.')
        }
    }

    // Filter appointments
    const filteredAppointments = appointments.filter((apt) => {
        const matchesFilter = aptFilter === 'all' ? true : apt.status === aptFilter
        const term = searchTerm.trim().toLowerCase()
        if (!term) return matchesFilter

        const matchesSearch =
            apt.professionalName?.toLowerCase().includes(term) ||
            apt.professionalSpecialization?.toLowerCase().includes(term) ||
            apt.bookingReference?.toLowerCase().includes(term) ||
            apt.date?.includes(term)

        return matchesFilter && matchesSearch
    })

    // Filter payments
    const filteredPayments = payments.filter((pay) => {
        const matchesFilter = payFilter === 'all' ? true : pay.paymentStatus === payFilter
        const term = searchTerm.trim().toLowerCase()
        if (!term) return matchesFilter

        const matchesSearch =
            pay.professionalName?.toLowerCase().includes(term) ||
            pay.bookingReference?.toLowerCase().includes(term) ||
            pay.transactionId?.toLowerCase().includes(term)

        return matchesFilter && matchesSearch
    })

    const aptCounts = {
        all: appointments.length,
        upcoming: appointments.filter((a) => a.status === 'upcoming').length,
        completed: appointments.filter((a) => a.status === 'completed').length,
        cancelled: appointments.filter((a) => a.status === 'cancelled').length,
        no_show: appointments.filter((a) => a.status === 'no_show').length,
    }

    const payCounts = {
        all: payments.length,
        SUCCESSFUL: payments.filter((p) => p.paymentStatus === 'SUCCESSFUL').length,
        PENDING: payments.filter((p) => p.paymentStatus === 'PENDING').length,
        REFUNDED: payments.filter((p) => p.paymentStatus === 'REFUNDED').length,
        FAILED: payments.filter((p) => p.paymentStatus === 'FAILED').length,
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'upcoming':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[10px] font-bold text-[#033135]">
                        <Clock size={11} className="text-[#2F7B58]" />
                        UPCOMING
                    </span>
                )
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[10px] font-bold text-[#2F7B58]">
                        <CheckCircle2 size={11} className="text-[#2F7B58]" />
                        COMPLETED
                    </span>
                )
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-[#C0563B]">
                        <XCircle size={11} />
                        CANCELLED
                    </span>
                )
            case 'no_show':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-[#8B6D25]">
                        <AlertCircle size={11} />
                        NO-SHOW
                    </span>
                )
            default:
                return (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-[#647572] uppercase">
                        {status}
                    </span>
                )
        }
    }

    const getPaymentBadge = (status) => {
        switch (status) {
            case 'SUCCESSFUL':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[10px] font-bold text-[#2F7B58]">
                        <CheckCircle2 size={11} />
                        PAID
                    </span>
                )
            case 'REFUNDED':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-[#2563EB]">
                        <RefreshCw size={11} />
                        REFUNDED
                    </span>
                )
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-[#8B6D25]">
                        <Clock size={11} />
                        PENDING
                    </span>
                )
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-[#C0563B]">
                        <XCircle size={11} />
                        FAILED
                    </span>
                )
            default:
                return null
        }
    }

    return (
        <div className="space-y-6 sm:space-y-7 pb-12">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#647572]">
                        <Link
                            to="/consultations"
                            className="flex items-center gap-1 hover:text-[#033135] transition"
                        >
                            <ArrowLeft size={14} />
                            Consultations
                        </Link>
                        <span>/</span>
                        <span className="text-[#033135]">History</span>
                    </div>

                    <h1
                        className="mt-1 text-2xl sm:text-3xl lg:text-4xl text-[#033135] font-normal"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Consultation History
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                                Review your appointment history and saved booking details.
                    </p>
                </div>

                {/* Primary Mode Tabs (Appointments vs Payments) */}
                <div className="flex items-center gap-1 rounded-2xl border border-[#DCE7E3] bg-white p-1.5 self-start sm:self-auto shadow-xs">
                    <button
                        type="button"
                        onClick={() => handleSwitchTab('appointments')}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'appointments'
                            ? 'bg-[#033135] !text-white shadow-xs'
                            : 'text-[#647572] hover:text-[#033135]'
                            }`}
                        style={activeTab === 'appointments' ? { color: '#ffffff' } : {}}
                    >
                        <Calendar size={14} />
                        <span>Appointments</span>
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'appointments' ? 'bg-white/20 text-white' : 'bg-[#E8EFEB] text-[#033135]'}`}>
                            {appointments.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSwitchTab('payments')}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'payments'
                            ? 'bg-[#033135] !text-white shadow-xs'
                            : 'text-[#647572] hover:text-[#033135]'
                            }`}
                        style={activeTab === 'payments' ? { color: '#ffffff' } : {}}
                    >
                        <CreditCard size={14} />
                        <span>Payments</span>
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'payments' ? 'bg-white/20 text-white' : 'bg-[#E8EFEB] text-[#033135]'}`}>
                            {payments.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* TAB A: APPOINTMENT HISTORY                                        */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'appointments' && (
                <div className="space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EFEB] pb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'upcoming', label: 'Upcoming' },
                                { id: 'completed', label: 'Completed' },
                                { id: 'cancelled', label: 'Cancelled' },
                                { id: 'no_show', label: 'No-Show' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setAptFilter(tab.id)}
                                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${aptFilter === tab.id
                                        ? 'bg-[#033135] !text-white shadow-xs'
                                        : 'border border-[#DCE7E3] bg-white text-[#647572] hover:bg-[#FAFBF9]'
                                        }`}
                                    style={aptFilter === tab.id ? { color: '#ffffff' } : {}}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`rounded-full px-1.5 py-0.2 text-[9px] ${aptFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#E8EFEB] text-[#033135]'}`}
                                    >
                                        {aptCounts[tab.id] || 0}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="relative min-w-[220px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by doctor, date, ref..."
                                className="w-full rounded-xl border border-[#DCE7E3] bg-white py-1.5 pl-8 pr-3 text-xs text-[#033135] outline-none"
                            />
                        </div>
                    </div>

                    {/* Appointments List */}
                    {loading ? (
                        <div className="rounded-3xl border border-[#E8EFEB] bg-white p-12 text-center text-xs text-[#647572]">
                            Loading your consultation history…
                        </div>
                    ) : filteredAppointments.length === 0 ? (
                        <div className="rounded-3xl border border-[#E8EFEB] bg-white p-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAF7] text-[#9AA6A0]">
                                <Calendar size={28} />
                            </div>
                            <h3 className="mt-3 text-base font-bold text-[#033135]">
                                No Appointments Found
                            </h3>
                            <p className="mx-auto mt-1 max-w-sm text-xs text-[#647572]">
                                No consultations found under this status. You can discover verified professionals and book slots below.
                            </p>
                            <Link
                                to="/consultations"
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                <span>Browse Doctors</span>
                                <ChevronRight size={13} />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAppointments.map((apt) => (
                                <div
                                    key={apt.id}
                                    className="rounded-3xl border border-[#E8EFEB] bg-white p-5 shadow-xs transition hover:border-[#C4D7D4]"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            {apt.professionalPhoto ? (
                                                <img
                                                    src={apt.professionalPhoto}
                                                    alt={apt.professionalName}
                                                    className="h-12 w-12 rounded-2xl object-cover ring-1 ring-[#DCE7E3] shrink-0"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E4F0EA] font-bold text-[#033135]">
                                                    {apt.professionalName?.charAt(0) || 'D'}
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-sm font-bold text-[#033135]">
                                                        {apt.professionalName}
                                                    </h3>
                                                    {getStatusBadge(apt.status)}
                                                    <span className="rounded-md bg-[#FAFBF9] border border-[#E8EFEB] px-2 py-0.5 text-[10px] font-mono text-[#647572]">
                                                        #{apt.bookingReference}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-[#647572]">
                                                    {apt.professionalSpecialization} · {apt.professionalWorkplace}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#647572] pt-0.5">
                                                    <span className="flex items-center gap-1 font-semibold text-[#033135]">
                                                        <Calendar size={12} className="text-[#648C83]" />
                                                        {apt.date}
                                                    </span>
                                                    <span className="flex items-center gap-1 font-semibold text-[#033135]">
                                                        <Clock size={12} className="text-[#648C83]" />
                                                        {apt.time} ({apt.durationMinutes || 20}m)
                                                    </span>
                                                    <span className="font-bold text-[#033135]">
                                                        Fee: ₹{apt.fee}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 sm:self-center self-end shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedApt(apt)}
                                                className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                            >
                                                <FileText size={13} />
                                                <span>Details</span>
                                            </button>

                                            {apt.status === 'upcoming' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenReschedule(apt)}
                                                        className="rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                                    >
                                                        Reschedule
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCancellingApt(apt)}
                                                        className="rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-xs font-bold text-[#C0563B] hover:bg-rose-100 transition"
                                                    >
                                                        Cancel Slot
                                                    </button>
                                                </>
                                            )}

                                            {apt.status === 'completed' && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/professional/public/${apt.professionalId}`)}
                                                    className="flex items-center gap-1 rounded-xl bg-[#033135] px-3.5 py-1.5 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    <span>Book Again</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* TAB B: PAYMENT HISTORY                                            */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'payments' && (
                <div className="space-y-4">
                    {/* Status Filters & Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EFEB] pb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: 'all', label: 'All Transactions' },
                                { id: 'SUCCESSFUL', label: 'Paid' },
                                { id: 'REFUNDED', label: 'Refunded' },
                                { id: 'PENDING', label: 'Pending' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setPayFilter(tab.id)}
                                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${payFilter === tab.id
                                        ? 'bg-[#033135] !text-white shadow-xs'
                                        : 'border border-[#DCE7E3] bg-white text-[#647572] hover:bg-[#FAFBF9]'
                                        }`}
                                    style={payFilter === tab.id ? { color: '#ffffff' } : {}}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`rounded-full px-1.5 py-0.2 text-[9px] ${payFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#E8EFEB] text-[#033135]'}`}
                                    >
                                        {payCounts[tab.id] || 0}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="relative min-w-[220px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by booking ref, txn ID..."
                                className="w-full rounded-xl border border-[#DCE7E3] bg-white py-1.5 pl-8 pr-3 text-xs text-[#033135] outline-none"
                            />
                        </div>
                    </div>

                    {/* Payments List */}
                    {filteredPayments.length === 0 ? (
                        <div className="rounded-3xl border border-[#E8EFEB] bg-white p-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAF7] text-[#9AA6A0]">
                                <Receipt size={28} />
                            </div>
                            <h3 className="mt-3 text-base font-bold text-[#033135]">
                                No Payment Records Found
                            </h3>
                            <p className="mx-auto mt-1 max-w-sm text-xs text-[#647572]">
                                No payment records are available. Appointment bookings are saved, but payment checkout is not configured.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredPayments.map((pay) => (
                                <div
                                    key={pay.id}
                                    className="rounded-3xl border border-[#E8EFEB] bg-white p-5 shadow-xs transition hover:border-[#C4D7D4]"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FAFBF9] border border-[#E8EFEB] text-[#033135]">
                                                <CreditCard size={18} />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-sm font-bold text-[#033135]">
                                                        {pay.professionalName}
                                                    </h3>
                                                    {getPaymentBadge(pay.paymentStatus)}
                                                    <span className="rounded-md bg-[#FAFBF9] border border-[#E8EFEB] px-2 py-0.5 text-[10px] font-mono text-[#647572]">
                                                        #{pay.bookingReference}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-[#647572]">
                                                    {pay.paymentMethod} · {new Date(pay.paymentDate).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </p>

                                                <div className="flex items-center gap-3 text-[11px] text-[#647572] pt-0.5">
                                                    <span>Original Fee: <strong className="text-[#033135]">₹{pay.originalFee}</strong></span>
                                                    {pay.xpDiscount > 0 && (
                                                        <span className="text-[#2F7B58] font-bold">
                                                            FitKey XP Rebate: -₹{pay.xpDiscount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E8EFEB]">
                                            <div className="text-left sm:text-right">
                                                <span className="text-[10px] uppercase font-bold text-[#647572]">Amount Paid</span>
                                                <p className="text-base font-black text-[#033135]">₹{pay.amountPaid}</p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedPayment(pay)}
                                                className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                            >
                                                <Receipt size={13} />
                                                <span>Receipt</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* MODAL 1: APPOINTMENT DETAILS MODAL                                */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {selectedApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div>
                                <h3 className="text-base font-bold text-[#033135]">
                                    Appointment Confirmation &amp; Details
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    Booking Reference: <span className="font-mono font-bold text-[#033135]">#{selectedApt.bookingReference}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedApt(null)}
                                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            {/* Doctor summary */}
                            <div className="rounded-2xl border border-[#E8EFEB] bg-[#FAFBF9] p-4 flex items-center gap-3">
                                {selectedApt.professionalPhoto ? (
                                    <img
                                        src={selectedApt.professionalPhoto}
                                        alt={selectedApt.professionalName}
                                        className="h-12 w-12 rounded-xl object-cover ring-1 ring-[#DCE7E3]"
                                    />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E4F0EA] font-bold text-[#033135]">
                                        D
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-sm text-[#033135]">{selectedApt.professionalName}</h4>
                                    <p className="text-[#647572]">{selectedApt.professionalSpecialization}</p>
                                    <p className="text-[11px] text-[#9AA6A0]">{selectedApt.professionalWorkplace}, {selectedApt.professionalCity}</p>
                                </div>
                            </div>

                            {/* Slot and status details */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-[#E8EFEB] p-3 space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold text-[#647572]">Date &amp; Time</span>
                                    <p className="font-bold text-[#033135]">{selectedApt.date}</p>
                                    <p className="text-[#647572]">{selectedApt.time} ({selectedApt.durationMinutes || 20}m)</p>
                                </div>

                                <div className="rounded-xl border border-[#E8EFEB] p-3 space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold text-[#647572]">Consultation Fee</span>
                                    <p className="font-bold text-[#2F7B58] text-sm">₹{selectedApt.fee}</p>
                                    <p className="text-[#647572]">Direct Audio Session</p>
                                </div>
                            </div>

                            {/* Phone Call Instructions */}
                            <div className="rounded-xl border border-[#DCE7E3] bg-[#E4F0EA]/40 p-3 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-[#033135]">
                                    <Phone size={13} className="text-[#2F7B58]" />
                                    <span>Phone Call Instructions</span>
                                </div>
                                <p className="text-[#324C4D] leading-relaxed">
                                    Your practitioner will connect with you via direct phone call at your consented number at the scheduled appointment time.
                                </p>
                            </div>

                            {/* Chief complaint / notes */}
                            {selectedApt.notes && (
                                <div className="rounded-xl border border-[#E8EFEB] p-3 space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-[#647572]">Reason for Visit</span>
                                    <p className="text-[#033135]">{selectedApt.notes}</p>
                                </div>
                            )}

                            {selectedApt.cancellationReason && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1 text-rose-800">
                                    <span className="text-[10px] uppercase font-bold">Cancellation Reason</span>
                                    <p className="text-xs font-semibold">{selectedApt.cancellationReason}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedApt(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate(`/professional/public/${selectedApt.professionalId}`)}
                                className="rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                View Doctor Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* MODAL 2: CANCEL APPOINTMENT CONFIRMATION                          */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {cancellingApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div className="flex items-center gap-2 text-[#C0563B]">
                                <XCircle size={18} />
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Cancel Appointment
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCancellingApt(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-[#647572]">
                                Are you sure you want to cancel your consultation with <strong>{cancellingApt.professionalName}</strong> scheduled for <strong>{cancellingApt.date} at {cancellingApt.time}</strong>?
                            </p>

                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-[11px] space-y-1">
                                <p className="font-bold">Refund Policy &amp; Slot Release</p>
                                <p>Cancelling will release this appointment slot. No payment has been collected for this booking.</p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-[#324C4D] mb-1">
                                    Reason for Cancellation
                                </label>
                                <select
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-2 text-xs font-semibold text-[#033135] outline-none"
                                >
                                    <option value="Personal schedule conflict">Personal schedule conflict</option>
                                    <option value="Feeling better / Symptoms resolved">Feeling better / Symptoms resolved</option>
                                    <option value="Booked by mistake">Booked by mistake</option>
                                    <option value="Seeking in-person clinic visit instead">Seeking in-person clinic visit instead</option>
                                    <option value="Other reason">Other reason</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setCancellingApt(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                            >
                                Keep Appointment
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCancel}
                                className="rounded-xl bg-[#C0563B] px-5 py-2 text-xs font-bold !text-white hover:bg-[#A8452D] transition shadow-xs"
                                style={{ color: '#ffffff' }}
                            >
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* MODAL 3: PAYMENT RECEIPT & DETAILS MODAL                          */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {selectedPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div className="flex items-center gap-2">
                                <Receipt size={18} className="text-[#033135]" />
                                <h3 className="text-base font-bold text-[#033135]">
                                    Consultation Payment Receipt
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedPayment(null)}
                                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="rounded-2xl border border-[#E8EFEB] bg-[#FAFBF9] p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#647572]">Invoice Number</span>
                                    <span className="font-mono font-bold text-[#033135]">{selectedPayment.invoiceNumber}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#647572]">Booking Reference</span>
                                    <span className="font-mono font-bold text-[#033135]">#{selectedPayment.bookingReference}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#647572]">Practitioner</span>
                                    <span className="font-bold text-[#033135]">{selectedPayment.professionalName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#647572]">Status</span>
                                    {getPaymentBadge(selectedPayment.paymentStatus)}
                                </div>
                            </div>

                            {/* Fee Breakdown */}
                            <div className="rounded-xl border border-[#E8EFEB] p-3 space-y-2">
                                <div className="flex items-center justify-between text-[#647572]">
                                    <span>Consultation Base Fee:</span>
                                    <span className="font-semibold text-[#033135]">₹{selectedPayment.originalFee}</span>
                                </div>

                                {selectedPayment.xpDiscount > 0 && (
                                    <div className="flex items-center justify-between text-[#2F7B58]">
                                        <span>FitKey XP Discount:</span>
                                        <span className="font-bold">-₹{selectedPayment.xpDiscount}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between border-t border-[#E8EFEB] pt-2 text-sm font-black text-[#033135]">
                                    <span>Net Amount Paid:</span>
                                    <span>₹{selectedPayment.amountPaid}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[#647572]">
                                <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-2.5">
                                    <span className="text-[10px] uppercase font-bold text-[#647572]">Method</span>
                                    <p className="font-semibold text-[#033135] mt-0.5">{selectedPayment.paymentMethod}</p>
                                </div>
                                <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-2.5">
                                    <span className="text-[10px] uppercase font-bold text-[#647572]">Transaction ID</span>
                                    <p className="font-mono text-[10px] text-[#033135] mt-0.5 truncate">{selectedPayment.transactionId}</p>
                                </div>
                            </div>

                            {selectedPayment.refundReason && (
                                <div className="rounded-xl bg-sky-50 border border-sky-200 p-2.5 text-sky-900 text-[11px]">
                                    ℹ️ <strong>Refund Note:</strong> {selectedPayment.refundReason}
                                </div>
                            )}
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedPayment(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => toast.success('Receipt sent to your registered email.')}
                                className="rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                Download Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* MODAL 4: RESCHEDULE APPOINTMENT MODAL                             */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {reschedulingApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div>
                                <h3 className="text-base font-bold text-[#033135]">
                                    Reschedule Appointment
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    with {reschedulingApt.professionalName} · Current: {reschedulingApt.date} at {reschedulingApt.time}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReschedulingApt(null)}
                                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            {/* Date selector */}
                            <div>
                                <label className="block text-xs font-bold text-[#033135] mb-1.5">
                                    Select New Appointment Date
                                </label>
                                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {next14Days.map((d) => (
                                        <button
                                            key={d.iso}
                                            type="button"
                                            onClick={() => setRescheduleDate(d.iso)}
                                            className={`flex flex-col items-center justify-center min-w-[58px] py-2 px-1.5 rounded-xl border text-xs transition shrink-0 ${rescheduleDate === d.iso
                                                ? 'border-[#033135] bg-[#033135] !text-white font-bold'
                                                : 'border-[#E8EFEB] bg-[#FAFBF9] text-[#647572] hover:bg-white'
                                                }`}
                                            style={rescheduleDate === d.iso ? { color: '#ffffff' } : {}}
                                        >
                                            <span className="text-[9px] uppercase">{d.dayName}</span>
                                            <span className="text-sm font-black my-0.5">{d.dayNumber}</span>
                                            <span className="text-[9px]">{d.monthName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Slots */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-[#033135]">
                                        Available Slots ({rescheduleSlots.length})
                                    </label>
                                    <span className="text-[11px] text-[#647572]">{rescheduleDate}</span>
                                </div>

                                {rescheduleSlots.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[#DCE7E3] bg-[#FAFBF9] p-6 text-center text-xs text-[#647572]">
                                        No available slots on this date. Please pick another day.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-0.5">
                                        {rescheduleSlots.map((slot) => {
                                            const isSelected = selectedRescheduleSlot?.time24 === slot.time24
                                            return (
                                                <button
                                                    key={slot.time24}
                                                    type="button"
                                                    onClick={() => setSelectedRescheduleSlot(slot)}
                                                    className={`rounded-xl border py-2 px-1 text-center text-xs font-bold transition ${isSelected
                                                        ? 'border-[#2F7B58] bg-[#E4F0EA] text-[#033135] ring-2 ring-[#2F7B58]/30 font-black'
                                                        : 'border-[#E8EFEB] bg-white text-[#033135] hover:border-[#DCE7E3]'
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

                        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setReschedulingApt(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!selectedRescheduleSlot || rescheduleLoading}
                                onClick={handleConfirmReschedule}
                                className="rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition disabled:opacity-40"
                                style={{ color: '#ffffff' }}
                            >
                                {rescheduleLoading ? 'Updating...' : 'Confirm Reschedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
