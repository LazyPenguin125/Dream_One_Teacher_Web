import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const EditorComponent = ({ lessonId, onBack }) => {
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                // First get the lesson details for the title
                const { data: lessonData } = await supabase
                    .from('lessons')
                    .select('title')
                    .eq('id', lessonId)
                    .single();

                if (lessonData) setTitle(lessonData.title);

                // Then get the content (article body)
                // We assume one main article content per lesson for now
                const { data: contentData } = await supabase
                    .from('contents')
                    .select('*')
                    .eq('lesson_id', lessonId)
                    .eq('type', 'article')
                    .maybeSingle();

                if (contentData) {
                    setContent(contentData.body || '');
                } else {
                    // Initialize empty content if none exists context
                    setContent('');
                }
            } catch (error) {
                console.error('Error fetching content:', error);
            } finally {
                setLoading(false);
            }
        };

        if (lessonId) fetchContent();
    }, [lessonId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Check if content record exists
            const { data: existingContent } = await supabase
                .from('contents')
                .select('id')
                .eq('lesson_id', lessonId)
                .eq('type', 'article')
                .maybeSingle();

            if (existingContent) {
                // Update
                const { error } = await supabase
                    .from('contents')
                    .update({
                        body: content,
                        title: title, // Sync title with lesson or keep separate? Using lesson title for now.
                        status: 'published'
                    })
                    .eq('id', existingContent.id);
                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('contents')
                    .insert({
                        lesson_id: lessonId,
                        type: 'article',
                        title: title,
                        body: content,
                        status: 'published',
                        order: 0
                    });
                if (error) throw error;
            }
            alert('內容儲存成功！');
        } catch (error) {
            console.error('Error saving content:', error);
            alert('儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image', 'video'],
            ['clean']
        ],
    };

    if (loading) return <div className="p-12 text-center">載入內容中...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">編輯章節內容</h2>
                        <p className="text-xs text-slate-400">{title}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                    <Save className="w-4 h-4" />
                    {saving ? '儲存中...' : '儲存內容'}
                </button>
            </div>

            <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto h-[500px] flex flex-col">
                    <ReactQuill
                        theme="snow"
                        value={content}
                        onChange={setContent}
                        modules={modules}
                        className="h-full"
                    />
                </div>
            </div>
        </div>
    );
};

export default EditorComponent;
