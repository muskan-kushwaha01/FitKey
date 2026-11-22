import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, ChevronDown, User, Ruler, Weight, Droplets } from 'lucide-react'
import toast from 'react-hot-toast'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Don't know"]
const sexOptions = ["Male", "Female", "Other", "Prefer not to say"]

/* ─── Height Ruler Visual ──────────────────────────────────────── */
function HeightRuler({ value, onChange }) {
    const min = 100, max = 220
    const pct = ((value - min) / (max - min)) * 100

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-center gap-2">
                <span className="text-5xl font-bold text-[#033135]" style={{ fontFamily: SERIF }}>{value}</span>
                <span className="mb-2 text-lg text-[#647572]">cm</span>
            </div>

            {/* Ruler track */}
            <div className="relative mx-auto w-full max-w-xs">
                <div className="relative h-14 overflow-hidden rounded-2xl bg-[#E4F0EA]">
                    {/* Filled portion */}
                    <div
                        className="absolute bottom-0 left-0 h-full rounded-2xl bg-gradient-to-r from-[#033135] to-[#324C4D] transition-all duration-200"
                        style={{ width: `${pct}%` }}
                    />
                    {/* Tick marks */}
                    <div className="absolute inset-0 flex items-end pb-1 px-2 gap-[3px]">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 rounded-t-sm transition-colors ${i / 24 * 100 <= pct ? 'bg-white/40' : 'bg-[#C4D7D4]/50'}`}
                                style={{ height: i % 4 === 0 ? '50%' : i % 2 === 0 ? '35%' : '20%' }}
                            />
                        ))}
                    </div>
                    {/* Thumb indicator */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-1.5 rounded-full bg-[#E0AE3A] shadow-md transition-all duration-200"
                        style={{ left: `${pct}%` }}
                    />
                </div>
                <input
                    type="range"
                    min={min} max={max}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Height in centimeters"
                />
            </div>

            <div className="flex justify-between text-xs text-[#647572] px-1">
                <span>{min} cm</span>
                <span>{max} cm</span>
            </div>
        </div>
    )
}

/* ─── Weight Dial Visual ───────────────────────────────────────── */
function WeightInput({ value, onChange }) {
    const min = 30, max = 200

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-center gap-2">
                <span className="text-5xl font-bold text-[#033135]" style={{ fontFamily: SERIF }}>{value}</span>
                <span className="mb-2 text-lg text-[#647572]">kg</span>
            </div>

            <div className="relative mx-auto w-full max-w-xs">
                <div className="relative h-10 overflow-hidden rounded-2xl bg-[#E4F0EA]">
                    <div
                        className="absolute bottom-0 left-0 h-full rounded-2xl bg-gradient-to-r from-[#033135] to-[#324C4D] transition-all duration-200"
                        style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-1.5 rounded-full bg-[#E0AE3A] shadow-md transition-all duration-200"
                        style={{ left: `${((value - min) / (max - min)) * 100}%` }}
                    />
                </div>
                <input
                    type="range"
                    min={min} max={max}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Weight in kilograms"
                />
            </div>

            <div className="flex justify-between text-xs text-[#647572] px-1">
                <span>{min} kg</span>
                <span>{max} kg</span>
            </div>
        </div>
    )
}

function WellnessSetup() {
    const navigate = useNavigate()

    const [age, setAge] = useState('')
    const [sex, setSex] = useState('')
    const [height, setHeight] = useState(170)
    const [weight, setWeight] = useState(70)
    const [bloodGroup, setBloodGroup] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!age || Number(age) < 13 || Number(age) > 100) {
            toast.error('Please enter an age between 13 and 100')
            return
        }
        if (!sex) {
            toast.error('Please select your biological sex')
            return
        }
        navigate('/health-history', { state: { age, sex, height, weight, bloodGroup } })
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7] px-4 py-8 sm:py-12">
            <style>{`
                @keyframes fk-up {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fk-up { animation: fk-up 0.55s ease-out both; }
                @media (prefers-reduced-motion: reduce) { .fk-up { animation: none; } }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 1px; height: 1px; }
                input[type=range]::-moz-range-thumb { width: 1px; height: 1px; border: none; }
                .custom-select { -webkit-appearance: none; appearance: none; }
            `}</style>

            <div className="mx-auto max-w-xl">

                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <button type="button" onClick={() => navigate('/journey-selection')}
                        className="flex items-center gap-2 text-sm text-[#647572] transition hover:text-[#033135]">
                        <ArrowLeft size={18} /> Back
                    </button>
                    <span className="text-xs font-semibold tracking-[0.18em] text-[#647572]">STEP 1 OF 8</span>
                </div>

                {/* Progress bar */}
                <div className="mb-10 h-1.5 w-full rounded-full bg-[#E4F0EA]">
                    <div className="relative h-full rounded-full bg-[#033135] transition-all duration-500" style={{ width: '12.5%' }}>
                        <span className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#E0AE3A] ring-4 ring-[#F8FAF7]" />
                    </div>
                </div>

                {/* Intro */}
                <div className="fk-up mb-8">
                    <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-[#647572]">BASIC INFORMATION</p>
                    <h1 className="text-4xl leading-tight text-[#033135] sm:text-5xl" style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}>
                        Tell us about you
                        <span className="ml-1 inline-block h-[0.14em] w-[0.14em] rounded-full bg-[#E0AE3A] align-baseline" />
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-[#647572]">This helps us personalise your health insights accurately.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Age */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6" style={{ animationDelay: '0.08s' }}>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4F0EA]">
                                <User size={17} className="text-[#033135]" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Age</p>
                                <p className="text-xs text-[#647572]">Your current age in years</p>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type="number" min="13" max="100" value={age}
                                onChange={e => setAge(e.target.value)}
                                placeholder="25"
                                className="w-full rounded-2xl border border-[#DCE6E1] bg-[#F8FAF7] px-5 py-4 pr-20 text-3xl font-bold text-[#033135] outline-none transition placeholder:text-[#C4D7D4] focus:border-[#033135] focus:bg-white"
                                style={{ fontFamily: SERIF }}
                            />
                            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#647572]">years</span>
                        </div>
                    </div>

                    {/* Biological Sex */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6" style={{ animationDelay: '0.14s' }}>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Biological Sex</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {sexOptions.map(option => (
                                <button key={option} type="button" onClick={() => setSex(option)}
                                    className={`rounded-2xl border-2 py-3 px-2 text-center text-xs font-semibold transition-all ${sex === option
                                        ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                        : 'border-[#E8EFEB] bg-white text-[#647572] hover:border-[#C4D7D4]'
                                        }`}>
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Height */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6" style={{ animationDelay: '0.2s' }}>
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCD6F7]">
                                <Ruler size={17} className="text-[#033135]" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Height</p>
                                <p className="text-xs text-[#647572]">Slide to set your height</p>
                            </div>
                        </div>
                        <HeightRuler value={height} onChange={setHeight} />
                    </div>

                    {/* Weight */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6" style={{ animationDelay: '0.26s' }}>
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFD9C7]">
                                <Weight size={17} className="text-[#033135]" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Current Weight</p>
                                <p className="text-xs text-[#647572]">Slide to set your weight</p>
                            </div>
                        </div>
                        <WeightInput value={weight} onChange={setWeight} />
                    </div>

                    {/* Blood Group */}
                    <div className="fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6" style={{ animationDelay: '0.32s' }}>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8E7A5]">
                                <Droplets size={17} className="text-[#033135]" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Blood Group</p>
                                <p className="text-xs text-[#647572]">Select your blood type</p>
                            </div>
                        </div>
                        <div className="relative">
                            <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}
                                className="custom-select w-full rounded-2xl border border-[#DCE6E1] bg-[#F8FAF7] px-5 py-4 text-sm font-semibold text-[#033135] outline-none transition focus:border-[#033135] focus:bg-white">
                                <option value="">Select blood group…</option>
                                {bloodGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#647572]" />
                        </div>
                    </div>

                    {/* BMI preview */}
                    {age && sex && (
                        <div className="fk-up rounded-2xl border border-[#E0AE3A]/30 bg-[#F8E7A5]/30 px-5 py-4" style={{ animationDelay: '0.1s' }}>
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">BMI Preview</p>
                            <p className="mt-1 text-2xl font-bold text-[#033135]" style={{ fontFamily: SERIF }}>
                                {(weight / ((height / 100) ** 2)).toFixed(1)}
                                <span className="ml-2 text-sm font-normal text-[#647572]">
                                    {(() => {
                                        const bmi = weight / ((height / 100) ** 2)
                                        if (bmi < 18.5) return '· Underweight'
                                        if (bmi < 25) return '· Normal'
                                        if (bmi < 30) return '· Overweight'
                                        return '· Obese'
                                    })()}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* CTA */}
                    <div className="pt-2 pb-8">
                        <button type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#033135] py-4 font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.99]">
                            Continue <ArrowRight size={19} />
                        </button>
                        <p className="mt-3 text-center text-xs text-[#647572]">Your data is private and secure.</p>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default WellnessSetup
