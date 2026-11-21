
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    ArrowLeft,
    Eye,
    EyeOff,
    HeartPulse,
    Mail,
    Lock,
    UserRound,
    ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

function Auth({ initialMode = 'login' }) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [isLogin, setIsLogin] = useState(initialMode === 'login')

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

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!isLogin) {
            navigate('/journey-selection')
            return
        }

        if (!formData.email || !formData.password) {
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

        // Authentication will be connected to Supabase next.
        toast.success(
            isLogin
                ? 'Login integration coming next!'
                : 'Signup integration coming next!'
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7] flex flex-col">

            {/* Header */}
            <header className="px-6 md:px-12 py-5">
                <button
                    onClick={() => navigate('/welcome')}
                    className="flex items-center gap-2 text-[#324C4D] hover:text-[#033135] transition"
                >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Back</span>
                </button>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center px-5 py-8">

                <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E4F0EA]">

                    {/* Left panel */}
                    <div className="hidden md:flex flex-col justify-between bg-[#033135] p-10 relative overflow-hidden">

                        <div className="absolute -right-24 -top-20 w-72 h-72 rounded-full bg-[#324C4D] opacity-60" />
                        <div className="absolute -left-24 -bottom-20 w-72 h-72 rounded-full bg-[#C4D7D4] opacity-10" />

                        <div className="relative z-10 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-[#C4D7D4] flex items-center justify-center">
                                <HeartPulse size={25} className="text-[#033135]" />
                            </div>
                            <span className="text-white font-bold text-xl">
                                FitKey
                            </span>
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-4xl font-bold text-white leading-tight">
                                Your wellness journey starts here.
                            </h2>

                            <p className="text-[#C4D7D4] mt-5 leading-relaxed">
                                Build healthier habits, track your progress
                                and celebrate every little achievement.
                            </p>

                            <div className="mt-8 flex gap-2">
                                <span className="w-10 h-1.5 rounded-full bg-[#C4D7D4]" />
                                <span className="w-3 h-1.5 rounded-full bg-[#648C83]" />
                                <span className="w-3 h-1.5 rounded-full bg-[#648C83]" />
                            </div>
                        </div>

                        <p className="relative z-10 text-xs text-[#C4D7D4]/70">
                            Your health. Your journey.
                        </p>

                    </div>

                    {/* Form panel */}
                    <div className="p-7 sm:p-10 md:p-12">

                        {/* Mobile logo */}
                        <div className="md:hidden flex items-center gap-2 mb-8">
                            <HeartPulse className="text-[#033135]" size={26} />
                            <span className="text-[#033135] font-bold text-xl">
                                FitKey
                            </span>
                        </div>

                        <div className="max-w-sm mx-auto">

                            <div className="mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-[#E4F0EA] flex items-center justify-center mb-5">
                                    {isLogin ? (
                                        <Lock className="text-[#033135]" />
                                    ) : (
                                        <UserRound className="text-[#033135]" />
                                    )}
                                </div>

                                <h1 className="text-3xl font-bold text-[#033135]">
                                    {isLogin ? 'Welcome back!' : 'Create your account'}
                                </h1>

                                <p className="text-[#647572] text-sm mt-2">
                                    {isLogin
                                        ? 'Sign in to continue your wellness journey.'
                                        : 'Join HealthSpace and start building healthier habits.'}
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">

                                {!isLogin && (
                                    <div>
                                        <label className="block text-sm font-medium text-[#324C4D] mb-2">
                                            Full name
                                        </label>

                                        <div className="relative">
                                            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#809491]" size={19} />

                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Enter your name"
                                                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] outline-none focus:border-[#648C83] focus:ring-2 focus:ring-[#E4F0EA] transition"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-[#324C4D] mb-2">
                                        Email address
                                    </label>

                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#809491]" size={19} />

                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] outline-none focus:border-[#648C83] focus:ring-2 focus:ring-[#E4F0EA] transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#324C4D] mb-2">
                                        Password
                                    </label>

                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#809491]" size={19} />

                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                            required
                                            className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] outline-none focus:border-[#648C83] focus:ring-2 focus:ring-[#E4F0EA] transition"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#809491]"
                                        >
                                            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                        </button>
                                    </div>
                                </div>

                                {!isLogin && (
                                    <div>
                                        <label className="block text-sm font-medium text-[#324C4D] mb-2">
                                            Confirm password
                                        </label>

                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Re-enter your password"
                                            required
                                            className="w-full px-4 py-3.5 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] outline-none focus:border-[#648C83] focus:ring-2 focus:ring-[#E4F0EA] transition"
                                        />
                                    </div>
                                )}

                                {isLogin && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/forgot-password')}
                                            className="text-sm text-[#648C83] font-semibold hover:text-[#033135]"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full bg-[#033135] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#324C4D] transition"
                                >
                                    {isLogin ? 'Login' : 'Create account'}
                                    <ArrowRight size={18} />
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

            <footer className="text-center py-5 text-xs text-[#647572]">
                © 2026 FitKey. Your wellbeing matters.
            </footer>

        </div>
    )
}

export default Auth
