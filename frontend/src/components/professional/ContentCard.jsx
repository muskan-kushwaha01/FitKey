import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FileText,
    Video,
    MessageSquare,
    Heart,
    Bookmark,
    MoreVertical,
    Edit2,
    Trash2,
    Play,
    Eye,
    X,
    Send,
    User,
    Clock,
    Quote,
    ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    toggleLikePost,
    toggleSavePost,
    addComment,
    getPostComments,
    getInteractionStatus,
} from '../../services/professional/professionalContentService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function calculateReadTime(text = '') {
    const words = text.trim().split(/\s+/).length
    const mins = Math.max(1, Math.ceil(words / 180))
    return `${mins} min read`
}

export function ContentCard({
    post,
    currentUserId,
    currentUserName,
    onDelete,
    onUpdate,
    readOnly = false,
}) {
    const navigate = useNavigate()
    const [liked, setLiked] = useState(() => getInteractionStatus(post.id, currentUserId).liked)
    const [saved, setSaved] = useState(() => getInteractionStatus(post.id, currentUserId).saved)
    const [likesCount, setLikesCount] = useState(post.likesCount || 0)
    const [, setSavesCount] = useState(post.savesCount || 0)
    const [comments, setComments] = useState(post.comments || [])
    const [commentsCount, setCommentsCount] = useState(post.commentsCount ?? post.comments?.length ?? 0)
    const [commentsLoading, setCommentsLoading] = useState(false)
    const [commentsError, setCommentsError] = useState('')
    const [newComment, setNewComment] = useState('')
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    const isAuthor = !readOnly && currentUserId && post.authorId === currentUserId

    const openDetailModal = async () => {
        setShowDetailModal(true)
        setCommentsLoading(true)
        setCommentsError('')
        try {
            const rows = await getPostComments(post.id)
            setComments(rows.map((comment) => ({
                ...comment,
                authorId: comment.userId,
            })))
            setCommentsCount(rows.length)
        } catch (error) {
            setCommentsError(error?.message || 'Could not load comments.')
            console.error('[ContentCard] Could not fetch post comments:', error)
        } finally {
            setCommentsLoading(false)
        }
    }

    const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })

    const handleLike = async (e) => {
        e.stopPropagation()
        const res = await toggleLikePost(post.id, currentUserId)
        if (res.success) {
            setLiked(res.liked)
            setLikesCount((prev) => (res.liked ? prev + 1 : Math.max(0, prev - 1)))
            if (onUpdate) onUpdate()
        }
    }

    const handleSave = (e) => {
        e.stopPropagation()
        const res = toggleSavePost(post.id, currentUserId)
        if (res.success) {
            setSaved(res.saved)
            setSavesCount((prev) => (res.saved ? prev + 1 : Math.max(0, prev - 1)))
            toast.success(res.saved ? 'Saved to bookmarks' : 'Removed from bookmarks')
            if (onUpdate) onUpdate()
        }
    }

    const handleDelete = (e) => {
        e.stopPropagation()
        setMenuOpen(false)
        setShowDetailModal(false)
        if (window.confirm(`Are you sure you want to delete "${post.title || 'this post'}"?`)) {
            if (onDelete) onDelete(post.id)
        }
    }

    const handleEdit = (e) => {
        e.stopPropagation()
        setMenuOpen(false)
        setShowDetailModal(false)
        navigate(`/professional/content/edit/${post.id}`)
    }

    const handleAddComment = async (e) => {
        e.preventDefault()
        if (!newComment.trim()) return
        const res = await addComment(post.id, {
            authorId: currentUserId,
            authorName: currentUserName || 'Verified Professional',
            text: newComment,
        })
        if (res.success) {
            setComments((prev) => [...prev, res.comment])
            setCommentsCount(typeof res.commentsCount === 'number' ? res.commentsCount : (count) => count + 1)
            setNewComment('')
            toast.success('Comment posted!')
            if (onUpdate) onUpdate()
        } else {
            toast.error(res.error || 'Could not post comment.')
        }
    }

    // Three-dot author menu element
    const authorMenu = isAuthor && (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 hover:bg-white text-[#033135] shadow-xs backdrop-blur-xs transition"
                aria-label="Post actions"
            >
                <MoreVertical size={14} />
            </button>

            {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-[#E8EFEB] bg-white py-1 shadow-lg z-30">
                    <button
                        type="button"
                        onClick={handleEdit}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#033135] hover:bg-[#E4F0EA]"
                    >
                        <Edit2 size={13} /> Edit Post
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#C0563B] hover:bg-[#FFD9C7]/30"
                    >
                        <Trash2 size={13} /> Delete
                    </button>
                </div>
            )}
        </div>
    )

    return (
        <>
            {/* ── 1. PROFESSIONAL REEL CARD (YT Shorts & IG Reels Style) ── */}
            {post.type === 'reel' && (
                <article
                    onClick={openDetailModal}
                    className="group relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-black cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                >
                    {/* Media Cover / Video Background */}
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

                    {/* Gradient Overlay for high-contrast reading */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25" />

                    {/* Top Bar: REEL badge + Menu */}
                    <div className="absolute left-3 top-3 right-3 flex items-center justify-between z-10">
                        <span className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/20">
                            <Video size={10} className="text-[#FFD9C7]" />
                            <span>REEL</span>
                        </span>
                        {authorMenu}
                    </div>

                    {/* Center Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 backdrop-blur-md text-white shadow-xl ring-2 ring-white/30 transition-transform duration-300 group-hover:scale-115">
                            <Play size={20} fill="white" className="ml-0.5 text-white" />
                        </div>
                    </div>

                    {/* Bottom Info Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 z-10 space-y-2">
                        <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                            {post.category}
                        </span>

                        <h3 className="text-xs sm:text-sm font-bold leading-snug text-white drop-shadow-md line-clamp-2">
                            {post.title || post.caption}
                        </h3>

                        {/* Views & Interactions Bar */}
                        <div
                            className="flex items-center justify-between pt-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="flex items-center gap-1 text-[11px] font-medium text-white/90 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full">
                                <Eye size={11} /> {post.viewsCount || 0}
                            </span>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleLike}
                                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full backdrop-blur-xs transition ${
                                        liked ? 'bg-red-500/80 text-white' : 'bg-black/40 text-white/90'
                                    }`}
                                >
                                    <Heart size={11} fill={liked ? 'white' : 'none'} />
                                    <span>{likesCount}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className={`p-1.5 rounded-full backdrop-blur-xs transition ${
                                        saved ? 'bg-[#E4F0EA] text-[#033135]' : 'bg-black/40 text-white/90'
                                    }`}
                                    aria-label="Save"
                                >
                                    <Bookmark size={11} fill={saved ? 'currentColor' : 'none'} />
                                </button>
                            </div>
                        </div>
                    </div>
                </article>
            )}

            {/* ── 2. PROFESSIONAL ARTICLE CARD (Editorial Medical Journal Style) ── */}
            {post.type === 'article' && (
                <article
                    onClick={openDetailModal}
                    className="group flex flex-col justify-between rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs hover:border-[#648C83] hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="space-y-3.5">
                        {/* Top tag row & author menu */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 rounded-full bg-[#E4F0EA] text-[#2F7B58] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    <FileText size={10} /> ARTICLE
                                </span>
                                <span className="text-[11px] font-semibold text-[#8B6D25] bg-[#F8E7A5]/40 px-2 py-0.5 rounded-full">
                                    {post.category}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#9AA6A0] flex items-center gap-1 font-medium">
                                    <Clock size={11} /> {calculateReadTime(post.body || post.description)}
                                </span>
                                {authorMenu}
                            </div>
                        </div>

                        {/* Framed Cover Image */}
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

                        {/* Serif Headline */}
                        <h3
                            className="text-lg sm:text-xl font-bold leading-snug text-[#033135] group-hover:text-[#648C83] transition-colors"
                            style={{ fontFamily: SERIF }}
                        >
                            {post.title}
                        </h3>

                        {/* Description snippet */}
                        {post.description && (
                            <p className="text-xs sm:text-sm text-[#4A5C58] line-clamp-2 leading-relaxed">
                                {post.description}
                            </p>
                        )}
                    </div>

                    {/* Footer with stats & actions */}
                    <div className="mt-4 pt-4 border-t border-[#F0F4F2] flex items-center justify-between text-xs text-[#647572]">
                        <div className="flex items-center gap-3 text-[11px]">
                            <span className="flex items-center gap-1"><Eye size={12} /> {post.viewsCount || 0} views</span>
                            <span className="flex items-center gap-1"><Heart size={12} /> {likesCount} likes</span>
                        </div>

                        <span className="text-xs font-bold text-[#033135] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Read Article <ArrowRight size={13} />
                        </span>
                    </div>
                </article>
            )}

            {/* ── 3. PROFESSIONAL DISCUSSION CARD (Conversational Forum Style) ── */}
            {post.type === 'discussion' && (
                <article
                    onClick={openDetailModal}
                    className="group relative flex flex-col justify-between rounded-3xl border-l-4 border-l-[#033135] border border-[#E8EFEB] bg-gradient-to-br from-[#FAFBF9] via-[#F5F8F6] to-[#EBF3EF] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                    <div className="space-y-3.5">
                        {/* Top tag row & author menu */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 rounded-full bg-[#FFE9C7] text-[#A06920] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    <MessageSquare size={10} /> CLINICAL DISCUSSION
                                </span>
                                <span className="text-[11px] font-semibold text-[#324C4D] bg-white border border-[#DCE7E3] px-2 py-0.5 rounded-full">
                                    {post.category}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#9AA6A0]">{formattedDate}</span>
                                {authorMenu}
                            </div>
                        </div>

                        {/* Conversational prompt */}
                        <div className="relative pt-1">
                            <Quote size={28} className="absolute -left-1 -top-2 text-[#033135]/10 pointer-events-none" />
                            <h3 className="text-base sm:text-lg font-bold leading-snug text-[#033135] pl-5 group-hover:text-[#648C83] transition-colors">
                                &ldquo;{post.title || post.content}&rdquo;
                            </h3>
                        </div>

                        {post.content && post.title !== post.content && (
                            <p className="text-xs text-[#4A5C58] line-clamp-2 leading-relaxed pl-5">
                                {post.content}
                            </p>
                        )}
                    </div>

                    {/* Footer with responses count & views */}
                    <div className="mt-4 pt-3.5 border-t border-[#033135]/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#033135] bg-white px-3 py-1.5 rounded-full border border-[#DCE7E3] shadow-2xs">
                            <MessageSquare size={13} className="text-[#648C83]" />
                            <span>{commentsCount} Clinical Replies</span>
                        </div>

                        <div className="flex items-center gap-3 text-[#647572] text-[11px]" onClick={(e) => e.stopPropagation()}>
                            <span className="flex items-center gap-1"><Eye size={12} /> {post.viewsCount || 0}</span>
                            <button
                                type="button"
                                onClick={handleLike}
                                className={`flex items-center gap-1 transition ${liked ? 'text-red-500 font-bold' : 'hover:text-[#033135]'}`}
                            >
                                <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
                                <span>{likesCount}</span>
                            </button>
                        </div>
                    </div>
                </article>
            )}

            {/* ── Detail Reading / Playing Modal ── */}
            {showDetailModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowDetailModal(false)}
                >
                    <div
                        className={`relative w-full bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden ${
                            post.type === 'reel' ? 'max-w-md' : 'max-w-2xl'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] px-6 py-4 bg-[#FAFBF9]">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-[#033135] text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    {post.type}
                                </span>
                                <span className="text-xs font-semibold text-[#647572]">
                                    {post.category}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetailModal(false)}
                                className="rounded-full p-1.5 text-[#647572] hover:bg-[#E8EFEB] transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto p-6 space-y-5 flex-1">
                            {/* Author Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#E4F0EA] border border-[#C4D7D4]">
                                        {post.authorPhoto ? (
                                            <img src={post.authorPhoto} alt={post.authorName} className="h-full w-full object-cover" />
                                        ) : (
                                            <User size={18} className="text-[#033135]" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[#033135]">{post.authorName}</h4>
                                        <p className="text-[11px] text-[#647572]">{post.authorSpecialty || 'Verified Specialist'} · {formattedDate}</p>
                                    </div>
                                </div>

                                {isAuthor && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleEdit}
                                            className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] px-3 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA]"
                                        >
                                            <Edit2 size={12} /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="flex items-center gap-1 rounded-xl border border-[#FFD9C7] px-3 py-1.5 text-xs font-semibold text-[#C0563B] hover:bg-[#FFD9C7]/40"
                                        >
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 9:16 Video Player for Reels */}
                            {post.type === 'reel' && (
                                <div className="aspect-[9/16] w-full max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-black shadow-lg">
                                    {post.videoUrl ? (
                                        <video
                                            src={post.videoUrl}
                                            poster={post.coverImage}
                                            controls
                                            autoPlay
                                            playsInline
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <img src={post.coverImage} alt="" className="h-full w-full object-cover" />
                                    )}
                                </div>
                            )}

                            {/* Title */}
                            <h2
                                className="text-xl sm:text-2xl font-bold text-[#033135] leading-snug"
                                style={post.type === 'article' ? { fontFamily: SERIF } : undefined}
                            >
                                {post.title || post.caption || post.content}
                            </h2>

                            {/* Article Cover Image */}
                            {post.type === 'article' && post.coverImage && (
                                <div className="overflow-hidden rounded-2xl aspect-[16/9]">
                                    <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover" />
                                </div>
                            )}

                            {/* Summary */}
                            {post.description && (
                                <div className="rounded-xl bg-[#FAFBF9] border-l-4 border-[#033135] p-4 text-xs sm:text-sm text-[#324C4D] font-medium leading-relaxed">
                                    {post.description}
                                </div>
                            )}

                            {/* Body or Discussion Content */}
                            {(post.body || post.content || post.caption) && (
                                <div className="text-xs sm:text-sm text-[#324C4D] leading-relaxed whitespace-pre-line">
                                    {post.body || post.content || post.caption}
                                </div>
                            )}

                            {/* Discussion Responses Section */}
                            <div className="pt-4 border-t border-[#E8EFEB] space-y-3">
                                <h4 className="text-xs font-bold text-[#033135] uppercase tracking-wider">
                                    Responses ({commentsCount})
                                </h4>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {commentsLoading ? (
                                        <p className="text-xs text-[#647572]">Loading comments…</p>
                                    ) : commentsError ? (
                                        <p className="text-xs text-red-600">{commentsError}</p>
                                    ) : comments.length === 0 ? (
                                        <p className="text-xs text-[#9AA6A0]">No replies yet.</p>
                                    ) : (
                                        comments.map((c) => (
                                            <div key={c.id} className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 text-xs space-y-1">
                                                <div className="flex items-center justify-between font-bold text-[#033135]">
                                                    <span>{c.authorName}</span>
                                                </div>
                                                <p className="text-[#4A5C58]">{c.text}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a reply or clinical note..."
                                        className="flex-1 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3.5 py-2 text-xs outline-none focus:border-[#648C83]"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim()}
                                        className="flex items-center gap-1 rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold text-white hover:bg-[#324C4D] disabled:opacity-50 transition"
                                    >
                                        <Send size={13} />
                                        <span>Reply</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ContentCard
