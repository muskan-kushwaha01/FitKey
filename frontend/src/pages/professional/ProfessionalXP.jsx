import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import {
    Zap,
    Crown,
    Gift,
    ArrowUpRight,
    ArrowDownLeft,
    Sparkles,
    CheckCircle2,
    Lock,
    ShoppingBag,
    GraduationCap,
    Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getProfXPSummaryAsync,
    PROF_XP_RULES,
} from '../../services/professional/professionalXpService.js'
import {
    getProfRewardCatalog,
    redeemProfReward,
    getProfRedemptions,
} from '../../services/professional/professionalRewardService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function ProfessionalXP() {
    const [searchParams, setSearchParams] = useSearchParams()
    const { professional } = useOutletContext() || {}

    // Tab state: 'redeem' | 'ledger'
    const initialTab = searchParams.get('tab') === 'ledger' ? 'ledger' : 'redeem'
    const [activeTab, setActiveTab] = useState(initialTab)

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

    const loadData = useCallback(async () => {
        if (!professional?.id) return
        const [xpSummary, catalog, redList] = await Promise.all([
            getProfXPSummaryAsync(professional.id),
            getProfRewardCatalog(professional.id),
            getProfRedemptions(professional.id),
        ])

        setSummary({
            availableXP: xpSummary.availableXP ?? 0,
            lifetimeXP: xpSummary.lifetimeXP ?? 0,
            redeemedXP: xpSummary.redeemedXP ?? 0,
            monthlyXP: xpSummary.monthlyXP ?? 0,
            transactions: xpSummary.transactions ?? [],
        })
        setRewards(Array.isArray(catalog) ? catalog : [])
        setRedemptions(Array.isArray(redList) ? redList : [])
    }, [professional?.id])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleSwitchTab = (tab) => {
        setActiveTab(tab)
        setSearchParams(tab === 'ledger' ? { tab: 'ledger' } : {})
    }

    const handleRedeem = async (item) => {
        if (!professional?.id) return

        if (item.isClaimed) {
            toast('You have already claimed this benefit.')
            return
        }

        if (!item.canAfford) {
            toast.error(`You need ${item.xpNeeded} more XP to redeem this reward.`)
            return
        }

        setRedeemingId(item.id)
        const res = await redeemProfReward(professional.id, item.id)
        setRedeemingId(null)

        if (res.success) {
            toast.success(res.message, { icon: '🎉' })
            loadData()
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

    // Level progression calculation
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1
                        className="text-2xl sm:text-3xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        XP &amp; Rewards
                    </h1>
                    <p className="mt-0.5 text-xs text-[#647572]">
                        Earn XP through approved contributions and redeem for professional benefits.
                    </p>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] bg-white p-1 self-start sm:self-auto shadow-2xs">
                    <button
                        type="button"
                        onClick={() => handleSwitchTab('redeem')}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${activeTab === 'redeem'
                            ? 'bg-[#033135] !text-white shadow-xs'
                            : 'text-[#647572] hover:text-[#033135]'
                            }`}
                        style={activeTab === 'redeem' ? { color: '#ffffff' } : {}}
                    >
                        <Gift size={13} />
                        <span>Rewards Store</span>
                        {affordableCount > 0 && (
                            <span className="ml-1 rounded-full bg-[#F8E7A5] px-1.5 py-0.2 text-[9px] font-black text-[#033135]">
                                {affordableCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSwitchTab('ledger')}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${activeTab === 'ledger'
                            ? 'bg-[#033135] !text-white shadow-xs'
                            : 'text-[#647572] hover:text-[#033135]'
                            }`}
                        style={activeTab === 'ledger' ? { color: '#ffffff' } : {}}
                    >
                        <Clock size={13} />
                        <span>History</span>
                    </button>
                </div>
            </div>

            {/* Metrics Overview Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Available XP */}
                <div className="rounded-2xl border border-[#E0AE3A]/60 bg-gradient-to-br from-[#F8E7A5]/25 via-white to-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B6D25]">
                            Available Balance
                        </span>
                        <Sparkles size={14} className="text-[#8B6D25]" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                        <span
                            className="text-2xl sm:text-3xl font-bold text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.availableXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#8B6D25]">XP</span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[#2F7B58]">
                        {affordableCount > 0 ? `${affordableCount} reward ready` : 'Earn more to unlock'}
                    </p>
                </div>

                {/* Lifetime Earned */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#647572]">
                            Lifetime Earned
                        </span>
                        <Crown size={14} className="text-[#648C83]" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                        <span
                            className="text-2xl sm:text-3xl font-bold text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.lifetimeXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#647572]">XP</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#647572]">
                        Level {currentTier.level} Contributor
                    </p>
                </div>

                {/* Total Redeemed */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#647572]">
                            Total Redeemed
                        </span>
                        <Gift size={14} className="text-[#A45E45]" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                        <span
                            className="text-2xl sm:text-3xl font-bold text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.redeemedXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#A45E45]">XP</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#647572]">
                        {redemptions.length} benefit{redemptions.length !== 1 ? 's' : ''} claimed
                    </p>
                </div>

                {/* Monthly Earned */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#647572]">
                            This Month
                        </span>
                        <Zap size={14} className="text-[#2F7B58]" />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                        <span
                            className="text-2xl sm:text-3xl font-bold text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {summary.monthlyXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#2F7B58]">XP</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#647572]">
                        Monthly Cap: {PROF_XP_RULES.MONTHLY_EARNING_CAP} XP
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: REWARDS STORE
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'redeem' && (
                <div className="space-y-5">
                    {/* Category Filter Chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-[#033135] !text-white shadow-xs'
                                    : 'bg-white text-[#647572] border border-[#E8EFEB] hover:bg-[#FAFBF9]'
                                    }`}
                                style={selectedCategory === cat ? { color: '#ffffff' } : {}}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Rewards Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredRewards.map((item) => {
                            const Icon = item.icon
                            const { isClaimed, canAfford, progressPercent, xpNeeded } = item

                            return (
                                <div
                                    key={item.id}
                                    className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition hover:border-[#C4D7D4] ${isClaimed
                                        ? 'border-[#2F7B58]/30 bg-[#FAFBF9]'
                                        : canAfford
                                            ? 'border-[#E0AE3A]/50'
                                            : 'border-[#E8EFEB]'
                                        }`}
                                >
                                    <div>
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color} ${item.iconColor}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="rounded-full bg-[#FAFBF9] border border-[#E8EFEB] px-2 py-0.5 text-[10px] font-semibold text-[#647572]">
                                                {item.badge}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#8B6D25]">
                                            {item.category}
                                        </p>

                                        <h3 className="mt-0.5 text-sm font-bold text-[#033135] leading-snug">
                                            {item.title}
                                        </h3>

                                        <p className="mt-1.5 text-xs text-[#647572] line-clamp-2 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    {/* Footer: Price & Action */}
                                    <div className="mt-4 pt-3.5 border-t border-[#E8EFEB] space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-medium text-[#647572]">Cost</span>
                                            <span className="flex items-center gap-1 text-sm font-black text-[#033135]">
                                                <Zap size={13} className="text-[#8B6D25]" fill="currentColor" />
                                                {item.points} XP
                                            </span>
                                        </div>

                                        {/* Progress bar (only if not claimed and cannot afford yet) */}
                                        {!isClaimed && !canAfford && (
                                            <div className="space-y-1">
                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8EFEB]">
                                                    <div
                                                        className="h-full bg-[#E0AE3A] rounded-full transition-all"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-[#9AA6A0]">
                                                    <span>{xpNeeded} XP needed</span>
                                                    <span>{progressPercent}%</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <button
                                            type="button"
                                            disabled={!canAfford || isClaimed || redeemingId === item.id}
                                            onClick={() => handleRedeem(item)}
                                            className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition shadow-xs ${isClaimed
                                                ? 'bg-[#E4F0EA] text-[#2F7B58] cursor-default'
                                                : canAfford
                                                    ? 'bg-[#033135] !text-white hover:bg-[#324C4D] active:scale-[0.99]'
                                                    : 'bg-[#F0F4F2] text-[#9AA6A0] cursor-not-allowed'
                                                }`}
                                            style={canAfford && !isClaimed ? { color: '#ffffff' } : {}}
                                        >
                                            {isClaimed ? (
                                                <>
                                                    <CheckCircle2 size={14} />
                                                    <span>Claimed</span>
                                                </>
                                            ) : canAfford ? (
                                                <>
                                                    <ShoppingBag size={14} />
                                                    <span>Redeem Benefit</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock size={13} />
                                                    <span>Locked</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Redeemed Benefits Section */}
                    {redemptions.length > 0 && (
                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-[#E8EFEB]">
                                <h3 className="text-xs font-bold text-[#033135] uppercase tracking-wider">
                                    Claimed Benefits ({redemptions.length})
                                </h3>
                            </div>

                            <div className="divide-y divide-[#F0F4F2]">
                                {redemptions.map((red) => (
                                    <div
                                        key={red.id}
                                        className="flex items-center justify-between py-2.5 text-xs first:pt-1 last:pb-1"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E4F0EA] text-[#2F7B58]">
                                                <GraduationCap size={14} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#033135]">{red.title}</p>
                                                <p className="text-[10px] text-[#647572]">
                                                    {new Date(red.redeemedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-[#A45E45] text-xs">
                                            -{red.points} XP
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: XP HISTORY & TRANSACTIONS
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'ledger' && (
                <div className="space-y-5">
                    {/* Level Progress Banner */}
                    <div className="rounded-2xl bg-[#033135] p-5 text-white shadow-xs">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8E7A5] text-[#033135]">
                                    <Crown size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        Level {currentTier.level} Professional
                                    </h3>
                                    <p className="text-[11px] text-[#C4D7D4]">
                                        {xpToNext > 0
                                            ? `${xpToNext} XP to Level ${nextTier.level}`
                                            : 'Max Level reached'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-[#F8E7A5]">
                                {pct}%
                            </span>
                        </div>

                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                            <div
                                className="h-full bg-[#F8E7A5] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>

                    {/* Transaction History Card */}
                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                            <h2 className="text-sm font-bold text-[#033135]">
                                Transaction History
                            </h2>

                            {/* Filter Chips */}
                            <div className="flex items-center gap-1 rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-1">
                                {[
                                    { id: 'ALL', label: 'All' },
                                    { id: 'EARN', label: 'Earned' },
                                    { id: 'SPEND', label: 'Spent' },
                                ].map((btn) => (
                                    <button
                                        key={btn.id}
                                        type="button"
                                        onClick={() => setTxFilter(btn.id)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${txFilter === btn.id
                                            ? 'bg-white text-[#033135] shadow-2xs font-bold'
                                            : 'text-[#647572] hover:text-[#033135]'
                                            }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="divide-y divide-[#F0F4F2]">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => {
                                    const isEarn = tx.type === 'EARN'
                                    const dateStr = new Date(tx.timestamp).toLocaleDateString('en-IN', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })

                                    return (
                                        <div
                                            key={tx.id}
                                            className="flex items-center justify-between py-3 first:pt-2 last:pb-1 text-xs"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 pr-3">
                                                <div
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isEarn
                                                        ? 'bg-[#E4F0EA] text-[#2F7B58]'
                                                        : 'bg-rose-50 text-[#C0563B]'
                                                        }`}
                                                >
                                                    {isEarn ? (
                                                        <ArrowUpRight size={15} />
                                                    ) : (
                                                        <ArrowDownLeft size={15} />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#033135] truncate">
                                                        {tx.description}
                                                    </p>
                                                    <p className="text-[10px] text-[#647572]">
                                                        {tx.source?.replace(/_/g, ' ')} · {dateStr}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`font-black text-sm shrink-0 ${isEarn ? 'text-[#2F7B58]' : 'text-[#C0563B]'
                                                    }`}
                                            >
                                                {isEarn ? '+' : '-'}{tx.amount} XP
                                            </span>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="py-8 text-center text-xs text-[#9AA6A0]">
                                    No {txFilter.toLowerCase()} transactions found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
