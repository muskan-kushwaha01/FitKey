import { useState, useEffect } from 'react'
import {
  Footprints,
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
  Pencil,
  X,
  Timer,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getGoals,
  saveGoals,
  todaySteps,
  logSteps,
  todayWaterLogs,
  todayWaterTotal,
  addWater,
  adjustWater,
  setWaterTotal,
  removeWaterLog,
  todaySleep,
  logSleep,
  todayActivities,
  logActivity,
  removeActivity,
  getSteps,
  todayActiveMinutes,
  getWeeklyHistory,
  goalsMet as getGoalsMet,
} from '../../services/healthService'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const METRICS = [
  { key: 'steps',         title: 'Steps',          unit: 'steps', icon: Footprints, color: 'bg-[#E4F0EA]',  iconColor: 'text-[#324C4D]',  barColor: 'bg-[#324C4D]'  },
  { key: 'water',         title: 'Water Intake',    unit: 'ml',    icon: Droplets,   color: 'bg-[#DCD6F7]',  iconColor: 'text-[#6B5B95]',  barColor: 'bg-[#6B5B95]'  },
  { key: 'sleep',         title: 'Sleep',           unit: 'hrs',   icon: Moon,       color: 'bg-[#F8E7A5]',  iconColor: 'text-[#8B6D25]',  barColor: 'bg-[#C49A42]'  },
  { key: 'activeMinutes', title: 'Active Minutes',  unit: 'min',   icon: Timer,      color: 'bg-[#FFD9C7]',  iconColor: 'text-[#A45E45]',  barColor: 'bg-[#C97B5D]'  },
]

const GOAL_LINE = 75
const ACTIVITY_TYPES = [
  { label: 'Walking',  emoji: '🚶' },
  { label: 'Running',  emoji: '🏃' },
  { label: 'Cycling',  emoji: '🚴' },
  { label: 'Workout',  emoji: '💪' },
  { label: 'Yoga',     emoji: '🧘' },
  { label: 'Swimming', emoji: '🏊' },
  { label: 'Other',    emoji: '⚡' },
]

const pct = (val, goal) => Math.min(100, goal > 0 ? Math.round((val / goal) * 100) : 0)

