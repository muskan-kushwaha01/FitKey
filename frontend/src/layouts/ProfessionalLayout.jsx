import { useEffect, useState, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
    Stethoscope,
    Menu,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext.jsx'
import {
    fetchCurrentProfessional,
    migrateLegacyProfessionalData,
} from '../services/professional/professionalAuthService.js'
import { ProfessionalBottomNav } from '../components/professional/ProfessionalNav/ProfessionalBottomNav.jsx'
import ProfessionalSidebar from '../components/professional/ProfessionalSidebar.jsx'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function ProfessionalLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading: authLoading } = useAuth()
    const [professional, setProfessional] = useState(null)
    const [loading, setLoading] = useState(true)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    const refreshProfessional = useCallback(async () => {
        if (!user?.id) return null
        const prof = await fetchCurrentProfessional(user)
        if (prof) setProfessional(prof)
        return prof
    }, [user])

    useEffect(() => {
        if (authLoading) return
        if (!user?.id) {
            toast.error('Please log in to the Professional Portal.')
            navigate('/professional/login', { replace: true })
            return
        }

        let cancelled = false
        async function loadProf() {
            setLoading(true)
            await migrateLegacyProfessionalData(user)
            const prof = await fetchCurrentProfessional(user)
            if (cancelled) return

            if (!prof) {
                toast.error('Please log in to the Professional Portal.')
                navigate('/professional/login', { replace: true })
                return
            }

            if (!prof.onboardingCompleted) {
                toast('Please complete your profile setup.', { icon: 'ℹ️' })
                navigate('/professional/onboarding', { replace: true })
                return
            }

            setProfessional(prof)
            setLoading(false)
        }

        loadProf()
        return () => {
            cancelled = true
        }
    }, [authLoading, user, navigate, location.pathname])

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        setMobileSidebarOpen(false)
    }, [location.pathname])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAF7]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7]">
            {/* Desktop Fixed Sidebar & Mobile Drawer */}
            <ProfessionalSidebar
                isOpen={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
                professional={professional}
            />

            {/* Layout Container shifted right on desktop */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-30 border-b border-[#E8EFEB] bg-white/95 px-4 py-3 backdrop-blur-md sm:px-8">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                        {/* Mobile: Hamburger + Wordmark */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileSidebarOpen(true)}
                                className="lg:hidden rounded-xl border border-[#E8EFEB] p-2 text-[#033135] hover:bg-[#FAFBF9]"
                                title="Open navigation menu"
                            >
                                <Menu size={18} />
                            </button>

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
                        </div>

                        {/* Right User Identity Only */}
                        <div className="flex items-center">
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
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-12">
                    <Outlet context={{ professional, setProfessional, refreshProfessional }} />
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8EFEB] bg-white px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] shadow-lg lg:hidden">
                <ProfessionalBottomNav />
            </div>
        </div>
    )
}

export default ProfessionalLayout
