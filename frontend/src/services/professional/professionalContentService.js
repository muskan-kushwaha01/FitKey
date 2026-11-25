// professionalContentService.js
// Supabase-backed professional content (articles, reels, discussions).
// Writes to public.community_posts — the existing community table.
// RLS enforced: professionals can only create/edit/delete their own posts.
// Approval, likes, comments and view tracking are all server-side.

import { supabase } from '../../lib/supabase.js'
import { addPostComment, fetchPostComments } from '../communityService.js'

const COMMUNITY_CONTENT_BUCKET = 'community-content'

async function uploadCommunityFile(file, userId, mediaKind) {
  if (!file) return { url: null, path: null }
  const valid = mediaKind === 'video' ? file.type.startsWith('video/') : file.type.startsWith('image/')
  if (!valid) throw new Error(`Choose a valid ${mediaKind} file.`)
  const safeName = (file.name || mediaKind).replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`
  const { error } = await supabase.storage.from(COMMUNITY_CONTENT_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from(COMMUNITY_CONTENT_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    await supabase.storage.from(COMMUNITY_CONTENT_BUCKET).remove([path])
    throw new Error('Could not create a public URL for the uploaded content.')
  }
  return { url: data.publicUrl, path }
}

async function removeCommunityFiles(paths) {
  const validPaths = paths.filter(Boolean)
  if (validPaths.length) await supabase.storage.from(COMMUNITY_CONTENT_BUCKET).remove(validPaths)
}

// ─── Normalisation ─────────────────────────────────────────────────────────────

function normalizePost(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name ?? 'Verified Practitioner',
    authorSpecialty: row.author_specialty ?? '',
    authorPhoto: row.author_photo ?? '',
    type: row.content_type,
    title: row.title ?? '',
    category: row.category ?? '',
    description: row.summary ?? '',
    body: row.body ?? '',
    caption: row.body ?? '',       // reels use body as caption
    content: row.body ?? '',       // discussions use body as content
    coverImage: row.thumbnail_url ?? '',
    videoUrl: row.media_url ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    likesCount: row.likes_count ?? 0,
    commentsCount: row.comments_count ?? 0,
    savesCount: 0,
    viewsCount: row.views_count ?? 0,
    approvalStatus: row.approval_status ?? 'pending',
    isPublished: row.is_published ?? true,
    tags: row.tags ?? [],
  }
}

// ─── Synchronous cache (for backward-compatible sync callers) ──────────────────
let _postsCache = []

export function getAllPosts() {
  return _postsCache
}

// ─── Read API ──────────────────────────────────────────────────────────────────

/**
 * Get posts with optional filtering by author, type, or category.
 * When professionalId is provided, includes pending/draft posts for that author.
 */
export async function getPosts({ professionalId = null, type = 'all', category = 'all' } = {}) {
  if (professionalId) {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!authData?.user?.id || authData.user.id !== professionalId) {
      throw new Error('Authenticated account does not match the requested professional.')
    }
  }
  const SELECT_COLS = [
    'id', 'author_id', 'author_name', 'author_specialty', 'author_photo',
    'content_type', 'title', 'category', 'summary', 'body', 'thumbnail_url',
    'media_url', 'approval_status', 'is_published', 'is_curated',
    'likes_count', 'comments_count', 'views_count', 'created_at', 'updated_at', 'tags',
  ].join(', ')

  let query = supabase
    .from('community_posts')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false })

  if (professionalId) {
    query = query.eq('author_id', professionalId).eq('is_curated', false)
  } else {
    query = query.eq('approval_status', 'approved').eq('is_published', true)
  }

  if (type && type !== 'all') {
    query = query.eq('content_type', type.toLowerCase())
  }
  if (category && category !== 'all') {
    query = query.ilike('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[professionalContentService] getPosts error:', error)
    throw error
  }

  const posts = (data ?? []).map(normalizePost)
  if (professionalId) _postsCache = posts
  return posts
}

/**
 * Load posts for a professional into the synchronous cache.
 */
export async function loadPostsForProfessional(professionalId) {
  const posts = await getPosts({ professionalId })
  _postsCache = posts
  return posts
}

/**
 * Retrieve a single post by ID.
 */
export async function getPostById(postId) {
  if (!postId) return null

  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle()

  if (error || !data) return null
  return normalizePost(data)
}

// ─── Write API ─────────────────────────────────────────────────────────────────

/**
 * Create a new professional post.
 * Author identity is set server-side by the trigger (auth.uid()).
 */
export async function createPost({
  authorId,
  type,
  title,
  category,
  description = '',
  body = '',
  caption = '',
  content = '',
  coverImage = '',
  videoUrl = '',
  coverImageFile = null,
  videoFile = null,
  tags = [],
}) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const authenticatedUserId = authData?.user?.id
  if (authError || !authenticatedUserId) {
    return { success: false, error: authError?.message || 'Please sign in again.' }
  }
  if (authorId && authorId !== authenticatedUserId) {
    return { success: false, error: 'Authenticated account does not match the professional profile.' }
  }
  if (!type || !['article', 'reel', 'discussion'].includes(type)) {
    return { success: false, error: 'Invalid content type.' }
  }
  if (!category?.trim()) {
    return { success: false, error: 'Please select a content category.' }
  }

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

  let uploadedCover = null
  let uploadedVideo = null
  try {
    uploadedCover = await uploadCommunityFile(coverImageFile, authenticatedUserId, 'image')
    uploadedVideo = await uploadCommunityFile(videoFile, authenticatedUserId, 'video')
  } catch (error) {
    await removeCommunityFiles([uploadedCover?.path, uploadedVideo?.path])
    return { success: false, error: error.message || 'Could not upload content media.' }
  }

  const bodyContent = body || caption || content || ''
  const postTitle = (title || caption || content || 'Untitled').slice(0, 300)

  const payload = {
    content_type: type,
    title: postTitle,
    category: category.trim(),
    summary: description || '',
    body: bodyContent,
    thumbnail_url: uploadedCover?.url || coverImage || '',
    media_url: uploadedVideo?.url || videoUrl || '',
    tags: Array.isArray(tags) ? tags : [],
    // approval_status, author_id, likes_count, comments_count set by trigger
  }

  const { data, error } = await supabase
    .from('community_posts')
    .insert(payload)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[professionalContentService] createPost error:', error)
    await removeCommunityFiles([uploadedCover?.path, uploadedVideo?.path])
    return { success: false, error: error.message }
  }

  const post = normalizePost(data)
  _postsCache = [post, ..._postsCache.filter((item) => item.id !== post.id)]

  return {
    success: true,
    post,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} published successfully!`,
  }
}

