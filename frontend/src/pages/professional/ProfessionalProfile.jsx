import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
    X,
    CheckCircle2,
    Save,
    Image,
    User,
    Award,
    Briefcase,
    Building2,
    MapPin,
    ShieldCheck,
    Phone,
    Clock,
    CreditCard,
    Lock,
    Sparkles,
    Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ProfessionalProfileHeader from '../../components/professional/ProfessionalProfileHeader.jsx'
import ProfessionalContentGrid from '../../components/professional/ProfessionalContentGrid.jsx'
import ProfessionalReviews from '../../components/professional/ProfessionalReviews.jsx'
import {
    getPosts,
    deletePost,
} from '../../services/professional/professionalContentService.js'
import { updateProfessionalProfile } from '../../services/professional/professionalProfileService.js'
import {
    getRatingSummary,
    getReviewsForProfessional,
} from '../../services/professional/professionalReviewService.js'
import {
    getConsultationSettings,
    saveConsultationSettings,
    DAYS_OF_WEEK,
    DURATION_OPTIONS,
    BUFFER_OPTIONS,
    MIN_CONSULTATION_FEE,
} from '../../services/professional/professionalConsultationService.js'

const inputClass =
    'w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3.5 py-2.5 text-xs outline-none transition placeholder:text-[#9AA6A0] focus:border-[#648C83] focus:bg-white focus:ring-2 focus:ring-[#E4F0EA]'

const AVATARS = [
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1594824813512-850d9953a8f4?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
]

const TIME_OPTIONS = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

