// professionalContentService.js
// Content management layer for professional articles, reels, and discussions.
// Handles post creation, editing, deletion, interactions, and persistent storage.

import {
  getItem,
  setItem,
  STORAGE_KEYS,
  generateId,
} from '../storageService.js'
import {
  awardProfXP,
  PROF_XP_RULES,
} from './professionalXpService.js'

// Sample initial content seeded for demonstration and testing
const INITIAL_DEMO_POSTS = [
  {
    id: 'post_demo_001',
    authorId: 'prof_demo_001',
    authorName: 'Dr. Ananya Sharma',
    authorSpecialty: 'Cardiology & Preventive Medicine',
    authorPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    type: 'article',
    title: 'Understanding Blood Pressure: The Silent Lifestyle Factor',
    category: 'Cardiology & Heart Health',
    description: 'Why resting systolic numbers fluctuate and 4 evidence-based daily habits to support arterial elasticity.',
    body: `Hypertension is frequently termed the 'silent condition' because substantial arterial strain can accumulate long before clinical symptoms present.

### Key Factors Impacting Endothelial Health:
1. **Sodium-to-Potassium Ratio**: Modern diets often feature excess sodium with inadequate dietary potassium. Increasing leafy greens, bananas, and coconut water restores ionic cellular balance.
2. **Nitric Oxide Production**: Daily aerobic movement promotes natural vascular vasodilation through increased nitric oxide synthesis.
3. **Sleep Architecture**: Nocturnal blood pressure dipping (a normal 10-20% drop during sleep) requires uninterrupted REM and deep slow-wave sleep cycles.
4. **Chronic Sympathetic Tone**: Sustained cortisol elevation contracts peripheral arterioles. Just 5 minutes of box breathing can clinically lower immediate sympathetic output.

Regular self-monitoring with a calibrated upper-arm cuff remains the gold standard for early detection.`,
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-02-14T10:30:00.000Z',
    likesCount: 38,
    commentsCount: 6,
    savesCount: 19,
    viewsCount: 420,
    approvalStatus: 'approved',
    comments: [
      { id: 'c1', authorName: 'Dr. Rajesh Kumar', text: 'Well articulated point on nocturnal blood pressure dipping.', createdAt: '2026-02-14T14:10:00.000Z' },
      { id: 'c2', authorName: 'Priya Nair', text: 'Dietary potassium is indeed underappreciated in routine checkups.', createdAt: '2026-02-14T16:22:00.000Z' }
    ]
  },
  {
    id: 'post_demo_002',
    authorId: 'prof_demo_001',
    authorName: 'Dr. Ananya Sharma',
    authorSpecialty: 'Cardiology & Preventive Medicine',
    authorPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    type: 'reel',
    title: '3 Quick Thoracic Mobility Drills For Desk Workers',
    caption: 'Spend 8+ hours at a computer? Watch these 3 micro-movements to decompress your upper spine and improve resting chest expansion. Perform 10 reps each morning!',
    category: 'Physiotherapy & Rehab',
    coverImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    createdAt: '2026-02-18T08:15:00.000Z',
    likesCount: 94,
    commentsCount: 14,
    savesCount: 52,
    viewsCount: 1280,
    approvalStatus: 'approved',
    comments: [
      { id: 'c3', authorName: 'Aarav Sharma', text: 'Did this right at my standing desk, instant relief!', createdAt: '2026-02-18T11:00:00.000Z' }
    ]
  },
  {
    id: 'post_demo_003',
    authorId: 'prof_demo_001',
    authorName: 'Dr. Ananya Sharma',
    authorSpecialty: 'Cardiology & Preventive Medicine',
    authorPhoto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    type: 'discussion',
    title: 'Clinical Perspective: Are Electrolyte Drinks Necessary for Daily 30-Minute Walks?',
    content: 'We often see patients consuming high-sugar commercial sports drinks after gentle 30-minute walks. For mild exercise under 60 minutes in temperate weather, standard plain water coupled with balanced whole-food meals is completely adequate for electrolyte homeostasis. What has your clinical observation been with patient electrolyte supplementation?',
    category: 'Nutrition & Dietetics',
    coverImage: 'https://images.unsplash.com/photo-1550572017-edb79984244b?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-02-21T12:00:00.000Z',
    likesCount: 42,
    commentsCount: 11,
    savesCount: 15,
    viewsCount: 560,
    approvalStatus: 'approved',
    comments: [
      { id: 'c4', authorName: 'Dr. Arjun Patel', text: 'Fully agree. Excessive sodium load without sweat depletion can actually elevate vascular pressure.', createdAt: '2026-02-21T14:30:00.000Z' }
    ]
  }
]

