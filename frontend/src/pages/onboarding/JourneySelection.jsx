import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    HeartPulse,
    Activity,
    Apple,
    Moon,
    Trophy,
    ClipboardList,
    Pill,
    CalendarDays,
    TrendingUp,
    ArrowRight,
    Check,
} from 'lucide-react'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function JourneySelection() {
    const navigate = useNavigate()
    const [selected, setSelected] = useState('wellness')

    const journeys = [
        {
            id: 'wellness',
            title: 'Wellness Journey',
            tag: 'For everyday wellness',
            subtitle: 'Build healthier habits, one day at a time.',
            description:
                'For individuals who want to improve their fitness, nutrition, sleep and overall well-being.',
            icon: Activity,
            color: 'bg-[#E4F0EA]',
            features: [
                { icon: Activity, label: 'Fitness & Activity' },
                { icon: Apple, label: 'Nutrition Tracking' },
                { icon: Moon, label: 'Sleep & Recovery' },
                { icon: Trophy, label: 'Challenges & Rewards' },
            ],
        },
        {
            id: 'health',
            title: 'Health Management',
            tag: 'For ongoing care',
            subtitle: 'Stay informed and manage your health better.',
            description:
                'For individuals managing an existing health condition, following a treatment plan or recovering.',
            icon: HeartPulse,
            color: 'bg-[#DCD6F7]',
            features: [
                { icon: ClipboardList, label: 'Health Records' },
                { icon: Pill, label: 'Medication Reminders' },
                { icon: CalendarDays, label: 'Appointments' },
                { icon: TrendingUp, label: 'Health Progress' },
            ],
        },
    ]

    const handleContinue = () => {
        // Both journeys go through the same health profile setup
        navigate('/wellness-setup', { state: { journey: selected } })
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7] px-4 py-8 sm:px-8">
            <style>{`
                @keyframes fk-up {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fk-up { animation: fk-up 0.6s ease-out both; }
                @media (prefers-reduced-motion: reduce) {
                    .fk-up { animation: none; }
                }
            `}</style>

            <div className="mx-auto max-w-4xl">

                {/* Header */}
                <div className="mb-10 flex items-center justify-between gap-3 sm:mb-14">
                    <h1
                        className="flex items-end text-2xl leading-none text-[#033135]"
                        style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
                    >
                        FITKEY
                        <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
                    </h1>

                    <span className="text-[10px] font-semibold tracking-[0.18em] text-[#647572] sm:text-xs">
                        PERSONALIZE YOUR EXPERIENCE
                    </span>
                </div>

                {/* Heading */}
                <div className="fk-up mb-9 text-center sm:mb-12">
                    <h2
                        className="text-4xl leading-tight text-[#033135] sm:text-5xl"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Choose your journey
                        <span className="ml-1 inline-block h-[0.14em] w-[0.14em] rounded-full bg-[#E0AE3A] align-baseline" />
                    </h2>

                    <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#647572]">
                        Everyone has different health needs. Choose how you'd like
                        FitKey to support you on your journey.
                    </p>
                </div>

                {/* Journey Cards */}
                <div
                    role="radiogroup"
                    aria-label="Choose your journey"
                    className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
                >
                    {journeys.map((journey, index) => {
                        const Icon = journey.icon
                        const isSelected = selected === journey.id

                        return (
                            <button
                                key={journey.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => setSelected(journey.id)}
                                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                                className={`fk-up flex h-full flex-col rounded-3xl border-2 p-5 text-left transition-all duration-300 sm:p-7 ${isSelected
                                    ? `border-[#033135] ${journey.color} shadow-md`
                                    : 'border-[#E8EFEB] bg-white hover:-translate-y-0.5 hover:border-[#C4D7D4]'
                                    }`}
                            >
                                {/* top row */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${isSelected ? 'bg-white/80' : journey.color
                                        }`}>
                                        <Icon size={26} className="text-[#033135]" />
                                    </div>

                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${isSelected
                                        ? 'border-[#033135] bg-[#033135] text-white'
                                        : 'border-[#C4D7D4] bg-white'
                                        }`}>
                                        {isSelected && <Check size={15} strokeWidth={3} />}
                                    </div>
                                </div>

                                {/* text */}
                                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-[#647572] sm:text-[11px]">
                                    {journey.tag}
                                </p>

                                <h3
                                    className="mt-1.5 text-2xl leading-snug text-[#033135]"
                                    style={{ fontFamily: SERIF }}
                                >
                                    {journey.title}
                                </h3>

                                <p className="mt-1.5 text-sm font-medium text-[#324C4D]">
                                    {journey.subtitle}
                                </p>

                                <p className="mt-4 text-sm leading-6 text-[#647572]">
                                    {journey.description}
                                </p>

                                {/* features */}
                                <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                                    {journey.features.map((feature) => {
                                        const FeatureIcon = feature.icon

                                        return (
                                            <div
                                                key={feature.label}
                                                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${isSelected ? 'bg-white/70' : 'bg-[#F8FAF7]'
                                                    }`}
                                            >
                                                <FeatureIcon size={15} className="shrink-0 text-[#324C4D]" />
                                                <span className="text-[11px] font-medium leading-tight text-[#324C4D] sm:text-xs">
                                                    {feature.label}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Continue */}
                <div className="mx-auto mt-8 max-w-md sm:mt-10">
                    <button
                        onClick={handleContinue}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#033135] px-6 py-4 font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.99]"
                    >
                        Continue <ArrowRight size={19} />
                    </button>

                    <p className="mt-5 text-center text-xs text-[#647572]">
                        You can change your journey later from your profile settings.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default JourneySelection