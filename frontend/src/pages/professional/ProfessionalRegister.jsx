import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Mail,
    Lock,
    UserRound,
    Stethoscope,
    ArrowRight,
    ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { registerProfessional } from '../../services/professional/professionalAuthService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const inputClass =
    'w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] py-3.5 pl-11 pr-4 outline-none transition placeholder:text-[#9AA6A0] focus:border-[#648C83] focus:bg-white focus:ring-2 focus:ring-[#E4F0EA]'

function Wordmark({ className = '' }) {
    return (
        <span
            className={`flex items-end leading-none text-[#033135] ${className}`}
            style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
        >
            FITKEY
            <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
            <span className="ml-2 mb-[0.1em] rounded-md bg-[#033135] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#F8E7A5]">
                PRO
            </span>
        </span>
    )
}

function ProfessionalRegister() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const { name, email, password, confirmPassword } = formData

        if (!name.trim()) {
            toast.error('Please enter your full name or title.')
            return
        }

        if (!email.trim() || !email.includes('@')) {
            toast.error('Please enter a valid professional email address.')
            return
        }

        if (!password || password.length < 6) {
            toast.error('Password must be at least 6 characters.')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match.')
            return
        }

        setLoading(true)
        const result = registerProfessional({ name, email, password, confirmPassword })
        setLoading(false)

        if (!result.success) {
            toast.error(result.error)
            return
        }

        toast.success(result.message)
        // Move directly to multi-step onboarding flow
        navigate('/professional/onboarding')
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAF7]">
            {/* Top Navigation */}
            <header className="flex items-center justify-between px-6 py-5 md:px-12">
                <Wordmark className="text-2xl" />

                <button
                    onClick={() => navigate('/welcome')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#647572] transition hover:text-[#033135]"
                >
                    <ArrowLeft size={15} />
                    Back to Welcome
                </button>
            </header>

            {/* Main Form Container */}
            <main className="flex flex-1 items-center justify-center px-4 py-8">
                <div className="w-full max-w-md">
                    {/* Professional Badge */}
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#E4F0EA] px-3.5 py-1.5 text-xs font-semibold text-[#033135]">
                        <Stethoscope size={15} className="text-[#648C83]" />
                        Professional Registration
                    </div>

                    <h1
                        className="text-3xl font-normal text-[#033135] md:text-4xl"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Create Practice Account
                    </h1>

                    <p className="mt-2 text-sm text-[#647572]">
                        Join the FitKey professional network. Verify your credentials and connect with clients.
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        {/* Name */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-[#324C4D]">
                                Full Name & Title
                            </label>
                            <div className="relative">
                                <UserRound
                                    size={18}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]"
                                />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Dr. Rajesh Kumar or Sarah Jenkins"
                                    className={inputClass}
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-[#324C4D]">
                                Professional Email
                            </label>
                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]"
                                />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="doctor@practice.com"
                                    className={inputClass}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-[#324C4D]">
                                Create Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]"
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="At least 6 characters"
                                    className={`${inputClass} pr-11`}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0] transition hover:text-[#033135]"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-[#324C4D]">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]"
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Re-enter your password"
                                    className={`${inputClass} pr-11`}
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#033135] py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#324C4D] active:scale-[0.99] disabled:opacity-70"
                        >
                            <span>Create Account & Continue</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    {/* Login link */}
                    <div className="mt-6 rounded-2xl border border-[#E8EFEB] bg-white p-4 text-center">
                        <p className="text-xs text-[#647572]">
                            Already registered as a professional?
                        </p>
                        <Link
                            to="/professional/login"
                            className="mt-1.5 inline-flex items-center gap-1 text-sm font-bold text-[#033135] underline decoration-[#648C83] decoration-2 underline-offset-4 hover:text-[#648C83]"
                        >
                            Log in to your account
                        </Link>
                    </div>

                    {/* Switch to User */}
                    <div className="mt-4 text-center">
                        <button
                            onClick={() => navigate('/signup')}
                            className="text-xs text-[#647572] hover:text-[#033135]"
                        >
                            Looking for standard wellness tracking? <span className="font-semibold underline">User Signup</span>
                        </button>
                    </div>

                    {/* Compliance note */}
                    <div className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-[#9AA6A0]">
                        <ShieldCheck size={14} className="text-[#648C83]" />
                        Professional onboarding will collect clinical licensing & verification
                    </div>
                </div>
            </main>
        </div>
    )
}

export default ProfessionalRegister
