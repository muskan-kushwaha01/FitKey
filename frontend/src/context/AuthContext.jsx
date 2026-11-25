import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { signOut as supabaseSignOut } from '../services/authService'
import {
    setStorageUser,
    clearUserScopedCache,
    getTodayDateString,
} from '../services/storageService'
import { migrateLocalStorageToSupabase } from '../services/migrationService'
import { migrateLocalProfileToSupabase } from '../services/userProfileService'
import { syncHealthDataFromSupabase } from '../services/healthService'
import {
    flushSyncOutbox,
    cancelScheduledFlushes,
    claimWelcomeBonusFromServer,
    syncXPFromSupabase,
    syncBadgesFromSupabase,
    syncRedemptionsFromSupabase,
    syncProgressWithServer,
} from '../services/syncService'

const AuthContext = createContext(null)

// Concurrency lock prevents simultaneous hydration when getSession() and onAuthStateChange overlap
const inFlightHydrations = new Map()

async function hydrateUserData(user) {
    if (!user?.id) return { success: false, reason: 'NO_USER' }
    const userId = user.id

    if (inFlightHydrations.has(userId)) {
        return inFlightHydrations.get(userId)
    }

    const task = (async () => {
        try {
            // 1. Migrate legacy un-scoped localStorage data if ownership belongs to this user
            await migrateLocalStorageToSupabase(user)
            await migrateLocalProfileToSupabase(user)

            // 2. Ensure one-time starter welcome XP exists on server
            await claimWelcomeBonusFromServer(userId)

            // 3. Sync health goals, metrics, and summaries (flushes outbox before reading)
            await syncHealthDataFromSupabase(userId)

            // 4. Verify & reconcile today's challenge completions and badges on server
            await syncProgressWithServer(userId, [getTodayDateString()])

            // 5. Hydrate XP ledger, unlocked badges, and redemptions from Supabase
            await Promise.allSettled([
                syncXPFromSupabase(userId),
                syncBadgesFromSupabase(userId),
                syncRedemptionsFromSupabase(userId),
            ])

            return { success: true }
        } catch (err) {
            console.error('[AuthContext] Data hydration error:', err)
            return { success: false, error: err }
        }
    })().finally(() => {
        inFlightHydrations.delete(userId)
    })

    inFlightHydrations.set(userId, task)
    return task
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const prevUserIdRef = useRef(null)

    const applySession = useCallback((nextSession, { triggerHydration = false } = {}) => {
        const nextUser = nextSession?.user ?? null
        const nextUserId = nextUser?.id ?? null
        const prevUserId = prevUserIdRef.current

        if (prevUserId && prevUserId !== nextUserId) {
            cancelScheduledFlushes()
            clearUserScopedCache(prevUserId, { preserveIfPendingOutbox: true })
        }

        if (!nextUserId) {
            cancelScheduledFlushes()
            clearUserScopedCache(null)
            setStorageUser(null)
            prevUserIdRef.current = null
            setSession(null)
            setLoading(false)
            return
        }

        // Scope cache synchronously BEFORE setting React state so children immediately read isolated user storage
        setStorageUser(nextUserId)
        prevUserIdRef.current = nextUserId
        setSession(nextSession)
        setLoading(false)

        if (triggerHydration || prevUserId !== nextUserId) {
            setSyncing(true)
            hydrateUserData(nextUser).finally(() => {
                setSyncing(false)
            })
        }
    }, [])

    useEffect(() => {
        let mounted = true

        const initializeAuth = async () => {
            const { data, error } = await supabase.auth.getSession()
            if (!mounted) return

            if (error) {
                console.error('Session error:', error)
            }
            const activeSession = data?.session ?? null
            applySession(activeSession, { triggerHydration: Boolean(activeSession?.user) })
        }

        initializeAuth()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (!mounted) return

            if (event === 'SIGNED_OUT') {
                applySession(null, { triggerHydration: false })
                return
            }

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
                const newUserId = newSession?.user?.id ?? null
                const shouldHydrate = event === 'SIGNED_IN' || (newUserId && prevUserIdRef.current !== newUserId)
                applySession(newSession, { triggerHydration: Boolean(shouldHydrate && newSession?.user) })
            } else {
                setSession(newSession)
                setLoading(false)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [applySession])

    // Flush queued offline writes automatically on reconnect / tab visibility restore
    useEffect(() => {
        const uid = session?.user?.id
        if (!uid) return

        const handleReconnectOrResume = () => {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return
            flushSyncOutbox(uid)
        }

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                handleReconnectOrResume()
            } else if (document.visibilityState === 'hidden') {
                flushSyncOutbox(uid)
            }
        }

        window.addEventListener('online', handleReconnectOrResume)
        document.addEventListener('visibilitychange', handleVisibility)
        window.addEventListener('pagehide', handleReconnectOrResume)

        return () => {
            window.removeEventListener('online', handleReconnectOrResume)
            document.removeEventListener('visibilitychange', handleVisibility)
            window.removeEventListener('pagehide', handleReconnectOrResume)
        }
    }, [session?.user?.id])

    const handleSignOut = useCallback(async () => {
        const uid = prevUserIdRef.current || session?.user?.id
        cancelScheduledFlushes()

        // Best-effort quick flush before auth token invalidation (max 2s)
        if (uid) {
            try {
                await Promise.race([
                    flushSyncOutbox(uid),
                    new Promise((resolve) => setTimeout(resolve, 2000)),
                ])
            } catch {
                // Pending outbox remains safely isolated under uid for next login
            }
        }

        await supabaseSignOut()
        clearUserScopedCache(uid, { preserveIfPendingOutbox: true })
        setStorageUser(null)
        prevUserIdRef.current = null
        setSession(null)
    }, [session?.user?.id])

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                loading,
                syncing,
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider')
    }

    return context
}
