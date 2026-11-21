import {
    Flame,
    Footprints,
    Droplets,
    Moon,
    Target,
    Trophy,
    ArrowRight,
    Plus,
    TrendingUp,
    Heart,
    Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const metrics = [
    {
        title: 'Steps',
        value: '6,240',
        progress: 78,
        icon: Footprints,
        color: 'bg-[#E4F0EA]',
        bar: 'bg-[#324C4D]',
        nudge: 'Walk about 1,760 more steps',
    },
    {
        title: 'Water',
        value: '1.5 L',
        progress: 60,
        icon: Droplets,
        color: 'bg-[#DCD6F7]',
        bar: 'bg-[#6B5B95]',
        nudge: 'Drink 1 L more water',
    },
    {
        title: 'Sleep',
        value: '7.2 h',
        progress: 90,
        icon: Moon,
        color: 'bg-[#FFD9C7]',
        bar: 'bg-[#C97B5D]',
        nudge: 'Aim for an earlier bedtime tonight',
    },
    {
        title: 'Calories',
        value: '320',
        progress: 64,
        icon: Flame,
        color: 'bg-[#F8E7A5]',
        bar: 'bg-[#C49A42]',
        nudge: 'Burn about 180 more kcal',
    },
]

const weeklyActivity = [
    { day: 'Mon', value: 55 },
    { day: 'Tue', value: 75 },
    { day: 'Wed', value: 45 },
    { day: 'Thu', value: 90 },
    { day: 'Fri', value: 65 },
    { day: 'Sat', value: 80 },
    { day: 'Sun', value: 40 },
]

/* Smooth line + area path for the weekly trend chart */
const CHART_W = 300
const CHART_H = 120

function buildChart(data) {
    const pts = data.map((d, i) => ({
        x: ((i + 0.5) / data.length) * CHART_W,
        y: CHART_H - 12 - (d.value / 100) * (CHART_H - 32),
    }))

    let line = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1]
        const cur = pts[i]
        const mid = (prev.x + cur.x) / 2
        line += ` C ${mid} ${prev.y}, ${mid} ${cur.y}, ${cur.x} ${cur.y}`
    }

    const area = `${line} L ${pts[pts.length - 1].x} ${CHART_H} L ${pts[0].x} ${CHART_H} Z`
    return { pts, line, area }
}

