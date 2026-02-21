import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PendingApproval from './pages/PendingApproval';
import CourseList from './pages/CourseList';
import LessonView from './pages/LessonView';
import LessonDetail from './pages/LessonDetail';
import AdminDashboard from './pages/admin/Dashboard';
import CMSManager from './pages/admin/CMSManager';
import AssignmentReview from './pages/admin/AssignmentReview';
import TeacherManager from './pages/admin/TeacherManager';
import ProgressOverview from './pages/admin/ProgressOverview';
import AnnouncementManager from './pages/admin/AnnouncementManager';
import AnnouncementDetail from './pages/AnnouncementDetail';
import ProfilePage from './pages/ProfilePage';
import InstructorList from './pages/admin/InstructorList';

const ProtectedRoute = ({ children, adminOnly = false, allowPending = false }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="p-12 text-center text-slate-500 text-lg">載入中...</div>;
  if (!user) return <Navigate to="/" />;
  if (!allowPending && (!profile || profile.role === 'pending')) return <Navigate to="/pending" />;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/pending" element={<Layout><PendingApproval /></Layout>} />
          <Route path="/announcements/:id" element={<Layout><AnnouncementDetail /></Layout>} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowPending>
                <Layout><ProfilePage /></Layout>
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/admin/instructors"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout><InstructorList /></Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
