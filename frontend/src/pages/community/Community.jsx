import { useState } from 'react'
import {
    Heart, MessageCircle, Bookmark, Share2, Search, Plus, Play,
    BadgeCheck, MoreHorizontal, BookOpen, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

const initialPosts = [
    {
        id: 1, type: 'article', author: 'Dr. Ananya Sharma', role: 'Nutritionist', verified: true, time: '2 hours ago',
        title: '5 simple ways to improve your daily nutrition',
        description: 'Healthy eating does not have to be complicated. Start with small changes like adding seasonal fruits, including protein in your meals and staying hydrated.',
        category: 'Nutrition', likes: 248, comments: 32, color: 'bg-[#E4F0EA]', initials: 'AS',
    },
    {
        id: 2, type: 'discussion', author: 'Riya Mehta', role: 'Community Member', verified: false, time: '4 hours ago',
        title: 'How do you stay consistent with your fitness routine?',
        description: 'I have been trying to build a regular workout habit. Would love to hear how others manage their routines!',
        category: 'Fitness', likes: 86, comments: 24, color: 'bg-[#FFD9C7]', initials: 'RM',
    },
    {
        id: 3, type: 'article', author: 'Dr. Rahul Verma', role: 'Health Educator', verified: true, time: 'Yesterday',
        title: 'Understanding the importance of quality sleep',
        description: 'Sleep plays an important role in physical recovery, concentration and overall well-being. Here are some habits that may help improve your sleep routine.',
        category: 'Sleep', likes: 192, comments: 18, color: 'bg-[#DCD6F7]', initials: 'RV',
    },
]

const reels = [
    { id: 1, creator: 'Dr. Ananya Sharma', role: 'Verified Nutritionist', title: '3 healthy breakfast habits', category: 'Nutrition', duration: '00:45', color: 'from-[#324C4D] to-[#C4D7D4]' },
    { id: 2, creator: 'FitKey Wellness', role: 'Wellness Education', title: 'A quick desk stretching routine', category: 'Fitness', duration: '00:30', color: 'from-[#6B5B95] to-[#DCD6F7]' },
    { id: 3, creator: 'Dr. Rahul Verma', role: 'Verified Health Educator', title: 'Understanding sleep cycles', category: 'Sleep', duration: '00:55', color: 'from-[#A45E45] to-[#FFD9C7]' },
]

const discussions = [
    { id: 1, author: 'Aarav Singh', question: 'What are your favourite ways to stay active indoors?', replies: 18, time: '1 hour ago', category: 'Fitness' },
    { id: 2, author: 'Priya Kapoor', question: 'How do you build a consistent sleep schedule?', replies: 12, time: '3 hours ago', category: 'Sleep' },
    { id: 3, author: 'Kabir Malhotra', question: 'Share your favourite healthy snack ideas!', replies: 26, time: 'Yesterday', category: 'Nutrition' },
]

const tabs = ['For You', 'Reels', 'Articles', 'Discussions']

/* Alternate two lists so the feed feels mixed */
function interleave(a, b) {
    const out = []
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i++) {
        if (a[i]) out.push(a[i])
        if (b[i]) out.push(b[i])
    }
    return out
}

