import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { LogIn, LogOut, BookOpen, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    const { user, profile, signInWithGoogle, signOut, refreshProfile } = useAuth();

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
                        <div
                            role="img"
                            aria-label="夢想一號 Logo"
                            style={{
                                width: 40,
                                height: 40,
                                flexShrink: 0,
                                backgroundImage: 'url(/logo.png)',
                                backgroundSize: '120% auto',
                                backgroundPosition: 'center 5%',
                                backgroundRepeat: 'no-repeat',
                            }}
                        />
                        教師培訓平台
                    </Link>

                    <nav className="flex items-center gap-6">
                        {user ? (
                            <>
                                {profile?.role !== 'pending' && (
                                    <Link to="/courses" className="text-slate-600 hover:text-blue-600 font-medium">我的課程</Link>
                                )}
                                {profile?.role === 'admin' && (
                                    <Link to="/admin" className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium">
                                        <LayoutDashboard className="w-4 h-4" />
                                        後台管理
                                    </Link>
                                )}
                                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm text-slate-500">{user.email}</span>
                                        <span className="text-[10px] text-slate-300 font-mono scale-75 origin-right">{user.id}</span>
                                        <button
                                            onClick={() => refreshProfile(user.id)}
                                            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-tighter underline"
                                            title="點擊重新整理身分"
                                        >
                                            身分: {profile?.role || '載入中...'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={signOut}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <LoginForm />
                        )}
                    </nav>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full">
                {children}
            </main>

            <footer className="bg-white border-t border-slate-200 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
                    © 2026 教師培訓學習與進度追蹤平台. All rights reserved.
                </div>
            </footer>
            {user && <DebugRoleChecker userId={user.id} />}
        </div>
    );
};

const LoginForm = () => {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password, name);
                alert('註冊成功！請直接登入。');
                setIsLogin(true);
            }
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
                {!isLogin && (
                    <input
                        type="text"
                        placeholder="姓名"
                        className="px-3 py-1.5 border rounded-lg text-sm w-24 bg-white"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                )}
                <input
                    type="email"
                    placeholder="信箱"
                    className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="密碼"
                    className="px-3 py-1.5 border rounded-lg text-sm w-32 bg-white"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-bold transition-all">
                    {isLogin ? '登入' : '註冊'}
                </button>
            </form>
            <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-slate-400 hover:text-blue-600 underline"
            >
                {isLogin ? '切換註冊' : '切換登入'}
            </button>
            <div className="w-px h-4 bg-slate-200 mx-2" />
            <button
                onClick={signInWithGoogle}
                className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                title="Google 登入 (暫不可用)"
            >
                <LogIn className="w-5 h-5" />
            </button>
        </div>
    );
};

const DebugRoleChecker = ({ userId }) => {
    const [status, setStatus] = useState('checking');
    const [dbRole, setDbRole] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userId) check();
    }, [userId]);

    const check = async () => {
        setStatus('checking');
        setError(null);
        try {
            console.log('Debug checking for:', userId);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                if (error.message?.includes('aborted')) {
                    // Ignore aborts in debug too
                    setStatus('checking');
                } else {
                    setError(error.message);
                    setStatus('error');
                }
            } else if (data) {
                setDbRole(data.role);
                setStatus('found');
            } else {
                setStatus('not_found');
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
            <h3 className="font-bold text-yellow-400 mb-2">🔍 身分診斷器</h3>
            <div className="space-y-1 mb-3">
                <p>登入 ID: <span className="text-blue-300">{userId || '無'}</span></p>
                <p>資料庫狀態:
                    {status === 'checking' && <span className="text-yellow-300"> 檢查中...</span>}
                    {status === 'found' && <span className="text-green-400"> ✅ 找到資料 (Role: {dbRole})</span>}
                    {status === 'not_found' && <span className="text-red-400"> ❌ 資料庫無此人</span>}
                    {status === 'error' && <span className="text-red-500"> ⚠️ 錯誤: {error}</span>}
                </p>
            </div>
            <button
                onClick={check}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded w-full"
            >
                點我檢查
            </button>
        </div>
    );
};

export default Layout;
