const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function Logo({ light = false, size = 'md' }) {
    const large = size === 'lg'

    return (
        <div
            className={`flex items-end leading-none ${large ? 'text-4xl' : 'text-2xl'} ${light ? 'text-white' : 'text-[#033135]'
                }`}
            style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
            aria-label="FitKey"
        >
            FITKEY
            <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
        </div>
    )
}

export default Logo