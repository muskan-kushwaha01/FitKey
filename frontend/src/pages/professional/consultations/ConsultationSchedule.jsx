import { useState, useEffect, useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
    Calendar as CalendarIcon,
    Clock,
    Phone,
    Save,
    Plus,
    Trash2,
    CalendarX,
    ArrowLeft,
    Sparkles,
    Copy,
    ChevronLeft,
    ChevronRight,
    Lock,
    Unlock,
    Sliders,
    CalendarDays,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    User,
    Globe,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentProfessional } from '../../../services/professional/professionalAuthService.js'
import {
    getConsultationSettings,
    saveConsultationSettings,
    addBlockedDate,
    removeBlockedDate,
    setDateOverride,
    removeDateOverride,
    toggleSlotBlock,
    toggleConsultationStatus,
    generateDaySlots,
    generateWeekSlots,
    generateMonthSummary,
    DAYS_OF_WEEK,
    DURATION_OPTIONS,
    BUFFER_OPTIONS,
} from '../../../services/professional/professionalConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function getTodayIso() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function getMondayOfDate(isoString) {
    const [y, m, d] = isoString.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const mon = new Date(date.setDate(diff))
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
}

export default function ConsultationSchedule() {
    const { professional: contextProf } = useOutletContext() || {}
    const [professional, setProfessional] = useState(contextProf || null)
    const [settings, setSettings] = useState(null)
    const [activeTab, setActiveTab] = useState('calendar') // 'calendar' | 'weekly_defaults'

    // Calendar state
    const [calendarView, setCalendarView] = useState('week') // 'day' | 'week' | 'month'
    const [selectedDate, setSelectedDate] = useState(getTodayIso())
    const [monthCursor, setMonthCursor] = useState(() => {
        const now = new Date()
        return { year: now.getFullYear(), month: now.getMonth() + 1 }
    })

    // Custom Date Hours Override Modal
    const [customHoursModalDate, setCustomHoursModalDate] = useState(null)
    const [customHoursForm, setCustomHoursForm] = useState({
        unavailable: false,
        startTime: '10:00',
        endTime: '18:00',
        reason: '',
    })

    const loadData = () => {
        const prof = contextProf || getCurrentProfessional()
        if (prof?.id) {
            setProfessional(prof)
            const s = getConsultationSettings(prof.id)
            setSettings(s)
        }
    }

    useEffect(() => {
        loadData()
    }, [contextProf])

    // Day slots for Day View
    const dayData = useMemo(() => {
        if (!professional?.id || !selectedDate) return null
        return generateDaySlots(professional.id, selectedDate)
    }, [professional?.id, selectedDate, settings])

    // Week slots for Week View
    const weekMonday = useMemo(() => getMondayOfDate(selectedDate), [selectedDate])
    const weekData = useMemo(() => {
        if (!professional?.id || !weekMonday) return []
        return generateWeekSlots(professional.id, weekMonday)
    }, [professional?.id, weekMonday, settings])

    // Month summary for Month View
    const monthData = useMemo(() => {
        if (!professional?.id) return []
        return generateMonthSummary(professional.id, monthCursor.year, monthCursor.month)
    }, [professional?.id, monthCursor, settings])

    // Date range label
    const navigationLabel = useMemo(() => {
        if (calendarView === 'day') {
            const [y, m, d] = selectedDate.split('-').map(Number)
            return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            })
        }
        if (calendarView === 'week') {
            const [y, m, d] = weekMonday.split('-').map(Number)
            const start = new Date(y, m - 1, d)
            const end = new Date(y, m - 1, d + 6)
            return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        }
        return new Date(monthCursor.year, monthCursor.month - 1, 1).toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
        })
    }, [calendarView, selectedDate, weekMonday, monthCursor])

    if (!settings) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
    }

    // Navigation handlers
    const handlePrev = () => {
        if (calendarView === 'day') {
            const [y, m, d] = selectedDate.split('-').map(Number)
            const prev = new Date(y, m - 1, d - 1)
            setSelectedDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`)
        } else if (calendarView === 'week') {
            const [y, m, d] = weekMonday.split('-').map(Number)
            const prev = new Date(y, m - 1, d - 7)
            setSelectedDate(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`)
        } else if (calendarView === 'month') {
            setMonthCursor((prev) => {
                const newMonth = prev.month === 1 ? 12 : prev.month - 1
                const newYear = prev.month === 1 ? prev.year - 1 : prev.year
                return { year: newYear, month: newMonth }
            })
        }
    }

    const handleNext = () => {
        if (calendarView === 'day') {
            const [y, m, d] = selectedDate.split('-').map(Number)
            const next = new Date(y, m - 1, d + 1)
            setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`)
        } else if (calendarView === 'week') {
            const [y, m, d] = weekMonday.split('-').map(Number)
            const next = new Date(y, m - 1, d + 7)
            setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`)
        } else if (calendarView === 'month') {
            setMonthCursor((prev) => {
                const newMonth = prev.month === 12 ? 1 : prev.month + 1
                const newYear = prev.month === 12 ? prev.year + 1 : prev.year
                return { year: newYear, month: newMonth }
            })
        }
    }

    const handleToday = () => {
        const today = getTodayIso()
        setSelectedDate(today)
        const now = new Date()
        setMonthCursor({ year: now.getFullYear(), month: now.getMonth() + 1 })
    }

    // Toggle Slot Block
    const handleToggleSlotBlock = (dateStr, time24) => {
        if (!professional?.id) return
        const res = toggleSlotBlock(professional.id, dateStr, time24)
        if (res.success) {
            setSettings(res.settings)
            toast.success(res.isBlocked ? `Slot ${time24} blocked` : `Slot ${time24} unblocked`)
        }
    }

    // Custom Hours Override Handlers
    const handleOpenCustomHours = (dateStr) => {
        const override = settings.dateOverrides?.[dateStr] || {}
        setCustomHoursForm({
            unavailable: Boolean(override.unavailable),
            startTime: override.startTime || '10:00',
            endTime: override.endTime || '18:00',
            reason: override.reason || '',
        })
        setCustomHoursModalDate(dateStr)
    }

    const handleSaveCustomHours = (e) => {
        e.preventDefault()
        if (!professional?.id || !customHoursModalDate) return
        const res = setDateOverride(professional.id, customHoursModalDate, customHoursForm)
        if (res.success) {
            setSettings(res.settings)
            toast.success(`Custom schedule applied for ${customHoursModalDate}`)
            setCustomHoursModalDate(null)
        }
    }

    const handleRemoveCustomHours = (dateStr) => {
        if (!professional?.id) return
        const res = removeDateOverride(professional.id, dateStr)
        if (res.success) {
            setSettings(res.settings)
            toast.success(`Reset ${dateStr} to weekly schedule default`)
            setCustomHoursModalDate(null)
        }
    }

    // Master Availability Toggle
    const handleToggleMasterAvailability = () => {
        if (!professional?.id) return
        const res = toggleConsultationStatus(professional.id)
        if (res.success) {
            setSettings(res.settings)
            toast.success(
                res.settings.consultationsEnabled
                    ? 'Consultations active for patient bookings'
                    : 'Consultations paused'
            )
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#647572]">
                        <Link
                            to="/professional/consultations"
                            className="flex items-center gap-1 hover:text-[#033135] transition"
                        >
                            <ArrowLeft size={14} />
                            Consultations
                        </Link>
                        <span>/</span>
                        <span className="text-[#033135]">Availability Calendar</span>
                    </div>
                    <h1
                        className="mt-1 text-2xl sm:text-3xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        Availability Calendar & Schedule
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Manage your live consultation slots with Day, Week, and Month views, date overrides, and slot blocking.
                    </p>
                </div>

                {/* Tab Switcher: Calendar vs Weekly Defaults */}
                <div className="flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-white p-1 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('calendar')}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${activeTab === 'calendar'
                            ? 'bg-[#033135] text-white shadow-2xs'
                            : 'text-[#647572] hover:bg-[#FAFBF9]'
                            }`}
                    >
                        <CalendarIcon size={14} />
                        <span>Interactive Calendar</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('weekly_defaults')}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${activeTab === 'weekly_defaults'
                            ? 'bg-[#033135] text-white shadow-2xs'
                            : 'text-[#647572] hover:bg-[#FAFBF9]'
                            }`}
                    >
                        <Sliders size={14} />
                        <span>Weekly Defaults</span>
                    </button>
                </div>
            </div>

            {/* Availability Master Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#DCE7E3] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${settings.consultationsEnabled ? 'bg-[#E4F0EA] text-[#033135]' : 'bg-gray-100 text-gray-400'}`}>
                        <Phone size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-[#033135]">
                                Consultation Status:
                            </h3>
                            <span className={`rounded-full px-2 py-0.2 text-[10px] font-black ${settings.consultationsEnabled ? 'bg-[#E4F0EA] text-[#033135]' : 'bg-gray-100 text-gray-500'}`}>
                                {settings.consultationsEnabled ? 'ACTIVE & ACCEPTING' : 'PAUSED'}
                            </span>
                        </div>
                        <p className="text-[11px] text-[#647572]">
                            Slot Duration: <strong>{settings.durationMinutes} mins</strong> · Buffer: <strong>{settings.bufferMinutes} mins</strong> · Timezone: <strong>{settings.timezone || 'Asia/Kolkata'}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleToggleMasterAvailability}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${settings.consultationsEnabled
                            ? 'border border-[#C0563B] text-[#C0563B] hover:bg-rose-50'
                            : 'bg-[#033135] text-white hover:bg-[#324C4D]'
                            }`}
                    >
                        {settings.consultationsEnabled ? 'Pause Booking Calendar' : 'Resume Booking Calendar'}
                    </button>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: INTERACTIVE AVAILABILITY CALENDAR (Day, Week, Month)          */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'calendar' && (
                <div className="space-y-4">
                    {/* Calendar Control Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-[#E8EFEB] bg-white p-3.5 shadow-xs">
                        {/* Left: View Switcher */}
                        <div className="flex items-center gap-1 rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-1">
                            <button
                                type="button"
                                onClick={() => setCalendarView('day')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'day'
                                    ? 'bg-white text-[#033135] shadow-2xs font-black'
                                    : 'text-[#647572] hover:text-[#033135]'
                                    }`}
                            >
                                Day View
                            </button>
                            <button
                                type="button"
                                onClick={() => setCalendarView('week')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'week'
                                    ? 'bg-white text-[#033135] shadow-2xs font-black'
                                    : 'text-[#647572] hover:text-[#033135]'
                                    }`}
                            >
                                Week View
                            </button>
                            <button
                                type="button"
                                onClick={() => setCalendarView('month')}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'month'
                                    ? 'bg-white text-[#033135] shadow-2xs font-black'
                                    : 'text-[#647572] hover:text-[#033135]'
                                    }`}
                            >
                                Month View
                            </button>
                        </div>

                        {/* Center: Navigation (Prev, Today, Next + Label) */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                            <button
                                type="button"
                                onClick={handleToday}
                                className="rounded-xl border border-[#DCE7E3] bg-white px-3 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#FAFBF9] transition"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="rounded-xl border border-[#E8EFEB] p-1.5 text-[#647572] hover:bg-[#FAFBF9] transition"
                                title="Previous"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs sm:text-sm font-bold text-[#033135] min-w-[160px] text-center">
                                {navigationLabel}
                            </span>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="rounded-xl border border-[#E8EFEB] p-1.5 text-[#647572] hover:bg-[#FAFBF9] transition"
                                title="Next"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Right: Legend */}
                        <div className="flex items-center gap-3 text-[11px] self-start md:self-auto">
                            <span className="flex items-center gap-1 font-medium text-[#2F7B58]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#2F7B58]" /> Available
                            </span>
                            <span className="flex items-center gap-1 font-medium text-[#C0563B]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#C0563B]" /> Blocked
                            </span>
                            <span className="flex items-center gap-1 font-medium text-[#033135]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#033135]" /> Booked
                            </span>
                        </div>
                    </div>

                    {/* ─── 1. DAY VIEW ──────────────────────────────────────────────── */}
                    {calendarView === 'day' && dayData && (
                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EFEB] pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-[#033135]">
                                            {dayData.dayLabel}, {dayData.date}
                                        </h3>
                                        {dayData.hasCustomHours && (
                                            <span className="rounded-full bg-[#F8E7A5] px-2 py-0.5 text-[10px] font-black text-[#8B6D25]">
                                                Custom Hours Override
                                            </span>
                                        )}
                                        {dayData.isBlockedDate && (
                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-[#C0563B]">
                                                Day Unavailable
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[#647572] mt-0.5">
                                        {dayData.isBlockedDate
                                            ? `Reason: ${dayData.reason}`
                                            : dayData.isOffDay
                                            ? 'Regular weekly off day.'
                                            : `Working hours: ${dayData.startTime} – ${dayData.endTime} (${dayData.stats.available} Available, ${dayData.stats.booked} Booked, ${dayData.stats.blocked} Blocked)`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenCustomHours(dayData.date)}
                                        className="flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                    >
                                        <Sliders size={13} />
                                        <span>Set Custom Hours / Override</span>
                                    </button>
                                </div>
                            </div>

                            {/* Slot Cards Grid */}
                            {dayData.slots.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[#DCE7E3] p-10 text-center">
                                    <p className="text-sm font-bold text-[#033135]">No consultation slots generated</p>
                                    <p className="text-xs text-[#647572] mt-1">
                                        {dayData.isBlockedDate ? 'This entire date has been marked unavailable.' : 'This day is marked as off in your weekly schedule.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenCustomHours(dayData.date)}
                                        className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold text-white shadow-xs"
                                        style={{ color: '#ffffff' }}
                                    >
                                        Open Slots for This Day
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                    {dayData.slots.map((slot) => {
                                        const isAvail = slot.status === 'available'
                                        const isBooked = slot.status === 'booked'
                                        const isBlocked = slot.status === 'blocked'

                                        return (
                                            <div
                                                key={slot.id}
                                                className={`rounded-xl border p-3 transition shadow-2xs ${isAvail
                                                    ? 'border-[#2F7B58]/30 bg-[#E4F0EA]/30 hover:border-[#2F7B58]'
                                                    : isBooked
                                                    ? 'border-[#033135] bg-[#033135] text-white shadow-xs'
                                                    : 'border-rose-200 bg-rose-50/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-bold ${isBooked ? 'text-white' : 'text-[#033135]'}`}>
                                                        {slot.time12}
                                                    </span>
                                                    <span
                                                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${isAvail
                                                            ? 'bg-[#2F7B58] text-white'
                                                            : isBooked
                                                            ? 'bg-[#F8E7A5] text-[#033135]'
                                                            : 'bg-[#C0563B] text-white'
                                                            }`}
                                                    >
                                                        {slot.status}
                                                    </span>
                                                </div>

                                                <p className={`mt-1 text-[11px] ${isBooked ? 'text-[#E4F0EA]' : 'text-[#647572]'}`}>
                                                    {slot.label} ({slot.durationMinutes}m)
                                                </p>

                                                {/* Patient info if booked */}
                                                {isBooked && slot.appointment && (
                                                    <div className="mt-2 rounded-lg bg-white/10 p-1.5 text-[11px] text-white">
                                                        <p className="font-bold truncate">👤 {slot.appointment.patientName}</p>
                                                        <p className="text-[10px] text-white/80 truncate">Phone: {slot.appointment.patientPhone}</p>
                                                    </div>
                                                )}

                                                {/* Action to block/unblock if not booked */}
                                                {!isBooked && (
                                                    <div className="mt-2.5 pt-2 border-t border-[#E8EFEB] flex items-center justify-between">
                                                        <span className="text-[10px] text-[#647572]">
                                                            {isBlocked ? 'Blocked slot' : 'Open for booking'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleSlotBlock(slot.date, slot.time24)}
                                                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition ${isBlocked
                                                                ? 'bg-[#2F7B58] text-white'
                                                                : 'border border-[#DCE7E3] bg-white text-[#C0563B] hover:bg-rose-50'
                                                                }`}
                                                        >
                                                            {isBlocked ? <Unlock size={11} /> : <Lock size={11} />}
                                                            <span>{isBlocked ? 'Unblock' : 'Block Slot'}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── 2. WEEK VIEW ─────────────────────────────────────────────── */}
                    {calendarView === 'week' && (
                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs overflow-x-auto">
                            <div className="min-w-[850px] grid grid-cols-7 gap-3">
                                {weekData.map((day) => {
                                    const isSelected = day.date === selectedDate
                                    const isToday = day.date === getTodayIso()

                                    return (
                                        <div
                                            key={day.date}
                                            className={`rounded-xl border p-2.5 transition flex flex-col ${isSelected
                                                ? 'border-[#033135] ring-2 ring-[#033135]/20 bg-[#FAFBF9]'
                                                : isToday
                                                ? 'border-[#E0AE3A] bg-amber-50/20'
                                                : 'border-[#E8EFEB] bg-white'
                                                }`}
                                        >
                                            {/* Day Header */}
                                            <div
                                                onClick={() => {
                                                    setSelectedDate(day.date)
                                                    setCalendarView('day')
                                                }}
                                                className="cursor-pointer border-b border-[#E8EFEB] pb-2 text-center hover:opacity-80 transition"
                                                title="Click to open Day View"
                                            >
                                                <p className="text-[11px] font-bold text-[#647572] uppercase">
                                                    {day.dayLabel.slice(0, 3)}
                                                </p>
                                                <p className="text-base font-black text-[#033135]">
                                                    {day.date.split('-')[2]}
                                                </p>
                                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                                    <span className="text-[10px] text-[#2F7B58] font-bold">{day.stats.available} A</span>
                                                    <span className="text-[10px] text-[#033135] font-bold">{day.stats.booked} B</span>
                                                </div>
                                            </div>

                                            {/* Slots Column */}
                                            <div className="mt-2 space-y-1.5 flex-1 min-h-[300px]">
                                                {day.isBlockedDate ? (
                                                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-center text-[10px] text-[#C0563B] font-semibold">
                                                        Day Blocked
                                                    </div>
                                                ) : day.isOffDay ? (
                                                    <div className="rounded-lg bg-[#FAFBF9] border border-dashed border-[#E8EFEB] p-2 text-center text-[10px] text-[#9AA6A0] italic">
                                                        Off Day
                                                    </div>
                                                ) : (
                                                    day.slots.map((slot) => {
                                                        const isBooked = slot.status === 'booked'
                                                        const isBlocked = slot.status === 'blocked'

                                                        return (
                                                            <div
                                                                key={slot.id}
                                                                onClick={() => {
                                                                    if (!isBooked) handleToggleSlotBlock(slot.date, slot.time24)
                                                                }}
                                                                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition flex items-center justify-between cursor-pointer ${isBooked
                                                                    ? 'bg-[#033135] text-white shadow-2xs'
                                                                    : isBlocked
                                                                    ? 'bg-rose-100 text-[#C0563B]'
                                                                    : 'bg-[#E4F0EA] text-[#033135] hover:ring-1 hover:ring-[#2F7B58]'
                                                                    }`}
                                                                title={isBooked ? `Booked: ${slot.appointment?.patientName}` : isBlocked ? 'Click to unblock' : 'Click to block'}
                                                            >
                                                                <span className="truncate">{slot.time12.replace(':00', '')}</span>
                                                                <span>{isBooked ? '●' : isBlocked ? '✕' : '✓'}</span>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>

                                            {/* Bottom Action */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenCustomHours(day.date)}
                                                className="mt-2 w-full rounded-lg border border-[#DCE7E3] bg-[#FAFBF9] py-1 text-[9px] font-bold text-[#647572] hover:bg-[#E4F0EA] transition"
                                            >
                                                Edit Hours
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── 3. MONTH VIEW ────────────────────────────────────────────── */}
                    {calendarView === 'month' && (
                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs overflow-x-auto">
                            <div className="min-w-[650px]">
                                {/* Weekday headers */}
                                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-[#647572]">
                                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                                </div>

                                {/* Month Days Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {monthData.map((d) => {
                                        const isSelected = d.date === selectedDate
                                        const isToday = d.date === getTodayIso()

                                        return (
                                            <div
                                                key={d.date}
                                                onClick={() => {
                                                    setSelectedDate(d.date)
                                                    setCalendarView('day')
                                                }}
                                                className={`min-h-[75px] rounded-xl border p-2 cursor-pointer transition flex flex-col justify-between ${isSelected
                                                    ? 'border-[#033135] ring-2 ring-[#033135]/20 bg-[#FAFBF9]'
                                                    : isToday
                                                    ? 'border-[#E0AE3A] bg-amber-50/20'
                                                    : 'border-[#E8EFEB] bg-white hover:border-[#C4D7D4]'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-black ${isToday ? 'text-[#E0AE3A]' : 'text-[#033135]'}`}>
                                                        {d.dayNumber}
                                                    </span>
                                                    {d.hasCustomHours && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-[#E0AE3A]" title="Custom hours override" />
                                                    )}
                                                </div>

                                                <div className="text-[10px] mt-1 space-y-0.5">
                                                    {d.isBlockedDate ? (
                                                        <span className="block rounded bg-rose-100 text-[#C0563B] px-1 font-bold text-[9px]">
                                                            Blocked
                                                        </span>
                                                    ) : d.isOffDay ? (
                                                        <span className="block text-[#9AA6A0] italic text-[9px]">
                                                            Off Day
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className="block text-[#2F7B58] font-bold truncate">
                                                                {d.stats.available} Available
                                                            </span>
                                                            {d.stats.booked > 0 && (
                                                                <span className="block text-[#033135] font-bold truncate">
                                                                    {d.stats.booked} Booked
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: WEEKLY DEFAULTS & SCHEDULE PREFERENCES                        */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'weekly_defaults' && (
                <div className="space-y-6">
                    {/* Duration & Buffer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-[#648C83]" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                    Consultation Slot Duration
                                </h3>
                            </div>
                            <p className="mt-1 text-xs text-[#647572]">
                                Standard phone call length for each consultation slot.
                            </p>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                {DURATION_OPTIONS.map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => {
                                            const updated = { ...settings, durationMinutes: mins }
                                            setSettings(updated)
                                            saveConsultationSettings(professional.id, updated)
                                            toast.success(`Duration set to ${mins} mins`)
                                        }}
                                        className={`rounded-xl border p-3 text-xs font-bold transition ${settings.durationMinutes === mins
                                            ? 'border-[#033135] bg-[#E4F0EA] text-[#033135] shadow-xs'
                                            : 'border-[#E8EFEB] text-[#647572] hover:bg-white'
                                            }`}
                                    >
                                        {mins} mins
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-[#648C83]" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                    Buffer Time Between Calls
                                </h3>
                            </div>
                            <p className="mt-1 text-xs text-[#647572]">
                                Rest or clinical note-taking period between consecutive calls.
                            </p>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                {BUFFER_OPTIONS.map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => {
                                            const updated = { ...settings, bufferMinutes: mins }
                                            setSettings(updated)
                                            saveConsultationSettings(professional.id, updated)
                                            toast.success(`Buffer set to ${mins} mins`)
                                        }}
                                        className={`rounded-xl border p-3 text-xs font-bold transition ${settings.bufferMinutes === mins
                                            ? 'border-[#033135] bg-[#E4F0EA] text-[#033135] shadow-xs'
                                            : 'border-[#E8EFEB] text-[#647572] hover:bg-white'
                                            }`}
                                    >
                                        {mins === 0 ? 'No buffer' : `${mins} mins`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weekly Schedule Days & Times */}
                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-4">
                            <div>
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Weekly Default Hours (Monday – Sunday)
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    Base schedule applied to every week unless overridden on specific dates.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 divide-y divide-[#E8EFEB]">
                            {DAYS_OF_WEEK.map((d) => {
                                const daySchedule = settings.schedule[d.key] || {
                                    enabled: false,
                                    startTime: '10:00',
                                    endTime: '18:00',
                                }

                                return (
                                    <div
                                        key={d.key}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 text-xs"
                                    >
                                        <div className="flex items-center gap-3 w-40">
                                            <input
                                                type="checkbox"
                                                checked={daySchedule.enabled}
                                                onChange={() => {
                                                    const updatedSchedule = {
                                                        ...settings.schedule,
                                                        [d.key]: {
                                                            ...daySchedule,
                                                            enabled: !daySchedule.enabled,
                                                        },
                                                    }
                                                    const updated = { ...settings, schedule: updatedSchedule }
                                                    setSettings(updated)
                                                    saveConsultationSettings(professional.id, updated)
                                                }}
                                                className="h-4 w-4 rounded accent-[#033135]"
                                            />
                                            <span className="font-bold text-[#033135]">{d.label}</span>
                                        </div>

                                        {daySchedule.enabled ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={daySchedule.startTime}
                                                    onChange={(e) => {
                                                        const updated = {
                                                            ...settings,
                                                            schedule: {
                                                                ...settings.schedule,
                                                                [d.key]: { ...daySchedule, startTime: e.target.value },
                                                            },
                                                        }
                                                        setSettings(updated)
                                                        saveConsultationSettings(professional.id, updated)
                                                    }}
                                                    className="rounded-lg border border-[#DCE7E3] px-2 py-1 text-xs font-semibold text-[#033135]"
                                                />
                                                <span className="text-[#9AA6A0]">–</span>
                                                <input
                                                    type="time"
                                                    value={daySchedule.endTime}
                                                    onChange={(e) => {
                                                        const updated = {
                                                            ...settings,
                                                            schedule: {
                                                                ...settings.schedule,
                                                                [d.key]: { ...daySchedule, endTime: e.target.value },
                                                            },
                                                        }
                                                        setSettings(updated)
                                                        saveConsultationSettings(professional.id, updated)
                                                    }}
                                                    className="rounded-lg border border-[#DCE7E3] px-2 py-1 text-xs font-semibold text-[#033135]"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[#9AA6A0] italic">Weekly Day Off</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Hours / Date Override Modal */}
            {customHoursModalDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <h3 className="text-sm font-bold text-[#033135]">
                                Custom Hours for {customHoursModalDate}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCustomHoursModalDate(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveCustomHours} className="mt-4 space-y-4 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-[#033135]">
                                <input
                                    type="checkbox"
                                    checked={customHoursForm.unavailable}
                                    onChange={(e) => setCustomHoursForm({ ...customHoursForm, unavailable: e.target.checked })}
                                    className="h-4 w-4 rounded accent-[#033135]"
                                />
                                <span>Mark entire date unavailable</span>
                            </label>

                            {!customHoursForm.unavailable && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#324C4D] mb-1">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={customHoursForm.startTime}
                                            onChange={(e) => setCustomHoursForm({ ...customHoursForm, startTime: e.target.value })}
                                            className="w-full rounded-xl border border-[#DCE7E3] px-3 py-2 text-xs font-bold text-[#033135]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#324C4D] mb-1">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={customHoursForm.endTime}
                                            onChange={(e) => setCustomHoursForm({ ...customHoursForm, endTime: e.target.value })}
                                            className="w-full rounded-xl border border-[#DCE7E3] px-3 py-2 text-xs font-bold text-[#033135]"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-semibold text-[#324C4D] mb-1">
                                    Reason / Note (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={customHoursForm.reason}
                                    onChange={(e) => setCustomHoursForm({ ...customHoursForm, reason: e.target.value })}
                                    placeholder="e.g. Afternoon clinic only / Hospital duty"
                                    className="w-full rounded-xl border border-[#DCE7E3] px-3 py-2 text-xs outline-none focus:border-[#648C83]"
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-[#E8EFEB] pt-4">
                                {settings.dateOverrides?.[customHoursModalDate] ? (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCustomHours(customHoursModalDate)}
                                        className="text-[11px] font-bold text-[#C0563B] hover:underline"
                                    >
                                        Remove Override
                                    </button>
                                ) : <div />}

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCustomHoursModalDate(null)}
                                        className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold text-white shadow-xs"
                                        style={{ color: '#ffffff' }}
                                    >
                                        Save Date Override
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
