import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Change these lines to reword the splash.
const APP_NAME = 'FITKEY'
const TAGLINE = 'Unlock a healthier you.'
const SUBTAGLINE = 'Small habits, one step at a time.'


function Splash() {
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/welcome')
        }, 3500)

        return () => clearTimeout(timer)
    }, [navigate])

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#E4F0EA] px-6">

            <style>{`
                @keyframes fk-letter {
                    from { transform: translateY(110%); }
                    to   { transform: translateY(0); }
                }
                @keyframes fk-dot {
                    0%   { transform: scale(0); }
                    70%  { transform: scale(1.35); }
                    100% { transform: scale(1); }
                }
                @keyframes fk-rule {
                    from { transform: scaleX(0); }
                    to   { transform: scaleX(1); }
                }
                @keyframes fk-fade {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                .fk-letter { animation: fk-letter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
                .fk-dot    { animation: fk-dot 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
                .fk-rule   { transform-origin: left; animation: fk-rule 0.7s ease-out both; }
                .fk-fade   { animation: fk-fade 0.8s ease-out both; }

                @media (prefers-reduced-motion: reduce) {
                    .fk-letter, .fk-dot, .fk-rule, .fk-fade { animation: none; }
                }
            `}</style>

            <div className="flex flex-col items-center text-center">

                {/* Wordmark */}
                <h1
                    className="flex items-end text-[4.5rem] leading-none text-[#033135] sm:text-[7.5rem]"
                    style={{
                        fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
                        letterSpacing: '0.01em',
                    }}
                    aria-label={APP_NAME}
                >
                    {APP_NAME.split('').map((letter, i) => (
                        <span key={i} className="inline-block overflow-hidden pb-[0.14em]" aria-hidden="true">
                            <span
                                className="fk-letter inline-block"
                                style={{ animationDelay: `${0.15 + i * 0.09}s` }}
                            >
                                {letter}
                            </span>
                        </span>
                    ))}

                    {/* the full stop is a small sun */}
                    <span
                        className="fk-dot mb-[0.2em] ml-[0.06em] inline-block h-[0.14em] w-[0.14em] rounded-full bg-[#E0AE3A]"
                        style={{ animationDelay: '0.85s' }}
                        aria-hidden="true"
                    />
                </h1>

                <div
                    className="fk-rule mt-5 h-px w-14 bg-[#033135]/30"
                    style={{ animationDelay: '1s' }}
                />

                <p className="fk-fade mt-5 text-lg font-medium text-[#033135]" style={{ animationDelay: '1.15s' }}>
                    {TAGLINE}
                </p>

                <p className="fk-fade mt-1.5 text-sm text-[#324C4D]/80" style={{ animationDelay: '1.3s' }}>
                    {SUBTAGLINE}
                </p>
            </div>



        </div>
    )
}

export default Splash