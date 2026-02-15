import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Book, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const CourseList = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('is_published', true)
                .order('order', { ascending: true });

            if (!error) {
                setCourses(data);
            }
            setLoading(false);
        };

        fetchCourses();
    }, []);

    if (loading) return <div className="p-12 text-center text-slate-500">課程載入中...</div>;

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">我的課程</h1>
                <p className="mt-2 text-slate-600">開始您的專業教師培訓之旅</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length > 0 ? (
                    courses.map((course) => (
                        <Link
                            key={course.id}
                            to={`/courses/${course.id}`}
                            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
                        >
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Book className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                                {course.title}
                            </h3>
                            <p className="text-slate-500 text-sm line-clamp-2 mb-6">
                                {course.description || '暫無描述'}
                            </p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                    <Clock className="w-4 h-4" />
                                    <span>剛更新</span>
                                </div>
                                <div className="flex items-center gap-1 text-blue-600 font-semibold text-sm">
                                    進入課程
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400">目前尚無可用的課程。</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseList;
