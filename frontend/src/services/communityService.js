// communityService.js
// Permanent Supabase persistence service for the Community screen.
// Handles approved feed loading, like/unlike toggles, and discussion comments.
// NOTE: Bookmark / save persistence is intentionally omitted for a future phase.

import { supabase } from '../lib/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value) {
    return typeof value === 'string' && UUID_REGEX.test(value.trim())
}

const POST_FEED_COLUMNS = [
    'id',
    'author_id',
    'is_curated',
    'author_name',
    'author_specialty',
    'author_photo',
    'author_verification_status',
    'content_type',
    'title',
    'category',
    'tags',
    'summary',
    'body',
    'media_url',
    'media_type',
    'thumbnail_url',
    'duration_label',
    'read_time_minutes',
    'approval_status',
    'is_published',
    'likes_count',
    'comments_count',
    'created_at',
].join(', ')

function toServiceError(err, fallback = 'Database operation failed.') {
    if (err instanceof Error) return err
    const wrapped = new Error(err?.message || fallback)
    if (err?.code) wrapped.code = err.code
    return wrapped
}

function normalizePost(row, likedPostIds = new Set()) {
    const isCurated = Boolean(row.is_curated)
    const authorId = row.author_id || null
    const summaryText = row.summary || ''
    const bodyText = row.body || ''
    const cover = row.thumbnail_url || row.media_url || ''
    const likesTotal = Number(row.likes_count) || 0

    return {
        id: row.id,
        authorId,
        // Curated starter posts have no user-owned practitioner directory profile; real verified UUID authors do.
        navigableAuthorId: !isCurated && isUuid(authorId) ? authorId : null,
        isCurated,
        authorName: row.author_name || 'Verified Practitioner',
        authorSpecialty: row.author_specialty || 'Clinical Wellness',
        authorPhoto: row.author_photo || '',
        authorVerificationStatus: row.author_verification_status || 'Verified Practitioner',
        type: row.content_type || 'article',
        title: row.title || '',
        category: row.category || 'Wellness',
        tags: Array.isArray(row.tags) ? row.tags : [],
        summary: summaryText,
        description: summaryText,
        body: bodyText,
        content: bodyText,
        caption: summaryText || bodyText,
        mediaUrl: row.media_url || '',
        videoUrl: row.media_url || '',
        mediaType: row.media_type || '',
        thumbnailUrl: row.thumbnail_url || '',
        coverImage: cover,
        duration: row.duration_label || '',
        readTimeMinutes: Number(row.read_time_minutes) || 1,
        approvalStatus: row.approval_status || 'approved',
        isPublished: Boolean(row.is_published),
        likes: likesTotal,
        likesCount: likesTotal,
        likedByMe: likedPostIds.has(row.id),
        commentsCount: Number(row.comments_count) || 0,
        comments: [],
        createdAt: row.created_at,
    }
}

