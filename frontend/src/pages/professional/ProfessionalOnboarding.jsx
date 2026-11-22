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

        // Step 4: Documents
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

        // If already completed, redirect to home
        if (isOnboardingCompleted(prof.id)) {
            navigate('/professional/home')
            return
        }

        setProfessional(prof)

        // Check draft
        const draft = getDraftOnboarding(prof.id)
        if (draft) {
            setFormData((prev) => ({
                ...prev,
                ...draft,
                fullName: draft.fullName || prof.name || '',
            }))
        } else {
            setFormData((prev) => ({
                ...prev,
                fullName: prof.name || '',
            }))
        }
    }, [navigate])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        const updated = { ...formData, [name]: value }
        setFormData(updated)

        // Auto save draft
        if (professional) {
            saveDraftOnboarding(professional.id, updated)
        }
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
            setCurrentStep(5) // Completion screen
        } else {
            toast.error(res.error || 'Failed to complete onboarding.')
        }
    }

    const steps = [
        { id: 1, label: 'Personal', icon: User },
        { id: 2, label: 'Professional', icon: Stethoscope },
        { id: 3, label: 'Workplace', icon: Building2 },
        { id: 4, label: 'Verification', icon: ShieldCheck },
    ]

    return (
        <div className="flex min-h-screen flex-col bg-[#F8FAF7]">
            {/* Top Navigation */}
            <header className="border-b border-[#E8EFEB] bg-white px-6 py-4 md:px-12">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <Wordmark />

                    <div className="flex items-center gap-2 text-xs font-semibold text-[#647572]">
                        <span>Step {Math.min(currentStep, 4)} of 4</span>
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-[#E8EFEB]">
                            <div
                                className="h-full bg-[#033135] transition-all duration-300"
                                style={{ width: `${Math.min(100, (currentStep / 4) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Stepper Navigation (hidden on step 5) */}
            {currentStep < 5 && (
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
                                    Section 01 / 04
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
                                        Used for credential verification and direct practice notifications.
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
                                    Section 02 / 04
                                </span>
                                <h2
                                    className="mt-1 text-2xl font-bold text-[#033135] sm:text-3xl"
                                    style={{ fontFamily: SERIF }}
                                >
                                    Professional Credentials
                                </h2>
                                <p className="mt-1 text-sm text-[#647572]">
                                    Your healthcare domain, qualifications, and licensing details.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 space-y-4 sm:p-6">
                                {/* Category Dropdown */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Profession / Category *
                                    </label>
                                    <select
                                        name="profession"
                                        value={formData.profession}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                    >
                                        <option value="">Select your professional field...</option>
                                        {PROFESSIONS.map((prof) => (
                                            <option key={prof} value={prof}>
                                                {prof}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Specialization */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-[#324C4D]">
                                        Specialization / Clinical Focus *
                                    </label>
                                    <input
                                        type="text"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Preventive Cardiology, Sports Nutrition, Post-Operative Rehab"
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
                                    Section 03 / 04
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

                    {/* STEP 4: Verification & Documents */}
                    {currentStep === 4 && (
                        <section className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#648C83]">
                                    Section 04 / 04
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

                    {/* STEP 5: Completion Screen */}
                    {currentStep === 5 && (
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
                                    Thank you, <strong>{formData.fullName}</strong>. Your professional credentials and workplace details have been securely recorded.
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

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/professional/home')}
                                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#033135] px-8 py-4 font-semibold text-white shadow-md transition hover:bg-[#324C4D] active:scale-[0.99]"
                                >
                                    <span>Enter Professional Home</span>
                                    <ArrowRight size={18} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/home')}
                                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#C4D7D4] bg-white px-6 py-4 font-semibold text-[#033135] shadow-sm transition hover:bg-[#E4F0EA] active:scale-[0.99]"
                                >
                                    <span>Go to Main App Home</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Step Navigation Controls (steps 1–4) */}
                    {currentStep < 5 && (
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

                            {currentStep < 4 ? (
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
