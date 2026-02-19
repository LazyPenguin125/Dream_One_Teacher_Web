import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, ChevronLeft, Plus, Trash2, FileText, Video, Edit3, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// ─── Quill toolbar config ──────────────────────────────────────────────────
const QUILL_MODULES = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
    ],
};

// ─── YouTube URL → embed URL 轉換 ──────────────────────────────────────────
const toEmbedUrl = (url) => {
    if (!url) return '';
    try {
        const u = new URL(url);
        // 已經是 embed 格式
        if (u.pathname.startsWith('/embed/')) return url;
        // https://www.youtube.com/watch?v=VIDEO_ID
        if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.searchParams.get('v')) {
            return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
        }
        // https://youtu.be/VIDEO_ID
        if (u.hostname === 'youtu.be' && u.pathname.length > 1) {
            return `https://www.youtube.com/embed${u.pathname}`;
        }
        // https://www.youtube.com/shorts/VIDEO_ID
        if (u.pathname.startsWith('/shorts/')) {
            return `https://www.youtube.com/embed/${u.pathname.replace('/shorts/', '')}`;
        }
    } catch {
        // 不是合法 URL，原封回傳
    }
    return url;
};

// ─── Main Component ────────────────────────────────────────────────────────
const EditorComponent = ({ lessonId, onBack }) => {
    const [lessonTitle, setLessonTitle] = useState('');
    const [blocks, setBlocks] = useState([]);     // { id, type, title, body, video_url, order, isNew }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ── Fetch all content blocks ──
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: lesson } = await supabase
                    .from('lessons')
                    .select('title')
                    .eq('id', lessonId)
                    .single();
                if (lesson) setLessonTitle(lesson.title);

                const { data: contents } = await supabase
                    .from('contents')
                    .select('*')
                    .eq('lesson_id', lessonId)
                    .order('order', { ascending: true });

                setBlocks(contents || []);
            } catch (err) {
                console.error('fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        if (lessonId) fetchData();
    }, [lessonId]);

    // ── Update a block's field ──
    const updateBlock = (id, field, value) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    // ── Add article block ──
    const addArticleBlock = () => {
        const newOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order ?? 0)) + 1 : 0;
        const tempId = `new_${Date.now()}`;
        const newBlock = { id: tempId, type: 'article', title: '文字區塊', body: '', order: newOrder, isNew: true };
        setBlocks(prev => [...prev, newBlock]);
    };

    // ── Add video block ──
    const addVideoBlock = () => {
        const newOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order ?? 0)) + 1 : 0;
        const tempId = `new_${Date.now()}`;
        const newBlock = { id: tempId, type: 'video', title: '影片區塊', video_url: '', body: '', order: newOrder, isNew: true };
        setBlocks(prev => [...prev, newBlock]);
    };

    // ── Save all blocks ──
    const handleSaveAll = async () => {
        setSaving(true);

        try {
            const newBlocks = blocks.filter(b => b.isNew);
            const existingBlocks = blocks.filter(b => !b.isNew);

            for (const b of newBlocks) {
                const payload = {
                    lesson_id: lessonId,
                    type: b.type === 'text' ? 'article' : b.type,
                    title: b.title || '',
                    body: b.body || '',
                    video_url: b.video_url || null,
                    order: b.order,
                    status: 'draft',
                };

                const { error } = await supabase
                    .from('contents')
                    .insert(payload);

                if (error) throw error;
            }

            for (const b of existingBlocks) {
                const payload = {
                    type: b.type === 'text' ? 'article' : b.type,
                    title: b.title || '',
                    body: b.body || '',
                    video_url: b.video_url || null,
                    order: b.order,
                };

                const { error } = await supabase
                    .from('contents')
                    .update(payload)
                    .eq('id', b.id);

                if (error) throw error;
            }

            // 儲存成功後重新從資料庫載入最新資料
            const { data: refreshed } = await supabase
                .from('contents')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order', { ascending: true });

            setBlocks(refreshed || []);
            alert('所有內容已儲存成功！');
        } catch (err) {
            console.error('儲存失敗:', err);
            alert('儲存失敗：' + (err?.message || JSON.stringify(err)));
        } finally {
            setSaving(false);
        }
    };

    // ── Delete block ──
    const handleDelete = async (blockId, isNew) => {
        if (!window.confirm('確定要刪除此區塊嗎？')) return;

        if (!isNew) {
            const { error } = await supabase.from('contents').delete().eq('id', blockId);
            if (error) {
                alert('刪除失敗：' + error.message);
                return;
            }
        }
        setBlocks(prev => prev.filter(b => b.id !== blockId));
    };

    if (loading) return <div className="p-12 text-center text-slate-500 font-bold">載入課程內容中...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* ── Top bar ── */}
            <div className="bg-white border-b border-slate-200 flex items-center justify-between px-6 py-4 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">CMS 編輯模式</div>
                        <div className="font-black text-slate-900 text-xl leading-tight">{lessonTitle}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={addArticleBlock}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all font-bold text-sm shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> 新增文字
                    </button>
                    <button
                        onClick={addVideoBlock}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:border-purple-500 hover:text-purple-600 transition-all font-bold text-sm shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> 新增影片
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 font-black text-sm active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </div>

            {/* ── Content area ── */}
            <div className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                    {blocks.length === 0 && (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
                            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Edit3 className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-black text-lg mb-2">目前沒有內容</h3>
                            <p className="text-slate-400 text-sm mb-6">點擊上方按鈕開始新增您的教學內容</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={addArticleBlock} className="text-blue-600 font-bold text-sm hover:underline">+ 加入文字內容</button>
                                <span className="text-slate-200">|</span>
                                <button onClick={addVideoBlock} className="text-purple-600 font-bold text-sm hover:underline">+ 加入影音教材</button>
                            </div>
                        </div>
                    )}

                    {blocks.map((block, index) => (
                        <div
                            key={block.id}
                            className={`bg-white rounded-3xl border ${block.isNew ? 'border-blue-200 shadow-blue-100/50' : 'border-slate-200'} shadow-sm overflow-hidden group transition-all hover:shadow-md`}
                        >
                            {/* Block Header */}
                            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                                        <GripVertical className="w-4 h-4 text-slate-300" />
                                        <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                            #{index + 1} {block.type === 'video' ? 'VIDEO' : 'ARTICLE'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={block.title}
                                        onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                                        placeholder="請輸入區塊標題..."
                                        className="bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-300 w-64 focus:ring-0"
                                    />
                                    {block.isNew && <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">NEW</span>}
                                </div>
                                <button
                                    onClick={() => handleDelete(block.id, block.isNew)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Block Content */}
                            <div className="p-6">
                                {block.type === 'video' ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                                            <Video className="w-5 h-5 text-purple-500" />
                                            <input
                                                type="url"
                                                value={block.video_url || ''}
                                                onChange={(e) => updateBlock(block.id, 'video_url', e.target.value)}
                                                onBlur={(e) => {
                                                    const converted = toEmbedUrl(e.target.value);
                                                    if (converted !== e.target.value) updateBlock(block.id, 'video_url', converted);
                                                }}
                                                onPaste={(e) => {
                                                    setTimeout(() => {
                                                        const val = e.target.value;
                                                        const converted = toEmbedUrl(val);
                                                        if (converted !== val) updateBlock(block.id, 'video_url', converted);
                                                    }, 0);
                                                }}
                                                placeholder="貼上 YouTube 連結（任何格式皆可）"
                                                className="flex-1 bg-transparent border-none outline-none text-sm font-mono focus:ring-0"
                                            />
                                        </div>
                                        {block.video_url ? (
                                            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-inner ring-1 ring-slate-200">
                                                <iframe
                                                    src={toEmbedUrl(block.video_url)}
                                                    title={block.title}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-video bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-200">
                                                <PlaySquare className="w-10 h-10 opacity-20" />
                                                <p className="text-xs font-bold">預覽區域：請輸入有效的嵌入連結</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="quill-minimal-editor">
                                        <ReactQuill
                                            theme="snow"
                                            value={block.body || ''}
                                            onChange={(val) => updateBlock(block.id, 'body', val)}
                                            modules={QUILL_MODULES}
                                            placeholder="在此輸入您的文章內容..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add More button at bottom */}
                    {blocks.length > 0 && (
                        <div className="flex justify-center gap-4 py-8 border-t border-slate-200">
                            <button
                                onClick={addArticleBlock}
                                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl hover:border-blue-500 hover:text-blue-600 transition-all font-bold text-sm shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> 新增文字區塊
                            </button>
                            <button
                                onClick={addVideoBlock}
                                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl hover:border-purple-500 hover:text-purple-600 transition-all font-bold text-sm shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> 新增影片區塊
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .quill-minimal-editor .ql-container {
                    font-size: 16px;
                    border: none !important;
                    min-height: 150px;
                }
                .quill-minimal-editor .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                    padding: 8px 0 !important;
                    background: #fff;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .quill-minimal-editor .ql-editor {
                    padding: 20px 0 !important;
                    min-height: 150px;
                }
            `}} />
        </div>
    );
};

// Simple icon fallback if not provided by lucide
const PlaySquare = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="m9 8 7 4-7 4V8z" /></svg>
);

export default EditorComponent;
