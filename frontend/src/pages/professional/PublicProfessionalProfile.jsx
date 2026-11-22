import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, BadgeCheck, Star, MapPin, Briefcase,
    Award, Building2, Shield, FileText, Video, MessageCircle,
    Phone, User, Edit3, Trash2, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getPublicProfessionalProfile } from '../../services/professional/professionalDiscoveryService.js'
import {
    getCommunityUser,
    setCommunityUserName,
    submitReview,
    editReview,
    deleteReview,
    getUserReviewForProfessional,
} from '../../services/professional/professionalReviewService.js'
import { getRatingSummary, getReviewsForProfessional } from '../../services/professional/professionalReviewService.js'
import ProfessionalReviews, { StarRow } from '../../components/professional/ProfessionalReviews.jsx'
import ProfessionalContentGrid from '../../components/professional/ProfessionalContentGrid.jsx'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ─── Star Selector ────────────────────────────────────────────────────────────

function StarSelector({ value, onChange }) {
    const [hovered, setHovered] = useState(0)
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
                <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(s)}
                    aria-label={`${s} star`}
                    className="transition"
                >
                    <Star
                        size={26}
                        className={s <= (hovered || value) ? 'text-[#E0AE3A]' : 'text-[#DCE7E3]'}
                        fill={s <= (hovered || value) ? 'currentColor' : 'none'}
                    />
                </button>
            ))}
        </div>
    )
}

// ─── Review Form ──────────────────────────────────────────────────────────────

