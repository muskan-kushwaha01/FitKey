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

const inputClass =
    'w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3.5 py-2.5 text-xs outline-none transition placeholder:text-[#9AA6A0] focus:border-[#648C83] focus:bg-white focus:ring-2 focus:ring-[#E4F0EA]'

const AVATARS = [
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1594824813512-850d9953a8f4?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
]

function ProfessionalProfile() {
    const navigate = useNavigate()
    const { professional, setProfessional } = useOutletContext() || {}
    const [posts, setPosts] = useState([])
    const [editModalOpen, setEditModalOpen] = useState(false)
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

    const loadPosts = useCallback(() => {
        if (!professional) return
        // Fetch posts created by this professional (or all demo posts if it's the demo account)
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
        setEditModalOpen(true)
    }

    const handleSaveEdit = (e) => {
        e.preventDefault()
        if (!professional) return

        if (!editForm.fullName.trim()) {
            toast.error('Name cannot be empty.')
            return
        }

        const res = updateProfessionalProfile(professional.id, editForm)
        if (res.success) {
            toast.success(res.message)
            if (setProfessional) setProfessional(res.professional)
            setEditModalOpen(false)
        } else {
            toast.error(res.error || 'Failed to update profile.')
        }
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
                        Patient &amp; Peer Reviews
                    </h2>
                    <p className="text-xs text-[#647572]">
                        Feedback and clinical ratings from community members.
                    </p>
                </div>

                <ProfessionalReviews
                    ratingSummary={ratingSummary}
                    reviews={reviews}
                    showTitle={false}
                />
            </section>

            {/* 4. Edit Profile Modal */}
            {editModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
                    onClick={() => setEditModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-xl rounded-3xl border border-[#E8EFEB] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#033135]">
                                    Edit Professional Practice Profile
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    Update your verified qualifications, clinic details, and bio.
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

                        {/* Modal Form */}
                        <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">

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
                                    <span>Save Profile</span>
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
