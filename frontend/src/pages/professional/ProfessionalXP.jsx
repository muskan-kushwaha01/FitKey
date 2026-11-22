import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
    Zap,
    Crown,
    Gift,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar,
    Clock,
    Sparkles,
    ShieldCheck,
    Award,
    FileText,
    MessageSquare,
    Filter,
    ChevronRight,
    TrendingUp,
    CheckCircle2,
    Lock,
    ShoppingBag,
    GraduationCap,
    BookOpen,
    Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getProfXPSummary,
    PROF_XP_RULES,
} from '../../services/professional/professionalXpService.js'
import {
    getProfRewardCatalog,
    redeemProfReward,
    getProfRedemptions,
} from '../../services/professional/professionalRewardService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function ProfessionalXP() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { professional } = useOutletContext() || {}

    // Main view tab: 'redeem' (Rewards Store) or 'ledger' (Transaction History)
    const initialTab = searchParams.get('tab') === 'ledger' ? 'ledger' : 'redeem'
    const [activeViewTab, setActiveViewTab] = useState(initialTab)

    // Ledger state
    const [txFilter, setTxFilter] = useState('ALL')
    const [summary, setSummary] = useState({
        availableXP: 0,
        lifetimeXP: 0,
        redeemedXP: 0,
        monthlyXP: 0,
        transactions: [],
    })

    // Rewards store state
    const [rewards, setRewards] = useState([])
    const [redemptions, setRedemptions] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [redeemingId, setRedeemingId] = useState(null)

    const loadData = useCallback(() => {
        if (!professional) return
        const xpSummary = getProfXPSummary(professional.id)
        const catalog = getProfRewardCatalog(professional.id)
        const redList = getProfRedemptions(professional.id)

        setSummary(xpSummary)
        setRewards(catalog)
        setRedemptions(redList)
    }, [professional])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleSwitchTab = (tab) => {
        setActiveViewTab(tab)
        setSearchParams(tab === 'ledger' ? { tab: 'ledger' } : {})
    }

    const handleRedeem = (item) => {
        if (!professional) return

        if (item.isClaimed) {
            toast('You have already claimed this reward benefit.')
            return
        }

        if (!item.canAfford) {
            toast.error(`You need ${item.xpNeeded} more XP to redeem this reward.`)
            return
        }

        setRedeemingId(item.id)
        const res = redeemProfReward(professional.id, item.id)
        setRedeemingId(null)

        if (res.success) {
            toast.success(res.message, { icon: '🎉' })
            loadData() // Refresh balances, transaction records, and catalog immediately
        } else {
            toast.error(res.message || 'Failed to redeem reward.')
        }
    }

    const filteredTransactions = summary.transactions.filter((tx) => {
        if (txFilter === 'ALL') return true
        if (txFilter === 'EARN') return tx.type === 'EARN'
        if (txFilter === 'SPEND') return tx.type === 'SPEND'
        return true
    })

    // Level progression calculation based on lifetime XP
    const lifetime = summary.lifetimeXP
    const levelTiers = [
        { level: 1, min: 0, max: 300 },
        { level: 2, min: 300, max: 700 },
        { level: 3, min: 700, max: 1200 },
        { level: 4, min: 1200, max: 1800 },
        { level: 5, min: 1800, max: 2500 },
        { level: 6, min: 2500, max: 3500 },
        { level: 7, min: 3500, max: 5000 },
    ]

    let currentTier = levelTiers[0]
    for (const tier of levelTiers) {
        if (lifetime >= tier.min) currentTier = tier
    }
    const nextTier = levelTiers.find((t) => t.level === currentTier.level + 1) || currentTier
    const span = nextTier.max - currentTier.min
    const progressInTier = Math.max(0, lifetime - currentTier.min)
    const pct = Math.min(100, Math.round((progressInTier / span) * 100))
    const xpToNext = Math.max(0, nextTier.max - lifetime)

    const categories = ['All', ...new Set(rewards.map((r) => r.category))]
    const filteredRewards = rewards.filter((r) => {
        if (selectedCategory === 'All') return true
        return r.category === selectedCategory
    })

    const affordableCount = rewards.filter((r) => r.canAfford && !r.isClaimed).length

    return (
        <div className="space-y-6 sm:space-y-7">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#647572]">
                        <Zap size={16} className="text-[#8B6D25]" />
                        <span>FITKEY PROFESSIONAL REWARDS &amp; XP</span>
                        <span className="h-1 w-1 rounded-full bg-[#E0AE3A]" />
                        <span className="text-[#2F7B58] font-bold">PRACTICE PERKS</span>
                    </div>
                    <h1
                        className="mt-1 text-3xl font-normal text-[#033135] sm:text-4xl"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        XP &amp; Rewards Store
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Redeem earned XP for certified CME courses, research access, and clinical vouchers.
                    </p>
                </div>

                {/* Primary Mode Switcher (Redeem vs Ledger) */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#E8EFEB] p-1.5 rounded-2xl shadow-xs">
                    <button
                        type="button"
                        onClick={() => handleSwitchTab('redeem')}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                            activeViewTab === 'redeem'
                                ? 'bg-[#033135] text-white shadow-xs'
                                : 'text-[#647572] hover:text-[#033135]'
                        }`}
                    >
                        <Gift size={14} className={activeViewTab === 'redeem' ? 'text-[#F8E7A5]' : ''} />
                        <span>Redeem Rewards</span>
                        {affordableCount > 0 && (
                            <span className="ml-1 rounded-full bg-[#E0AE3A] px-1.5 py-0.2 text-[10px] font-black text-[#033135]">
                                {affordableCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSwitchTab('ledger')}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                            activeViewTab === 'ledger'
                                ? 'bg-[#033135] text-white shadow-xs'
                                : 'text-[#647572] hover:text-[#033135]'
                        }`}
                    >
                        <Zap size={14} />
                        <span>XP Ledger &amp; History</span>
                    </button>
                </div>
            </div>

            {/* 1. Core Financial-Style XP Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Available XP Card with Instant Redeem Button */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-[#E0AE3A]/50 bg-gradient-to-br from-[#F8E7A5]/30 via-white to-white p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-[11px] font-bold text-[#8B6D25] uppercase tracking-wider">
                            Available to Redeem
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8E7A5] text-[#8B6D25]">
                            <Sparkles size={14} />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span
                            className="text-3xl sm:text-4xl font-normal text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.availableXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#8B6D25]">XP</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-[#E8EFEB]">
                        <span className="text-[10px] text-[#2F7B58] font-bold">
                            {affordableCount} reward{affordableCount !== 1 ? 's' : ''} ready
                        </span>
                        <button
                            type="button"
                            onClick={() => handleSwitchTab('redeem')}
                            className="text-[11px] font-extrabold text-[#033135] hover:text-[#648C83] flex items-center gap-0.5"
                        >
                            Redeem now <ChevronRight size={12} />
                        </button>
                    </div>
                </div>

                {/* Lifetime Earned */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs">
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#647572] uppercase tracking-wider">
                        Lifetime Earned
                    </span>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span
                            className="text-3xl sm:text-4xl font-normal text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.lifetimeXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#647572]">XP</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#647572]">
                        Level {currentTier.level} Pro Contributor
                    </p>
                </div>

                {/* Total Redeemed */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs">
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#647572] uppercase tracking-wider">
                        Total Redeemed
                    </span>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span
                            className="text-3xl sm:text-4xl font-normal text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.redeemedXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#A45E45]">XP</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#647572]">
                        {redemptions.length} active benefit{redemptions.length !== 1 ? 's' : ''} claimed
                    </p>
                </div>

                {/* Monthly Earned */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs">
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#647572] uppercase tracking-wider">
                        Earned This Month
                    </span>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span
                            className="text-3xl sm:text-4xl font-normal text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.monthlyXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#2F7B58]">XP</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#647572]">
                        Cap: {PROF_XP_RULES.MONTHLY_EARNING_CAP} XP / mo
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: REDEEM REWARDS CATALOG
               ══════════════════════════════════════════════════════════════════ */}
            {activeViewTab === 'redeem' && (
                <div className="space-y-6">
                    {/* Category Filter Chips */}
                    <div className="flex items-center justify-between gap-3 border-b border-[#E8EFEB] pb-3">
                        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                                        selectedCategory === cat
                                            ? 'bg-[#033135] text-white shadow-xs'
                                            : 'bg-[#FAFBF9] text-[#647572] border border-[#E8EFEB] hover:bg-[#E4F0EA] hover:text-[#033135]'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rewards Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredRewards.map((item) => {
                            const Icon = item.icon
                            const { isClaimed, canAfford, progressPercent, xpNeeded } = item

                            return (
                                <div
                                    key={item.id}
                                    className={`flex flex-col justify-between rounded-3xl border bg-white p-5 sm:p-6 shadow-xs transition hover:shadow-md ${
                                        isClaimed
                                            ? 'border-[#2F7B58]/40 bg-[#FAFBF9]'
                                            : canAfford
                                            ? 'border-[#E0AE3A]/60 ring-1 ring-[#E0AE3A]/30'
                                            : 'border-[#E8EFEB]'
                                    }`}
                                >
                                    <div>
                                        {/* Header badge & icon */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color} ${item.iconColor} shadow-2xs`}>
                                                <Icon size={24} />
                                            </div>
                                            <span className="rounded-full bg-[#FAFBF9] border border-[#E8EFEB] px-2.5 py-0.5 text-[10px] font-bold text-[#647572]">
                                                {item.badge}
                                            </span>
                                        </div>

                                        <span className="mt-4 inline-block text-[10px] font-bold uppercase tracking-wider text-[#8B6D25]">
                                            {item.category}
                                        </span>

                                        <h3 className="mt-0.5 text-base font-bold text-[#033135] leading-snug">
                                            {item.title}
                                        </h3>

                                        <p className="mt-2 text-xs text-[#647572] leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    {/* Cost, Progress & Action */}
                                    <div className="mt-5 pt-4 border-t border-[#E8EFEB] space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-[#647572]">XP Required:</span>
                                            <div className="flex items-center gap-1 font-black text-[#033135]">
                                                <Zap size={14} className="text-[#8B6D25]" fill="currentColor" />
                                                <span>{item.points} XP</span>
                                            </div>
                                        </div>

                                        {/* Progress track */}
                                        <div className="space-y-1">
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8EFEB]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        isClaimed
                                                            ? 'bg-[#2F7B58]'
                                                            : canAfford
                                                            ? 'bg-[#2F7B58]'
                                                            : 'bg-[#E0AE3A]'
                                                    }`}
                                                    style={{ width: `${isClaimed ? 100 : progressPercent}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] font-semibold text-[#9AA6A0]">
                                                <span>{isClaimed ? 'Benefit Unlocked' : canAfford ? '✓ Ready to claim' : `${xpNeeded} XP to unlock`}</span>
                                                <span>{isClaimed ? 'Claimed' : `${progressPercent}%`}</span>
                                            </div>
                                        </div>

                                        {/* Redeem Button */}
                                        <button
                                            type="button"
                                            disabled={!canAfford || isClaimed || redeemingId === item.id}
                                            onClick={() => handleRedeem(item)}
                                            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition active:scale-[0.99] shadow-xs ${
                                                isClaimed
                                                    ? 'bg-[#E4F0EA] text-[#2F7B58] cursor-default'
                                                    : canAfford
                                                    ? 'bg-[#033135] text-white hover:bg-[#324C4D]'
                                                    : 'bg-[#F0F4F2] text-[#9AA6A0] cursor-not-allowed'
                                            }`}
                                        >
                                            {isClaimed ? (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    <span>Claimed Benefit</span>
                                                </>
                                            ) : canAfford ? (
                                                <>
                                                    <ShoppingBag size={16} className="text-[#F8E7A5]" />
                                                    <span>Redeem for {item.points} XP</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock size={15} />
                                                    <span>Need {xpNeeded} More XP</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Active Redeemed Benefits History on this tab */}
                    {redemptions.length > 0 && (
                        <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                                <h3 className="text-sm font-bold text-[#033135] flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-[#2F7B58]" />
                                    <span>Your Redeemed Practice Benefits ({redemptions.length})</span>
                                </h3>
                                <span className="text-[11px] text-[#2F7B58] font-bold">Active Benefits</span>
                            </div>

                            <div className="space-y-2">
                                {redemptions.map((red) => (
                                    <div
                                        key={red.id}
                                        className="flex items-center justify-between rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E4F0EA] text-[#2F7B58]">
                                                <GraduationCap size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#033135]">{red.title}</p>
                                                <p className="text-[10px] text-[#647572]">
                                                    {red.category} • Claimed on {new Date(red.redeemedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-black text-[#A45E45] bg-[#FFD9C7]/40 px-2.5 py-1 rounded-lg">
                                            -{red.points} XP
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: XP LEDGER & TRANSACTION HISTORY
               ══════════════════════════════════════════════════════════════════ */}
            {activeViewTab === 'ledger' && (
                <div className="space-y-6">
                    {/* Level Progression Banner */}
                    <div className="rounded-3xl bg-gradient-to-r from-[#033135] to-[#324C4D] p-5 sm:p-6 text-white shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8E7A5] text-[#033135] shadow-xs">
                                    <Crown size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-white">
                                            Level {currentTier.level} Professional Contributor
                                        </h3>
                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-[#F8E7A5]">
                                            Active Tier
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#C4D7D4]">
                                        {xpToNext > 0
                                            ? `${xpToNext} XP to reach Level ${nextTier.level} Senior Contributor`
                                            : 'Master Level Achieved'}
                                    </p>
                                </div>
                            </div>

                            <span className="text-xs font-bold text-[#F8E7A5]">
                                {pct}% to Level {nextTier.level}
                            </span>
                        </div>

                        {/* Track */}
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div
                                className="h-full bg-[#F8E7A5] rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>

                    {/* Transaction History Section */}
                    <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        {/* Section Header & Filter Tabs */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E8EFEB]">
                            <div>
                                <h2 className="text-base font-extrabold text-[#033135]">
                                    XP Transaction History
                                </h2>
                                <p className="text-xs text-[#647572]">
                                    Accredited transaction records with dates, source categories, and audit trail.
                                </p>
                            </div>

                            {/* Filter buttons */}
                            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#F0F4F2] p-1 rounded-xl">
                                {[
                                    { id: 'ALL', label: 'All Transactions' },
                                    { id: 'EARN', label: 'Earned' },
                                    { id: 'SPEND', label: 'Redeemed' },
                                ].map((btn) => (
                                    <button
                                        key={btn.id}
                                        type="button"
                                        onClick={() => setTxFilter(btn.id)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                            txFilter === btn.id
                                                ? 'bg-white text-[#033135] shadow-xs'
                                                : 'text-[#647572] hover:text-[#033135]'
                                        }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transactions List */}
                        <div className="mt-4 divide-y divide-[#F0F4F2]">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => {
                                    const isEarn = tx.type === 'EARN'
                                    const dateStr = new Date(tx.timestamp).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })

                                    return (
                                        <div
                                            key={tx.id}
                                            className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1"
                                        >
                                            <div className="flex items-start gap-3 min-w-0 pr-3">
                                                <div
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                                        isEarn
                                                            ? 'bg-[#E4F0EA] text-[#2F7B58]'
                                                            : 'bg-[#FFD9C7] text-[#C0563B]'
                                                    }`}
                                                >
                                                    {isEarn ? (
                                                        <ArrowUpRight size={17} />
                                                    ) : (
                                                        <ArrowDownLeft size={17} />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="text-xs sm:text-sm font-bold text-[#033135] truncate">
                                                        {tx.description}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#647572]">
                                                        <span className="rounded-md bg-[#FAFBF9] border border-[#E8EFEB] px-1.5 py-0.2 text-[10px] font-semibold text-[#647572]">
                                                            {tx.source.replace(/_/g, ' ')}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{dateStr}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span
                                                    className={`text-sm sm:text-base font-black ${
                                                        isEarn ? 'text-[#2F7B58]' : 'text-[#C0563B]'
                                                    }`}
                                                >
                                                    {isEarn ? '+' : '-'}{tx.amount} XP
                                                </span>
                                                <p className="text-[10px] text-[#9AA6A0] font-medium">
                                                    {isEarn ? 'Credited' : 'Debited'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="py-8 text-center text-xs text-[#9AA6A0]">
                                    No {txFilter.toLowerCase()} transactions found for this account.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

export default ProfessionalXP