function ProfessionalProfile() {
    const navigate = useNavigate()
    const { professional, setProfessional } = useOutletContext() || {}
    const [posts, setPosts] = useState([])
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editTab, setEditTab] = useState('profile') // 'profile' | 'consultations'
    const [ratingSummary, setRatingSummary] = useState({ avg: 0, total: 0, distribution: {} })
    const [reviews, setReviews] = useState([])

    // Edit form state
    const [editForm, setEditForm] = useState({
        fullName: '',
        photoUrl: '',
        profession: '',
        specialization: '',
        bio: '',
        qualifications: '',
        yearsExperience: '',
        licenseNumber: '',
        workplaceName: '',
        workplaceAddress: '',
        city: '',
        state: '',
    })

    // Consultation preferences state
    const [consultationSettings, setConsultationSettingsState] = useState(null)

    const loadPosts = useCallback(() => {
        if (!professional) return
        const myPosts = getPosts({ professionalId: professional.id })
        setPosts(myPosts)
        setRatingSummary(getRatingSummary(professional.id))
        setReviews(getReviewsForProfessional(professional.id))
    }, [professional])

    useEffect(() => {
        loadPosts()
    }, [loadPosts])

    const handleOpenEdit = () => {
        if (!professional) return
        setEditForm({
            fullName: professional.fullName || professional.name || '',
            photoUrl: professional.photoUrl || '',
            profession: professional.profession || '',
            specialization: professional.specialization || '',
            bio: professional.bio || '',
            qualifications: professional.qualifications || '',
            yearsExperience: professional.yearsExperience || '',
            licenseNumber: professional.licenseNumber || '',
            workplaceName: professional.workplaceName || '',
            workplaceAddress: professional.workplaceAddress || '',
            city: professional.city || '',
            state: professional.state || '',
        })

        // Fetch current consultation settings
        const currentConsult = getConsultationSettings(professional.id)
        setConsultationSettingsState(currentConsult)
        setEditTab('profile')
        setEditModalOpen(true)
    }

    const handleToggleScheduleDay = (dayKey) => {
        setConsultationSettingsState((prev) => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [dayKey]: {
                    ...prev.schedule[dayKey],
                    enabled: !prev.schedule[dayKey].enabled,
                },
            },
        }))
    }

    const handleScheduleTimeChange = (dayKey, field, val) => {
        setConsultationSettingsState((prev) => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [dayKey]: {
                    ...prev.schedule[dayKey],
                    [field]: val,
                },
            },
        }))
    }

    const handleApplyHoursToAll = () => {
        if (!consultationSettings?.schedule) return
        const firstDay = DAYS_OF_WEEK.find((d) => consultationSettings.schedule[d.key]?.enabled)?.key || 'monday'
        const template = consultationSettings.schedule[firstDay]
        if (!template) return

        const updated = {}
        DAYS_OF_WEEK.forEach((d) => {
            updated[d.key] = {
                ...consultationSettings.schedule[d.key],
                startTime: template.startTime,
                endTime: template.endTime,
            }
        })
        setConsultationSettingsState((prev) => ({ ...prev, schedule: updated }))
        toast.success(`Applied hours (${template.startTime} - ${template.endTime}) to all days`)
    }

    const handleSaveEdit = (e) => {
        e.preventDefault()
        if (!professional) return

        if (!editForm.fullName.trim()) {
            toast.error('Name cannot be empty.')
            return
        }

        // Validate consultation settings if present
        if (consultationSettings) {
            if (consultationSettings.isEnabled) {
                if (Number(consultationSettings.consultationFee) < MIN_CONSULTATION_FEE) {
                    toast.error(`Minimum consultation fee is ₹${MIN_CONSULTATION_FEE}.`)
                    setEditTab('consultations')
                    return
                }
                if (!consultationSettings.contactPhone?.trim()) {
                    toast.error('Please provide a contact phone number for consultation calls.')
                    setEditTab('consultations')
                    return
                }
                if (!consultationSettings.phoneConsent) {
                    toast.error('Please accept the consultation calling agreement.')
                    setEditTab('consultations')
                    return
                }
            }
        }

        // 1. Update Core Profile
        const res = updateProfessionalProfile(professional.id, editForm)
        if (!res.success) {
            toast.error(res.error || 'Failed to update profile.')
            return
        }

        // 2. Save Consultation Settings
        if (consultationSettings) {
            saveConsultationSettings(professional.id, consultationSettings)
        }

        toast.success('Profile & consultation settings saved successfully!')
        if (setProfessional) setProfessional(res.professional)
        setEditModalOpen(false)
    }

    const handleDeletePost = (postId) => {
        if (!professional) return
        const res = deletePost(postId, professional.id)
        if (res.success) {
            toast.success(res.message)
            loadPosts()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="space-y-8">
            {/* 1. Credibility-Focused Profile Header */}
            <ProfessionalProfileHeader
                professional={professional}
                onEditProfile={handleOpenEdit}
                postCount={posts.length}
                ratingSummary={ratingSummary}
            />

            {/* 2. Published Content Section & Grid */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-[#033135]">
                            Published Clinical Content
                        </h2>
                        <p className="text-xs text-[#647572]">
                            Educational articles, rehabilitation reels, and clinical discussions authored by you.
                        </p>
                    </div>
                </div>

                <ProfessionalContentGrid
                    posts={posts}
                    currentUserId={professional?.id}
                    currentUserName={professional?.fullName || professional?.name}
                    onDeletePost={handleDeletePost}
                    onUpdatePost={loadPosts}
                />
            </section>

            {/* 3. Patient & Peer Reviews Section */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#033135]">
                        Patient & Peer Reviews
                    </h2>
                    <p className="text-xs text-[#647572]">
                        Verified feedback from patients and peer healthcare practitioners.
                    </p>
                </div>

                <ProfessionalReviews
                    professionalId={professional?.id}
                    ratingSummary={ratingSummary}
                    reviews={reviews}
                    showTitle={false}
                />
            </section>

            {/* 4. Edit Profile Modal (with Consultation Settings Tab) */}
            {editModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
                    onClick={() => setEditModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-2xl rounded-3xl border border-[#E8EFEB] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-[#033135]">
                                    Edit Professional Practice & Settings
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    Update your credentials, clinic information, and consultation preferences.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                className="rounded-full p-1.5 text-[#647572] hover:bg-[#E8EFEB] transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Navigation Tabs */}
                        <div className="flex items-center gap-2 border-b border-[#E8EFEB] pt-3 pb-2">
                            <button
                                type="button"
                                onClick={() => setEditTab('profile')}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${editTab === 'profile'
                                    ? 'bg-[#033135] text-white shadow-xs'
                                    : 'border border-[#DCE7E3] bg-[#FAFBF9] text-[#647572] hover:bg-white'
                                    }`}
                            >
                                <User size={14} />
                                <span>Profile Details</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setEditTab('consultations')}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${editTab === 'consultations'
                                    ? 'bg-[#033135] text-white shadow-xs'
                                    : 'border border-[#DCE7E3] bg-[#FAFBF9] text-[#647572] hover:bg-white'
                                    }`}
                            >
                                <Phone size={14} />
                                <span>Consultation Preferences</span>
                                {consultationSettings?.isEnabled && (
                                    <span className="h-2 w-2 rounded-full bg-[#2F7B58]" />
                                )}
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">

                            {/* TAB 1: Profile Details */}
                            {editTab === 'profile' && (
                                <div className="space-y-4">
                                    {/* Full Name */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            Full Name & Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.fullName}
                                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                            className={inputClass}
                                            placeholder="e.g. Dr. Priya Nair, MD"
                                        />
                                    </div>

                                    {/* Profile Image & Avatar Picker */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            Profile Photograph
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#DCE7E3] bg-[#E4F0EA]">
                                                {editForm.photoUrl ? (
                                                    <img src={editForm.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                                                ) : (
                                                    <User size={20} className="text-[#033135]" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex gap-1.5">
                                                    {AVATARS.map((url, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => setEditForm({ ...editForm, photoUrl: url })}
                                                            className="h-7 w-7 overflow-hidden rounded-full border border-[#DCE7E3] hover:ring-2 hover:ring-[#033135] transition"
                                                        >
                                                            <img src={url} alt={`Avatar ${i + 1}`} className="h-full w-full object-cover" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="url"
                                                    value={editForm.photoUrl}
                                                    onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                                                    placeholder="Or enter image URL (https://...)"
                                                    className="w-full rounded-lg border border-[#DCE7E3] bg-[#F8FAF7] px-2.5 py-1 text-xs outline-none focus:border-[#648C83]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profession & Specialization */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Profession / Role
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.profession}
                                                onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. Doctor, Nutritionist, Physiotherapist"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Specialization
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.specialization}
                                                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. Preventive Cardiology"
                                            />
                                        </div>
                                    </div>

                                    {/* Qualifications & License */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Degrees & Qualifications
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.qualifications}
                                                onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. MBBS, MD, DM"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Years of Experience
                                            </label>
                                            <input
                                                type="number"
                                                value={editForm.yearsExperience}
                                                onChange={(e) => setEditForm({ ...editForm, yearsExperience: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. 10"
                                            />
                                        </div>
                                    </div>

                                    {/* License Number */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            Registration / License Number
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.licenseNumber}
                                            onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                                            className={inputClass}
                                            placeholder="e.g. MCI-2014-98421"
                                        />
                                    </div>

                                    {/* Workplace & Location */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Clinic / Hospital Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.workplaceName}
                                                onChange={(e) => setEditForm({ ...editForm, workplaceName: e.target.value })}
                                                className={inputClass}
                                                placeholder="e.g. Apollo Wellness Center"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                City & State
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.city}
                                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                                className={inputClass}
                                                placeholder="City"
                                            />
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            Professional Bio
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={editForm.bio}
                                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                            className={inputClass}
                                            placeholder="Brief clinical focus and philosophy..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Consultation Preferences */}
                            {editTab === 'consultations' && consultationSettings && (
                                <div className="space-y-4">
                                    {/* Active / Paused Switch */}
                                    <div className="flex items-center justify-between rounded-2xl border border-[#DCE7E3] bg-[#FAFBF9] p-4">
                                        <div>
                                            <p className="text-xs font-bold text-[#033135]">
                                                Phone Consultations Status
                                            </p>
                                            <p className="text-[11px] text-[#647572]">
                                                {consultationSettings.isEnabled
                                                    ? 'Consultations active. Patients can schedule appointments.'
                                                    : 'Consultations paused. Your booking calendar is hidden.'}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setConsultationSettingsState({
                                                ...consultationSettings,
                                                isEnabled: !consultationSettings.isEnabled,
                                            })}
                                            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${consultationSettings.isEnabled
                                                ? 'bg-[#033135] text-white'
                                                : 'border border-[#DCE7E3] bg-white text-[#647572]'
                                                }`}
                                        >
                                            {consultationSettings.isEnabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </div>

                                    {/* Consultation Fee */}
                                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-[#324C4D]">
                                                Consultation Fee (₹ INR) *
                                            </label>
                                            <span className="text-[11px] font-semibold text-[#2F7B58]">
                                                Min: ₹{MIN_CONSULTATION_FEE}
                                            </span>
                                        </div>
                                        <input
                                            type="number"
                                            min={MIN_CONSULTATION_FEE}
                                            step="50"
                                            value={consultationSettings.consultationFee}
                                            onChange={(e) => setConsultationSettingsState({
                                                ...consultationSettings,
                                                consultationFee: Number(e.target.value),
                                            })}
                                            className={inputClass}
                                        />
                                        <div className="flex gap-2">
                                            {[200, 500, 800, 1000].map((amt) => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setConsultationSettingsState({
                                                        ...consultationSettings,
                                                        consultationFee: amt,
                                                    })}
                                                    className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${Number(consultationSettings.consultationFee) === amt
                                                        ? 'bg-[#033135] text-white'
                                                        : 'border-[#DCE7E3] text-[#033135]'
                                                        }`}
                                                >
                                                    ₹{amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Duration and Buffer */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Duration (mins)
                                            </label>
                                            <select
                                                value={consultationSettings.durationMinutes}
                                                onChange={(e) => setConsultationSettingsState({
                                                    ...consultationSettings,
                                                    durationMinutes: Number(e.target.value),
                                                })}
                                                className={inputClass}
                                            >
                                                {DURATION_OPTIONS.map((mins) => (
                                                    <option key={mins} value={mins}>{mins} mins</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Buffer Time (mins)
                                            </label>
                                            <select
                                                value={consultationSettings.bufferMinutes}
                                                onChange={(e) => setConsultationSettingsState({
                                                    ...consultationSettings,
                                                    bufferMinutes: Number(e.target.value),
                                                })}
                                                className={inputClass}
                                            >
                                                {BUFFER_OPTIONS.map((mins) => (
                                                    <option key={mins} value={mins}>{mins === 0 ? 'No buffer' : `${mins} mins`}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Contact Phone & Consent */}
                                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 space-y-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                                Phone Number for Consultations
                                            </label>
                                            <input
                                                type="tel"
                                                value={consultationSettings.contactPhone || ''}
                                                onChange={(e) => setConsultationSettingsState({
                                                    ...consultationSettings,
                                                    contactPhone: e.target.value,
                                                })}
                                                placeholder="+91 98765 43210"
                                                className={inputClass}
                                            />
                                            <p className="mt-1 text-[10px] text-[#647572]">
                                                🔒 Used strictly for bridging calls. Never shown publicly to users.
                                            </p>
                                        </div>

                                        <label className="flex items-start gap-2 cursor-pointer text-xs text-[#324C4D]">
                                            <input
                                                type="checkbox"
                                                checked={consultationSettings.phoneConsent}
                                                onChange={(e) => setConsultationSettingsState({
                                                    ...consultationSettings,
                                                    phoneConsent: e.target.checked,
                                                })}
                                                className="mt-0.5 h-4 w-4 rounded accent-[#033135]"
                                            />
                                            <span>
                                                I agree to receive consultation calls on this number during my specified available hours.
                                            </span>
                                        </label>
                                    </div>

                                    {/* Payout Destination Snapshot */}
                                    <div className="rounded-2xl border border-[#E8EFEB] bg-[#FAFBF9] p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-[#033135]">
                                                Payout Method: {consultationSettings.payoutDetails?.method === 'upi' ? 'UPI' : 'Bank'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditModalOpen(false)
                                                    navigate('/professional/consultations/payments')
                                                }}
                                                className="text-[11px] font-bold text-[#033135] underline"
                                            >
                                                Full Payment Settings →
                                            </button>
                                        </div>

                                        {consultationSettings.payoutDetails?.method === 'upi' ? (
                                            <div>
                                                <label className="block text-[11px] font-semibold text-[#324C4D] mb-1">
                                                    UPI ID
                                                </label>
                                                <input
                                                    type="text"
                                                    value={consultationSettings.payoutDetails?.upiId || ''}
                                                    onChange={(e) => setConsultationSettingsState({
                                                        ...consultationSettings,
                                                        payoutDetails: {
                                                            ...consultationSettings.payoutDetails,
                                                            upiId: e.target.value,
                                                        },
                                                    })}
                                                    placeholder="doctor@upi"
                                                    className={inputClass}
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <input
                                                    type="text"
                                                    value={consultationSettings.payoutDetails?.bankName || ''}
                                                    onChange={(e) => setConsultationSettingsState({
                                                        ...consultationSettings,
                                                        payoutDetails: {
                                                            ...consultationSettings.payoutDetails,
                                                            bankName: e.target.value,
                                                        },
                                                    })}
                                                    placeholder="Bank Name"
                                                    className={inputClass}
                                                />
                                                <input
                                                    type="text"
                                                    value={consultationSettings.payoutDetails?.accountNumber || ''}
                                                    onChange={(e) => setConsultationSettingsState({
                                                        ...consultationSettings,
                                                        payoutDetails: {
                                                            ...consultationSettings.payoutDetails,
                                                            accountNumber: e.target.value,
                                                        },
                                                    })}
                                                    placeholder="A/C Number"
                                                    className={inputClass}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8EFEB]">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572] hover:bg-[#FAFBF9]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold text-white hover:bg-[#324C4D] transition"
                                >
                                    <Save size={14} />
                                    <span>Save All Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfessionalProfile
