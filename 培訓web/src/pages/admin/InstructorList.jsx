import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Search, ChevronDown, ChevronUp, ExternalLink, FileImage, MapPin } from 'lucide-react';

const ROLE_LABELS = { S: 'S 級', 'A+': 'A+ 級', A: 'A 級', B: 'B 級', '實習': '實習', '職員': '職員', '工讀生': '工讀生' };
const DOC_KEYS = [
    { key: 'id_front', label: '身分證正面' },
    { key: 'id_back', label: '身分證反面' },
    { key: 'photo', label: '講師照片' },
    { key: 'bankbook', label: '存摺封面' },
];

const InstructorList = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [signedUrls, setSignedUrls] = useState({});

    useEffect(() => { loadInstructors(); }, []);

    const loadInstructors = async () => {
        const { data } = await supabase
            .from('instructors')
            .select('*')
            .order('created_at', { ascending: false });
        setInstructors(data || []);
        setLoading(false);
    };

    const toggleExpand = async (inst) => {
        if (expandedId === inst.id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(inst.id);

        if (signedUrls[inst.id]) return;

        const urls = {};
        for (const { key } of DOC_KEYS) {
            if (inst[`${key}_path`]) {
                const { data } = await supabase.storage
                    .from('instructor_uploads')
                    .createSignedUrl(inst[`${key}_path`], 3600);
                if (data?.signedUrl) urls[key] = data.signedUrl;
            }
        }
        setSignedUrls(prev => ({ ...prev, [inst.id]: urls }));
    };

    const filtered = instructors.filter(i =>
        !search ||
        i.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.email_primary?.toLowerCase().includes(search.toLowerCase()) ||
        i.phone_mobile?.includes(search)
    );

    const docCount = (inst) => DOC_KEYS.filter(d => inst[`${d.key}_path`]).length;

    if (loading) return <div className="p-12 text-center text-slate-500">載入中...</div>;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">講師資料總覽</h1>
                    <p className="text-slate-500 mt-1">共 {instructors.length} 位講師已填寫資料</p>
                </div>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="搜尋姓名、Email 或手機號碼⋯⋯"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">姓名</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">等級</th>
                            <th className="px-6 py-4">接課地區</th>
                            <th className="px-6 py-4">文件</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(inst => (
                            <InstructorRow
                                key={inst.id}
                                inst={inst}
                                expanded={expandedId === inst.id}
                                onToggle={() => toggleExpand(inst)}
                                urls={signedUrls[inst.id] || {}}
                                docCount={docCount(inst)}
                                isAdmin={isAdmin}
                                onRoleChange={async (newRole) => {
                                    const { error } = await supabase
                                        .from('instructors')
                                        .update({ instructor_role: newRole || null })
                                        .eq('id', inst.id);
                                    if (error) {
                                        alert('講師等級變更失敗：' + error.message);
                                        return;
                                    }
                                    setInstructors(prev => prev.map(i =>
                                        i.id === inst.id ? { ...i, instructor_role: newRole || null } : i
                                    ));
                                }}
                            />
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    {search ? '找不到符合的講師' : '尚無講師資料'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const InstructorRow = ({ inst, expanded, onToggle, urls, docCount, isAdmin, onRoleChange }) => (
    <>
        <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={onToggle}>
            <td className="px-6 py-4">
                <div className="font-semibold text-slate-900">{inst.full_name}</div>
                {inst.gender && <div className="text-xs text-slate-400">{inst.gender}</div>}
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">{inst.email_primary}</td>
            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                {isAdmin ? (
                    <select
                        value={inst.instructor_role || ''}
                        onChange={e => onRoleChange(e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-full border-0 outline-none cursor-pointer ${
                            inst.instructor_role ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
                        }`}
                    >
                        <option value="">未設定</option>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                ) : inst.instructor_role ? (
                    <span className="inline-flex items-center text-xs font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
                        {ROLE_LABELS[inst.instructor_role] || inst.instructor_role}
                    </span>
                ) : (
                    <span className="text-xs text-slate-400">未設定</span>
                )}
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {inst.teaching_regions?.length || 0} 個縣市
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${docCount === 4 ? 'bg-green-50 text-green-600' : docCount > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}>
                    <FileImage className="w-3 h-3" />
                    {docCount}/4
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <button className="text-slate-400 hover:text-blue-600 transition-colors">
                    {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
            </td>
        </tr>

        {expanded && (
            <tr>
                <td colSpan={6} className="px-6 py-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-900 text-sm">基本資料</h3>
                            <InfoRow label="出生年月日" value={inst.birth_date} />
                            <InfoRow label="身分證字號" value={inst.id_number ? '••••••' + inst.id_number.slice(-4) : null} />
                            <InfoRow label="手機" value={inst.phone_mobile} />
                            <InfoRow label="家電" value={inst.phone_home} />
                            <InfoRow label="Line ID" value={inst.line_id} />
                            <InfoRow label="地址" value={inst.address} />
                            <InfoRow label="備用 Email" value={inst.email_secondary} />

                            <h3 className="font-bold text-slate-900 text-sm pt-3">教學資訊</h3>
                            <InfoRow label="接課頻率（學期）" value={inst.teaching_freq_semester} />
                            <InfoRow label="接課頻率（寒暑假）" value={inst.teaching_freq_vacation} />
                            <div>
                                <span className="text-xs text-slate-400">接課地區：</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {inst.teaching_regions?.map(r => (
                                        <span key={r} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{r}</span>
                                    ))}
                                </div>
                            </div>

                            {inst.bio_notes && (
                                <>
                                    <h3 className="font-bold text-slate-900 text-sm pt-3">經歷 / 自我介紹</h3>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{inst.bio_notes}</p>
                                </>
                            )}
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 text-sm mb-3">上傳文件</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {DOC_KEYS.map(({ key, label }) => (
                                    <div key={key} className="border border-slate-200 rounded-xl p-3">
                                        <div className="text-xs font-medium text-slate-500 mb-2">{label}</div>
                                        {urls[key] ? (
                                            <a href={urls[key]} target="_blank" rel="noopener noreferrer"
                                                className="block group">
                                                <img src={urls[key]} alt={label} className="w-full h-24 object-cover rounded-lg" />
                                                <div className="flex items-center gap-1 text-xs text-blue-500 mt-1 group-hover:underline">
                                                    <ExternalLink className="w-3 h-3" /> 開啟原圖
                                                </div>
                                            </a>
                                        ) : (
                                            <div className="w-full h-24 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                                                未上傳
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        )}
    </>
);

const InfoRow = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-2 text-sm">
            <span className="text-slate-400 whitespace-nowrap min-w-[100px]">{label}：</span>
            <span className="text-slate-700">{value}</span>
        </div>
    );
};

export default InstructorList;
