import { useState } from 'react'
import {
    Footprints,
    Flame,
    Droplets,
    Moon,
    Activity,
    Plus,
    Minus,
    TrendingUp,
    CalendarDays,
    Clock,
    CheckCircle2,
    Target,
} from 'lucide-react'
import toast from 'react-hot-toast'

const initialMetrics = [
    {
        title: 'Steps',
        value: 6240,
        target: 8000,
        unit: 'steps',
        icon: Footprints,
        color: 'bg-[#E4F0EA]',
        iconColor: 'text-[#324C4D]',
        barColor: 'bg-[#324C4D]',
        tint: 'bg-[#E4F0EA] text-[#324C4D]',
    },
    {
        title: 'Calories Burned',
        value: 320,
        target: 500,
        unit: 'kcal',
        icon: Flame,
        color: 'bg-[#FFD9C7]',
        iconColor: 'text-[#A45E45]',
        barColor: 'bg-[#C97B5D]',
        tint: 'bg-[#FFD9C7] text-[#A45E45]',
    },
    {
        title: 'Water Intake',
        value: 1500,
        target: 2500,
        unit: 'ml',
        icon: Droplets,
        color: 'bg-[#DCD6F7]',
        iconColor: 'text-[#6B5B95]',
        barColor: 'bg-[#6B5B95]',
        tint: 'bg-[#DCD6F7] text-[#6B5B95]',
    },
    {
        title: 'Sleep',
        value: 7.2,
        target: 8,
        unit: 'hours',
        icon: Moon,
        color: 'bg-[#F8E7A5]',
        iconColor: 'text-[#8B6D25]',
        barColor: 'bg-[#C49A42]',
        tint: 'bg-[#F8E7A5] text-[#8B6D25]',
    },
]

const activityHistory = [
    { title: 'Morning Walk', detail: 'Outdoor activity', time: '7:30 AM', value: '+2,400 steps', icon: Footprints, color: 'bg-[#E4F0EA]', iconColor: 'text-[#324C4D]' },
    { title: 'Water Logged', detail: '500 ml water', time: '10:15 AM', value: '+500 ml', icon: Droplets, color: 'bg-[#DCD6F7]', iconColor: 'text-[#6B5B95]' },
    { title: 'Evening Workout', detail: 'Light exercise', time: 'Yesterday', value: '+120 kcal', icon: Flame, color: 'bg-[#FFD9C7]', iconColor: 'text-[#A45E45]' },
]

