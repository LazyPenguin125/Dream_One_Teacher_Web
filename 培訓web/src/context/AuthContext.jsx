import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const profileFetchedRef = useRef(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            console.warn('Auth loading timeout — forcing loading=false');
            setLoading(false);
        }, 6000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth event:', _event, session?.user?.id);
            setUser(session?.user ?? null);
            if (session?.user) {
                if (!profileFetchedRef.current || _event === 'SIGNED_IN') {
                    profileFetchedRef.current = true;
                    await fetchProfile(session.user.id);
                }
            } else {
                setProfile(null);
                profileFetchedRef.current = false;
            }
            clearTimeout(timeoutId);
            setLoading(false);
        });

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);


    const fetchProfile = async (userId) => {
        if (!userId) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                if (!error.message?.includes('aborted')) {
                    console.warn('Profile fetch error:', error.message);
                }
                // Stop! Do not fall through to default logic if there was an error
                return;
            }

            if (data) {
                console.log('Profile fetched:', data.role);
                setProfile(data);
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
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
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
        <AuthContext.Provider value={{ user, profile, signInWithGoogle, signUpWithEmail, signInWithEmail, signOut, refreshProfile: fetchProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
