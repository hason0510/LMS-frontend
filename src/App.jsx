import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { App as AntdApp } from "antd";
import useNotificationStore from "./store/useNotificationStore";

import AuthPage from "./pages/auth/AuthPage";
import Home from "./pages/student/Home";
import ClassesPage from "./pages/common/ClassesPage";
import ClassDetailPage from "./pages/common/ClassDetailPage";
import NotificationsPage from "./pages/common/NotificationsPage";
import QuizAttempt from "./pages/student/QuizAttempt";
import QuizResult from "./pages/student/QuizResult";
import QuizDetail from "./pages/student/QuizDetail";
import TeacherQuizDetail from "./pages/teacher/QuizDetail";
import StudentLectureDetail from "./pages/student/StudentLectureDetail";
import StudentAssignmentDetail from "./pages/student/StudentAssignmentDetail";
import ProfilePage from "./pages/student/ProfilePage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherAnnouncements from "./pages/teacher/TeacherAnnouncements";
import TeacherReport from "./pages/teacher/TeacherReport";
import TeacherClassSections from "./pages/teacher/TeacherClassSections";
import TeacherCurriculums from "./pages/teacher/TeacherCurriculums";
import CreateCurriculumTemplate from "./pages/teacher/CreateCurriculumTemplate";
import QuestionBanks from "./pages/teacher/QuestionBanks";
import QuestionBankDetail from "./pages/teacher/QuestionBankDetail";
import CreateChapter from "./pages/teacher/CreateChapter";
import LectureDetail from "./pages/teacher/LectureDetail";
import AssignmentDetail from "./pages/teacher/AssignmentDetail";
import AssignmentSubmissions from "./pages/teacher/AssignmentSubmissions";
import TeacherLessonPreview from "./pages/teacher/TeacherLessonPreview";
import TeacherQuizPreview from "./pages/teacher/TeacherQuizPreview";
import TeacherQuizAttemptPreview from "./pages/teacher/TeacherQuizAttemptPreview";
import TeacherQuizResultPreview from "./pages/teacher/TeacherQuizResultPreview";
import TeacherAssignmentPreview from "./pages/teacher/TeacherAssignmentPreview";
import TemplateDetailPage from "./pages/teacher/TemplateDetailPage";
import TeacherProfilePage from "./pages/teacher/TeacherProfilePage";
import TeacherSettingsPage from "./pages/teacher/TeacherSettingsPage";
import TeacherStudentManagement from "./pages/teacher/TeacherStudentManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminCategoryManagement from "./pages/admin/AdminCategoryManagement";
import AdminSubjectManagement from "./pages/admin/AdminSubjectManagement";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { useTokenExpiration } from "./hooks/useTokenExpiration";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE";

function RootRedirect() {
  const { user, isLoggedIn, loading } = useAuth();

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // If we're logged in but user/role is not ready yet (e.g. just after login),
  // keep a short loading state to avoid "flashing" the wrong role homepage.
  if (!user || !user.role) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  // Redirect based on user role
  if (user?.role === "TEACHER") {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Default for STUDENT and others
  return <Navigate to="/home" replace />;
}

function AppContent() {
  const { user, isLoggedIn } = useAuth();
  useTokenExpiration();
  const connect = useNotificationStore((state) => state.connect);
  const disconnect = useNotificationStore((state) => state.disconnect);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      connect(user.id);
      fetchUnreadCount();
    } else {
      disconnect();
    }
    
    return () => disconnect();
  }, [isLoggedIn, user?.id, connect, disconnect, fetchUnreadCount]);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Student Routes */}
      <Route
        path="/home"
        element={<ProtectedRoute element={<Home />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/student/profile"
        element={<ProtectedRoute element={<ProfilePage />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/student/profile/information"
        element={<ProtectedRoute element={<ProfilePage />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/student/profile/classes"
        element={<ProtectedRoute element={<ProfilePage />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/student/profile/certificate"
        element={<ProtectedRoute element={<ProfilePage />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/student/profile/notifications"
        element={<ProtectedRoute element={<ProfilePage />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/student/profile/password"
        element={<ProtectedRoute element={<ProfilePage />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/student/profile/settings"
        element={<ProtectedRoute element={<ProfilePage />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/class-sections/:classSectionId/quizzes/:id/attempt"
        element={<ProtectedRoute element={<QuizAttempt />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/class-sections/:classSectionId/quizzes/:id/detail"
        element={<ProtectedRoute element={<QuizDetail />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/class-sections/:classSectionId/lectures/:lectureId"
        element={<ProtectedRoute element={<StudentLectureDetail />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/class-sections/:classSectionId/assignments/:assignmentId"
        element={<ProtectedRoute element={<StudentAssignmentDetail />} allowedRoles={["STUDENT"]} />}
      />
      <Route
        path="/class-sections/:classSectionId/quizzes/:id/result"
        element={<ProtectedRoute element={<QuizResult />} allowedRoles={["STUDENT"]} />}
      />

      {/* Public/Auth Routes */}
      <Route path="/login" element={<AuthPage defaultTab="login" />} />
      <Route path="/register" element={<AuthPage defaultTab="register" />} />
      
      {/* Common Routes */}
      <Route
        path="/notifications"
        element={<ProtectedRoute element={<NotificationsPage />} allowedRoles={["STUDENT", "TEACHER", "ADMIN"]} />}
      />
      <Route
        path="/classes"
        element={<ProtectedRoute element={<ClassesPage />} allowedRoles={["STUDENT", "TEACHER", "ADMIN"]} />}
      />
      <Route
        path="/class-sections/:id"
        element={<ProtectedRoute element={<ClassDetailPage />} allowedRoles={["STUDENT", "TEACHER", "ADMIN"]} />}
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher/dashboard"
        element={<ProtectedRoute element={<TeacherDashboard />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/report"
        element={<ProtectedRoute element={<TeacherReport />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/announcements"
        element={<ProtectedRoute element={<TeacherAnnouncements />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections"
        element={<ProtectedRoute element={<TeacherClassSections />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:id"
        element={<ProtectedRoute element={<ClassDetailPage />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/lectures/:lectureId"
        element={<ProtectedRoute element={<LectureDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/chapters/:chapterId/lectures/create"
        element={<ProtectedRoute element={<LectureDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/quizzes/:quizId"
        element={<ProtectedRoute element={<TeacherQuizDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/chapters/:chapterId/quizzes/create"
        element={<ProtectedRoute element={<TeacherQuizDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/chapters/:chapterId/assignments/create"
        element={<ProtectedRoute element={<AssignmentDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/assignments/:assignmentId"
        element={<ProtectedRoute element={<AssignmentDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/assignments/:assignmentId/submissions"
        element={<ProtectedRoute element={<AssignmentSubmissions />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/lectures/:lectureId/preview"
        element={<ProtectedRoute element={<TeacherLessonPreview />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/quizzes/:quizId/preview"
        element={<ProtectedRoute element={<TeacherQuizPreview />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/quizzes/:quizId/preview/attempt"
        element={<ProtectedRoute element={<TeacherQuizAttemptPreview />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/quizzes/:quizId/preview/result"
        element={<ProtectedRoute element={<TeacherQuizResultPreview />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/class-sections/:classSectionId/assignments/:assignmentId/preview"
        element={<ProtectedRoute element={<TeacherAssignmentPreview />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums"
        element={<ProtectedRoute element={<TeacherCurriculums />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/create"
        element={<ProtectedRoute element={<CreateCurriculumTemplate />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/edit/:id"
        element={<ProtectedRoute element={<CreateCurriculumTemplate />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:id"
        element={<ProtectedRoute element={<TemplateDetailPage />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:templateId/chapters/create"
        element={<ProtectedRoute element={<CreateChapter />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:templateId/lectures/create"
        element={<ProtectedRoute element={<LectureDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:templateId/chapters/:chapterId/lectures/create"
        element={<ProtectedRoute element={<LectureDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:templateId/lectures/:lectureId"
        element={<ProtectedRoute element={<LectureDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:templateId/quizzes/create"
        element={<ProtectedRoute element={<TeacherQuizDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:templateId/chapters/:chapterId/quizzes/create"
        element={<ProtectedRoute element={<TeacherQuizDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/curriculums/:templateId/quizzes/:quizId"
        element={<ProtectedRoute element={<TeacherQuizDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/question-banks"
        element={<ProtectedRoute element={<QuestionBanks />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/question-banks/:id"
        element={<ProtectedRoute element={<QuestionBankDetail />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/students"
        element={<ProtectedRoute element={<TeacherStudentManagement />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/profile"
        element={<ProtectedRoute element={<TeacherProfilePage />} allowedRoles={["TEACHER"]} />}
      />
      <Route
        path="/teacher/settings"
        element={<ProtectedRoute element={<TeacherSettingsPage />} allowedRoles={["TEACHER"]} />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={<ProtectedRoute element={<AdminDashboard />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/users"
        element={<ProtectedRoute element={<AdminUserManagement />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/profile"
        element={<ProtectedRoute element={<AdminProfilePage />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/settings"
        element={<ProtectedRoute element={<AdminSettingsPage />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/categories"
        element={<ProtectedRoute element={<AdminCategoryManagement />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/subjects"
        element={<ProtectedRoute element={<AdminSubjectManagement />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections"
        element={<ProtectedRoute element={<TeacherClassSections isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/announcements"
        element={<ProtectedRoute element={<TeacherAnnouncements isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:id"
        element={<ProtectedRoute element={<ClassDetailPage />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:classSectionId/lectures/:lectureId"
        element={<ProtectedRoute element={<LectureDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:classSectionId/chapters/:chapterId/lectures/create"
        element={<ProtectedRoute element={<LectureDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:classSectionId/quizzes/:quizId"
        element={<ProtectedRoute element={<TeacherQuizDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:classSectionId/chapters/:chapterId/quizzes/create"
        element={<ProtectedRoute element={<TeacherQuizDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:classSectionId/chapters/:chapterId/assignments/create"
        element={<ProtectedRoute element={<AssignmentDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:classSectionId/assignments/:assignmentId"
        element={<ProtectedRoute element={<AssignmentDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/class-sections/:classSectionId/assignments/:assignmentId/submissions"
        element={<ProtectedRoute element={<AssignmentSubmissions isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums"
        element={<ProtectedRoute element={<TeacherCurriculums isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/question-banks"
        element={<ProtectedRoute element={<QuestionBanks isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/question-banks/:id"
        element={<ProtectedRoute element={<QuestionBankDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/create"
        element={<ProtectedRoute element={<CreateCurriculumTemplate isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/edit/:id"
        element={<ProtectedRoute element={<CreateCurriculumTemplate isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:id"
        element={<ProtectedRoute element={<TemplateDetailPage isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:templateId/chapters/create"
        element={<ProtectedRoute element={<CreateChapter isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:templateId/lectures/create"
        element={<ProtectedRoute element={<LectureDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:templateId/chapters/:chapterId/lectures/create"
        element={<ProtectedRoute element={<LectureDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:templateId/lectures/:lectureId"
        element={<ProtectedRoute element={<LectureDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:templateId/quizzes/create"
        element={<ProtectedRoute element={<TeacherQuizDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:templateId/chapters/:chapterId/quizzes/create"
        element={<ProtectedRoute element={<TeacherQuizDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/curriculums/:templateId/quizzes/:quizId"
        element={<ProtectedRoute element={<TeacherQuizDetail isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/students"
        element={<ProtectedRoute element={<TeacherStudentManagement isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
      <Route
        path="/admin/reports"
        element={<ProtectedRoute element={<TeacherReport isAdmin={true} />} allowedRoles={["ADMIN"]} />}
      />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AntdApp>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AntdApp>
    </GoogleOAuthProvider>
  );
}

export default App;
