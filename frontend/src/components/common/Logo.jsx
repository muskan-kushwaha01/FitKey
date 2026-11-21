
import { HeartPulse } from 'lucide-react'

function Logo({ light = false, size = 'md' }) {
    const iconSize = size === 'lg' ? 30 : 23

    return (
        <div className="flex items-center gap-2.5">
            <div
                className={`flex items-center justify-center rounded-2xl ${light ? 'bg-[#C4D7D4]' : 'bg-[#E4F0EA]'
                    }`}
                style={{ width: 46, height: 46 }}
            >
                <HeartPulse
                    size={iconSize}
                    className="text-[#033135]"
                    strokeWidth={2.2}
                />
            </div>

            <span
                className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-[#033135]'
                    }`}
            >
                FitKey
            </span>
        </div>
    )
}

export default Logo
