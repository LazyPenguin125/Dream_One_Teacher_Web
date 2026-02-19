import { useState, useEffect, useRef } from 'react';
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

// ─── Video URL input modal ─────────────────────────────────────────────────
const VideoModal = ({ onConfirm, onCancel }) => {
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="font-black text-slate-900 text-lg mb-4">新增影片</h3>
                <div className="space-y-3 mb-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">影片標題</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="例：課程介紹影片"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">影片網址（YouTube / Vimeo embed URL）</label>
                        <input
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="https://www.youtube.com/embed/..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1">YouTube 請使用「嵌入」連結（點分享→嵌入→複製 src 網址）</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >取消</button>
                    <button
                        onClick={() => onConfirm({ url, title })}
                        disabled={!url.trim()}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >確認新增</button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
const EditorComponent = ({ lessonId, onBack }) => {
    const [lessonTitle, setLessonTitle] = useState('');
    const [blocks, setBlocks] = useState([]);     // { id, type, title, body, video_url, order, isNew }
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const quillRef = useRef(null);

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

                if (contents && contents.length > 0) {
                    setBlocks(contents);
                    setSelectedId(contents[0].id);
                } else {
                    setBlocks([]);
                    setSelectedId(null);
                }
            } catch (err) {
                console.error('fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        if (lessonId) fetchData();
    }, [lessonId]);

    const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

    // ── Update selected block's field ──
    const updateSelected = (field, value) => {
        setBlocks(prev => prev.map(b => b.id === selectedId ? { ...b, [field]: value } : b));
    };

    // ── Add text block ──
    const addTextBlock = async () => {
        const newOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order ?? 0)) + 1 : 0;
        const tempId = `new_${Date.now()}`;
        const newBlock = { id: tempId, type: 'text', title: '新文字區塊', body: '', order: newOrder, isNew: true };
        setBlocks(prev => [...prev, newBlock]);
        setSelectedId(tempId);
    };

    // ── Add video block ──
    const handleAddVideo = ({ url, title }) => {
        const newOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order ?? 0)) + 1 : 0;
        const tempId = `new_${Date.now()}`;
        const newBlock = { id: tempId, type: 'video', title: title || '影片', video_url: url, body: '', order: newOrder, isNew: true };
        setBlocks(prev => [...prev, newBlock]);
        setSelectedId(tempId);
        setShowVideoModal(false);
    };

    // ── Save all blocks ──
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            for (const block of blocks) {
                const payload = {
                    lesson_id: lessonId,
                    type: block.type,
                    title: block.title || '',
                    body: block.body || '',
                    video_url: block.video_url || null,
                    order: block.order,
                };
                if (block.isNew) {
                    const { data, error } = await supabase.from('contents').insert(payload).select().single();
                    if (error) throw error;
                    // Replace temp id with real id
                    setBlocks(prev => prev.map(b => b.id === block.id ? { ...data, isNew: false } : b));
                    if (selectedId === block.id) setSelectedId(data.id);
                } else {
                    const { error } = await supabase.from('contents').update(payload).eq('id', block.id);
                    if (error) throw error;
                }
            }
            // Refetch to sync IDs
            const { data: fresh } = await supabase
                .from('contents')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order', { ascending: true });
            if (fresh) {
                setBlocks(fresh.map(b => ({ ...b, isNew: false })));
                if (!fresh.find(b => b.id === selectedId)) {
                    setSelectedId(fresh[0]?.id ?? null);
                }
            }
            alert('所有內容已儲存！');
        } catch (err) {
            console.error('save error:', err);
            alert('儲存失敗：' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete block ──
    const handleDelete = async (blockId) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;
        if (!block.isNew) {
            await supabase.from('contents').delete().eq('id', blockId);
        }
        const remaining = blocks.filter(b => b.id !== blockId);
        setBlocks(remaining);
        setSelectedId(remaining[0]?.id ?? null);
        setDeleteConfirmId(null);
    };

    // ── Render ──
    if (loading) return <div className="p-12 text-center text-slate-500">載入內容中...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* ── Top bar ── */}
            <div className="bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">編輯章節內容</div>
                        <div className="font-bold text-slate-800 leading-tight">{lessonTitle}</div>
                    </div>
                </div>
                <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm font-bold text-sm"
                >
                    <Save className="w-4 h-4" />
                    {saving ? '儲存中...' : '全部儲存'}
                </button>
            </div>

            {/* ── Main layout ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left sidebar: block list */}
                <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">內容區塊</div>
                        <div className="flex gap-2">
                            <button
                                onClick={addTextBlock}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />文字
                            </button>
                            <button
                                onClick={() => setShowVideoModal(true)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />影片
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2">
                        {blocks.length === 0 && (
                            <div className="px-4 py-8 text-center text-xs text-slate-400">
                                尚無內容區塊<br />請從上方新增
                            </div>
                        )}
                        {blocks.map((block, idx) => (
                            <div key={block.id} className="relative group">
                                <button
                                    onClick={() => setSelectedId(block.id)}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all ${selectedId === block.id
                                        ? 'bg-blue-50 border-l-4 border-blue-500'
                                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                                        }`}
                                >
                                    <div className={`mt-0.5 shrink-0 p-1 rounded-md ${block.type === 'video' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {block.type === 'video'
                                            ? <Video className="w-3 h-3" />
                                            : <FileText className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-black text-slate-400 mb-0.5">#{idx + 1} {block.type === 'video' ? '影片' : '文字'}</div>
                                        <div className="text-xs font-bold text-slate-700 truncate">{block.title || '（未命名）'}</div>
                                        {block.isNew && (
                                            <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1 py-0.5 rounded mt-0.5 inline-block">未儲存</span>
                                        )}
                                    </div>
                                </button>
                                {/* Delete button */}
                                {deleteConfirmId === block.id ? (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                        <button
                                            onClick={() => handleDelete(block.id)}
                                            className="text-[10px] font-black text-white bg-red-500 px-2 py-1 rounded-md hover:bg-red-600"
                                        >刪除</button>
                                        <button
                                            onClick={() => setDeleteConfirmId(null)}
                                            className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-md"
                                        >取消</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setDeleteConfirmId(block.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Right: editor area */}
                <main className="flex-1 overflow-y-auto p-6">
                    {!selectedBlock ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                            <Edit3 className="w-12 h-12" />
                            <p className="font-bold text-sm">從左側選擇/新增一個內容區塊開始編輯</p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Block header */}
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                    {selectedBlock.type === 'video' ? '影片標題' : '區塊標題'}
                                </label>
                                <input
                                    type="text"
                                    value={selectedBlock.title || ''}
                                    onChange={e => updateSelected('title', e.target.value)}
                                    className="w-full text-lg font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-300"
                                    placeholder="輸入標題..."
                                />
                            </div>

                            {/* Block content */}
                            <div className="p-6">
                                {selectedBlock.type === 'video' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">影片網址</label>
                                            <input
                                                type="url"
                                                value={selectedBlock.video_url || ''}
                                                onChange={e => updateSelected('video_url', e.target.value)}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                placeholder="https://www.youtube.com/embed/..."
                                            />
                                        </div>
                                        {selectedBlock.video_url && (
                                            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg">
                                                <iframe
                                                    src={selectedBlock.video_url}
                                                    title={selectedBlock.title}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="quill-wrapper">
                                        <ReactQuill
                                            ref={quillRef}
                                            theme="snow"
                                            value={selectedBlock.body || ''}
                                            onChange={val => updateSelected('body', val)}
                                            modules={QUILL_MODULES}
                                            placeholder="在這裡輸入內容..."
                                            style={{ minHeight: '400px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Video modal */}
            {showVideoModal && (
                <VideoModal
                    onConfirm={handleAddVideo}
                    onCancel={() => setShowVideoModal(false)}
                />
            )}
        </div>
    );
};

export default EditorComponent;
