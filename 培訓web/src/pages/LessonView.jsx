import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Play, FileText, CheckCircle, Circle, Book } from 'lucide-react';

const LessonView = () => {
    const { courseId } = useParams();
    const { user } = useAuth();
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [contents, setContents] = useState([]);
    const [progress, setProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState({ content: '', type: 'text' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchCourseData = async () => {
            const { data: courseData } = await supabase
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single();
            setCourse(courseData);

            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('*')
                .eq('course_id', courseId)
                .order('order', { ascending: true });
            setLessons(lessonsData);

            if (user) {
                const { data: progressData } = await supabase
                    .from('progress')
                    .select('*')
                    .eq('user_id', user.id);

                const progMap = {};
                progressData?.forEach(p => {
                    progMap[p.lesson_id] = p.completed;
                });
                setProgress(progMap);
            }

            if (lessonsData?.length > 0) {
                setSelectedLesson(lessonsData[0]);
            }
            setLoading(false);
        };

        fetchCourseData();
    }, [courseId, user]);

    useEffect(() => {
        if (selectedLesson) {
            const fetchContents = async () => {
                const { data } = await supabase
                    .from('contents')
                    .select('*')
                    .eq('lesson_id', selectedLesson.id)
                    .order('order', { ascending: true });
                setContents(data || []);
            };
            fetchContents();
        }
    }, [selectedLesson]);

    const toggleComplete = async (lessonId) => {
        const isCompleted = !!progress[lessonId];
        const newStatus = !isCompleted;

        const { error } = await supabase
            .from('progress')
            .upsert({
                user_id: user.id,
                lesson_id: lessonId,
                completed: newStatus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,lesson_id' });

        if (!error) {
            setProgress({ ...progress, [lessonId]: newStatus });
        }
    };

    const submitAssignment = async () => {
        setIsSubmitting(true);
        const { error } = await supabase
            .from('assignments')
            .insert([{
                user_id: user.id,
                lesson_id: selectedLesson.id,
                type: assignment.type,
                content: assignment.content,
                created_at: new Date().toISOString()
            }]);

        if (!error) {
            alert('作業已成功繳交！');
            setAssignment({ content: '', type: 'text' });
        }
        setIsSubmitting(false);
    };

    if (loading) return <div className="p-12 text-center text-slate-500 text-lg font-bold">課程內容載入中...</div>;
    if (!course) return <div className="p-12 text-center text-red-500">找不到該課程。</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar - Lesson List */}
            <aside className="w-84 border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-lg shadow-slate-200/50 relative z-10 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <Link to="/courses" className="flex items-center gap-1.5 text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 mb-4 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5" /> 返回課程列表
                    </Link>
                    <h2 className="font-black text-slate-900 leading-tight text-lg">{course.title}</h2>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {lessons.map((lesson, idx) => (
                        <button
                            key={lesson.id}
                            onClick={() => setSelectedLesson(lesson)}
                            className={`w-full text-left px-6 py-5 flex items-start gap-4 transition-all relative ${selectedLesson?.id === lesson.id
                                ? 'bg-blue-50/80'
                                : 'hover:bg-slate-50/80'
                                }`}
                        >
                            {selectedLesson?.id === lesson.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-full shadow-[2px_0_8px_rgba(37,99,235,0.4)]" />
                            )}
                            <div className="mt-1 shrink-0">
                                {progress[lesson.id] ? (
                                    <CheckCircle className="w-6 h-6 text-green-500 fill-green-50" />
                                ) : (
                                    <Circle className="w-6 h-6 text-slate-200" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">章節 {idx + 1}</div>
                                <div className={`text-sm font-bold truncate ${selectedLesson?.id === lesson.id ? 'text-blue-800' : 'text-slate-600'}`}>
                                    {lesson.title}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 bg-slate-50/30 overflow-y-auto scroll-smooth">
                {selectedLesson ? (
                    <div className="max-w-4xl mx-auto py-12 px-8">
                        <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-200/60">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{selectedLesson.title}</h1>
                            <button
                                onClick={() => toggleComplete(selectedLesson.id)}
                                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-sm font-black transition-all shadow-sm ${progress[selectedLesson.id]
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                            >
                                {progress[selectedLesson.id] ? <CheckCircle className="w-4.5 h-4.5" /> : <Circle className="w-4.5 h-4.5" />}
                                {progress[selectedLesson.id] ? '已完成學習' : '標記此章節完成'}
                            </button>
                        </div>

                        <div className="space-y-12">
                            {contents.map((item) => (
                                <div key={item.id} className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100/80 overflow-hidden transform transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
                                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl scale-90 ${item.type === 'video' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {item.type === 'video' ? <Play className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                            </div>
                                            <span className="text-sm font-black text-slate-700 uppercase tracking-wide">{item.title}</span>
                                        </div>
                                    </div>
                                    <div className="p-8">
                                        {item.type === 'video' ? (
                                            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                                                <iframe
                                                    src={item.video_url}
                                                    title={item.title}
                                                    className="w-full h-full"
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        ) : (
                                            <div
                                                className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-p:leading-relaxed prose-a:text-blue-600 font-medium text-slate-700 ql-editor"
                                                dangerouslySetInnerHTML={{ __html: item.body }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {contents.length === 0 && (
                                <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200/60">
                                    <p className="text-slate-400 font-medium">本章節暫無學習內容。</p>
                                </div>
                            )}

                            {/* Assignment Submission Section */}
                            <div className="mt-20 pt-12 border-t border-slate-200/60">
                                <div className="bg-indigo-900 text-white rounded-3xl p-10 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                                    <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                                        <FileText className="w-7 h-7 text-indigo-300" /> 章節作業繳交
                                    </h3>
                                    <p className="text-indigo-200/80 mb-8 font-medium">請根據本章節內容，撰寫您的學習心得或繳交指定作業。</p>

                                    <div className="space-y-6 relative z-10">
                                        <textarea
                                            rows="6"
                                            value={assignment.content}
                                            onChange={(e) => setAssignment({ ...assignment, content: e.target.value })}
                                            className="w-full px-6 py-5 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none resize-none text-white placeholder:text-indigo-300/50 font-medium transition-all"
                                            placeholder="在此輸入您的心得或作業內容..."
                                        ></textarea>
                                        <button
                                            onClick={submitAssignment}
                                            disabled={isSubmitting || !assignment.content}
                                            className="w-full py-4 bg-white text-indigo-900 font-black rounded-2xl hover:bg-indigo-50 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                                        >
                                            {isSubmitting ? '繳交中...' : '確認繳交作業'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <Book className="w-8 h-8" />
                        </div>
                        <p className="font-bold tracking-tight">請從左側選擇一個章節開始學習</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LessonView;