const weekData = [
    { day: 'Mon', value: 65 },
    { day: 'Tue', value: 82 },
    { day: 'Wed', value: 48 },
    { day: 'Thu', value: 90 },
    { day: 'Fri', value: 72 },
    { day: 'Sat', value: 55 },
    { day: 'Sun', value: 0 },
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const GOAL_LINE = 75

const getProgress = (metric) => Math.min(100, (metric.value / metric.target) * 100)

const formatRemaining = (metric) => {
    const left = Math.max(0, metric.target - metric.value)
    if (left === 0) return 'Goal reached'
    const rounded = Math.round(left * 10) / 10
    return `${rounded.toLocaleString()} ${metric.unit} to go`
}

function Health() {
    const [metrics, setMetrics] = useState(initialMetrics)

    const updateWater = (amount) => {
        setMetrics((current) =>
            current.map((metric) =>
                metric.title === 'Water Intake'
                    ? {
                        ...metric,
                        value: Math.max(
                            0,
                            Math.min(metric.target, metric.value + amount)
                        ),
                    }
                    : metric
            )
        )

        if (amount > 0) {
            toast.success('Water intake updated!')
        }
    }

    const handleLogActivity = () => {
        toast.success('Activity logging will be connected next!')
    }

    const now = new Date()
    const todayLabel = DAY_LABELS[now.getDay()]
    const todayText = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

    const overall = Math.round(
        metrics.reduce((sum, m) => sum + getProgress(m), 0) / metrics.length
    )
    const goalsMet = metrics.filter((m) => m.value >= m.target).length

    const activeDays = weekData.filter((d) => d.value > 0)
    const weekAvg = Math.round(activeDays.reduce((s, d) => s + d.value, 0) / activeDays.length)
    const bestDay = weekData.reduce((best, d) => (d.value > best.value ? d : best), weekData[0])

    return (
        <div className="space-y-5 sm:space-y-7">

            {/* Page Heading */}
            <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="mb-1.5 flex items-center gap-2 text-xs sm:text-sm text-[#647572]">
                        <Activity size={16} />
                        YOUR HEALTH TRACKER
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-[#033135]">
                        Your Health
                    </h1>

                    <p className="mt-1.5 text-xs sm:text-sm text-[#647572]">
                        Understand your habits and keep track of your progress.
                    </p>
                </div>

                <button
                    onClick={handleLogActivity}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#033135] px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#324C4D] active:scale-[0.98]"
                >
                    <Plus size={17} />
                    Log Activity
                </button>
            </section>

            {/* Date and Overview */}
            <section className="rounded-2xl bg-[#E4F0EA] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white sm:h-11 sm:w-11">
                            <CalendarDays size={20} className="text-[#324C4D]" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-[#647572]">
                                TODAY'S SUMMARY · {todayText.toUpperCase()}
                            </p>
                            <h2 className="truncate text-sm sm:text-base font-bold text-[#033135]">
                                {goalsMet} of {metrics.length} goals reached
                            </h2>
                        </div>
                    </div>

                    <div className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-center sm:px-4 sm:py-2">
                        <p className="text-lg font-bold leading-none text-[#033135] sm:text-xl">{overall}%</p>
                        <p className="mt-0.5 text-[9px] sm:text-[10px] text-[#647572]">overall</p>
                    </div>
                </div>

                <div className="mt-4 flex gap-1.5">
                    {metrics.map((metric) => (
                        <div key={metric.title} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${metric.barColor}`}
                                style={{ width: `${getProgress(metric)}%` }}
                            />
                        </div>
                    ))}
                </div>

                <p className="mt-2 text-[10px] font-medium text-[#647572] sm:text-xs">
                    Demo data · Today
                </p>
            </section>

            {/* Metrics */}
            <section>
                <div className="mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-bold text-[#033135]">
                        Health Metrics
                    </h2>
                    <p className="mt-1 text-[11px] sm:text-xs text-[#647572]">
                        Your daily wellness measurements
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
                    {metrics.map((metric) => {
                        const Icon = metric.icon
                        const progress = getProgress(metric)
                        const reached = metric.value >= metric.target

                        return (
                            <div
                                key={metric.title}
                                className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-3.5 transition hover:shadow-md sm:rounded-3xl sm:p-5 ${metric.color}`}
                            >
                                {/* decorative corner */}
                                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/30" />

                                <div className="relative flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`truncate text-xs font-bold sm:text-sm ${metric.iconColor}`}>
                                            {metric.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-[10px] text-[#033135]/60 sm:text-xs">
                                            Goal {metric.target.toLocaleString()} {metric.unit}
                                        </p>
                                    </div>

                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 sm:h-10 sm:w-10">
                                        <Icon size={17} className={metric.iconColor} />
                                    </div>
                                </div>

                                <p className="relative mt-4 break-words text-2xl font-extrabold leading-none text-[#033135] sm:mt-6 sm:text-3xl">
                                    {metric.value.toLocaleString()}
                                    <span className="ml-1 text-[10px] font-semibold text-[#033135]/60 sm:text-xs">
                                        {metric.unit}
                                    </span>
                                </p>

                                <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-white/60 sm:mt-4">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-[#2F7B58]' : metric.barColor}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                <div className="relative mt-2 flex items-center justify-between gap-1 text-[10px] sm:text-xs">
                                    <span className={`truncate font-medium ${reached ? 'text-[#2F7B58]' : 'text-[#033135]/70'}`}>
                                        {formatRemaining(metric)}
                                    </span>
                                    <span className={`shrink-0 font-bold ${metric.iconColor}`}>
                                        {Math.round(progress)}%
                                    </span>
                                </div>

                                {metric.title === 'Water Intake' && (
                                    <div className="relative mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/60 p-1.5 sm:mt-4">
                                        <button
                                            onClick={() => updateWater(-250)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#033135] shadow-sm transition active:scale-95 sm:h-9 sm:w-9"
                                            aria-label="Remove 250 ml"
                                        >
                                            <Minus size={15} />
                                        </button>

                                        <span className="text-[10px] font-semibold text-[#033135]/70 sm:text-xs">
                                            250 ml
                                        </span>

                                        <button
                                            onClick={() => updateWater(250)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#033135] text-white shadow-sm transition active:scale-95 sm:h-9 sm:w-9"
                                            aria-label="Add 250 ml"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Weekly Progress and Goal Summary */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-5">

                {/* Weekly Activity */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:col-span-2 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-[#033135]">
                                Weekly Activity
                            </h2>
                            <p className="mt-1 text-[10px] sm:text-xs text-[#647572]">
                                Your activity consistency this week
                            </p>
                        </div>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA]">
                            <TrendingUp size={18} className="text-[#324C4D]" />
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#E4F0EA] px-3 py-1 text-[10px] font-semibold text-[#324C4D] sm:text-xs">
                            Avg {weekAvg}%
                        </span>
                        <span className="rounded-full bg-[#F8E7A5]/70 px-3 py-1 text-[10px] font-semibold text-[#8B6D25] sm:text-xs">
                            Best day · {bestDay.day}
                        </span>
                    </div>

                    <div className="relative">
                        {/* goal line */}
                        <div
                            className="pointer-events-none absolute left-0 right-0 z-0 border-t border-dashed border-[#C4D7D4]"
                            style={{ bottom: `calc(1.75rem + (100% - 1.75rem) * ${GOAL_LINE} / 100)` }}
                        >
                            <span className="absolute -top-4 right-0 text-[9px] text-[#9AA6A0] sm:text-[10px]">
                                Goal {GOAL_LINE}%
                            </span>
                        </div>

                        <div className="relative z-10 flex h-40 items-end justify-between gap-2 sm:h-48 sm:gap-3">
                            {weekData.map((item) => {
                                const isToday = item.day === todayLabel
                                const isBest = item.day === bestDay.day
                                return (
                                    <div
                                        key={item.day}
                                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                                    >
                                        <span className={`text-[9px] font-semibold sm:text-[11px] ${isBest ? 'text-[#033135]' : 'text-[#9AA6A0]'}`}>
                                            {item.value > 0 ? item.value : '–'}
                                        </span>

                                        <div className="flex w-full flex-1 items-end">
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-500 ${isBest ? 'bg-[#324C4D]' : 'bg-[#C4D7D4]'
                                                    }`}
                                                style={{ height: `${Math.max(item.value, 4)}%` }}
                                            />
                                        </div>

                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs ${isToday
                                                ? 'bg-[#033135] font-semibold text-white'
                                                : 'text-[#647572]'
                                                }`}
                                        >
                                            {item.day}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <p className="mt-4 text-[10px] sm:text-xs text-[#647572]">
                        Demo activity data shown for illustration.
                    </p>
                </div>

                {/* Goal Summary */}
                <div className="rounded-2xl bg-[#033135] p-4 text-white sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                            <Target size={21} className="text-[#C4D7D4]" />
                        </div>

                        <div className="text-right">
                            <p className="text-2xl font-bold leading-none sm:text-3xl">{overall}%</p>
                            <p className="mt-1 text-[10px] text-[#C4D7D4] sm:text-xs">overall today</p>
                        </div>
                    </div>

                    <h2 className="mt-3 text-base sm:mt-5 sm:text-lg font-bold">
                        Daily Goal Progress
                    </h2>

                    <p className="mt-1 text-xs sm:text-sm text-[#C4D7D4]">
                        Keep moving towards your daily targets.
                    </p>

                    <div className="mt-5 space-y-4 sm:mt-7 sm:space-y-5">
                        {metrics.map((metric) => {
                            const Icon = metric.icon
                            const progress = getProgress(metric)

                            return (
                                <div key={metric.title}>
                                    <div className="mb-2 flex items-center justify-between gap-2 text-[10px] sm:text-xs">
                                        <span className="flex items-center gap-1.5 text-[#C4D7D4]">
                                            <Icon size={13} />
                                            {metric.title}
                                        </span>
                                        <span className="font-semibold">{Math.round(progress)}%</span>
                                    </div>

                                    <div className="h-1.5 overflow-hidden rounded-full bg-white/15 sm:h-2">
                                        <div
                                            className="h-full rounded-full bg-[#C4D7D4] transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Recent Activity */}
            <section className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between sm:mb-5">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-[#033135]">
                            Recent Activity
                        </h2>
                        <p className="mt-1 text-[10px] sm:text-xs text-[#647572]">
                            Your recently logged activities
                        </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA]">
                        <Clock size={18} className="text-[#324C4D]" />
                    </div>
                </div>

                <div className="space-y-1 sm:space-y-2">
                    {activityHistory.map((item) => {
                        const Icon = item.icon

                        return (
                            <div
                                key={item.title}
                                className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-3 transition hover:bg-[#FAFBFA] sm:gap-3"
                            >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${item.color}`}>
                                    <Icon size={18} className={item.iconColor} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs sm:text-sm font-semibold text-[#033135]">
                                        {item.title}
                                    </p>
                                    <p className="mt-1 truncate text-[10px] sm:text-xs text-[#647572]">
                                        {item.detail} · {item.time}
                                    </p>
                                </div>

                                <span className="shrink-0 rounded-full bg-[#F0F3F0] px-2.5 py-1 text-[9px] sm:text-xs font-semibold text-[#324C4D]">
                                    {item.value}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Health Reminder */}
            <section className="flex items-start gap-3 rounded-2xl border border-[#DCD6F7] bg-[#DCD6F7]/40 p-4 sm:p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
                    <CheckCircle2 size={19} className="text-[#6B5B95]" />
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-[#033135]">
                        Consistency over perfection
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm leading-5 sm:leading-6 text-[#647572]">
                        Your wellness journey is personal. Focus on building habits
                        that work for your routine instead of chasing perfect numbers.
                    </p>
                </div>
            </section>

            <p className="text-center text-[10px] text-[#647572]">
                Sample data for demonstration only. Not medical measurements.
            </p>

        </div>
    )
}

export default Health