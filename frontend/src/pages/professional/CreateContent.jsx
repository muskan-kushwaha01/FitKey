import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { ContentComposer } from '../../components/professional/ContentComposer.jsx'
import { createPost } from '../../services/professional/professionalContentService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function CreateContent() {
    const navigate = useNavigate()
    const { professional } = useOutletContext() || {}

    const handleSubmit = (postData) => {
        if (!professional) {
            toast.error('Session expired. Please log in again.')
            navigate('/professional/login')
            return
        }

        const res = createPost({
            ...postData,
            authorId: professional.id,
            authorName: professional.fullName || professional.name || 'Verified Professional',
            authorSpecialty: professional.specialization || 'Clinical Specialist',
            authorPhoto: professional.photoUrl || '',
        })

        if (res.success) {
            toast.success(res.message)
            navigate('/professional/profile')
        } else {
            toast.error(res.error || 'Failed to publish post.')
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#647572] hover:text-[#033135] transition"
                >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B6D25]">
                    <Sparkles size={14} />
                    <span>Content Studio</span>
                </div>
            </div>

            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold text-[#033135]"
                    style={{ fontFamily: SERIF }}
                >
                    Create Clinical Content
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                    Publish educational articles, rehabilitation reels, or clinical topics for peer and patient learning.
                </p>
            </div>

            {/* Composer */}
            <ContentComposer
                onSubmit={handleSubmit}
                onCancel={() => navigate(-1)}
            />
        </div>
    )
}

export default CreateContent
