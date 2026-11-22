import { Star, MessageCircle, ThumbsUp } from 'lucide-react'

function StarRow({ rating, size = 14, className = '' }) {
    return (
        <div className={`flex items-center gap-0.5 ${className}`}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    size={size}
                    className={s <= Math.round(rating) ? 'text-[#E0AE3A]' : 'text-[#DCE7E3]'}
                    fill={s <= Math.round(rating) ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    )
}

function DistributionBar({ label, count, total }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return (
        <div className="flex items-center gap-2">
            <span className="w-4 text-right text-[11px] font-semibold text-[#324C4D]">{label}</span>
            <Star size={10} className="text-[#E0AE3A] shrink-0" fill="currentColor" />
            <div className="flex-1 h-2 bg-[#E8EFEB] rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#E0AE3A] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-5 text-[11px] text-[#9AA6A0]">{count}</span>
        </div>
    )
}

function ReviewCard({ review }) {
    const date = review.updatedAt || review.createdAt
    const formatted = date
        ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''

    return (
        <div className="rounded-xl border border-[#E8EFEB] bg-[#FAFBF9] p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold text-[#033135]">{review.userName}</p>
                    <p className="text-[10px] text-[#9AA6A0]">{formatted}</p>
                </div>
                <StarRow rating={review.rating} size={12} />
            </div>
            {review.comment && (
                <p className="text-xs leading-5 text-[#4A5C58]">{review.comment}</p>
            )}
        </div>
    )
}

/**
 * ProfessionalReviews
 * Props:
 *   ratingSummary: { avg, total, distribution: {1,2,3,4,5} }
 *   reviews: Review[]
 *   showTitle?: boolean
 */
function ProfessionalReviews({ ratingSummary, reviews, showTitle = true }) {
    const { avg = 0, total = 0, distribution = {} } = ratingSummary || {}

    if (total === 0) {
        return (
            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 text-center">
                {showTitle && (
                    <h3 className="mb-3 text-sm font-bold text-[#033135]">Patient &amp; Peer Reviews</h3>
                )}
                <div className="flex flex-col items-center gap-2 py-4">
                    <Star size={28} className="text-[#DCE7E3]" />
                    <p className="text-sm text-[#647572]">No reviews yet.</p>
                    <p className="text-xs text-[#9AA6A0]">Reviews from verified users will appear here.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4">
            {showTitle && (
                <h3 className="text-sm font-bold text-[#033135]">Patient &amp; Peer Reviews</h3>
            )}

            {/* Summary */}
            <div className="flex items-center gap-5">
                {/* Big average */}
                <div className="text-center shrink-0">
                    <p className="text-4xl font-black text-[#033135]">{avg.toFixed(1)}</p>
                    <StarRow rating={avg} size={13} className="mt-1 justify-center" />
                    <p className="mt-1 text-[10px] text-[#9AA6A0]">{total} review{total !== 1 ? 's' : ''}</p>
                </div>

                {/* Distribution bars */}
                <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => (
                        <DistributionBar
                            key={star}
                            label={star}
                            count={distribution[star] || 0}
                            total={total}
                        />
                    ))}
                </div>
            </div>

            {/* Individual reviews */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                {reviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                ))}
            </div>
        </div>
    )
}

export default ProfessionalReviews
export { StarRow, DistributionBar }