function ReelCard({ reel, className = '' }) {
    return (
        <button
            onClick={() => toast('Video playback will be connected later.')}
            className={`relative aspect-[3/5] overflow-hidden rounded-2xl bg-gradient-to-br ${reel.color} text-left text-white ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            <span className="absolute left-2.5 top-2.5 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold">
                {reel.category}
            </span>

            <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/25 backdrop-blur">
                <Play size={14} fill="white" className="ml-0.5" />
            </span>

            <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-sm font-bold leading-snug">{reel.title}</p>
                <p className="mt-1 truncate text-[11px] opacity-90">{reel.creator}</p>
                <p className="mt-0.5 text-[10px] opacity-75">{reel.duration}</p>
            </div>
        </button>
    )
}

function Community() {
    const [activeTab, setActiveTab] = useState('For You')
    const [likedPosts, setLikedPosts] = useState([])
    const [savedPosts, setSavedPosts] = useState([])
    const [search, setSearch] = useState('')

    const toggleLike = (id) => {
        setLikedPosts((current) =>
            current.includes(id) ? current.filter((postId) => postId !== id) : [...current, id]
        )
    }

    const toggleSave = (id) => {
        const isSaved = savedPosts.includes(id)
        setSavedPosts((current) => (isSaved ? current.filter((postId) => postId !== id) : [...current, id]))
        toast.success(isSaved ? 'Removed from saved posts' : 'Post saved!')
    }

    /* Search runs first, then the tab decides what is shown */
    const query = search.trim().toLowerCase()
    const match = (...fields) => fields.some((f) => f.toLowerCase().includes(query))

    const posts = initialPosts.filter((p) => match(p.title, p.category, p.author))
    const threads = discussions.filter((d) => match(d.question, d.category, d.author))
    const reelList = reels.filter((r) => match(r.title, r.category, r.creator))

    const postItems = (list) => list.map((p) => ({ kind: 'post', key: `p${p.id}`, data: p }))
    const threadItems = (list) => list.map((d) => ({ kind: 'thread', key: `d${d.id}`, data: d }))

    let feed = []
    if (activeTab === 'For You') feed = interleave(postItems(posts), threadItems(threads))
    if (activeTab === 'Articles') feed = postItems(posts.filter((p) => p.type === 'article'))
    if (activeTab === 'Discussions') {
        feed = interleave(postItems(posts.filter((p) => p.type === 'discussion')), threadItems(threads))
    }

    const showReelStrip = activeTab === 'For You' && reelList.length > 0
    const showReelGrid = activeTab === 'Reels'
    const isEmpty =
        (showReelGrid && reelList.length === 0) ||
        (!showReelGrid && feed.length === 0 && !showReelStrip)

    return (
        <div className="space-y-5 sm:space-y-6">

            {/* Header */}
            <header className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-[#033135] sm:text-3xl">Community</h1>
                    <p className="mt-1 text-xs text-[#647572] sm:text-sm">
                        Learn, share and grow together.
                    </p>
                </div>

                <button
                    onClick={() => toast('Post creation will be connected later.')}
                    aria-label="Create post"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#033135] text-white transition hover:bg-[#324C4D] sm:h-12 sm:w-12"
                >
                    <Plus size={22} />
                </button>
            </header>

            {/* Search */}
            <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#647572]" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search topics, creators and discussions"
                    className="w-full rounded-full border border-[#E8EFEB] bg-white py-3 pl-11 pr-10 text-sm text-[#033135] outline-none placeholder:text-[#9AA6A0] focus:border-[#033135]"
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#F0F3F0] text-[#647572]"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Filters: apply only when chosen */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${activeTab === tab
                                ? 'bg-[#033135] text-white'
                                : 'bg-white text-[#647572] ring-1 ring-inset ring-[#E8EFEB] hover:bg-[#E4F0EA]'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Reels strip: first thing in the mixed feed */}
            {showReelStrip && (
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-base font-bold text-[#033135]">Reels</h2>
                        <button
                            onClick={() => setActiveTab('Reels')}
                            className="text-xs font-semibold text-[#324C4D]"
                        >
                            See all
                        </button>
                    </div>

                    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {reelList.map((reel) => (
                            <ReelCard key={reel.id} reel={reel} className="w-36 shrink-0 snap-start sm:w-44" />
                        ))}
                    </div>
                </section>
            )}

            {/* Reels grid */}
            {showReelGrid && reelList.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                    {reelList.map((reel) => (
                        <ReelCard key={reel.id} reel={reel} className="w-full" />
                    ))}
                </div>
            )}

            {/* Feed */}
            {feed.length > 0 && (
                <section>
                    {activeTab === 'For You' && (
                        <h2 className="mb-1 text-base font-bold text-[#033135]">Latest from the community</h2>
                    )}

                    <div className="divide-y divide-[#E8EFEB]">
                        {feed.map((item) => {
                            if (item.kind === 'thread') {
                                const d = item.data
                                return (
                                    <article key={item.key} className="flex gap-3 py-5">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4F0EA]">
                                            <MessageCircle size={18} className="text-[#324C4D]" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-[#647572]">
                                                <span className="font-semibold text-[#324C4D]">{d.category}</span> · Discussion · {d.time}
                                            </p>
                                            <h3 className="mt-1 text-sm font-bold leading-snug text-[#033135] sm:text-base">
                                                {d.question}
                                            </h3>
                                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                                <p className="min-w-0 truncate text-xs text-[#647572]">Started by {d.author}</p>
                                                <button
                                                    onClick={() => toast('Discussion replies coming soon.')}
                                                    className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#324C4D]"
                                                >
                                                    <MessageCircle size={14} />
                                                    {d.replies} replies
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                )
                            }

                            const post = item.data
                            const liked = likedPosts.includes(post.id)
                            const saved = savedPosts.includes(post.id)

                            return (
                                <article key={item.key} className="py-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#033135] ${post.color}`}>
                                            {post.initials}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className="truncate text-sm font-bold text-[#033135]">{post.author}</p>
                                                {post.verified && <BadgeCheck size={15} className="shrink-0 text-[#6B5B95]" />}
                                            </div>
                                            <p className="truncate text-xs text-[#647572]">{post.role} · {post.time}</p>
                                        </div>

                                        <button className="shrink-0 text-[#647572]" aria-label="More options">
                                            <MoreHorizontal size={19} />
                                        </button>
                                    </div>

                                    <p className="mt-4 text-xs text-[#647572]">
                                        <span className="font-semibold text-[#324C4D]">{post.category}</span>
                                        {' · '}{post.type === 'article' ? 'Article' : 'Discussion'}
                                    </p>
                                    <h3 className="mt-1 text-base font-bold leading-snug text-[#033135] sm:text-lg">
                                        {post.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-[#647572]">{post.description}</p>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <button
                                                onClick={() => toggleLike(post.id)}
                                                className={`flex items-center gap-1.5 text-sm ${liked ? 'text-red-500' : 'text-[#647572]'}`}
                                            >
                                                <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                                                {post.likes + (liked ? 1 : 0)}
                                            </button>

                                            <button
                                                onClick={() => toast('Comments will be available soon.')}
                                                className="flex items-center gap-1.5 text-sm text-[#647572]"
                                            >
                                                <MessageCircle size={18} />
                                                {post.comments}
                                            </button>

                                            <button
                                                onClick={() => toast('Share feature coming soon.')}
                                                className="text-[#647572]"
                                                aria-label="Share"
                                            >
                                                <Share2 size={17} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => toggleSave(post.id)}
                                            className={saved ? 'text-[#033135]' : 'text-[#647572]'}
                                            aria-label={saved ? 'Remove from saved' : 'Save post'}
                                        >
                                            <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Empty state */}
            {isEmpty && (
                <div className="rounded-2xl bg-white px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-[#033135]">Nothing matches your search</p>
                    <p className="mt-1 text-xs text-[#647572]">Try a different topic, or clear the search to see everything.</p>
                </div>
            )}

            {/* Guidelines */}
            <aside className="flex items-start gap-3 rounded-2xl bg-[#E4F0EA] p-4">
                <BookOpen size={18} className="mt-0.5 shrink-0 text-[#324C4D]" />
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#033135]">A safe space to learn and share</h3>
                    <p className="mt-1 text-xs leading-5 text-[#647572] sm:text-sm">
                        Learn from verified health professionals, and remember that personal
                        experiences are not a substitute for professional medical advice.
                    </p>
                </div>
            </aside>
        </div>
    )
}

export default Community