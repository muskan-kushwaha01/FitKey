import { useNavigate } from 'react-router-dom'
import { ArrowRight, HeartPulse, Activity, Trophy, Users, Flame, Stethoscope, UserCheck } from 'lucide-react'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const features = [
    { icon: Activity, label: 'Track wellness', color: 'bg-[#C4D7D4]' },
    { icon: Trophy, label: 'Earn rewards', color: 'bg-[#F8E7A5]' },
    { icon: Users, label: 'Join community', color: 'bg-[#DCD6F7]' },
    { icon: HeartPulse, label: 'Build healthy habits', color: 'bg-[#FFD9C7]' },
]

function Welcome() {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAF7]">
            <style>{`
                @keyframes fk-up {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fk-up { animation: fk-up 0.7s ease-out both; }
                @media (prefers-reduced-motion: reduce) {
                    .fk-up { animation: none; }
                }
            `}</style>

            {/* Navbar */}
            <header className="flex items-center justify-between px-6 py-5 md:px-12">
                <h2
                    className="flex items-end text-2xl leading-none text-[#033135]"
                    style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
                >
                    FITKEY
                    <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
                </h2>

                <button
                    onClick={() => navigate('/professional/login')}
                    className="flex items-center gap-1.5 rounded-full border border-[#DCE7E3] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#033135] transition hover:border-[#648C83] hover:bg-[#E4F0EA]"
                >
                    <Stethoscope size={14} className="text-[#648C83]" />
                    Professional Portal
                </button>
            </header>

            {/* Main content */}
            <main className="flex flex-1 items-center justify-center px-6 py-10">

                <div className="grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">

                    {/* Left content */}
                    <div className="max-w-lg">

                        <div className="fk-up inline-flex items-center gap-2 rounded-full bg-[#E4F0EA] px-4 py-2 text-sm font-medium text-[#033135]">
                            <HeartPulse size={16} />
                            Your personal wellness companion
                        </div>

                        <h1
                            className="fk-up mt-7 text-5xl leading-[1.05] text-[#033135] md:text-7xl"
                            style={{ fontFamily: SERIF, letterSpacing: '-0.02em', animationDelay: '0.1s' }}
                        >
                            Make your
                            <span className="block text-[#648C83]">
                                health a habit
                                <span className="ml-1 inline-block h-[0.12em] w-[0.12em] rounded-full bg-[#E0AE3A] align-baseline" />
                            </span>
                        </h1>

                        <p
                            className="fk-up mt-6 text-base leading-relaxed text-[#647572] md:text-lg"
                            style={{ animationDelay: '0.2s' }}
                        >
                            Take charge of your wellbeing with simple health
                            tracking, meaningful challenges and a community
                            that motivates you every day.
                        </p>

                        {/* Features */}
                        <div
                            className="fk-up mt-9 grid grid-cols-2 gap-x-4 gap-y-4"
                            style={{ animationDelay: '0.3s' }}
                        >
                            {features.map((feature) => {
                                const Icon = feature.icon

                                return (
                                    <div key={feature.label} className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.color}`}>
                                            <Icon size={20} className="text-[#033135]" />
                                        </div>
                                        <span className="text-sm font-medium text-[#324C4D]">
                                            {feature.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Actions: 2 primary buttons for User vs Professional */}
                        <div
                            className="fk-up mt-10 space-y-3"
                            style={{ animationDelay: '0.4s' }}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#033135] px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-[#324C4D] active:scale-[0.99]"
                                >
                                    <UserCheck size={18} />
                                    Continue as a User
                                    <ArrowRight size={16} />
                                </button>

                                <button
                                    onClick={() => navigate('/professional/login')}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#033135] bg-white px-6 py-4 font-semibold text-[#033135] shadow-sm transition hover:bg-[#E4F0EA] active:scale-[0.99]"
                                >
                                    <Stethoscope size={18} className="text-[#648C83]" />
                                    Continue as a Professional
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#647572]">
                                <span>
                                    Already have a user account?{' '}
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="font-semibold text-[#033135] underline hover:text-[#648C83]"
                                    >
                                        Log in
                                    </button>
                                </span>
                                <span className="text-[11px] text-[#8B6D25] font-medium">
                                    ★ FitKey Professional Experience
                                </span>
                            </div>
                        </div>

                        <p className="mt-6 text-xs text-[#647572]">
                            Small steps today. Healthier tomorrows.
                        </p>
                    </div>

                    {/* Right illustration: an arched doorway */}
                    <div className="fk-up relative hidden items-center justify-center md:flex" style={{ animationDelay: '0.25s' }}>

                        <div className="relative h-[470px] w-[340px]">

                            {/* outer arch */}
                            <div className="absolute inset-0 rounded-t-[170px] rounded-b-[2rem] bg-[#C4D7D4]" />

                            {/* inner arch */}
                            <div className="absolute inset-4 flex flex-col items-center rounded-t-[154px] rounded-b-[1.5rem] bg-[#E4F0EA]">

                                {/* sun */}
                                <span className="absolute left-1/2 top-12 h-14 w-14 -translate-x-1/2 rounded-full bg-[#F8E7A5]" />

                                {/* ground arches */}
                                <div className="absolute inset-x-0 bottom-0 flex justify-center overflow-hidden rounded-b-[1.5rem]">
                                    <svg viewBox="0 0 300 150" className="w-full" aria-hidden="true">
                                        <path d="M0 150 A150 150 0 0 1 300 150 Z" fill="#C4D7D4" opacity="0.7" />
                                        <path d="M45 150 A105 105 0 0 1 255 150 Z" fill="#DCD6F7" />
                                        <path d="M95 150 A55 55 0 0 1 205 150 Z" fill="#FFD9C7" />
                                    </svg>
                                </div>

                                {/* heart tile */}
                                <div className="relative mt-[11.5rem] flex h-24 w-24 -rotate-6 items-center justify-center rounded-[1.75rem] bg-white shadow-lg">
                                    <HeartPulse size={46} strokeWidth={1.4} className="text-[#033135]" />
                                </div>
                            </div>

                            {/* floating cards */}
                            <div className="absolute -right-8 top-20 rotate-3 rounded-2xl bg-white p-3.5 shadow-lg">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8E7A5]">
                                    <Trophy size={19} className="text-[#8B6D25]" />
                                </div>
                                <p className="mt-2 text-xs font-semibold text-[#033135]">Earn rewards</p>
                            </div>

                            <div className="absolute -left-10 bottom-24 -rotate-3 rounded-2xl bg-white p-3.5 shadow-lg">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4F0EA]">
                                    <Activity size={19} className="text-[#324C4D]" />
                                </div>
                                <p className="mt-2 text-xs font-semibold text-[#033135]">Stay active</p>
                            </div>

                            <div className="absolute -right-4 bottom-10 flex items-center gap-2 rounded-full bg-[#033135] py-2 pl-2 pr-4 text-white shadow-lg">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F8E7A5]">
                                    <Flame size={15} className="text-[#8B6D25]" />
                                </span>
                                <span className="text-xs font-semibold">5 day streak</span>
                            </div>
                        </div>

                    </div>

                </div>

            </main>

            {/* Footer */}
            <footer className="py-5 text-center text-xs text-[#647572]">
                © 2026 FitKey. Your wellbeing matters.
            </footer>

        </div>
    )
}

export default Welcome