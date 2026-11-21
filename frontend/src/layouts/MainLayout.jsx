
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
    Menu,
    X,
    UserRound,
    Handshake,
    Settings,
    ShieldCheck,
    CircleHelp,
    LogOut,
    ChevronDown,
    Bell,
} from 'lucide-react'

import Logo from '../components/common/Logo'

const navigation = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Health', path: '/health', icon: HeartPulse },
    { name: 'Rewards', path: '/rewards', icon: Trophy },
    { name: 'Community', path: '/community', icon: Users },
]

const profileLinks = [
    { name: 'My Profile', icon: UserRound, path: '/profile' },
    { name: 'Brand Partnerships', icon: Handshake, path: '/partnerships' },
    { name: 'Settings', icon: Settings, path: '/settings' },
    { name: 'Privacy & Security', icon: ShieldCheck, path: '/privacy' },
    { name: 'Help & Support', icon: CircleHelp, path: '/support' },
]

function MainLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [profileMenuOpen, setProfileMenuOpen] = useState(false)

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
        setProfileMenuOpen(false)
    }, [location.pathname])

    const handleLogout = () => {
        // Actual authentication logout will be connected with Supabase later.
        navigate('/login')
    }

    // Desktop sidebar navigation
    const renderDesktopNavigation = () => (
        <nav className="space-y-2">
            {navigation.map((item) => {
                const Icon = item.icon

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive
                                ? 'bg-[#C4D7D4]/20 text-white'
                                : 'text-[#E4F0EA] hover:bg-white/10 hover:text-white'
                            }`
                        }
                    >
                        <Icon size={20} />
                        <span>{item.name}</span>
                    </NavLink>
                )
            })}
        </nav>
    )

    // Mobile drawer navigation

    const renderMobileDrawerNavigation = () => (
        <nav className="space-y-2">
            {navigation.map((item) => {
                const Icon = item.icon

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            color: '#FFFFFF',
                            backgroundColor: isActive
                                ? 'rgba(196, 215, 212, 0.25)'
                                : 'transparent',
                        })}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold"
                    >
                        <Icon size={20} color="#FFFFFF" />
                        <span style={{ color: '#FFFFFF' }}>{item.name}</span>
                    </NavLink>
                )
            })}
        </nav>
    )


    // Mobile bottom navigation
    const renderBottomNavigation = () => (
        <nav className="grid grid-cols-4">
            {navigation.map((item) => {
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
            <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-[#033135] px-5 py-7 text-white lg:flex">

                <div className="mb-12">
                    <Logo light />
                </div>

                <p className="mb-4 px-4 text-[10px] font-bold tracking-[2px] text-[#C4D7D4]/70">
                    MAIN MENU
                </p>

                {renderDesktopNavigation()}

                <div className="mt-auto">

                    <div className="mb-6 rounded-2xl bg-white/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-[#F8E7A5]">
                            <Trophy size={18} />
                            <span className="text-sm font-semibold">Your Progress</span>
                        </div>
                        <p className="text-2xl font-bold">250 XP</p>
                        <p className="mt-1 text-xs text-[#E4F0EA]">
                            Keep building healthy habits!
                        </p>
                    </div>

                    <div className="relative border-t border-white/15 pt-5">

                        <button
                            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            className="flex w-full items-center gap-3 text-left"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C4D7D4] font-bold text-[#033135]">
                                U
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">Your Profile</p>
                                <p className="text-xs text-[#E4F0EA]">
                                    Wellness Member
                                </p>
                            </div>

                            <ChevronDown size={17} />
                        </button>

                        {profileMenuOpen && (
                            <div className="absolute bottom-16 left-0 z-50 w-full rounded-xl bg-white p-2 text-[#033135] shadow-xl">

                                {profileLinks.map((item) => {
                                    const Icon = item.icon

                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => navigate(item.path)}
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-[#E4F0EA]"
                                        >
                                            <Icon size={17} />
                                            {item.name}
                                        </button>
                                    )
                                })}

                                <div className="mt-1 border-t border-gray-100 pt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut size={17} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
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
                        <div className="mb-8 flex items-center justify-between">
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

                            <p className="text-2xl font-bold text-white">250 XP</p>

                            <p className="mt-1 text-xs text-[#C4D7D4]">
                                Keep building healthy habits!
                            </p>
                        </div>

                        {/* Account menu */}
                        <p className="mb-3 px-2 text-[10px] font-bold tracking-[2px] text-[#C4D7D4]/70">
                            ACCOUNT & MORE
                        </p>

                        <div className="space-y-1">
                            {profileLinks.map((item) => {
                                const Icon = item.icon

                                return (
                                    <NavLink
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        style={({ isActive }) => ({
                                            color: '#FFFFFF',
                                            backgroundColor: isActive
                                                ? 'rgba(196, 215, 212, 0.2)'
                                                : 'transparent',
                                        })}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium"
                                    >
                                        <Icon size={19} color="#FFFFFF" />
                                        <span>{item.name}</span>
                                    </NavLink>
                                )
                            })}
                        </div>

                        {/* Logout */}
                        <div className="mt-auto border-t border-white/15 pt-4">
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#FFD9C7] hover:bg-white/10"
                            >
                                <LogOut size={19} />
                                Logout
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