function Home() {
    const navigate = useNavigate()

    const quickActions = [
        {
            title: 'Log Activity',
            description: 'Record your movement',
            icon: Footprints,
            color: 'bg-[#E4F0EA]',
            action: () => navigate('/health'),
        },
        {
            title: 'Track Water',
            description: 'Update your hydration',
            icon: Droplets,
            color: 'bg-[#DCD6F7]',
            action: () => navigate('/health'),
        },
        {
            title: 'View Rewards',
            description: 'Check your achievements',
            icon: Trophy,
            color: 'bg-[#F8E7A5]',
            action: () => navigate('/rewards'),
        },
        {
            title: 'Community',
            description: 'Explore wellness content',
            icon: Heart,
            color: 'bg-[#FFD9C7]',
            action: () => navigate('/community'),
        },
    ]

    // The habit that needs the most attention right now
    const focus = metrics.reduce((lowest, m) => (m.progress < lowest.progress ? m : lowest), metrics[0])
    const FocusIcon = focus.icon

    const { pts, line, area } = buildChart(weeklyActivity)
    const bestIndex = weeklyActivity.reduce(
        (best, d, i) => (d.value > weeklyActivity[best].value ? i : best),
        0
    )
    const weekAvg = Math.round(
        weeklyActivity.reduce((sum, d) => sum + d.value, 0) / weeklyActivity.length
    )

    return (
        <div className="space-y-5 sm:space-y-7">

            {/* Welcome */}
            <section className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-[#647572]">
                        Your wellness journey continues
                    </p>

                    <h1
                        className="mt-1 text-3xl sm:text-4xl text-[#033135]"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Good morning!
                    </h1>

                    <p className="mt-1.5 text-xs sm:text-sm text-[#647572]">
                        Small steps today, healthier habits tomorrow.
                    </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8E7A5] sm:h-12 sm:w-12">
                    <Sparkles size={21} className="text-[#8B6D25]" />
                </div>
            </section>

            {/* Wellness Score */}
            <section className="relative overflow-hidden rounded-2xl bg-[#033135] p-4 text-white sm:rounded-3xl sm:p-7">
                <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#324C4D] opacity-60 sm:h-56 sm:w-56" />

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-[#C4D7D4]">
                            <Heart size={17} />
                            <span className="text-[10px] sm:text-xs font-semibold tracking-wide">
                                YOUR WELLNESS OVERVIEW
                            </span>
                        </div>

                        <div className="mt-3 flex items-end gap-2">
                            <span className="text-4xl sm:text-5xl" style={{ fontFamily: SERIF }}>78</span>
                            <span className="mb-1.5 text-xs sm:text-sm text-[#C4D7D4]">
                                / 100
                            </span>
                        </div>

                        <p className="mt-1 text-xs sm:text-sm text-[#C4D7D4]">
                            You're building some great habits!
                        </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 sm:min-w-48 sm:p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8E7A5] sm:h-12 sm:w-12">
                            <Flame size={22} className="text-[#8B6D25]" />
                        </div>

                        <div>
                            <p className="text-xl sm:text-2xl font-bold">5 Days</p>
                            <p className="text-[10px] sm:text-xs text-[#C4D7D4]">
                                Current streak
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-5">
                    <div className="mb-2 flex justify-between text-[10px] sm:text-xs">
                        <span className="text-[#C4D7D4]">Wellness progress</span>
                        <span className="font-semibold">78%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full w-[78%] rounded-full bg-[#C4D7D4]" />
                    </div>
                </div>
            </section>

            {/* Today at a glance (compact; full details live on the Health screen) */}
            <section className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-[#033135]">
                            Today at a glance
                        </h2>
                        <p className="mt-1 text-[10px] sm:text-xs text-[#647572]">
                            A quick look at your daily habits
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/health')}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-[#E4F0EA] px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-[#324C4D] transition hover:bg-[#d6e8de]"
                    >
                        Health details <ArrowRight size={13} />
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
                    {metrics.map((metric) => {
                        const Icon = metric.icon

                        return (
                            <div
                                key={metric.title}
                                className="flex min-w-0 flex-col items-center rounded-xl bg-[#F7F9F8] px-1 py-3 text-center sm:py-4"
                            >
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10 ${metric.color}`}>
                                    <Icon size={16} className="text-[#033135]" />
                                </div>

                                <p className="mt-2 text-xs font-bold text-[#033135] sm:text-base">
                                    {metric.value}
                                </p>
                                <p className="text-[9px] text-[#647572] sm:text-xs">
                                    {metric.title}
                                </p>

                                <div className="mt-2 h-1 w-8 overflow-hidden rounded-full bg-[#E3E7E3] sm:w-12">
                                    <div
                                        className={`h-full rounded-full ${metric.bar}`}
                                        style={{ width: `${metric.progress}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Today's Focus */}
            <section className="flex items-center gap-3 rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:gap-4 sm:p-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${focus.color}`}>
                    <FocusIcon size={22} className="text-[#033135]" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-[#8B6D25] sm:text-xs">
                        <Target size={12} />
                        TODAY'S FOCUS
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-[#033135] sm:text-base">
                        {focus.nudge}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-[#647572] sm:text-xs">
                        {focus.title} is at {focus.progress}% of today's goal.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/health')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#033135] text-white transition hover:bg-[#324C4D] sm:h-auto sm:w-auto sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-xs sm:font-semibold"
                    aria-label="Update in tracker"
                >
                    <Plus size={17} className="sm:hidden" />
                    <span className="hidden sm:inline">Update</span>
                    <ArrowRight size={14} className="hidden sm:block" />
                </button>
            </section>

            {/* Weekly Trend: smooth area chart */}
            <section className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-[#033135]">
                            Weekly Trend
                        </h2>
                        <p className="mt-1 text-[10px] sm:text-xs text-[#647572]">
                            How your activity moved this week
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#E4F0EA] px-3 py-1.5 text-[10px] font-semibold text-[#324C4D] sm:text-xs">
                        <TrendingUp size={13} />
                        Avg {weekAvg}%
                    </div>
                </div>

                <div className="relative h-36 sm:h-44">
                    {/* gridlines */}
                    {[25, 50, 75].map((g) => (
                        <div
                            key={g}
                            className="absolute left-0 right-0 border-t border-dashed border-[#EEF2EF]"
                            style={{ bottom: `calc(1.5rem + (100% - 1.5rem) * ${g} / 100)` }}
                        />
                    ))}

                    <div className="absolute inset-x-0 top-0" style={{ bottom: '1.5rem' }}>
                        <svg
                            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                            preserveAspectRatio="none"
                            className="h-full w-full overflow-visible"
                            aria-hidden="true"
                        >
                            <defs>
                                <linearGradient id="homeTrendFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#324C4D" stopOpacity="0.28" />
                                    <stop offset="100%" stopColor="#324C4D" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={area} fill="url(#homeTrendFill)" />
                            <path
                                d={line}
                                fill="none"
                                stroke="#324C4D"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>

                        {/* data points */}
                        {pts.map((p, i) => {
                            const isBest = i === bestIndex
                            return (
                                <div
                                    key={weeklyActivity[i].day}
                                    className="absolute -translate-x-1/2 translate-y-1/2"
                                    style={{
                                        left: `${(p.x / CHART_W) * 100}%`,
                                        bottom: `${((CHART_H - p.y) / CHART_H) * 100}%`,
                                    }}
                                >
                                    {isBest && (
                                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#033135] px-2 py-1 text-[10px] font-bold text-white shadow">
                                            {weeklyActivity[i].value}%
                                        </span>
                                    )}
                                    <span
                                        className={`block rounded-full border-2 border-white shadow ${isBest
                                            ? 'h-3.5 w-3.5 bg-[#033135] ring-4 ring-[#C4D7D4]/60'
                                            : 'h-2.5 w-2.5 bg-[#324C4D]'
                                            }`}
                                    />
                                </div>
                            )
                        })}
                    </div>

                    {/* day labels */}
                    <div className="absolute inset-x-0 bottom-0 flex h-6 items-end">
                        {weeklyActivity.map((item, i) => (
                            <span
                                key={item.day}
                                className={`flex-1 text-center text-[10px] sm:text-xs ${i === bestIndex ? 'font-bold text-[#033135]' : 'text-[#647572]'}`}
                            >
                                {item.day}
                            </span>
                        ))}
                    </div>
                </div>

                <p className="mt-3 text-[10px] sm:text-xs text-[#647572]">
                    Sample activity data for demonstration.
                </p>
            </section>

            {/* Challenge Banner */}
            <section className="flex flex-col gap-3 rounded-2xl bg-[#F8E7A5]/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white sm:h-12 sm:w-12">
                        <Trophy size={21} className="text-[#8B6D25]" />
                    </div>

                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-[#8B6D25]">
                            WEEKLY CHALLENGE
                        </p>

                        <h3 className="mt-1 text-sm sm:text-base font-bold text-[#033135]">
                            Build your healthy habits
                        </h3>

                        <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/70 sm:w-32">
                                <div className="h-full w-1/3 rounded-full bg-[#8B6D25]" />
                            </div>
                            <span className="text-[10px] font-semibold text-[#8B6D25] sm:text-xs">
                                1 of 3 missions done
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/rewards')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#033135] px-4 py-2.5 text-xs sm:w-auto sm:py-3 sm:text-sm font-semibold text-white transition hover:bg-[#324C4D]"
                >
                    Explore Challenges
                    <ArrowRight size={15} />
                </button>
            </section>

            {/* Quick Actions */}
            <section>
                <div className="mb-3">
                    <h2 className="text-lg sm:text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                        Quick Actions
                    </h2>
                    <p className="mt-1 text-[10px] sm:text-xs text-[#647572]">
                        What would you like to do today?
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon

                        return (
                            <button
                                key={action.title}
                                onClick={action.action}
                                className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-[#E8EFEB] bg-white p-3 text-left transition hover:border-[#C4D7D4] hover:shadow-sm sm:gap-3 sm:rounded-2xl sm:p-4"
                            >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${action.color}`}>
                                    <Icon size={19} className="text-[#033135]" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs sm:text-sm font-bold text-[#033135]">
                                        {action.title}
                                    </p>

                                    <p className="mt-1 text-[9px] sm:text-xs text-[#647572]">
                                        {action.description}
                                    </p>
                                </div>

                                <ArrowRight
                                    size={15}
                                    className="hidden shrink-0 text-[#9AA6A0] transition group-hover:translate-x-0.5 group-hover:text-[#324C4D] sm:block"
                                />
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* Wellness Tip */}
            <section className="flex items-start gap-3 rounded-2xl border border-[#DCD6F7] bg-[#DCD6F7]/40 p-4 sm:p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white sm:h-10 sm:w-10">
                    <Sparkles size={19} className="text-[#6B5B95]" />
                </div>

                <div>
                    <p className="text-[10px] sm:text-xs font-bold text-[#6B5B95]">
                        TODAY'S WELLNESS TIP
                    </p>

                    <h3 className="mt-1 text-sm font-bold text-[#033135]">
                        Take small breaks throughout your day.
                    </h3>

                    <p className="mt-1 text-xs sm:text-sm leading-5 text-[#647572]">
                        A little movement between long periods of sitting can help
                        you feel refreshed. Find a routine that works for you.
                    </p>
                </div>
            </section>

            {/* Demo Notice */}
            <p className="text-center text-[10px] text-[#647572]">
                FitKey prototype · All displayed health metrics are sample data.
            </p>

        </div>
    )
}

export default Home