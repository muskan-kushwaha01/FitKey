import { useState, useEffect, useRef } from 'react'
import { useNavigate, useOutletContext, Link } from 'react-router-dom'
import {
    Clock,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Building2,
    MapPin,
    Zap,
    FileText,
    Eye,
    Heart,
    Star,
    PlusCircle,
    UserRound,
    Trophy,
    ArrowRight,
    TrendingUp,
    Share2,
    Gift,
    PhoneCall,
    MessageSquare,
    Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { fetchAppointments } from '../../services/professional/professionalConsultationService.js'
import { supabase } from '../../lib/supabase.js'
import { loadProfXPData, getAvailableProfXP } from '../../services/professional/professionalXpService.js'
import { loadLeaderboard, getLeaderboardRankings, getProfessionalRank } from '../../services/professional/professionalLeaderboardService.js'
import { isMigrationDone, runProfessionalMigration } from '../../services/professional/professionalMigrationService.js'
import { getPosts } from '../../services/professional/professionalContentService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

// ─── Verification status helpers ─────────────────────────────────────────────

function resolveVerificationState(raw) {
    const s = String(raw || '').toLowerCase().trim()
    if (s === 'verified practitioner' || s === 'verified' || s === 'approved') {
        return 'verified'
    }
    if (s === 'rejected') return 'rejected'
    return 'pending'
}

function VerificationBanner({ verificationStatus }) {
    const state = resolveVerificationState(verificationStatus)
    const rawStatus = String(verificationStatus || 'Pending Verification').trim()
    const statusLabel = state === 'verified'
        ? 'Verified Practitioner'
        : state === 'rejected'
            ? 'Rejected'
            : rawStatus.toLowerCase() === 'pending' ? 'Pending Verification' : rawStatus

    if (state === 'verified') {
        return (
            <section className="relative overflow-hidden rounded-2xl border border-[#2F7B58]/30 bg-gradient-to-r from-[#E4F0EA]/60 via-[#F8FAF7] to-[#E4F0EA]/40 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E4F0EA] text-[#2F7B58] shadow-xs">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-[#033135]">
                                Profile Verification: {statusLabel}
                            </h3>
                            <span className="rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[10px] font-black text-[#2F7B58] uppercase tracking-wide">
                                Active
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-[#647572] max-w-2xl leading-relaxed">
                            Your credentials are verified. All professional features are fully active.
                        </p>
                    </div>
                </div>
            </section>
        )
    }

    if (state === 'rejected') {
        return (
            <section className="relative overflow-hidden rounded-2xl border border-[#C0563B]/30 bg-gradient-to-r from-[#FFD9C7]/30 via-[#F8FAF7] to-[#FFD9C7]/20 p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFD9C7] text-[#C0563B] shadow-xs">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Verification: Documents Not Accepted
                                </h3>
                                <span className="rounded-full bg-[#FFD9C7] px-2.5 py-0.5 text-[10px] font-black text-[#C0563B] uppercase tracking-wide">
                                    Action Required
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#647572] max-w-2xl leading-relaxed">
                                Your submitted documents could not be verified. Please update your profile with valid credentials and resubmit.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/professional/profile"
                        className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-[#C0563B] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#A54530] transition shrink-0"
                    >
                        <ShieldCheck size={14} />
                        <span>Update Documents</span>
                    </Link>
                </div>
            </section>
        )
    }

    // pending (default)
    return (
        <section className="relative overflow-hidden rounded-2xl border border-[#E0AE3A]/40 bg-gradient-to-r from-[#F8E7A5]/40 via-[#F8FAF7] to-[#E4F0EA]/50 p-4 sm:p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8E7A5] text-[#8B6D25] shadow-xs">
                    <Clock size={22} />
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#033135]">
                                Profile Verification: {statusLabel}
                        </h3>
                        <span className="rounded-full bg-[#F8E7A5] px-2.5 py-0.5 text-[10px] font-black text-[#8B6D25] uppercase tracking-wide">
                            Pending
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-[#647572] max-w-2xl leading-relaxed">
                        Your qualifications and documents are securely recorded and are being reviewed by our clinical team. Consultation bookings will be enabled once verified.
                    </p>
                </div>
            </div>
        </section>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ProfessionalHome() {
    const navigate = useNavigate()
    const { professional } = useOutletContext() || {}
    const isMountedRef = useRef(true)

    useEffect(() => {
        isMountedRef.current = true
        return () => { isMountedRef.current = false }
    }, [])

    const displayName = professional?.fullName || professional?.name || 'Doctor'
    const profession = professional?.profession || 'Healthcare Professional'
    const specialization = professional?.specialization || 'Clinical Wellness'
    const workplace = professional?.workplaceName || 'Private Practice Clinic'
    const city = professional?.city || 'India'
    const state = professional?.state || ''
    const verificationStatus = professional?.verificationStatus || 'Pending Verification'

    // ── Dashboard summary from Supabase (async) ──
    const [dashSummary, setDashSummary] = useState(null)
    const [dashboardPosts, setDashboardPosts] = useState([])
    const [dashLoading, setDashLoading] = useState(false)
    const [dashError, setDashError] = useState(null)

    // ── XP (async from Supabase, cached sync fallback) ──
    const [liveXP, setLiveXP] = useState(() => getAvailableProfXP(professional?.id))

    // ── Leaderboard (async from Supabase, cached sync fallback) ──
    const [myRankEntry, setMyRankEntry] = useState(() => getProfessionalRank(professional?.id))
    const [top3, setTop3] = useState(() => getLeaderboardRankings().slice(0, 3).map((r) => ({
        id: r.professional?.id || `leader-${r.rank}`,
        rank: r.rank,
        name: r.professional?.fullName || r.professional?.name || 'Verified Practitioner',
        specialty: r.professional?.specialization || 'Specialist',
        xp: r.availableXP || 0,
    })))

    // ── Upcoming appointments (Supabase, async) ──
    const [upcomingAppointments, setUpcomingAppointments] = useState([])
    const [aptsLoading, setAptsLoading] = useState(false)
    const [aptsError, setAptsError] = useState(null)

    // ── Load all dashboard data ──
    useEffect(() => {
        if (!professional?.id) return

        // Run legacy migration once silently in background
        if (!isMigrationDone(professional.id)) {
            runProfessionalMigration(professional.id).catch(() => { /* silent */ })
        }

        setDashLoading(true)
        setAptsLoading(true)
        setDashError(null)
        setAptsError(null)

        // Parallel: dashboard summary + appointments + XP + leaderboard
        const dashPromise = Promise.all([
            supabase.rpc('get_prof_dashboard_summary'),
            getPosts({ professionalId: professional.id }),
        ]).then(([{ data, error }, posts]) => {
            if (!isMountedRef.current) return
            if (!error && data?.success) {
                setDashSummary(data)
            } else {
                setDashError(error?.message || 'Failed to load dashboard data.')
            }
            setDashboardPosts(posts)
            setDashLoading(false)
        }).catch((error) => {
            if (!isMountedRef.current) return
            setDashError(error?.message || 'Failed to load professional content.')
            setDashLoading(false)
        })

        const xpPromise = loadProfXPData(professional.id).then((result) => {
            if (!isMountedRef.current) return
            if (result?.success) setLiveXP(result.availableXP ?? 0)
        })

        const boardPromise = loadLeaderboard(20).then((result) => {
            if (!isMountedRef.current) return
            if (result?.success) {
                const myEntry = result.entries.find((e) => e.professionalId === professional.id)
                if (myEntry) {
                    setMyRankEntry({ rank: myEntry.rank, score: myEntry.score, lifetimeXP: myEntry.lifetimeXP })
                }
                setTop3(result.entries.slice(0, 3).map((e) => ({
                    id: e.professionalId,
                    rank: e.rank,
                    name: e.fullName,
                    specialty: e.specialization,
                    xp: e.availableXP,
                })))
            }
        })

        fetchAppointments(professional.id, { status: 'upcoming' })
            .then((result) => {
                if (!isMountedRef.current) return
                if (result?.success && Array.isArray(result.appointments)) {
                    const upcoming = result.appointments.filter(
                        (a) => a.status === 'upcoming' || a.rawStatus === 'upcoming' || a.rawStatus === 'confirmed'
                    )
                    setUpcomingAppointments(upcoming)
                } else {
                    setUpcomingAppointments([])
                    if (result?.error) setAptsError(result.error)
                }
            })
            .catch(() => {
                if (!isMountedRef.current) return
                setUpcomingAppointments([])
                setAptsError('Could not load appointments.')
            })
            .finally(() => {
                if (isMountedRef.current) setAptsLoading(false)
            })

        return () => { /* cleanup handled by isMountedRef */ }
    }, [professional?.id])

    // ── Computed values from dashboard summary ──
    const publishedCount = dashboardPosts.length
    const approvedCount = dashboardPosts.filter((post) => post.approvalStatus === 'approved' && post.isPublished).length
    const totalViews = dashboardPosts.reduce((sum, post) => sum + Number(post.viewsCount || 0), 0)
    const totalLikes = dashboardPosts.reduce((sum, post) => sum + Number(post.likesCount || 0), 0)
    const reviewCount = dashSummary?.review_count ?? 0
    const avgRating = Number(dashSummary?.avg_rating ?? 0)
    const recentReviews = Array.isArray(dashSummary?.recent_reviews) ? dashSummary.recent_reviews : []
    const recentActivities = Array.isArray(dashSummary?.recent_activities) ? dashSummary.recent_activities : []

    // ── Actions ──
    const handleCreateContent = () => navigate('/professional/content/create')

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
            {/* 1. Header Greeting */}
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

            {/* 2. Verification Status — dynamic, no self-verification */}
            <VerificationBanner verificationStatus={verificationStatus} />

            {/* 3. Upcoming Consultations (Supabase) */}
            {aptsLoading && (
                <section className="rounded-2xl border border-[#DCE7E3] bg-white p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs text-[#647572]">
                        <Loader2 size={14} className="animate-spin" />
                        Loading upcoming consultations…
                    </div>
                </section>
            )}

            {!aptsLoading && aptsError && (
                <section className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <p className="text-xs text-[#9AA6A0]">
                        Could not load upcoming appointments. <Link to="/professional/consultations/appointments" className="underline">View all appointments</Link>
                    </p>
                </section>
            )}

            {!aptsLoading && !aptsError && upcomingAppointments.length > 0 && (
                <section className="rounded-2xl border border-[#DCE7E3] bg-white p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EFEB] pb-3 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E4F0EA] text-[#033135]">
                                <PhoneCall size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Upcoming Consultations ({upcomingAppointments.length})
                                </h3>
                                <p className="text-[11px] text-[#647572]">
                                    Scheduled patient appointments awaiting consultation.
                                </p>
                            </div>
                        </div>

                        <Link
                            to="/professional/consultations/appointments"
                            className="text-xs font-bold text-[#033135] hover:text-[#648C83] flex items-center gap-1 transition self-start sm:self-auto"
                        >
                            <span>View All Appointments</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {upcomingAppointments.slice(0, 2).map((apt) => (
                            <div
                                key={apt.id}
                                className="flex items-center justify-between rounded-xl border border-[#E8EFEB] bg-[#FAFBF9] p-3.5 hover:border-[#C4D7D4] transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E8EFEB] text-[#033135] font-bold text-xs">
                                        {apt.patientName?.charAt(0) || 'P'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-[#033135]">
                                            {apt.patientName}
                                        </p>
                                        <p className="text-[11px] text-[#647572]">
                                            {apt.date} · {apt.time} ({apt.durationMinutes}m)
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    to="/professional/consultations/appointments"
                                    className="rounded-lg bg-[#033135] px-3.5 py-1.5 text-[11px] font-bold !text-white hover:bg-[#324C4D] transition shadow-xs"
                                    style={{ color: '#ffffff' }}
                                >
                                    Open
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 4. Core Metrics Grid — Supabase-backed */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Available XP */}
                <div
                    onClick={() => navigate('/professional/xp?tab=redeem')}
                    className="group flex flex-col justify-between rounded-2xl border-2 border-[#E0AE3A]/40 bg-gradient-to-br from-[#F8E7A5]/25 via-white to-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#8B6D25] truncate">
                                Available XP
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#F8E7A5] text-[#8B6D25]">
                                <Zap size={14} className="sm:w-4 sm:h-4" fill="currentColor" />
                            </div>
                        </div>
                        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
                            {dashLoading ? (
                                <Loader2 size={18} className="animate-spin text-[#8B6D25]" />
                            ) : (
                                <>
                                    <span className="text-2xl sm:text-3xl font-black text-[#033135] tracking-tight leading-none">
                                        {liveXP.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] sm:text-xs font-bold text-[#8B6D25]">XP</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E8EFEB] text-[10px] sm:text-[11px]">
                        <span className="font-bold text-[#2F7B58] truncate">Ready to redeem</span>
                        <span className="font-extrabold text-[#033135] group-hover:text-[#648C83] flex items-center gap-0.5 shrink-0">
                            Redeem <ArrowRight size={11} />
                        </span>
                    </div>
                </div>

                {/* Published Posts */}
                <div
                    onClick={() => navigate('/professional/profile')}
                    className="group flex flex-col justify-between rounded-2xl border border-[#E8EFEB] bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-sm cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#647572] truncate">
                                Published Posts
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#324C4D]">
                                <FileText size={14} className="sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
                            {dashLoading ? (
                                <Loader2 size={18} className="animate-spin text-[#647572]" />
                            ) : (
                                <>
                                    <span className="text-2xl sm:text-3xl font-black text-[#033135] tracking-tight leading-none">
                                        {publishedCount}
                                    </span>
                                <span className="text-[11px] sm:text-xs font-medium text-[#647572] truncate">uploaded posts</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E8EFEB] text-[10px] sm:text-[11px]">
                        {publishedCount > 0 ? (
                            <span className="font-semibold text-[#2F7B58] flex items-center gap-1 truncate">
                                <TrendingUp size={11} className="shrink-0" /> {approvedCount} approved
                            </span>
                        ) : (
                            <span className="font-medium text-[#9AA6A0] truncate">No posts yet</span>
                        )}
                        <span className="text-[#9AA6A0] font-medium hidden xs:inline shrink-0">Active</span>
                    </div>
                </div>

                {/* Content Views (Supabase community_posts.views_count) */}
                <div
                    onClick={() => navigate('/professional/profile')}
                    className="group flex flex-col justify-between rounded-2xl border border-[#E8EFEB] bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-sm cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#647572] truncate">
                                Content Views
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#DCD6F7] text-[#625780]">
                                <Eye size={14} className="sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
                            {dashLoading ? (
                                <Loader2 size={18} className="animate-spin text-[#647572]" />
                            ) : publishedCount > 0 ? (
                                <>
                                    <span className="text-2xl sm:text-3xl font-black text-[#033135] tracking-tight leading-none">
                                        {totalViews >= 1000
                                            ? `${(totalViews / 1000).toFixed(1)}K`
                                            : totalViews.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] sm:text-xs font-medium text-[#647572] truncate">views</span>
                                </>
                            ) : (
                                <span className="text-sm font-semibold text-[#9AA6A0]">—</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E8EFEB] text-[10px] sm:text-[11px]">
                        <span className="font-medium text-[#9AA6A0] truncate">
                            {publishedCount > 0 ? 'Persistent views' : 'No data yet'}
                        </span>
                        <span className="text-[#9AA6A0] font-medium hidden xs:inline shrink-0">Views</span>
                    </div>
                </div>

                {/* Total Likes (Supabase community_posts.likes_count) */}
                <div
                    onClick={() => navigate('/professional/profile')}
                    className="group flex flex-col justify-between rounded-2xl border border-[#E8EFEB] bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-sm cursor-pointer"
                >
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#647572] truncate">
                                Total Likes
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFD9C7] text-[#A45E45]">
                                <Heart size={14} className="sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
                            {dashLoading ? (
                                <Loader2 size={18} className="animate-spin text-[#647572]" />
                            ) : publishedCount > 0 ? (
                                <>
                                    <span className="text-2xl sm:text-3xl font-black text-[#033135] tracking-tight leading-none">
                                        {totalLikes.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] sm:text-xs font-medium text-[#647572] truncate">likes</span>
                                </>
                            ) : (
                                <span className="text-sm font-semibold text-[#9AA6A0]">—</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E8EFEB] text-[10px] sm:text-[11px]">
                        <span className="font-medium text-[#647572] flex items-center gap-1 truncate">
                            <Heart size={11} className="text-[#C0563B] shrink-0" fill="currentColor" /> Likes
                        </span>
                        <span className="text-[#9AA6A0] font-medium hidden xs:inline shrink-0">
                            {publishedCount > 0 ? 'Live count' : 'No data'}
                        </span>
                    </div>
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
                            <div className="flex items-center gap-2 flex-wrap">
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

            {/* 5. Main Two-Column Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Left 2/3: Activity + Practice */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Recent Activity — Supabase professional_activities + reviews */}
                    <section className="rounded-2xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-4 border-b border-[#E8EFEB]">
                            <div>
                                <h2 className="text-base font-extrabold text-[#033135]">
                                    Recent Activity &amp; Interactions
                                </h2>
                                <p className="text-xs text-[#647572]">
                                    Patient reviews and engagement from your content.
                                </p>
                            </div>
                        </div>

                        {dashLoading && (
                            <div className="flex items-center gap-2 mt-4 text-xs text-[#647572]">
                                <Loader2 size={14} className="animate-spin" />
                                Loading activity…
                            </div>
                        )}

                        {!dashLoading && recentReviews.length === 0 && recentActivities.length === 0 && (
                            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F7F5] text-[#9AA6A0]">
                                    <MessageSquare size={22} />
                                </div>
                                <p className="text-sm font-semibold text-[#324C4D]">No activity yet</p>
                                <p className="text-xs text-[#9AA6A0] max-w-xs">
                                    Patient reviews, likes and comments on your content will appear here as they come in.
                                </p>
                            </div>
                        )}

                        {/* Show recent reviews */}
                        {!dashLoading && recentReviews.length > 0 && (
                            <div className="mt-4 divide-y divide-[#F0F4F2]">
                                {recentReviews.slice(0, 4).map((r) => (
                                    <div key={r.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8E7A5] text-[#8B6D25]">
                                            <Star size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-[#033135] leading-relaxed">
                                                <span className="font-bold">{r.rating}★</span> review from{' '}
                                                <span className="font-semibold">{r.reviewer_name || 'Patient'}</span>
                                                {r.comment ? `: "${r.comment.slice(0, 80)}${r.comment.length > 80 ? '…' : ''}"` : ''}
                                            </p>
                                            <span className="text-[10px] text-[#9AA6A0] font-medium">
                                                {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Show activities if no reviews */}
                        {!dashLoading && recentReviews.length === 0 && recentActivities.length > 0 && (
                            <div className="mt-4 divide-y divide-[#F0F4F2]">
                                {recentActivities.slice(0, 4).map((a) => (
                                    <div key={a.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#2F7B58]">
                                            <Zap size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-[#033135] leading-relaxed">{a.title}</p>
                                            <span className="text-[10px] text-[#9AA6A0] font-medium">
                                                {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Practice Profile Quick Summary */}
                    <section className="rounded-2xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-4 border-b border-[#E8EFEB]">
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-[#648C83]" />
                                <h2 className="text-base font-extrabold text-[#033135]">
                                    Practice &amp; Workplace Details
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
                                    {city}{state ? `, ${state}` : ''}
                                </p>
                            </div>

                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3">
                                <span className="text-[10px] font-bold text-[#647572] uppercase">Qualifications</span>
                                <p className="mt-1 font-bold text-[#033135] text-sm">
                                    {professional?.qualifications || '—'}
                                </p>
                                <p className="mt-0.5 text-[#647572]">
                                    Reg. No.:{' '}
                                    <span className="font-semibold text-[#033135]">
                                        {professional?.licenseNumber || 'Under Review'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right 1/3: Leaderboard + Share */}
                <div className="space-y-6">

                    {/* Leaderboard Preview — Supabase-backed */}
                    <section className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8EFEB]">
                            <div className="flex items-center gap-2">
                                <Trophy size={18} className="text-[#8B6D25]" />
                                <h2 className="text-sm font-extrabold text-[#033135]">
                                    Leaderboard Standing
                                </h2>
                            </div>
                            <span className="rounded-full bg-[#F8E7A5]/70 px-2 py-0.5 text-[10px] font-black text-[#8B6D25]">
                                {myRankEntry ? `Rank #${myRankEntry.rank}` : 'Unranked'}
                            </span>
                        </div>

                        {/* Your Standing Banner */}
                        <div className="mt-4 rounded-xl bg-gradient-to-r from-[#033135] to-[#324C4D] p-3.5 text-white flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F8E7A5]">
                                    Your Rank
                                </span>
                                <p className="text-lg font-black leading-tight">
                                    {myRankEntry ? `#${myRankEntry.rank}` : '—'}
                                </p>
                                <p className="text-[10px] text-[#C4D7D4]">
                                    Score: {myRankEntry ? (myRankEntry.score || 0).toLocaleString() : 0} pts
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black text-[#F8E7A5]">{liveXP.toLocaleString()}</span>
                                <p className="text-[10px] text-[#C4D7D4]">Pro XP</p>
                            </div>
                        </div>

                        {/* Top 3 — real Supabase data */}
                        {top3.length === 0 ? (
                            <div className="mt-4 py-4 text-center">
                                <p className="text-xs text-[#9AA6A0]">No ranked professionals yet.</p>
                                <p className="text-[11px] text-[#9AA6A0] mt-1">Complete verification to appear on the leaderboard.</p>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-2">
                                {top3.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between rounded-xl p-2 text-xs hover:bg-[#FAFBF9] transition"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                                                entry.rank === 1 ? 'bg-[#F8E7A5] text-[#8B6D25]'
                                                    : entry.rank === 2 ? 'bg-[#E4F0EA] text-[#324C4D]'
                                                    : 'bg-[#DCD6F7] text-[#625780]'
                                            }`}>
                                                {entry.rank}
                                            </span>
                                            <div>
                                                <p className="font-bold text-[#033135] truncate max-w-[130px]">{entry.name}</p>
                                                <p className="text-[10px] text-[#647572] truncate max-w-[130px]">{entry.specialty}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-[#033135] text-[11px]">
                                            {(entry.xp || 0).toLocaleString()} XP
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

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
