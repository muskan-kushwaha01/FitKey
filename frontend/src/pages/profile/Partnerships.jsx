import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
    Gift, Heart, Dumbbell, Apple, Sparkles,
    ArrowUpRight, ShieldCheck, Tag, Lock
} from 'lucide-react'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

// Demo partner campaigns stay visible until a live partner campaign source exists.
const campaigns = [
    {
        brand: 'Wellness Essentials',
        category: 'Nutrition',
        title: 'Make healthy eating a habit',
        description: 'Explore nutrition products and resources for your everyday wellness journey.',
        offer: '15% OFF',
        color: 'bg-[#E4F0EA]',
        accent: 'text-[#324C4D]',
        icon: Apple,
    },
    {
        brand: 'ActiveLife',
        category: 'Fitness',
        title: 'Move more, feel better',
        description: 'Discover fitness accessories and tools to support your active lifestyle.',
        offer: '20% OFF',
        color: 'bg-[#FFD9C7]',
        accent: 'text-[#A45E45]',
        icon: Dumbbell,
    },
    {
        brand: 'Mindful Moments',
        category: 'Mental Wellness',
        title: 'Take time for yourself',
        description: 'Explore resources designed to support relaxation and mindful routines.',
        offer: 'FREE TRIAL',
        color: 'bg-[#DCD6F7]',
        accent: 'text-[#6B5B95]',
        icon: Heart,
    },
]

const categories = [
    { name: 'All', icon: Gift, color: 'bg-[#F8E7A5]' },
    { name: 'Nutrition', icon: Apple, color: 'bg-[#E4F0EA]' },
    { name: 'Fitness', icon: Dumbbell, color: 'bg-[#FFD9C7]' },
    { name: 'Mental Wellness', icon: Heart, color: 'bg-[#DCD6F7]' },
]

