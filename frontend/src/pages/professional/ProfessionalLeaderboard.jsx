import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
    Trophy, Crown, Star, TrendingUp, ShieldCheck,
    BadgeCheck,
} from 'lucide-react'
import { getLeaderboardRankings } from '../../services/professional/professionalLeaderboardService.js'
import { StarRow } from '../../components/professional/ProfessionalReviews.jsx'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function ProfessionalLeaderboard() {
    const { professional } = useOutletContext() || {}
    const [rankings, setRankings] = useState([])
    const [period, setPeriod] = useState('All-Time')

    useEffect(() => {
        const data = getLeaderboardRankings()
        setRankings(data)
    }, [])

    const currentId = professional?.id

    // Find current user's rank entry
    const myEntry = rankings.find((r) => r.professional.id === currentId)
    const myRank = myEntry?.rank || '—'
    const myXP = myEntry?.lifetimeXP || 0
    const myScore = myEntry?.score || 0

    // Top 3 for podium
    const top3 = rankings.slice(0, 3)
    const rest = rankings.slice(3)

    // For the podium display: [2nd, 1st, 3rd]
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
    const podiumHeights = { 0: 'h-16', 1: 'h-24', 2: 'h-12' }
    const podiumColors = {
        0: { bg: 'bg-[#E4F0EA]/20', label: 'text-[#E4F0EA]', avatar: 'bg-[#E4F0EA] text-[#033135]' },
        1: { bg: 'bg-[#F8E7A5]', label: 'text-[#033135]', avatar: 'bg-[#F8E7A5] text-[#033135] ring-4 ring-[#F8E7A5]/30 shadow-lg' },
        2: { bg: 'bg-[#DCD6F7]/20', label: 'text-[#DCD6F7]', avatar: 'bg-[#DCD6F7] text-[#033135]' },
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>

                <h1
                    className="mt-1 text-3xl font-normal text-[#033135] sm:text-4xl"
                    style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                >
                    Professional Leaderboard
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#647572]">
                    Ranked by XP, peer ratings, reviews, and published content.
                </p>
            </div>

            {/* Period Filter Tabs */}
            <div className="flex gap-2 border-b border-[#E8EFEB] pb-3">
                {['Weekly', 'Monthly', 'All-Time'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setPeriod(tab)}
                        className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${period === tab
                                ? 'bg-[#033135] text-white shadow-xs'
                                : 'bg-[#F0F4F2] text-[#647572] hover:bg-[#E4F0EA] hover:text-[#033135]'
                            }`}
                    >
                        {tab} Rankings
                    </button>
                ))}
            </div>

            {/* Your Standing Banner */}
            {myEntry && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#F8E7A5] to-[#FFD9C7] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#033135] text-white shadow-sm">
                                <span className="text-[9px] font-bold text-[#F8E7A5] uppercase">RANK</span>
                                <span className="text-xl sm:text-2xl font-black leading-none">#{myRank}</span>
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-[#033135] sm:text-base">
                                    {professional?.fullName || professional?.name || 'You'}
                                </p>
                                <p className="mt-0.5 text-xs text-[#755347]">
                                    Score: <span className="font-bold text-[#033135]">{myScore.toLocaleString()}</span> pts
                                </p>
                                {myEntry.avgRating > 0 && (
                                    <div className="mt-1 flex items-center gap-1">
                                        <StarRow rating={myEntry.avgRating} size={11} />
                                        <span className="text-[10px] text-[#755347] font-semibold">{myEntry.avgRating.toFixed(1)} avg</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <p className="text-lg sm:text-xl font-black text-[#033135]">
                                {myXP.toLocaleString()} <span className="text-xs font-semibold text-[#755347]">XP</span>
                            </p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F7B58]">
                                <TrendingUp size={13} /> {myEntry.postCount} post{myEntry.postCount !== 1 ? 's' : ''} published
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Podium — Top 3 */}
            {top3.length > 0 && (
                <div className="rounded-3xl bg-gradient-to-br from-[#033135] to-[#324C4D] p-5 sm:p-7 text-white shadow-md">
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Crown size={20} className="text-[#F8E7A5]" />
                            <h2 className="text-base font-bold">Top Verified Practitioners</h2>
                        </div>
                        <span className="text-xs text-[#C4D7D4]">{period} Champions</span>
                    </div>

                    <div className="mt-6 flex items-end justify-center gap-2 sm:gap-6">
                        {podiumOrder.map((entry, i) => {
                            if (!entry) return null
                            const p = entry.professional
                            const style = podiumColors[i]
                            const isFirst = entry.rank === 1
                            return (
                                <div key={p.id} className="flex-1 max-w-[140px] text-center">
                                    {isFirst && <Crown size={22} className="mx-auto mb-1 text-[#F8E7A5]" fill="currentColor" />}
                                    <div className={`mx-auto flex ${isFirst ? 'h-16 w-16' : 'h-12 w-12'} items-center justify-center rounded-full text-${isFirst ? 'xl' : 'base'} font-black ${style.avatar}`}>
                                        {p.photoUrl
                                            ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover rounded-full" />
                                            : getInitials(p.fullName || p.name)
                                        }
                                    </div>
                                    <p className="mt-2 text-xs font-bold truncate">{p.fullName || p.name}</p>
                                    <p className={`text-[10px] truncate ${isFirst ? 'text-[#F8E7A5] font-semibold' : 'text-[#C4D7D4]'}`}>
                                        {entry.lifetimeXP.toLocaleString()} XP
                                    </p>
                                    {entry.avgRating > 0 && (
                                        <p className="text-[9px] text-[#C4D7D4]">★ {entry.avgRating.toFixed(1)}</p>
                                    )}
                                    <div className={`mt-2 ${podiumHeights[i]} rounded-t-xl ${style.bg} flex items-center justify-center font-black ${isFirst ? 'text-2xl' : 'text-lg'} ${style.label}`}>
                                        {entry.rank}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Full Rankings List */}
            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs">
                <h3 className="text-sm font-extrabold text-[#033135] mb-3">
                    Practice Standings ({rankings.length} Professional{rankings.length !== 1 ? 's' : ''})
                </h3>

                {rankings.length === 0 ? (
                    <div className="py-10 text-center">
                        <Trophy size={28} className="mx-auto text-[#DCE7E3] mb-2" />
                        <p className="text-sm text-[#647572]">No rankings yet.</p>
                        <p className="text-xs text-[#9AA6A0] mt-1">Complete onboarding and publish content to appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rankings.map((entry) => {
                            const p = entry.professional
                            const isCurrent = p.id === currentId
                            const isVerified = (p.verificationStatus || '').toLowerCase().includes('verified')
                            return (
                                <div
                                    key={p.id}
                                    className={`flex items-center gap-3 rounded-2xl p-3 transition ${isCurrent
                                            ? 'bg-[#F8E7A5]/40 border-2 border-[#E0AE3A]/60 shadow-xs'
                                            : 'border border-[#E8EFEB] bg-[#FAFBF9] hover:bg-white'
                                        }`}
                                >
                                    <span className="w-6 text-center text-sm font-black text-[#647572]">
                                        #{entry.rank}
                                    </span>

                                    <div className="flex h-9 w-9 shrink-0 overflow-hidden items-center justify-center rounded-xl bg-white border border-[#DCE7E3] text-xs font-bold text-[#033135]">
                                        {p.photoUrl
                                            ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                                            : getInitials(p.fullName || p.name)
                                        }
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-bold text-[#033135] truncate">
                                                {p.fullName || p.name}{isCurrent ? ' (You)' : ''}
                                            </p>
                                            {isVerified && <BadgeCheck size={12} className="text-[#6B5B95] shrink-0" />}
                                            {isCurrent && (
                                                <span className="rounded-full bg-[#033135] px-1.5 py-px text-[9px] font-bold text-[#F8E7A5]">
                                                    YOU
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-[#647572] truncate">
                                            {p.specialization || p.profession} · {p.workplaceName || p.city || 'Practice'}
                                        </p>
                                        {/* Stat row */}
                                        <div className="mt-1 flex items-center gap-3 text-[10px] text-[#9AA6A0]">
                                            {entry.avgRating > 0 && (
                                                <span className="flex items-center gap-0.5">
                                                    <Star size={9} className="text-[#E0AE3A]" fill="currentColor" />
                                                    {entry.avgRating.toFixed(1)} ({entry.reviewCount})
                                                </span>
                                            )}
                                            <span>{entry.postCount} post{entry.postCount !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-black text-[#033135]">
                                            {entry.lifetimeXP.toLocaleString()} <span className="text-[10px] font-normal text-[#647572]">XP</span>
                                        </p>
                                        <p className="text-[10px] text-[#9AA6A0]">
                                            Score {entry.score.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <p className="mt-4 text-center text-[11px] text-[#9AA6A0]">
                    Score = XP (40%) + Rating (30%) + Reviews (15%) + Posts (15%)
                </p>
            </div>
        </div>
    )
}

export default ProfessionalLeaderboard
