import { useState, useEffect } from 'react'
import {
    NavLink,
    Outlet,
    useNavigate,
    useLocation,
} from 'react-router-dom'

import {
    Home,
    HeartPulse,
    Trophy,
    Users,
    Stethoscope,
    CalendarClock,
    Menu,
    X,
    UserRound,
    Handshake,
    Settings,
    LogOut,
    Bell,
} from 'lucide-react'

import Logo from '../components/common/Logo'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const bottomNavigation = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Health', path: '/health', icon: HeartPulse },
    { name: 'Rewards', path: '/rewards', icon: Trophy },
    { name: 'Community', path: '/community', icon: Users },
]

const sidebarNavigation = [
    { name: 'My Profile', path: '/profile', icon: UserRound },
    { name: 'Consultations', path: '/consultations', icon: Stethoscope },
    { name: 'Appointments & Payments', path: '/consultation-history', icon: CalendarClock },
    { name: 'Brand Partnerships', path: '/partnerships', icon: Handshake },
    { name: 'Settings', path: '/settings', icon: Settings },
]

function MainLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navigate = useNavigate()
    const location = useLocation()

    // Close menus and scroll to the top whenever the page changes.
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant',
        })

        setMobileMenuOpen(false)
    }, [location.pathname])

    const handleLogout = () => {
        // Actual authentication logout will be connected with Supabase later.
        navigate('/login')
    }

    // Sidebar navigation items
    const renderSidebarNavigation = (isMobile = false) => (
        <nav className="space-y-1.5">
            {sidebarNavigation.map((item) => {
                const Icon = item.icon
                const isCurrent =
                    location.pathname === item.path ||
                    (item.path === '/consultations' &&
                        location.pathname === '/consultations') ||
                    (item.path === '/consultation-history' &&
                        location.pathname === '/consultation-history')

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                            if (isMobile) setMobileMenuOpen(false)
                        }}
                        className={({ isActive }) =>
                            `flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${isCurrent || isActive
                                ? 'bg-[#C4D7D4]/25 text-white shadow-2xs'
                                : 'text-[#E4F0EA] hover:bg-white/10 hover:text-white'
                            }`
                        }
                    >
                        <Icon size={19} className="shrink-0" />
                        <span>{item.name}</span>
                    </NavLink>
                )
            })}
        </nav>
    )

    // Mobile bottom navigation
    const renderBottomNavigation = () => (
        <nav className="grid grid-cols-4">
            {bottomNavigation.map((item) => {
                const Icon = item.icon

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition ${isActive
                                ? 'text-[#033135]'
                                : 'text-[#647572]'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`flex h-8 w-11 items-center justify-center rounded-xl ${isActive ? 'bg-[#E4F0EA]' : ''
                                        }`}
                                >
                                    <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                                </span>
                                <span className="whitespace-nowrap">{item.name}</span>
                            </>
                        )}
                    </NavLink>
                )
            })}
        </nav>
    )

    return (
        <div className="min-h-screen bg-[#F8FAF7]">

            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col overflow-y-auto bg-[#033135] px-5 py-7 text-white lg:flex">

                <div className="mb-8">
                    <Logo light />
                </div>

                <p className="mb-3 px-3 text-[10px] font-bold tracking-[2px] text-[#C4D7D4]/70">
                    ACCOUNT & PRACTICE
                </p>

                {renderSidebarNavigation(false)}

                <div className="mt-auto pt-6">

                    {/* Progress card */}
                    <div className="mb-5 rounded-2xl bg-white/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-[#F8E7A5]">
                            <Trophy size={18} />
                            <span className="text-sm font-semibold">Your Progress</span>
                        </div>
                        <p className="text-3xl text-white" style={{ fontFamily: SERIF }}>250 XP</p>
                        <p className="mt-1 text-xs text-[#E4F0EA]">
                            Keep building healthy habits!
                        </p>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-white/15 pt-4">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#FFD9C7] hover:bg-white/10 transition"
                        >
                            <LogOut size={19} />
                            <span>Logout</span>
                        </button>
                    </div>

                </div>
            </aside>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">

                    {/* Background overlay */}
                    <button
                        aria-label="Close menu"
                        onClick={() => setMobileMenuOpen(false)}
                        className="absolute inset-0 bg-black/50"
                    />

                    {/* Sidebar */}
                    <aside className="relative flex h-full w-[min(288px,85vw)] flex-col overflow-y-auto bg-[#033135] px-5 py-5 shadow-2xl">

                        {/* Header */}
                        <div className="mb-6 flex items-center justify-between">
                            <Logo light />

                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Close menu"
                                className="rounded-lg p-2 text-white hover:bg-white/10"
                            >
                                <X size={23} />
                            </button>
                        </div>
                        {/* Progress card */}
                        <div className="mb-6 rounded-2xl bg-white/10 p-4">
                            <div className="mb-1 flex items-center gap-2 text-[#F8E7A5]">
                                <Trophy size={17} />
                                <p className="text-sm font-semibold">Your Progress</p>
                            </div>

                            <p className="text-3xl text-white" style={{ fontFamily: SERIF }}>250 XP</p>

                            <p className="mt-1 text-xs text-[#C4D7D4]">
                                Keep building healthy habits!
                            </p>
                        </div>


                        {/* Sidebar navigation */}
                        <p className="mb-3 px-2 text-[10px] font-bold tracking-[2px] text-[#C4D7D4]/70">
                            ACCOUNT & PRACTICE
                        </p>

                        <div className="mb-6">
                            {renderSidebarNavigation(true)}
                        </div>



                        {/* Logout */}
                        <div className="mt-auto border-t border-white/15 pt-4">
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#FFD9C7] hover:bg-white/10"
                            >
                                <LogOut size={19} />
                                <span>Logout</span>
                            </button>
                        </div>

                    </aside>
                </div>
            )}


            {/* Main Content */}
            <main className="min-h-screen pb-24 lg:ml-64 lg:pb-8">

                {/* Header */}
                <header className="sticky top-0 z-20 border-b border-[#E8EFEB] bg-[#F8FAF7]/95 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-4 lg:px-10">

                    <div className="mx-auto flex max-w-7xl items-center justify-between">

                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">

                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Open navigation menu"
                                className="rounded-lg p-2 text-[#033135] transition hover:bg-[#E4F0EA] lg:hidden"
                            >
                                <Menu size={22} />
                            </button>

                            <div className="min-w-0">
                                <p className="text-[11px] text-[#647572] sm:text-xs">
                                    Welcome to FitKey
                                </p>
                                <h2 className="truncate text-base font-bold text-[#033135] sm:text-lg">
                                    Your Wellness Space
                                </h2>
                            </div>
                        </div>

                        {/* Desktop Navigation for Bottom-Nav Screens */}
                        <nav className="hidden lg:flex items-center gap-1.5 rounded-2xl bg-white border border-[#E8EFEB] p-1.5 shadow-2xs">
                            {bottomNavigation.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${isActive
                                                ? 'bg-[#033135] text-white shadow-xs'
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

                        <button
                            aria-label="Notifications"
                            className="relative shrink-0 rounded-xl border border-[#E8EFEB] bg-white p-2.5 text-[#033135]"
                        >
                            <Bell size={19} />
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FFD9C7]" />
                        </button>

                    </div>
                </header>

                {/* Page Content */}
                <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-7">
                    <Outlet />
                </div>

            </main>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E8EFEB] bg-white px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] lg:hidden">
                {renderBottomNavigation()}
            </div>

        </div>
    )
}

export default MainLayout