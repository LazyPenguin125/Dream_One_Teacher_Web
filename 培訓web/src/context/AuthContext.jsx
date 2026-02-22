import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [instructorProfile, setInstructorProfile] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const profileFetchedRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        // 用 getSession 做初始載入，避免 onAuthStateChange 觸發兩次造成 AbortError
        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted) return;
                if (session?.user) {
                    setUser(session.user);
                    profileFetchedRef.current = true;
                    await fetchProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Init auth error:', err);
                if (isMounted) setLoading(false);
            }
        };

        initializeAuth();

        // 只監聽後續的 SIGNED_IN / SIGNED_OUT，不處理 INITIAL_SESSION
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            if (_event === 'INITIAL_SESSION') return; // 已由 getSession 處理

            console.log('Auth event:', _event, session?.user?.id);

            if (_event === 'SIGNED_IN' && session?.user) {
                setUser(session.user);
                // 只有尚未 fetch 過，或真的是新登入才重新 fetch
                if (!profileFetchedRef.current) {
                    profileFetchedRef.current = true;
                    fetchProfile(session.user.id);
                }
            } else if (_event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setInstructorProfile(null);
                setAvatarUrl(null);
                profileFetchedRef.current = false;
                setLoading(false);
            } else if (_event === 'TOKEN_REFRESHED' && session?.user) {
                setUser(session.user);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);


    const fetchProfile = async (userId, retryCount = 0) => {
        if (!userId) {
            setLoading(false);
            return;
        }
        let shouldRetry = false;
        try {
            // 短暫延遲讓 Supabase session 穩定
            await new Promise(r => setTimeout(r, retryCount === 0 ? 300 : 800 * retryCount));
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                const isAbortError = error.message?.toLowerCase().includes('abort') || error.message?.toLowerCase().includes('signal');
                if (isAbortError && retryCount < 3) {
                    console.warn(`Profile fetch aborted, retrying (${retryCount + 1}/3)...`);
                    shouldRetry = true;
                    return;
                }
                console.warn('Profile fetch error:', error.message);
                return;
            }

            if (data) {
                // 如果現有 role 是 pending，檢查是否有 teacher_invites 可以升級
                if (data.role === 'pending') {
                    const { data: invite } = await supabase
                        .from('teacher_invites')
                        .select('role')
                        .eq('email', data.email)
                        .maybeSingle();
                    if (invite && invite.role && invite.role !== 'pending') {
                        await supabase.from('users').update({ role: invite.role }).eq('id', userId);
                        await supabase.from('teacher_invites').delete().eq('email', data.email);
                        data = { ...data, role: invite.role };
                        console.log('Role upgraded from invite:', invite.role);
                    }
                }
                console.log('Profile fetched:', data.role);
                setProfile(data);
                // Fetch instructor profile for display name & avatar
                const { data: instrData } = await supabase
                    .from('instructors')
                    .select('full_name, nickname, photo_path')
                    .eq('user_id', userId)
                    .maybeSingle();
                if (instrData) {
                    setInstructorProfile(instrData);
                    if (instrData.photo_path) {
                        const { data: urlData } = await supabase.storage
                            .from('instructor_uploads')
                            .createSignedUrl(instrData.photo_path, 7200);
                        setAvatarUrl(urlData?.signedUrl || null);
                    } else {
                        setAvatarUrl(null);
                    }
                } else {
                    setInstructorProfile(null);
                    setAvatarUrl(null);
                }
            } else {
                console.log('No profile row found, checking teacher_invites...');
                const currentUser = (await supabase.auth.getUser()).data?.user;
                const email = currentUser?.email;

                if (email) {
                    const { data: invite } = await supabase
                        .from('teacher_invites')
                        .select('*')
                        .eq('email', email)
                        .maybeSingle();

                    if (invite) {
                        const { error: insertErr } = await supabase.from('users').insert({
                            id: userId,
                            name: invite.name || currentUser.user_metadata?.full_name,
                            email,
                            role: invite.role,
                        });
                        if (!insertErr) {
                            await supabase.from('teacher_invites').delete().eq('email', email);
                            console.log('Profile created from invite:', invite.role);
                            setProfile({ id: userId, name: invite.name, email, role: invite.role });
                            return;
                        }
                    }
                }

                console.log('No invite found, creating pending user entry...');
                const { error: createErr } = await supabase.from('users').insert({
                    id: userId,
                    name: currentUser?.user_metadata?.full_name || null,
                    email: email || currentUser?.email,
                    role: 'pending',
                });
                if (createErr && !createErr.message?.includes('duplicate')) {
                    console.warn('Failed to create user entry:', createErr.message);
                }
                setProfile({ id: userId, email, role: 'pending' });
            }
        } catch (err) {
            const isAbortErr = err?.name === 'AbortError' || err?.message?.toLowerCase().includes('abort');
            if (isAbortErr && retryCount < 3) {
                console.warn(`Profile fetch caught AbortError, retrying (${retryCount + 1}/3)...`);
                shouldRetry = true;
                return;
            }
            console.error('Fetch error:', err);
        } finally {
            if (shouldRetry) {
                // 延遲後重試，維持 loading=true 狀態
                setTimeout(() => fetchProfile(userId, retryCount + 1), 800);
            } else {
                setLoading(false);
            }
        }
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const signUpWithEmail = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const signInWithEmail = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
    };

    const signOut = async () => {
        console.log('Attempting to sign out...');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Logout error:', error.message);
            } else {
                console.log('Logout successful');
                // Force a reload as a fallback to ensure state is clean
                window.location.href = '/';
            }
        } catch (err) {
            console.error('Unexpected logout error:', err);
            window.location.href = '/';
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, instructorProfile, avatarUrl, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, refreshProfile: fetchProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