function ReviewForm({ professionalId, existingReview, communityUser, onSubmit, onCancel }) {
    const [name, setName] = useState(communityUser.name === 'Community Member' ? '' : communityUser.name)
    const [rating, setRating] = useState(existingReview?.rating || 0)
    const [comment, setComment] = useState(existingReview?.comment || '')
    const [loading, setLoading] = useState(false)

    const isEditing = !!existingReview

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!rating) { toast.error('Please select a star rating.'); return }

        const finalName = name.trim() || 'Community Member'
        if (!isEditing) setCommunityUserName(finalName)

        setLoading(true)
        try {
            if (isEditing) {
                const res = editReview({ reviewId: existingReview.id, userId: communityUser.id, rating, comment })
                if (res.success) {
                    toast.success('Review updated!')
                    onSubmit()
                } else {
                    toast.error(res.error || 'Failed to update review.')
                }
            } else {
                const res = submitReview({
                    userId: communityUser.id,
                    userName: finalName,
                    professionalId,
                    rating,
                    comment,
                })
                if (res.success) {
                    toast.success('Review submitted! Thank you.')
                    onSubmit()
                } else {
                    toast.error(res.error || 'Could not submit review.')
                }
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {!isEditing && (
                <div>
                    <label className="block mb-1 text-xs font-semibold text-[#324C4D]">Your Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3.5 py-2.5 text-xs outline-none focus:border-[#648C83] focus:ring-2 focus:ring-[#E4F0EA]"
                    />
                </div>
            )}

            <div>
                <label className="block mb-2 text-xs font-semibold text-[#324C4D]">Your Rating *</label>
                <StarSelector value={rating} onChange={setRating} />
                {rating > 0 && (
                    <p className="mt-1 text-[11px] text-[#9AA6A0]">
                        {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                    </p>
                )}
            </div>

            <div>
                <label className="block mb-1 text-xs font-semibold text-[#324C4D]">
                    Comment <span className="font-normal text-[#9AA6A0]">(optional)</span>
                </label>
                <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this professional..."
                    className="w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3.5 py-2.5 text-xs outline-none focus:border-[#648C83] focus:ring-2 focus:ring-[#E4F0EA] resize-none"
                />
            </div>

            <div className="flex gap-2 pt-1">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-xl border border-[#DCE7E3] py-2.5 text-xs font-semibold text-[#647572]"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading || !rating}
                    className="flex-1 rounded-xl bg-[#033135] py-2.5 text-xs font-bold text-white disabled:opacity-50 transition hover:bg-[#324C4D]"
                >
                    {loading ? 'Submitting…' : isEditing ? 'Update Review' : 'Submit Review'}
                </button>
            </div>
        </form>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function PublicProfessionalProfile() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [data, setData] = useState(null)
    const [notFound, setNotFound] = useState(false)
    const [communityUser] = useState(() => getCommunityUser())
    const [userReview, setUserReview] = useState(null)
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [editing, setEditing] = useState(false)
    const [ratingSummary, setRatingSummary] = useState({ avg: 0, total: 0, distribution: {} })
    const [reviews, setReviews] = useState([])

    const refresh = useCallback(() => {
        const profile = getPublicProfessionalProfile(id)
        if (!profile) { setNotFound(true); return }
        setData(profile)
        setRatingSummary(getRatingSummary(id))
        const allReviews = getReviewsForProfessional(id)
        setReviews(allReviews)
        setUserReview(getUserReviewForProfessional(communityUser.id, id))
    }, [id, communityUser.id])

    useEffect(() => { refresh() }, [refresh])

    const handleDelete = () => {
        if (!userReview) return
        const res = deleteReview({ reviewId: userReview.id, userId: communityUser.id })
        if (res.success) {
            toast.success('Review removed.')
            refresh()
        } else {
            toast.error(res.error || 'Could not remove review.')
        }
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-[#F8FAF7] flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                    <AlertCircle size={40} className="mx-auto text-[#9AA6A0]" />
                    <p className="font-bold text-[#033135]">Professional not found</p>
                    <button onClick={() => navigate(-1)} className="text-sm text-[#324C4D] font-semibold">
                        ← Go back
                    </button>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-[#F8FAF7] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
    }

    const { professional, posts } = data
    const isVerified = (professional.verificationStatus || '').toLowerCase().includes('verified')
    const displayName = professional.fullName || professional.name
    const initials = getInitials(displayName)

    return (
        <div className="min-h-screen bg-[#F8FAF7]">
            {/* Top bar */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E8EFEB] px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0F4F2] text-[#033135] hover:bg-[#E4F0EA] transition"
                    aria-label="Back"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#033135]">{displayName}</p>
                    <p className="truncate text-[11px] text-[#9AA6A0]">{professional.specialization}</p>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 pb-16 space-y-5 pt-5">

                {/* ── 1. Profile Header ─────────────────────────────────────── */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="shrink-0">
                            {professional.photoUrl ? (
                                <img
                                    src={professional.photoUrl}
                                    alt={displayName}
                                    className="h-20 w-20 rounded-2xl object-cover ring-2 ring-[#E4F0EA]"
                                />
                            ) : (
                                <div className="h-20 w-20 rounded-2xl bg-[#E4F0EA] flex items-center justify-center text-2xl font-black text-[#033135]">
                                    {initials}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                                <h1 className="text-lg font-bold text-[#033135] leading-snug" style={{ fontFamily: SERIF }}>
                                    {displayName}
                                </h1>
                                {isVerified && (
                                    <BadgeCheck size={18} className="text-[#6B5B95] shrink-0 mt-0.5" />
                                )}
                            </div>
                            <p className="text-xs text-[#647572] mt-0.5">{professional.profession}</p>
                            <p className="text-xs font-semibold text-[#324C4D] mt-0.5">{professional.specialization}</p>

                            {/* Verification badge */}
                            <span className={`inline-flex items-center gap-1 mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isVerified
                                    ? 'bg-[#E4F0EA] text-[#2F7B58]'
                                    : 'bg-[#FFF3E0] text-[#A06920]'
                            }`}>
                                <Shield size={9} />
                                {professional.verificationStatus || 'Pending Verification'}
                            </span>
                        </div>
                    </div>

                    {/* Rating summary inline */}
                    {ratingSummary.total > 0 && (
                        <div className="flex items-center gap-2 border-t border-[#F0F4F2] pt-3">
                            <StarRow rating={ratingSummary.avg} size={14} />
                            <span className="text-sm font-bold text-[#033135]">{ratingSummary.avg.toFixed(1)}</span>
                            <span className="text-xs text-[#9AA6A0]">({ratingSummary.total} review{ratingSummary.total !== 1 ? 's' : ''})</span>
                        </div>
                    )}

                    {/* Bio */}
                    {professional.bio && (
                        <p className="text-xs leading-5 text-[#647572] border-t border-[#F0F4F2] pt-3">
                            {professional.bio}
                        </p>
                    )}
                </div>

                {/* ── 2. Credentials ───────────────────────────────────────── */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-3">
                    <h2 className="text-sm font-bold text-[#033135]">Credentials &amp; Practice</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {professional.qualifications && (
                            <div className="flex items-start gap-2">
                                <Award size={14} className="text-[#648C83] shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-[#033135]">Qualifications</p>
                                    <p className="text-[#647572]">{professional.qualifications}</p>
                                </div>
                            </div>
                        )}
                        {professional.yearsExperience && (
                            <div className="flex items-start gap-2">
                                <Briefcase size={14} className="text-[#648C83] shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-[#033135]">Experience</p>
                                    <p className="text-[#647572]">{professional.yearsExperience} years</p>
                                </div>
                            </div>
                        )}
                        {professional.licenseNumber && (
                            <div className="flex items-start gap-2">
                                <Shield size={14} className="text-[#648C83] shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-[#033135]">License / Registration</p>
                                    <p className="text-[#647572]">{professional.licenseNumber}</p>
                                </div>
                            </div>
                        )}
                        {professional.workplaceName && (
                            <div className="flex items-start gap-2">
                                <Building2 size={14} className="text-[#648C83] shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-[#033135]">Clinic / Hospital</p>
                                    <p className="text-[#647572]">{professional.workplaceName}</p>
                                    {professional.workplaceAddress && (
                                        <p className="text-[#9AA6A0]">{professional.workplaceAddress}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {(professional.city || professional.state) && (
                            <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-[#648C83] shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-[#033135]">Location</p>
                                    <p className="text-[#647572]">
                                        {[professional.city, professional.state].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            </div>
                        )}
                        {professional.phone && (
                            <div className="flex items-start gap-2">
                                <Phone size={14} className="text-[#648C83] shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-[#033135]">Contact</p>
                                    <p className="text-[#647572]">{professional.phone}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 3. Rating Summary + Reviews ──────────────────────────── */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-5">
                    <h2 className="text-sm font-bold text-[#033135]">Ratings &amp; Reviews</h2>

                    <ProfessionalReviews
                        ratingSummary={ratingSummary}
                        reviews={reviews}
                        showTitle={false}
                    />

                    {/* Review CTA / Form */}
                    <div className="border-t border-[#E8EFEB] pt-4">
                        {userReview && !editing ? (
                            /* Show my existing review */
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-[#033135]">Your Review</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="flex items-center gap-1 text-[11px] font-semibold text-[#324C4D] hover:text-[#033135]"
                                        >
                                            <Edit3 size={12} /> Edit
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-600"
                                        >
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-[#F8FAF7] border border-[#E8EFEB] p-3 space-y-1.5">
                                    <StarRow rating={userReview.rating} size={13} />
                                    {userReview.comment && (
                                        <p className="text-xs text-[#4A5C58]">{userReview.comment}</p>
                                    )}
                                </div>
                            </div>
                        ) : userReview && editing ? (
                            /* Edit form */
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-[#033135]">Edit Your Review</p>
                                <ReviewForm
                                    professionalId={id}
                                    existingReview={userReview}
                                    communityUser={communityUser}
                                    onSubmit={() => { setEditing(false); refresh() }}
                                    onCancel={() => setEditing(false)}
                                />
                            </div>
                        ) : showReviewForm ? (
                            /* New review form */
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-[#033135]">Rate this Professional</p>
                                <ReviewForm
                                    professionalId={id}
                                    communityUser={communityUser}
                                    onSubmit={() => { setShowReviewForm(false); refresh() }}
                                    onCancel={() => setShowReviewForm(false)}
                                />
                            </div>
                        ) : (
                            /* Button to open form */
                            <div className="text-center py-2">
                                <p className="text-xs text-[#647572] mb-3">
                                    Have you consulted or engaged with this professional?
                                </p>
                                <button
                                    onClick={() => setShowReviewForm(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#033135] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#324C4D] transition"
                                >
                                    <Star size={14} />
                                    Write a Review
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 4. Published Content ─────────────────────────────────── */}
                {posts.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-bold text-[#033135]">Published Content</h2>
                        <ProfessionalContentGrid
                            posts={posts}
                            currentUserId={communityUser.id}
                            currentUserName={communityUser.name}
                            readOnly
                        />
                    </section>
                )}
            </div>
        </div>
    )
}

export default PublicProfessionalProfile
