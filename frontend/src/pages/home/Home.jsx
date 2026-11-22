import { useState, useEffect } from 'react'
import {
    Footprints,
    Droplets,
    Moon,
    Target,
    Trophy,
    ArrowRight,
    TrendingUp,
    Heart,
    Sparkles,
    Timer,
    Flame,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
    getGoals,
    todaySteps,
    todayWaterTotal,
    todaySleep,
    todayActiveMinutes,
    overallProgress,
    getWeeklyHistory,
} from '../../services/healthService'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

/* Smooth line + area path for the weekly trend chart */
const CHART_W = 300
const CHART_H = 120

function buildChart(data) {
    if (!data || data.length === 0) return { pts: [], line: '', area: '' }
    const pts = data.map((d, i) => ({
        x: ((i + 0.5) / data.length) * CHART_W,
        y: CHART_H - 12 - (Math.max(0, Math.min(100, d.value)) / 100) * (CHART_H - 32),
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

/* Combines 1–2 contextual suggestions based on current health data */
function getCombinedRecommendation(healthData) {
    const { steps = 0, waterMl = 0, sleepHours = 0, activeMins = 0, goals = {} } = healthData
    const stepGoal = goals.steps || 8000
    const waterGoal = goals.waterMl || 2500
    const sleepGoal = goals.sleepHours || 8
    const activeGoal = goals.activeMinutes || 30

    const deficits = []

    // 1. Steps deficit
    if (steps < stepGoal) {
        const pct = (steps / stepGoal) * 100
        deficits.push({
            type: 'steps',
            pct,
            suggestion: pct < 40
                ? 'take a short 15-minute walk to get moving'
                : 'a short walk will help you hit your daily step goal',
        })
    }

    // 2. Water deficit
    if (waterMl < waterGoal) {
        const pct = (waterMl / waterGoal) * 100
        deficits.push({
            type: 'water',
            pct,
            suggestion: 'drink a glass of water to keep your hydration on track',
        })
    }

    // 3. Sleep deficit
    if (sleepHours < sleepGoal) {
        const pct = (sleepHours / sleepGoal) * 100
        deficits.push({
            type: 'sleep',
            pct,
            suggestion: sleepHours === 0
                ? 'prioritize a restful routine and earlier bedtime tonight'
                : 'wind down with an earlier bedtime routine tonight for recovery',
        })
    }

    // 4. Active minutes deficit
    if (activeMins < activeGoal) {
        const pct = (activeMins / activeGoal) * 100
        deficits.push({
            type: 'active',
            pct,
            suggestion: 'fit in a 10-minute stretch or workout to stay active',
        })
    }

    // If all goals achieved
    if (deficits.length === 0) {
        return {
            title: "You're on track!",
            message: "Fantastic job hitting your targets today! Keep up the momentum and stay consistent.",
        }
    }

    // Sort by lowest progress first
    deficits.sort((a, b) => a.pct - b.pct)

    // Single suggestion if only 1 deficit
    if (deficits.length === 1) {
        const item = deficits[0]
        const cap = item.suggestion.charAt(0).toUpperCase() + item.suggestion.slice(1)
        return {
            title: "Today's Recommendation",
            message: `${cap}. You're making progress!`,
        }
    }

    // Combine top 2 contextual suggestions together
    const [first, second] = deficits

    let combined = ''
    if (first.type === 'steps' && second.type === 'water') {
        combined = 'Take a short walk to boost your step count, and drink a glass of water to keep your hydration on track.'
    } else if (first.type === 'water' && second.type === 'steps') {
        combined = 'Drink a glass of water to replenish your hydration, and take a short walk to keep moving toward your step goal.'
    } else if (first.type === 'steps' && second.type === 'sleep') {
        combined = 'A short walk will help energize your day, and an earlier bedtime tonight will support your recovery.'
    } else if (first.type === 'sleep' && second.type === 'steps') {
        combined = 'Plan an earlier bedtime tonight for recovery, and try a short walk to stay gently active.'
    } else if (first.type === 'water' && second.type === 'sleep') {
        combined = 'Remember to drink a glass of water to stay hydrated, and wind down with an earlier bedtime routine tonight.'
    } else if (first.type === 'sleep' && second.type === 'water') {
        combined = 'Set a restful bedtime routine for earlier sleep tonight, and drink a glass of water to keep your hydration up.'
    } else if (first.type === 'steps' && second.type === 'active') {
        combined = 'A brisk 15-minute walk will help you progress on both your steps and active minutes targets.'
    } else if (first.type === 'active' && second.type === 'water') {
        combined = 'Fit in a quick 10-minute movement session, and keep a water bottle nearby to stay well-hydrated.'
    } else {
        const firstCap = first.suggestion.charAt(0).toUpperCase() + first.suggestion.slice(1)
        combined = `${firstCap}, and ${second.suggestion}.`
    }

    return {
        title: "Today's Recommendation",
        message: combined,
    }
}

function Home() {
    const navigate = useNavigate()

    const [healthData, setHealthData] = useState(() => {
        const goals = getGoals()
        const steps = todaySteps().steps
        const waterMl = todayWaterTotal()
        const sleepHours = todaySleep()?.durationHours ?? 0
        const activeMins = todayActiveMinutes()
        const overall = overallProgress()
        const weekly = getWeeklyHistory()
        return { goals, steps, waterMl, sleepHours, activeMins, overall, weekly }
    })

    useEffect(() => {
        const goals = getGoals()
        const steps = todaySteps().steps
        const waterMl = todayWaterTotal()
        const sleepHours = todaySleep()?.durationHours ?? 0
        const activeMins = todayActiveMinutes()
        const overall = overallProgress()
        const weekly = getWeeklyHistory()
        setHealthData({ goals, steps, waterMl, sleepHours, activeMins, overall, weekly })
    }, [])

    const pct = (val, goal) => Math.min(100, goal > 0 ? Math.round((val / goal) * 100) : 0)

    const metrics = [
        {
            title: 'Steps',
            value: healthData.steps >= 10000
                ? `${(healthData.steps / 1000).toFixed(1)}k`
                : healthData.steps.toLocaleString(),
            progress: pct(healthData.steps, healthData.goals.steps),
            icon: Footprints,
            color: 'bg-[#E4F0EA]',
            bar: 'bg-[#324C4D]',
            nudge: healthData.steps >= healthData.goals.steps
                ? 'Daily steps goal achieved!'
                : `Walk ${Math.max(0, healthData.goals.steps - healthData.steps).toLocaleString()} more steps`,
        },
        {
            title: 'Water',
            value: `${(healthData.waterMl / 1000).toFixed(1)} L`,
            progress: pct(healthData.waterMl, healthData.goals.waterMl),
            icon: Droplets,
            color: 'bg-[#DCD6F7]',
            bar: 'bg-[#6B5B95]',
            nudge: healthData.waterMl >= healthData.goals.waterMl
                ? 'Hydration target reached!'
                : `Drink ${Math.max(0, (healthData.goals.waterMl - healthData.waterMl) / 1000).toFixed(1)} L more water`,
        },
        {
            title: 'Sleep',
            value: healthData.sleepHours > 0 ? `${healthData.sleepHours} h` : '–',
            progress: pct(healthData.sleepHours, healthData.goals.sleepHours),
            icon: Moon,
            color: 'bg-[#F8E7A5]',
            bar: 'bg-[#C49A42]',
            nudge: healthData.sleepHours >= healthData.goals.sleepHours
                ? 'Sleep target reached!'
                : 'Aim for a consistent bedtime tonight',
        },
        {
            title: 'Active',
            value: `${healthData.activeMins} m`,
            progress: pct(healthData.activeMins, healthData.goals.activeMinutes),
            icon: Timer,
            color: 'bg-[#FFD9C7]',
            bar: 'bg-[#C97B5D]',
            nudge: healthData.activeMins >= healthData.goals.activeMinutes
                ? 'Active minutes goal achieved!'
                : `Move for ${Math.max(0, healthData.goals.activeMinutes - healthData.activeMins)} more mins`,
        },
    ]

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

    // 1–2 contextual suggestions combined based on health data
    const recommendation = getCombinedRecommendation(healthData)

    const weeklyActivity = healthData.weekly.map((d) => ({
        day: d.day,
        value: d.overallPct,
    }))

    const { pts, line, area } = buildChart(weeklyActivity)
    const bestIndex = weeklyActivity.reduce(
        (best, d, i) => (d.value > weeklyActivity[best].value ? i : best),
        0
    )
    const activeDays = weeklyActivity.filter((d) => d.value > 0)
    const weekAvg = activeDays.length > 0
        ? Math.round(activeDays.reduce((sum, d) => sum + d.value, 0) / activeDays.length)
        : 0

    return (
        <div className="space-y-5 sm:space-y-7">

            {/* Welcome */}
            <section className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-[#647572]">
                        Your wellness journey continues
                    </p>

                    <h1
                        className="mt-1 text-2xl sm:text-3xl md:text-4xl text-[#033135] truncate"
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
                <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#324C4D] opacity-60 sm:h-56 sm:w-56" />

                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-[#C4D7D4]">
                            <Heart size={17} />
                            <span className="text-[10px] sm:text-xs font-semibold tracking-wide">
                                YOUR WELLNESS OVERVIEW
                            </span>
                        </div>

                        <div className="mt-3 flex items-end gap-2">
                            <span className="text-3xl sm:text-4xl md:text-5xl" style={{ fontFamily: SERIF }}>
                                {healthData.overall}
                            </span>
                            <span className="mb-1 text-xs sm:text-sm text-[#C4D7D4]">
                                / 100
                            </span>
                        </div>

                        <p className="mt-1 text-xs sm:text-sm text-[#C4D7D4]">
                            {healthData.overall >= 75
                                ? "You're building fantastic healthy habits!"
                                : healthData.overall >= 40
                                    ? "You're making steady daily progress."
                                    : "Start with small habits today!"}
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
                        <span className="font-semibold">{healthData.overall}%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/15">
                        <div
                            className="h-full rounded-full bg-[#C4D7D4] transition-all duration-500"
                            style={{ width: `${healthData.overall}%` }}
                        />
                    </div>
                </div>
            </section>

            {/* Contextual Recommendation Message */}
            <section
                onClick={() => navigate('/health')}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#E0AE3A]/35 bg-gradient-to-r from-[#F8E7A5]/30 via-[#F8FAF7] to-white p-3.5 sm:p-4 transition hover:border-[#E0AE3A] hover:shadow-xs"
            >
                <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8E7A5] text-[#8B6D25]">
                        <Sparkles size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8B6D25]">
                                {recommendation.title}
                            </span>
                            <span className="hidden items-center gap-1 text-[10px] font-semibold text-[#8B6D25] group-hover:inline-flex">
                                Open Tracker <ArrowRight size={11} />
                            </span>
                        </div>

                        <p className="mt-0.5 text-xs sm:text-sm font-medium leading-relaxed text-[#033135]">
                            {recommendation.message}
                        </p>
                    </div>
                </div>
            </section>

            {/* Today at a glance (info display only — click takes user to Health screen) */}
            <section className="rounded-2xl border border-[#E8EFEB] bg-white p-3.5 sm:p-5">
                <div className="mb-3.5 sm:mb-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-[#033135] truncate">
                            Today at a glance
                        </h2>
                        <p className="mt-0.5 text-[10px] sm:text-xs text-[#647572] truncate">
                            Tracked on Health screen
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/health')}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-[#324C4D] transition hover:bg-[#d6e8de]"
                        title="Open Health screen to update habits"
                    >
                        <span>Health details</span>
                        <ArrowRight size={12} />
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
                    {metrics.map((metric) => {
                        const Icon = metric.icon

                        return (
                            <div
                                key={metric.title}
                                onClick={() => navigate('/health')}
                                className="group flex min-w-0 cursor-pointer flex-col items-center rounded-xl bg-[#F7F9F8] p-1.5 sm:p-3 text-center transition hover:bg-[#EEF2EF]"
                                title="View/edit in Health"
                            >
                                <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full ${metric.color}`}>
                                    <Icon size={14} className="text-[#033135]" />
                                </div>

                                <p className="mt-1.5 w-full truncate text-[11px] sm:text-sm font-bold text-[#033135]">
                                    {metric.value}
                                </p>
                                <p className="w-full truncate text-[9px] sm:text-xs text-[#647572]">
                                    {metric.title}
                                </p>

                                <div className="mt-1.5 h-1 w-full max-w-[36px] sm:max-w-[48px] overflow-hidden rounded-full bg-[#E3E7E3]">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${metric.bar}`}
                                        style={{ width: `${metric.progress}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>


            {/* Today's Focus */}
            <section className="flex items-center gap-3 rounded-2xl border border-[#E8EFEB] bg-white p-3.5 sm:gap-4 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${focus.color}`}>
                    <FocusIcon size={20} className="text-[#033135]" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-[#8B6D25] sm:text-xs">
                        <Target size={12} />
                        TODAY'S FOCUS
                    </p>
                    <h3 className="mt-0.5 truncate text-xs sm:text-sm md:text-base font-bold text-[#033135]">
                        {focus.nudge}
                    </h3>
                    <p className="mt-0.5 truncate text-[10px] text-[#647572] sm:text-xs">
                        {focus.title} is at {focus.progress}% of daily goal.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/health')}
                    className="flex shrink-0 items-center justify-center rounded-xl bg-[#033135] px-3 py-2 text-[11px] sm:text-xs font-semibold text-white transition hover:bg-[#324C4D] sm:px-4 sm:py-2.5"
                    aria-label="Update in tracker"
                >
                    <span>Update</span>
                    <ArrowRight size={13} className="ml-1 hidden sm:inline" />
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
                        {pts.length > 0 && (
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
                        )}

                        {/* data points */}
                        {pts.map((p, i) => {
                            const isBest = i === bestIndex && weeklyActivity[i].value > 0
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
                                className={`flex-1 text-center text-[10px] sm:text-xs ${i === bestIndex && item.value > 0 ? 'font-bold text-[#033135]' : 'text-[#647572]'}`}
                            >
                                {item.day}
                            </span>
                        ))}
                    </div>
                </div>
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

                                    <p className="mt-1 truncate text-[9px] sm:text-xs text-[#647572]">
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

        </div>
    )
}

export default Home
