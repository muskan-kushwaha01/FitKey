
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../../components/common/Logo'

function Splash() {
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/welcome')
        }, 2200)

        return () => clearTimeout(timer)
    }, [navigate])

    return (
        <div className="min-h-screen bg-[#033135] flex flex-col items-center justify-center px-6 relative overflow-hidden">

            {/* Decorative background circles */}
            <div className="absolute -top-28 -right-24 w-80 h-80 rounded-full bg-[#324C4D] opacity-50" />
            <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-[#C4D7D4] opacity-10" />

            <div className="relative z-10 flex flex-col items-center text-center">

                <div className="animate-pulse">
                    <Logo light size="lg" />
                </div>

                <p className="text-[#C4D7D4] mt-5 text-sm tracking-wide">
                    Your health. Your journey.
                </p>

                <div className="mt-16 flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C4D7D4] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#C4D7D4] animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-[#C4D7D4] animate-bounce [animation-delay:300ms]" />
                </div>

            </div>

            <p className="absolute bottom-8 text-[#C4D7D4]/70 text-xs">
                A healthier you, one step at a time.
            </p>

        </div>
    )
}

export default Splash
