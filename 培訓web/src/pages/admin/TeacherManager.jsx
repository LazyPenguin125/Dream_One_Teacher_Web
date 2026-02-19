import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, UserPlus, Shield, ShieldCheck, Trash2, Search, Clock, CheckCircle } from 'lucide-react';

const TeacherManager = () => {
    const [users, setUsers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('registered');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: 'teacher' });
    const [editingMentor, setEditingMentor] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [usersRes, invitesRes] = await Promise.all([
            supabase.from('users').select('*').order('created_at', { ascending: false }),
            supabase.from('teacher_invites').select('*').order('created_at', { ascending: false }),
        ]);
        setUsers(usersRes.data || []);
        setInvites(invitesRes.data || []);
        setLoading(false);
    };

    const handleAddInvite = async () => {
        if (!form.name || !form.email) {
            alert('請填寫姓名與 Email');
            return;
        }
        const { error } = await supabase.from('teacher_invites').insert({
            name: form.name,
            email: form.email,
            role: form.role,
        });
        if (error) {
            alert('新增失敗：' + error.message);
            return;
        }
        setForm({ name: '', email: '', role: 'teacher' });
        setShowForm(false);
        fetchData();
    };

    const handleDeleteInvite = async (id) => {
        if (!window.confirm('確定要移除這筆預先建檔？')) return;
        const { error } = await supabase.from('teacher_invites').delete().eq('id', id);
        if (error) {
            alert('刪除失敗：' + error.message);
            return;
        }
        setInvites(invites.filter(i => i.id !== id));
    };

    const handleRoleChange = async (userId, newRole) => {
        const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
        if (error) {
            alert('權限變更失敗：' + error.message);
            return;
        }
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    };

    const handleMentorSave = async (userId) => {
        const mentorName = editingMentor[userId] ?? '';
        const { error } = await supabase.from('users').update({ mentor_name: mentorName }).eq('id', userId);
        if (error) {
            alert('輔導員設定失敗：' + error.message);
            return;
        }
        setUsers(users.map(u => u.id === userId ? { ...u, mentor_name: mentorName } : u));
        const next = { ...editingMentor };
        delete next[userId];
        setEditingMentor(next);
    };

    const filteredUsers = users.filter(u =>
        !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredInvites = invites.filter(i =>
        !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-12 text-center text-slate-500">載入中...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">講師名單管理</h1>
                    <p className="text-slate-500 mt-1">管理已註冊講師與預先建檔名單</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                    <UserPlus className="w-5 h-5" /> 新增講師
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{users.length}</div>
                        <div className="text-xs font-medium text-slate-400">已註冊講師</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{invites.length}</div>
                        <div className="text-xs font-medium text-slate-400">待註冊名單</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{users.filter(u => u.role === 'admin').length}</div>
                        <div className="text-xs font-medium text-slate-400">管理員人數</div>
                    </div>
                </div>
            </div>

            {/* Add form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-blue-200 shadow-lg p-6 mb-8">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-600" /> 預先建檔（講師註冊後自動配對）
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="姓名"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value })}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="teacher">教師</option>
                            <option value="admin">管理員</option>
                        </select>
                        <button
                            onClick={handleAddInvite}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all"
                        >
                            確認新增
                        </button>
                    </div>
                </div>
            )}

            {/* Search + Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setTab('registered')}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'registered' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'}`}
                    >
                        已註冊 ({users.length})
                    </button>
                    <button
                        onClick={() => setTab('pending')}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:border-amber-300'}`}
                    >
                        待註冊 ({invites.length})
                    </button>
                </div>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜尋姓名或 Email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Registered teachers */}
            {tab === 'registered' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">姓名</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">角色</th>
                                <th className="px-6 py-4">輔導員</th>
                                <th className="px-6 py-4">註冊日期</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-900">{user.name || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            onChange={e => handleRoleChange(user.id, e.target.value)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}
                                        >
                                            <option value="teacher">教師</option>
                                            <option value="admin">管理員</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingMentor.hasOwnProperty(user.id) ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingMentor[user.id]}
                                                    onChange={e => setEditingMentor({ ...editingMentor, [user.id]: e.target.value })}
                                                    onKeyDown={e => e.key === 'Enter' && handleMentorSave(user.id)}
                                                    className="px-2 py-1 text-sm border border-blue-300 rounded-lg w-28 outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="輸入名稱"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleMentorSave(user.id)} className="text-blue-600 hover:text-blue-800">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingMentor({ ...editingMentor, [user.id]: user.mentor_name || '' })}
                                                className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                                            >
                                                {user.mentor_name || '點擊設定'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">沒有符合條件的講師</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pending invites */}
            {tab === 'pending' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">姓名</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">預設角色</th>
                                <th className="px-6 py-4">建檔日期</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvites.map(invite => (
                                <tr key={invite.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-900">{invite.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{invite.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${invite.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {invite.role === 'admin' ? '管理員' : '教師'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400">
                                        {new Date(invite.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDeleteInvite(invite.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvites.length === 0 && (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">目前沒有待註冊的講師</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TeacherManager;
