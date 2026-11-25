import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import {
    Gift,
    Zap,
    ArrowLeft,
    CheckCircle2,
    Lock,
    Sparkles,
    Tag,
    Clock,
    ShoppingBag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getProfRewardCatalog,
    redeemProfReward,
    getProfRedemptions,
} from '../../services/professional/professionalRewardService.js'
import { getProfXPSummaryAsync } from '../../services/professional/professionalXpService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function ProfessionalRewards() {
    const navigate = useNavigate()
    const { professional } = useOutletContext() || {}
    const [rewards, setRewards] = useState([])
    const [redemptions, setRedemptions] = useState([])
    const [availableXP, setAvailableXP] = useState(0)
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [redeemingId, setRedeemingId] = useState(null)

    const loadData = useCallback(async () => {
        if (!professional) return
        const [catalog, history, xpSummary] = await Promise.all([
            getProfRewardCatalog(professional.id),
            getProfRedemptions(professional.id),
            getProfXPSummaryAsync(professional.id),
        ])
        setRewards(Array.isArray(catalog) ? catalog : [])
        setRedemptions(Array.isArray(history) ? history : [])
        setAvailableXP(xpSummary?.availableXP ?? 0)
    }, [professional])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleRedeem = async (item) => {
        if (!professional) return

        if (item.isClaimed) {
            toast('You have already redeemed this reward benefit.')
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

    const categories = ['All', ...new Set(rewards.map((r) => r.category))]

    const filteredRewards = rewards.filter((r) => {
        if (selectedCategory === 'All') return true
        return r.category === selectedCategory
    })

    return (
        <div className="space-y-6 sm:space-y-7">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => navigate('/professional/xp')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#647572] hover:text-[#033135] transition"
                >
                    <ArrowLeft size={16} />
                    <span>Back to XP Ledger</span>
                </button>

                <div className="flex items-center gap-1 text-xs font-semibold text-[#8B6D25]">
                    <Sparkles size={14} />
                    <span>Professional Store</span>
                </div>
            </div>

            {/* Header with Balance Card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1
                        className="text-3xl font-normal text-[#033135] sm:text-4xl"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Professional Rewards Store
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Redeem earned professional XP for accredited CME courses, research journal passes, and clinic benefits.
                    </p>
                </div>

                {/* Available Balance Pill */}
                <div className="flex items-center gap-3 rounded-2xl border border-[#E8EFEB] bg-white p-3 pr-4 shadow-xs self-start sm:self-auto">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8E7A5] text-[#8B6D25]">
                        <Zap size={18} fill="currentColor" />
                    </div>
                    <div>
                        <span className="text-[10px] uppercase font-bold text-[#647572]">Spendable Balance</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-[#033135]">{availableXP.toLocaleString()}</span>
                            <span className="text-xs font-bold text-[#8B6D25]">XP</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Filter Chips */}
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

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRewards.map((item) => {
                    const Icon = item.icon
                    const { isClaimed, canAfford, progressPercent, xpNeeded } = item

                    return (
                        <div
                            key={item.id}
                            className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
                                isClaimed ? 'border-[#2F7B58]/30 bg-[#FAFBF9]' : 'border-[#E8EFEB]'
                            }`}
                        >
                            <div>
                                {/* Header badge and icon */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color} ${item.iconColor}`}>
                                        <Icon size={22} />
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

                                <p className="mt-1.5 text-xs text-[#647572] leading-relaxed">
                                    {item.description}
                                </p>
                            </div>

                            {/* Cost, Progress & Action */}
                            <div className="mt-5 pt-4 border-t border-[#E8EFEB] space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-[#647572]">Required XP:</span>
                                    <div className="flex items-center gap-1 font-black text-[#033135]">
                                        <Zap size={14} className="text-[#8B6D25]" fill="currentColor" />
                                        <span>{item.points} XP</span>
                                    </div>
                                </div>

                                {/* Progress track */}
                                <div className="space-y-1">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8EFEB]">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${
                                                isClaimed
                                                    ? 'bg-[#2F7B58]'
                                                    : canAfford
                                                    ? 'bg-[#2F7B58]'
                                                    : 'bg-[#C49A42]'
                                            }`}
                                            style={{ width: `${isClaimed ? 100 : progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[#9AA6A0]">
                                        <span>{isClaimed ? 'Benefit Unlocked' : canAfford ? 'Ready to claim' : `${xpNeeded} XP to go`}</span>
                                        <span>{isClaimed ? '100%' : `${progressPercent}%`}</span>
                                    </div>
                                </div>

                                {/* Action button */}
                                <button
                                    type="button"
                                    disabled={!canAfford || isClaimed || redeemingId === item.id}
                                    onClick={() => handleRedeem(item)}
                                    className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-[0.99] ${
                                        isClaimed
                                            ? 'bg-[#E4F0EA] text-[#2F7B58] cursor-default'
                                            : canAfford
                                            ? 'bg-[#033135] text-white hover:bg-[#324C4D] shadow-xs'
                                            : 'bg-[#F0F4F2] text-[#9AA6A0] cursor-not-allowed'
                                    }`}
                                >
                                    {isClaimed ? (
                                        <>
                                            <CheckCircle2 size={15} />
                                            <span>Claimed Benefit</span>
                                        </>
                                    ) : canAfford ? (
                                        <>
                                            <ShoppingBag size={15} />
                                            <span>Redeem for {item.points} XP</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={14} />
                                            <span>Need {xpNeeded} More XP</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Recent Redemptions History */}
            {redemptions.length > 0 && (
                <section className="rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                        <h3 className="text-sm font-bold text-[#033135]">
                            Your Redeemed Benefits ({redemptions.length})
                        </h3>
                        <span className="text-[11px] text-[#2F7B58] font-semibold">Active Grants</span>
                    </div>

                    <div className="space-y-2">
                        {redemptions.map((red) => (
                            <div
                                key={red.id}
                                className="flex items-center justify-between rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 text-xs"
                            >
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 size={16} className="text-[#2F7B58]" />
                                    <div>
                                        <p className="font-bold text-[#033135]">{red.title}</p>
                                        <p className="text-[10px] text-[#647572]">
                                            {red.category} • Redeemed on {new Date(red.redeemedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <span className="font-black text-[#A45E45]">
                                    -{red.points} XP
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

export default ProfessionalRewards
