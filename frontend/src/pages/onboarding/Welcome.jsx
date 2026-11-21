
import { useNavigate } from 'react-router-dom'
import { ArrowRight, HeartPulse, Activity, Trophy, Users } from 'lucide-react'
import Logo from '../../components/common/Logo'

function Welcome() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-[#F8FAF7] flex flex-col">

            {/* Navbar */}
            <header className="px-6 md:px-12 py-5">
                <Logo />
            </header>

            {/* Main content */}
            <main className="flex-1 flex items-center justify-center px-6 py-10">

                <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">

                    {/* Left content */}
                    <div className="max-w-lg">

                        <div className="inline-flex items-center gap-2 bg-[#E4F0EA] text-[#033135] px-4 py-2 rounded-full text-sm font-medium">
                            <HeartPulse size={16} />
                            Your personal wellness companion
                        </div>

                        <h1 className="mt-7 text-4xl md:text-6xl font-bold text-[#033135] leading-tight">
                            Make your
                            <span className="block text-[#648C83]">
                                health a habit.
                            </span>
                        </h1>

                        <p className="mt-6 text-[#647572] text-base md:text-lg leading-relaxed">
                            Take charge of your wellbeing with simple health
                            tracking, meaningful challenges and a community
                            that motivates you every day.
                        </p>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-4 mt-9">

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#C4D7D4] flex items-center justify-center">
                                    <Activity size={20} className="text-[#033135]" />
                                </div>
                                <span className="text-sm font-medium text-[#324C4D]">
                                    Track wellness
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#F8E7A5] flex items-center justify-center">
                                    <Trophy size={20} className="text-[#033135]" />
                                </div>
                                <span className="text-sm font-medium text-[#324C4D]">
                                    Earn rewards
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#DCD6F7] flex items-center justify-center">
                                    <Users size={20} className="text-[#033135]" />
                                </div>
                                <span className="text-sm font-medium text-[#324C4D]">
                                    Join community
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#FFD9C7] flex items-center justify-center">
                                    <HeartPulse size={20} className="text-[#033135]" />
                                </div>
                                <span className="text-sm font-medium text-[#324C4D]">
                                    Build healthy habits
                                </span>
                            </div>

                        </div>

                        {/* Actions */}
                        <div className="mt-10 flex flex-col sm:flex-row gap-4">

                            <button
                                onClick={() => navigate('/signup')}
                                className="bg-[#033135] text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#324C4D] transition"
                            >
                                Get Started
                                <ArrowRight size={18} />
                            </button>

                            <button
                                onClick={() => navigate('/login')}
                                className="border border-[#C4D7D4] text-[#033135] px-8 py-4 rounded-xl font-semibold hover:bg-[#E4F0EA] transition"
                            >
                                I already have an account
                            </button>

                        </div>

                        <p className="text-xs text-[#647572] mt-6">
                            Small steps today. Healthier tomorrows.
                        </p>

                    </div>

                    {/* Right illustration */}
                    <div className="relative hidden md:flex items-center justify-center">

                        <div className="w-[420px] h-[420px] rounded-full bg-[#E4F0EA] flex items-center justify-center relative">

                            <div className="w-[310px] h-[310px] rounded-full bg-[#C4D7D4] flex items-center justify-center">

                                <div className="w-[210px] h-[210px] rounded-[48px] bg-white shadow-xl flex items-center justify-center rotate-[-8deg]">
                                    <HeartPulse
                                        size={100}
                                        strokeWidth={1.3}
                                        className="text-[#033135]"
                                    />
                                </div>

                            </div>

                            <div className="absolute top-8 right-5 bg-white rounded-2xl shadow-lg p-4 rotate-6">
                                <Trophy className="text-[#D5A82B]" size={30} />
                                <p className="text-xs font-semibold mt-2 text-[#033135]">
                                    Earn rewards
                                </p>
                            </div>

                            <div className="absolute bottom-10 left-0 bg-white rounded-2xl shadow-lg p-4 -rotate-6">
                                <Activity className="text-[#648C83]" size={30} />
                                <p className="text-xs font-semibold mt-2 text-[#033135]">
                                    Stay active
                                </p>
                            </div>

                        </div>

                    </div>

                </div>

            </main>

            {/* Footer */}
            <footer className="text-center py-5 text-xs text-[#647572]">
                © 2026 FitKey. Your wellbeing matters.
            </footer>

        </div>
    )
}

export default Welcome
