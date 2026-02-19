import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CourseList from './pages/CourseList';
import LessonView from './pages/LessonView';
import LessonDetail from './pages/LessonDetail';
import AdminDashboard from './pages/admin/Dashboard';
import CMSManager from './pages/admin/CMSManager';
import AssignmentReview from './pages/admin/AssignmentReview';
import TeacherManager from './pages/admin/TeacherManager';
import ProgressOverview from './pages/admin/ProgressOverview';
import AnnouncementManager from './pages/admin/AnnouncementManager';

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
          <Route path="/" element={<Layout><HomePage /></Layout>} />
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
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout><TeacherManager /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/progress"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout><ProgressOverview /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout><AnnouncementManager /></Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
