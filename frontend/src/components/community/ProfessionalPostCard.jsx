import { useState, useEffect, useRef } from 'react'
import {
    Heart, MessageCircle, Play, BadgeCheck, X,
    FileText, Video, MessageSquare, Clock, ArrowRight,
    Quote, Send, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext.jsx'
import {
    togglePostLike,
    fetchPostComments,
    addPostComment,
    deletePostComment,
} from '../../services/communityService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function getTargetAuthorId(post) {
    if (!post || post.isCurated) return null
    return post.navigableAuthorId || post.authorId || null
}

function usePostLike(post, userId, onPostUpdated) {
    const [optimistic, setOptimistic] = useState(null)
    const [pending, setPending] = useState(false)

    const isSamePost = optimistic && optimistic.postId === post?.id
    const liked = isSamePost ? optimistic.liked : Boolean(post?.likedByMe)
    const likesCount = isSamePost ? optimistic.likesCount : (post?.likesCount ?? post?.likes ?? 0)

    const handleLike = async (e) => {
        e.stopPropagation()
        if (!post?.id || pending) return
        if (!userId) {
            toast.error('Please sign in to like posts.')
            return
        }

        const prevLiked = liked
        const prevCount = likesCount
        const optimisticLiked = !prevLiked
        const optimisticCount = Math.max(0, prevCount + (optimisticLiked ? 1 : -1))

        setOptimistic({ postId: post.id, liked: optimisticLiked, likesCount: optimisticCount })
        setPending(true)

        try {
            const res = await togglePostLike(post.id, userId, prevLiked)
            const finalCount = typeof res.likesCount === 'number' ? res.likesCount : optimisticCount
            onPostUpdated?.(post.id, {
                likedByMe: res.likedByMe,
                likesCount: finalCount,
                likes: finalCount,
            })
            setOptimistic(null)
        } catch (err) {
            console.error('[ProfessionalPostCard] togglePostLike error:', err)
            setOptimistic(null)
            toast.error(err?.message || 'Could not update like. Please try again.')
        } finally {
            setPending(false)
        }
    }

    return { liked, likesCount, pending, handleLike }
}

