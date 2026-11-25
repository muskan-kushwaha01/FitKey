import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
    UserRound,
    Mail,
    Phone,
    CalendarDays,
    Target,
    Activity,
    Pencil,
    Save,
    X,
    ShieldCheck,
    Shield,
    Lock,
    HelpCircle,
    ChevronDown,
    CheckCircle2,
    MessageSquare,
    Camera,
    Trash2,
    Ruler,
    Weight,
    Droplets,
    Utensils,
    HeartPulse,
    AlertCircle,
    RefreshCw,
    ExternalLink,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import {
    GENDER_OPTIONS,
    BLOOD_GROUP_OPTIONS,
    WELLNESS_GOAL_OPTIONS,
    ACTIVITY_LEVEL_OPTIONS,
    DIETARY_PREFERENCE_OPTIONS,
    calculateAgeFromDob,
    formatDietaryLabel,
    getCachedUserProfile,
    fetchUserProfile,
    saveUserProfile,
    updatePrivacyPreferences,
    uploadUserAvatar,
    removeUserAvatar,
} from '../../services/userProfileService'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function toEditFormState(profileData) {
    return {
        fullName: profileData?.personal?.fullName || '',
        email: profileData?.personal?.email || '',
        phone: profileData?.personal?.phone || '',
        dateOfBirth: profileData?.personal?.dateOfBirth || '',
        age: profileData?.personal?.age || '',
        gender: profileData?.personal?.gender || 'Prefer not to say',
        heightCm: profileData?.personal?.heightCm || '',
        weightKg: profileData?.personal?.weightKg || '',
        bloodGroup: profileData?.personal?.bloodGroup || '',
        primaryGoal: profileData?.wellness?.primaryGoal || 'Overall Wellness',
        activityLevel: profileData?.wellness?.activityLevel || 'Moderately Active',
        dietaryPreference: profileData?.wellness?.dietaryPreference || '',
    }
}

