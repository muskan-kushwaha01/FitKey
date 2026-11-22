import { useState } from 'react'
import { useNavigate, useOutletContext, Link } from 'react-router-dom'
import {
    Clock,
    ShieldCheck,
    Stethoscope,
    Building2,
    MapPin,
    Zap,
    FileText,
    Eye,
    Heart,
    MessageSquare,
    Star,
    PlusCircle,
    UserRound,
    Trophy,
    ArrowRight,
    TrendingUp,
    Sparkles,
    CheckCircle2,
    Crown,
    Share2,
    Home,
    Gift,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { getPosts } from '../../services/professional/professionalContentService.js'
import { getAvailableProfXP } from '../../services/professional/professionalXpService.js'
import { getLeaderboardRankings, getProfessionalRank } from '../../services/professional/professionalLeaderboardService.js'
import { getReviewsForProfessional } from '../../services/professional/professionalReviewService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

// Demo activity feed for professional interactions
const DEMO_ACTIVITIES = [
    {
        id: 1,
        type: 'like',
        icon: Heart,
        iconColor: 'text-[#C0563B]',
        iconBg: 'bg-[#FFD9C7]',
        text: 'Aarav Sharma and 14 others liked your guide "Daily Micro-Habits for Cardiac Health".',
        time: '35m ago',
    },
    {
        id: 2,
        type: 'comment',
        icon: MessageSquare,
        iconColor: 'text-[#324C4D]',
        iconBg: 'bg-[#E4F0EA]',
        text: 'Dr. Rajesh Kumar commented: "Excellent breakdown of glycemic index vs glycemic load."',
        time: '2h ago',
    },
    {
        id: 3,
        type: 'review',
        icon: Star,
        iconColor: 'text-[#8B6D25]',
        iconBg: 'bg-[#F8E7A5]',
        text: '5-star peer recommendation received from Priya Nair (Clinical Nutritionist).',
        time: 'Yesterday',
    },
    {
        id: 4,
        type: 'verification',
        icon: ShieldCheck,
        iconColor: 'text-[#2F7B58]',
        iconBg: 'bg-[#E4F0EA]',
        text: 'Document checkpoint: State Medical Council registration uploaded.',
        time: '2 days ago',
    },
]

// Demo top leaders preview
const DEMO_LEADER_PREVIEW = [
    { rank: 1, name: 'Dr. Sneha Roy', specialty: 'Functional Medicine', xp: 2450, initials: 'SR' },
    { rank: 2, name: 'Dr. Arjun Patel', specialty: 'Orthopedics & Sports', xp: 2180, initials: 'AP' },
    { rank: 3, name: 'Dr. Ananya Sharma', specialty: 'Cardiology', xp: 1920, initials: 'AS' },
]

function ProfessionalHome() {
    const navigate = useNavigate()
    const { professional } = useOutletContext() || {}

    const displayName = professional?.fullName || professional?.name || 'Doctor'
    const profession = professional?.profession || 'Healthcare Professional'
    const specialization = professional?.specialization || 'Clinical Wellness'
    const workplace = professional?.workplaceName || 'Private Practice Clinic'
    const city = professional?.city || 'India'
    const state = professional?.state || ''

    // Dynamic posts count & live XP balance
    const authorPosts = professional ? getPosts({ professionalId: professional.id }) : []
    const publishedCount = authorPosts.length
    const liveXP = professional ? getAvailableProfXP(professional.id) : 0

    // Dynamic rankings with fallback
    const rankings = getLeaderboardRankings()
    const myRankEntry = professional ? getProfessionalRank(professional.id) : null
    const top3 = rankings.length > 0
        ? rankings.slice(0, 3).map((r) => ({
            id: r.professional?.id || `leader-${r.rank}`,
            rank: r.rank,
            name: r.professional?.fullName || r.professional?.name || 'Verified Practitioner',
            specialty: r.professional?.specialization || r.professional?.profession || 'Specialist',
            xp: r.lifetimeXP || 0,
        }))
        : DEMO_LEADER_PREVIEW.map((d) => ({
            id: `demo-${d.rank}`,
            rank: d.rank,
            name: d.name,
            specialty: d.specialty,
            xp: d.xp,
        }))

    // Dynamic reviews
    const recentReviews = professional ? getReviewsForProfessional(professional.id) : []
    const reviewActivities = recentReviews.slice(0, 2).map((r) => ({
        id: `rev-${r.id}`,
        type: 'review',
        icon: Star,
        iconColor: 'text-[#8B6D25]',
        iconBg: 'bg-[#F8E7A5]',
        text: `${r.rating}★ review from ${r.userName}: "${(r.comment || 'Verified review').slice(0, 60)}"`,
        time: 'Recent',
    }))
    const activities = [...reviewActivities, ...DEMO_ACTIVITIES].slice(0, 4)

    const handleCreateContent = () => {
        navigate('/professional/content/create')
    }

    const handleSharePractice = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.origin + '/professional/profile')
            toast.success('Professional profile link copied to clipboard!')
        } else {
            toast('Practice link ready to share.')
        }
    }

    return (
        <div className="space-y-6 sm:space-y-7">
            {/* 1. Header Greeting Section */}
            <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>

                    <h1
                        className="mt-1 text-2xl sm:text-3xl lg:text-4xl text-[#033135] font-normal"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Welcome back, <span className="font-bold">{displayName}</span>
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        {profession} · <span className="font-medium text-[#324C4D]">{specialization}</span> · {workplace}
                    </p>
                </div>

                {/* Quick actions top pill */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        onClick={handleCreateContent}
                        className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#324C4D] active:scale-[0.99]"
                    >
                        <PlusCircle size={15} />
                        <span>Create Content</span>
                    </button>

                    <button
                        onClick={() => navigate('/professional/profile')}
                        className="flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#033135] shadow-xs hover:bg-[#E4F0EA] transition"
                    >
                        <UserRound size={15} />
                        <span>View Profile</span>
                    </button>
                </div>
            </section>

            {/* 2. Verification Status Alert (with button to move to main home screen) */}
            <section className="relative overflow-hidden rounded-2xl border border-[#E0AE3A]/40 bg-gradient-to-r from-[#F8E7A5]/40 via-[#F8FAF7] to-[#E4F0EA]/50 p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8E7A5] text-[#8B6D25] shadow-xs">
                            <Clock size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Profile Verification: Pending Verification
                                </h3>
                                <span className="rounded-full bg-[#F8E7A5] px-2.5 py-0.5 text-[10px] font-black text-[#8B6D25] uppercase tracking-wide">
                                    Under Review
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#647572] max-w-2xl leading-relaxed">
                                Your qualifications and documents are securely recorded. For this prototype, all professional features are accessible in demonstration mode.
                            </p>
                        </div>
                    </div>

                    {/* Button on the screen showing pending verification to move to the main home screen */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate('/home')}
                            className="flex items-center gap-1.5 rounded-xl border border-[#C4D7D4] bg-white px-3.5 py-2 text-xs font-semibold text-[#033135] shadow-xs hover:bg-[#E4F0EA] transition"
                            title="Go to standard User App Home"
                        >
                            <Home size={14} />
                            <span>Go to User Home</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                toast.success('Verification simulated! You have full access.')
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#324C4D] transition"
                        >
                            <ShieldCheck size={14} className="text-[#F8E7A5]" />
                            <span>Verify Now</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* 3. Core Metrics Grid (XP, Posts, Views, Engagement) */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Available XP Balance */}
                <div
                    onClick={() => navigate('/professional/xp?tab=redeem')}
                    className="group rounded-2xl border-2 border-[#E0AE3A]/40 bg-gradient-to-br from-[#F8E7A5]/25 via-white to-white p-4 sm:p-5 shadow-xs transition hover:shadow-md cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#8B6D25] uppercase tracking-wider">
                            Available XP
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F8E7A5] text-[#8B6D25]">
                            <Zap size={16} fill="currentColor" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-[#033135]">
                            {liveXP.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-[#8B6D25]">XP</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-[#E8EFEB]">
                        <span className="text-[10px] text-[#2F7B58] font-bold">Ready to redeem</span>
                        <span className="text-[11px] font-extrabold text-[#033135] group-hover:text-[#648C83] flex items-center gap-0.5">
                            Redeem <ArrowRight size={11} />
                        </span>
                    </div>
                </div>

                {/* Published Posts */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#647572] uppercase tracking-wider">
                            Published Posts
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#324C4D]">
                            <FileText size={16} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-[#033135]">
                            {publishedCount}
                        </span>
                        <span className="text-xs font-medium text-[#647572]">articles & reels</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#2F7B58] font-semibold flex items-center gap-1">
                        <TrendingUp size={12} /> 2 published this month
                    </p>
                </div>

                {/* Total Content Views */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#647572] uppercase tracking-wider">
                            Content Views
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCD6F7] text-[#625780]">
                            <Eye size={16} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-[#033135]">
                            8.4K
                        </span>
                        <span className="text-xs font-medium text-[#647572]">readers</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#2F7B58] font-semibold flex items-center gap-1">
                        <TrendingUp size={12} /> +18.4% engagement
                    </p>
                </div>

                {/* Total Engagement */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#647572] uppercase tracking-wider">
                            Total Engagement
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFD9C7] text-[#A45E45]">
                            <Heart size={16} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-[#033135]">
                            1,240
                        </span>
                        <span className="text-xs font-medium text-[#647572]">interactions</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#647572]">
                        Likes, comments & bookmarks
                    </p>
                </div>
            </section>

            {/* Quick Rewards Redemption Banner */}
            <section
                onClick={() => navigate('/professional/xp?tab=redeem')}
                className="group relative overflow-hidden rounded-2xl border border-[#033135]/15 bg-gradient-to-r from-[#033135] via-[#324C4D] to-[#033135] p-4 sm:p-5 text-white shadow-md cursor-pointer transition hover:shadow-lg"
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F8E7A5] text-[#033135] shadow-sm group-hover:scale-105 transition-transform">
                            <Gift size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-white">
                                    Professional Rewards Store Open
                                </h3>
                                <span className="rounded-full bg-[#F8E7A5] px-2.5 py-0.5 text-[10px] font-black text-[#033135] uppercase">
                                    {liveXP.toLocaleString()} XP Ready
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[#C4D7D4]">
                                Redeem your clinical XP for certified CME courses, peer-reviewed medical journal subscriptions &amp; clinic vouchers.
                            </p>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-[#F8E7A5] px-4 py-2.5 text-xs font-black text-[#033135] shadow-xs group-hover:bg-white transition shrink-0">
                        <span>Redeem Rewards</span>
                        <ArrowRight size={13} />
                    </div>
                </div>
            </section>

            {/* 4. Main Two-Column Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Left 2 Columns: Recent Activity & Practice Card */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Recent Activity Feed */}
                    <section className="rounded-2xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-4 border-b border-[#E8EFEB]">
                            <div>
                                <h2 className="text-base font-extrabold text-[#033135]">
                                    Recent Activity & Interactions
                                </h2>
                                <p className="text-xs text-[#647572]">
                                    Likes, comments, peer reviews, and practice milestones.
                                </p>
                            </div>
                            <span className="rounded-full bg-[#FAFBF9] border border-[#E8EFEB] px-2.5 py-1 text-[10px] font-bold text-[#647572]">
                                Demo Activity
                            </span>
                        </div>

                        <div className="mt-4 divide-y divide-[#F0F4F2]">
                            {activities.map((act) => {
                                const Icon = act.icon
                                return (
                                    <div key={act.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${act.iconBg} ${act.iconColor}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-[#033135] leading-relaxed">
                                                {act.text}
                                            </p>
                                            <span className="text-[10px] text-[#9AA6A0] font-medium">
                                                {act.time}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    {/* Practice Profile Quick Summary */}
                    <section className="rounded-2xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-4 border-b border-[#E8EFEB]">
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-[#648C83]" />
                                <h2 className="text-base font-extrabold text-[#033135]">
                                    Practice & Workplace Details
                                </h2>
                            </div>
                            <Link
                                to="/professional/profile"
                                className="text-xs font-bold text-[#033135] hover:text-[#648C83] flex items-center gap-1"
                            >
                                Edit Profile <ArrowRight size={13} />
                            </Link>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3">
                                <span className="text-[10px] font-bold text-[#647572] uppercase">Clinic / Hospital</span>
                                <p className="mt-1 font-bold text-[#033135] text-sm">{workplace}</p>
                                <p className="mt-0.5 text-[#647572] flex items-center gap-1">
                                    <MapPin size={12} className="text-[#9AA6A0]" />
                                    {city} {state ? `, ${state}` : ''}
                                </p>
                            </div>

                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3">
                                <span className="text-[10px] font-bold text-[#647572] uppercase">Qualifications</span>
                                <p className="mt-1 font-bold text-[#033135] text-sm">
                                    {professional?.qualifications || 'Clinical Degree'}
                                </p>
                                <p className="mt-0.5 text-[#647572]">
                                    Reg License: <span className="font-semibold text-[#033135]">{professional?.licenseNumber || 'Under Review'}</span>
                                </p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Right Column: Leaderboard Ranking Preview & Quick Share */}
                <div className="space-y-6">

                    {/* Professional Leaderboard Preview */}
                    <section className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                            <div className="flex items-center gap-2">
                                <Trophy size={18} className="text-[#8B6D25]" />
                                <h2 className="text-sm font-extrabold text-[#033135]">
                                    Leaderboard Standing
                                </h2>
                            </div>
                            <span className="rounded-full bg-[#F8E7A5]/70 px-2 py-0.5 text-[10px] font-black text-[#8B6D25]">
                                Rank #{myRankEntry?.rank || '—'}
                            </span>
                        </div>

                        {/* Your Standing Banner */}
                        <div className="mt-4 rounded-xl bg-gradient-to-r from-[#033135] to-[#324C4D] p-3.5 text-white flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F8E7A5]">
                                    Your Rank
                                </span>
                                <p className="text-lg font-black leading-tight">#{myRankEntry?.rank || '—'} active</p>
                                <p className="text-[10px] text-[#C4D7D4]">Score: {myRankEntry?.score || 0} pts</p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black text-[#F8E7A5]">{liveXP.toLocaleString()}</span>
                                <p className="text-[10px] text-[#C4D7D4]">Pro XP</p>
                            </div>
                        </div>

                        {/* Top 3 List Preview */}
                        <div className="mt-4 space-y-2">
                            {top3.map((entry) => (
                                <div
                                    key={entry.id || entry.rank}
                                    className="flex items-center justify-between rounded-xl p-2 text-xs hover:bg-[#FAFBF9] transition"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${entry.rank === 1
                                            ? 'bg-[#F8E7A5] text-[#8B6D25]'
                                            : entry.rank === 2
                                                ? 'bg-[#E4F0EA] text-[#324C4D]'
                                                : 'bg-[#DCD6F7] text-[#625780]'
                                            }`}>
                                            {entry.rank}
                                        </span>
                                        <div>
                                            <p className="font-bold text-[#033135] truncate max-w-[130px]">
                                                {entry.name}
                                            </p>
                                            <p className="text-[10px] text-[#647572] truncate max-w-[130px]">
                                                {entry.specialty}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-[#033135] text-[11px]">
                                        {(entry.xp || 0).toLocaleString()} XP
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#E8EFEB]">
                            <button
                                onClick={() => navigate('/professional/leaderboard')}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] py-2.5 text-xs font-bold text-[#033135] hover:bg-[#E4F0EA] transition"
                            >
                                <span>View Full Leaderboard</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </section>

                    {/* Quick Practice Share Card */}
                    <section className="rounded-2xl border border-dashed border-[#DCE7E3] bg-[#FAFBF9] p-4 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#E4F0EA] text-[#033135]">
                            <Share2 size={18} />
                        </div>
                        <h3 className="mt-2 text-xs font-bold text-[#033135]">
                            Share Your Practice Profile
                        </h3>
                        <p className="mt-1 text-[11px] text-[#647572]">
                            Share your verified credentials with patients and professional peers.
                        </p>
                        <button
                            type="button"
                            onClick={handleSharePractice}
                            className="mt-3 w-full rounded-xl bg-white border border-[#DCE7E3] py-2 text-xs font-semibold text-[#033135] shadow-xs hover:bg-[#F8FAF7] transition"
                        >
                            Copy Profile Link
                        </button>
                    </section>

                </div>

            </div>
        </div>
    )
}

export default ProfessionalHome
