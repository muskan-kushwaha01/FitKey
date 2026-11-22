import { useState, useEffect } from 'react'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ContentComposer } from '../../components/professional/ContentComposer.jsx'
import { getPostById, updatePost } from '../../services/professional/professionalContentService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

function EditContent() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { professional } = useOutletContext() || {}
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const found = getPostById(id)
        if (!found) {
            toast.error('Post not found.')
            navigate('/professional/profile')
            return
        }

        // Security check: cannot edit another professional's post
        if (professional && found.authorId !== professional.id) {
            toast.error('Unauthorized: You can only edit your own content.')
            navigate('/professional/profile')
            return
        }

        setPost(found)
        setLoading(false)
    }, [id, professional, navigate])

    const handleSubmit = (updates) => {
        if (!professional) return
        const res = updatePost(id, professional.id, updates)
        if (res.success) {
            toast.success(res.message)
            navigate('/professional/profile')
        } else {
            toast.error(res.error || 'Failed to update post.')
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
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

                <div className="flex items-center gap-1.5 text-xs font-bold text-[#324C4D]">
                    <Edit2 size={14} />
                    <span>Edit Published Content</span>
                </div>
            </div>

            {/* Header */}
            <div>
                <h1
                    className="text-2xl sm:text-3xl font-bold text-[#033135]"
                    style={{ fontFamily: SERIF }}
                >
                    Edit Content
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                    Update your published {post.type} details and clinical guidance.
                </p>
            </div>

            {/* Composer in Edit Mode */}
            <ContentComposer
                initialData={post}
                isEdit={true}
                onSubmit={handleSubmit}
                onCancel={() => navigate(-1)}
            />
        </div>
    )
}

export default EditContent
