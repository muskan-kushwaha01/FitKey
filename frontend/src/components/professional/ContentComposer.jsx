import { useState, useEffect } from 'react'
import {
    FileText,
    Video,
    MessageSquare,
    Upload,
    Image,
    Sparkles,
    Eye,
    CheckCircle2,
    X,
    AlertCircle,
    Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CONTENT_CATEGORIES } from '../../data/contentCategories.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const inputClass =
    'w-full rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-4 py-3 text-xs sm:text-sm outline-none transition placeholder:text-[#9AA6A0] focus:border-[#648C83] focus:bg-white focus:ring-2 focus:ring-[#E4F0EA]'

const SAMPLE_COVERS = [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550572017-edb79984244b?w=800&auto=format&fit=crop&q=80',
]

const SAMPLE_REEL_VIDEOS = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
]

export function ContentComposer({
    initialData = null,
    isEdit = false,
    onSubmit,
    onCancel,
}) {
    const [type, setType] = useState(initialData?.type || 'article')
    const [title, setTitle] = useState(initialData?.title || '')
    const [category, setCategory] = useState(initialData?.category || CONTENT_CATEGORIES[0])
    const [description, setDescription] = useState(initialData?.description || '')
    const [body, setBody] = useState(initialData?.body || '')
    const [caption, setCaption] = useState(initialData?.caption || '')
    const [content, setContent] = useState(initialData?.content || '')
    const [coverImage, setCoverImage] = useState(initialData?.coverImage || '')
    const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '')
    const [coverImageFile, setCoverImageFile] = useState(null)
    const [videoFile, setVideoFile] = useState(null)
    const [showPreview, setShowPreview] = useState(false)

    const setCoverImageFromUrl = (url) => {
        setCoverImage(url)
        setCoverImageFile(null)
    }
    const setVideoUrlFromUrl = (url) => {
        setVideoUrl(url)
        setVideoFile(null)
    }

    useEffect(() => () => {
        if (coverImage.startsWith('blob:')) URL.revokeObjectURL(coverImage)
    }, [coverImage])
    useEffect(() => () => {
        if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl)
    }, [videoUrl])

    // Handle local file selection for image preview
    const handleImageFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const localUrl = URL.createObjectURL(file)
                if (coverImage.startsWith('blob:')) URL.revokeObjectURL(coverImage)
                setCoverImage(localUrl)
                setCoverImageFile(file)
                toast.success(`Image selected: ${file.name}`)
            } catch {
                toast.error('Unable to generate local preview.')
            }
        }
    }

    // Handle local file selection for video preview
    const handleVideoFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const localUrl = URL.createObjectURL(file)
                if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl)
                setVideoUrl(localUrl)
                setVideoFile(file)
                toast.success(`Video selected: ${file.name}`)
            } catch {
                toast.error('Unable to generate local video preview.')
            }
        }
    }

    const validate = () => {
        if (!category) {
            toast.error('Please select a healthcare category.')
            return false
        }

        if (type === 'article') {
            if (!title.trim()) {
                toast.error('Please enter an article title.')
                return false
            }
            if (!description.trim()) {
                toast.error('Please enter a short description/summary.')
                return false
            }
            if (!body.trim()) {
                toast.error('Please enter the article body text.')
                return false
            }
        } else if (type === 'reel') {
            if (!videoUrl.trim()) {
                toast.error('Please select or provide a video for the reel.')
                return false
            }
            if (!caption.trim()) {
                toast.error('Please provide a caption for your reel.')
                return false
            }
        } else if (type === 'discussion') {
            if (!content.trim()) {
                toast.error('Please enter your discussion topic or question.')
                return false
            }
        }

        return true
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validate()) return

        const postData = {
            type,
            title: type === 'article' ? title : type === 'reel' ? caption.slice(0, 80) : (title || content.slice(0, 80)),
            category,
            description,
            body,
            caption,
            content,
            coverImage: coverImage || (type === 'article' ? SAMPLE_COVERS[0] : ''),
            videoUrl,
            coverImageFile,
            videoFile,
        }

        if (onSubmit) onSubmit(postData)
    }

    return (
        <div className="space-y-6">
            {/* Type Switcher (only selectable during creation) */}
            {!isEdit && (
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#F0F4F2] p-1.5 border border-[#E8EFEB]">
                    {[
                        { id: 'article', label: 'Article', icon: FileText, desc: 'In-depth clinical guide' },
                        { id: 'reel', label: 'Reel', icon: Video, desc: 'Short video demonstration' },
                        { id: 'discussion', label: 'Discussion', icon: MessageSquare, desc: 'Clinical topic / Q&A' },
                    ].map((item) => {
                        const Icon = item.icon
                        const isSelected = type === item.id
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setType(item.id)}
                                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-3 px-2 text-center transition ${
                                    isSelected
                                        ? 'bg-white text-[#033135] shadow-xs font-bold'
                                        : 'text-[#647572] hover:text-[#033135]'
                                }`}
                            >
                                <Icon size={18} className={isSelected ? 'text-[#033135]' : 'text-[#647572]'} />
                                <span className="text-xs">{item.label}</span>
                                <span className="hidden sm:inline text-[10px] text-[#9AA6A0] font-normal">
                                    {item.desc}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-7 shadow-xs">

                {/* Category Selection */}
                <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#324C4D]">
                        <Tag size={14} className="text-[#648C83]" />
                        Category *
                    </label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={inputClass}
                    >
                        {CONTENT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ─── ARTICLE FIELDS ─── */}
                {type === 'article' && (
                    <>
                        {/* Title */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Article Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. 5 Evidence-Based Dietary Interventions for Metabolic Health"
                                className={inputClass}
                            />
                        </div>

                        {/* Cover Image Upload & Sample Selection */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Cover Image
                            </label>

                            {coverImage && (
                                <div className="relative mb-3 aspect-[16/8] max-w-md overflow-hidden rounded-2xl border border-[#DCE7E3]">
                                    <img src={coverImage} alt="Cover preview" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setCoverImageFromUrl('')}
                                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-[#C4D7D4] bg-[#FAFBF9] px-4 py-3 text-xs font-semibold text-[#033135] cursor-pointer hover:bg-[#E4F0EA] transition">
                                    <Upload size={16} />
                                    <span>Upload from Device</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageFileChange}
                                        className="hidden"
                                    />
                                </label>

                                <input
                                    type="url"
                                    value={coverImage}
                                    onChange={(e) => setCoverImageFromUrl(e.target.value)}
                                    placeholder="Or paste image URL (https://...)"
                                    className="flex-1 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3.5 py-2.5 text-xs outline-none focus:border-[#648C83]"
                                />
                            </div>

                            {/* Preset sample covers */}
                            <div className="mt-2.5 flex items-center gap-2">
                                <span className="text-[10px] text-[#9AA6A0]">Sample covers:</span>
                                <div className="flex gap-1.5">
                                    {SAMPLE_COVERS.map((url, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setCoverImageFromUrl(url)}
                                            className="h-7 w-10 overflow-hidden rounded-md border border-[#DCE7E3] opacity-70 hover:opacity-100 transition"
                                        >
                                            <img src={url} alt={`Preset ${i + 1}`} className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Short Description */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Short Summary / Description *
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="A concise 1–2 sentence summary for the feed..."
                                className={inputClass}
                            />
                        </div>

                        {/* Article Body */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Full Article Body *
                            </label>
                            <textarea
                                rows={8}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Write your clinical perspective, research citations, and actionable recommendations..."
                                className={inputClass}
                            />
                        </div>
                    </>
                )}

                {/* ─── REEL FIELDS ─── */}
                {type === 'reel' && (
                    <>
                        {/* Video Upload & Sample Selection */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Video File or Demo Reel *
                            </label>

                            {videoUrl && (
                                <div className="relative mb-3 aspect-[16/9] max-w-md overflow-hidden rounded-2xl bg-black border border-[#DCE7E3]">
                                    <video src={videoUrl} controls className="h-full w-full object-contain" />
                                    <button
                                        type="button"
                                        onClick={() => setVideoUrlFromUrl('')}
                                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-[#C4D7D4] bg-[#FAFBF9] px-4 py-3 text-xs font-semibold text-[#033135] cursor-pointer hover:bg-[#E4F0EA] transition">
                                    <Upload size={16} />
                                    <span>Upload Video File (MP4, WebM)</span>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={handleVideoFileChange}
                                        className="hidden"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setVideoUrlFromUrl(SAMPLE_REEL_VIDEOS[0])}
                                    className="rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-4 py-3 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                >
                                    Use Sample Reel Video
                                </button>
                            </div>
                        </div>

                        {/* Thumbnail / Cover Image */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Reel Thumbnail Image (Optional)
                            </label>
                            <input
                                type="url"
                                value={coverImage}
                                onChange={(e) => setCoverImageFromUrl(e.target.value)}
                                placeholder="Paste image thumbnail URL (https://...)"
                                className={inputClass}
                            />
                        </div>

                        {/* Caption */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Caption & Exercise Details *
                            </label>
                            <textarea
                                rows={4}
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Explain the movement pattern, dosage/reps, and safety precautions..."
                                className={inputClass}
                            />
                        </div>
                    </>
                )}

                {/* ─── DISCUSSION FIELDS ─── */}
                {type === 'discussion' && (
                    <>
                        {/* Discussion Title / Question */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Discussion Headline / Case Question
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Clinical Query: Handling Electrolyte Imbalance in Endurance Athletes"
                                className={inputClass}
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Discussion Content & Clinical Context *
                            </label>
                            <textarea
                                rows={6}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share your clinical question, patient observation, or healthcare topic for peer discussion..."
                                className={inputClass}
                            />
                        </div>

                        {/* Optional Reference Image */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-[#324C4D]">
                                Optional Reference Image / Chart
                            </label>
                            <div className="flex gap-2">
                                <label className="flex items-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3.5 py-2.5 text-xs font-semibold text-[#033135] cursor-pointer hover:bg-[#E4F0EA]">
                                    <Image size={15} /> Attach Image
                                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                                </label>
                                <input
                                    type="url"
                                    value={coverImage}
                                    onChange={(e) => setCoverImageFromUrl(e.target.value)}
                                    placeholder="Or paste chart/image URL"
                                    className="flex-1 rounded-xl border border-[#DCE7E3] bg-[#F8FAF7] px-3 py-2 text-xs outline-none focus:border-[#648C83]"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Local storage note */}
                <div className="flex items-start gap-2 rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 text-[11px] text-[#647572]">
                    <AlertCircle size={15} className="shrink-0 text-[#648C83] mt-0.5" />
                    <span>
                        Browser storage active: Media uploaded directly from your device utilizes browser-supported local memory URLs for live testing and preview.
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E8EFEB]">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-4 py-2.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                        >
                            <Eye size={15} />
                            <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 sm:flex-none rounded-xl border border-[#DCE7E3] bg-white px-5 py-2.5 text-xs font-semibold text-[#647572] hover:bg-[#FAFBF9] transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-[#033135] px-7 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#324C4D] transition active:scale-[0.99]"
                        >
                            <CheckCircle2 size={16} />
                            <span>{isEdit ? 'Save Changes' : 'Publish Post'}</span>
                        </button>
                    </div>
                </div>

            </form>

            {/* Live Preview Drawer / Section */}
            {showPreview && (
                <div className="rounded-3xl border border-[#C4D7D4] bg-[#FAFBF9] p-5 sm:p-7 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#648C83] flex items-center gap-1.5">
                            <Sparkles size={14} /> Live Reader Preview
                        </span>
                        <span className="rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[10px] font-bold text-[#033135]">
                            {type.toUpperCase()}
                        </span>
                    </div>

                    {/* ── REEL PREVIEW (9:16 Phone/Shorts style) ── */}
                    {type === 'reel' && (
                        <div className="relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-3xl overflow-hidden bg-black shadow-xl">
                            {videoUrl ? (
                                <video src={videoUrl} controls className="h-full w-full object-cover" />
                            ) : coverImage ? (
                                <img src={coverImage} alt="Reel preview" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-[#033135] flex items-center justify-center text-white text-xs">
                                    Video Preview
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

                            <span className="absolute left-3 top-3 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white">
                                REEL · {category}
                            </span>

                            <div className="absolute inset-x-0 bottom-0 p-3.5 text-white space-y-1">
                                <h3 className="text-xs font-bold leading-snug drop-shadow-md">
                                    {caption || title || 'Reel Caption Preview'}
                                </h3>
                                <p className="text-[10px] text-white/80">Previewing as Vertical Reel</p>
                            </div>
                        </div>
                    )}

                    {/* ── ARTICLE PREVIEW (Editorial Medical Journal style) ── */}
                    {type === 'article' && (
                        <div className="space-y-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B6D25]">
                                {category}
                            </span>

                            <h2 className="text-xl sm:text-2xl font-bold text-[#033135]" style={{ fontFamily: SERIF }}>
                                {title || 'Article Title Preview'}
                            </h2>

                            {coverImage && (
                                <div className="overflow-hidden rounded-2xl aspect-[16/9] max-w-lg">
                                    <img src={coverImage} alt="Preview" className="h-full w-full object-cover" />
                                </div>
                            )}

                            {description && (
                                <p className="text-xs font-semibold text-[#324C4D] border-l-2 border-[#033135] pl-3 leading-relaxed">
                                    {description}
                                </p>
                            )}

                            <div className="text-xs text-[#647572] whitespace-pre-line leading-relaxed">
                                {body || 'Write your clinical perspective and research recommendations...'}
                            </div>
                        </div>
                    )}

                    {/* ── DISCUSSION PREVIEW (Conversational Forum style) ── */}
                    {type === 'discussion' && (
                        <div className="rounded-2xl border-l-4 border-l-[#033135] border border-[#E8EFEB] bg-gradient-to-br from-[#FAFBF9] via-[#F5F8F6] to-[#EBF3EF] p-4 sm:p-5 space-y-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A06920]">
                                DISCUSSION ROUNDS · {category}
                            </span>

                            <h3 className="text-base font-bold text-[#033135]">
                                &ldquo;{content || title || 'Discussion Query Preview'}&rdquo;
                            </h3>

                            <p className="text-xs text-[#647572]">
                                Open for community clinicians and members to respond.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ContentComposer
