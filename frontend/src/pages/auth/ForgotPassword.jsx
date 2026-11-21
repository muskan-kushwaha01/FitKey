import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '../../components/common/Logo'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function ForgotPassword() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!email.trim()) {
            toast.error('Please enter your email address')
            return
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Please enter a valid email address')
            return
        }

        // Supabase password reset integration will be added later.
        toast.success('Password reset integration coming soon!')
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7] flex items-center justify-center px-4 py-10">

            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="flex justify-center mb-10">
                    <Logo />
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-[#E8EFEB] p-7 sm:p-9">

                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-[#E4F0EA] flex items-center justify-center mb-6">
                        <KeyRound size={30} className="text-[#033135]" />
                    </div>

                    <h1
                        className="text-3xl sm:text-4xl leading-tight text-[#033135]"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Forgot your password?
                    </h1>

                    <p className="text-[#647572] text-sm mt-3 leading-6">
                        Don't worry! Enter the email address associated with your account
                        and we'll help you reset your password.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8">

                        <label className="block text-sm font-semibold text-[#033135] mb-2">
                            Email address
                        </label>

                        <div className="flex items-center gap-3 border border-[#DCE6E1] rounded-xl px-4 py-3 focus-within:border-[#033135] transition">
                            <Mail size={19} className="text-[#647572]" />

                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full outline-none text-sm text-[#033135] bg-transparent"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full mt-6 bg-[#033135] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#324C4D] transition"
                        >
                            Send Reset Link
                        </button>

                    </form>

                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center justify-center gap-2 mx-auto mt-7 text-sm font-semibold text-[#324C4D] hover:text-[#033135]"
                    >
                        <ArrowLeft size={17} />
                        Back to Login
                    </button>

                </div>

                <p className="text-center text-xs text-[#647572] mt-7">
                    Your health. Your journey. Your FitKey.
                </p>

            </div>
        </div>
    )
}

export default ForgotPassword