/**
 * Update an existing post.
 * Verified professionals' edits remain approved in demo auto-approval mode.
 */
export async function updatePost(postId, authorId, updates) {
  if (!postId) return { success: false, error: 'Post ID required.' }
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const authenticatedUserId = authData?.user?.id
  if (authError || !authenticatedUserId) {
    return { success: false, error: authError?.message || 'Please sign in again.' }
  }
  if (authorId && authorId !== authenticatedUserId) {
    return { success: false, error: 'Authenticated account does not match the professional profile.' }
  }

  const payload = {}
  if (updates.title !== undefined)       payload.title = updates.title
  if (updates.category !== undefined)    payload.category = updates.category
  if (updates.description !== undefined) payload.summary = updates.description
  if (updates.body !== undefined)        payload.body = updates.body
  if (updates.caption !== undefined)     payload.body = updates.caption
  if (updates.content !== undefined)     payload.body = updates.content
  if (updates.coverImage !== undefined)  payload.thumbnail_url = updates.coverImage
  if (updates.videoUrl !== undefined)    payload.media_url = updates.videoUrl
  if (updates.tags !== undefined)        payload.tags = updates.tags

  let uploadedCover = null
  let uploadedVideo = null
  try {
    uploadedCover = await uploadCommunityFile(updates.coverImageFile, authenticatedUserId, 'image')
    uploadedVideo = await uploadCommunityFile(updates.videoFile, authenticatedUserId, 'video')
  } catch (error) {
    await removeCommunityFiles([uploadedCover?.path, uploadedVideo?.path])
    return { success: false, error: error.message || 'Could not upload content media.' }
  }
  if (uploadedCover?.url) payload.thumbnail_url = uploadedCover.url
  if (uploadedVideo?.url) payload.media_url = uploadedVideo.url

  const { data, error } = await supabase
    .from('community_posts')
    .update(payload)
    .eq('id', postId)
    .eq('author_id', authenticatedUserId)
    .eq('is_curated', false)
    .select()
    .maybeSingle()

  if (error) {
    await removeCommunityFiles([uploadedCover?.path, uploadedVideo?.path])
    return { success: false, error: error.message }
  }
  if (!data) return { success: false, error: 'Post not found or not authorized.' }

  const post = normalizePost(data)
  _postsCache = _postsCache.map((item) => item.id === post.id ? post : item)
  return { success: true, post, message: 'Post updated successfully!' }
}

/**
 * Delete a post. RLS ensures only the author can delete their own non-curated posts.
 */
export async function deletePost(postId) {
  if (!postId) return { success: false, error: 'Post ID required.' }

  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId)

  if (error) return { success: false, error: error.message }
  return { success: true, message: 'Post deleted successfully.' }
}

// ─── Interactions ──────────────────────────────────────────────────────────────

const LIKES_CACHE_KEY = 'fk_content_likes_cache'

