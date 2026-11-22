import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FileText,
    Video,
    MessageSquare,
    Layers,
    PlusCircle,
    Inbox,
} from 'lucide-react'
import ContentCard from './ContentCard.jsx'

export function ProfessionalContentGrid({
    posts = [],
    currentUserId,
    currentUserName,
    onDeletePost,
    onUpdatePost,
    readOnly = false,
}) {
    const navigate = useNavigate()
    const [selectedTab, setSelectedTab] = useState('all')

    const counts = {
        all: posts.length,
        article: posts.filter((p) => p.type === 'article').length,
        reel: posts.filter((p) => p.type === 'reel').length,
        discussion: posts.filter((p) => p.type === 'discussion').length,
    }

    const filteredPosts = posts.filter((p) => {
        if (selectedTab === 'all') return true
        return p.type === selectedTab
    })

    const tabs = [
        { key: 'all', label: 'All Content', icon: Layers, count: counts.all },
        { key: 'article', label: 'Articles', icon: FileText, count: counts.article },
        { key: 'reel', label: 'Reels', icon: Video, count: counts.reel },
        { key: 'discussion', label: 'Discussions', icon: MessageSquare, count: counts.discussion },
    ]

    // Dynamic grid layout tailored per content type:
    // - Reels: 2 to 4 columns portrait grid (YT Shorts / IG Reels style)
    // - Articles: 1 to 2 columns editorial grid
    // - Discussions: 1 to 2 columns conversational forum grid
    // - All: Responsive 1 to 3 columns
    const gridClass =
        selectedTab === 'reel'
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
            : selectedTab === 'article'
            ? 'grid grid-cols-1 sm:grid-cols-2 gap-5'
            : selectedTab === 'discussion'
            ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start'

    return (
        <section className="space-y-5">
            {/* Filter Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-1.5 sm:gap-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = selectedTab === tab.key
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setSelectedTab(tab.key)}
                                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                                    isActive
                                        ? 'bg-[#033135] text-white shadow-xs'
                                        : 'bg-[#FAFBF9] text-[#647572] hover:bg-[#E4F0EA] hover:text-[#033135]'
                                }`}
                            >
                                <Icon size={14} />
                                <span>{tab.label}</span>
                                <span
                                    className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-[#E8EFEB] text-[#647572]'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {!readOnly && (
                    <button
                        type="button"
                        onClick={() => navigate('/professional/content/create')}
                        className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#033135] hover:text-[#648C83] transition"
                    >
                        <PlusCircle size={15} />
                        <span>New Post</span>
                    </button>
                )}
            </div>

            {/* Grid of Content Cards */}
            {filteredPosts.length > 0 ? (
                <div className={gridClass}>
                    {filteredPosts.map((post) => (
                        <ContentCard
                            key={post.id}
                            post={post}
                            currentUserId={currentUserId}
                            currentUserName={currentUserName}
                            onDelete={readOnly ? undefined : onDeletePost}
                            onUpdate={readOnly ? undefined : onUpdatePost}
                            readOnly={readOnly}
                        />
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="rounded-3xl border-2 border-dashed border-[#DCE7E3] bg-[#FAFBF9] p-8 sm:p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4F0EA] text-[#033135]">
                        <Inbox size={26} />
                    </div>

                    <h3 className="mt-4 text-base font-bold text-[#033135]">
                        {selectedTab === 'all'
                            ? 'No Published Content Yet'
                            : `No ${selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}s Published`}
                    </h3>

                    <p className="mx-auto mt-1 max-w-sm text-xs text-[#647572] leading-relaxed">
                        Publish clinical guides, patient exercise reels, or start medical discussions to build your verified practice authority.
                    </p>

                    {!readOnly && (
                        <button
                            type="button"
                            onClick={() => navigate('/professional/content/create')}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#033135] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#324C4D] active:scale-[0.99]"
                        >
                            <PlusCircle size={16} />
                            <span>Create Your First Post</span>
                        </button>
                    )}
                </div>
            )}
        </section>
    )
}

export default ProfessionalContentGrid
