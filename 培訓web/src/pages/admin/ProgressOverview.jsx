import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BarChart3, Filter, CheckCircle, Circle, MinusCircle } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'training', label: '培訓中', color: 'bg-blue-50 text-blue-600' },
    { value: 'completed', label: '培訓完畢', color: 'bg-green-50 text-green-600' },
    { value: 'exempt', label: '無需培訓', color: 'bg-slate-100 text-slate-500' },
];

const ProgressOverview = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [progressMap, setProgressMap] = useState({});
    const [statusMap, setStatusMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            const { data } = await supabase.from('courses').select('id, title').order('order', { ascending: true });
            setCourses(data || []);
            if (data?.length > 0) setSelectedCourseId(data[0].id);
            setLoading(false);
        };
        fetchCourses();
    }, []);

    useEffect(() => {
        if (!selectedCourseId) return;
        fetchCourseData(selectedCourseId);
    }, [selectedCourseId]);

    const fetchCourseData = async (courseId) => {
        setLoading(true);

        const [teachersRes, lessonsRes, statusRes] = await Promise.all([
            supabase.from('users').select('id, name, email, mentor_name').eq('role', 'teacher'),
            supabase.from('lessons').select('id').eq('course_id', courseId),
            supabase.from('course_training_status').select('*').eq('course_id', courseId),
        ]);

        const teacherList = teachersRes.data || [];
        const lessonList = lessonsRes.data || [];
        setTeachers(teacherList);
        setLessons(lessonList);

        const sMap = {};
        (statusRes.data || []).forEach(s => { sMap[s.user_id] = s.status; });
        setStatusMap(sMap);

        if (lessonList.length > 0 && teacherList.length > 0) {
            const lessonIds = lessonList.map(l => l.id);
            const { data: progressData } = await supabase
                .from('progress')
                .select('user_id, lesson_id, completed')
                .in('lesson_id', lessonIds);

            const pMap = {};
            (progressData || []).forEach(p => {
                if (!pMap[p.user_id]) pMap[p.user_id] = 0;
                if (p.completed) pMap[p.user_id]++;
            });
            setProgressMap(pMap);
        } else {
            setProgressMap({});
        }

        setLoading(false);
    };

    const handleStatusChange = async (userId, newStatus) => {
        const { error } = await supabase
            .from('course_training_status')
            .upsert({
                user_id: userId,
                course_id: selectedCourseId,
                status: newStatus,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,course_id' });

        if (error) {
            alert('狀態更新失敗：' + error.message);
            return;
        }
        setStatusMap({ ...statusMap, [userId]: newStatus });
    };

    if (loading && courses.length === 0) return <div className="p-12 text-center text-slate-500">載入中...</div>;

    const totalLessons = lessons.length;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">培訓進度總覽</h1>
                    <p className="text-slate-500 mt-1">檢視所有講師的課程學習進度與培訓狀態</p>
                </div>
            </div>

            {/* Course filter */}
            <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Filter className="w-4 h-4" /> 選擇課程：
                </div>
                <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
                >
                    {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
                {totalLessons > 0 && (
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                        共 {totalLessons} 個章節
                    </span>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {STATUS_OPTIONS.map(opt => {
                    const count = teachers.filter(t => (statusMap[t.id] || 'training') === opt.value).length;
                    return (
                        <div key={opt.value} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                            {opt.value === 'training' && <Circle className="w-5 h-5 text-blue-500" />}
                            {opt.value === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {opt.value === 'exempt' && <MinusCircle className="w-5 h-5 text-slate-400" />}
                            <div>
                                <div className="text-xl font-black text-slate-900">{count}</div>
                                <div className="text-xs font-medium text-slate-400">{opt.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Teacher progress table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <h2 className="font-bold text-slate-900 text-lg">講師進度列表</h2>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">載入資料中...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">姓名</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">輔導員</th>
                                <th className="px-6 py-4">章節進度</th>
                                <th className="px-6 py-4">培訓狀態</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {teachers.map(teacher => {
                                const completed = progressMap[teacher.id] || 0;
                                const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
                                const currentStatus = statusMap[teacher.id] || 'training';

                                return (
                                    <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-900">{teacher.name || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{teacher.email}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{teacher.mentor_name || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 min-w-[180px]">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                                                    {completed}/{totalLessons}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={currentStatus}
                                                onChange={e => handleStatusChange(teacher.id, e.target.value)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${STATUS_OPTIONS.find(o => o.value === currentStatus)?.color || ''}`}
                                            >
                                                {STATUS_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                            {teachers.length === 0 && (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">沒有講師資料</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ProgressOverview;
