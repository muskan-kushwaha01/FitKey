
import { supabase } from '../lib/supabase';
import {
    getStorageUserId,
    setStorageUser,
    clearUserScopedCache,
} from './storageService';
import { flushSyncOutbox, cancelScheduledFlushes } from './syncService';

// USER SIGNUP
export const signUp = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/welcome`,
        },
    });

    if (error) throw error;
    return data;
};

// LOGIN
export const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

// LOGOUT
export const signOut = async () => {
    const uid = getStorageUserId();
    cancelScheduledFlushes();

    if (uid) {
        try {
            await Promise.race([
                flushSyncOutbox(uid),
                new Promise((resolve) => setTimeout(resolve, 2000)),
            ]);
        } catch {
            // Pending outbox stays isolated under uid for next login
        }
    }

    const { error } = await supabase.auth.signOut();
    clearUserScopedCache(uid, { preserveIfPendingOutbox: true });
    setStorageUser(null);
    if (error) throw error;
};

// GET CURRENT SESSION
export const getCurrentSession = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;
    return data.session;
};

// GET CURRENT USER
export const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) throw error;
    return data.user;
};

// AUTH STATE LISTENER
export const listenToAuthChanges = (callback) => {
    return supabase.auth.onAuthStateChange(callback);
};
