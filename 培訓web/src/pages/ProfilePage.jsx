import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Save, Upload, X, User, Phone, GraduationCap, FileText, CreditCard, Camera, Landmark, Pencil, PartyPopper, FileSignature, CheckCircle2, Download, Eye, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const TW_REGIONS = {
    '北部': ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
    '中部': ['臺中市', '苗栗縣', '彰化縣', '南投縣', '雲林縣'],
    '南部': ['臺南市', '高雄市', '嘉義市', '嘉義縣', '屏東縣'],
    '東部': ['花蓮縣', '臺東縣'],
    '離島': ['澎湖縣', '金門縣', '連江縣'],
};

const ROLE_OPTIONS = [
    { value: 'S', label: 'S 級' },
    { value: 'A+', label: 'A+ 級' },
    { value: 'A', label: 'A 級' },
    { value: 'B', label: 'B 級' },
    { value: '實習', label: '實習' },
    { value: '職員', label: '職員' },
    { value: '工讀生', label: '工讀生' },
];

const DOC_TYPES = [
    { key: 'id_front', label: '身分證正面', Icon: CreditCard },
    { key: 'id_back', label: '身分證反面', Icon: CreditCard },
    { key: 'bankbook', label: '存摺封面', Icon: Landmark },
];

const REQUIRED_FIELDS = [
    { key: 'full_name', label: '姓名' },
    { key: 'nickname', label: '講師暱稱' },
    { key: 'gender', label: '性別' },
    { key: 'birth_date', label: '出生年月日' },
    { key: 'id_number', label: '身分證字號' },
    { key: 'phone_mobile', label: '手機號碼' },
    { key: 'line_id', label: 'Line ID' },
    { key: 'address', label: '通訊地址' },
    { key: 'email_primary', label: '主要 Email' },
    { key: 'instructor_role', label: '講師等級' },
    { key: 'teaching_freq_semester', label: '接課頻率（學期間）' },
    { key: 'teaching_freq_vacation', label: '接課頻率（寒暑假）' },
    { key: 'bio_notes', label: '經歷 / 理念' },
];

const INITIAL_FORM = {
    full_name: '', nickname: '', gender: '', birth_date: '', id_number: '',
    phone_mobile: '', phone_home: '', line_id: '', address: '',
    email_primary: '', email_secondary: '',
    instructor_role: '', teaching_freq_semester: '', teaching_freq_vacation: '',
    teaching_regions: [],
    bio_notes: '',
    photo_path: null, photo_mime: null, photo_size: null, photo_uploaded_at: null,
    id_front_path: null, id_front_mime: null, id_front_size: null, id_front_uploaded_at: null,
    id_back_path: null, id_back_mime: null, id_back_size: null, id_back_uploaded_at: null,
    bankbook_path: null, bankbook_mime: null, bankbook_size: null, bankbook_uploaded_at: null,
};

