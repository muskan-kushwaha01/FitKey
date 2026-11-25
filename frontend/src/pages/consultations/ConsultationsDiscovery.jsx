import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Search,
    BadgeCheck,
    Star,
    MapPin,
    Briefcase,
    Clock,
    Phone,
    Sparkles,
    CheckCircle2,
    ChevronRight,
    X,
    Stethoscope,
    SlidersHorizontal,
} from 'lucide-react'
import {
    getConsultationProfessionals,
    getRecommendedProfessionals,
    filterProfessionals,
} from '../../services/user/userConsultationService.js'
import AppointmentBookingModal from '../../components/consultations/AppointmentBookingModal.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchUserProfile } from '../../services/userProfileService.js'
import toast from 'react-hot-toast'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function ConsultationsDiscovery() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [allProfessionals, setAllProfessionals] = useState([])
    const [recommended, setRecommended] = useState([])
    const [loading, setLoading] = useState(true)

    // Search and Filter states
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLocation, setSelectedLocation] = useState('all')
    const [selectedFee, setSelectedFee] = useState('all')
    const [selectedRating, setSelectedRating] = useState(0)
    const [selectedAvailability, setSelectedAvailability] = useState('all')
    const [selectedSpecialization, setSelectedSpecialization] = useState('all')
    const [showFiltersModal, setShowFiltersModal] = useState(false)
    const [bookingProf, setBookingProf] = useState(null)
    const [userProfile, setUserProfile] = useState({})

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const [list, profileResult] = await Promise.all([
                    getConsultationProfessionals(),
                    user ? fetchUserProfile(user) : Promise.resolve({ success: false }),
                ])
                if (cancelled) return
                const profile = profileResult?.success ? {
                    goal: profileResult.data?.wellness?.primaryGoal || '',
                    city: profileResult.data?.personal?.city || '',
                } : {}
                setUserProfile(profile)
                setAllProfessionals(list)
                setRecommended(getRecommendedProfessionals(profile, list))
            } catch (err) {
                if (!cancelled) {
                    console.error('[ConsultationsDiscovery] Load error:', err)
                    toast.error(err?.message || 'Could not load practitioners.')
                    setAllProfessionals([])
                    setRecommended([])
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [user])

    // Filtered practitioners
    const filteredList = useMemo(() => {
        return filterProfessionals(allProfessionals, {
            searchQuery,
            location: selectedLocation,
            feeRange: selectedFee,
            ratingMin: selectedRating,
            availability: selectedAvailability,
            specialization: selectedSpecialization,
        })
    }, [
        allProfessionals,
        searchQuery,
        selectedLocation,
        selectedFee,
        selectedRating,
        selectedAvailability,
        selectedSpecialization,
    ])

    // Unique filter options
    const locations = useMemo(() => {
        const set = new Set(allProfessionals.map((p) => p.city).filter(Boolean))
        return ['all', ...Array.from(set)]
    }, [allProfessionals])

    const specializations = useMemo(() => {
        const set = new Set(allProfessionals.map((p) => p.specialization).filter(Boolean))
        return ['all', ...Array.from(set)]
    }, [allProfessionals])

    const activeFilterCount =
        (selectedLocation !== 'all' ? 1 : 0) +
        (selectedFee !== 'all' ? 1 : 0) +
        (selectedRating > 0 ? 1 : 0) +
        (selectedAvailability !== 'all' ? 1 : 0) +
        (selectedSpecialization !== 'all' ? 1 : 0)

    const handleResetFilters = () => {
        setSearchQuery('')
        setSelectedLocation('all')
        setSelectedFee('all')
        setSelectedRating(0)
        setSelectedAvailability('all')
        setSelectedSpecialization('all')
    }

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-6 sm:space-y-7 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <span className="text-xs font-semibold text-[#647572]">
                        Expert Telehealth Consultations
                    </span>
                    <h1
                        className="mt-1 text-2xl sm:text-3xl lg:text-4xl text-[#033135] font-normal"
                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                    >
                        Verified Healthcare Practitioners
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Consult with certified doctors, clinical nutritionists, and physical therapists via phone appointments.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Link
                        to="/consultation-history"
                        className="flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-white px-4 py-2.5 text-xs font-bold text-[#033135] hover:bg-[#E4F0EA] transition shadow-xs"
                    >
                        <Clock size={14} className="text-[#648C83]" />
                        <span>My Consultations</span>
                    </Link>
                </div>
            </div>

            {/* Search Bar & Quick Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA6A0]"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by doctor name, specialization (e.g. Cardiology, Nutrition), or clinic..."
                        className="w-full rounded-2xl border border-[#DCE7E3] bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#033135] placeholder:text-[#9AA6A0] outline-none focus:border-[#033135] shadow-xs"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filter Trigger Button */}
                <button
                    type="button"
                    onClick={() => setShowFiltersModal(true)}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition shadow-xs ${activeFilterCount > 0
                        ? 'border-[#033135] bg-[#033135] text-white'
                        : 'border-[#DCE7E3] bg-white text-[#033135] hover:bg-[#FAFBF9]'
                        }`}
                >
                    <SlidersHorizontal size={14} />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="rounded-full bg-[#F8E7A5] px-1.5 py-0.2 text-[10px] font-black text-[#033135]">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Quick Filter Chips (Specializations & Availability) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                    type="button"
                    onClick={() => setSelectedAvailability(selectedAvailability === 'today' ? 'all' : 'today')}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${selectedAvailability === 'today'
                        ? 'bg-[#2F7B58] text-white'
                        : 'bg-white border border-[#DCE7E3] text-[#324C4D] hover:bg-[#FAFBF9]'
                        }`}
                >
                    <CheckCircle2 size={12} />
                    <span>Available Today</span>
                </button>

                {locations.filter((l) => l !== 'all').map((loc) => (
                    <button
                        key={loc}
                        type="button"
                        onClick={() => setSelectedLocation(selectedLocation === loc ? 'all' : loc)}
                        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${selectedLocation === loc
                            ? 'bg-[#033135] text-white'
                            : 'bg-white border border-[#DCE7E3] text-[#647572] hover:bg-[#FAFBF9]'
                            }`}
                    >
                        <MapPin size={11} />
                        <span>{loc}</span>
                    </button>
                ))}

                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-[#C0563B] hover:underline px-2 whitespace-nowrap"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 1. RECOMMENDED FOR YOU (Based on User Health Profile & Goals)     */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {searchQuery === '' && activeFilterCount === 0 && recommended.length > 0 && (
                <section className="space-y-4">
                    <div className="rounded-3xl border border-[#DCE7E3] bg-gradient-to-r from-[#E4F0EA]/60 via-[#FAFBF9] to-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE7E3]">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#033135] text-[#F8E7A5]">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#033135]">
                                        Recommended for Your Wellness Focus
                                    </h2>
                                    <p className="text-[11px] text-[#647572]">
                                        {userProfile.goal ? `Matched to your wellness focus (${userProfile.goal}).` : 'Recommendations from verified practitioners available for booking.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recommendation Cards Carousel / Grid */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            {recommended.map((prof) => (
                                <div
                                    key={prof.id}
                                    onClick={() => navigate(`/professional/public/${prof.id}`)}
                                    className="group cursor-pointer rounded-2xl border border-[#DCE7E3] bg-white p-4 shadow-2xs transition hover:border-[#033135] hover:shadow-sm flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-start gap-3">
                                            <img
                                                src={prof.photoUrl}
                                                alt={prof.displayName}
                                                className="h-12 w-12 rounded-xl object-cover ring-1 ring-[#DCE7E3]"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1">
                                                    <h3 className="text-sm font-bold text-[#033135] truncate group-hover:text-[#2F7B58] transition">
                                                        {prof.displayName}
                                                    </h3>
                                                    <BadgeCheck size={14} className="text-[#6B5B95] shrink-0" />
                                                </div>
                                                <p className="text-xs text-[#647572] truncate">
                                                    {prof.specialization}
                                                </p>
                                                <p className="text-[10px] text-[#9AA6A0] truncate">
                                                    {prof.workplaceName} · {prof.city}
                                                </p>
                                            </div>
                                        </div>

                                        {prof.matchReason && (
                                            <div className="mt-3 rounded-lg bg-[#E4F0EA]/60 px-2 py-1 text-[10px] font-semibold text-[#033135]">
                                                🎯 {prof.matchReason}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3.5 pt-3 border-t border-[#F0F4F2] flex items-center justify-between">
                                        <div className="text-xs">
                                            <span className="font-bold text-[#033135]">₹{prof.consultation?.fee}</span>
                                            <span className="text-[10px] text-[#647572]"> / {prof.consultation?.durationMinutes}m call</span>
                                        </div>
                                        <span className="text-[11px] font-bold text-[#033135] flex items-center gap-1 group-hover:translate-x-0.5 transition">
                                            <span>View Profile</span>
                                            <ChevronRight size={13} />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 2. ALL VERIFIED PROFESSIONALS DIRECTORY                           */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold text-[#033135]">
                        Available Healthcare Professionals ({filteredList.length})
                    </h2>
                    {activeFilterCount > 0 && (
                        <span className="text-xs text-[#647572]">
                            Filtered results
                        </span>
                    )}
                </div>

                {filteredList.length === 0 ? (
                    <div className="rounded-3xl border border-[#E8EFEB] bg-white p-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAF7] text-[#9AA6A0]">
                            <Stethoscope size={28} />
                        </div>
                        <h3
                            className="mt-3 text-base font-bold text-[#033135]"
                            style={{ fontFamily: SERIF }}
                        >
                            No Practitioners Found
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-[#647572]">
                            We couldn&apos;t find any verified professionals matching your current search and filter criteria.
                        </p>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold text-white hover:bg-[#324C4D] transition"
                        >
                            Reset All Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredList.map((prof) => {
                            const isVerified = (prof.verificationStatus || '').toLowerCase().includes('verified')
                            const hasSlots = prof.consultation?.hasSlotsToday

                            return (
                                <div
                                    key={prof.id}
                                    className="group rounded-3xl border border-[#E8EFEB] bg-white p-5 shadow-xs transition hover:border-[#033135] hover:shadow-md flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Top Header: Photo, Name, Badge */}
                                        <div className="flex items-start gap-3.5">
                                            <img
                                                src={prof.photoUrl}
                                                alt={prof.displayName}
                                                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#E4F0EA]"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="text-sm font-bold text-[#033135] group-hover:text-[#2F7B58] transition">
                                                        {prof.displayName}
                                                    </h3>
                                                    {isVerified && (
                                                        <BadgeCheck size={16} className="text-[#6B5B95] shrink-0" />
                                                    )}
                                                </div>

                                                <p className="text-xs text-[#647572] font-medium mt-0.5">
                                                    {prof.profession}
                                                </p>
                                                <p className="text-xs font-bold text-[#324C4D]">
                                                    {prof.specialization}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Credentials & Details Strip */}
                                        <div className="mt-3.5 space-y-1.5 text-xs text-[#647572] border-t border-[#F0F4F2] pt-3">
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={13} className="text-[#648C83] shrink-0" />
                                                <span>{prof.yearsExperience} yrs experience · {prof.qualifications}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <MapPin size={13} className="text-[#648C83] shrink-0" />
                                                <span className="truncate">{prof.workplaceName}, {prof.city}</span>
                                            </div>

                                            <div className="flex items-center gap-3 pt-1">
                                                <div className="flex items-center gap-1 text-[#033135] font-bold">
                                                    <Star size={13} className="text-[#E0AE3A] fill-current" />
                                                    <span>{Number(prof.ratingSummary?.avg || 0).toFixed(1)}</span>
                                                    <span className="text-[11px] text-[#9AA6A0] font-normal">
                                                        ({prof.ratingSummary?.total || 0} reviews)
                                                    </span>
                                                </div>

                                                {hasSlots ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F7B58]">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-[#2F7B58]" />
                                                        Slots available today
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-[#9AA6A0]">
                                                        View dates to find available slots
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar: Fee & Consult CTA */}
                                    <div className="mt-4 pt-3.5 border-t border-[#E8EFEB] flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-[#647572]">Fee</span>
                                            <p className="text-base font-black text-[#033135]">
                                                ₹{prof.consultation?.fee}
                                                <span className="text-xs font-normal text-[#647572]"> / {prof.consultation?.durationMinutes}m</span>
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setBookingProf(prof)}
                                            className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold !text-white shadow-xs hover:bg-[#324C4D] transition"
                                            style={{ color: '#ffffff' }}
                                        >
                                            <Phone size={12} />
                                            <span>View slots</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* FILTERS MODAL                                                     */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {showFiltersModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal size={18} className="text-[#033135]" />
                                <h3 className="text-base font-bold text-[#033135]">
                                    Filter Professionals
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFiltersModal(false)}
                                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Location Filter */}
                        <div>
                            <label className="block text-xs font-bold text-[#033135] mb-1.5">Location</label>
                            <select
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-2 text-xs font-semibold text-[#033135] outline-none"
                            >
                                <option value="all">All Locations</option>
                                {locations.filter((l) => l !== 'all').map((loc) => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fee Range Filter */}
                        <div>
                            <label className="block text-xs font-bold text-[#033135] mb-1.5">Consultation Fee</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'all', label: 'Any Fee' },
                                    { id: 'under_500', label: 'Under ₹500' },
                                    { id: '500_1000', label: '₹500 – ₹1000' },
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setSelectedFee(f.id)}
                                        className={`rounded-xl border p-2 text-center text-xs font-bold transition ${selectedFee === f.id
                                            ? 'border-[#033135] bg-[#033135] text-white'
                                            : 'border-[#DCE7E3] bg-[#FAFBF9] text-[#647572]'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Minimum Star Rating */}
                        <div>
                            <label className="block text-xs font-bold text-[#033135] mb-1.5">Minimum Rating</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { val: 0, label: 'Any' },
                                    { val: 4.0, label: '4.0+ ★' },
                                    { val: 4.5, label: '4.5+ ★' },
                                    { val: 4.8, label: '4.8+ ★' },
                                ].map((r) => (
                                    <button
                                        key={r.val}
                                        type="button"
                                        onClick={() => setSelectedRating(r.val)}
                                        className={`rounded-xl border p-2 text-center text-xs font-bold transition ${selectedRating === r.val
                                            ? 'border-[#033135] bg-[#033135] text-white'
                                            : 'border-[#DCE7E3] bg-[#FAFBF9] text-[#647572]'
                                            }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Specialization Filter */}
                        <div>
                            <label className="block text-xs font-bold text-[#033135] mb-1.5">Specialization</label>
                            <select
                                value={selectedSpecialization}
                                onChange={(e) => setSelectedSpecialization(e.target.value)}
                                className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-2 text-xs font-semibold text-[#033135] outline-none"
                            >
                                <option value="all">All Specializations</option>
                                {specializations.filter((s) => s !== 'all').map((spec) => (
                                    <option key={spec} value={spec}>{spec}</option>
                                ))}
                            </select>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-5 flex items-center justify-between border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="text-xs font-bold text-[#C0563B] hover:underline"
                            >
                                Reset All
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowFiltersModal(false)}
                                className="rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold text-white hover:bg-[#324C4D] transition"
                            >
                                Apply Filters ({filteredList.length} Found)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Direct Booking Modal */}
            <AppointmentBookingModal
                professional={bookingProf}
                isOpen={Boolean(bookingProf)}
                onClose={() => setBookingProf(null)}
                onBookingSuccess={() => {
                    getConsultationProfessionals().then((list) => {
                        setAllProfessionals(list)
                        setRecommended(getRecommendedProfessionals(userProfile, list))
                    }).catch((err) => toast.error(err?.message || 'Could not refresh practitioners.'))
                }}
            />
        </div>
    )
}
