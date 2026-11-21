
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
    CheckCircle2,
    Sparkles,
} from 'lucide-react'

function JourneySelection() {
    const navigate = useNavigate()
    const [selected, setSelected] = useState('wellness')

    const journeys = [
        {
            id: 'wellness',
            title: 'Wellness Journey',
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
        if (selected === 'wellness') {
            navigate('/wellness-setup')
        } else {
            navigate('/health-management-setup')
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-3xl">

                {/* Header */}
                <div className="mb-10 flex items-center justify-between">
                    <h1 className="text-2xl font-extrabold text-[#033135]">
                        FitKey<span className="text-[#647572]">.</span>
                    </h1>

                    <span className="rounded-full bg-[#E4F0EA] px-4 py-2 text-xs font-semibold text-[#324C4D]">
                        PERSONALIZE YOUR EXPERIENCE
                    </span>
                </div>

                {/* Heading */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C4D7D4] text-[#033135]">
                        <Sparkles size={27} />
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-[#033135] sm:text-4xl">
                        Choose your journey
                    </h2>

                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#647572]">
                        Everyone has different health needs. Choose how you'd like
                        FitKey to support you on your journey.
                    </p>
                </div>

                {/* Journey Cards */}
                <div className="space-y-5">
                    {journeys.map((journey) => {
                        const Icon = journey.icon
                        const isSelected = selected === journey.id

                        return (
                            <button
                                key={journey.id}
                                type="button"
                                onClick={() => setSelected(journey.id)}
                                className={`w-full rounded-3xl border-2 p-5 text-left transition-all sm:p-7 ${isSelected
                                        ? 'border-[#033135] bg-white shadow-md'
                                        : 'border-transparent bg-white shadow-sm hover:border-[#C4D7D4]'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-4">
                                        <div className={`rounded-2xl p-3 ${journey.color}`}>
                                            <Icon size={27} className="text-[#033135]" />
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-[#033135] sm:text-xl">
                                                {journey.title}
                                            </h3>
                                            <p className="mt-1 text-sm font-medium text-[#324C4D]">
                                                {journey.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSelected
                                            ? 'border-[#033135] bg-[#033135] text-white'
                                            : 'border-[#C4D7D4]'
                                        }`}>
                                        {isSelected && <CheckCircle2 size={17} />}
                                    </div>
                                </div>

                                <p className="mt-5 text-sm leading-6 text-[#647572]">
                                    {journey.description}
                                </p>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    {journey.features.map((feature) => {
                                        const FeatureIcon = feature.icon

                                        return (
                                            <div
                                                key={feature.label}
                                                className="flex items-center gap-2 rounded-xl bg-[#F8FAF7] p-3"
                                            >
                                                <FeatureIcon size={17} className="shrink-0 text-[#324C4D]" />
                                                <span className="text-xs font-medium text-[#324C4D]">
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
                <button
                    onClick={handleContinue}
                    className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#033135] px-6 py-4 font-semibold text-white transition hover:bg-[#324C4D]"
                >
                    Continue <ArrowRight size={19} />
                </button>

                <p className="mt-5 text-center text-xs text-[#647572]">
                    You can change your journey later from your profile settings.
                </p>
            </div>
        </div>
    )
}

export default JourneySelection
