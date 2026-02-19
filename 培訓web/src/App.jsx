import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import CourseList from './pages/CourseList';
import LessonView from './pages/LessonView';
import LessonDetail from './pages/LessonDetail';
import AdminDashboard from './pages/admin/Dashboard';
import CMSManager from './pages/admin/CMSManager';
import AssignmentReview from './pages/admin/AssignmentReview';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="p-12 text-center text-slate-500 text-lg">載入中...</div>;
  if (!user) return <Navigate to="/" />;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Layout><CourseList /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <Layout><LessonView /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId/lessons/:lessonId"
            element={
              <ProtectedRoute>
                <Layout><LessonDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout><AdminDashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cms/:courseId"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout><CMSManager /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assignments"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout><AssignmentReview /></Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Re-defining Home for simplicity in this file
const Home = () => (
  <div className="p-12 max-w-4xl mx-auto text-center">
    <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-blue-600 uppercase bg-blue-50 rounded-full">
      專業教師培訓系統
    </div>
    <h1 className="text-5xl font-black text-slate-900 mb-6 leading-tight">
      提升教學專業，<span className="text-blue-600">成就未來名師</span>
    </h1>
    <p className="text-xl text-slate-600 mb-10 leading-relaxed">
      提供完整的線上培訓資源、進度追蹤與專家回饋助您在教學領域更上一層樓。
    </p>
  </div>
);

export default App;