function Health() {
  // ── data state ──────────────────────────────────────────────────────────────
  const [goals, setGoals]           = useState(getGoals())
  const [stepsToday, setStepsToday] = useState(0)
  const [waterToday, setWaterToday] = useState(0)
  const [waterLogs, setWaterLogs]   = useState([])
  const [sleepToday, setSleepToday] = useState(null)
  const [sleepInput, setSleepInput] = useState('')
  const [activeToday, setActiveToday] = useState(0)
  const [activities, setActivities] = useState([])
  const [weekData, setWeekData]     = useState([])
  const [metCount, setMetCount]     = useState(0)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [showStepsInput, setShowStepsInput]   = useState(false)
  const [stepsInput, setStepsInput]           = useState('1000')
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityType, setActivityType]       = useState('Walking')
  const [activityDuration, setActivityDuration] = useState('30')
  const [editingGoal, setEditingGoal]         = useState(null) // key of goal being edited
  const [goalDraft, setGoalDraft]             = useState('')

  // ── load ─────────────────────────────────────────────────────────────────────
  const refreshData = () => {
    const g = getGoals()
    setGoals(g)
    setStepsToday(todaySteps().steps)
    setWaterToday(todayWaterTotal())
    setWaterLogs(todayWaterLogs())
    const s = todaySleep()
    setSleepToday(s)
    if (s && s.durationHours != null) {
      setSleepInput(String(s.durationHours))
    }
    setActiveToday(todayActiveMinutes())
    setActivities(todayActivities())
    setWeekData(getWeeklyHistory())
    setMetCount(getGoalsMet())
  }

  useEffect(() => { refreshData() }, [])

  // ── derived ──────────────────────────────────────────────────────────────────
  const now = new Date()
  const todayText = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  const metricValues = {
    steps:         stepsToday,
    water:         waterToday,
    sleep:         sleepToday?.durationHours ?? 0,
    activeMinutes: activeToday,
  }

  const metricGoals = {
    steps:         goals.steps,
    water:         goals.waterMl,
    sleep:         goals.sleepHours,
    activeMinutes: goals.activeMinutes,
  }

  const overall = Math.round(
    (pct(stepsToday, goals.steps) +
     pct(waterToday, goals.waterMl) +
     pct(metricValues.sleep, goals.sleepHours) +
     pct(activeToday, goals.activeMinutes)) / 4
  )

  // ── steps handlers ───────────────────────────────────────────────────────────
  const handleAddSteps = () => {
    const n = parseInt(stepsInput, 10)
    if (!n || n <= 0) { toast.error('Enter a valid step count'); return }
    logSteps(stepsToday + n)
    toast.success(`${n.toLocaleString()} steps added!`)
    setShowStepsInput(false)
    setStepsInput('1000')
    refreshData()
  }

  const handleAdjustSteps = (delta) => {
    const nextSteps = Math.max(0, stepsToday + delta)
    logSteps(nextSteps)
    if (delta > 0) toast.success(`+${delta} steps added!`)
    else toast.success(`${delta} steps adjusted`)
    refreshData()
  }

  // ── water handlers ───────────────────────────────────────────────────────────
  const handleAdjustWater = (delta) => {
    adjustWater(delta)
    if (delta > 0) {
      toast.success(`+${delta} ml logged!`)
    } else {
      toast.success(`${delta} ml adjusted`)
    }
    refreshData()
  }

  const handleSetWater = (ml) => {
    setWaterTotal(ml)
    refreshData()
  }

  const handleRemoveWater = (id) => {
    removeWaterLog(id)
    toast.success('Entry removed')
    refreshData()
  }

  // ── sleep handlers ───────────────────────────────────────────────────────────
  const handleAdjustSleep = (delta) => {
    const current = sleepToday?.durationHours ?? (sleepInput ? parseFloat(sleepInput) : 7)
    const newHours = Math.max(0, Math.min(24, Math.round((current + delta) * 10) / 10))
    logSleep(newHours)
    setSleepInput(String(newHours))
    toast.success(`Sleep set to ${newHours} hrs`)
    refreshData()
  }

  const handleCommitSleepInput = () => {
    const val = parseFloat(sleepInput)
    if (isNaN(val) || val < 0 || val > 24) {
      toast.error('Enter valid hours between 0 and 24')
      setSleepInput(sleepToday ? String(sleepToday.durationHours) : '')
      return
    }
    const clean = Math.round(val * 10) / 10
    logSleep(clean)
    setSleepInput(String(clean))
    toast.success(`Sleep logged: ${clean} hrs`)
    refreshData()
  }

  // ── activity modal ───────────────────────────────────────────────────────────
  const handleLogActivity = () => {
    const mins = parseInt(activityDuration, 10)
    if (!mins || mins <= 0) { toast.error('Enter valid duration'); return }
    logActivity(activityType, mins)
    toast.success(`${activityType} logged!`)
    setShowActivityModal(false)
    setActivityDuration('30')
    refreshData()
  }

  const handleRemoveActivity = (id) => {
    removeActivity(id)
    toast.success('Entry removed')
    refreshData()
  }

  // ── goals inline edit ─────────────────────────────────────────────────────────
  const startEditGoal = (key, currentVal) => {
    setEditingGoal(key)
    setGoalDraft(String(currentVal))
  }

  const commitGoal = (key) => {
    const mins = { steps: 100, waterMl: 500, sleepHours: 4, activeMinutes: 5 }
    // map metric key → goals key
    const goalsKey = key === 'water' ? 'waterMl' : key === 'sleep' ? 'sleepHours' : key
    const val = parseFloat(goalDraft)
    if (!isNaN(val) && val >= (mins[goalsKey] ?? 1)) {
      const updated = { ...goals, [goalsKey]: val }
      saveGoals(updated)
      setGoals(updated)
      refreshData()
      toast.success('Goal updated!')
    }
    setEditingGoal(null)
  }

  // ── unified recent log ────────────────────────────────────────────────────────
  const buildRecentLog = () => {
    const entries = []

    // 1. Common Water Log (one consolidated summary entry for today)
    if (waterToday > 0) {
      const waterRec = todayWaterLogs()[0]
      entries.push({
        id: waterRec?.id || 'water-today',
        type: 'water',
        timestamp: waterRec?.timestamp || new Date().toISOString(),
        label: 'Water Logged',
        detail: `${waterToday.toLocaleString()} ml today`,
        icon: Droplets,
        color: 'bg-[#DCD6F7]',
        iconColor: 'text-[#6B5B95]',
      })
    }

    // 2. Common Sleep Log (one consolidated summary entry for today)
    if (sleepToday && sleepToday.durationHours > 0) {
      entries.push({
        id: sleepToday.id || 'sleep-today',
        type: 'sleep',
        timestamp: sleepToday.timestamp || new Date().toISOString(),
        label: 'Sleep Logged',
        detail: `${sleepToday.durationHours}h sleep`,
        icon: Moon,
        color: 'bg-[#F8E7A5]',
        iconColor: 'text-[#8B6D25]',
      })
    }

    // 3. Common Steps Log (one consolidated summary entry for today)
    if (stepsToday > 0) {
      const stepRec = getSteps().find((r) => r.date === new Date().toISOString().slice(0, 10))
      entries.push({
        id: stepRec?.id || 'steps-today',
        type: 'steps',
        timestamp: stepRec?.timestamp || new Date().toISOString(),
        label: 'Steps Updated',
        detail: `${stepsToday.toLocaleString()} steps today`,
        icon: Footprints,
        color: 'bg-[#E4F0EA]',
        iconColor: 'text-[#324C4D]',
      })
    }

    // 4. Workout / Activity logs (each distinct workout session)
    const actAll = todayActivities()
    actAll.forEach((r) => {
      entries.push({
        id: r.id,
        type: 'activity',
        timestamp: r.timestamp,
        label: r.activity,
        detail: `${r.durationMinutes} min workout`,
        icon: Zap,
        color: 'bg-[#FFD9C7]',
        iconColor: 'text-[#A45E45]',
      })
    })

    return entries
      .filter((e) => e.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
  }

  const handleRemoveLog = (entry) => {
    if (entry.type === 'activity') {
      removeActivity(entry.id)
      toast.success('Activity removed')
    } else if (entry.type === 'water') {
      setWaterTotal(0)
      toast.success('Water log cleared')
    } else if (entry.type === 'sleep') {
      logSleep(0)
      setSleepInput('')
      toast.success('Sleep log cleared')
    } else if (entry.type === 'steps') {
      logSteps(0)
      toast.success('Steps reset')
    }
    refreshData()
  }

  const recentLog = buildRecentLog()

  // ── weekly stats ──────────────────────────────────────────────────────────────
  const activeDays = weekData.filter((d) => d.overallPct > 0)
  const weekAvg    = activeDays.length > 0 ? Math.round(activeDays.reduce((s, d) => s + d.overallPct, 0) / activeDays.length) : 0
  const bestDay    = weekData.reduce((best, d) => (d.overallPct > (best?.overallPct ?? -1) ? d : best), weekData[0] ?? { day: '–', overallPct: 0 })
  const todayDayName = now.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)

  return (
    <div className="space-y-5 sm:space-y-7">

      {/* Page Heading */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs sm:text-sm text-[#647572]">
            <Activity size={16} />
            YOUR HEALTH TRACKER
          </div>
          <h1 className="text-3xl sm:text-4xl text-[#033135]" style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}>
            Your Health
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#647572]">
            Understand your habits and keep track of your progress.
          </p>
        </div>

        <button
          onClick={() => setShowActivityModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#033135] px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#324C4D] active:scale-[0.98]"
        >
          <Plus size={17} />
          Log Activity
        </button>
      </section>

      {/* Today's Summary */}
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
                {metCount} of 4 goals reached
              </h2>
            </div>
          </div>

          <div className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-center sm:px-4 sm:py-2">
            <p className="text-lg font-bold leading-none text-[#033135] sm:text-xl">{overall}%</p>
            <p className="mt-0.5 text-[9px] sm:text-[10px] text-[#647572]">overall</p>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5">
          {METRICS.map((m) => (
            <div key={m.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
              <div
                className={`h-full rounded-full transition-all duration-500 ${m.barColor}`}
                style={{ width: `${pct(metricValues[m.key], metricGoals[m.key])}%` }}
              />
            </div>
          ))}
        </div>

        <p className="mt-2 text-[10px] font-medium text-[#647572] sm:text-xs">
          Live data · Today
        </p>
      </section>

      {/* Metrics Grid */}
      <section>
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl text-[#033135]" style={{ fontFamily: SERIF }}>Health Metrics</h2>
          <p className="mt-1 text-[11px] sm:text-xs text-[#647572]">Your daily wellness measurements</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
          {METRICS.map((metric) => {
            const Icon = metric.icon
            const val = metricValues[metric.key]
            const goal = metricGoals[metric.key]
            const progress = pct(val, goal)
            const reached = val >= goal

            const displayVal = metric.key === 'sleep'
              ? (sleepToday ? sleepToday.durationHours : (sleepInput || '–'))
              : val

            const formatRemaining = () => {
              if (metric.key === 'sleep' && !sleepToday && !sleepInput) return 'Not logged yet'
              const left = Math.max(0, goal - val)
              if (left === 0) return 'Goal reached'
              return `${(Math.round(left * 10) / 10).toLocaleString()} ${metric.unit} to go`
            }

            return (
              <div key={metric.key} className="flex flex-col gap-0">
                <div
                  className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl p-3.5 transition hover:shadow-md sm:rounded-3xl sm:p-5 ${metric.color}`}
                >
                  {/* decorative corner */}
                  <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/30" />

                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`truncate text-xs font-bold sm:text-sm ${metric.iconColor}`}>{metric.title}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[#033135]/60 sm:text-xs">
                        Goal {goal.toLocaleString()} {metric.unit}
                      </p>
                    </div>
                    <div
                      onClick={() => metric.key === 'steps' && setShowStepsInput((v) => !v)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 sm:h-10 sm:w-10 cursor-pointer"
                      title={metric.key === 'steps' ? 'Click to toggle manual step input' : ''}
                    >
                      <Icon size={17} className={metric.iconColor} />
                    </div>
                  </div>

                  <div className="relative mt-3 sm:mt-5 flex items-baseline gap-1 min-w-0">
                    <p
                      className="truncate text-xl sm:text-2xl md:text-3xl leading-none text-[#033135] font-bold"
                      style={{ fontFamily: SERIF }}
                    >
                      {typeof displayVal === 'number' ? displayVal.toLocaleString() : displayVal}
                    </p>
                    <span className="shrink-0 text-[10px] font-semibold text-[#033135]/60 sm:text-xs">
                      {metric.key === 'sleep' && !sleepToday && !sleepInput ? '' : metric.unit}
                    </span>
                  </div>

                  <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-white/60 sm:mt-4">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-[#2F7B58]' : metric.barColor}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="relative mt-2 flex items-center justify-between gap-1 text-[10px] sm:text-xs">
                    <span className={`truncate font-medium ${reached ? 'text-[#2F7B58]' : 'text-[#033135]/70'}`}>
                      {formatRemaining()}
                    </span>
                    <span className={`shrink-0 font-bold ${metric.iconColor}`}>{progress}%</span>
                  </div>

                  {/* ── Active Minutes: Already Added Preview ── */}
                  {metric.key === 'activeMinutes' && (
                    <div className="relative mt-2 min-h-[22px]">
                      {activities.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                          {activities.slice(0, 2).map((act) => (
                            <span
                              key={act.id}
                              className="inline-flex items-center gap-0.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-[#A45E45] shadow-xs"
                              title={`${act.activity}: ${act.durationMinutes}m logged`}
                            >
                              <span>{ACTIVITY_TYPES.find(t => t.label === act.activity)?.emoji || '⚡'}</span>
                              <span className="truncate max-w-[50px]">{act.activity}</span>
                              <span className="text-[#A45E45]/80">{act.durationMinutes}m</span>
                            </span>
                          ))}
                          {activities.length > 2 && (
                            <span className="text-[9px] font-bold text-[#A45E45]/80 self-center">
                              +{activities.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[9px] text-[#033135]/50 italic truncate">
                          No workouts added yet
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Steps Action Bar ── */}
                  {metric.key === 'steps' && (
                    <div className="relative mt-3 flex h-10 items-center justify-between gap-1.5 rounded-xl bg-white/60 p-1.5 sm:mt-4">
                      <button
                        onClick={() => handleAdjustSteps(-500)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#324C4D] shadow-sm transition active:scale-95 hover:bg-white/90"
                        title="-500 steps"
                        aria-label="Subtract 500 steps"
                      >
                        <Minus size={13} />
                      </button>
                      <button
                        onClick={() => setShowStepsInput((v) => !v)}
                        className="flex-1 text-center text-[10px] font-semibold text-[#324C4D] hover:underline truncate px-0.5"
                        title="Click to enter exact steps"
                      >
                        {showStepsInput ? 'Done' : '±500'}
                      </button>
                      <button
                        onClick={() => handleAdjustSteps(500)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#324C4D] text-white shadow-sm transition active:scale-95 hover:bg-[#033135]"
                        title="+500 steps"
                        aria-label="Add 500 steps"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}

                  {/* ── Water Action Bar (Interactive Radar / Slider Control) ── */}
                  {metric.key === 'water' && (
                    <div className="relative mt-3 flex h-10 items-center justify-between gap-1.5 rounded-xl bg-white/60 p-1.5 sm:mt-4">
                      <button
                        onClick={() => handleAdjustWater(-250)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#6B5B95] shadow-sm transition active:scale-95 hover:bg-white/90"
                        title="-250 ml"
                        aria-label="Decrease 250 ml"
                      >
                        <Minus size={13} />
                      </button>
                      <div className="flex-1 px-1 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max={Math.max(goals.waterMl * 1.5, 4000)}
                          step="50"
                          value={waterToday}
                          onChange={(e) => handleSetWater(Number(e.target.value))}
                          className="w-full h-1.5 bg-[#DCD6F7] rounded-lg appearance-none cursor-pointer accent-[#6B5B95]"
                          title={`Slide to adjust water: ${waterToday} ml`}
                        />
                      </div>
                      <button
                        onClick={() => handleAdjustWater(250)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6B5B95] text-white shadow-sm transition active:scale-95 hover:bg-[#524477]"
                        title="+250 ml"
                        aria-label="Add 250 ml"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}

                  {/* ── Sleep Action Bar (Direct Hours Entry & Quick Adjust) ── */}
                  {metric.key === 'sleep' && (
                    <div className="relative mt-3 flex h-10 items-center justify-between gap-1.5 rounded-xl bg-white/60 p-1.5 sm:mt-4">
                      <button
                        onClick={() => handleAdjustSleep(-0.5)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#8B6D25] shadow-sm transition active:scale-95 hover:bg-white/90"
                        title="-0.5 hr"
                        aria-label="Subtract 0.5 hr"
                      >
                        <Minus size={13} />
                      </button>
                      <div className="flex-1 px-1 flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={sleepInput}
                          onChange={(e) => setSleepInput(e.target.value)}
                          onBlur={handleCommitSleepInput}
                          onKeyDown={(e) => e.key === 'Enter' && handleCommitSleepInput()}
                          placeholder="0"
                          className="w-12 text-center rounded bg-white/80 py-0.5 text-xs font-bold text-[#8B6D25] outline-none focus:bg-white"
                          title="Enter hours slept and press Enter"
                        />
                        <span className="text-[10px] text-[#8B6D25] font-semibold">hrs</span>
                      </div>
                      <button
                        onClick={() => handleAdjustSleep(0.5)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#C49A42] text-white shadow-sm transition active:scale-95 hover:bg-[#8B6D25]"
                        title="+0.5 hr"
                        aria-label="Add 0.5 hr"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}

                  {/* ── Active Minutes Action Bar ── */}
                  {metric.key === 'activeMinutes' && (
                    <div className="relative mt-3 flex h-10 items-center justify-center rounded-xl bg-white/60 p-1.5 sm:mt-4">
                      <button
                        onClick={() => setShowActivityModal(true)}
                        className="w-full h-full flex items-center justify-center gap-1 rounded-lg text-[10px] sm:text-xs font-bold text-[#A45E45] hover:bg-white/80 transition active:scale-95"
                      >
                        <Plus size={13} /> Log Workout
                      </button>
                    </div>
                  )}
                </div>

                {/* Steps inline input (below card) */}
                {metric.key === 'steps' && showStepsInput && (
                  <div className="mt-1 flex gap-1.5 rounded-xl bg-[#E4F0EA]/60 p-2">
                    <input
                      type="number"
                      value={stepsInput}
                      min="1"
                      onChange={(e) => setStepsInput(e.target.value)}
                      className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs text-[#033135] outline-none"
                      placeholder="steps"
                    />
                    <button
                      onClick={handleAddSteps}
                      className="rounded-lg bg-[#033135] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#324C4D]"
                    >
                      +
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

        {/* Weekly Activity Chart */}
        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:col-span-2 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#033135]">Weekly Activity</h2>
              <p className="mt-1 text-[10px] sm:text-xs text-[#647572]">Your activity consistency this week</p>
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
              Best day · {bestDay?.day ?? '–'}
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
                const isToday = item.day === todayDayName || item.day.startsWith(todayDayName.slice(0,3))
                const isBest  = item.day === bestDay?.day
                return (
                  <div key={item.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className={`text-[9px] font-semibold sm:text-[11px] ${isBest ? 'text-[#033135]' : 'text-[#9AA6A0]'}`}>
                      {item.overallPct > 0 ? item.overallPct : '–'}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${isBest ? 'bg-[#324C4D]' : 'bg-[#C4D7D4]'}`}
                        style={{ height: `${Math.max(item.overallPct, 4)}%` }}
                      />
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs ${isToday ? 'bg-[#033135] font-semibold text-white' : 'text-[#647572]'}`}>
                      {item.day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Goals Panel */}
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

          <h2 className="mt-3 text-base sm:mt-5 sm:text-lg font-bold">Daily Goal Progress</h2>
          <p className="mt-1 text-xs sm:text-sm text-[#C4D7D4]">Keep moving towards your daily targets.</p>

          <div className="mt-5 space-y-4 sm:mt-7 sm:space-y-5">
            {METRICS.map((metric) => {
              const Icon = metric.icon
              const val = metricValues[metric.key]
              const goal = metricGoals[metric.key]
              const progress = pct(val, goal)
              const goalsKey = metric.key === 'water' ? 'waterMl' : metric.key === 'sleep' ? 'sleepHours' : metric.key

              return (
                <div key={metric.key}>
                  <div className="mb-2 flex items-center justify-between gap-2 text-[10px] sm:text-xs">
                    <span className="flex items-center gap-1.5 text-[#C4D7D4]">
                      <Icon size={13} />
                      {metric.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{progress}%</span>
                      {editingGoal === metric.key ? (
                        <input
                          type="number"
                          value={goalDraft}
                          autoFocus
                          onChange={(e) => setGoalDraft(e.target.value)}
                          onBlur={() => commitGoal(metric.key)}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitGoal(metric.key) }}
                          className="w-16 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => startEditGoal(metric.key, goals[goalsKey])}
                          className="text-[#C4D7D4]/60 hover:text-[#C4D7D4]"
                          aria-label={`Edit ${metric.title} goal`}
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </div>
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
            <h2 className="text-sm sm:text-base font-bold text-[#033135]">Recent Activity</h2>
            <p className="mt-1 text-[10px] sm:text-xs text-[#647572]">Your recently logged activities</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA]">
            <Clock size={18} className="text-[#324C4D]" />
          </div>
        </div>

        {recentLog.length === 0 ? (
          <p className="py-6 text-center text-xs sm:text-sm text-[#647572]">
            No activity logged yet. Start tracking above ↑
          </p>
        ) : (
          <div className="space-y-1 sm:space-y-2">
            {recentLog.map((entry) => {
              const Icon = entry.icon
              const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

              return (
                <div key={entry.id} className="flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-3 transition hover:bg-[#FAFBFA] sm:gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${entry.color}`}>
                    <Icon size={18} className={entry.iconColor} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-semibold text-[#033135]">{entry.label}</p>
                    <p className="mt-1 truncate text-[10px] sm:text-xs text-[#647572]">{entry.detail} · {timeStr}</p>
                  </div>

                  <button
                    onClick={() => handleRemoveLog(entry)}
                    className="shrink-0 rounded-lg p-1.5 text-[#647572]/60 hover:bg-[#FFD9C7]/60 hover:text-[#A45E45] transition"
                    aria-label="Remove entry"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Health Reminder */}
      <section className="flex items-start gap-3 rounded-2xl border border-[#DCD6F7] bg-[#DCD6F7]/40 p-4 sm:p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
          <CheckCircle2 size={19} className="text-[#6B5B95]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#033135]">Consistency over perfection</h3>
          <p className="mt-1 text-xs sm:text-sm leading-5 sm:leading-6 text-[#647572]">
            Your wellness journey is personal. Focus on building habits
            that work for your routine instead of chasing perfect numbers.
          </p>
        </div>
      </section>

      {/* Log Activity Modal */}
      {showActivityModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowActivityModal(false) }}
        >
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#033135]" style={{ fontFamily: SERIF }}>Log Activity</h2>
              <button onClick={() => setShowActivityModal(false)} className="text-[#647572] hover:text-[#033135]">
                <X size={20} />
              </button>
            </div>

            {/* Added Today summary in modal */}
            {activities.length > 0 && (
              <div className="mb-4 rounded-xl bg-[#F7F9F8] p-2.5 border border-[#E8EFEB]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#647572] uppercase">
                    Added Today ({activities.length})
                  </span>
                  <span className="text-[10px] font-bold text-[#033135]">
                    {todayActiveMinutes()} min total
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 border border-[#E8EFEB] text-xs shadow-2xs"
                    >
                      <span>{ACTIVITY_TYPES.find((t) => t.label === act.activity)?.emoji || '⚡'}</span>
                      <span className="font-semibold text-[#033135]">{act.activity}</span>
                      <span className="text-[#647572] text-[10px]">{act.durationMinutes}m</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveActivity(act.id)
                        }}
                        className="ml-0.5 text-[#647572]/60 hover:text-red-500"
                        title="Remove this workout"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mb-2 text-xs text-[#647572] flex items-center justify-between">
              <span>Select activity type</span>
              <span className="text-[10px] text-[#2F7B58] font-medium">Badges show today's logs</span>
            </p>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {ACTIVITY_TYPES.map((a) => {
                const alreadyAdded = activities.filter((act) => act.activity === a.label)
                const totalMins = alreadyAdded.reduce((sum, act) => sum + act.durationMinutes, 0)
                const isSelected = activityType === a.label

                return (
                  <button
                    key={a.label}
                    onClick={() => setActivityType(a.label)}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-[10px] font-semibold transition ${
                      isSelected
                        ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                        : totalMins > 0
                        ? 'border-[#2F7B58]/40 bg-[#E4F0EA]/40 text-[#033135] hover:border-[#2F7B58]'
                        : 'border-transparent bg-[#F5F7F5] text-[#647572] hover:border-[#C4D7D4]'
                    }`}
                  >
                    {totalMins > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1 rounded-full bg-[#2F7B58] px-1 py-0.2 text-[8px] font-bold text-white shadow-xs"
                        title={`${totalMins}m logged today`}
                      >
                        ✓ {totalMins}m
                      </span>
                    )}
                    <span className="text-lg">{a.emoji}</span>
                    <span className="truncate w-full text-center">{a.label}</span>
                  </button>
                )
              })}
            </div>

            <label className="mb-1 block text-xs font-semibold text-[#033135]">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={activityDuration}
              onChange={(e) => setActivityDuration(e.target.value)}
              className="mb-4 w-full rounded-xl border border-[#E8EFEB] px-3 py-2.5 text-sm text-[#033135] outline-none focus:border-[#324C4D]"
              placeholder="e.g. 30"
            />

            <button
              onClick={handleLogActivity}
              className="w-full rounded-xl bg-[#033135] py-2.5 text-sm font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.98]"
            >
              Save Activity
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default Health