function normalizeComment(row) {
    return {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        authorName: row.author_name || 'FitKey Member',
        text: row.body || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

/**
 * Fetch approved & published community posts from Supabase, enriched with the
 * signed-in user's like state (`likedByMe`).
 */
export async function fetchApprovedCommunityFeed(userId, { type = 'all', limit = 60 } = {}) {
    let query = supabase
        .from('community_posts')
        .select(POST_FEED_COLUMNS)
        .eq('approval_status', 'approved')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (type && type !== 'all') {
        query = query.eq('content_type', type)
    }

    const { data: rows, error } = await query
    if (error) {
        throw toServiceError(error, 'Could not load community feed.')
    }

    const posts = Array.isArray(rows) ? rows : []
    const likedPostIds = new Set()

    if (userId && posts.length > 0) {
        const postIds = posts.map((r) => r.id)
        const { data: likesRows, error: likesError } = await supabase
            .from('community_post_likes')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds)

        if (likesError) {
            throw toServiceError(likesError, 'Could not load like status.')
        }

        for (const likeRow of likesRows || []) {
            if (likeRow?.post_id) likedPostIds.add(likeRow.post_id)
        }
    }

    return posts.map((row) => normalizePost(row, likedPostIds))
}

/**
 * Persist a like or unlike in `community_post_likes` and return the server-synced
 * `likes_count` updated by PostgreSQL trigger.
 */
export async function togglePostLike(postId, userId, currentlyLiked) {
    if (!postId || !userId) {
        throw new Error('Authentication required to react to posts.')
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || authData?.user?.id !== userId) {
        throw new Error('Your session does not match the signed-in account. Please refresh and try again.')
    }

    const { data, error } = await supabase.rpc('toggle_community_post_like', {
        p_post_id: postId,
        p_like: !currentlyLiked,
    })
    if (error && !['PGRST202', '42883'].includes(error.code)) {
        throw toServiceError(error, 'Could not save like.')
    }

    // Older projects may not have the corrective RPC applied yet. The original
    // table policies still enforce auth.uid() ownership and approved post visibility.
    if (error) {
        if (currentlyLiked) {
            const { error: deleteError } = await supabase
                .from('community_post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', userId)
            if (deleteError) throw toServiceError(deleteError, 'Could not remove like.')
        } else {
            const { error: insertError } = await supabase
                .from('community_post_likes')
                .insert({ post_id: postId, user_id: userId })
            if (insertError && insertError.code !== '23505') {
                throw toServiceError(insertError, 'Could not save like.')
            }
        }
        const { data: post, error: readError } = await supabase
            .from('community_posts')
            .select('likes_count')
            .eq('id', postId)
            .maybeSingle()
        if (readError) throw toServiceError(readError, 'Like was saved, but its count could not be refreshed.')
        return {
            likedByMe: !currentlyLiked,
            likesCount: Number.isFinite(Number(post?.likes_count)) ? Number(post.likes_count) : null,
        }
    }
    if (!data?.success) throw new Error(data?.error || 'Could not update like.')

    return {
        likedByMe: Boolean(data.liked),
        likesCount: Number.isFinite(Number(data.likes_count)) ? Number(data.likes_count) : null,
    }
}

/**
 * Load comments for a community post ordered chronologically.
 */
export async function fetchPostComments(postId) {
    if (!postId) return []

    const { data, error } = await supabase.rpc('get_community_post_comments', { p_post_id: postId })

    if (error) throw toServiceError(error, 'Could not load comments.')

    return (data || []).map(normalizeComment)
}

/**
 * Create a comment owned by the authenticated user.
 * `author_name` is populated authoritatively on the server from `profiles`.
 */
export async function addPostComment(postId, userId, body) {
    if (!postId || !userId) {
        throw new Error('Please sign in to post a comment.')
    }

    const trimmed = String(body || '').trim()
    if (!trimmed) {
        throw new Error('Comment cannot be empty.')
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    const authenticatedUserId = authData?.user?.id
    if (authError || !authenticatedUserId) {
        throw toServiceError(authError, 'Please sign in to post a comment.')
    }
    if (userId !== authenticatedUserId) {
        throw new Error('Your session does not match the signed-in account. Please refresh and try again.')
    }

    const { data: post, error: postError } = await supabase
        .from('community_posts')
        .select('approval_status, is_published')
        .eq('id', postId)
        .maybeSingle()

    if (postError) throw toServiceError(postError, 'Could not check whether this post accepts comments.')
    if (!post || post.approval_status !== 'approved' || !post.is_published) {
        throw new Error('Comments are available after this post has been approved and published.')
    }

    const { data: result, error } = await supabase.rpc('create_community_post_comment', {
        p_post_id: postId,
        p_body: trimmed,
    })

    if (error) throw toServiceError(error, 'Could not post comment.')
    if (!result?.success || !result.comment) throw new Error(result?.error || 'Could not post comment.')

    return {
        comment: normalizeComment(result.comment),
        commentsCount: Number.isFinite(Number(result.comments_count)) ? Number(result.comments_count) : null,
    }
}

/**
 * Delete an authenticated user's own comment and fetch updated `comments_count`.
 */
export async function deletePostComment(commentId, userId) {
    if (!commentId || !userId) {
        throw new Error('Authentication required to delete a comment.')
    }

    const { data, error } = await supabase.rpc('delete_community_post_comment', { p_comment_id: commentId })

    if (error) throw toServiceError(error, 'Could not delete comment.')
    if (!data?.success) throw new Error(data?.error || 'Could not delete comment.')

    return { success: true, commentsCount: Number.isFinite(Number(data.comments_count)) ? Number(data.comments_count) : null }
}

/**
 * Check via trusted RPC whether a Supabase user holds a verified professional status.
 */
export async function checkIsVerifiedProfessional(userId) {
    if (!userId) return false
    const { data, error } = await supabase.rpc('is_verified_professional', {
        p_user_id: userId,
    })
    if (error) throw toServiceError(error, 'Could not verify professional status.')
    return Boolean(data)
}

/**
 * Create a new community post (`approval_status: 'pending'`) for a verified professional.
 * Database RLS & triggers independently reject unverified authors and enforce server-owned identity/counters.
 */
export async function createCommunityPost(userId, input = {}) {
    if (!userId) {
        throw new Error('Authentication required to publish community content.')
    }

    const verified = await checkIsVerifiedProfessional(userId)
    if (!verified) {
        throw new Error('Only verified professionals can create community content.')
    }

    const contentType = input.type || input.content_type || 'article'
    const title = String(input.title || '').trim()
    const category = String(input.category || 'Wellness').trim()
    const body = String(input.body || input.content || '').trim()
    const summary = String(input.summary || input.description || '').trim()

    if (!title) throw new Error('Post title is required.')

    const { data, error } = await supabase
        .from('community_posts')
        .insert({
            author_id: userId,
            is_curated: false,
            author_name: 'Verified Practitioner',
            content_type: contentType,
            title,
            category,
            tags: Array.isArray(input.tags) ? input.tags : [],
            summary: summary || null,
            body,
            media_url: input.mediaUrl || input.videoUrl || null,
            media_type: input.mediaType || (contentType === 'reel' ? 'video' : null),
            thumbnail_url: input.thumbnailUrl || input.coverImage || null,
            duration_label: input.duration || null,
            read_time_minutes: Number(input.readTimeMinutes) || 1,
            approval_status: 'pending',
            is_published: input.isPublished !== false,
            likes_count: 0,
            comments_count: 0,
        })
        .select(POST_FEED_COLUMNS)
        .single()

    if (error) throw toServiceError(error, 'Could not create community post.')

    return normalizePost(data)
}

/**
 * Read-only audit helper for legacy un-scoped browser Community storage.
 * Anonymous `fk_community_user` (`cu_<uuid>`), anonymous `fk_content_interactions`,
 * and unverified local `fk_prof_content` drafts must never be blindly uploaded
 * under an authenticated Supabase account without verified ownership.
 */
export function inspectLegacyCommunityStorage() {
    try {
        const hasLegacyContent = Boolean(localStorage.getItem('fk_prof_content'))
        const hasLegacyInteractions = Boolean(localStorage.getItem('fk_content_interactions'))
        const hasLegacyAnonUser = Boolean(localStorage.getItem('fk_community_user'))
        return { hasLegacyContent, hasLegacyInteractions, hasLegacyAnonUser }
    } catch {
        return { hasLegacyContent: false, hasLegacyInteractions: false, hasLegacyAnonUser: false }
    }
}
