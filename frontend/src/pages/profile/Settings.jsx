import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
    Bell, Lock, Eye, ChevronRight, LogOut
} from 'lucide-react'
import { signOut } from '../../services/authService'
import { useAuth } from '../../context/AuthContext.jsx'
import { DEFAULT_NOTIFICATION_PREFERENCES, fetchNotificationPreferences, saveNotificationPreference } from '../../services/user/userSettingsService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function Settings() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_PREFERENCES)
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [savingKey, setSavingKey] = useState(null)

    useEffect(() => {
        let cancelled = false
        if (!user?.id) return () => { cancelled = true }
        fetchNotificationPreferences(user.id)
            .then((preferences) => { if (!cancelled) setSettings(preferences) })
            .catch((error) => { if (!cancelled) toast.error(error?.message || 'Could not load settings.') })
            .finally(() => { if (!cancelled) setLoadingSettings(false) })
        return () => { cancelled = true }
    }, [user?.id])

    const toggleSetting = async (key) => {
        if (!user?.id || savingKey) return
        const nextValue = !settings[key]
        setSavingKey(key)
        const result = await saveNotificationPreference(user.id, key, nextValue)
        setSavingKey(null)
        if (!result.success) {
            toast.error(result.error || 'Could not save setting.')
            return
        }
        setSettings(result.preferences)
        toast.success('Preference saved to your account.')
    }

    const handleLogout = async () => {
        try {
            await signOut()
            toast.success('Logged out successfully.')
        } catch (error) {
            console.error('Logout error:', error)
            toast.error(error?.message || 'Failed to log out.')
        } finally {
            navigate('/login')
        }
    }

    const Toggle = ({ enabled, onClick, disabled }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={enabled}
            className={`relative h-6 w-11 rounded-full transition disabled:opacity-50 ${enabled ? 'bg-[#033135]' : 'bg-[#D5DEDA]'
                }`}
        >
            <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'
                    }`}
            />
        </button>
    )

    const notificationItems = [
        {
            key: 'pushNotifications',
            title: 'Push Notifications',
            description: 'Saved notification preference for this account',
        },
        {
            key: 'emailNotifications',
            title: 'Email Notifications',
            description: 'Saved email update preference for this account',
        },
        {
            key: 'wellnessReminders',
            title: 'Wellness Reminders',
            description: 'Saved wellness reminder preference for this account',
        },
        {
            key: 'communityUpdates',
            title: 'Community Updates',
            description: 'Saved community update preference for this account',
        },
    ]

    const SettingRow = ({ item }) => (
        <div className="flex items-center justify-between gap-4 border-b border-[#EEF1EE] py-4 last:border-0">
            <div>
                <h3 className="text-sm font-semibold text-[#033135]">
                    {item.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#647572]">
                    {item.description}
                </p>
            </div>
            <Toggle
                enabled={settings[item.key]}
                onClick={() => toggleSetting(item.key)}
                disabled={loadingSettings || savingKey === item.key}
            />
        </div>
    )

    const accountLinks = [
        {
            icon: Lock,
            title: 'Privacy & Security',
            description: 'Manage your privacy and account security',
            path: '/profile',
        },
        {
            icon: Eye,
            title: 'Data & Permissions',
            description: 'Understand how your data is used',
            path: '/profile',
        },
    ]

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div>
                <p className="text-sm text-[#647572]">Personalize your experience</p>
                <h1
                    className="text-3xl sm:text-4xl text-[#033135]"
                    style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                >
                    Settings
                </h1>
                <p className="mt-1 text-sm text-[#647572]">
                    Manage your FitKey preferences and account experience.
                </p>
            </div>

            {/* Notifications */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-[#E4F0EA] p-2.5 text-[#033135]">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-[#033135]">Notifications</h2>
                        <p className="text-xs text-[#647572]">
                            Choose what updates you receive.
                        </p>
                    </div>
                </div>

                {loadingSettings ? <p className="py-4 text-xs text-[#647572]">Loading saved preferences…</p> : notificationItems.map((item) => (
                    <SettingRow key={item.key} item={item} />
                ))}
                <p className="mt-3 rounded-xl bg-[#F8FAF7] p-3 text-xs leading-5 text-[#647572]">
                    Preferences are saved to your account. Push and email delivery require notification providers that are not configured yet.
                </p>
            </section>

            {/* Account */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3">
                    <h2 className="font-bold text-[#033135]">Account</h2>
                    <p className="mt-1 text-xs text-[#647572]">
                        Manage your account preferences.
                    </p>
                </div>

                {accountLinks.map((item) => {
                    const Icon = item.icon

                    return (
                        <button
                            key={item.title}
                            onClick={() => {
                                if (item.path) {
                                    navigate(item.path)
                                }
                            }}
                            className="flex w-full items-center gap-3 border-b border-[#EEF1EE] py-4 text-left last:border-0"
                        >
                            <div className="rounded-xl bg-[#F8FAF7] p-2.5 text-[#324C4D]">
                                <Icon size={19} />
                            </div>

                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-[#033135]">
                                    {item.title}
                                </h3>
                                <p className="mt-1 text-xs text-[#647572]">
                                    {item.description}
                                </p>
                            </div>

                            <ChevronRight size={18} className="text-[#647572]" />
                        </button>
                    )
                })}

                <div className="mt-2 pt-2 border-t border-[#EEF1EE]">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 py-3 text-left transition group"
                    >
                        <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 group-hover:bg-rose-100 transition">
                            <LogOut size={19} />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-rose-600">
                                Log Out
                            </h3>
                            <p className="mt-0.5 text-xs text-[#647572]">
                                Sign out of your FitKey account
                            </p>
                        </div>
                    </button>
                </div>
            </section>

        </div>
    )
}

export default Settings
