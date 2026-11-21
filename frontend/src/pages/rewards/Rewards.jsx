import { useState } from 'react'
import {
    Trophy, Flame, Footprints, Droplets, Moon, Gift, Crown,
    Zap, CheckCircle2, Lock, Gem, Ticket, Sparkles, Medal, ChevronUp, ChevronDown, Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const USER_XP = 950

const challenges = [
    { title: 'Hydration Hero', description: 'Complete your daily water goal.', detail: '1.5 / 2.5 L', reward: 50, progress: 60, icon: Droplets, color: 'bg-[#DCD6F7]', iconColor: 'text-[#6B5B95]' },
    { title: 'Step Master', description: 'Reach 8,000 steps today.', detail: '6,240 / 8,000 steps', reward: 75, progress: 78, icon: Footprints, color: 'bg-[#E4F0EA]', iconColor: 'text-[#324C4D]' },
    { title: 'Sleep Champion', description: 'Complete your sleep goal.', detail: '8 / 8 hrs', reward: 100, progress: 100, icon: Moon, color: 'bg-[#FFD9C7]', iconColor: 'text-[#A45E45]' },
]

const achievements = [
    { title: 'First Step', description: 'Complete your first wellness activity.', icon: Footprints, unlocked: true, color: 'bg-[#E4F0EA]', iconColor: 'text-[#324C4D]', rarity: 'Common', progress: 1, goal: 1, unit: 'activity' },
    { title: 'Hydration Hero', description: 'Complete your water goal.', icon: Droplets, unlocked: true, color: 'bg-[#DCD6F7]', iconColor: 'text-[#6B5B95]', rarity: 'Rare', progress: 1, goal: 1, unit: 'goal' },
    { title: '7 Day Streak', description: 'Stay consistent for seven days.', icon: Flame, unlocked: false, color: 'bg-[#FFD9C7]', iconColor: 'text-[#A45E45]', rarity: 'Epic', progress: 5, goal: 7, unit: 'days' },
    { title: 'Wellness Champion', description: 'Complete ten challenges.', icon: Crown, unlocked: false, color: 'bg-[#F8E7A5]', iconColor: 'text-[#8B6D25]', rarity: 'Legendary', progress: 7, goal: 10, unit: 'challenges' },
]

const leaderboard = [
    { name: 'Aarav', xp: 1250, rank: 1, initials: 'A', trend: 'same', streak: 12 },
    { name: 'Priya', xp: 1120, rank: 2, initials: 'P', trend: 'up', streak: 9 },
    { name: 'You', xp: 950, rank: 3, initials: 'U', current: true, trend: 'up', streak: 5 },
    { name: 'Riya', xp: 870, rank: 4, initials: 'R', trend: 'down', streak: 7 },
    { name: 'Kabir', xp: 760, rank: 5, initials: 'K', trend: 'same', streak: 3 },
]

const rewardItems = [
    { title: 'Fitness Store Voucher', description: 'Save on selected fitness products.', points: 500, icon: Ticket, color: 'bg-[#FFD9C7]', iconColor: 'text-[#A45E45]', category: 'Shopping' },
    { title: 'Wellness Starter Kit', description: 'A curated collection of wellness essentials.', points: 800, icon: Gift, color: 'bg-[#DCD6F7]', iconColor: 'text-[#6B5B95]', category: 'Exclusive' },
    { title: 'FitKey Elite Badge', description: 'Show off your wellness achievements.', points: 300, icon: Gem, color: 'bg-[#F8E7A5]', iconColor: 'text-[#8B6D25]', category: 'Digital' },
]

const summary = [
    { label: 'Missions done', value: '12' },
    { label: 'Badges earned', value: '8' },
    { label: 'Day streak', value: '5' },
    { label: 'Lifetime XP', value: '2.4K' },
]

const tabs = ['Missions', 'Badges', 'Leaderboard', 'Reward Store']

const rarityStyle = {
    Common: 'bg-[#E4F0EA] text-[#324C4D]',
    Rare: 'bg-[#DCD6F7] text-[#625780]',
    Epic: 'bg-[#FFD9C7] text-[#A45E45]',
    Legendary: 'bg-[#F8E7A5] text-[#8B6D25]',
}

const badgeFilters = ['All', 'Unlocked', 'Locked']

function Rewards() {
    const [activeTab, setActiveTab] = useState('Missions')
    const [claimed, setClaimed] = useState([])
    const [badgeFilter, setBadgeFilter] = useState('All')

    const handleReward = (item) => {
        if (claimed.includes(item.title)) {
            toast('You have already claimed this reward.')
            return
        }
        toast.success('Reward redemption will be connected later!')
        setClaimed((current) => [...current, item.title])
    }

    const gapToNext = leaderboard[1].xp - USER_XP

    const doneCount = challenges.filter((c) => c.progress === 100).length
    const xpEarnedToday = challenges.filter((c) => c.progress === 100).reduce((sum, c) => sum + c.reward, 0)
    const xpAvailableToday = challenges.reduce((sum, c) => sum + c.reward, 0)
    const BONUS_XP = 50

    const nextBadge = [...achievements]
        .filter((a) => !a.unlocked)
        .sort((a, b) => b.progress / b.goal - a.progress / a.goal)[0]
    const visibleBadges = achievements.filter((a) =>
        badgeFilter === 'All' ? true : badgeFilter === 'Unlocked' ? a.unlocked : !a.unlocked
    )
    const maxXp = Math.max(...leaderboard.map((p) => p.xp))

    return (
        <div className="space-y-5 sm:space-y-7">

            {/* Page Heading */}
            <section>
                <div className="mb-1.5 flex items-center gap-2 text-xs sm:text-sm text-[#647572]">
                    <Trophy size={16} />
                    YOUR REWARDS ZONE
                </div>

                <h1
                    className="text-3xl sm:text-4xl text-[#033135]"
                    style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                >
                    Rewards
                </h1>

                <p className="mt-1.5 text-xs sm:text-sm text-[#647572]">
                    Every healthy habit takes you one step closer.
                </p>
            </section>

            {/* XP wallet */}
            <section className="overflow-hidden rounded-2xl bg-[#F8E7A5]/70 sm:rounded-3xl">
                <div className="p-4 sm:p-7">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-[#8B6D25]">XP balance</p>
                            <div className="mt-1 flex items-end gap-2">
                                <span className="text-4xl sm:text-5xl text-[#033135]" style={{ fontFamily: SERIF }}>{USER_XP}</span>
                                <span className="mb-1.5 text-xs sm:text-sm font-semibold text-[#8B6D25]">XP</span>
                            </div>
                        </div>

                        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#033135] sm:text-sm">
                            <Crown size={15} className="text-[#8B6D25]" />
                            Level 4
                        </span>
                    </div>

                    <div className="mt-5 flex gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 flex-1 rounded-full ${i < 8 ? 'bg-[#033135]' : 'bg-white/70'}`}
                            />
                        ))}
                    </div>

                    <p className="mt-2 text-[10px] sm:text-xs text-[#8B6D25]">
                        250 XP to reach Level 5
                    </p>
                </div>

                <div className="grid grid-cols-4 divide-x divide-[#033135]/10 border-t border-[#033135]/10 bg-white/40">
                    {summary.map((item) => (
                        <div key={item.label} className="px-1 py-3 text-center sm:py-4">
                            <p className="text-base sm:text-xl font-bold text-[#033135]">{item.value}</p>
                            <p className="mt-0.5 text-[9px] sm:text-xs leading-tight text-[#647572]">{item.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Underline tabs */}
            <nav className="-mb--1 flex gap-5 overflow-x-auto border-b border-[#E8EFEB] sm:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 text-xs font-semibold transition sm:text-sm ${activeTab === tab
                            ? 'border-[#033135] text-[#033135]'
                            : 'border-transparent text-[#647572] hover:text-[#033135]'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            {/* Missions */}
            {activeTab === 'Missions' && (
                <section className="space-y-3">

                    {/* Daily progress summary */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E4F0EA] to-[#F8E7A5]/70 p-4 sm:rounded-3xl sm:p-5">
                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-white/40" />
                        <div className="relative flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-[#324C4D] sm:text-xs">Today's missions</p>
                                <h2 className="text-2xl font-black text-[#033135] sm:text-3xl">
                                    {doneCount}<span className="text-base font-bold text-[#647572]"> / {challenges.length} done</span>
                                </h2>
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#8B6D25] sm:text-xs">
                                    <Zap size={12} fill="currentColor" />
                                    {xpEarnedToday} of {xpAvailableToday} XP earned
                                </p>
                            </div>

                            <div className="flex shrink-0 gap-1.5">
                                {challenges.map((c) => (
                                    <div
                                        key={c.title}
                                        className={`flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10 ${c.progress === 100
                                            ? 'bg-[#2F7B58] text-white'
                                            : 'border-2 border-dashed border-[#324C4D]/30 bg-white/60 text-[#647572]'
                                            }`}
                                    >
                                        {c.progress === 100 ? <CheckCircle2 size={17} /> : <c.icon size={16} />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative mt-4 flex gap-1.5">
                            {challenges.map((c) => (
                                <div key={c.title} className="h-2 flex-1 overflow-hidden rounded-full bg-white/70">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${c.progress === 100 ? 'bg-[#2F7B58]' : 'bg-[#324C4D]'}`}
                                        style={{ width: `${c.progress}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mission cards */}
                    <div className="space-y-2.5 sm:space-y-3">
                        {challenges.map((c) => {
                            const Icon = c.icon
                            const done = c.progress === 100
                            const size = 60
                            const r = 25
                            const circ = 2 * Math.PI * r
                            return (
                                <div
                                    key={c.title}
                                    className={`flex items-center gap-3 rounded-2xl border p-3 transition sm:gap-4 sm:rounded-3xl sm:p-4 ${done
                                        ? 'border-[#2F7B58]/20 bg-[#E4F0EA]/60'
                                        : 'border-[#E8EFEB] bg-white hover:shadow-md'
                                        }`}
                                >
                                    {/* ring with icon */}
                                    <div className="relative shrink-0" style={{ width: size, height: size }}>
                                        <svg width={size} height={size} className="-rotate-90">
                                            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0F3F0" strokeWidth="5" />
                                            <circle
                                                cx={size / 2} cy={size / 2} r={r} fill="none"
                                                stroke={done ? '#2F7B58' : '#324C4D'} strokeWidth="5" strokeLinecap="round"
                                                strokeDasharray={circ}
                                                strokeDashoffset={circ * (1 - c.progress / 100)}
                                                className="transition-all duration-700"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.color}`}>
                                                <Icon size={19} className={c.iconColor} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* text */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="truncate text-sm font-extrabold text-[#033135]">{c.title}</p>
                                            {done && <CheckCircle2 size={15} className="shrink-0 text-[#2F7B58]" />}
                                        </div>
                                        <p className="mt-0.5 text-[11px] leading-4 text-[#647572] sm:text-xs">{c.description}</p>
                                        <p className="mt-1.5 text-[11px] font-bold text-[#324C4D]">
                                            {c.detail}
                                            <span className="ml-1.5 font-semibold text-[#647572]">
                                                · {done ? 'Completed' : `${c.progress}%`}
                                            </span>
                                        </p>
                                    </div>

                                    {/* reward */}
                                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${done
                                            ? 'bg-[#2F7B58] text-white'
                                            : 'bg-[#F8E7A5]/70 text-[#8B6D25]'
                                            }`}>
                                            <Zap size={12} fill="currentColor" />
                                            {done ? 'Earned ' : '+'}{c.reward}
                                        </span>
                                        <span className={`text-[10px] font-semibold ${done ? 'text-[#2F7B58]' : 'text-[#647572]'}`}>
                                            {done ? 'XP added' : 'In progress'}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Daily bonus */}
                    <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#A47A27]/40 bg-[#F8E7A5]/30 p-3 sm:rounded-3xl sm:p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8E7A5]">
                            <Gift size={22} className="text-[#8B6D25]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-[#033135]">Daily bonus</p>
                            <p className="text-[11px] text-[#647572] sm:text-xs">
                                Finish all {challenges.length} missions to earn an extra +{BONUS_XP} XP.
                            </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#8B6D25]">
                            <Lock size={11} />
                            +{BONUS_XP}
                        </span>
                    </div>
                </section>
            )}

            {/* Badges */}
            {activeTab === 'Badges' && (
                <section className="space-y-3">

                    {/* Collection summary */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#DCD6F7] to-[#E4F0EA] p-4 sm:rounded-3xl sm:p-5">
                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[18px] border-white/40" />
                        <div className="relative flex items-center gap-4">
                            <div className="relative h-[72px] w-[72px] shrink-0">
                                <svg width="72" height="72" className="-rotate-90">
                                    <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="7" />
                                    <circle
                                        cx="36" cy="36" r="30" fill="none" stroke="#6B5B95" strokeWidth="7" strokeLinecap="round"
                                        strokeDasharray={2 * Math.PI * 30}
                                        strokeDashoffset={2 * Math.PI * 30 * (1 - 0.4)}
                                        className="transition-all duration-700"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Medal size={24} className="text-[#6B5B95]" />
                                </div>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-[#625780] sm:text-xs">Your collection</p>
                                <h2 className="text-xl font-black text-[#033135] sm:text-2xl">
                                    8 <span className="text-sm font-bold text-[#625780]">of 20 badges</span>
                                </h2>
                                <p className="mt-0.5 text-[11px] text-[#625780] sm:text-xs">40% complete · 12 more to go</p>
                            </div>
                        </div>
                    </div>

                    {/* Next badge to unlock */}
                    {nextBadge && (
                        <div className="flex items-center gap-3 rounded-2xl border border-[#E8EFEB] bg-white p-3 sm:gap-4 sm:rounded-3xl sm:p-4">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${nextBadge.color}`}>
                                <nextBadge.icon size={24} className={nextBadge.iconColor} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8B6D25]">
                                    <Sparkles size={11} />
                                    Almost there
                                </p>
                                <p className="truncate text-sm font-extrabold text-[#033135]">{nextBadge.title}</p>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0F3F0]">
                                    <div
                                        className="h-full rounded-full bg-[#A47A27] transition-all duration-700"
                                        style={{ width: `${Math.round((nextBadge.progress / nextBadge.goal) * 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-base font-black text-[#033135]">
                                    {nextBadge.progress}<span className="text-xs font-semibold text-[#647572]">/{nextBadge.goal}</span>
                                </p>
                                <p className="text-[10px] font-semibold text-[#647572]">{nextBadge.unit}</p>
                            </div>
                        </div>
                    )}

                    {/* Filter chips */}
                    <div className="flex gap-2">
                        {badgeFilters.map((f) => (
                            <button
                                key={f}
                                onClick={() => setBadgeFilter(f)}
                                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${badgeFilter === f
                                    ? 'bg-[#033135] text-white'
                                    : 'bg-[#F0F3F0] text-[#647572] hover:bg-[#E4F0EA]'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Badge cards */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {visibleBadges.map((a) => {
                            const Icon = a.icon
                            const pct = Math.round((a.progress / a.goal) * 100)
                            return (
                                <div
                                    key={a.title}
                                    className={`relative flex min-w-0 flex-col items-center overflow-hidden rounded-2xl border p-4 text-center transition sm:rounded-3xl ${a.unlocked
                                        ? 'border-[#E8EFEB] bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                                        : 'border-dashed border-[#DCE6E1] bg-[#F7F9F8]'
                                        }`}
                                >
                                    {a.unlocked && (
                                        <span className={`pointer-events-none absolute -top-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full opacity-60 blur-2xl ${a.color}`} />
                                    )}

                                    <span className={`relative rounded-full px-2.5 py-0.5 text-[10px] font-bold ${rarityStyle[a.rarity]}`}>
                                        {a.rarity}
                                    </span>

                                    <div className="relative mt-3">
                                        <div
                                            className={`flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${a.unlocked
                                                ? `${a.color} ring-4 ring-white shadow-md`
                                                : 'bg-[#EAEEEB]'
                                                }`}
                                        >
                                            <Icon size={28} className={a.unlocked ? a.iconColor : 'text-[#B5BFBA]'} />
                                        </div>
                                        {a.unlocked ? (
                                            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#2F7B58] ring-2 ring-white">
                                                <CheckCircle2 size={14} className="text-white" />
                                            </span>
                                        ) : (
                                            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-[#F7F9F8]">
                                                <Lock size={12} className="text-[#9AA6A0]" />
                                            </span>
                                        )}
                                    </div>

                                    <p className={`relative mt-3 text-sm font-extrabold ${a.unlocked ? 'text-[#033135]' : 'text-[#647572]'}`}>
                                        {a.title}
                                    </p>
                                    <p className="relative mt-1 text-[11px] leading-4 text-[#647572]">{a.description}</p>

                                    <div className="relative mt-3 w-full">
                                        {a.unlocked ? (
                                            <p className="rounded-full bg-[#E4F0EA] py-1 text-[11px] font-bold text-[#2F7B58]">Unlocked</p>
                                        ) : (
                                            <>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-[#E3E7E3]">
                                                    <div className="h-full rounded-full bg-[#A47A27]" style={{ width: `${pct}%` }} />
                                                </div>
                                                <p className="mt-1.5 text-[11px] font-semibold text-[#647572]">
                                                    {a.progress}/{a.goal} {a.unit}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {visibleBadges.length === 0 && (
                        <p className="py-6 text-center text-xs text-[#647572]">No badges here yet.</p>
                    )}
                </section>
            )}

            {/* Leaderboard */}
            {activeTab === 'Leaderboard' && (
                <section className="space-y-3">

                    <div className="flex items-baseline justify-between gap-3">
                        <h2 className="text-lg sm:text-xl text-[#033135]" style={{ fontFamily: SERIF }}>Weekly leaderboard</h2>
                        <p className="flex items-center gap-1 text-[10px] sm:text-xs text-[#647572]">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2F7B58]" />
                            Resets in 3 days
                        </p>
                    </div>

                    {/* Your standing */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#F8E7A5] to-[#FFD9C7] p-4 sm:rounded-3xl sm:p-5">
                        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[16px] border-white/30" />
                        <div className="relative flex items-center gap-3 sm:gap-4">
                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#033135] text-white sm:h-16 sm:w-16">
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#F8E7A5]">Rank</span>
                                <span className="text-2xl font-black leading-none">#3</span>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold text-[#033135] sm:text-base">You're on the podium!</p>
                                <p className="mt-0.5 text-[11px] text-[#755347] sm:text-xs">
                                    Only <span className="font-black text-[#033135]">{gapToNext} XP</span> to overtake {leaderboard[1].name}
                                </p>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/60">
                                    <div
                                        className="h-full rounded-full bg-[#033135] transition-all duration-700"
                                        style={{ width: `${Math.round((USER_XP / leaderboard[1].xp) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="flex items-center justify-end gap-0.5 text-lg font-black text-[#033135] sm:text-xl">
                                    <Zap size={15} fill="currentColor" className="text-[#A47A27]" />
                                    {USER_XP}
                                </p>
                                <p className="text-[10px] font-semibold text-[#755347]">XP this week</p>
                            </div>
                        </div>
                    </div>

                    {/* Podium */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#033135] to-[#324C4D] px-3 pt-5 text-white sm:rounded-3xl sm:px-6 sm:pt-6">
                        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[22px] border-white/5" />
                        <div className="absolute -left-10 bottom-10 h-28 w-28 rounded-full border-[14px] border-white/5" />

                        <div className="relative flex items-center gap-2">
                            <Trophy size={18} className="shrink-0 text-[#F8E7A5]" />
                            <div>
                                <h3 className="text-base font-black leading-tight">The XP champions</h3>
                                <p className="text-[11px] text-[#C4D7D4]">This week's top 3 players</p>
                            </div>
                        </div>

                        <div className="relative mt-6 flex items-end justify-center gap-2 sm:gap-4">
                            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((p) => {
                                const first = p.rank === 1
                                const bg = first ? '#F8E7A5' : p.rank === 2 ? '#DCD6F7' : '#FFD9C7'
                                return (
                                    <div key={p.name} className="min-w-0 max-w-[110px] flex-1 text-center">
                                        {first && <Crown size={22} className="mx-auto mb-1 text-[#F8E7A5]" fill="currentColor" />}

                                        <div className="relative mx-auto w-fit">
                                            <div
                                                className={`flex items-center justify-center rounded-full font-black text-[#033135] ${first ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base'
                                                    } ${p.current ? 'ring-4 ring-[#F8E7A5] ring-offset-2 ring-offset-[#033135]' : ''}`}
                                                style={{ background: bg }}
                                            >
                                                {p.initials}
                                            </div>
                                            {p.current && (
                                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#F8E7A5] px-2 py-0.5 text-[9px] font-black text-[#033135] shadow">
                                                    YOU
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-3 truncate text-xs font-bold">{p.name}</p>
                                        <p className="whitespace-nowrap text-[11px] text-[#C4D7D4]">{p.xp.toLocaleString()} XP</p>

                                        <div
                                            className={`mt-2 flex items-start justify-center rounded-t-2xl pt-2 text-xl font-black text-[#033135] ${first ? 'h-24' : p.rank === 2 ? 'h-16' : 'h-12'
                                                }`}
                                            style={{ background: bg }}
                                        >
                                            {p.rank}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Full ranking */}
                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-2 sm:rounded-3xl sm:p-4">
                        <div className="mb-1 flex items-center justify-between px-2 pt-1">
                            <h3 className="text-sm font-extrabold text-[#033135]">Full ranking</h3>
                            <span className="text-[11px] text-[#647572]">Top 5 this week</span>
                        </div>

                        <div className="space-y-1.5">
                            {leaderboard.map((p) => {
                                const rankBg = p.rank === 1 ? 'bg-[#F8E7A5]' : p.rank === 2 ? 'bg-[#DCD6F7]' : p.rank === 3 ? 'bg-[#FFD9C7]' : 'bg-[#F0F3F0]'
                                return (
                                    <div
                                        key={p.name}
                                        className={`relative flex min-w-0 items-center gap-2.5 rounded-2xl px-2.5 py-3 transition sm:gap-3 sm:px-3 ${p.current
                                            ? 'bg-[#F8E7A5]/50 ring-2 ring-[#A47A27]/60 shadow-md'
                                            : 'hover:bg-[#FAFBFA]'
                                            }`}
                                    >
                                        {p.current && (
                                            <span className="absolute -left-px top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#A47A27]" />
                                        )}

                                        <span className="w-5 shrink-0 text-center text-sm font-black text-[#647572]">
                                            {p.rank}
                                        </span>

                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-[#033135] ${rankBg}`}>
                                            {p.initials}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className="truncate text-sm font-bold text-[#033135]">{p.name}</p>
                                                {p.current && (
                                                    <span className="shrink-0 rounded-full bg-[#033135] px-2 py-0.5 text-[9px] font-black text-[#F8E7A5]">
                                                        YOU
                                                    </span>
                                                )}
                                                <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[#A45E45] sm:text-[11px]">
                                                    <Flame size={11} fill="#F97316" className="text-[#F97316]" />
                                                    {p.streak}
                                                </span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0F3F0]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${p.current ? 'bg-[#A47A27]' : 'bg-[#324C4D]'}`}
                                                    style={{ width: `${(p.xp / maxXp) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-black text-[#033135]">
                                                {p.xp.toLocaleString()} <span className="text-[10px] font-semibold text-[#647572]">XP</span>
                                            </p>
                                            <p className={`mt-0.5 flex items-center justify-end text-[10px] font-bold ${p.trend === 'up' ? 'text-[#2F7B58]' : p.trend === 'down' ? 'text-[#C0563B]' : 'text-[#9AA6A0]'
                                                }`}>
                                                {p.trend === 'up' && <ChevronUp size={13} />}
                                                {p.trend === 'down' && <ChevronDown size={13} />}
                                                {p.trend === 'same' && <Minus size={12} />}
                                                {p.trend === 'up' ? 'Rising' : p.trend === 'down' ? 'Falling' : 'Steady'}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <p className="mt-3 px-2 text-[11px] text-[#647572]">
                            Complete today's missions to climb higher. Demo profiles shown.
                        </p>
                    </div>
                </section>
            )}

            {/* Reward Store */}
            {activeTab === 'Reward Store' && (
                <section>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2 className="text-lg sm:text-xl text-[#033135]" style={{ fontFamily: SERIF }}>Reward store</h2>
                        <p className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-[#8B6D25]">
                            <Zap size={12} />
                            {USER_XP} XP to spend
                        </p>
                    </div>

                    <div className="space-y-3">
                        {rewardItems.map((item) => {
                            const Icon = item.icon
                            const isClaimed = claimed.includes(item.title)
                            const canAfford = USER_XP >= item.points
                            const pct = Math.min(100, Math.round((USER_XP / item.points) * 100))

                            return (
                                <div key={item.title} className="flex bg-white border border-[#E8EFEB] rounded-3xl overflow-hidden">
                                    {/* ticket stub */}
                                    <div
                                        className={`w-20 sm:w-32 shrink-0 flex flex-col items-center justify-center gap-2 px-1 border-r-2 border-dashed border-white ${item.color}`}
                                    >
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/60 flex items-center justify-center">
                                            <Icon size={22} className="text-[#033135]" />
                                        </div>
                                        <span className="text-[10px] sm:text-[11px] font-bold text-[#033135]/70 text-center">{item.category}</span>
                                    </div>

                                    <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-extrabold text-sm text-[#033135] leading-snug">{item.title}</h3>
                                                <p className="sm:hidden flex items-center gap-0.5 text-sm font-black text-[#A47A27] shrink-0">
                                                    <Zap size={13} fill="currentColor" />{item.points}
                                                </p>
                                            </div>
                                            <p className="text-xs text-[#647572] mt-0.5 leading-5">{item.description}</p>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5">
                                                <div className="h-1.5 w-20 sm:w-32 rounded-full bg-[#F0F3F0] overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${canAfford ? 'bg-[#2F7B58]' : 'bg-[#C49A42]'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-semibold text-[#647572]">
                                                    {canAfford ? 'Ready to unlock' : `${item.points - USER_XP} XP to go`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-stretch sm:items-end gap-2">
                                            <p className="hidden sm:flex items-center gap-1 text-base font-black text-[#A47A27]">
                                                <Zap size={15} fill="currentColor" />
                                                {item.points}
                                            </p>
                                            <button
                                                disabled={!canAfford || isClaimed}
                                                onClick={() => handleReward(item)}
                                                className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${isClaimed
                                                    ? 'bg-[#E4F0EA] text-[#324C4D]'
                                                    : canAfford
                                                        ? 'bg-[#033135] text-white hover:bg-[#324C4D]'
                                                        : 'bg-[#EFF2EF] text-[#9AA6A0]'
                                                    }`}
                                            >
                                                {isClaimed ? 'Claimed' : canAfford ? 'Unlock reward' : 'Not enough XP'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Closing note */}
            <div className="flex items-center justify-center gap-2 text-center text-[11px] sm:text-xs text-[#647572]">
                <Sparkles size={14} className="shrink-0 text-[#8B6D25]" />
                Progress isn't about perfection. Every small step counts.
            </div>

            <p className="text-center text-[10px] text-[#647572]">
                FitKey prototype · XP, rankings and rewards are demonstration data.
            </p>
        </div>
    )
}

export default Rewards