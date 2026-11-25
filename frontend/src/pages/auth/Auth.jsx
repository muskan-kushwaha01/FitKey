import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Mail,
    Lock,
    UserRound,
    ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { signUp, signIn } from '../../services/authService'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const inputClass =
    'w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] py-3.5 outline-none transition placeholder:text-[#9AA6A0] focus:border-[#648C83] focus:bg-white focus:ring-2 focus:ring-[#E4F0EA]'

function Wordmark({ light = false, className = '' }) {
    return (
        <span
            className={`flex items-end leading-none ${light ? 'text-white' : 'text-[#033135]'} ${className}`}
            style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
        >
            FITKEY
            <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
        </span>
    )
}

function Auth({ initialMode = 'login' }) {
    const navigate = useNavigate()

    const [isLogin, setIsLogin] = useState(initialMode === 'login')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.email.trim() || !formData.password) {
            toast.error('Please fill in all required fields')
            return
        }

        if (!isLogin && !formData.name.trim()) {
            toast.error('Please enter your name')
            return
        }

        if (!isLogin && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        try {
            setIsSubmitting(true)

            if (isLogin) {
                await signIn({
                    email: formData.email.trim(),
                    password: formData.password,
                })

                toast.success('Welcome back to FitKey!')
                navigate('/home')

            } else {
                const data = await signUp({
                    email: formData.email.trim(),
                    password: formData.password,
                    fullName: formData.name.trim(),
                })

                if (data.session) {
                    toast.success('Account created successfully!')
                    navigate('/journey-selection')
                } else {
                    toast.success('Account created! Please verify your email.')
                }
            }

        } catch (error) {
            console.error('Authentication error:', error)
            toast.error(error.message || 'Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAF7]">
            <style>{`
                @keyframes fk-up {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fk-up { animation: fk-up 0.6s ease-out both; }
                @media (prefers-reduced-motion: reduce) {
                    .fk-up { animation: none; }
                }
            `}</style>

            {/* Header */}
            <header className="px-6 py-5 md:px-12">
                <button
                    onClick={() => navigate('/welcome')}
                    className="flex items-center gap-2 text-[#324C4D] transition hover:text-[#033135]"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Back</span>
                </button>
            </header>

            {/* Main */}
            <main className="flex flex-1 items-center justify-center px-5 py-8">

                <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E4F0EA] bg-white shadow-sm md:grid-cols-2">

                    {/* Left panel */}
                    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#033135] p-10 md:flex">

                        {/* concentric arches */}
                        <svg
                            viewBox="0 0 400 200"
                            className="pointer-events-none absolute -bottom-px left-1/2 w-[130%] -translate-x-1/2"
                            fill="none"
                            aria-hidden="true"
                        >
                            {[190, 150, 110, 70].map((r, i) => (
                                <path
                                    key={r}
                                    d={`M${200 - r} 200 A${r} ${r} 0 0 1 ${200 + r} 200`}
                                    stroke="#C4D7D4"
                                    strokeOpacity={0.12 + i * 0.04}
                                    strokeWidth="1.5"
                                />
                            ))}
                            <path d="M170 200 A30 30 0 0 1 230 200 Z" fill="#E0AE3A" />
                        </svg>

                        <div className="relative z-10">
                            <Wordmark light className="text-2xl" />
                        </div>

                        <div className="relative z-10 pb-24">
                            <h2
                                className="text-4xl leading-[1.1] text-white"
                                style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                            >
                                Your wellness journey starts here
                                <span className="ml-1 inline-block h-[0.13em] w-[0.13em] rounded-full bg-[#E0AE3A] align-baseline" />
                            </h2>

                            <p className="mt-5 leading-relaxed text-[#C4D7D4]">
                                Build healthier habits, track your progress
                                and celebrate every little achievement.
                            </p>

                            <div className="mt-8 flex gap-2">
                                <span className="h-1.5 w-10 rounded-full bg-[#C4D7D4]" />
                                <span className="h-1.5 w-3 rounded-full bg-[#648C83]" />
                                <span className="h-1.5 w-3 rounded-full bg-[#648C83]" />
                            </div>
                        </div>

                        <p className="relative z-10 text-xs text-[#C4D7D4]/70">
                            Unlock a healthier you.
                        </p>

                    </div>

                    {/* Form panel */}
                    <div className="p-7 sm:p-10 md:p-12">

                        {/* Mobile logo */}
                        <div className="mb-8 md:hidden">
                            <Wordmark className="text-2xl" />
                        </div>

                        <div className="mx-auto max-w-sm">

                            <div className="fk-up mb-8">
                                <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-[#647572]">
                                    {isLogin ? 'SIGN IN' : 'GET STARTED'}
                                </p>

                                <h1
                                    className="text-4xl leading-tight text-[#033135]"
                                    style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                                >
                                    {isLogin ? 'Welcome back' : 'Create your account'}
                                    <span className="ml-1 inline-block h-[0.14em] w-[0.14em] rounded-full bg-[#E0AE3A] align-baseline" />
                                </h1>

                                <p className="mt-3 text-sm text-[#647572]">
                                    {isLogin
                                        ? 'Sign in to continue your wellness journey.'
                                        : 'Join FitKey and start building healthier habits.'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="fk-up space-y-5" style={{ animationDelay: '0.1s' }}>

                                {!isLogin && (
                                    <div>
                                        <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#324C4D]">
                                            Full name
                                        </label>

                                        <div className="relative">
                                            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#809491]" size={19} />

                                            <input
                                                id="name"
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Enter your name"
                                                className={`${inputClass} pl-11 pr-4`}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#324C4D]">
                                        Email address
                                    </label>

                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#809491]" size={19} />

                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@example.com"
                                            required
                                            className={`${inputClass} pl-11 pr-4`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#324C4D]">
                                        Password
                                    </label>

                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#809491]" size={19} />

                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                            required
                                            className={`${inputClass} pl-11 pr-12`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#809491] transition hover:text-[#033135]"
                                        >
                                            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                        </button>
                                    </div>
                                </div>

                                {!isLogin && (
                                    <div>
                                        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[#324C4D]">
                                            Confirm password
                                        </label>

                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#809491]" size={19} />

                                            <input
                                                id="confirmPassword"
                                                type="password"
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Re-enter your password"
                                                required
                                                className={`${inputClass} pl-11 pr-4`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {isLogin && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/forgot-password')}
                                            className="text-sm font-semibold text-[#648C83] transition hover:text-[#033135]"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#033135] py-4 font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.99] disabled:opacity-60"
                                >
                                    {isSubmitting
                                        ? 'Please wait...'
                                        : isLogin
                                            ? 'Login'
                                            : 'Create account'
                                    }

                                    {!isSubmitting && <ArrowRight size={18} />}
                                </button>

                            </form>

                            <div className="mt-7 text-center text-sm text-[#647572]">
                                {isLogin
                                    ? "Don't have an account? "
                                    : 'Already have an account? '}

                                <button
                                    onClick={() => {
                                        setIsLogin(!isLogin)
                                        setFormData({
                                            name: '',
                                            email: formData.email,
                                            password: '',
                                            confirmPassword: ''
                                        })
                                    }}
                                    className="font-semibold text-[#033135] hover:underline"
                                >
                                    {isLogin ? 'Sign up' : 'Login'}
                                </button>
                            </div>

                        </div>
                    </div>

                </div>
            </main>

            <footer className="py-5 text-center text-xs text-[#647572]">
                © 2026 FitKey. Your wellbeing matters.
            </footer>

        </div>
    )
}

export default Auth