function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 3600) return `${Math.floor(diff / 60) || 1}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function calculateReadTime(text = '') {
    const words = text.trim().split(/\s+/).length
    const mins = Math.max(1, Math.ceil(words / 180))
    return `${mins} min read`
}

function CommentsSection({
    comments,
    commentsLoading,
    commentsError,
    commentText,
    onCommentTextChange,
    onSubmitComment,
    onDeleteComment,
    submittingComment,
    deletingCommentId,
    currentUserId,
    isReel = false,
    sectionRef,
    inputRef,
}) {
    return (
        <div ref={sectionRef} className="space-y-4">
            {/* Responses header */}
            <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#324C4D] flex items-center gap-1.5">
                    <MessageCircle size={14} />{' '}
                    {comments.length}{' '}
                    {isReel
                        ? `Comment${comments.length === 1 ? '' : 's'}`
                        : 'Clinical Responses & Insights'}
                </h3>
            </div>

            {/* Comments list */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {commentsLoading ? (
                    <div className="flex justify-center py-6">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
                    </div>
                ) : commentsError ? (
                    <p className="text-xs text-red-600 text-center py-4">{commentsError}</p>
                ) : comments.length === 0 ? (
                    <p className="text-xs text-[#9AA6A0] text-center py-4">
                        {isReel
                            ? 'No comments yet. Share your thoughts below!'
                            : 'No responses yet. Share your clinical perspective below!'}
                    </p>
                ) : (
                    comments.map((c) => (
                        <div key={c.id} className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-[#033135] truncate">{c.authorName}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-[#9AA6A0]">{formatDate(c.createdAt)}</span>
                                    {currentUserId && c.userId === currentUserId && (
                                        <button
                                            type="button"
                                            onClick={() => onDeleteComment(c.id)}
                                            disabled={deletingCommentId === c.id}
                                            aria-label={isReel ? 'Delete comment' : 'Delete response'}
                                            className="text-[#9AA6A0] hover:text-red-500 transition disabled:opacity-40"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-[#4A5C58] leading-relaxed">{c.text}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Reply Composer */}
            <form onSubmit={onSubmitComment} className="flex gap-2 pt-2 border-t border-[#E8EFEB]">
                <input
                    ref={inputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => onCommentTextChange(e.target.value)}
                    disabled={submittingComment}
                    placeholder={
                        currentUserId
                            ? isReel
                                ? 'Add a comment on this reel...'
                                : 'Write your clinical insight or reply...'
                            : isReel
                            ? 'Sign in to comment on this reel...'
                            : 'Sign in to join this discussion...'
                    }
                    className="flex-1 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3.5 py-2.5 text-xs outline-none focus:border-[#648C83] disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment || !currentUserId}
                    className="flex items-center gap-1 rounded-xl bg-[#033135] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 hover:bg-[#324C4D] transition"
                >
                    <Send size={13} />
                    <span>{submittingComment ? 'Posting...' : isReel ? 'Post' : 'Reply'}</span>
                </button>
            </form>
        </div>
    )
}

// ─── Post Detail Modal (Tailored per type) ───────────────────────────────────

function PostDetailModal({ post, onClose, onNavigateToProfile, onPostUpdated, focusComments = false }) {
    const { user } = useAuth()
    const postId = post?.id
    const postType = post?.type
    const hasComments = ['article', 'discussion', 'reel'].includes(postType)
    const [comments, setComments] = useState(post?.comments || [])
    const [commentsLoading, setCommentsLoading] = useState(() => hasComments)
    const [commentsError, setCommentsError] = useState('')
    const [commentText, setCommentText] = useState('')
    const [submittingComment, setSubmittingComment] = useState(false)
    const [deletingCommentId, setDeletingCommentId] = useState(null)
    const commentSectionRef = useRef(null)
    const commentInputRef = useRef(null)

    useEffect(() => {
        if (!postId || !hasComments) return
        let active = true
        fetchPostComments(postId)
            .then((rows) => {
                if (!active) return
                setComments(rows)
                setCommentsError('')
            })
            .catch((err) => {
                console.error('[PostDetailModal] fetchPostComments error:', err)
                if (active) setCommentsError('Could not load comments right now.')
            })
            .finally(() => {
                if (active) setCommentsLoading(false)
            })
        return () => { active = false }
    }, [postId, hasComments])

    useEffect(() => {
        if (!focusComments || !hasComments) return
        const timer = setTimeout(() => {
            commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            commentInputRef.current?.focus({ preventScroll: true })
        }, 60)
        return () => clearTimeout(timer)
    }, [focusComments, hasComments])

    if (!post) return null

    const isVerified = (post.authorVerificationStatus || '').toLowerCase().includes('verified')
    const targetAuthorId = getTargetAuthorId(post)

    const handleAuthorClick = () => {
        if (!targetAuthorId) return
        onNavigateToProfile?.(targetAuthorId)
        onClose()
    }

    const handleSendComment = async (e) => {
        e.preventDefault()
        if (!commentText.trim() || submittingComment) return
        if (!user?.id) {
            toast.error('Please sign in to post a response.')
            return
        }

        setSubmittingComment(true)
        try {
            const res = await addPostComment(post.id, user.id, commentText.trim())
            setComments((prev) => [...prev, res.comment])
            setCommentText('')
            const nextCount = typeof res.commentsCount === 'number'
                ? res.commentsCount
                : (post.commentsCount || 0) + 1
            onPostUpdated?.(post.id, { commentsCount: nextCount })
            toast.success('Response posted!')
        } catch (err) {
            console.error('[PostDetailModal] addPostComment error:', err)
            toast.error(err?.message || 'Could not post response. Please try again.')
        } finally {
            setSubmittingComment(false)
        }
    }

    const handleDeleteComment = async (commentId) => {
        if (!user?.id || !commentId || deletingCommentId) return
        setDeletingCommentId(commentId)
        try {
            const res = await deletePostComment(commentId, user.id)
            setComments((prev) => prev.filter((c) => c.id !== commentId))
            const nextCount = typeof res.commentsCount === 'number'
                ? res.commentsCount
                : Math.max(0, (post.commentsCount || 1) - 1)
            onPostUpdated?.(post.id, { commentsCount: nextCount })
            toast.success('Response removed.')
        } catch (err) {
            console.error('[PostDetailModal] deletePostComment error:', err)
            toast.error('Could not remove response.')
        } finally {
            setDeletingCommentId(null)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={onClose}
        >
            <div
                className={`relative w-full bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl ${
                    post.type === 'reel' ? 'max-w-md' : 'max-w-2xl'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-white/95 px-5 py-3.5 backdrop-blur border-b border-[#E8EFEB]">
                    <div className="flex items-center gap-2">
                        {post.type === 'reel' && (
                            <span className="flex items-center gap-1 rounded-full bg-[#DCD6F7] text-[#6B5B95] px-2.5 py-0.5 text-[10px] font-bold">
                                <Video size={10} /> REEL
                            </span>
                        )}
                        {post.type === 'article' && (
                            <span className="flex items-center gap-1 rounded-full bg-[#E4F0EA] text-[#2F7B58] px-2.5 py-0.5 text-[10px] font-bold">
                                <FileText size={10} /> CLINICAL ARTICLE
                            </span>
                        )}
                        {post.type === 'discussion' && (
                            <span className="flex items-center gap-1 rounded-full bg-[#FFE9C7] text-[#A06920] px-2.5 py-0.5 text-[10px] font-bold">
                                <MessageSquare size={10} /> DISCUSSION ROUNDS
                            </span>
                        )}
                        <span className="text-[11px] text-[#9AA6A0] truncate">{post.category}</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-[#647572] hover:bg-[#E8EFEB] transition"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── REEL PLAYER MODAL ── */}
                {post.type === 'reel' && (
                    <div className="p-4 space-y-4">
                        {/* 9:16 Video Box */}
                        <div className="relative aspect-[9/16] w-full max-w-[340px] mx-auto rounded-3xl overflow-hidden bg-black shadow-lg">
                            {post.videoUrl ? (
                                <video
                                    src={post.videoUrl}
                                    poster={post.coverImage}
                                    controls
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : post.coverImage ? (
                                <div className="relative w-full h-full">
                                    <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="h-14 w-14 rounded-full bg-white/30 backdrop-blur flex items-center justify-center">
                                            <Play size={24} fill="white" className="text-white ml-1" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full bg-[#033135] flex items-center justify-center text-white">
                                    <Play size={32} />
                                </div>
                            )}
                        </div>

                        {/* Author info */}
                        <button
                            type="button"
                            onClick={handleAuthorClick}
                            className={`flex items-center gap-3 w-full text-left p-2 rounded-xl transition ${
                                targetAuthorId ? 'hover:bg-[#FAFBF9] cursor-pointer' : 'cursor-default'
                            }`}
                        >
                            {post.authorPhoto ? (
                                <img src={post.authorPhoto} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-[#E4F0EA]" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-[#E4F0EA] flex items-center justify-center text-xs font-bold text-[#033135]">
                                    {getInitials(post.authorName)}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-bold text-[#033135] truncate">{post.authorName}</p>
                                    {isVerified && <BadgeCheck size={14} className="text-[#6B5B95]" />}
                                </div>
                                <p className="text-xs text-[#647572] truncate">{post.authorSpecialty}</p>
                            </div>
                        </button>

                        <div className="px-2">
                            <h3 className="text-base font-bold text-[#033135]">{post.title}</h3>
                            {post.caption && (
                                <p className="mt-1.5 text-xs text-[#4A5C58] leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                            )}
                        </div>

                        <div className="px-2 pt-2 border-t border-[#E8EFEB]">
                            <CommentsSection
                                comments={comments}
                                commentsLoading={commentsLoading}
                                commentsError={commentsError}
                                commentText={commentText}
                                onCommentTextChange={setCommentText}
                                onSubmitComment={handleSendComment}
                                onDeleteComment={handleDeleteComment}
                                submittingComment={submittingComment}
                                deletingCommentId={deletingCommentId}
                                currentUserId={user?.id}
                                isReel
                                sectionRef={commentSectionRef}
                                inputRef={commentInputRef}
                            />
                        </div>
                    </div>
                )}

                {/* ── ARTICLE MODAL ── */}
                {post.type === 'article' && (
                    <div className="p-6 sm:p-8 space-y-5">
                        {post.coverImage && (
                            <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#E4F0EA] shadow-xs">
                                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <span className="text-[11px] font-bold tracking-wider uppercase text-[#648C83]">
                                {post.category} · {calculateReadTime(post.body || post.description)}
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-normal text-[#033135] leading-snug" style={{ fontFamily: SERIF }}>
                                {post.title}
                            </h1>
                        </div>

                        {/* Author byline */}
                        <button
                            type="button"
                            onClick={handleAuthorClick}
                            className={`flex items-center gap-3 w-full text-left py-3 border-y border-[#E8EFEB] ${
                                targetAuthorId ? 'cursor-pointer' : 'cursor-default'
                            }`}
                        >
                            {post.authorPhoto ? (
                                <img src={post.authorPhoto} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-[#E4F0EA]" />
                            ) : (
                                <div className="h-11 w-11 rounded-full bg-[#E4F0EA] flex items-center justify-center text-sm font-bold text-[#033135]">
                                    {getInitials(post.authorName)}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-bold text-[#033135] truncate">{post.authorName}</p>
                                    {isVerified && <BadgeCheck size={14} className="text-[#6B5B95]" />}
                                </div>
                                <p className="text-xs text-[#647572] truncate">{post.authorSpecialty} · {formatDate(post.createdAt)}</p>
                            </div>
                        </button>

                        {/* Description summary lead */}
                        {post.description && (
                            <div className="rounded-xl bg-[#FAFBF9] border-l-4 border-[#033135] p-4 text-xs sm:text-sm font-medium text-[#033135] leading-relaxed">
                                {post.description}
                            </div>
                        )}

                        {/* Full body */}
                        <div className="text-sm leading-7 text-[#324C4D] space-y-4 whitespace-pre-line font-normal">
                            {post.body || post.content || 'Full article content.'}
                        </div>

                        <div className="border-t border-[#E8EFEB] pt-5">
                            <CommentsSection
                                comments={comments}
                                commentsLoading={commentsLoading}
                                commentsError={commentsError}
                                commentText={commentText}
                                onCommentTextChange={setCommentText}
                                onSubmitComment={handleSendComment}
                                onDeleteComment={handleDeleteComment}
                                submittingComment={submittingComment}
                                deletingCommentId={deletingCommentId}
                                currentUserId={user?.id}
                                sectionRef={commentSectionRef}
                                inputRef={commentInputRef}
                            />
                        </div>
                    </div>
                )}

                {/* ── DISCUSSION MODAL ── */}
                {post.type === 'discussion' && (
                    <div className="p-6 sm:p-7 space-y-5">
                        {/* Discussion Question Banner */}
                        <div className="rounded-2xl bg-gradient-to-br from-[#FAFBF9] via-[#F4F8F5] to-[#EAF2ED] border-l-4 border-[#033135] border border-[#E8EFEB] p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A06920]">
                                    CLINICAL DISCUSSION · {post.category}
                                </span>
                                <span className="text-[10px] text-[#9AA6A0]">{formatDate(post.createdAt)}</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleAuthorClick}
                                className={`flex items-center gap-2.5 text-left ${
                                    targetAuthorId ? 'cursor-pointer' : 'cursor-default'
                                }`}
                            >
                                {post.authorPhoto ? (
                                    <img src={post.authorPhoto} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-[#033135]/20" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-[#033135] text-white flex items-center justify-center text-[10px] font-bold">
                                        {getInitials(post.authorName)}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold text-[#033135] flex items-center gap-1">
                                        {post.authorName}
                                        {isVerified && <BadgeCheck size={12} className="text-[#6B5B95]" />}
                                    </p>
                                    <p className="text-[10px] text-[#647572]">{post.authorSpecialty}</p>
                                </div>
                            </button>

                            <h2 className="text-base sm:text-lg font-bold text-[#033135] leading-snug">
                                {post.title || post.content}
                            </h2>

                            {post.content && post.title !== post.content && (
                                <p className="text-xs sm:text-sm text-[#4A5C58] leading-relaxed whitespace-pre-wrap">
                                    {post.content}
                                </p>
                            )}
                        </div>

                        <CommentsSection
                            comments={comments}
                            commentsLoading={commentsLoading}
                            commentsError={commentsError}
                            commentText={commentText}
                            onCommentTextChange={setCommentText}
                            onSubmitComment={handleSendComment}
                            onDeleteComment={handleDeleteComment}
                            submittingComment={submittingComment}
                            deletingCommentId={deletingCommentId}
                            currentUserId={user?.id}
                            sectionRef={commentSectionRef}
                            inputRef={commentInputRef}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── 1. REEL CARD (YT Shorts & Instagram Reels Style) ─────────────────────────

export function ReelPostCard({ post, onNavigateToProfile, onOpenModal, onPostUpdated }) {
    const { user } = useAuth()
    const { liked, likesCount, pending, handleLike } = usePostLike(post, user?.id, onPostUpdated)
    const isVerified = (post.authorVerificationStatus || '').toLowerCase().includes('verified')
    const targetAuthorId = getTargetAuthorId(post)

    return (
        <article
            onClick={() => onOpenModal(false)}
            className="group relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-black cursor-pointer shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.01]"
        >
            {/* Background Image / Video Poster */}
            {post.coverImage ? (
                <img
                    src={post.coverImage}
                    alt={post.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#033135] via-[#324C4D] to-black" />
            )}

            {/* Dark Gradient Vignette for YT Shorts / IG Reel Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

            {/* Top Bar: Reel Badge & Category */}
            <div className="absolute left-3 top-3 right-3 flex items-center justify-between z-10">
                <span className="flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/15">
                    <Video size={10} className="text-[#FFD9C7]" />
                    <span>REEL</span>
                </span>
                <span className="rounded-full bg-black/45 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-white/90 ring-1 ring-white/10 truncate max-w-[120px]">
                    {post.category}
                </span>
            </div>

            {/* Center Play Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 backdrop-blur-md text-white shadow-xl ring-2 ring-white/30 transition-transform duration-300 group-hover:scale-115">
                    <Play size={20} fill="white" className="ml-0.5 text-white" />
                </div>
            </div>

            {/* Bottom Content Overlay (Instagram Reel / YT Shorts Style) */}
            <div className="absolute inset-x-0 bottom-0 p-3.5 z-10 space-y-2">
                {/* Author row */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (targetAuthorId) onNavigateToProfile?.(targetAuthorId)
                    }}
                    className={`flex items-center gap-2 text-left group/auth ${
                        targetAuthorId ? 'cursor-pointer' : 'cursor-default'
                    }`}
                >
                    {post.authorPhoto ? (
                        <img
                            src={post.authorPhoto}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover ring-2 ring-white/70 shrink-0"
                            loading="lazy"
                        />
                    ) : (
                        <div className="h-7 w-7 rounded-full bg-white text-[#033135] flex items-center justify-center text-[9px] font-black shrink-0">
                            {getInitials(post.authorName)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className={`flex items-center gap-1 text-xs font-bold text-white drop-shadow-sm truncate ${
                            targetAuthorId ? 'group-hover/auth:underline' : ''
                        }`}>
                            {post.authorName}
                            {isVerified && <BadgeCheck size={13} className="text-[#A4D8D0] shrink-0" />}
                        </p>
                    </div>
                </button>

                {/* Title / Caption */}
                <h3 className="text-xs sm:text-sm font-bold leading-snug text-white drop-shadow-md line-clamp-2">
                    {post.title}
                </h3>

                {/* Engagement Action Bar */}
                <div
                    className="flex items-center justify-between pt-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleLike}
                            disabled={pending}
                            aria-label="Like reel"
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md transition disabled:opacity-60 ${
                                liked
                                    ? 'bg-red-500/80 text-white'
                                    : 'bg-black/40 text-white/90 hover:bg-black/60'
                            }`}
                        >
                            <Heart size={12} fill={liked ? 'white' : 'none'} />
                            <span>{likesCount}</span>
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onOpenModal(true)
                            }}
                            aria-label="Open reel comments"
                            className="flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white/90 hover:bg-black/60 transition"
                        >
                            <MessageCircle size={12} />
                            <span>{post.commentsCount || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    )
}

// ─── 2. ARTICLE CARD (Editorial Medical Journal Style) ────────────────────────

export function ArticlePostCard({ post, onNavigateToProfile, onOpenModal, onPostUpdated }) {
    const { user } = useAuth()
    const { liked, likesCount, pending, handleLike } = usePostLike(post, user?.id, onPostUpdated)
    const isVerified = (post.authorVerificationStatus || '').toLowerCase().includes('verified')
    const readTime = calculateReadTime(post.body || post.description)
    const targetAuthorId = getTargetAuthorId(post)

    return (
        <article
            onClick={onOpenModal}
            className="group rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs hover:border-[#648C83] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
            <div className="space-y-3.5">
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded-full bg-[#E4F0EA] text-[#2F7B58] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            <FileText size={10} /> ARTICLE
                        </span>
                        <span className="text-[11px] font-semibold text-[#8B6D25] bg-[#F8E7A5]/40 px-2 py-0.5 rounded-full">
                            {post.category}
                        </span>
                    </div>
                    <span className="text-[11px] text-[#9AA6A0] flex items-center gap-1 font-medium">
                        <Clock size={11} /> {readTime}
                    </span>
                </div>

                {/* Editorial Cover Banner */}
                {post.coverImage && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#E4F0EA]">
                        <img
                            src={post.coverImage}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                            loading="lazy"
                        />
                    </div>
                )}

                {/* Article Headline in Serif */}
                <h3
                    className="text-lg sm:text-xl font-bold leading-snug text-[#033135] group-hover:text-[#648C83] transition-colors"
                    style={{ fontFamily: SERIF }}
                >
                    {post.title}
                </h3>

                {/* Summary snippet */}
                {post.description && (
                    <p className="text-xs sm:text-sm text-[#4A5C58] line-clamp-2 leading-relaxed">
                        {post.description}
                    </p>
                )}
            </div>

            {/* Author Byline & Action Footer */}
            <div className="mt-4 pt-4 border-t border-[#F0F4F2] flex items-center justify-between">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (targetAuthorId) onNavigateToProfile?.(targetAuthorId)
                    }}
                    className={`flex items-center gap-2.5 text-left group/author min-w-0 ${
                        targetAuthorId ? 'cursor-pointer' : 'cursor-default'
                    }`}
                >
                    {post.authorPhoto ? (
                        <img
                            src={post.authorPhoto}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-[#DCE7E3] shrink-0"
                            loading="lazy"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-[#E4F0EA] flex items-center justify-center text-[10px] font-bold text-[#033135] shrink-0">
                            {getInitials(post.authorName)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className={`text-xs font-bold text-[#033135] flex items-center gap-1 truncate ${
                            targetAuthorId ? 'group-hover/author:underline' : ''
                        }`}>
                            {post.authorName}
                            {isVerified && <BadgeCheck size={13} className="text-[#6B5B95] shrink-0" />}
                        </p>
                        <p className="text-[10px] text-[#647572] truncate">{post.authorSpecialty}</p>
                    </div>
                </button>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={handleLike}
                        disabled={pending}
                        aria-label="Like article"
                        className={`flex items-center gap-1 text-xs font-semibold transition disabled:opacity-60 ${
                            liked ? 'text-red-500' : 'text-[#647572] hover:text-[#033135]'
                        }`}
                    >
                        <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                        <span>{likesCount}</span>
                    </button>

                    <span className="text-xs font-bold text-[#033135] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Read <ArrowRight size={13} />
                    </span>
                </div>
            </div>
        </article>
    )
}

// ─── 3. DISCUSSION CARD (Conversational Medical Rounds Style) ─────────────────

export function DiscussionPostCard({ post, onNavigateToProfile, onOpenModal, onPostUpdated }) {
    const { user } = useAuth()
    const { liked, likesCount, pending, handleLike } = usePostLike(post, user?.id, onPostUpdated)
    const isVerified = (post.authorVerificationStatus || '').toLowerCase().includes('verified')
    const replyCount = post.commentsCount ?? post.comments?.length ?? 0
    const targetAuthorId = getTargetAuthorId(post)

    return (
        <article
            onClick={onOpenModal}
            className="group relative rounded-3xl border-l-4 border-l-[#033135] border border-[#E8EFEB] bg-gradient-to-br from-[#FAFBF9] via-[#F5F8F6] to-[#EBF3EF] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
            <div className="space-y-3.5">
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded-full bg-[#FFE9C7] text-[#A06920] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            <MessageSquare size={10} /> CLINICAL DISCUSSION
                        </span>
                        <span className="text-[11px] font-semibold text-[#324C4D] bg-white border border-[#DCE7E3] px-2 py-0.5 rounded-full">
                            {post.category}
                        </span>
                    </div>
                    <span className="text-[11px] text-[#9AA6A0]">{formatDate(post.createdAt)}</span>
                </div>

                {/* Author Prompt Lead */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        if (targetAuthorId) onNavigateToProfile?.(targetAuthorId)
                    }}
                    className={`flex items-center gap-2.5 text-left group/auth pt-1 ${
                        targetAuthorId ? 'cursor-pointer' : 'cursor-default'
                    }`}
                >
                    {post.authorPhoto ? (
                        <img
                            src={post.authorPhoto}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover ring-2 ring-[#033135]/20 shrink-0"
                            loading="lazy"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-[#033135] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {getInitials(post.authorName)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className={`text-xs font-bold text-[#033135] flex items-center gap-1 truncate ${
                            targetAuthorId ? 'group-hover/auth:underline' : ''
                        }`}>
                            {post.authorName}
                            {isVerified && <BadgeCheck size={13} className="text-[#6B5B95]" />}
                            <span className="font-normal text-[#647572]">asks:</span>
                        </p>
                        <p className="text-[10px] text-[#647572] truncate">{post.authorSpecialty}</p>
                    </div>
                </button>

                {/* Question / Discussion Prompt */}
                <div className="relative">
                    <Quote size={28} className="absolute -left-1 -top-2 text-[#033135]/10 pointer-events-none" />
                    <h3 className="text-base sm:text-lg font-bold leading-snug text-[#033135] pl-5 group-hover:text-[#648C83] transition-colors">
                        &ldquo;{post.title || post.content}&rdquo;
                    </h3>
                </div>

                {/* Content snippet */}
                {post.content && post.title !== post.content && (
                    <p className="text-xs text-[#4A5C58] line-clamp-2 leading-relaxed pl-5">
                        {post.content}
                    </p>
                )}
            </div>

            {/* Conversational Action Footer */}
            <div className="mt-4 pt-3.5 border-t border-[#033135]/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#033135] bg-white px-3 py-1.5 rounded-full border border-[#DCE7E3] shadow-2xs">
                    <MessageCircle size={13} className="text-[#648C83]" />
                    <span>{replyCount} Clinician Responses</span>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={handleLike}
                        disabled={pending}
                        aria-label="Like discussion"
                        className={`flex items-center gap-1 text-xs font-semibold transition disabled:opacity-60 ${
                            liked ? 'text-red-500' : 'text-[#647572] hover:text-[#033135]'
                        }`}
                    >
                        <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                        <span>{likesCount}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenModal}
                        className="text-xs font-bold text-[#033135] hover:text-[#648C83] flex items-center gap-1"
                    >
                        <span>Join</span>
                        <ArrowRight size={13} />
                    </button>
                </div>
            </div>
        </article>
    )
}

// ─── Main Delegator Card Component ───────────────────────────────────────────

function ProfessionalPostCard({ post, onNavigateToProfile, onPostUpdated }) {
    const [modalOpen, setModalOpen] = useState(false)
    const [focusCommentsOnOpen, setFocusCommentsOnOpen] = useState(false)

    const openModal = (focusComments = false) => {
        setFocusCommentsOnOpen(Boolean(focusComments))
        setModalOpen(true)
    }

    return (
        <>
            {post.type === 'reel' && (
                <ReelPostCard
                    post={post}
                    onNavigateToProfile={onNavigateToProfile}
                    onOpenModal={openModal}
                    onPostUpdated={onPostUpdated}
                />
            )}

            {post.type === 'article' && (
                <ArticlePostCard
                    post={post}
                    onNavigateToProfile={onNavigateToProfile}
                    onOpenModal={() => openModal(false)}
                    onPostUpdated={onPostUpdated}
                />
            )}

            {post.type === 'discussion' && (
                <DiscussionPostCard
                    post={post}
                    onNavigateToProfile={onNavigateToProfile}
                    onOpenModal={() => openModal(false)}
                    onPostUpdated={onPostUpdated}
                />
            )}

            {modalOpen && (
                <PostDetailModal
                    key={post.id}
                    post={post}
                    onClose={() => {
                        setModalOpen(false)
                        setFocusCommentsOnOpen(false)
                    }}
                    onNavigateToProfile={onNavigateToProfile}
                    onPostUpdated={onPostUpdated}
                    focusComments={focusCommentsOnOpen}
                />
            )}
        </>
    )
}

export default ProfessionalPostCard
