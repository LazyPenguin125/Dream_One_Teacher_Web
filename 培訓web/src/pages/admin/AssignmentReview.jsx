import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MessageSquare, User, Calendar, ExternalLink } from 'lucide-react';

const AssignmentReview = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const fetchAssignments = async () => {
            // In a real app, join with users and lessons
            const { data, error } = await supabase
                .from('assignments')
                .select(`
          *,
          lessons(title)
        `)
                .order('created_at', { ascending: false });

            if (!error) setAssignments(data);
            setLoading(false);
        };

        fetchAssignments();
    }, []);

    const submitFeedback = async () => {
        if (!selectedAssignment) return;
        const { error } = await supabase
            .from('assignments')
            .update({ feedback })
            .eq('id', selectedAssignment.id);

        if (!error) {
            setAssignments(assignments.map(a => a.id === selectedAssignment.id ? { ...a, feedback } : a));
            alert('回饋已送出');
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">載入中...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto flex gap-8">
            {/* List */}
            <div className="flex-1 space-y-4">
                <h1 className="text-3xl font-black text-slate-900 mb-8">作業審核中心</h1>
                {assignments.map(a => (
                    <button
                        key={a.id}
                        onClick={() => {
                            setSelectedAssignment(a);
                            setFeedback(a.feedback || '');
                        }}
                        className={`w-full text-left p-6 rounded-2xl border transition-all ${selectedAssignment?.id === a.id ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black text-blue-600 bg-blue-100/50 px-2 py-1 rounded-md uppercase tracking-wider">
                                {a.type === 'video' ? '影片檔案' : '心得文字'}
                            </span>
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                                <Calendar className="w-3 h-3" />
                                {new Date(a.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{a.lessons?.title || '未知章節'}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <User className="w-4 h-4" /> {a.user_id.substring(0, 8)}...
                        </div>
                    </button>
                ))}
                {assignments.length === 0 && <div className="text-slate-400 py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">尚無繳交的作業。</div>}
            </div>

            {/* Review Area */}
            <div className="w-1/2">
                {selectedAssignment ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="font-black text-slate-800">審核內容</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 min-h-[100px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {selectedAssignment.content || '（無文字內容）'}
                                {selectedAssignment.file_url && (
                                    <a href={selectedAssignment.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-4 text-blue-600 font-bold hover:underline">
                                        <ExternalLink className="w-4 h-4" /> 點此觀看影片作業
                                    </a>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 font-bold text-slate-900">
                                    <MessageSquare className="w-4 h-4 text-blue-600" /> 給予教師回饋
                                </label>
                                <textarea
                                    rows="6"
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-700"
                                    placeholder="在此輸入您的評語或建議..."
                                ></textarea>
                                <button
                                    onClick={submitFeedback}
                                    className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    送出回饋
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        請選擇一份作業進行審核
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignmentReview;
