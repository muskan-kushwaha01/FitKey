import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    Stethoscope,
    Calendar,
    PhoneCall,
    FileText,
    TrendingUp,
    CreditCard,
    LogOut,
    X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logoutProfessional } from '../../services/professional/professionalAuthService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function ProfessionalSidebar({
    isOpen,
    onClose,
    professional,
}) {
    const location = useLocation()
    const navigate = useNavigate()

    const consultationItems = [
        { name: 'Overview', path: '/professional/consultations', icon: Stethoscope, end: true },
        { name: 'Availability & Schedule', path: '/professional/consultations/schedule', icon: Calendar },
        { name: 'Appointments', path: '/professional/consultations/appointments', icon: PhoneCall },
        { name: 'Consultation History', path: '/professional/consultations/history', icon: FileText },
        { name: 'Earnings', path: '/professional/consultations/earnings', icon: TrendingUp },
        { name: 'Payment Settings', path: '/professional/consultations/payments', icon: CreditCard },
    ]

    const handleLogout = () => {
        logoutProfessional()
        toast.success('Logged out from Professional Portal.')
        navigate('/welcome')
    }

    const sidebarContent = (
        <div className="flex h-full flex-col justify-between overflow-y-auto bg-[#033135] px-5 py-6 text-white">
            {/* Top Brand & Close on mobile */}
            <div>
                <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-5">
                    <NavLink
                        to="/professional/home"
                        onClick={onClose}
                        className="flex items-center"
                    >
                        <span
                            className="flex items-end text-xl leading-none text-white"
                            style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
                        >
                            FITKEY
                            <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
                            <span className="ml-2 mb-[0.1em] rounded-md bg-white/15 border border-[#F8E7A5]/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#F8E7A5]">
                                PRO
                            </span>
                        </span>
                    </NavLink>

                    {/* Mobile close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="lg:hidden rounded-lg p-1.5 text-[#C4D7D4] hover:bg-white/10 hover:text-white transition"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* Section Header */}
                <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[2px] text-[#C4D7D4]">
                    Consultations & Practice
                </div>

                {/* Navigation Links: Consultations Only */}
                <nav className="space-y-1.5">
                    {consultationItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                                        isActive
                                            ? 'bg-[#C4D7D4]/25 text-white font-bold shadow-2xs'
                                            : 'text-[#E4F0EA] hover:bg-white/10 hover:text-white'
                                    }`
                                }
                            >
                                <Icon size={17} className="shrink-0" />
                                <span>{item.name}</span>
                            </NavLink>
                        )
                    })}
                </nav>
            </div>

            {/* Bottom Actions: Practitioner Card & Logout */}
            <div className="space-y-3 border-t border-white/15 pt-5">
                {/* Professional Mini Card */}
                <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 border border-white/20 shadow-xs">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#C4D7D4] text-[#033135] font-bold">
                        {professional?.photoUrl ? (
                            <img
                                src={professional.photoUrl}
                                alt={professional.fullName || professional.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <Stethoscope size={18} />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">
                            {professional?.fullName || professional?.name || 'Professional'}
                        </p>
                        <p className="truncate text-xs font-medium text-[#E4F0EA] mt-0.5" title={professional?.specialization || professional?.profession || professional?.bio || 'FitKey Partner'}>
                            {professional?.specialization || professional?.profession || professional?.bio || 'FitKey Partner'}
                        </p>
                    </div>
                </div>

                {/* Sign Out Button */}
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-[#FFD9C7] hover:bg-white/10 hover:text-white transition"
                >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop Fixed Left Sidebar */}
            <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-[#033135] shadow-xs">
                {sidebarContent}
            </aside>

            {/* Mobile Drawer (with backdrop) */}
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity"
                        onClick={onClose}
                    />
                    {/* Drawer Pane */}
                    <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200">
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    )
}
