import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ChevronLeft, ChevronRight, Play, FileText, CheckCircle, Circle } from 'lucide-react';

const LessonDetail = () => {
    const { courseId, lessonId } = useParams();
    const [course, setCourse] = useState(null);
    const [lesson, setLesson] = useState(null);
    const [lessons, setLessons] = useState([]); // all lessons for prev/next nav
    const [contents, setContents] = useState([]);
    const [progress, setProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState({ content: '', type: 'text' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // Fetch course
            const { data: courseData } = await supabase
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single();
            setCourse(courseData);

            // Fetch all lessons (for prev/next nav)
            const { data: allLessons } = await supabase
                .from('lessons')
                .select('id, title, order')
                .eq('course_id', courseId)
                .order('order', { ascending: true });
            setLessons(allLessons || []);

            // Fetch this lesson
            const { data: lessonData } = await supabase
                .from('lessons')
                .select('*')
                .eq('id', lessonId)
                .single();
            setLesson(lessonData);

            // Fetch contents
            const { data: contentsData } = await supabase
                .from('contents')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('order', { ascending: true });
            setContents(contentsData || []);

            // Fetch progress
            if (user) {
                const { data: progressData } = await supabase
                    .from('progress')
                    .select('lesson_id, completed')
                    .eq('user_id', user.id)
                    .eq('lesson_id', lessonId);
                const progMap = {};
                progressData?.forEach(p => { progMap[p.lesson_id] = p.completed; });
                setProgress(progMap);
            }

            setLoading(false);
        };
        fetchData();
    }, [courseId, lessonId]);

    const toggleComplete = async () => {
        if (!currentUser) return;
        const isCompleted = !!progress[lessonId];
        const newStatus = !isCompleted;
        const { error } = await supabase
            .from('progress')
            .upsert({
                user_id: currentUser.id,
                lesson_id: lessonId,
                completed: newStatus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,lesson_id' });
        if (!error) setProgress({ ...progress, [lessonId]: newStatus });
    };

    const submitAssignment = async () => {
        if (!currentUser || !lesson) return;
        setIsSubmitting(true);
        const { error } = await supabase
            .from('assignments')
            .insert([{
                user_id: currentUser.id,
                lesson_id: lesson.id,
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

    if (loading) return (
        <div className="p-12 text-center text-slate-500 text-lg font-bold">章節內容載入中...</div>
    );
    if (!lesson) return (
        <div className="p-12 text-center text-red-500">找不到此章節。</div>
    );

    const currentIdx = lessons.findIndex(l => l.id === lessonId);
    const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
    const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;
    const isCompleted = !!progress[lessonId];

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-8">
                <Link to="/courses" className="hover:text-blue-600 transition-colors">我的課程</Link>
                <ChevronRight className="w-3 h-3" />
                <Link to={`/courses/${courseId}`} className="hover:text-blue-600 transition-colors">
                    {course?.title}
                </Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-600 truncate max-w-[200px]">{lesson.title}</span>
            </div>

            {/* Lesson header */}
            <div className="flex items-start justify-between gap-4 mb-10 pb-8 border-b border-slate-200/60">
                <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        章節 {currentIdx + 1}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{lesson.title}</h1>
                </div>
                <button
                    onClick={toggleComplete}
                    className={`shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-black transition-all shadow-sm ${isCompleted
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
                        }`}
                >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    {isCompleted ? '已完成學習' : '標記完成'}
                </button>
            </div>

            {/* Contents */}
            <div className="space-y-8">
                {contents.map((item) => (
                    <div
                        key={item.id}
                        className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100/80 overflow-hidden"
                    >
                        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100/50 flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${item.type === 'video' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                {item.type === 'video' ? <Play className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <span className="text-sm font-black text-slate-700 uppercase tracking-wide">{item.title}</span>
                        </div>
                        <div className="p-8">
                            {item.type === 'video' ? (
                                <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                                    <iframe
                                        src={item.video_url}
                                        title={item.title}
                                        className="w-full h-full"
                                        allowFullScreen
                                    />
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
            </div>

            {/* Assignment section */}
            <div className="mt-16 pt-12 border-t border-slate-200/60">
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
                        />
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

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between mt-12 gap-4">
                {prevLesson ? (
                    <Link
                        to={`/courses/${courseId}/lessons/${prevLesson.id}`}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        上一章節
                    </Link>
                ) : <div />}
                <Link
                    to={`/courses/${courseId}`}
                    className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                    返回章節清單
                </Link>
                {nextLesson ? (
                    <Link
                        to={`/courses/${courseId}/lessons/${nextLesson.id}`}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all"
                    >
                        下一章節
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                ) : <div />}
            </div>
        </div>
    );
};

export default LessonDetail;
