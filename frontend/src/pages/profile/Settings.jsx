import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
    Bell, Moon, Globe, Lock, Eye, Smartphone,
    ChevronRight, Settings as SettingsIcon, Volume2
} from 'lucide-react'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function Settings() {
    const [settings, setSettings] = useState({
        pushNotifications: true,
        emailNotifications: false,
        wellnessReminders: true,
        communityUpdates: true,
        soundEffects: false,
        darkMode: false,
    })

    const toggleSetting = (key) => {
        setSettings((prev) => ({
            ...prev,
            [key]: !prev[key],
        }))
    }

    const Toggle = ({ enabled, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={enabled}
            className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-[#033135]' : 'bg-[#D5DEDA]'
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
            description: 'Receive notifications on your device',
        },
        {
            key: 'emailNotifications',
            title: 'Email Notifications',
            description: 'Get important updates through email',
        },
        {
            key: 'wellnessReminders',
            title: 'Wellness Reminders',
            description: 'Reminders for your daily wellness goals',
        },
        {
            key: 'communityUpdates',
            title: 'Community Updates',
            description: 'Updates about posts and discussions',
        },
    ]

    const preferenceItems = [
        {
            key: 'soundEffects',
            title: 'Sound Effects',
            description: 'Play sounds for app interactions',
        },
        {
            key: 'darkMode',
            title: 'Dark Mode',
            description: 'Use a darker appearance',
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
            />
        </div>
    )

    const accountLinks = [
        {
            icon: Lock,
            title: 'Privacy & Security',
            description: 'Manage your privacy and account security',
            path: '/privacy',
        },
        {
            icon: Eye,
            title: 'Data & Permissions',
            description: 'Understand how your data is used',
            path: '/privacy',
        },
        {
            icon: Smartphone,
            title: 'Connected Devices',
            description: 'Manage connected health and fitness devices',
            path: null,
        },
        {
            icon: Globe,
            title: 'Language & Region',
            description: 'Choose your preferred language',
            path: null,
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

                {notificationItems.map((item) => (
                    <SettingRow key={item.key} item={item} />
                ))}
            </section>

            {/* Preferences */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-[#DCD6F7] p-2.5 text-[#033135]">
                        <SettingsIcon size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-[#033135]">App Preferences</h2>
                        <p className="text-xs text-[#647572]">
                            Customize how FitKey feels and works.
                        </p>
                    </div>
                </div>

                {preferenceItems.map((item) => (
                    <SettingRow key={item.key} item={item} />
                ))}

                <div className="mt-3 rounded-xl bg-[#F8FAF7] p-3 text-xs leading-5 text-[#647572]">
                    Appearance and sound preferences are currently demo controls.
                    Dark mode is not applied across the app yet.
                </div>
            </section>

            {/* Account */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-3">
                    <h2 className="font-bold text-[#033135]">Account & Devices</h2>
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
                                    window.location.href = item.path
                                } else {
                                    toast(`${item.title} settings coming soon.`)
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
            </section>

            {/* App information */}
            <section className="rounded-2xl bg-[#E4F0EA] p-5">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-3 text-[#033135]">
                        <Volume2 size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-[#033135]">FitKey</h3>
                        <p className="text-xs text-[#647572]">
                            Your health. Your journey.
                        </p>
                    </div>
                </div>
                <p className="mt-4 text-xs text-[#647572]">
                    Prototype version 1.0. Some settings will become functional
                    when account and device integrations are connected.
                </p>
            </section>
        </div>
    )
}

export default Settings