const ProfilePage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);
    const [filePreviews, setFilePreviews] = useState({});
    const [uploading, setUploading] = useState({});
    const fileRefs = useRef({});
    const [contractInfo, setContractInfo] = useState(null);
    const [latestDocVersions, setLatestDocVersions] = useState(null);

    useEffect(() => {
        if (user) {
            loadProfile();
            loadContractStatus();
        }
    }, [user]);

    const loadContractStatus = async () => {
        try {
            const { data: contractData } = await supabase
                .from('instructor_contracts')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'signed')
                .order('signed_at', { ascending: false })
                .limit(1);
            if (contractData?.length) setContractInfo(contractData[0]);

            const { data: docsData } = await supabase
                .from('contract_documents')
                .select('doc_type, version')
                .eq('is_active', true);
            if (docsData?.length) {
                const versions = {};
                docsData.forEach(d => { versions[d.doc_type] = d.version; });
                setLatestDocVersions(versions);
            }
        } catch (e) { /* ignore */ }
    };

    const loadProfile = async () => {
        const { data } = await supabase
            .from('instructors')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data) {
            setIsFirstTime(false);
            const formData = {};
            for (const key of Object.keys(INITIAL_FORM)) {
                formData[key] = data[key] ?? INITIAL_FORM[key];
            }
            setForm(formData);

            const previews = {};
            const allDocKeys = ['photo', ...DOC_TYPES.map(d => d.key)];
            for (const key of allDocKeys) {
                if (data[`${key}_path`]) {
                    const { data: urlData } = await supabase.storage
                        .from('instructor_uploads')
                        .createSignedUrl(data[`${key}_path`], 3600);
                    if (urlData?.signedUrl) previews[key] = urlData.signedUrl;
                }
            }
            setFilePreviews(previews);
        } else {
            setIsFirstTime(true);
            setForm(prev => ({
                ...prev,
                full_name: profile?.name || '',
                email_primary: user.email || '',
            }));
        }
        setLoading(false);
    };

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const toggleRegion = (county) => {
        setForm(prev => ({
            ...prev,
            teaching_regions: prev.teaching_regions.includes(county)
                ? prev.teaching_regions.filter(r => r !== county)
                : [...prev.teaching_regions, county],
        }));
    };

    const selectAllInArea = (counties) => {
        setForm(prev => {
            const current = new Set(prev.teaching_regions);
            const allSelected = counties.every(c => current.has(c));
            if (allSelected) counties.forEach(c => current.delete(c));
            else counties.forEach(c => current.add(c));
            return { ...prev, teaching_regions: [...current] };
        });
    };

    const handleFileUpload = async (docType, file) => {
        if (!file.type.startsWith('image/')) {
            alert('僅接受圖片檔案（JPEG、PNG、GIF、WebP）');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('檔案大小不可超過 20MB');
            return;
        }

        setUploading(prev => ({ ...prev, [docType]: true }));

        if (form[`${docType}_path`]) {
            await supabase.storage.from('instructor_uploads').remove([form[`${docType}_path`]]);
        }

        const ext = file.name.split('.').pop();
        const path = `instructors/${user.id}/${docType}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
            .from('instructor_uploads')
            .upload(path, file);

        if (error) {
            alert('上傳失敗：' + error.message);
            setUploading(prev => ({ ...prev, [docType]: false }));
            return;
        }

        setForm(prev => ({
            ...prev,
            [`${docType}_path`]: path,
            [`${docType}_mime`]: file.type,
            [`${docType}_size`]: file.size,
            [`${docType}_uploaded_at`]: new Date().toISOString(),
        }));
        setFilePreviews(prev => ({ ...prev, [docType]: URL.createObjectURL(file) }));
        setUploading(prev => ({ ...prev, [docType]: false }));
    };

    const handleRemoveFile = async (docType) => {
        if (form[`${docType}_path`]) {
            await supabase.storage.from('instructor_uploads').remove([form[`${docType}_path`]]);
        }
        setForm(prev => ({
            ...prev,
            [`${docType}_path`]: null, [`${docType}_mime`]: null,
            [`${docType}_size`]: null, [`${docType}_uploaded_at`]: null,
        }));
        setFilePreviews(prev => {
            const next = { ...prev };
            delete next[docType];
            return next;
        });
    };

    const handleSave = async () => {
        const missing = REQUIRED_FIELDS.filter(f => !form[f.key]?.toString().trim());
        if (missing.length > 0) {
            alert('以下欄位為必填：\n' + missing.map(f => `• ${f.label}`).join('\n'));
            return;
        }
        if (!form.teaching_regions?.length) {
            alert('請至少選擇一個接課地區');
            return;
        }
        if (!form.photo_path) {
            alert('請上傳大頭照 / 自拍照');
            return;
        }
        const missingDocs = DOC_TYPES.filter(d => !form[`${d.key}_path`]);
        if (missingDocs.length > 0) {
            alert('以下文件尚未上傳：\n' + missingDocs.map(d => `• ${d.label}`).join('\n'));
            return;
        }

        setSaving(true);
        const payload = {
            user_id: user.id,
            ...form,
            instructor_role: form.instructor_role || null,
        };

        const { error } = await supabase
            .from('instructors')
            .upsert(payload, { onConflict: 'user_id' });

        if (error) {
            alert('儲存失敗：' + error.message);
            setSaving(false);
            return;
        }

        if (profile?.role === 'pending' && isFirstTime) {
            setShowSuccess(true);
        } else if (profile?.role === 'pending') {
            navigate('/pending');
        } else {
            alert('個人資料已儲存！');
        }
        setSaving(false);
    };

    if (loading) return <div className="p-12 text-center text-slate-500 text-lg">載入中...</div>;

    const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-colors';
    const selectCls = inputCls + ' bg-white';

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* ── 首次註冊提示 ── */}
            {isFirstTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <Save className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-blue-800 font-medium">
                        填寫完下方資料後才算完成註冊，請務必填寫所有必填欄位並按下「送出資料」。
                    </p>
                </div>
            )}

            {/* ── Header with Avatar ── */}
            <div className="mb-8 flex items-center gap-6">
                <div className="relative shrink-0">
                    <div className="w-28 h-28 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                        {filePreviews.photo ? (
                            <img src={filePreviews.photo} alt="大頭照" className="w-full h-full object-cover" />
                        ) : (
                            <Camera className="w-10 h-10 text-slate-300" />
                        )}
                    </div>
                    {uploading.photo ? (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileRefs.current.photo?.click()}
                            className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors border-2 border-white"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    <input
                        ref={el => (fileRefs.current.photo = el)}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                            if (e.target.files[0]) handleFileUpload('photo', e.target.files[0]);
                            e.target.value = '';
                        }}
                    />
                    {filePreviews.photo && (
                        <button
                            onClick={() => handleRemoveFile('photo')}
                            className="absolute top-0 right-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900">
                        {isFirstTime ? '歡迎加入！' : '個人資料'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {isFirstTime
                            ? '請先上傳大頭照並填寫以下完整資料，完成後即可送出審核。'
                            : '查看與編輯您的個人資料，所有欄位皆為必填。'}
                    </p>
                    {!filePreviews.photo && (
                        <p className="text-red-500 text-sm mt-1 font-medium">← 請先上傳大頭照 / 自拍照</p>
                    )}
                </div>
            </div>

            {/* ── 基本資料 ── */}
            <Section icon={User} title="基本資料">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="姓名" required>
                        <input type="text" value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} className={inputCls} placeholder="請輸入姓名" />
                    </Field>
                    <Field label="講師暱稱" required>
                        <input type="text" value={form.nickname} onChange={e => handleChange('nickname', e.target.value)} className={inputCls} placeholder="留言區顯示用暱稱" />
                    </Field>
                    <Field label="性別" required>
                        <select value={form.gender} onChange={e => handleChange('gender', e.target.value)} className={selectCls}>
                            <option value="">請選擇</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                            <option value="其他">其他</option>
                        </select>
                    </Field>
                    <Field label="出生年月日" required>
                        <input type="date" value={form.birth_date} onChange={e => handleChange('birth_date', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="身分證字號" required>
                        <input type="text" value={form.id_number} onChange={e => handleChange('id_number', e.target.value)} className={inputCls} placeholder="A123456789" />
                    </Field>
                </div>
            </Section>

            {/* ── 聯絡方式 ── */}
            <Section icon={Phone} title="聯絡方式">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="手機號碼" required>
                        <input type="tel" value={form.phone_mobile} onChange={e => handleChange('phone_mobile', e.target.value)} className={inputCls} placeholder="0912-345-678" />
                    </Field>
                    <Field label="家用電話">
                        <input type="tel" value={form.phone_home} onChange={e => handleChange('phone_home', e.target.value)} className={inputCls} placeholder="02-1234-5678" />
                    </Field>
                    <Field label="Line ID" required>
                        <input type="text" value={form.line_id} onChange={e => handleChange('line_id', e.target.value)} className={inputCls} />
                    </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Field label="主要 Email" required>
                        <input type="email" value={form.email_primary} onChange={e => handleChange('email_primary', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="備用 Email">
                        <input type="email" value={form.email_secondary} onChange={e => handleChange('email_secondary', e.target.value)} className={inputCls} />
                    </Field>
                </div>
                <div className="mt-4">
                    <Field label="通訊地址" required>
                        <input type="text" value={form.address} onChange={e => handleChange('address', e.target.value)} className={inputCls} placeholder="請輸入通訊地址" />
                    </Field>
                </div>
            </Section>

            {/* ── 教學資訊 ── */}
            <Section icon={GraduationCap} title="教學資訊">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="講師等級" required>
                        {!isFirstTime && form.instructor_role ? (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center text-sm font-bold bg-purple-50 text-purple-600 px-4 py-2.5 rounded-xl">
                                    {ROLE_OPTIONS.find(r => r.value === form.instructor_role)?.label || form.instructor_role}
                                </span>
                                <span className="text-xs text-slate-400">（如需變更請聯繫管理員）</span>
                            </div>
                        ) : (
                            <select value={form.instructor_role} onChange={e => handleChange('instructor_role', e.target.value)} className={selectCls}>
                                <option value="">請選擇</option>
                                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        )}
                    </Field>
                    <Field label="接課頻率（學期間）" required>
                        <input type="text" value={form.teaching_freq_semester} onChange={e => handleChange('teaching_freq_semester', e.target.value)} className={inputCls} placeholder="例：每週 2-3 次" />
                    </Field>
                    <Field label="接課頻率（寒暑假）" required>
                        <input type="text" value={form.teaching_freq_vacation} onChange={e => handleChange('teaching_freq_vacation', e.target.value)} className={inputCls} placeholder="例：每週 5 次" />
                    </Field>
                </div>

                <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        可接課地區 <span className="text-red-500">*</span>
                        <span className="ml-2 text-xs text-slate-400">（已選 {form.teaching_regions.length} 個縣市）</span>
                    </label>
                    <div className="space-y-4">
                        {Object.entries(TW_REGIONS).map(([area, counties]) => {
                            const allSelected = counties.every(c => form.teaching_regions.includes(c));
                            return (
                                <div key={area} className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => selectAllInArea(counties)}
                                            className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${allSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-300 hover:border-blue-400'}`}
                                        >
                                            {allSelected ? '✓ 全選' : '全選'}
                                        </button>
                                        <span className="text-sm font-bold text-slate-600">{area}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {counties.map(county => (
                                            <label key={county}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors border ${form.teaching_regions.includes(county) ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'}`}
                                            >
                                                <input type="checkbox" className="sr-only"
                                                    checked={form.teaching_regions.includes(county)}
                                                    onChange={() => toggleRegion(county)} />
                                                {county}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Section>

            {/* ── 經歷與自我介紹 ── */}
            <Section icon={FileText} title="經歷與自我介紹">
                <Field label="教學經歷 / 教學理念 / 想說的話" required>
                    <textarea
                        value={form.bio_notes}
                        onChange={e => handleChange('bio_notes', e.target.value)}
                        rows={6}
                        className={inputCls + ' resize-y'}
                        placeholder="請分享您的教學經歷、理念，或任何想說的話⋯⋯"
                    />
                </Field>
            </Section>

            {/* ── 文件上傳 ── */}
            <Section icon={Upload} title="文件上傳">
                <p className="text-sm text-slate-500 mb-4">以下文件皆為必填，支援 JPEG、PNG、GIF、WebP 格式，單檔上限 20MB</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {DOC_TYPES.map(({ key, label, Icon }) => (
                        <div key={key} className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
                            <div className="text-sm font-medium text-slate-700 mb-3 flex items-center justify-center gap-1.5">
                                <Icon className="w-4 h-4 text-slate-400" /> {label} <span className="text-red-500">*</span>
                            </div>

                            {filePreviews[key] ? (
                                <div className="relative group">
                                    <img src={filePreviews[key]} alt={label} className="w-full h-32 object-cover rounded-lg" />
                                    <button
                                        onClick={() => handleRemoveFile(key)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    {form[`${key}_size`] && (
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            {(form[`${key}_size`] / 1024 / 1024).toFixed(1)} MB
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileRefs.current[key]?.click()}
                                    disabled={uploading[key]}
                                    className="w-full h-32 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 transition-colors rounded-lg"
                                >
                                    {uploading[key] ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs">上傳中⋯</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8" />
                                            <span className="text-xs">點擊上傳</span>
                                        </>
                                    )}
                                </button>
                            )}

                            <input
                                ref={el => (fileRefs.current[key] = el)}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                    if (e.target.files[0]) handleFileUpload(key, e.target.files[0]);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── 儲存按鈕 ── */}
            <div className="flex justify-end mt-8 mb-12">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-5 h-5" />
                    {saving ? '儲存中⋯' : isFirstTime ? '送出資料' : '儲存個人資料'}
                </button>
            </div>

            {/* ── 簽約狀態 ── */}
            {!isFirstTime && (
                <Section icon={FileSignature} title="合約簽署">
                    {contractInfo ? (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <div className="font-bold text-green-700 text-sm">已簽約</div>
                                    <div className="text-xs text-slate-400">
                                        {new Date(contractInfo.signed_at).toLocaleDateString('zh-TW')} 簽署
                                    </div>
                                </div>
                            </div>

                            {latestDocVersions && (() => {
                                const signedVersions = contractInfo.doc_versions || {
                                    rules: contractInfo.rules_doc_version,
                                    compensation: contractInfo.compensation_doc_version,
                                    contract: contractInfo.contract_doc_version,
                                };
                                const hasUpdate = Object.entries(latestDocVersions).some(
                                    ([k, v]) => (signedVersions[k] || 0) < v
                                );
                                return hasUpdate;
                            })() && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                                    <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-amber-700">
                                        合約文件已更新為新版本，建議您<Link to="/contract" className="font-bold text-blue-600 hover:underline">重新簽約</Link>以確認最新內容。
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    to={`/contract/view/${contractInfo.id}`}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                >
                                    <Eye className="w-4 h-4" /> 查看合約
                                </Link>
                                <Link
                                    to="/contract"
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                                >
                                    <FileSignature className="w-4 h-4" /> 重新簽約
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSignature className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">尚未簽約</h3>
                            <p className="text-sm text-slate-500 mb-5">請完成線上合約簽署程序</p>
                            <Link
                                to="/contract"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <FileSignature className="w-4 h-4" /> 前往簽約
                            </Link>
                        </div>
                    )}
                </Section>
            )}

            {/* ── 註冊完成彈窗 ── */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            <PartyPopper className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-3">恭喜你完成註冊！</h2>
                        <p className="text-slate-600 mb-2">
                            你的個人資料已成功送出，目前正在等待管理員審核。
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-5 text-left">
                            <p className="text-amber-800 text-sm font-medium">
                                請在<strong>「夢想一號講師個人群組」</strong>中通知管理員您已完成註冊，以加速審核流程。
                            </p>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">
                            審核通過後即可瀏覽所有培訓課程內容。
                        </p>
                        <button
                            onClick={() => { setShowSuccess(false); navigate('/pending'); }}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                            我知道了
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" /> {title}
        </h2>
        {children}
    </div>
);

const Field = ({ label, required, children }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

export default ProfilePage;
