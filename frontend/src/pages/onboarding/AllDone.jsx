import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles, Heart, Activity, Shield } from 'lucide-react'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const perks = [
    { icon: Activity, label: 'Personalised health plan', color: 'bg-[#E4F0EA]' },
    { icon: Heart, label: 'Smart wellness insights', color: 'bg-[#FFD9C7]' },
    { icon: Shield, label: 'Secure & private data', color: 'bg-[#DCD6F7]' },
    { icon: Sparkles, label: 'AI-powered recommendations', color: 'bg-[#F8E7A5]' },
]

function AllDone() {
    const navigate = useNavigate()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 100)
        return () => clearTimeout(t)
    }, [])

    return (
        <div className="min-h-screen bg-[#F8FAF7] flex flex-col items-center justify-center px-6 py-12 text-center">
            <style>{`
                @keyframes fk-pop {
                    0%   { opacity: 0; transform: scale(0.7); }
                    70%  { transform: scale(1.08); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes fk-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fk-pop { animation: fk-pop 0.65s cubic-bezier(0.34,1.56,0.64,1) both; }
                .fk-up  { animation: fk-up 0.55s ease-out both; }
                @keyframes ring-spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .ring-spin { animation: ring-spin 8s linear infinite; }
                @media (prefers-reduced-motion: reduce) { .fk-pop,.fk-up,.ring-spin { animation: none; } }
            `}</style>

            {visible && (
                <>
                    {/* Check circle */}
                    <div className="fk-pop relative mb-8 flex h-28 w-28 items-center justify-center">
                        {/* Spinning ring */}
                        <svg className="ring-spin absolute inset-0" viewBox="0 0 112 112" fill="none">
                            <circle cx="56" cy="56" r="52" stroke="#E0AE3A" strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" />
                        </svg>
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#033135] shadow-xl">
                            <Check size={36} className="text-white" strokeWidth={3} />
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="fk-up mb-3" style={{ animationDelay: '0.2s' }}>
                        <p className="mb-2 text-[11px] font-bold tracking-[0.2em] text-[#647572]">YOU'RE ALL SET</p>
                        <h1 className="text-4xl leading-tight text-[#033135] sm:text-5xl" style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}>
                            Welcome to FitKey
                            <span className="ml-1 inline-block h-[0.14em] w-[0.14em] rounded-full bg-[#E0AE3A] align-baseline" />
                        </h1>
                    </div>

                    <p className="fk-up mx-auto mb-10 max-w-sm text-sm leading-6 text-[#647572]" style={{ animationDelay: '0.3s' }}>
                        Your health profile is ready. We've built a personalised experience just for you.
                    </p>

                    {/* Perks grid */}
                    <div className="fk-up mb-10 grid w-full max-w-sm grid-cols-2 gap-3" style={{ animationDelay: '0.4s' }}>
                        {perks.map(({ icon: Icon, label, color }, i) => (
                            <div key={label}
                                className="flex flex-col items-start gap-3 rounded-2xl border border-[#E8EFEB] bg-white p-4 text-left shadow-sm"
                                style={{ animationDelay: `${0.45 + i * 0.07}s` }}>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                                    <Icon size={16} className="text-[#033135]" />
                                </div>
                                <p className="text-xs font-semibold leading-snug text-[#324C4D]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="fk-up w-full max-w-sm" style={{ animationDelay: '0.6s' }}>
                        <button onClick={() => navigate('/home')}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#033135] py-4 font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.99]">
                            <Sparkles size={18} /> Start my journey
                        </button>
                        <p className="mt-3 text-xs text-[#647572]">You can update your profile anytime from settings.</p>
                    </div>
                </>
            )}
        </div>
    )
}

export default AllDone
