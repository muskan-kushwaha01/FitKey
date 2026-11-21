import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Moon, Heart, Salad, Dumbbell, Sparkles, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const goals = [
    { id: 'fitness', label: 'Improve fitness', icon: Dumbbell, color: 'bg-[#FFD9C7]' },
    { id: 'sleep', label: 'Better sleep', icon: Moon, color: 'bg-[#DCD6F7]' },
    { id: 'nutrition', label: 'Healthy nutrition', icon: Salad, color: 'bg-[#E4F0EA]' },
    { id: 'stress', label: 'Manage stress', icon: Heart, color: 'bg-[#F8E7A5]' },
    { id: 'wellness', label: 'Overall wellness', icon: Sparkles, color: 'bg-[#C4D7D4]' },
]

const activityLevels = [
    { id: 'light', label: 'Light', description: 'Mostly sitting, little exercise', level: 1 },
    { id: 'moderate', label: 'Moderate', description: 'Some activity during the week', level: 2 },
    { id: 'active', label: 'Active', description: 'Regular exercise or sports', level: 3 },
]

/* Three ascending bars, filled up to `level` */
function LevelBars({ level, selected }) {
    return (
        <div className="flex h-6 items-end gap-1" aria-hidden="true">
            {[1, 2, 3].map((n) => (
                <span
                    key={n}
                    className={`w-1.5 rounded-full transition-colors ${n <= level
                        ? selected ? 'bg-[#033135]' : 'bg-[#324C4D]'
                        : 'bg-[#C4D7D4]/60'
                        }`}
                    style={{ height: `${6 + n * 6}px` }}
                />
            ))}
        </div>
    )
}

function SectionTitle({ number, title, hint }) {
    return (
        <div className="mb-4 flex items-start gap-3">
            <span
                className="pt-0.5 text-lg leading-none text-[#E0AE3A]"
                style={{ fontFamily: SERIF }}
            >
                {number}
            </span>
            <div>
                <h2 className="font-semibold text-[#033135]">{title}</h2>
                {hint && <p className="mt-1 text-xs text-[#647572]">{hint}</p>}
            </div>
        </div>
    )
}

function WellnessSetup() {
    const navigate = useNavigate()

    const [age, setAge] = useState('')
    const [goal, setGoal] = useState('wellness')
    const [activity, setActivity] = useState('moderate')

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!age || Number(age) < 13 || Number(age) > 100) {
            toast.error('Please enter an age between 13 and 100')
            return
        }

        // We'll save this information to Supabase later.
        const wellnessProfile = {
            age: Number(age),
            goal,
            activity,
        }

        console.log('Wellness profile:', wellnessProfile)

        navigate('/home')
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7] px-4 py-8 sm:py-12">
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

            <div className="mx-auto max-w-2xl">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        className="flex items-center gap-2 text-sm text-[#647572] transition hover:text-[#033135]"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    <span className="text-xs font-semibold tracking-[0.18em] text-[#647572]">
                        STEP 1 OF 1
                    </span>
                </div>

                {/* Progress */}
                <div className="mb-10 h-1 w-full rounded-full bg-[#E4F0EA]">
                    <div className="relative h-full w-full rounded-full bg-[#033135]">
                        <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#E0AE3A] ring-4 ring-[#F8FAF7]" />
                    </div>
                </div>

                {/* Introduction */}
                <div className="fk-up mb-9">
                    <p className="mb-3 text-[11px] font-bold tracking-[0.18em] text-[#647572] sm:text-xs">
                        LET'S PERSONALIZE YOUR EXPERIENCE
                    </p>

                    <h1
                        className="text-4xl leading-tight text-[#033135] sm:text-5xl"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        A little about you
                        <span className="ml-1 inline-block h-[0.14em] w-[0.14em] rounded-full bg-[#E0AE3A] align-baseline" />
                    </h1>

                    <p className="mt-4 max-w-md leading-6 text-[#647572]">
                        Tell us a few things so FitKey can make your wellness journey
                        more relevant to you.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Age */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-7" style={{ animationDelay: '0.1s' }}>
                        <SectionTitle number="01" title="How old are you?" />

                        <div className="relative">
                            <input
                                id="age"
                                type="number"
                                min="13"
                                max="100"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="25"
                                aria-label="Your age"
                                className="w-full rounded-2xl border border-[#DCE6E1] bg-[#F8FAF7] px-5 py-4 pr-20 text-2xl font-semibold text-[#033135] outline-none transition placeholder:text-[#C4D7D4] focus:border-[#033135] focus:bg-white"
                                style={{ fontFamily: SERIF }}
                            />
                            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#647572]">
                                years
                            </span>
                        </div>

                        <p className="mt-2 text-xs text-[#647572]">
                            Between 13 and 100.
                        </p>
                    </div>

                    {/* Wellness Goal */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-7" style={{ animationDelay: '0.2s' }}>
                        <SectionTitle
                            number="02"
                            title="What's your main wellness goal?"
                            hint="Choose what matters most to you right now."
                        />

                        <div role="radiogroup" aria-label="Main wellness goal" className="grid grid-cols-2 gap-3">
                            {goals.map((item) => {
                                const Icon = item.icon
                                const selected = goal === item.id

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setGoal(item.id)}
                                        className={`relative flex flex-col items-start gap-6 rounded-2xl border-2 p-4 text-left transition-all [&:last-child:nth-child(odd)]:col-span-2 ${selected
                                            ? `border-[#033135] ${item.color}`
                                            : 'border-[#E8EFEB] bg-white hover:border-[#C4D7D4]'
                                            }`}
                                    >
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${selected ? 'bg-white/80' : item.color
                                            }`}>
                                            <Icon size={20} className="text-[#033135]" />
                                        </div>

                                        <span className="text-sm font-semibold text-[#033135]">
                                            {item.label}
                                        </span>

                                        {selected && (
                                            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#033135] text-white">
                                                <Check size={14} strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Activity Level */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-7" style={{ animationDelay: '0.3s' }}>
                        <SectionTitle
                            number="03"
                            title="How active are you usually?"
                            hint="This helps us understand your current routine."
                        />

                        <div role="radiogroup" aria-label="Activity level" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {activityLevels.map((item) => {
                                const selected = activity === item.id

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setActivity(item.id)}
                                        className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all sm:flex-col sm:items-start sm:gap-5 ${selected
                                            ? 'border-[#033135] bg-[#E4F0EA]'
                                            : 'border-[#E8EFEB] bg-white hover:border-[#C4D7D4]'
                                            }`}
                                    >
                                        <LevelBars level={item.level} selected={selected} />

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[#033135]">
                                                {item.label}
                                            </p>
                                            <p className="mt-1 text-xs leading-4 text-[#647572]">
                                                {item.description}
                                            </p>
                                        </div>

                                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 sm:hidden ${selected ? 'border-[#033135]' : 'border-[#C4D7D4]'
                                            }`}>
                                            {selected && <div className="h-2.5 w-2.5 rounded-full bg-[#033135]" />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#033135] py-4 font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.99]"
                        >
                            Continue to FitKey
                            <ArrowRight size={19} />
                        </button>

                        <p className="mt-4 text-center text-xs text-[#647572]">
                            You can update these preferences anytime from your profile.
                        </p>
                    </div>

                </form>
            </div>
        </div>
    )
}

export default WellnessSetup