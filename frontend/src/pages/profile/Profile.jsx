
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
    UserRound, Mail, CalendarDays, Target, Activity,
    Pencil, Save, X, ShieldCheck, ChevronRight
} from 'lucide-react'

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
                    <h1 className="text-2xl font-bold text-[#033135]">My Profile</h1>
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
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DCD6F7] text-3xl font-bold text-[#033135]">
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
                    <h2 className="text-lg font-bold text-[#033135]">
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
                    <h2 className="text-lg font-bold text-[#033135]">
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

            {/* Account settings shortcuts */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-[#033135]">
                    Account & Privacy
                </h2>

                {[
                    'Privacy & Security',
                    'Notification Preferences',
                    'Help & Support',
                ].map((item) => (
                    <button
                        key={item}
                        onClick={() => toast('This section will be available soon.')}
                        className="flex w-full items-center justify-between border-b border-[#EEF1EE] py-4 text-left text-sm font-medium text-[#324C4D] last:border-0"
                    >
                        {item}
                        <ChevronRight size={18} className="text-[#647572]" />
                    </button>
                ))}
            </section>

            <p className="text-center text-xs text-[#647572]">
                FitKey · Your health. Your journey.
            </p>
        </div>
    )
}

export default Profile
