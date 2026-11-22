import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Stethoscope,
    ShieldCheck,
    Clock,
    Award,
    Briefcase,
    Building2,
    MapPin,
    Star,
    PlusCircle,
    Edit3,
    Share2,
    CheckCircle2,
    Mail,
    Phone,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export function ProfessionalProfileHeader({ professional, onEditProfile, postCount = 0, ratingSummary = null }) {
    const navigate = useNavigate()

    const displayName = professional?.fullName || professional?.name || 'Healthcare Professional'
    const profession = professional?.profession || 'Doctor / Medical Practitioner'
    const specialization = professional?.specialization || 'Clinical Wellness'
    const bio = professional?.bio || 'Clinical practitioner dedicated to evidence-based healthcare and preventive wellness.'
    const qualifications = professional?.qualifications || 'MBBS, MD'
    const experience = professional?.yearsExperience ? `${professional.yearsExperience} Years Exp.` : 'Experience Verified'
    const license = professional?.licenseNumber || 'State Medical Council / Board Registered'
    const workplace = professional?.workplaceName || 'Private Clinical Practice'
    const location = [professional?.city, professional?.state].filter(Boolean).join(', ') || 'India'
    const verificationStatus = professional?.verificationStatus || 'Pending Verification'
    const isVerified = verificationStatus === 'Verified'

    const avgRating = ratingSummary?.avg || 0
    const totalReviews = ratingSummary?.total || 0

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href)
            toast.success('Professional profile link copied!')
        } else {
            toast('Practice link ready to share.')
        }
    }

    return (
        <section className="overflow-hidden rounded-3xl border border-[#E8EFEB] bg-white shadow-xs">
            {/* Top Credibility Header Card */}
            <div className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row items-start gap-6">

                    {/* Profile Photograph with Verified Ring */}
                    <div className="relative shrink-0">
                        <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-4 border-white shadow-md ring-2 ring-[#033135]/15 bg-[#E4F0EA]">
                            {professional?.photoUrl ? (
                                <img
                                    src={professional.photoUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#033135]">
                                    <Stethoscope size={44} />
                                </div>
                            )}
                        </div>

                        {/* Verified Status Badge attached to Avatar */}
                        <div
                            className={`absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm ${
                                isVerified ? 'bg-[#2F7B58] text-white' : 'bg-[#F8E7A5] text-[#8B6D25]'
                            }`}
                            title={verificationStatus}
                        >
                            {isVerified ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        </div>
                    </div>

                    {/* Details and Action Row */}
                    <div className="flex-1 min-w-0 w-full">
                        {/* Name, Status, and Actions Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1
                                        className="text-2xl sm:text-3xl font-bold text-[#033135]"
                                        style={{ fontFamily: SERIF, letterSpacing: '-0.01em' }}
                                    >
                                        {displayName}
                                    </h1>

                                    {/* Credibility Status Pill */}
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                            isVerified
                                                ? 'bg-[#E4F0EA] text-[#2F7B58]'
                                                : 'bg-[#F8E7A5]/80 text-[#8B6D25]'
                                        }`}
                                    >
                                        {isVerified ? (
                                            <>
                                                <ShieldCheck size={13} /> Verified Practitioner
                                            </>
                                        ) : (
                                            <>
                                                <Clock size={13} /> Pending Verification
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Profession & Specialization */}
                                <p className="mt-1 text-sm font-semibold text-[#324C4D]">
                                    {profession} · <span className="text-[#648C83]">{specialization}</span>
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                                <button
                                    type="button"
                                    onClick={() => navigate('/professional/content/create')}
                                    className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#324C4D] active:scale-[0.99]"
                                >
                                    <PlusCircle size={15} />
                                    <span>Create Content</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={onEditProfile}
                                    className="flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-2 text-xs font-semibold text-[#033135] shadow-xs hover:bg-[#E4F0EA] transition"
                                >
                                    <Edit3 size={14} />
                                    <span>Edit Profile</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="flex items-center justify-center rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] p-2 text-[#647572] hover:bg-[#E4F0EA] hover:text-[#033135] transition"
                                    title="Share Profile Link"
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* About / Professional Bio */}
                        <div className="mt-4">
                            <p className="text-xs sm:text-sm text-[#324C4D] leading-relaxed max-w-3xl whitespace-pre-line">
                                {bio}
                            </p>
                        </div>

                        {/* Credibility Badges & Metrics Row */}
                        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-[#E8EFEB]">
                            {/* Qualifications */}
                            <div className="flex items-center gap-2 rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-2.5">
                                <Award size={18} className="shrink-0 text-[#648C83]" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-[#9AA6A0] uppercase font-bold">Degrees</p>
                                    <p className="text-xs font-bold text-[#033135] truncate">{qualifications}</p>
                                </div>
                            </div>

                            {/* Experience */}
                            <div className="flex items-center gap-2 rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-2.5">
                                <Briefcase size={18} className="shrink-0 text-[#648C83]" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-[#9AA6A0] uppercase font-bold">Experience</p>
                                    <p className="text-xs font-bold text-[#033135] truncate">{experience}</p>
                                </div>
                            </div>

                            {/* Registration / License */}
                            <div className="flex items-center gap-2 rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-2.5">
                                <ShieldCheck size={18} className="shrink-0 text-[#648C83]" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-[#9AA6A0] uppercase font-bold">License / Reg</p>
                                    <p className="text-xs font-bold text-[#033135] truncate">{license}</p>
                                </div>
                            </div>

                            {/* Rating and Reviews */}
                            <div className="flex items-center gap-2 rounded-xl bg-[#F8E7A5]/30 border border-[#F8E7A5] p-2.5">
                                <Star size={18} className="shrink-0 text-[#8B6D25]" fill="#E0AE3A" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-[#8B6D25] uppercase font-bold">Patient Rating</p>
                                    <p className="text-xs font-black text-[#033135] truncate">
                                        {totalReviews > 0 ? (
                                            <>
                                                {avgRating.toFixed(1)} ★ <span className="text-[10px] font-normal text-[#647572]">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
                                            </>
                                        ) : (
                                            <>
                                                No reviews <span className="text-[10px] font-normal text-[#647572]">(0)</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Workplace and Location Banner */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#647572]">
                            <span className="flex items-center gap-1.5 font-medium text-[#033135]">
                                <Building2 size={14} className="text-[#648C83]" />
                                {workplace}
                            </span>
                            <span className="flex items-center gap-1 text-[#647572]">
                                <MapPin size={14} className="text-[#9AA6A0]" />
                                {location}
                            </span>
                            <span className="text-[#648C83] font-semibold">
                                • {postCount} Educational Posts Published
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ProfessionalProfileHeader
