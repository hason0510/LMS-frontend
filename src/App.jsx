import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthPage from "./pages/auth/AuthPage";
import Home from "./pages/student/Home";
import CoursesPage from "./pages/common/CoursesPage";
import CourseDetailPage from "./pages/common/CourseDetailPage";
import NotificationsPage from "./pages/common/NotificationsPage";
import QuizAttempt from "./pages/student/QuizAttempt";
import QuizResult from "./pages/student/QuizResult";
import QuizDetail from "./pages/student/QuizDetail";
import TeacherQuizDetail from "./pages/teacher/QuizDetail";
import StudentLectureDetail from "./pages/student/StudentLectureDetail";
import ProfilePage from "./pages/student/ProfilePage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherReport from "./pages/teacher/TeacherReport";
import TeacherCourses from "./pages/teacher/TeacherCourses";
import CreateCourse from "./pages/teacher/CreateCourse";
import CreateChapter from "./pages/teacher/CreateChapter";
import LectureDetail from "./pages/teacher/LectureDetail";
import TeacherProfilePage from "./pages/teacher/TeacherProfilePage";
import TeacherSettingsPage from "./pages/teacher/TeacherSettingsPage";
import TeacherStudentManagement from "./pages/teacher/TeacherStudentManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import ProtectedRoute from "./components/common/ProtectedRoute";

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

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          {/* Student Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute element={<Home />} allowedRoles={["STUDENT"]} />
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute
                element={<ProfilePage />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/student/profile/information"
            element={
              <ProtectedRoute
                element={<ProfilePage />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/student/profile/courses"
            element={
              <ProtectedRoute
                element={<ProfilePage />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/student/profile/certificate"
            element={
              <ProtectedRoute
                element={<ProfilePage />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/student/profile/notifications"
            element={
              <ProtectedRoute
                element={<ProfilePage />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/student/profile/password"
            element={
              <ProtectedRoute
                element={<ProfilePage />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/student/profile/settings"
            element={
              <ProtectedRoute
                element={<ProfilePage />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/courses/:courseId/quizzes/:id/attempt"
            element={
              <ProtectedRoute
                element={<QuizAttempt />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/courses/:courseId/quizzes/:id/detail"
            element={
              <ProtectedRoute
                element={<QuizDetail />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/courses/:courseId/lectures/:lectureId"
            element={
              <ProtectedRoute
                element={<StudentLectureDetail />}
                allowedRoles={["STUDENT"]}
              />
            }
          />
          <Route
            path="/courses/:courseId/quizzes/:id/result"
            element={
              <ProtectedRoute
                element={<QuizResult />}
                allowedRoles={["STUDENT"]}
              />
            }
          />

          {/* Public/Auth Routes */}
          <Route path="/login" element={<AuthPage defaultTab="login" />} />
          <Route
            path="/register"
            element={<AuthPage defaultTab="register" />}
          />
          {/* Common Routes (Student, Teacher, Admin) */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute
                element={<NotificationsPage />}
                allowedRoles={["STUDENT", "TEACHER", "ADMIN"]}
              />
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute
                element={<CoursesPage />}
                allowedRoles={["STUDENT", "TEACHER", "ADMIN"]}
              />
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute
                element={<CourseDetailPage />}
                allowedRoles={["STUDENT", "TEACHER", "ADMIN"]}
              />
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute
                element={<TeacherDashboard />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/report"
            element={
              <ProtectedRoute
                element={<TeacherReport />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses"
            element={
              <ProtectedRoute
                element={<TeacherCourses />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/create"
            element={
              <ProtectedRoute
                element={<CreateCourse />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:id"
            element={
              <ProtectedRoute
                element={<CourseDetailPage />}
                allowedRoles={["TEACHER", "ADMIN"]}
              />
            }
          />
          <Route
            path="/teacher/courses/edit/:id"
            element={
              <ProtectedRoute
                element={<CreateCourse />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:courseId/chapters/create"
            element={
              <ProtectedRoute
                element={<CreateChapter />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:courseId/lectures/create"
            element={
              <ProtectedRoute
                element={<LectureDetail />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:courseId/chapters/:chapterId/lectures/create"
            element={
              <ProtectedRoute
                element={<LectureDetail />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:courseId/lectures/:lectureId"
            element={
              <ProtectedRoute
                element={<LectureDetail />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:courseId/quizzes/create"
            element={
              <ProtectedRoute
                element={<TeacherQuizDetail />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:courseId/chapters/:chapterId/quizzes/create"
            element={
              <ProtectedRoute
                element={<TeacherQuizDetail />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/courses/:courseId/quizzes/:quizId"
            element={
              <ProtectedRoute
                element={<TeacherQuizDetail />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute
                element={<TeacherStudentManagement />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute
                element={<TeacherProfilePage />}
                allowedRoles={["TEACHER"]}
              />
            }
          />
          <Route
            path="/teacher/settings"
            element={
              <ProtectedRoute
                element={<TeacherSettingsPage />}
                allowedRoles={["TEACHER"]}
              />
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute
                element={<AdminDashboard />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute
                element={<AdminUserManagement />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute
                element={<AdminProfilePage />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute
                element={<AdminSettingsPage />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute
                element={<TeacherCourses isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:id"
            element={
              <ProtectedRoute
                element={<CourseDetailPage />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/create"
            element={
              <ProtectedRoute
                element={<CreateCourse isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/edit/:id"
            element={
              <ProtectedRoute
                element={<CreateCourse isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:courseId/chapters/create"
            element={
              <ProtectedRoute
                element={<CreateChapter isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:courseId/lectures/create"
            element={
              <ProtectedRoute
                element={<LectureDetail isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:courseId/chapters/:chapterId/lectures/create"
            element={
              <ProtectedRoute
                element={<LectureDetail isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:courseId/lectures/:lectureId"
            element={
              <ProtectedRoute
                element={<LectureDetail isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:courseId/quizzes/create"
            element={
              <ProtectedRoute
                element={<TeacherQuizDetail isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:courseId/chapters/:chapterId/quizzes/create"
            element={
              <ProtectedRoute
                element={<TeacherQuizDetail isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/courses/:courseId/quizzes/:quizId"
            element={
              <ProtectedRoute
                element={<TeacherQuizDetail isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute
                element={<TeacherStudentManagement isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute
                element={<TeacherReport isAdmin={true} />}
                allowedRoles={["ADMIN"]}
              />
            }
          />
        </Routes>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