function Partnerships() {
    const [saved, setSaved] = useState([])
    const [activeCategory, setActiveCategory] = useState('All')

    const toggleSave = (brand) => {
        const alreadySaved = saved.includes(brand)
        setSaved((prev) =>
            alreadySaved
                ? prev.filter((item) => item !== brand)
                : [...prev, brand]
        )
        toast(alreadySaved ? 'Removed from saved offers.' : 'Saved to your offers.')
    }

    const visibleCampaigns = campaigns.filter(
        (c) => activeCategory === 'All' || c.category === activeCategory
    )

    return (
        <div className="space-y-7 pb-8">
            {/* Heading */}
            <div>
                <p className="text-sm text-[#647572]">Discover opportunities</p>
                <h1
                    className="text-3xl sm:text-4xl text-[#033135]"
                    style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                >
                    Brand Partnerships
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-[#647572]">
                    Explore exclusive wellness offers and campaigns from our brand partners.
                </p>
            </div>

            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-[#033135] p-7 text-white sm:p-9">
                <div className="relative z-10 max-w-xl">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
                        <Sparkles size={14} /> FitKey Partner Network
                    </span>

                    <h2
                        className="mt-5 text-3xl sm:text-4xl"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Better wellness, together.
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-white/75">
                        Discover useful products, services and wellness campaigns
                        from brands that support healthier lifestyles.
                    </p>

                    <button
                        onClick={() => document.getElementById('campaigns')?.scrollIntoView({ behavior: 'smooth' })}
                        className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#033135] hover:bg-[#E4F0EA]"
                    >
                        Explore campaigns
                    </button>
                </div>

                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full border-[25px] border-white/10" />
                <div className="pointer-events-none absolute -bottom-24 right-20 h-56 w-56 rounded-full bg-[#C4D7D4]/15" />
            </div>

            {/* Trust message */}
            <div className="relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[#DCE6E1] bg-gradient-to-r from-white to-[#F4F8F5] p-5">
                <span className="absolute left-0 top-5 h-12 w-1 rounded-r-full bg-[#324C4D]" />

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135]">
                    <ShieldCheck size={22} />
                </div>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#033135]">
                            Your health data stays yours
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#324C4D] ring-1 ring-[#DCE6E1]">
                            <Lock size={10} /> Privacy first
                        </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-[#647572]">
                        Brand partners do not receive your private health records.
                        Sponsored offers are clearly labelled and do not influence
                        medical recommendations.
                    </p>
                </div>
            </div>

            {/* Categories */}
            <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                    <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                        Explore categories
                    </h2>
                    <p className="text-xs text-[#647572]">Tap to filter</p>
                </div>

                <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categories.map((item) => {
                        const Icon = item.icon
                        const active = activeCategory === item.name

                        return (
                            <button
                                key={item.name}
                                onClick={() => setActiveCategory(item.name)}
                                aria-pressed={active}
                                className={`flex shrink-0 items-center gap-2.5 rounded-full border py-2 pl-2 pr-4 transition ${active
                                    ? 'border-[#033135] bg-[#033135] text-white shadow-sm'
                                    : 'border-[#E5EBE7] bg-white text-[#033135] hover:border-[#C4D7D4]'
                                    }`}
                            >
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? 'bg-white/15' : item.color}`}>
                                    <Icon size={16} className={active ? 'text-white' : 'text-[#033135]'} />
                                </span>
                                <span className="whitespace-nowrap text-sm font-semibold">
                                    {item.name}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* Campaigns */}
            <section id="campaigns">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                            Featured campaigns
                        </h2>
                        <p className="mt-1 text-sm text-[#647572]">
                            {visibleCampaigns.length} {visibleCampaigns.length === 1 ? 'offer' : 'offers'} from demo brand partners
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    {visibleCampaigns.map((campaign) => {
                        const Icon = campaign.icon
                        const isSaved = saved.includes(campaign.brand)

                        return (
                            <div
                                key={campaign.brand}
                                className="group overflow-hidden rounded-3xl border border-[#E8EFEB] bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                                {/* visual */}
                                <div className={`relative flex h-36 items-center justify-center overflow-hidden ${campaign.color}`}>
                                    <div className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full border-[16px] border-white/40" />
                                    <div className="pointer-events-none absolute -bottom-12 -right-6 h-36 w-36 rounded-full bg-white/30" />

                                    <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#033135] backdrop-blur-sm">
                                        {campaign.brand}
                                    </span>

                                    <span className="absolute right-4 top-4 rounded-full bg-[#033135] px-3 py-1 text-[11px] font-bold tracking-wide text-[#F8E7A5]">
                                        {campaign.offer}
                                    </span>

                                    <div className="relative rounded-2xl bg-white/70 p-5 shadow-sm transition group-hover:scale-105">
                                        <Icon size={36} className="text-[#033135]" />
                                    </div>
                                </div>

                                {/* body */}
                                <div className="p-5">
                                    <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${campaign.accent}`}>
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {campaign.category}
                                    </p>

                                    <h3 className="mt-2 text-lg font-bold text-[#033135]">
                                        {campaign.title}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-[#647572]">
                                        {campaign.description}
                                    </p>

                                    <div className="mt-5 flex items-center gap-3 border-t border-[#F0F3F0] pt-4">
                                        <button
                                            onClick={() => toggleSave(campaign.brand)}
                                            aria-label={isSaved ? 'Remove saved campaign' : 'Save campaign'}
                                            aria-pressed={isSaved}
                                            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-3 text-sm font-semibold transition ${isSaved
                                                ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                                : 'border-[#E5EBE7] text-[#647572] hover:border-[#C4D7D4]'
                                                }`}
                                        >
                                            <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
                                            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                                        </button>

                                        <button
                                            onClick={() => toast('Campaign details will be available soon.')}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#033135] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#324C4D]"
                                        >
                                            Explore offer <ArrowUpRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {visibleCampaigns.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-[#C4D7D4] bg-white p-10 text-center">
                        <p className="text-sm font-semibold text-[#033135]">No active partnerships</p>
                        <p className="mt-1 text-xs text-[#647572]">Offers will appear here after a partner publishes a campaign.</p>
                    </div>
                )}
            </section>

            {/* Footer note */}
            <div className="rounded-2xl border border-dashed border-[#C4D7D4] bg-[#F8FAF7] p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                    <Tag size={18} className="text-[#647572]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#033135]">
                    More partnerships coming soon
                </p>
                <p className="mt-1 text-xs text-[#647572]">
                    These are illustrative campaigns for the FitKey prototype.
                </p>
            </div>
        </div>
    )
}

export default Partnerships
