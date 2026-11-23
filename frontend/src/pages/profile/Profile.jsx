import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
    UserRound, Mail, CalendarDays, Target, Activity,
    Pencil, Save, X, ShieldCheck, ChevronRight,
    Shield, Lock, HelpCircle, ChevronDown, CheckCircle2, MessageSquare
} from 'lucide-react'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function Profile() {
    const [isEditing, setIsEditing] = useState(false)

    const [profile, setProfile] = useState({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        age: '22',
        gender: 'Prefer not to say',
        goal: 'Overall Wellness',
        activity: 'Moderately Active',
    })

    // Privacy & Security Toggles
    const [healthDataSharing, setHealthDataSharing] = useState(true)
    const [leaderboardVisibility, setLeaderboardVisibility] = useState(true)

    // Help & Support FAQ state
    const [expandedFaq, setExpandedFaq] = useState(null)

    const faqs = [
        {
            q: 'How do telehealth phone consultations work?',
            a: 'At your scheduled booking time, your verified healthcare professional will call your confirmed mobile number directly. Please keep your phone reachable. You can review your booking anytime from Appointments & Payments in your sidebar.',
        },
        {
            q: 'How can I apply FitKey XP for discounts?',
            a: 'During consultation checkout, you can redeem available FitKey XP (1 XP = ₹1 discount, up to 200 XP and up to 50% of the consultation fee). Eligible XP is automatically calculated and deducted upon successful booking.',
        },
        {
            q: 'How do I cancel or reschedule an appointment?',
            a: 'Go to Appointments & Payments in your sidebar. Select your active upcoming appointment to pick a new date/time or cancel. If cancelled, your fee is refunded and any redeemed XP is restored.',
        },
        {
            q: 'How is my health and personal data kept secure?',
            a: 'FitKey uses end-to-end encrypted storage and adheres to strict medical data confidentiality. Your health profile is only shared with verified practitioners you explicitly choose to consult with.',
        },
    ]

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value })
    }

    const handleSave = () => {
        setIsEditing(false)
        toast.success('Profile updated successfully!')
    }

    const details = [
        { label: 'Full Name', name: 'name', icon: UserRound },
        { label: 'Email Address', name: 'email', icon: Mail },
        { label: 'Age', name: 'age', icon: CalendarDays },
    ]

    return (
        <div className="space-y-6 pb-8">
            {/* Page heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-[#647572]">Your account</p>
                    <h1
                        className="text-3xl sm:text-4xl text-[#033135]"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        My Profile
                    </h1>
                    <p className="mt-1 text-sm text-[#647572]">
                        Manage your personal details and wellness preferences.
                    </p>
                </div>

                <button
                    onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
                    className="flex items-center gap-2 rounded-xl border border-[#DCE6E1] bg-white px-4 py-2.5 text-sm font-semibold text-[#033135] hover:bg-[#E4F0EA]"
                >
                    {isEditing ? <X size={17} /> : <Pencil size={17} />}
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
            </div>

            {/* Profile card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-5">
                    <div
                        className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DCD6F7] text-3xl text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        {profile.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-[#033135]">
                            {profile.name}
                        </h2>
                        <p className="mt-1 text-sm text-[#647572]">{profile.email}</p>
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-3 py-1 text-xs font-semibold text-[#324C4D]">
                            <ShieldCheck size={14} /> FitKey Member
                        </span>
                    </div>
                </div>
            </div>

            {/* Personal information */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                        Personal Information
                    </h2>
                    <p className="mt-1 text-sm text-[#647572]">
                        Your basic account information.
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    {details.map((item) => {
                        const Icon = item.icon

                        return (
                            <div key={item.name}>
                                <label className="mb-2 block text-sm font-medium text-[#647572]">
                                    {item.label}
                                </label>

                                <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                    <Icon size={18} className="text-[#647572]" />

                                    {isEditing ? (
                                        <input
                                            name={item.name}
                                            value={profile[item.name]}
                                            onChange={handleChange}
                                            type={item.name === 'email' ? 'email' : item.name === 'age' ? 'number' : 'text'}
                                            className="w-full bg-transparent text-sm text-[#033135] outline-none"
                                        />
                                    ) : (
                                        <span className="text-sm font-medium text-[#033135]">
                                            {profile[item.name]}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    <div>
                        <label className="mb-2 block text-sm font-medium text-[#647572]">
                            Gender
                        </label>
                        <select
                            name="gender"
                            value={profile.gender}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                        >
                            <option>Prefer not to say</option>
                            <option>Female</option>
                            <option>Male</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Wellness preferences */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                        Wellness Preferences
                    </h2>
                    <p className="mt-1 text-sm text-[#647572]">
                        Personalize your wellness journey.
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#647572]">
                            <Target size={17} /> Primary Wellness Goal
                        </label>
                        <select
                            name="goal"
                            value={profile.goal}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                        >
                            <option>Overall Wellness</option>
                            <option>Fitness</option>
                            <option>Better Sleep</option>
                            <option>Healthy Nutrition</option>
                            <option>Stress Management</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#647572]">
                            <Activity size={17} /> Activity Preference
                        </label>
                        <select
                            name="activity"
                            value={profile.activity}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                        >
                            <option>Lightly Active</option>
                            <option>Moderately Active</option>
                            <option>Very Active</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Save button */}
            {isEditing && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 rounded-xl bg-[#033135] px-6 py-3 text-sm font-semibold text-white hover:bg-[#324C4D]"
                    >
                        <Save size={17} /> Save Changes
                    </button>
                </div>
            )}

            {/* Privacy & Security */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <div className="flex items-center gap-2">
                        <Shield className="text-[#033135]" size={20} />
                        <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                            Privacy & Security
                        </h2>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Control how your health history and profile details are shared.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Telehealth Data Sharing */}
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#EEF1EE] p-4 bg-[#F8FAF7]">
                        <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-[#033135]">
                                Health Profile Sharing with Practitioners
                            </p>
                            <p className="text-xs text-[#647572]">
                                Automatically provide your health goals and shared medical history to verified doctors during booked consultations.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setHealthDataSharing(!healthDataSharing)
                                toast.success(
                                    !healthDataSharing
                                        ? 'Health data sharing enabled for consultations.'
                                        : 'Health data sharing restricted.'
                                )
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                                healthDataSharing ? 'bg-[#033135]' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                    healthDataSharing ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Community Profile Visibility */}
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#EEF1EE] p-4 bg-[#F8FAF7]">
                        <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-[#033135]">
                                Public Leaderboard Visibility
                            </p>
                            <p className="text-xs text-[#647572]">
                                Display your earned XP and milestone badges on community wellness leaderboards.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setLeaderboardVisibility(!leaderboardVisibility)
                                toast.success(
                                    !leaderboardVisibility
                                        ? 'Leaderboard visibility enabled.'
                                        : 'Profile hidden from leaderboards.'
                                )
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                                leaderboardVisibility ? 'bg-[#033135]' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                    leaderboardVisibility ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Security credentials */}
                    <div className="flex items-center justify-between rounded-xl border border-[#EEF1EE] p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E4F0EA] text-[#033135]">
                                <Lock size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#033135]">Two-Factor Authentication (2FA)</p>
                                <p className="text-xs text-[#647572]">Protected via SMS / Authenticator</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-1 text-xs font-semibold text-[#033135]">
                            <CheckCircle2 size={12} className="text-[#648C83]" /> Active
                        </span>
                    </div>
                </div>
            </section>

            {/* Help & Support */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="text-[#033135]" size={20} />
                        <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                            Help & Support
                        </h2>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Frequently asked questions, consultation policies, and contact support.
                    </p>
                </div>

                {/* FAQ List */}
                <div className="space-y-3 mb-6">
                    {faqs.map((faq, idx) => {
                        const isOpen = expandedFaq === idx
                        return (
                            <div
                                key={idx}
                                className="rounded-xl border border-[#EEF1EE] overflow-hidden transition"
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                                    className="flex w-full items-center justify-between p-4 text-left hover:bg-[#F8FAF7] transition"
                                >
                                    <span className="text-sm font-semibold text-[#033135] pr-2">
                                        {faq.q}
                                    </span>
                                    <ChevronDown
                                        size={17}
                                        className={`shrink-0 text-[#647572] transition-transform duration-200 ${
                                            isOpen ? 'rotate-180 text-[#033135]' : ''
                                        }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="border-t border-[#EEF1EE] bg-[#FAFBF9] px-4 py-3 text-xs sm:text-sm text-[#4A5D5A] leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Contact Support Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#DCE7E3] bg-[#F2F7F5] p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#033135] text-white">
                            <MessageSquare size={19} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#033135]">Need help with a consultation?</p>
                            <p className="text-xs text-[#647572]">
                                Our wellness care support team is available Mon-Sat, 9 AM - 8 PM IST.
                            </p>
                        </div>
                    </div>
                    <a
                        href="mailto:support@fitkey.com?subject=FitKey%20Consultation%20Support"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#033135] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#324C4D] transition shrink-0"
                    >
                        <Mail size={14} /> Contact Support
                    </a>
                </div>
            </section>

            <p className="text-center text-xs text-[#647572]">
                FitKey · Your health. Your journey.
            </p>
        </div>
    )
}

export default Profile