function getCachedLikes(userId) {
  try {
    const raw = localStorage.getItem(`${LIKES_CACHE_KEY}_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function setCachedLikes(userId, list) {
  try {
    localStorage.setItem(`${LIKES_CACHE_KEY}_${userId}`, JSON.stringify(list))
  } catch { /* ignore */ }
}

const SAVES_CACHE_KEY = 'fk_post_saves_cache'

function getCachedSaves(userId) {
  try {
    const raw = localStorage.getItem(`${SAVES_CACHE_KEY}_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function setCachedSaves(userId, list) {
  try {
    localStorage.setItem(`${SAVES_CACHE_KEY}_${userId}`, JSON.stringify(list))
  } catch { /* ignore */ }
}

/**
 * Check if the current user has liked or saved a post (reads sync cache).
 */
export function getInteractionStatus(postId, userId) {
  if (!userId || !postId) return { liked: false, saved: false }
  const likes = getCachedLikes(userId)
  const saves = getCachedSaves(userId)
  return { liked: likes.includes(postId), saved: saves.includes(postId) }
}

/**
 * Toggle like for a post using community_post_likes table.
 * Duplicate-like is prevented by DB UNIQUE constraint.
 */
export async function toggleLikePost(postId, userId) {
  if (!userId) return { success: false, error: 'Sign in to like content.' }
  if (!postId) return { success: false, error: 'Post ID required.' }

  const currentLikes = getCachedLikes(userId)
  const isCurrentlyLiked = currentLikes.includes(postId)

  const { data: existing } = await supabase
    .from('community_post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing || isCurrentlyLiked) {
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
    if (error) return { success: false, error: error.message }
    setCachedLikes(userId, currentLikes.filter((id) => id !== postId))
    return { success: true, liked: false }
  } else {
    const { error } = await supabase
      .from('community_post_likes')
      .insert({ post_id: postId })
    if (error) return { success: false, error: error.message }
    setCachedLikes(userId, [...currentLikes, postId])
    return { success: true, liked: true }
  }
}

/**
 * Toggle save/bookmark using Supabase community_post_bookmarks table.
 * Fully persisted cross-device with unique (post_id, user_id) constraint.
 */
export async function toggleSavePost(postId, userId) {
  if (!userId) return { success: false, error: 'Sign in to save content.' }
  if (!postId) return { success: false, error: 'Post ID required.' }

  const currentSaves = getCachedSaves(userId)
  const isCurrentlySaved = currentSaves.includes(postId)

  const { data: existing } = await supabase
    .from('community_post_bookmarks')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing || isCurrentlySaved) {
    const { error } = await supabase
      .from('community_post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)

    if (error) return { success: false, error: error.message }
    setCachedSaves(userId, currentSaves.filter((id) => id !== postId))
    return { success: true, saved: false }
  } else {
    const { error } = await supabase
      .from('community_post_bookmarks')
      .insert({ post_id: postId, user_id: userId })

    if (error) return { success: false, error: error.message }
    setCachedSaves(userId, [...currentSaves, postId])
    return { success: true, saved: true }
  }
}

/**
 * Record a verified view on a post via deduplicated Supabase RPC.
 */
export async function recordPostView(postId) {
  if (!postId) return { success: false }
  const { data, error } = await supabase.rpc('record_community_post_view', { p_post_id: postId })
  if (error) return { success: false, error: error.message }
  return { success: true, counted: data?.counted ?? false }
}

/**
 * Add a comment to a post.
 */
export async function addComment(postId, { authorId, authorName, text }) {
  if (!text?.trim()) return { success: false, error: 'Comment text cannot be empty.' }
  if (!postId) return { success: false, error: 'Post ID required.' }
  if (!authorId) return { success: false, error: 'Sign in to comment.' }
  try {
    const result = await addPostComment(postId, authorId, text)
    return {
      success: true,
      commentsCount: result.commentsCount,
      comment: {
        id: result.comment.id,
        authorId: result.comment.userId,
        authorName: result.comment.authorName || authorName || 'Verified Professional',
        text: result.comment.text,
        createdAt: result.comment.createdAt,
      },
    }
  } catch (error) {
    return { success: false, error: error?.message || 'Could not post comment.' }
  }
}

export async function getPostComments(postId) {
  return fetchPostComments(postId)
}

// ─── Legacy migration helper ───────────────────────────────────────────────────

/**
 * Migrate localStorage posts to Supabase community_posts.
 * Only migrates posts owned by the authenticated professional.
 * Skips demo posts (post_demo_*).
 */
export async function migrateLocalStoragePosts(localPosts) {
  const { data: authData } = await supabase.auth.getSession()
  if (!authData?.session?.user?.id) return { migrated: 0, skipped: 0 }

  let migrated = 0
  let skipped = 0

  for (const post of localPosts) {
    if (!post.id || post.id.startsWith('post_demo_')) { skipped++; continue }
    if (post.authorId !== authData.session.user.id) { skipped++; continue }
    if (post.approvalStatus === 'deleted') { skipped++; continue }

    try {
      const { error } = await supabase.from('community_posts').insert({
        content_type: post.type,
        title: (post.title || 'Untitled').slice(0, 300),
        category: post.category || 'General',
        summary: post.description || '',
        body: post.body || post.caption || post.content || '',
        thumbnail_url: post.coverImage || '',
        media_url: post.videoUrl || '',
        tags: [],
        created_at: post.createdAt,
        updated_at: post.updatedAt || post.createdAt,
      })
      if (error && error.code !== '23505') { skipped++ } else { migrated++ }
    } catch { skipped++ }
  }

  return { migrated, skipped }
}