/**
 * Get all content posts from storage (seeds demo posts if none exist).
 */
export function getAllPosts() {
  const posts = getItem(STORAGE_KEYS.PROF_CONTENT, null)
  if (!posts) {
    setItem(STORAGE_KEYS.PROF_CONTENT, INITIAL_DEMO_POSTS)
    return INITIAL_DEMO_POSTS
  }
  return posts
}

/**
 * Save posts array to storage.
 */
function savePosts(posts) {
  return setItem(STORAGE_KEYS.PROF_CONTENT, posts)
}

/**
 * Get posts with optional filtering by author, type, or category.
 */
export function getPosts({ professionalId = null, type = 'all', category = 'all' } = {}) {
  let list = getAllPosts()

  if (professionalId) {
    list = list.filter((p) => p.authorId === professionalId)
  }

  if (type && type !== 'all') {
    list = list.filter((p) => p.type === type.toLowerCase())
  }

  if (category && category !== 'all') {
    list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase())
  }

  // Sort by newest first
  return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/**
 * Retrieve a single post by ID.
 */
export function getPostById(postId) {
  const list = getAllPosts()
  return list.find((p) => p.id === postId) || null
}

/**
 * Create a new professional post (Article, Reel, or Discussion).
 */
export function createPost({
  authorId,
  authorName,
  authorSpecialty,
  authorPhoto,
  type,
  title,
  category,
  description = '',
  body = '',
  caption = '',
  content = '',
  coverImage = '',
  videoUrl = '',
}) {
  if (!authorId) {
    return { success: false, error: 'Author session is required.' }
  }

  if (!type || !['article', 'reel', 'discussion'].includes(type)) {
    return { success: false, error: 'Invalid content type.' }
  }

  if (!category) {
    return { success: false, error: 'Please select a content category.' }
  }

  // Type-specific validation
  if (type === 'article') {
    if (!title?.trim()) return { success: false, error: 'Article title is required.' }
    if (!description?.trim()) return { success: false, error: 'Article summary description is required.' }
    if (!body?.trim()) return { success: false, error: 'Article body content is required.' }
  } else if (type === 'reel') {
    if (!videoUrl?.trim()) return { success: false, error: 'Video file or preview URL is required for reels.' }
    if (!caption?.trim()) return { success: false, error: 'Reel caption is required.' }
  } else if (type === 'discussion') {
    if (!content?.trim()) return { success: false, error: 'Discussion content is required.' }
  }

  const posts = getAllPosts()

  const newPost = {
    id: `post_${generateId()}`,
    authorId,
    authorName: authorName || 'FitKey Professional',
    authorSpecialty: authorSpecialty || 'Clinical Specialist',
    authorPhoto: authorPhoto || '',
    type,
    title: (title || caption || content || 'Untitled').slice(0, 100),
    category,
    description: description || '',
    body: body || '',
    caption: caption || '',
    content: content || '',
    coverImage: coverImage || '',
    videoUrl: videoUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likesCount: 0,
    commentsCount: 0,
    savesCount: 0,
    viewsCount: 1,
    approvalStatus: 'approved',
    comments: [],
  }

  posts.unshift(newPost)
  savePosts(posts)

  // Trigger content approval XP award idempotently
  const xpAmount =
    type === 'article'
      ? PROF_XP_RULES.APPROVED_ARTICLE
      : type === 'reel'
      ? PROF_XP_RULES.APPROVED_REEL
      : PROF_XP_RULES.APPROVED_DISCUSSION

  awardProfXP({
    professionalId: authorId,
    amount: xpAmount,
    source: 'APPROVED_CONTENT',
    refId: `content-${newPost.id}`,
    description: `Approved ${type.charAt(0).toUpperCase() + type.slice(1)}: "${newPost.title}"`,
  })

  // Check if quality contribution milestone is reached (3+ approved posts)
  const authorPosts = posts.filter((p) => p.authorId === authorId)
  if (authorPosts.length >= 3) {
    awardProfXP({
      professionalId: authorId,
      amount: PROF_XP_RULES.QUALITY_CONTRIBUTION,
      source: 'QUALITY_CONTRIBUTION',
      refId: `milestone-3posts-${authorId}`,
      description: 'Quality milestone: 3+ accredited educational posts published',
    })
  }

  return {
    success: true,
    post: newPost,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} published successfully!`,
  }
}

/**
 * Update an existing post. Only the post author can update it.
 */
export function updatePost(postId, authorId, updates) {
  const posts = getAllPosts()
  const index = posts.findIndex((p) => p.id === postId)

  if (index === -1) {
    return { success: false, error: 'Post not found.' }
  }

  const existing = posts[index]

  // Authorization check
  if (existing.authorId !== authorId) {
    return {
      success: false,
      error: 'Unauthorized: You can only edit your own published content.',
    }
  }

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  posts[index] = updated
  savePosts(posts)

  return {
    success: true,
    post: updated,
    message: 'Post updated successfully!',
  }
}

/**
 * Delete an existing post. Only the author can delete it.
 */
export function deletePost(postId, authorId) {
  const posts = getAllPosts()
  const post = posts.find((p) => p.id === postId)

  if (!post) {
    return { success: false, error: 'Post not found.' }
  }

  // Authorization check
  if (post.authorId !== authorId) {
    return {
      success: false,
      error: 'Unauthorized: You can only delete your own published content.',
    }
  }

  const filtered = posts.filter((p) => p.id !== postId)
  savePosts(filtered)

  return {
    success: true,
    message: 'Post deleted successfully.',
  }
}

/**
 * Get user interactions map from storage.
 */
function getInteractions() {
  return getItem(STORAGE_KEYS.CONTENT_INTERACTIONS, { likes: {}, saves: {} })
}

function saveInteractions(data) {
  return setItem(STORAGE_KEYS.CONTENT_INTERACTIONS, data)
}

/**
 * Check if a post is liked/saved by a professional.
 */
export function getInteractionStatus(postId, userId) {
  if (!userId) return { liked: false, saved: false }
  const data = getInteractions()
  const userLikes = data.likes?.[userId] || []
  const userSaves = data.saves?.[userId] || []
  return {
    liked: userLikes.includes(postId),
    saved: userSaves.includes(postId),
  }
}

/**
 * Toggle like for a post.
 */
export function toggleLikePost(postId, userId) {
  if (!userId) return { success: false, error: 'Sign in to like content.' }

  const posts = getAllPosts()
  const post = posts.find((p) => p.id === postId)
  if (!post) return { success: false, error: 'Post not found.' }

  const data = getInteractions()
  if (!data.likes) data.likes = {}
  if (!data.likes[userId]) data.likes[userId] = []

  const isLiked = data.likes[userId].includes(postId)

  if (isLiked) {
    data.likes[userId] = data.likes[userId].filter((id) => id !== postId)
    post.likesCount = Math.max(0, (post.likesCount || 1) - 1)
  } else {
    data.likes[userId].push(postId)
    post.likesCount = (post.likesCount || 0) + 1
  }

  saveInteractions(data)
  savePosts(posts)

  return {
    success: true,
    liked: !isLiked,
    likesCount: post.likesCount,
  }
}

/**
 * Toggle bookmark / save for a post.
 */
export function toggleSavePost(postId, userId) {
  if (!userId) return { success: false, error: 'Sign in to save content.' }

  const posts = getAllPosts()
  const post = posts.find((p) => p.id === postId)
  if (!post) return { success: false, error: 'Post not found.' }

  const data = getInteractions()
  if (!data.saves) data.saves = {}
  if (!data.saves[userId]) data.saves[userId] = []

  const isSaved = data.saves[userId].includes(postId)

  if (isSaved) {
    data.saves[userId] = data.saves[userId].filter((id) => id !== postId)
    post.savesCount = Math.max(0, (post.savesCount || 1) - 1)
  } else {
    data.saves[userId].push(postId)
    post.savesCount = (post.savesCount || 0) + 1
  }

  saveInteractions(data)
  savePosts(posts)

  return {
    success: true,
    saved: !isSaved,
    savesCount: post.savesCount,
  }
}

/**
 * Add a comment to a post.
 */
export function addComment(postId, { authorId, authorName, text }) {
  if (!text?.trim()) return { success: false, error: 'Comment text cannot be empty.' }

  const posts = getAllPosts()
  const post = posts.find((p) => p.id === postId)
  if (!post) return { success: false, error: 'Post not found.' }

  const newComment = {
    id: `comm_${generateId()}`,
    authorId,
    authorName: authorName || 'Verified Professional',
    text: text.trim(),
    createdAt: new Date().toISOString(),
  }

  if (!post.comments) post.comments = []
  post.comments.push(newComment)
  post.commentsCount = post.comments.length

  savePosts(posts)

  return {
    success: true,
    comment: newComment,
    commentsCount: post.commentsCount,
  }
}
