import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 超時保護：最多等 6 秒，否則強制結束 loading
        const timeoutId = setTimeout(() => {
            console.warn('Auth loading timeout — forcing loading=false');
            setLoading(false);
        }, 6000);

        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) console.warn('getSession error:', error.message);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error('getSession threw:', err);
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
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

                console.log('Defaulting to pending');
                setProfile({ role: 'pending' });
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
