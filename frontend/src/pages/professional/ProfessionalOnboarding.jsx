import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Clock,
    Upload,
    FileText,
    Trash2,
    User,
    Stethoscope,
    Building2,
    ShieldCheck,
    Sparkles,
    Phone,
    MapPin,
    Award,
    Briefcase,
    IndianRupee,
    CreditCard,
    Lock,
    Copy,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentProfessional } from '../../services/professional/professionalAuthService.js'
import {
    getDraftOnboarding,
    saveDraftOnboarding,
    completeOnboarding,
    simulateDocumentUpload,
    isOnboardingCompleted,
} from '../../services/professional/professionalProfileService.js'
import {
    saveConsultationSettings,
    DEFAULT_SCHEDULE,
    DAYS_OF_WEEK,
    DURATION_OPTIONS,
    BUFFER_OPTIONS,
    MIN_CONSULTATION_FEE,
} from '../../services/professional/professionalConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const PROFESSIONS = [
    'Doctor / Medical Practitioner',
    'Nutritionist / Clinical Dietitian',
    'Physiotherapist / Physical Therapist',
    'Fitness Coach / Personal Trainer',
    'Mental Wellness / Psychologist',
    'Yoga & Mindfulness Instructor',
    'Ayurveda / Holistic Practitioner',
    'Other Healthcare Professional',
]

const AVATAR_OPTIONS = [
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1594824813512-850d9953a8f4?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
]

const TIME_OPTIONS = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

const inputClass =
    'w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-4 py-3 outline-none transition placeholder:text-[#9AA6A0] focus:border-[#648C83] focus:bg-white focus:ring-2 focus:ring-[#E4F0EA]'

function Wordmark() {
    return (
        <span
            className="flex items-end text-xl leading-none text-[#033135]"
            style={{ fontFamily: SERIF, letterSpacing: '0.04em' }}
        >
            FITKEY
            <span className="mb-[0.2em] ml-[0.08em] h-[0.2em] w-[0.2em] rounded-full bg-[#E0AE3A]" />
            <span className="ml-2 mb-[0.1em] rounded-md bg-[#033135] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#F8E7A5]">
                PRO
            </span>
        </span>
    )
}

