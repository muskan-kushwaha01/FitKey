import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
    Home,
    Trophy,
    Zap,
    UserRound,
    UserCheck,
    LogOut,
    Stethoscope,
    ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    getCurrentProfessional,
    logoutProfessional,
} from '../services/professional/professionalAuthService.js'
import { isOnboardingCompleted } from '../services/professional/professionalProfileService.js'
import { ProfessionalBottomNav } from '../components/professional/ProfessionalNav/ProfessionalBottomNav.jsx'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const navItems = [
    { name: 'Home', path: '/professional/home', icon: Home },
    { name: 'Leaderboard', path: '/professional/leaderboard', icon: Trophy },
    { name: 'XP & Rewards', path: '/professional/xp', icon: Zap },
    { name: 'Profile', path: '/professional/profile', icon: UserRound },
]

function ProfessionalLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const [professional, setProfessional] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const prof = getCurrentProfessional()
        if (!prof) {
            toast.error('Please log in to the Professional Portal.')
            navigate('/professional/login', { replace: true })
            return
        }

        if (!isOnboardingCompleted(prof.id)) {
            toast('Please complete your profile setup.', { icon: 'ℹ️' })
            navigate('/professional/onboarding', { replace: true })
            return
        }

        setProfessional(prof)
        setLoading(false)
    }, [navigate, location.pathname])

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, [location.pathname])

    const handleLogout = () => {
        logoutProfessional()
        toast.success('Logged out from Professional Portal.')
        navigate('/welcome')
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAF7]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7]">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-[#E8EFEB] bg-white/95 px-4 py-3 backdrop-blur-md sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    {/* Wordmark and Pro badge */}
                    <div className="flex items-center gap-6">
                        <NavLink to="/professional/home" className="flex items-center">
                            <span
                                className="flex items-end text-xl sm:text-2xl leading-none text-[#033135]"
                                style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
                            >
                                FITKEY
                                <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
                                <span className="ml-2 mb-[0.1em] rounded-md bg-[#033135] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider text-[#F8E7A5]">
                                    PRO
                                </span>
                            </span>
                        </NavLink>

                        {/* Desktop Navigation Links */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${isActive
                                                ? 'bg-[#E4F0EA] text-[#033135]'
                                                : 'text-[#647572] hover:bg-[#F8FAF7] hover:text-[#033135]'
                                            }`
                                        }
                                    >
                                        <Icon size={16} />
                                        <span>{item.name}</span>
                                    </NavLink>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Right User & Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Switch to User App */}
                        <button
                            type="button"
                            onClick={() => navigate('/home')}
                            className="flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-1.5 text-xs font-semibold text-[#033135] transition hover:bg-[#E4F0EA]"
                            title="Switch to User Wellness App"
                        >
                            <UserCheck size={14} className="text-[#648C83]" />
                            <span className="hidden sm:inline">User App</span>
                        </button>

                        {/* Professional Mini Avatar / Identity */}
                        <NavLink
                            to="/professional/profile"
                            className="flex items-center gap-2 rounded-xl border border-[#E8EFEB] bg-[#FAFBF9] p-1.5 pr-3 hover:bg-[#E4F0EA] transition"
                        >
                            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-[#E4F0EA] text-[#033135]">
                                {professional?.photoUrl ? (
                                    <img
                                        src={professional.photoUrl}
                                        alt={professional.fullName || professional.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Stethoscope size={14} />
                                )}
                            </div>
                            <span className="hidden sm:inline text-xs font-bold text-[#033135] max-w-[120px] truncate">
                                {professional?.fullName || professional?.name}
                            </span>
                        </NavLink>

                        {/* Logout button */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center justify-center rounded-xl p-2 text-[#647572] transition hover:bg-[#FFD9C7]/30 hover:text-[#C0563B]"
                            title="Log Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Page Content */}
            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-12">
                <Outlet context={{ professional, setProfessional }} />
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8EFEB] bg-white px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] shadow-lg lg:hidden">
                <ProfessionalBottomNav />
            </div>
        </div>
    )
}

export default ProfessionalLayout