function Profile() {
    const { user, loading: authLoading } = useAuth()
    const fileInputRef = useRef(null)

    const [profileData, setProfileData] = useState(() => getCachedUserProfile(user))
    const [form, setForm] = useState(() => toEditFormState(getCachedUserProfile(user)))
    const [validationErrors, setValidationErrors] = useState({})

    const [loadingProfile, setLoadingProfile] = useState(true)
    const isInitialLoading = authLoading || (Boolean(user?.id) && loadingProfile && !profileData?._syncedFromServer)
    const [loadError, setLoadError] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [savingProfile, setSavingProfile] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [avatarLoadError, setAvatarLoadError] = useState(false)
    const [savingPrivacyKey, setSavingPrivacyKey] = useState(null)
    const [expandedFaq, setExpandedFaq] = useState(null)

    const applyLoadedProfile = useCallback((nextData) => {
        setProfileData(nextData)
        setForm(toEditFormState(nextData))
        setAvatarLoadError(false)
    }, [])

    const loadProfile = useCallback(async ({ manual = false } = {}) => {
        if (!user?.id) {
            setLoadingProfile(false)
            return
        }

        const result = await fetchUserProfile(user, { runMigration: !manual })
        if (result?.data) {
            applyLoadedProfile(result.data)
        }

        if (result.success) {
            setLoadError(null)
            if (manual) toast.success('Profile synced from server.')
        } else {
            setLoadError(result.error || 'Could not load latest profile from server.')
            if (manual) toast.error(result.error || 'Failed to sync profile.')
        }
        setLoadingProfile(false)
    }, [user, applyLoadedProfile])

    useEffect(() => {
        if (authLoading) return
        let cancelled = false

        if (!user?.id) {
            return () => {
                cancelled = true
            }
        }

        fetchUserProfile(user, { runMigration: true }).then((result) => {
            if (cancelled) return
            if (result?.data) {
                applyLoadedProfile(result.data)
            }
            if (result.success) {
                setLoadError(null)
            } else {
                setLoadError(result.error || 'Could not load latest profile from server.')
            }
            setLoadingProfile(false)
        })

        return () => {
            cancelled = true
        }
    }, [authLoading, user, applyLoadedProfile])

    const faqs = [
        {
            q: 'How do telehealth phone consultations work?',
            a: 'At your scheduled booking time, your verified healthcare professional will call your confirmed mobile number directly. Please keep your phone reachable. You can review your booking anytime from Appointments & Payments in your sidebar.',
        },
        {
            q: 'How can I apply FitKey XP for discounts?',
            a: 'Consultation bookings are saved to your account. Payment collection is not configured yet, so no payment or XP discount is processed during booking.',
        },
        {
            q: 'How do I cancel or reschedule an appointment?',
            a: 'Go to Appointments & Payments in your sidebar. Select your active upcoming appointment to pick a new date/time or cancel. If cancelled, your fee is refunded and any redeemed XP is restored.',
        },
        {
            q: 'How is my health and personal data kept secure?',
            a: 'FitKey uses authenticated row-level security and encrypted storage. Your health profile is only shared with verified practitioners you explicitly choose to consult with.',
        },
    ]

    const handleFieldChange = (e) => {
        const { name, value } = e.target
        setValidationErrors((prev) => {
            if (!prev[name]) return prev
            const next = { ...prev }
            delete next[name]
            return next
        })

        if (name === 'dateOfBirth') {
            const derivedAge = calculateAgeFromDob(value)
            setForm((prev) => ({
                ...prev,
                dateOfBirth: value,
                age: derivedAge !== null && derivedAge >= 0 ? String(derivedAge) : prev.age,
            }))
            return
        }

        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleStartEdit = () => {
        setForm(toEditFormState(profileData))
        setValidationErrors({})
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        setForm(toEditFormState(profileData))
        setValidationErrors({})
        setIsEditing(false)
    }

    const handleSave = async (e) => {
        if (e) e.preventDefault()
        if (savingProfile || !user?.id) return

        setSavingProfile(true)
        const result = await saveUserProfile(user, form, profileData)
        setSavingProfile(false)

        if (!result.success) {
            if (result.validationErrors) {
                setValidationErrors(result.validationErrors)
            }
            toast.error(result.error || 'Could not save profile changes.')
            return
        }

        if (result.data) {
            applyLoadedProfile(result.data)
        }
        setValidationErrors({})
        setIsEditing(false)

        if (result.emailConfirmationSent) {
            toast.success(
                `Profile saved! Verification link sent to ${result.pendingEmail} to confirm your email change.`,
                { duration: 5000 }
            )
        } else if (result.skippedColumns?.length > 0) {
            toast.success('Core profile saved. Apply the latest profile migration for full field support.')
        } else {
            toast.success('Profile updated successfully!')
        }
    }

    const handleAvatarSelect = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || uploadingAvatar || !user?.id) return

        setUploadingAvatar(true)
        const result = await uploadUserAvatar(user, file)
        setUploadingAvatar(false)

        if (!result.success) {
            toast.error(result.error || 'Failed to upload profile photo.')
            return
        }

        if (result.data) {
            applyLoadedProfile(result.data)
        }
        toast.success('Profile photo updated!')
    }

    const handleRemoveAvatar = async () => {
        if (uploadingAvatar || !user?.id || !profileData.personal.avatarUrl) return
        setUploadingAvatar(true)
        const result = await removeUserAvatar(user)
        setUploadingAvatar(false)

        if (!result.success) {
            toast.error(result.error || 'Could not remove profile photo.')
            return
        }

        if (result.data) {
            applyLoadedProfile(result.data)
        }
        toast.success('Profile photo removed.')
    }

    const handlePrivacyToggle = async (key) => {
        if (savingPrivacyKey || !user?.id) return

        const currentVal = Boolean(profileData.privacy[key])
        const nextVal = !currentVal

        setSavingPrivacyKey(key)
        setProfileData((prev) => ({
            ...prev,
            privacy: { ...prev.privacy, [key]: nextVal },
        }))

        const payload =
            key === 'healthDataSharing'
                ? { healthDataSharing: nextVal }
                : { leaderboardVisibility: nextVal }

        const result = await updatePrivacyPreferences(user, payload)
        setSavingPrivacyKey(null)

        if (!result.success) {
            setProfileData((prev) => ({
                ...prev,
                privacy: { ...prev.privacy, [key]: currentVal },
            }))
            toast.error(result.error || 'Could not update privacy setting.')
            return
        }

        if (result.data) {
            setProfileData(result.data)
        }

        if (key === 'healthDataSharing') {
            toast.success(
                nextVal
                    ? 'Health data sharing enabled for consultations.'
                    : 'Health data sharing restricted.'
            )
        } else {
            toast.success(
                nextVal
                    ? 'Leaderboard visibility enabled.'
                    : 'Profile hidden from leaderboards.'
            )
        }
    }

    const displayName = profileData.personal.fullName || 'FitKey Member'
    const avatarInitial = (profileData.personal.fullName || profileData.personal.email || 'F')
        .charAt(0)
        .toUpperCase()
    const hasAvatarImage = Boolean(profileData.personal.avatarUrl) && !avatarLoadError
    const accountBadgeLabel =
        profileData.personal.accountType &&
        profileData.personal.accountType.toLowerCase() !== 'user' &&
        profileData.personal.accountType.toLowerCase() !== 'member'
            ? `FitKey ${profileData.personal.accountType}`
            : 'FitKey Member'

    const { healthSummary } = profileData
    const hasHealthHistoryRecords =
        profileData.wellness.onboardingCompleted ||
        healthSummary.conditions.length > 0 ||
        healthSummary.allergies.length > 0 ||
        healthSummary.medications.length > 0 ||
        healthSummary.injuries.length > 0 ||
        healthSummary.sleepHours != null ||
        healthSummary.waterLitres != null

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

                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => loadProfile({ manual: true })}
                            disabled={isInitialLoading}
                            aria-label="Refresh profile"
                            className="flex items-center gap-1.5 rounded-xl border border-[#DCE6E1] bg-white px-3 py-2.5 text-sm font-semibold text-[#033135] hover:bg-[#E4F0EA] disabled:opacity-60"
                        >
                            <RefreshCw size={15} className={isInitialLoading ? 'animate-spin' : ''} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={isEditing ? handleCancelEdit : handleStartEdit}
                        disabled={savingProfile || isInitialLoading}
                        className="flex items-center gap-2 rounded-xl border border-[#DCE6E1] bg-white px-4 py-2.5 text-sm font-semibold text-[#033135] hover:bg-[#E4F0EA] disabled:opacity-60"
                    >
                        {isEditing ? <X size={17} /> : <Pencil size={17} />}
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F2C98A] bg-[#FFF8EB] px-4 py-3 text-xs text-[#7C5B1B]">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0 text-[#B45309]" />
                        <span>{loadError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadProfile({ manual: true })}
                        className="rounded-full border border-[#E6B86E] bg-white px-3 py-1 text-[11px] font-semibold text-[#7C5B1B] hover:bg-[#FEF3C7]"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Profile card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="flex flex-wrap items-center gap-5">
                        <div className="relative">
                            {hasAvatarImage ? (
                                <img
                                    src={profileData.personal.avatarUrl}
                                    alt={`${displayName} avatar`}
                                    onError={() => setAvatarLoadError(true)}
                                    className="h-20 w-20 rounded-full object-cover border-2 border-[#E4F0EA]"
                                />
                            ) : (
                                <div
                                    className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DCD6F7] text-3xl text-[#033135]"
                                    style={{ fontFamily: SERIF }}
                                >
                                    {isInitialLoading ? '·' : avatarInitial}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar || isInitialLoading}
                                aria-label="Change profile photo"
                                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#033135] text-white shadow-sm transition hover:bg-[#324C4D] disabled:opacity-60"
                            >
                                {uploadingAvatar ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <Camera size={14} />
                                )}
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleAvatarSelect}
                                className="hidden"
                            />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-[#033135]">
                                {isInitialLoading ? 'Loading profile...' : displayName}
                            </h2>
                            <p className="mt-1 text-sm text-[#647572]">
                                {profileData.personal.email || 'No email on record'}
                            </p>

                            {profileData.personal.pendingEmail && (
                                <p className="mt-1 text-xs font-medium text-[#8B6D25]">
                                    Pending email verification: {profileData.personal.pendingEmail}
                                </p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-3 py-1 text-xs font-semibold text-[#324C4D]">
                                    <ShieldCheck size={14} /> {accountBadgeLabel}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar || isInitialLoading}
                                    className="text-xs font-semibold text-[#033135] underline-offset-2 hover:underline disabled:opacity-50"
                                >
                                    {uploadingAvatar ? 'Uploading photo...' : 'Upload photo'}
                                </button>

                                {profileData.personal.avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        disabled={uploadingAvatar}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-[#C0563B] hover:underline disabled:opacity-50"
                                    >
                                        <Trash2 size={12} /> Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Personal information */}
                <section className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-5">
                        <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                            Personal Information
                        </h2>
                        <p className="mt-1 text-sm text-[#647572]">
                            Your basic account and body profile information.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        {/* Full Name */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Full Name
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                <UserRound size={18} className="shrink-0 text-[#647572]" />
                                {isEditing ? (
                                    <input
                                        name="fullName"
                                        value={form.fullName}
                                        onChange={handleFieldChange}
                                        type="text"
                                        placeholder="Enter your full name"
                                        className="w-full bg-transparent text-sm text-[#033135] outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-[#033135]">
                                        {profileData.personal.fullName || 'Not set'}
                                    </span>
                                )}
                            </div>
                            {validationErrors.fullName && (
                                <p className="mt-1 text-xs text-[#C0563B]">{validationErrors.fullName}</p>
                            )}
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Email Address
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                <Mail size={18} className="shrink-0 text-[#647572]" />
                                {isEditing ? (
                                    <input
                                        name="email"
                                        value={form.email}
                                        onChange={handleFieldChange}
                                        type="email"
                                        placeholder="you@example.com"
                                        className="w-full bg-transparent text-sm text-[#033135] outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-[#033135] truncate">
                                        {profileData.personal.email || 'Not set'}
                                    </span>
                                )}
                            </div>
                            {isEditing && (
                                <p className="mt-1 text-[11px] text-[#647572]">
                                    Updating email sends a confirmation link to your new address.
                                </p>
                            )}
                            {validationErrors.email && (
                                <p className="mt-1 text-xs text-[#C0563B]">{validationErrors.email}</p>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Phone Number
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                <Phone size={18} className="shrink-0 text-[#647572]" />
                                {isEditing ? (
                                    <input
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleFieldChange}
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        className="w-full bg-transparent text-sm text-[#033135] outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-[#033135]">
                                        {profileData.personal.phone || 'Not provided'}
                                    </span>
                                )}
                            </div>
                            {validationErrors.phone && (
                                <p className="mt-1 text-xs text-[#C0563B]">{validationErrors.phone}</p>
                            )}
                        </div>

                        {/* Date of Birth */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Date of Birth
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                <CalendarDays size={18} className="shrink-0 text-[#647572]" />
                                {isEditing ? (
                                    <input
                                        name="dateOfBirth"
                                        value={form.dateOfBirth}
                                        onChange={handleFieldChange}
                                        type="date"
                                        className="w-full bg-transparent text-sm text-[#033135] outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-[#033135]">
                                        {profileData.personal.dateOfBirth || 'Not set'}
                                    </span>
                                )}
                            </div>
                            {validationErrors.dateOfBirth && (
                                <p className="mt-1 text-xs text-[#C0563B]">{validationErrors.dateOfBirth}</p>
                            )}
                        </div>

                        {/* Age */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Age
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                <CalendarDays size={18} className="shrink-0 text-[#647572]" />
                                {isEditing ? (
                                    <input
                                        name="age"
                                        value={form.age}
                                        onChange={handleFieldChange}
                                        type="number"
                                        min="13"
                                        max="120"
                                        placeholder="Years"
                                        readOnly={Boolean(form.dateOfBirth)}
                                        className="w-full bg-transparent text-sm text-[#033135] outline-none read-only:opacity-75"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-[#033135]">
                                        {profileData.personal.age ? `${profileData.personal.age} years` : 'Not set'}
                                    </span>
                                )}
                            </div>
                            {validationErrors.age && (
                                <p className="mt-1 text-xs text-[#C0563B]">{validationErrors.age}</p>
                            )}
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Gender
                            </label>
                            <select
                                name="gender"
                                value={isEditing ? form.gender : profileData.personal.gender}
                                onChange={handleFieldChange}
                                disabled={!isEditing}
                                className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                            >
                                {GENDER_OPTIONS.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Height */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Height (cm)
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                <Ruler size={18} className="shrink-0 text-[#647572]" />
                                {isEditing ? (
                                    <input
                                        name="heightCm"
                                        value={form.heightCm}
                                        onChange={handleFieldChange}
                                        type="number"
                                        min="50"
                                        max="260"
                                        step="0.1"
                                        placeholder="170"
                                        className="w-full bg-transparent text-sm text-[#033135] outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-[#033135]">
                                        {profileData.personal.heightCm ? `${profileData.personal.heightCm} cm` : 'Not set'}
                                    </span>
                                )}
                            </div>
                            {validationErrors.heightCm && (
                                <p className="mt-1 text-xs text-[#C0563B]">{validationErrors.heightCm}</p>
                            )}
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[#647572]">
                                Weight (kg)
                            </label>
                            <div className="flex items-center gap-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3">
                                <Weight size={18} className="shrink-0 text-[#647572]" />
                                {isEditing ? (
                                    <input
                                        name="weightKg"
                                        value={form.weightKg}
                                        onChange={handleFieldChange}
                                        type="number"
                                        min="20"
                                        max="350"
                                        step="0.1"
                                        placeholder="70"
                                        className="w-full bg-transparent text-sm text-[#033135] outline-none"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-[#033135]">
                                        {profileData.personal.weightKg ? `${profileData.personal.weightKg} kg` : 'Not set'}
                                    </span>
                                )}
                            </div>
                            {validationErrors.weightKg && (
                                <p className="mt-1 text-xs text-[#C0563B]">{validationErrors.weightKg}</p>
                            )}
                        </div>

                        {/* Blood Group */}
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#647572]">
                                <Droplets size={16} /> Blood Group
                            </label>
                            <select
                                name="bloodGroup"
                                value={isEditing ? form.bloodGroup : profileData.personal.bloodGroup}
                                onChange={handleFieldChange}
                                disabled={!isEditing}
                                className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                            >
                                <option value="">Not specified</option>
                                {BLOOD_GROUP_OPTIONS.map((bg) => (
                                    <option key={bg} value={bg}>
                                        {bg}
                                    </option>
                                ))}
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
                                name="primaryGoal"
                                value={isEditing ? form.primaryGoal : profileData.wellness.primaryGoal}
                                onChange={handleFieldChange}
                                disabled={!isEditing}
                                className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                            >
                                {WELLNESS_GOAL_OPTIONS.map((goal) => (
                                    <option key={goal} value={goal}>
                                        {goal}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#647572]">
                                <Activity size={17} /> Activity Preference
                            </label>
                            <select
                                name="activityLevel"
                                value={isEditing ? form.activityLevel : profileData.wellness.activityLevel}
                                onChange={handleFieldChange}
                                disabled={!isEditing}
                                className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                            >
                                {ACTIVITY_LEVEL_OPTIONS.map((act) => (
                                    <option key={act} value={act}>
                                        {act}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#647572]">
                                <Utensils size={17} /> Dietary Preference
                            </label>
                            <select
                                name="dietaryPreference"
                                value={isEditing ? form.dietaryPreference : profileData.wellness.dietaryPreference}
                                onChange={handleFieldChange}
                                disabled={!isEditing}
                                className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none disabled:opacity-100"
                            >
                                <option value="">Not specified</option>
                                {DIETARY_PREFERENCE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Save / Cancel buttons */}
                {isEditing && (
                    <div className="flex flex-wrap justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={savingProfile}
                            className="flex items-center gap-2 rounded-xl border border-[#DCE6E1] bg-white px-5 py-3 text-sm font-semibold text-[#033135] hover:bg-[#F8FAF7] disabled:opacity-60"
                        >
                            <X size={16} /> Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={savingProfile}
                            className="flex items-center gap-2 rounded-xl bg-[#033135] px-6 py-3 text-sm font-semibold text-white hover:bg-[#324C4D] disabled:opacity-60"
                        >
                            {savingProfile ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={17} /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                )}
            </form>

            {/* Health & Medical History (read-only view sourced from existing onboarding/health tables) */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <HeartPulse className="text-[#033135]" size={20} />
                            <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                                Health &amp; Lifestyle Summary
                            </h2>
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                            Synced directly from your Health History and onboarding records.
                        </p>
                    </div>

                    <Link
                        to="/health-history"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6E1] bg-[#F8FAF7] px-3.5 py-2 text-xs font-semibold text-[#033135] transition hover:bg-[#E4F0EA]"
                    >
                        <span>{hasHealthHistoryRecords ? 'Update Health History' : 'Complete Health History'}</span>
                        <ExternalLink size={13} />
                    </Link>
                </div>

                {!hasHealthHistoryRecords ? (
                    <div className="rounded-xl border border-dashed border-[#DCE6E1] bg-[#F8FAF7] p-5 text-center">
                        <p className="text-sm font-medium text-[#033135]">
                            No medical or lifestyle history recorded yet.
                        </p>
                        <p className="mt-1 text-xs text-[#647572]">
                            Add conditions, allergies, medications, or sleep &amp; hydration habits in Health History.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Medical Conditions */}
                        <div className="rounded-xl border border-[#EEF1EE] bg-[#F8FAF7] p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#647572]">
                                Medical Conditions
                            </p>
                            {healthSummary.conditions.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {healthSummary.conditions.map((c) => (
                                        <span
                                            key={c.id || c.condition_name}
                                            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#033135] border border-[#E5EBE7]"
                                        >
                                            {c.condition_name}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-[#647572]">None recorded</p>
                            )}
                        </div>

                        {/* Allergies */}
                        <div className="rounded-xl border border-[#EEF1EE] bg-[#F8FAF7] p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#647572]">
                                Allergies
                            </p>
                            {healthSummary.allergies.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {healthSummary.allergies.map((a) => (
                                        <span
                                            key={a.id || `${a.allergy_type}-${a.allergen}`}
                                            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#033135] border border-[#E5EBE7]"
                                        >
                                            {a.allergen ? `${a.allergy_type}: ${a.allergen}` : a.allergy_type}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-[#647572]">No known allergies</p>
                            )}
                        </div>

                        {/* Medications & Supplements */}
                        <div className="rounded-xl border border-[#EEF1EE] bg-[#F8FAF7] p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#647572]">
                                Medications &amp; Supplements
                            </p>
                            {healthSummary.medications.length > 0 || healthSummary.supplements.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {healthSummary.medications.map((m) => (
                                        <span
                                            key={m.id || m.medication_name}
                                            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#033135] border border-[#E5EBE7]"
                                        >
                                            {m.dosage ? `${m.medication_name} (${m.dosage})` : m.medication_name}
                                        </span>
                                    ))}
                                    {healthSummary.supplements.map((s) => (
                                        <span
                                            key={s}
                                            className="rounded-full bg-[#E4F0EA] px-2.5 py-1 text-xs font-medium text-[#324C4D]"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-[#647572]">None recorded</p>
                            )}
                        </div>

                        {/* Lifestyle & Nutrition Overview */}
                        <div className="rounded-xl border border-[#EEF1EE] bg-[#F8FAF7] p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#647572]">
                                Lifestyle &amp; Nutrition
                            </p>
                            <div className="mt-2 space-y-1 text-xs text-[#324C4D]">
                                <p>
                                    Diet: <span className="font-semibold text-[#033135]">{formatDietaryLabel(profileData.wellness.dietaryPreference)}</span>
                                    {healthSummary.specificDiet === 'Yes' && healthSummary.specificDietName
                                        ? ` · ${healthSummary.specificDietName}`
                                        : ''}
                                </p>
                                <p>
                                    Baseline: {healthSummary.sleepHours != null ? `${healthSummary.sleepHours} hrs sleep` : 'Sleep unset'}
                                    {' · '}
                                    {healthSummary.waterLitres != null ? `${healthSummary.waterLitres} L water` : 'Water unset'}
                                </p>
                                {(healthSummary.stress || healthSummary.smoking) && (
                                    <p>
                                        {healthSummary.stress ? `Stress: ${healthSummary.stress}` : ''}
                                        {healthSummary.stress && healthSummary.smoking ? ' · ' : ''}
                                        {healthSummary.smoking ? `Smoking: ${healthSummary.smoking}` : ''}
                                    </p>
                                )}
                                {healthSummary.injuries.length > 0 && (
                                    <p>
                                        Injuries: {healthSummary.injuries.map((i) => i.body_part ? `${i.injury_type} (${i.body_part})` : i.injury_type).join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Privacy & Security */}
            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <div className="flex items-center gap-2">
                        <Shield className="text-[#033135]" size={20} />
                        <h2 className="text-xl text-[#033135]" style={{ fontFamily: SERIF }}>
                            Privacy &amp; Security
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
                            disabled={savingPrivacyKey === 'healthDataSharing' || loadingProfile}
                            aria-pressed={profileData.privacy.healthDataSharing}
                            onClick={() => handlePrivacyToggle('healthDataSharing')}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out disabled:opacity-60 ${
                                profileData.privacy.healthDataSharing ? 'bg-[#033135]' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                    profileData.privacy.healthDataSharing ? 'translate-x-5' : 'translate-x-0'
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
                            disabled={savingPrivacyKey === 'leaderboardVisibility' || loadingProfile}
                            aria-pressed={profileData.privacy.leaderboardVisibility}
                            onClick={() => handlePrivacyToggle('leaderboardVisibility')}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out disabled:opacity-60 ${
                                profileData.privacy.leaderboardVisibility ? 'bg-[#033135]' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                    profileData.privacy.leaderboardVisibility ? 'translate-x-5' : 'translate-x-0'
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
                                <p className="text-sm font-semibold text-[#033135]">Account Verification &amp; 2FA</p>
                                <p className="text-xs text-[#647572]">
                                    {profileData.privacy.mfaEnabled
                                        ? 'Two-factor authentication verified'
                                        : profileData.personal.emailVerified
                                            ? 'Protected by verified email authentication'
                                            : 'Verify your email address to strengthen account recovery'}
                                </p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-1 text-xs font-semibold text-[#033135]">
                            <CheckCircle2 size={12} className="text-[#648C83]" />
                            {profileData.privacy.mfaEnabled
                                ? '2FA Active'
                                : profileData.personal.emailVerified
                                    ? 'Verified'
                                    : 'Pending'}
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
                            Help &amp; Support
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