function ProfessionalOnboarding() {
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [professional, setProfessional] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        // Step 1: Personal
        fullName: '',
        photoUrl: '',
        phone: '',
        bio: '',

        // Step 2: Professional
        profession: '',
        specialization: '',
        qualifications: '',
        yearsExperience: '',
        licenseNumber: '',

        // Step 3: Workplace
        workplaceName: '',
        workplaceAddress: '',
        city: '',
        state: '',
        clinicPhotoUrl: '',

        // Step 4: Consultations Opt-in & Preferences
        offerConsultations: 'yes', // 'yes' or 'no'
        consultationFee: 500,
        durationMinutes: 20,
        bufferMinutes: 5,
        consultationPhone: '',
        phoneConsent: true,
        schedule: DEFAULT_SCHEDULE,
        payoutMethod: 'upi',
        payoutUpi: '',
        payoutBankHolder: '',
        payoutBankName: '',
        payoutBankAccount: '',
        payoutBankIfsc: '',

        // Step 5: Documents
        documents: [],
    })

    // Load initial data and restore drafts
    useEffect(() => {
        const prof = getCurrentProfessional()
        if (!prof) {
            toast.error('Please log in or register first.')
            navigate('/professional/login')
            return
        }

        if (isOnboardingCompleted(prof.id)) {
            navigate('/professional/home')
            return
        }

        setProfessional(prof)

        const draft = getDraftOnboarding(prof.id)
        if (draft) {
            setFormData((prev) => ({
                ...prev,
                ...draft,
                fullName: draft.fullName || prof.name || '',
                consultationPhone: draft.consultationPhone || draft.phone || '',
            }))
        } else {
            setFormData((prev) => ({
                ...prev,
                fullName: prof.name || '',
            }))
        }
    }, [navigate])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        const val = type === 'checkbox' ? checked : value
        const updated = { ...formData, [name]: val }
        setFormData(updated)

        if (professional) {
            saveDraftOnboarding(professional.id, updated)
        }
    }

    const handleToggleScheduleDay = (dayKey) => {
        setFormData((prev) => {
            const currentSchedule = prev.schedule || DEFAULT_SCHEDULE
            const updated = {
                ...prev,
                schedule: {
                    ...currentSchedule,
                    [dayKey]: {
                        ...currentSchedule[dayKey],
                        enabled: !currentSchedule[dayKey].enabled,
                    },
                },
            }
            if (professional) saveDraftOnboarding(professional.id, updated)
            return updated
        })
    }

    const handleScheduleTimeChange = (dayKey, field, val) => {
        setFormData((prev) => {
            const currentSchedule = prev.schedule || DEFAULT_SCHEDULE
            const updated = {
                ...prev,
                schedule: {
                    ...currentSchedule,
                    [dayKey]: {
                        ...currentSchedule[dayKey],
                        [field]: val,
                    },
                },
            }
            if (professional) saveDraftOnboarding(professional.id, updated)
            return updated
        })
    }

    const handleApplyFirstDayHoursToAll = () => {
        const sched = formData.schedule || DEFAULT_SCHEDULE
        const firstDay = DAYS_OF_WEEK.find((d) => sched[d.key]?.enabled)?.key || 'monday'
        const template = sched[firstDay]
        if (!template) return

        const updatedSched = {}
        DAYS_OF_WEEK.forEach((d) => {
            updatedSched[d.key] = {
                ...sched[d.key],
                startTime: template.startTime,
                endTime: template.endTime,
            }
        })

        const updated = { ...formData, schedule: updatedSched }
        setFormData(updated)
        if (professional) saveDraftOnboarding(professional.id, updated)
        toast.success(`Copied hours (${template.startTime} - ${template.endTime}) to all days`)
    }

    // Add simulated document upload
    const handleAddDocument = (docName, docSize, docType) => {
        if (!professional) return
        const newDoc = simulateDocumentUpload(professional.id, {
            name: docName,
            size: docSize,
            type: docType,
        })
        const updatedDocs = [...formData.documents, newDoc]
        const updated = { ...formData, documents: updatedDocs }
        setFormData(updated)
        saveDraftOnboarding(professional.id, updated)
        toast.success(`Attached "${docName}"`)
    }

    const handleRemoveDocument = (docId) => {
        const updatedDocs = formData.documents.filter((d) => d.id !== docId)
        const updated = { ...formData, documents: updatedDocs }
        setFormData(updated)
        if (professional) {
            saveDraftOnboarding(professional.id, updated)
        }
    }

    // Step validation
    const validateStep = (step) => {
        if (step === 1) {
            if (!formData.fullName.trim()) {
                toast.error('Please provide your full name.')
                return false
            }
            if (!formData.phone.trim()) {
                toast.error('Please provide your contact phone number.')
                return false
            }
            if (!formData.bio.trim()) {
                toast.error('Please add a short professional bio.')
                return false
            }
            // Auto fill consultation phone if empty
            if (!formData.consultationPhone) {
                setFormData((prev) => ({ ...prev, consultationPhone: formData.phone }))
            }
            return true
        }

        if (step === 2) {
            if (!formData.profession) {
                toast.error('Please select your profession / category.')
                return false
            }
            if (!formData.specialization.trim()) {
                toast.error('Please specify your specialization.')
                return false
            }
            if (!formData.qualifications.trim()) {
                toast.error('Please specify your qualifications / degrees.')
                return false
            }
            if (!formData.yearsExperience) {
                toast.error('Please indicate years of clinical / professional experience.')
                return false
            }
            return true
        }

        if (step === 3) {
            if (!formData.workplaceName.trim()) {
                toast.error('Please provide your clinic, hospital, or organization name.')
                return false
            }
            if (!formData.city.trim() || !formData.state.trim()) {
                toast.error('Please provide your city and state.')
                return false
            }
            return true
        }

        if (step === 4) {
            // Consultation Step
            if (formData.offerConsultations === 'no') {
                return true // Skipped
            }

            if (Number(formData.consultationFee) < MIN_CONSULTATION_FEE) {
                toast.error(`Minimum consultation fee is ₹${MIN_CONSULTATION_FEE}.`)
                return false
            }

            const phone = formData.consultationPhone || formData.phone
            if (!phone.trim()) {
                toast.error('Please provide a contact phone number for receiving consultation calls.')
                return false
            }

            if (!formData.phoneConsent) {
                toast.error('Please accept the consultation calling agreement checkbox.')
                return false
            }

            if (formData.payoutMethod === 'upi') {
                if (formData.payoutUpi.trim() && !formData.payoutUpi.includes('@')) {
                    toast.error('Please enter a valid UPI ID (e.g. name@upi).')
                    return false
                }
            }

            return true
        }

        if (step === 5) {
            if (formData.documents.length === 0) {
                toast.error('Please upload at least one qualification or registration document.')
                return false
            }
            return true
        }

        return true
    }

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleFinalSubmit = () => {
        if (!professional) return
        const res = completeOnboarding(professional.id, formData)
        if (res.success) {
            // Save consultation settings persistently
            saveConsultationSettings(professional.id, {
                isEnabled: formData.offerConsultations === 'yes',
                consultationFee: Number(formData.consultationFee) || 500,
                durationMinutes: Number(formData.durationMinutes) || 20,
                bufferMinutes: Number(formData.bufferMinutes) || 5,
                contactPhone: formData.consultationPhone || formData.phone,
                phoneConsent: formData.phoneConsent,
                schedule: formData.schedule || DEFAULT_SCHEDULE,
                payoutDetails: {
                    method: formData.payoutMethod || 'upi',
                    upiId: formData.payoutUpi || '',
                    accountHolderName: formData.payoutBankHolder || '',
                    bankName: formData.payoutBankName || '',
                    accountNumber: formData.payoutBankAccount || '',
                    ifscCode: formData.payoutBankIfsc || '',
                },
            })
            setCurrentStep(6) // Completion screen
        } else {
            toast.error(res.error || 'Failed to complete onboarding.')
        }
    }

    const steps = [
        { id: 1, label: 'Personal', icon: User },
        { id: 2, label: 'Professional', icon: Stethoscope },
        { id: 3, label: 'Workplace', icon: Building2 },
        { id: 4, label: 'Consultations', icon: Phone },
        { id: 5, label: 'Verification', icon: ShieldCheck },
    ]

    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAF7]">
            {/* Top Navigation */}
            <header className="border-b border-[#E8EFEB] bg-white px-6 py-4 md:px-12">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <Wordmark />

                    <div className="flex items-center gap-2 text-xs font-semibold text-[#647572]">
                        <span>Step {Math.min(currentStep, 5)} of 5</span>
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-[#E8EFEB]">
                            <div
                                className="h-full bg-[#033135] transition-all duration-300"
                                style={{ width: `${Math.min(100, (currentStep / 5) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Stepper Navigation (hidden on step 6) */}
            {currentStep < 6 && (
                <div className="border-b border-[#E8EFEB] bg-[#FAFBF9] px-4 py-3">
                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 sm:gap-2">
                        {steps.map((s) => {
                            const Icon = s.icon
                            const isCurrent = currentStep === s.id
                            const isDone = currentStep > s.id
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        if (isDone) setCurrentStep(s.id)
                                    }}
                                    disabled={!isDone && !isCurrent}
                                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-center transition ${isCurrent
                                        ? 'bg-[#033135] text-white shadow-xs'
                                        : isDone
                                            ? 'bg-[#E4F0EA] text-[#033135] hover:bg-[#D4E8DF]'
                                            : 'text-[#9AA6A0]'
                                        }`}
                                >
                                    {isDone ? (
                                        <CheckCircle2 size={15} className="shrink-0 text-[#2F7B58]" />
                                    ) : (
                                        <Icon size={15} className="shrink-0" />
                                    )}
                                    <span className="hidden text-xs font-semibold sm:inline">{s.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Wizard Body */}
            <main className="flex flex-1 justify-center px-4 py-8">
                <div className="w-full max-w-2xl">

                    {/* STEP 1: Personal Information */}
                    {currentStep === 1 && (
                        <section className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#648C83]">
                                    Section 01 / 05
                                </span>
                                <h2
                                    className="mt-1 text-2xl font-bold text-[#033135] sm:text-3xl"
                                    style={{ fontFamily: SERIF }}
                                >
                                    Personal Information
                                </h2>
                                <p className="mt-1 text-sm text-[#647572]">
                                    How clients and colleagues will identify and connect with you.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4 sm:p-6">
                                {/* Full Name */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Full Name & Professional Title *
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Dr. Priya Nair, MD or Rahul Sharma, PT"
                                        className={inputClass}
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Contact Phone Number *
                                    </label>
                                    <div className="relative">
                                        <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="+91 98765 43210"
                                            className={`${inputClass} pl-10`}
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-[#9AA6A0]">
                                        Used for credential verification and practice notifications.
                                    </p>
                                </div>

                                {/* Profile Photo Selection / Preview */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Profile Photograph
                                    </label>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#DCE7E3] bg-[#F8FAF7]">
                                            {formData.photoUrl ? (
                                                <img
                                                    src={formData.photoUrl}
                                                    alt="Profile preview"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <User size={28} className="text-[#9AA6A0]" />
                                            )}
                                        </div>

                                        <div className="space-y-1.5 flex-1">
                                            <p className="text-xs text-[#647572]">
                                                Choose an avatar or enter a profile image URL:
                                            </p>
                                            <div className="flex gap-2">
                                                {AVATAR_OPTIONS.map((imgUrl, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev) => ({ ...prev, photoUrl: imgUrl }))
                                                            if (professional) saveDraftOnboarding(professional.id, { photoUrl: imgUrl })
                                                        }}
                                                        className={`h-9 w-9 overflow-hidden rounded-full border-2 transition ${formData.photoUrl === imgUrl
                                                            ? 'border-[#033135] ring-2 ring-[#033135]/20'
                                                            : 'border-transparent opacity-70 hover:opacity-100'
                                                            }`}
                                                    >
                                                        <img src={imgUrl} alt={`Avatar ${idx + 1}`} className="h-full w-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="url"
                                                name="photoUrl"
                                                value={formData.photoUrl}
                                                onChange={handleInputChange}
                                                placeholder="Or paste image URL (https://...)"
                                                className="mt-1 w-full rounded-lg border border-[#DCE7E3] bg-[#F8FAF7] px-3 py-1.5 text-xs outline-none focus:border-[#648C83]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Short Professional Bio *
                                    </label>
                                    <textarea
                                        name="bio"
                                        rows={3}
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        placeholder="Briefly describe your clinical focus, philosophy, and background..."
                                        className={inputClass}
                                    />
                                    <p className="mt-1 text-[11px] text-[#9AA6A0]">
                                        Suggested 2–3 sentences highlighting your healthcare philosophy.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* STEP 2: Professional Information */}
                    {currentStep === 2 && (
                        <section className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#648C83]">
                                    Section 02 / 05
                                </span>
                                <h2
                                    className="mt-1 text-2xl font-bold text-[#033135] sm:text-3xl"
                                    style={{ fontFamily: SERIF }}
                                >
                                    Professional Credentials
                                </h2>
                                <p className="mt-1 text-sm text-[#647572]">
                                    Your professional license, degree qualifications, and areas of expertise.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4 sm:p-6">
                                {/* Profession Category */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Primary Category / Profession *
                                    </label>
                                    <select
                                        name="profession"
                                        value={formData.profession}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                    >
                                        <option value="">Select your profession</option>
                                        {PROFESSIONS.map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Specialization */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Clinical Specialization / Focus Area *
                                    </label>
                                    <input
                                        type="text"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Sports Physiotherapy, Pediatric Nutrition, Diabetes Reversal"
                                        className={inputClass}
                                    />
                                </div>

                                {/* Qualifications & Degrees */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Qualifications & Degrees *
                                    </label>
                                    <div className="relative">
                                        <Award size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                                        <input
                                            type="text"
                                            name="qualifications"
                                            value={formData.qualifications}
                                            onChange={handleInputChange}
                                            placeholder="e.g. MBBS, MD (General Medicine), ACE Certified"
                                            className={`${inputClass} pl-10`}
                                        />
                                    </div>
                                </div>

                                {/* Experience & License (2 columns) */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            Years of Experience *
                                        </label>
                                        <div className="relative">
                                            <Briefcase size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                name="yearsExperience"
                                                value={formData.yearsExperience}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 8"
                                                className={`${inputClass} pl-10`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            Registration / License Number
                                        </label>
                                        <input
                                            type="text"
                                            name="licenseNumber"
                                            value={formData.licenseNumber}
                                            onChange={handleInputChange}
                                            placeholder="e.g. MCI-2015-11234 or N/A"
                                            className={inputClass}
                                        />
                                        <p className="mt-1 text-[10px] text-[#9AA6A0]">
                                            Medical council or certifying body ID
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* STEP 3: Workplace Information */}
                    {currentStep === 3 && (
                        <section className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#648C83]">
                                    Section 03 / 05
                                </span>
                                <h2
                                    className="mt-1 text-2xl font-bold text-[#033135] sm:text-3xl"
                                    style={{ fontFamily: SERIF }}
                                >
                                    Workplace & Practice Details
                                </h2>
                                <p className="mt-1 text-sm text-[#647572]">
                                    Where you practice or consult with patients and clients.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4 sm:p-6">
                                {/* Clinic / Hospital / Org Name */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Clinic / Hospital / Organization Name *
                                    </label>
                                    <div className="relative">
                                        <Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                                        <input
                                            type="text"
                                            name="workplaceName"
                                            value={formData.workplaceName}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Apollo Wellness Clinic, Fortis Healthcare, or Private Practice"
                                            className={`${inputClass} pl-10`}
                                        />
                                    </div>
                                </div>

                                {/* Workplace Address */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Practice Address & Location
                                    </label>
                                    <div className="relative">
                                        <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                                        <input
                                            type="text"
                                            name="workplaceAddress"
                                            value={formData.workplaceAddress}
                                            onChange={handleInputChange}
                                            placeholder="Suite 402, Medical Enclave, MG Road"
                                            className={`${inputClass} pl-10`}
                                        />
                                    </div>
                                </div>

                                {/* City and State */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            City *
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Mumbai, Bengaluru, Delhi"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                            State / Province *
                                        </label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Maharashtra, Karnataka"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {/* Optional Workplace Photo URL */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Workplace / Clinic Photograph (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        name="clinicPhotoUrl"
                                        value={formData.clinicPhotoUrl}
                                        onChange={handleInputChange}
                                        placeholder="Image URL for clinic or consultation room (https://...)"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* STEP 4: Consultation Preferences (New Module) */}
                    {currentStep === 4 && (
                        <section className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#648C83]">
                                    Section 04 / 05
                                </span>
                                <h2
                                    className="mt-1 text-2xl font-bold text-[#033135] sm:text-3xl"
                                    style={{ fontFamily: SERIF }}
                                >
                                    Offer Consultations on FitKey
                                </h2>
                                <p className="mt-1 text-sm text-[#647572]">
                                    Would you like to offer 1-on-1 scheduled phone consultations to FitKey members?
                                </p>
                            </div>

                            {/* Opt-in choice cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, offerConsultations: 'yes' })}
                                    className={`flex flex-col items-start rounded-2xl border p-5 text-left transition ${formData.offerConsultations === 'yes'
                                        ? 'border-[#033135] bg-[#E4F0EA]/50 ring-2 ring-[#033135]/20 shadow-xs'
                                        : 'border-[#E8EFEB] bg-white hover:bg-[#FAFBF9]'
                                        }`}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#033135] text-white">
                                        <Phone size={18} />
                                    </div>
                                    <h3 className="mt-3 text-sm font-bold text-[#033135]">
                                        Yes, I want to offer consultations
                                    </h3>
                                    <p className="mt-1 text-xs text-[#647572] leading-relaxed">
                                        Set your consultation fee, working hours, and conduct private phone consultations with verified members.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, offerConsultations: 'no' })}
                                    className={`flex flex-col items-start rounded-2xl border p-5 text-left transition ${formData.offerConsultations === 'no'
                                        ? 'border-[#033135] bg-[#FAFBF9] ring-2 ring-[#033135]/20 shadow-xs'
                                        : 'border-[#E8EFEB] bg-white hover:bg-[#FAFBF9]'
                                        }`}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8EFEB] text-[#647572]">
                                        <Clock size={18} />
                                    </div>
                                    <h3 className="mt-3 text-sm font-bold text-[#033135]">
                                        Not right now
                                    </h3>
                                    <p className="mt-1 text-xs text-[#647572] leading-relaxed">
                                        Skip consultation setup for now. You can activate consultations anytime from your profile or sidebar.
                                    </p>
                                </button>
                            </div>

                            {formData.offerConsultations === 'no' ? (
                                <div className="rounded-2xl border border-[#DCE7E3] bg-white p-6 text-center text-xs text-[#647572]">
                                    <p className="font-semibold text-[#033135]">
                                        Consultations disabled for now.
                                    </p>
                                    <p className="mt-1">
                                        Click "Continue" to proceed to Credential Verification and finish your registration.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* 1. Format banner */}
                                    <div className="rounded-2xl border border-[#DCE7E3] bg-[#E4F0EA]/40 p-4 text-xs text-[#033135] flex items-start gap-3">
                                        <Phone size={18} className="shrink-0 text-[#2F7B58] mt-0.5" />
                                        <div>
                                            <p className="font-bold">Supported Format: Scheduled Phone Consultations</p>
                                            <p className="text-[#324C4D] mt-0.5 leading-relaxed">
                                                FitKey automatically bridges consultation calls between you and the patient via an automated private telephony gateway. Neither side sees the other’s personal phone number.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Fee Setting */}
                                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                                Consultation Fee (INR) *
                                            </label>
                                            <span className="text-[11px] font-semibold text-[#2F7B58]">
                                                Min: ₹{MIN_CONSULTATION_FEE}
                                            </span>
                                        </div>

                                        <div className="relative">
                                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#647572]">
                                                ₹
                                            </span>
                                            <input
                                                type="number"
                                                min={MIN_CONSULTATION_FEE}
                                                step="50"
                                                name="consultationFee"
                                                value={formData.consultationFee}
                                                onChange={handleInputChange}
                                                className={`${inputClass} pl-9 font-bold text-base text-[#033135]`}
                                            />
                                        </div>

                                        <p className="text-[11px] text-[#647572]">
                                            ℹ️ FitKey platform fee: <strong>10%</strong>. For a ₹{formData.consultationFee} fee, you take home <strong>₹{Math.round(formData.consultationFee * 0.9)}</strong> net.
                                        </p>
                                    </div>

                                    {/* 3. Duration & Buffer */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4">
                                            <label className="block text-xs font-bold text-[#324C4D] mb-2">
                                                Slot Duration
                                            </label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {DURATION_OPTIONS.map((mins) => (
                                                    <button
                                                        key={mins}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, durationMinutes: mins })}
                                                        className={`rounded-xl border py-2.5 text-xs font-bold transition ${Number(formData.durationMinutes) === mins
                                                            ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                                            : 'border-[#E8EFEB] bg-white text-[#647572] hover:bg-[#FAFBF9]'
                                                            }`}
                                                    >
                                                        {mins} mins
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4">
                                            <label className="block text-xs font-bold text-[#324C4D] mb-2">
                                                Buffer Time Between Calls
                                            </label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {BUFFER_OPTIONS.map((mins) => (
                                                    <button
                                                        key={mins}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, bufferMinutes: mins })}
                                                        className={`rounded-xl border py-2.5 text-xs font-bold transition ${Number(formData.bufferMinutes) === mins
                                                            ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                                            : 'border-[#E8EFEB] bg-white text-[#647572] hover:bg-[#FAFBF9]'
                                                            }`}
                                                    >
                                                        {mins === 0 ? 'No buffer' : `${mins} mins`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Working Days & Daily Hours */}
                                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                                    Available Days & Calling Hours
                                                </h4>
                                                <p className="text-[11px] text-[#647572]">
                                                    Select days you are available to receive calls.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleApplyFirstDayHoursToAll}
                                                className="flex items-center gap-1 rounded-lg border border-[#DCE7E3] px-2.5 py-1 text-[11px] font-semibold text-[#033135] hover:bg-[#E4F0EA]"
                                            >
                                                <Copy size={12} />
                                                Apply Hours to All
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {DAYS_OF_WEEK.map((d) => {
                                                const daySched = formData.schedule?.[d.key] || {
                                                    enabled: false,
                                                    startTime: '09:00',
                                                    endTime: '17:00',
                                                }
                                                return (
                                                    <div
                                                        key={d.key}
                                                        className="flex items-center justify-between rounded-xl bg-[#FAFBF9] p-2.5 text-xs"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={daySched.enabled}
                                                                onChange={() => handleToggleScheduleDay(d.key)}
                                                                className="h-4 w-4 rounded accent-[#033135]"
                                                            />
                                                            <span className="font-semibold text-[#033135] w-24">
                                                                {d.label}
                                                            </span>
                                                        </div>

                                                        {daySched.enabled ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <select
                                                                    value={daySched.startTime}
                                                                    onChange={(e) => handleScheduleTimeChange(d.key, 'startTime', e.target.value)}
                                                                    className="rounded-lg border border-[#DCE7E3] bg-white px-2 py-1 text-[11px] font-semibold text-[#033135]"
                                                                >
                                                                    {TIME_OPTIONS.map((t) => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                                <span className="text-[#9AA6A0]">-</span>
                                                                <select
                                                                    value={daySched.endTime}
                                                                    onChange={(e) => handleScheduleTimeChange(d.key, 'endTime', e.target.value)}
                                                                    className="rounded-lg border border-[#DCE7E3] bg-white px-2 py-1 text-[11px] font-semibold text-[#033135]"
                                                                >
                                                                    {TIME_OPTIONS.map((t) => (
                                                                        <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-[#9AA6A0] italic">
                                                                Off day
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* 5. Contact Phone & Consent */}
                                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[#324C4D] mb-1">
                                                Phone Number for Consultations *
                                            </label>
                                            <div className="relative">
                                                <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                                                <input
                                                    type="tel"
                                                    name="consultationPhone"
                                                    value={formData.consultationPhone || formData.phone}
                                                    onChange={handleInputChange}
                                                    placeholder="+91 98765 43210"
                                                    className={`${inputClass} pl-10`}
                                                />
                                            </div>
                                            <p className="mt-1 text-[11px] text-[#647572]">
                                                🔒 Privacy note: This number is used strictly for bridging calls and is <strong>never displayed publicly</strong> to patients.
                                            </p>
                                        </div>

                                        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#324C4D] pt-1">
                                            <input
                                                type="checkbox"
                                                name="phoneConsent"
                                                checked={formData.phoneConsent}
                                                onChange={handleInputChange}
                                                className="mt-0.5 h-4 w-4 rounded accent-[#033135]"
                                            />
                                            <span>
                                                I agree to receive consultation calls on this number during my specified available hours.
                                            </span>
                                        </label>
                                    </div>

                                    {/* 6. Payout Information */}
                                    <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                                Payout & Disbursement Setup
                                            </h4>
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#2F7B58]">
                                                <Lock size={11} /> 100% Safe
                                            </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, payoutMethod: 'upi' })}
                                                className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${formData.payoutMethod === 'upi'
                                                    ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                                    : 'border-[#E8EFEB] text-[#647572]'
                                                    }`}
                                            >
                                                UPI ID
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, payoutMethod: 'bank' })}
                                                className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${formData.payoutMethod === 'bank'
                                                    ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                                    : 'border-[#E8EFEB] text-[#647572]'
                                                    }`}
                                            >
                                                Bank Account
                                            </button>
                                        </div>

                                        {formData.payoutMethod === 'upi' ? (
                                            <div>
                                                <label className="block text-xs font-semibold text-[#324C4D] mb-1">
                                                    UPI ID (e.g. name@upi)
                                                </label>
                                                <input
                                                    type="text"
                                                    name="payoutUpi"
                                                    value={formData.payoutUpi}
                                                    onChange={handleInputChange}
                                                    placeholder="doctor@oksbi or 9876543210@paytm"
                                                    className={inputClass}
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    name="payoutBankHolder"
                                                    value={formData.payoutBankHolder}
                                                    onChange={handleInputChange}
                                                    placeholder="Account Holder Name"
                                                    className={inputClass}
                                                />
                                                <input
                                                    type="text"
                                                    name="payoutBankName"
                                                    value={formData.payoutBankName}
                                                    onChange={handleInputChange}
                                                    placeholder="Bank Name (e.g. HDFC Bank)"
                                                    className={inputClass}
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        name="payoutBankAccount"
                                                        value={formData.payoutBankAccount}
                                                        onChange={handleInputChange}
                                                        placeholder="Account Number"
                                                        className={inputClass}
                                                    />
                                                    <input
                                                        type="text"
                                                        name="payoutBankIfsc"
                                                        value={formData.payoutBankIfsc}
                                                        onChange={handleInputChange}
                                                        placeholder="IFSC Code"
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-[11px] text-[#647572] bg-[#FAFBF9] p-3 rounded-xl border border-[#E8EFEB]">
                                            🛡️ <strong>Safety Guarantee:</strong> FitKey never asks for or stores your UPI PIN, online passwords, or debit card CVV. Details are used solely for depositing your consultation earnings.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* STEP 5: Verification & Documents */}
                    {currentStep === 5 && (
                        <section className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#648C83]">
                                    Section 05 / 05
                                </span>
                                <h2
                                    className="mt-1 text-2xl font-bold text-[#033135] sm:text-3xl"
                                    style={{ fontFamily: SERIF }}
                                >
                                    Credential Verification
                                </h2>
                                <p className="mt-1 text-sm text-[#647572]">
                                    Upload proof of medical degrees, certificates, or council registrations.
                                </p>
                            </div>

                            {/* Verification Status Alert */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-[#F8E7A5] bg-[#F8E7A5]/30 p-4">
                                <div className="flex items-start gap-3">
                                    <Clock size={20} className="shrink-0 text-[#8B6D25] mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-[#033135]">
                                            Verification Status: Pending Verification
                                        </h4>
                                        <p className="mt-0.5 text-xs text-[#7A6123]">
                                            For prototype demo purposes, credential verification is simulated. Submitted profiles automatically enter the "Pending Verification" review state.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleFinalSubmit}
                                    className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#324C4D] transition active:scale-[0.99]"
                                >
                                    <span>Move to Main Home Screen</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Document Upload Area */}
                            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4 sm:p-6">
                                <div className="border-2 border-dashed border-[#DCE7E3] rounded-2xl p-6 text-center bg-[#F8FAF7]">
                                    <Upload size={32} className="mx-auto text-[#648C83]" />
                                    <p className="mt-2 text-sm font-bold text-[#033135]">
                                        Upload Credentials & Registration Documents
                                    </p>
                                    <p className="mt-1 text-xs text-[#647572]">
                                        PDF, JPG, or PNG files up to 10MB
                                    </p>

                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleAddDocument('Medical_Council_Registration.pdf', '1.8 MB', 'license')}
                                            className="rounded-xl border border-[#C4D7D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#033135] shadow-xs hover:bg-[#E4F0EA]"
                                        >
                                            + Medical License (.pdf)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddDocument('Degree_Certificate_MBBS_MD.pdf', '2.5 MB', 'degree')}
                                            className="rounded-xl border border-[#C4D7D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#033135] shadow-xs hover:bg-[#E4F0EA]"
                                        >
                                            + Degree Certificate (.pdf)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddDocument('Experience_Letter_Hospital.pdf', '950 KB', 'experience')}
                                            className="rounded-xl border border-[#C4D7D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#033135] shadow-xs hover:bg-[#E4F0EA]"
                                        >
                                            + Experience Letter (.pdf)
                                        </button>
                                    </div>
                                </div>

                                {/* Uploaded list */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                        Attached Documents ({formData.documents.length})
                                    </h4>

                                    {formData.documents.length === 0 ? (
                                        <p className="mt-2 text-xs text-[#9AA6A0] italic">
                                            No documents attached yet. Click one of the quick upload buttons above to attach proof.
                                        </p>
                                    ) : (
                                        <div className="mt-2 space-y-2">
                                            {formData.documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between rounded-xl border border-[#E8EFEB] bg-[#FAFBF9] p-3 text-xs"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <FileText size={18} className="text-[#648C83]" />
                                                        <div>
                                                            <p className="font-bold text-[#033135]">{doc.name}</p>
                                                            <p className="text-[10px] text-[#647572]">
                                                                {doc.size} · Status: <span className="text-[#2F7B58] font-semibold">{doc.status}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveDocument(doc.id)}
                                                        className="text-[#9AA6A0] transition hover:text-[#C0563B]"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* STEP 6: Completion Screen */}
                    {currentStep === 6 && (
                        <section className="space-y-6 text-center">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#E4F0EA] text-[#033135] shadow-md">
                                <Sparkles size={36} className="text-[#8B6D25]" />
                            </div>

                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8E7A5]/80 px-3 py-1 text-xs font-bold text-[#8B6D25]">
                                    <Clock size={14} /> PENDING VERIFICATION
                                </span>
                                <h1
                                    className="mt-3 text-3xl font-bold text-[#033135] sm:text-4xl"
                                    style={{ fontFamily: SERIF }}
                                >
                                    Application Submitted!
                                </h1>
                                <p className="mx-auto mt-2 max-w-md text-sm text-[#647572]">
                                    Thank you, <strong>{formData.fullName}</strong>. Your professional credentials, workplace, and consultation preferences have been securely recorded.
                                </p>
                            </div>

                            {/* Summary Card */}
                            <div className="mx-auto max-w-md rounded-2xl border border-[#E8EFEB] bg-white p-5 text-left shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#647572]">
                                        Practice Profile
                                    </span>
                                    <span className="rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[11px] font-bold text-[#033135]">
                                        FitKey Pro
                                    </span>
                                </div>

                                <div className="mt-3 space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-[#647572]">Profession:</span>
                                        <span className="font-bold text-[#033135]">{formData.profession}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#647572]">Specialization:</span>
                                        <span className="font-bold text-[#033135]">{formData.specialization}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#647572]">Consultations:</span>
                                        <span className={`font-bold ${formData.offerConsultations === 'yes' ? 'text-[#2F7B58]' : 'text-[#647572]'}`}>
                                            {formData.offerConsultations === 'yes' ? `Enabled (₹${formData.consultationFee}/slot)` : 'Not active'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#647572]">Workplace:</span>
                                        <span className="font-bold text-[#033135]">{formData.workplaceName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#647572]">Location:</span>
                                        <span className="font-bold text-[#033135]">{formData.city}, {formData.state}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#647572]">Documents:</span>
                                        <span className="font-bold text-[#2F7B58]">{formData.documents.length} verified files</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/professional/home')}
                                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#033135] px-8 py-4 font-semibold text-white shadow-md transition hover:bg-[#324C4D] active:scale-[0.99]"
                                >
                                    <span>Enter Professional Home</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Step Navigation Controls (steps 1–5) */}
                    {currentStep < 6 && (
                        <div className="mt-8 flex items-center justify-between border-t border-[#E8EFEB] pt-5">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-white px-5 py-2.5 text-xs font-semibold text-[#033135] transition ${currentStep === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#E4F0EA]'
                                    }`}
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>

                            {currentStep < 5 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.99]"
                                >
                                    Continue
                                    <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleFinalSubmit}
                                    className="flex items-center gap-2 rounded-xl bg-[#2F7B58] px-7 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#256346] active:scale-[0.99]"
                                >
                                    <ShieldCheck size={16} />
                                    Submit Application
                                </button>
                            )}
                        </div>
                    )}

                </div>
            </main>
        </div>
    )
}

export default ProfessionalOnboarding
