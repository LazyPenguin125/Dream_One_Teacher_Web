import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Eye, EyeOff, LayoutGrid, Users, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [stats, setStats] = useState({ teachers: 0, courses: 0, assignments: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: coursesData } = await supabase
                .from('courses')
                .select('*')
                .order('order', { ascending: true });
            setCourses(coursesData || []);

            // Simulating some stats (in real app, use count queries)
            const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: assignCount } = await supabase.from('assignments').select('*', { count: 'exact', head: true });

            setStats({
                teachers: userCount || 0,
                courses: coursesData?.length || 0,
                assignments: assignCount || 0
            });
            setLoading(false);
        };

        fetchData();
    }, []);

    const toggleCourseStatus = async (course) => {
        const { error } = await supabase
            .from('courses')
            .update({ is_published: !course.is_published })
            .eq('id', course.id);

        if (!error) {
            setCourses(courses.map(c => c.id === course.id ? { ...c, is_published: !c.is_published } : c));
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">載入中...</div>;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">後台管理總覽</h1>
                    <p className="text-slate-500 mt-1">管理您的培訓內容與監控進度</p>
                </div>
                <Link to="/admin/cms/new" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                    <Plus className="w-5 h-5" /> 建立新課程
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{stats.teachers}</div>
                        <div className="text-sm font-medium text-slate-400">總教師人數</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{stats.courses}</div>
                        <div className="text-sm font-medium text-slate-400">上線課程</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{stats.assignments}</div>
                        <div className="text-sm font-medium text-slate-400">待審核作業</div>
                    </div>
                </div>
            </div>

            {/* Course List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 text-lg">課程列表</h2>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">名稱</th>
                            <th className="px-6 py-4">排序</th>
                            <th className="px-6 py-4">狀態</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {courses.map(course => (
                            <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-900">{course.title}</div>
                                    <div className="text-xs text-slate-400 line-clamp-1">{course.description}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{course.order}</td>
                                <td className="px-6 py-4">
                                    {course.is_published ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                                            <Eye className="w-3 h-3" /> 已發佈
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                            <EyeOff className="w-3 h-3" /> 草稿
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => toggleCourseStatus(course)}
                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                            title={course.is_published ? "下架" : "發佈"}
                                        >
                                            {course.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <Link to={`/admin/cms/${course.id}`} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </Link>
                                        <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;
