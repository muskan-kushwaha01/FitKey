import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Search, Plus, BookOpen, X,
    FileText, Video, MessageSquare, Layers,
    RefreshCw, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchApprovedCommunityFeed } from '../../services/communityService.js'
import ProfessionalPostCard from '../../components/community/ProfessionalPostCard.jsx'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const TABS = [
    { key: 'all', label: 'For You', icon: Layers },
    { key: 'article', label: 'Articles', icon: FileText },
    { key: 'reel', label: 'Reels', icon: Video },
    { key: 'discussion', label: 'Discussions', icon: MessageSquare },
]

function Community() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const userId = user?.id || null
    const [activeTab, setActiveTab] = useState('all')
    const [search, setSearch] = useState('')
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [refreshTick, setRefreshTick] = useState(0)

    const loadPosts = useCallback(() => {
        setLoading(true)
        setLoadError('')
        setRefreshTick((t) => t + 1)
    }, [])

    const handleTabSelect = (tabKey) => {
        if (tabKey === activeTab) return
        setLoading(true)
        setLoadError('')
        setActiveTab(tabKey)
    }

    useEffect(() => {
        let active = true
        const type = activeTab === 'all' ? 'all' : activeTab
        fetchApprovedCommunityFeed(userId, { type, limit: 60 })
            .then((feedPosts) => {
                if (!active) return
                setPosts(feedPosts)
                setLoadError('')
            })
            .catch((err) => {
                if (!active) return
                console.error('[Community] loadPosts error:', err)
                setLoadError('Could not load community posts. Please try again.')
                toast.error('Could not load posts.')
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => { active = false }
    }, [activeTab, userId, refreshTick])

    const handlePostUpdated = useCallback((postId, patch) => {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)))
    }, [])

    // Client-side search filter
    const query = search.trim().toLowerCase()
    const filteredPosts = query
        ? posts.filter((p) =>
            (p.title || '').toLowerCase().includes(query) ||
            (p.description || '').toLowerCase().includes(query) ||
            (p.caption || '').toLowerCase().includes(query) ||
            (p.content || '').toLowerCase().includes(query) ||
            (p.category || '').toLowerCase().includes(query) ||
            (p.authorName || '').toLowerCase().includes(query) ||
            (p.authorSpecialty || '').toLowerCase().includes(query)
        )
        : posts

    const handleNavigateToProfile = (professionalId) => {
        if (!professionalId) return
        navigate(`/professional/public/${professionalId}`)
    }

    // Separate reels for the YouTube/Instagram shelf in "For You"
    const reelsInFeed = filteredPosts.filter((p) => p.type === 'reel')
    const nonReelsInFeed = filteredPosts.filter((p) => p.type !== 'reel')

    return (
        <div className="space-y-5 sm:space-y-6">

            {/* Header */}
            <header className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1
                        className="text-3xl text-[#033135] sm:text-4xl"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Community
                    </h1>
                    <p className="mt-1 text-xs text-[#647572] sm:text-sm">
                        Verified medical insights, rehabilitation reels &amp; clinical discussions.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadPosts}
                        aria-label="Refresh feed"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4F0EA] text-[#033135] transition hover:bg-[#D4E6DA]"
                    >
                        <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => toast('Post creation is available for verified professionals.')}
                        aria-label="Create post"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#033135] text-white transition hover:bg-[#324C4D] sm:h-12 sm:w-12"
                    >
                        <Plus size={22} />
                    </button>
                </div>
            </header>

            {/* Search */}
            <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#647572]" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search topics, doctors, exercises, nutrition..."
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

            {/* Filter tabs */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabSelect(tab.key)}
                            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                                activeTab === tab.key
                                    ? 'bg-[#033135] text-white shadow-xs'
                                    : 'bg-white text-[#647572] ring-1 ring-inset ring-[#E8EFEB] hover:bg-[#E4F0EA]'
                            }`}
                        >
                            <Icon size={13} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Loading / Error / Content */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
                </div>
            ) : loadError ? (
                <div className="rounded-3xl bg-white px-6 py-12 text-center border border-[#E8EFEB] space-y-3">
                    <p className="text-sm font-semibold text-[#033135]">{loadError}</p>
                    <button
                        onClick={loadPosts}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#033135] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#324C4D]"
                    >
                        <RefreshCw size={13} />
                        Try again
                    </button>
                </div>
            ) : filteredPosts.length > 0 ? (
                <div className="space-y-7">

                    {/* ── 1. "FOR YOU" MIXED FEED WITH YT SHORTS / IG REELS STRIP ── */}
                    {activeTab === 'all' && !query && (
                        <>
                            {/* Reels Horizontal Shelf (YouTube Shorts / Instagram Reels Style) */}
                            {reelsInFeed.length > 0 && (
                                <section className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#DCD6F7] text-[#6B5B95]">
                                                <Video size={14} />
                                            </span>
                                            <h2 className="text-base font-bold text-[#033135]" style={{ fontFamily: SERIF }}>
                                                Reels &amp; Health Shorts
                                            </h2>
                                        </div>
                                        <button
                                            onClick={() => handleTabSelect('reel')}
                                            className="text-xs font-bold text-[#033135] hover:text-[#648C83] flex items-center gap-1 transition"
                                        >
                                            <span>See all ({reelsInFeed.length})</span>
                                            <ArrowRight size={13} />
                                        </button>
                                    </div>

                                    {/* Horizontal Swipeable Strip of 9:16 Reels */}
                                    <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 snap-x">
                                        {reelsInFeed.map((reel) => (
                                            <div key={reel.id} className="w-[160px] sm:w-[190px] shrink-0 snap-start">
                                                <ProfessionalPostCard
                                                    post={reel}
                                                    onNavigateToProfile={handleNavigateToProfile}
                                                    onPostUpdated={handlePostUpdated}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Main Feed: Distinct Articles & Discussions Stream */}
                            <section className="space-y-3">
                                <h2 className="text-base font-bold text-[#033135]" style={{ fontFamily: SERIF }}>
                                    Latest Clinical Perspectives &amp; Discussions
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                    {nonReelsInFeed.map((post) => (
                                        <ProfessionalPostCard
                                            key={post.id}
                                            post={post}
                                            onNavigateToProfile={handleNavigateToProfile}
                                            onPostUpdated={handlePostUpdated}
                                        />
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    {/* ── 2. REELS DEDICATED VIEW (Vertical 9:16 Shorts Grid) ── */}
                    {activeTab === 'reel' && !query && (
                        <section className="space-y-3">
                            <p className="text-xs text-[#647572]">
                                Vertical video rehabilitation drills, clinical explainers, and daily micro-habits.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {filteredPosts.map((post) => (
                                    <ProfessionalPostCard
                                        key={post.id}
                                        post={post}
                                        onNavigateToProfile={handleNavigateToProfile}
                                        onPostUpdated={handlePostUpdated}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── 3. ARTICLES DEDICATED VIEW (Editorial Grid) ── */}
                    {activeTab === 'article' && !query && (
                        <section className="space-y-3">
                            <p className="text-xs text-[#647572]">
                                Evidence-based articles and preventive health guides published by accredited doctors and clinicians.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {filteredPosts.map((post) => (
                                    <ProfessionalPostCard
                                        key={post.id}
                                        post={post}
                                        onNavigateToProfile={handleNavigateToProfile}
                                        onPostUpdated={handlePostUpdated}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── 4. DISCUSSIONS DEDICATED VIEW (Conversational Forum Stream) ── */}
                    {activeTab === 'discussion' && !query && (
                        <section className="space-y-3">
                            <p className="text-xs text-[#647572]">
                                Clinical queries and patient wellness discussions started by healthcare professionals.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredPosts.map((post) => (
                                    <ProfessionalPostCard
                                        key={post.id}
                                        post={post}
                                        onNavigateToProfile={handleNavigateToProfile}
                                        onPostUpdated={handlePostUpdated}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Search results view when query is active */}
                    {query && (
                        <div className="space-y-3">
                            <p className="text-xs text-[#647572]">
                                {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''} matching &ldquo;{query}&rdquo;
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredPosts.map((post) => (
                                    <ProfessionalPostCard
                                        key={post.id}
                                        post={post}
                                        onNavigateToProfile={handleNavigateToProfile}
                                        onPostUpdated={handlePostUpdated}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-3xl bg-white px-6 py-14 text-center border border-[#E8EFEB]">
                    {query ? (
                        <>
                            <p className="text-sm font-semibold text-[#033135]">Nothing matches your search</p>
                            <p className="mt-1 text-xs text-[#647572]">Try a different topic or clear the search input.</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-[#033135]">
                                No {activeTab === 'all' ? 'content' : activeTab + 's'} published yet
                            </p>
                            <p className="mt-1 text-xs text-[#647572]">
                                Verified doctors and specialists publish here. Check back soon!
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Guidelines banner */}
            <aside className="flex items-start gap-3 rounded-2xl bg-[#E4F0EA] p-4">
                <BookOpen size={18} className="mt-0.5 shrink-0 text-[#324C4D]" />
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#033135]">A safe space to learn and share</h3>
                    <p className="mt-1 text-xs leading-5 text-[#647572] sm:text-sm">
                        All articles, reels, and discussions are published by accredited health practitioners.
                        Personal experiences are educational and not a replacement for medical diagnosis.
                    </p>
                </div>
            </aside>
        </div>
    )
}

export default Community
