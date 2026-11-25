import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowLeft,
    History,
    RefreshCw,
    Search,
    TrendingUp,
    TrendingDown,
    Wallet,
    Zap,
    Sparkles,
    Award,
    Gift,
    Ticket,
    Stethoscope,
    Copy,
    Check,
    AlertTriangle,
    Clock,
    Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import { fetchXPHistory, getLocalXPHistory } from '../../services/xpService'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const TYPE_FILTERS = [
    { id: 'ALL', label: 'All Activity' },
    { id: 'EARN', label: 'XP Earned' },
    { id: 'SPEND', label: 'XP Used' },
]

const SOURCE_FILTERS = [
    { id: 'ALL', label: 'All Sources' },
    { id: 'CHALLENGE', label: 'Challenges' },
    { id: 'BONUS', label: 'Daily Bonus' },
    { id: 'BADGE', label: 'Badges' },
    { id: 'WELCOME', label: 'Welcome' },
    { id: 'REWARD', label: 'Reward Store' },
    { id: 'CONSULTATION', label: 'Consultations' },
]

function formatTimestamp(iso) {
    if (!iso) return 'Unknown date'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return 'Unknown date'
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function formatActivityDate(dateStr) {
    if (!dateStr) return null
    const parsed = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return dateStr
    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

function getCategoryVisual(category) {
    switch (category) {
        case 'CHALLENGE':
            return {
                icon: Zap,
                iconBg: 'bg-[#E4F0EA]',
                iconText: 'text-[#2F7B58]',
                badgeBg: 'bg-[#E4F0EA]',
                badgeText: 'text-[#2F7B58]',
            }
        case 'BONUS':
            return {
                icon: Sparkles,
                iconBg: 'bg-[#F8E7A5]',
                iconText: 'text-[#8B6D25]',
                badgeBg: 'bg-[#F8E7A5]',
                badgeText: 'text-[#8B6D25]',
            }
        case 'BADGE':
            return {
                icon: Award,
                iconBg: 'bg-[#DCD6F7]',
                iconText: 'text-[#625780]',
                badgeBg: 'bg-[#DCD6F7]',
                badgeText: 'text-[#625780]',
            }
        case 'WELCOME':
            return {
                icon: Gift,
                iconBg: 'bg-[#E4F0EA]',
                iconText: 'text-[#033135]',
                badgeBg: 'bg-[#E4F0EA]',
                badgeText: 'text-[#033135]',
            }
        case 'REWARD':
            return {
                icon: Ticket,
                iconBg: 'bg-[#FFD9C7]',
                iconText: 'text-[#A45E45]',
                badgeBg: 'bg-[#FFD9C7]',
                badgeText: 'text-[#A45E45]',
            }
        case 'CONSULTATION':
            return {
                icon: Stethoscope,
                iconBg: 'bg-[#FFD9C7]',
                iconText: 'text-[#9A4D33]',
                badgeBg: 'bg-[#FFD9C7]',
                badgeText: 'text-[#9A4D33]',
            }
        default:
            return {
                icon: History,
                iconBg: 'bg-[#F3F6F4]',
                iconText: 'text-[#4F6260]',
                badgeBg: 'bg-[#F3F6F4]',
                badgeText: 'text-[#4F6260]',
            }
    }
}

function getRedemptionStatusStyle(status) {
    switch (status) {
        case 'used':
            return 'bg-[#F3F6F4] text-[#647572]'
        case 'expired':
            return 'bg-rose-50 text-[#C0563B]'
        case 'active':
        default:
            return 'bg-[#E4F0EA] text-[#2F7B58]'
    }
}

export default function RewardsHistory() {
    const { user } = useAuth()

    const [historyData, setHistoryData] = useState(() => getLocalXPHistory())
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [syncError, setSyncError] = useState(null)

    const [typeFilter, setTypeFilter] = useState('ALL')
    const [sourceFilter, setSourceFilter] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [copiedId, setCopiedId] = useState(null)

    const loadHistory = useCallback(async ({ manual = false } = {}) => {
        if (manual) {
            setRefreshing(true)
        }

        const result = await fetchXPHistory(user?.id || null, { reconcile: true })
        if (result?.data) {
            setHistoryData(result.data)
        }

        if (result.success) {
            setSyncError(null)
            if (manual) toast.success('XP history updated')
        } else {
            setSyncError(result.error || 'Unable to sync latest XP history from server.')
            if (manual) toast.error(result.error || 'Failed to refresh XP history')
        }

        setLoading(false)
        setRefreshing(false)
    }, [user?.id])

    useEffect(() => {
        let cancelled = false
        fetchXPHistory(user?.id || null, { reconcile: true }).then((result) => {
            if (cancelled) return
            if (result?.data) {
                setHistoryData(result.data)
            }
            if (result.success) {
                setSyncError(null)
            } else {
                setSyncError(result.error || 'Unable to sync latest XP history from server.')
            }
            setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [user?.id])

    useEffect(() => {
        const handleSyncComplete = () => {
            setHistoryData(getLocalXPHistory())
        }
        window.addEventListener('fitkey-sync-complete', handleSyncComplete)
        return () => window.removeEventListener('fitkey-sync-complete', handleSyncComplete)
    }, [])

    const handleCopyVoucher = async (entryId, code) => {
        if (!code) return
        try {
            await navigator.clipboard.writeText(code)
            setCopiedId(entryId)
            toast.success(`Voucher ${code} copied`)
            setTimeout(() => {
                setCopiedId((prev) => (prev === entryId ? null : prev))
            }, 2000)
        } catch {
            toast.error('Could not copy voucher code')
        }
    }

    const handleTypeFilterChange = (nextType) => {
        setTypeFilter(nextType)
        // Clear incompatible source filter if user switches between Earned and Used
        if (nextType === 'EARN' && (sourceFilter === 'REWARD' || sourceFilter === 'CONSULTATION')) {
            setSourceFilter('ALL')
        } else if (
            nextType === 'SPEND' &&
            ['CHALLENGE', 'BONUS', 'BADGE', 'WELCOME'].includes(sourceFilter)
        ) {
            setSourceFilter('ALL')
        }
    }

    const sourceCounts = useMemo(() => {
        const counts = {
            ALL: historyData.entries.length,
            CHALLENGE: 0,
            BONUS: 0,
            BADGE: 0,
            WELCOME: 0,
            REWARD: 0,
            CONSULTATION: 0,
        }
        for (const entry of historyData.entries) {
            if (typeFilter !== 'ALL' && entry.type !== typeFilter) continue
            if (counts[entry.category] !== undefined) {
                counts[entry.category] += 1
            }
        }
        if (typeFilter !== 'ALL') {
            counts.ALL = historyData.entries.filter((e) => e.type === typeFilter).length
        }
        return counts
    }, [historyData.entries, typeFilter])

    const filteredEntries = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return historyData.entries.filter((entry) => {
            if (typeFilter !== 'ALL' && entry.type !== typeFilter) return false
            if (sourceFilter !== 'ALL' && entry.category !== sourceFilter) return false
            if (!q) return true

            const searchable = [
                entry.description,
                entry.categoryLabel,
                entry.rewardTitle,
                entry.voucherCode,
                entry.bookingReference,
                entry.activityDate,
                entry.refId,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return searchable.includes(q)
        })
    }, [historyData.entries, typeFilter, sourceFilter, searchQuery])

    const visibleSourceFilters = useMemo(() => {
        if (typeFilter === 'EARN') {
            return SOURCE_FILTERS.filter((f) => ['ALL', 'CHALLENGE', 'BONUS', 'BADGE', 'WELCOME'].includes(f.id))
        }
        if (typeFilter === 'SPEND') {
            return SOURCE_FILTERS.filter((f) => ['ALL', 'REWARD', 'CONSULTATION'].includes(f.id))
        }
        return SOURCE_FILTERS
    }, [typeFilter])

    const { summary } = historyData

    return (
        <div className="space-y-6 pb-10">
            {/* Header & Breadcrumb */}
            <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#647572]">
                        <Link
                            to="/rewards"
                            className="inline-flex items-center gap-1 transition hover:text-[#033135]"
                        >
                            <ArrowLeft size={14} />
                            <span>Rewards</span>
                        </Link>
                        <span>/</span>
                        <span className="text-[#033135]">History</span>
                    </div>

                    <h1
                        className="text-3xl sm:text-4xl text-[#033135]"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        XP & Rewards History
                    </h1>

                    <p className="mt-1.5 text-xs sm:text-sm text-[#647572]">
                        Complete record of XP earned from missions and badges, plus rewards and discounts redeemed.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => loadHistory({ manual: true })}
                    disabled={refreshing}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#DCE7E3] bg-white px-3.5 py-2 text-xs font-semibold text-[#033135] shadow-2xs transition hover:border-[#033135]/30 hover:bg-[#E4F0EA]/60 disabled:opacity-60"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </section>

            {/* Sync Error Alert */}
            {syncError && (
                <div className="flex flex-col gap-2 rounded-2xl border border-[#F2C98A] bg-[#FFF8EB] px-4 py-3 text-xs text-[#7C5B1B] sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5 sm:items-center">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#B45309] sm:mt-0" />
                        <span>
                            Showing cached XP history. Live server sync failed: {syncError}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadHistory({ manual: true })}
                        className="self-start rounded-full border border-[#E6B86E] bg-white px-3 py-1 text-[11px] font-semibold text-[#7C5B1B] transition hover:bg-[#FEF3C7] sm:self-auto"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Summary KPI Cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-[#033135] p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between text-xs text-[#C4D7D4]">
                        <span>Available Balance</span>
                        <Wallet size={16} className="text-[#F8E7A5]" />
                    </div>
                    <p
                        className="mt-2 text-3xl text-white"
                        style={{ fontFamily: SERIF }}
                    >
                        {summary.availableXP.toLocaleString()} XP
                    </p>
                    <p className="mt-1 text-xs text-[#C4D7D4]">
                        Ready to spend in Store or Consultations
                    </p>
                </div>

                <div className="rounded-3xl border border-[#E8EFEB] bg-white p-5">
                    <div className="flex items-center justify-between text-xs font-medium text-[#647572]">
                        <span>Total XP Earned</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#2F7B58]">
                            <TrendingUp size={15} />
                        </span>
                    </div>
                    <p
                        className="mt-2 text-3xl text-[#2F7B58]"
                        style={{ fontFamily: SERIF }}
                    >
                        +{summary.lifetimeEarned.toLocaleString()} XP
                    </p>
                    <p className="mt-1 text-xs text-[#647572]">
                        Across {summary.earnedCount} {summary.earnedCount === 1 ? 'reward entry' : 'reward entries'}
                    </p>
                </div>

                <div className="rounded-3xl border border-[#E8EFEB] bg-white p-5">
                    <div className="flex items-center justify-between text-xs font-medium text-[#647572]">
                        <span>Total XP Used</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#FFD9C7] text-[#C0563B]">
                            <TrendingDown size={15} />
                        </span>
                    </div>
                    <p
                        className="mt-2 text-3xl text-[#C0563B]"
                        style={{ fontFamily: SERIF }}
                    >
                        -{summary.totalSpent.toLocaleString()} XP
                    </p>
                    <p className="mt-1 text-xs text-[#647572]">
                        Across {summary.spentCount} {summary.spentCount === 1 ? 'redemption' : 'redemptions'}
                    </p>
                </div>
            </section>

            {/* Filters & Search */}
            <section className="rounded-3xl border border-[#E8EFEB] bg-white p-4 sm:p-5 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {TYPE_FILTERS.map((tab) => {
                            const count =
                                tab.id === 'ALL'
                                    ? summary.totalCount
                                    : tab.id === 'EARN'
                                        ? summary.earnedCount
                                        : summary.spentCount
                            const active = typeFilter === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTypeFilterChange(tab.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                        active
                                            ? 'bg-[#033135] text-white'
                                            : 'bg-[#F3F6F4] text-[#4F6260] hover:bg-[#E4F0EA] hover:text-[#033135]'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                            active
                                                ? 'bg-white/20 text-white'
                                                : 'bg-white text-[#033135]'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA6A0]"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search challenge, reward, voucher..."
                            className="w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] py-2 pl-8 pr-3 text-xs text-[#033135] placeholder:text-[#9AA6A0] focus:border-[#033135] focus:bg-white focus:outline-none"
                        />
                    </div>
                </div>

                {/* Source Pills */}
                <div className="flex flex-wrap gap-1.5 border-t border-[#F0F4F1] pt-3">
                    {visibleSourceFilters.map((src) => {
                        const active = sourceFilter === src.id
                        const count = sourceCounts[src.id] ?? 0
                        return (
                            <button
                                key={src.id}
                                type="button"
                                onClick={() => setSourceFilter(src.id)}
                                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                                    active
                                        ? 'border border-[#033135] bg-[#E4F0EA] font-semibold text-[#033135]'
                                        : 'border border-transparent bg-[#F8FAF7] text-[#647572] hover:border-[#DCE7E3] hover:text-[#033135]'
                                }`}
                            >
                                <span>{src.label}</span>
                                <span className="text-[10px] opacity-75">({count})</span>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* Transactions Timeline */}
            <section className="space-y-3">
                {loading && historyData.entries.length === 0 ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((skeleton) => (
                            <div
                                key={skeleton}
                                className="h-24 animate-pulse rounded-2xl border border-[#E8EFEB] bg-white"
                            />
                        ))}
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="rounded-3xl border border-[#E8EFEB] bg-white px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E4F0EA] text-[#033135]">
                            <History size={22} />
                        </div>
                        <h3
                            className="mt-3 text-xl text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            {historyData.entries.length === 0
                                ? 'No XP Activity Yet'
                                : 'No Matching Transactions'}
                        </h3>
                        <p className="mx-auto mt-1 max-w-md text-xs text-[#647572]">
                            {historyData.entries.length === 0
                                ? 'Complete daily wellness challenges or unlock badges to start building your XP history.'
                                : 'Try clearing your search or selecting a different activity filter.'}
                        </p>
                        {historyData.entries.length === 0 ? (
                            <Link
                                to="/rewards"
                                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#033135] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                            >
                                Explore Missions & Store
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setTypeFilter('ALL')
                                    setSourceFilter('ALL')
                                    setSearchQuery('')
                                }}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#DCE7E3] bg-white px-4 py-2 text-xs font-semibold text-[#033135] transition hover:bg-[#F8FAF7]"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    filteredEntries.map((entry) => {
                        const visual = getCategoryVisual(entry.category)
                        const Icon = visual.icon
                        const isEarn = entry.type === 'EARN'
                        const activityDateFormatted = formatActivityDate(entry.activityDate)

                        return (
                            <article
                                key={entry.id}
                                className="flex flex-col gap-3 rounded-2xl border border-[#E8EFEB] bg-white p-4 transition hover:border-[#C4D7D4] sm:flex-row sm:items-center sm:justify-between sm:p-5"
                            >
                                <div className="flex min-w-0 items-start gap-3.5">
                                    <div
                                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${visual.iconBg} ${visual.iconText}`}
                                    >
                                        <Icon size={19} />
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${visual.badgeBg} ${visual.badgeText}`}
                                            >
                                                {entry.categoryLabel}
                                            </span>

                                            {entry.pendingSync && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-[#9A6B12]">
                                                    <Clock size={10} />
                                                    Pending Sync
                                                </span>
                                            )}

                                            {entry.redemptionStatus && (
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getRedemptionStatusStyle(entry.redemptionStatus)}`}
                                                >
                                                    {entry.redemptionStatus}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-sm font-semibold text-[#033135]">
                                            {entry.description}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#647572]">
                                            <span>{formatTimestamp(entry.timestamp)}</span>

                                            {activityDateFormatted && (
                                                <span className="inline-flex items-center gap-1 text-[#4F6260]">
                                                    <Calendar size={11} />
                                                    For {activityDateFormatted}
                                                </span>
                                            )}

                                            {entry.bookingReference && (
                                                <span className="rounded-md bg-[#F8FAF7] px-2 py-0.5 font-mono text-[10px] text-[#324C4D]">
                                                    Ref: {entry.bookingReference}
                                                </span>
                                            )}
                                        </div>

                                        {entry.voucherCode && (
                                            <div className="pt-0.5">
                                                <div className="inline-flex items-center gap-2 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-2.5 py-1">
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#647572]">
                                                        Voucher:
                                                    </span>
                                                    <code className="font-mono text-xs font-bold text-[#033135]">
                                                        {entry.voucherCode}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyVoucher(entry.id, entry.voucherCode)}
                                                        aria-label={`Copy voucher code ${entry.voucherCode}`}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-[#033135] shadow-2xs transition hover:bg-[#E4F0EA]"
                                                    >
                                                        {copiedId === entry.id ? (
                                                            <>
                                                                <Check size={11} className="text-[#2F7B58]" />
                                                                Copied
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={11} />
                                                                Copy
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-[#F0F4F1] pt-2.5 sm:block sm:shrink-0 sm:border-t-0 sm:pt-0 sm:text-right">
                                    <p
                                        className={`text-lg font-bold ${
                                            isEarn ? 'text-[#2F7B58]' : 'text-[#C0563B]'
                                        }`}
                                        style={{ fontFamily: SERIF }}
                                    >
                                        {isEarn ? '+' : '-'}{entry.amount.toLocaleString()} XP
                                    </p>
                                    <p className="text-[11px] font-medium text-[#647572] sm:mt-0.5">
                                        Bal: {entry.balanceAfter.toLocaleString()} XP
                                    </p>
                                </div>
                            </article>
                        )
                    })
                )}
            </section>
        </div>
    )
}
