import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import QuickActionCard from "../../components/teacher/dashboard/QuickActionCard";
import DashboardCourseCard from "../../components/teacher/dashboard/DashboardCourseCard";
import StatItem from "../../components/teacher/dashboard/StatItem";
import NotificationItem from "../../components/teacher/dashboard/NotificationItem";
// import { getCoursesByTeacher } from "../../api/course";
import { getTeacherCourses } from "../../api/course";
import { Spin, Alert } from "antd";
import {
  AcademicCapIcon,
  PlusCircleIcon,
  DocumentPlusIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightIcon,
  TrophyIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchTeacherCourses();
  }, []);

  const fetchTeacherCourses = async () => {
    try {
      setLoading(true);
      const response = await getTeacherCourses();
      // Response có cấu trúc: { data: [...] }
      const coursesList = response.data.pageList;
      setCourses(coursesList);
    } catch (err) {
      setError(err.message || "Lỗi khi tải khóa học");
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalStudents = courses.reduce((sum, course) => sum + (course.totalEnrollments || 0), 0);
  const totalCourses = courses.length;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      {/* Teacher Header */}
      <TeacherHeader />

      <div className="flex">
        {/* Sidebar */}
        <TeacherSidebar />

        {/* Main Content */}
        <main className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight tracking-[-0.015em]">
                  Dashboard Giáo viên
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Tổng quan hoạt động giảng dạy của bạn.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column (2/3) */}
              <div className="lg:col-span-2 flex flex-col gap-8">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4 text-[#111418] dark:text-white">
                    Hành động nhanh
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <QuickActionCard
                      icon={<PlusCircleIcon className="h-8 w-8" />}
                      label="Tạo khóa học"
                      to="/teacher/courses/create"
                    />
                    <QuickActionCard
                      icon={<DocumentPlusIcon className="h-8 w-8" />}
                      label="Tạo bài giảng"
                      to={totalCourses > 0 ? `/teacher/courses/${courses[0].id}/chapters/create` : "#"}
                    />
                  </div>
                </div>

                {/* Teaching Courses */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                      Các khóa học đang giảng dạy
                    </h3>
                    <button
                      onClick={() => navigate("/teacher/courses")}
                      className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                    >
                      <span>Xem tất cả</span>
                      <ArrowRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spin />
                    </div>
                  ) : error ? (
                    <Alert message="Lỗi" description={error} type="error" showIcon />
                  ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.slice(0, 2).map((course) => (
                        <div
                          key={course.id}
                          onClick={() => navigate(`/teacher/courses/${course.id}`)}
                          className="cursor-pointer"
                        >
                          <DashboardCourseCard
                            title={course.title}
                            students={course.totalEnrollments || 0}
                            rating={course.rating || 0}
                            category={course.categoryName || "Chưa phân loại"}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>Chưa có khóa học nào. Hãy tạo khóa học đầu tiên của bạn!</p>
                      <button
                        onClick={() => navigate("/teacher/courses/create")}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Tạo khóa học
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (1/3) */}
              <div className="flex flex-col gap-8">
                {/* Quick Stats */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4 text-[#111418] dark:text-white">
                    Thống kê nhanh
                  </h3>
                  <div className="space-y-4">
                    <StatItem
                      icon={<AcademicCapIcon className="h-6 w-6" />}
                      colorClass="bg-blue-500/10 text-blue-500"
                      label="Khóa học"
                      value={totalCourses}
                    />
                    <StatItem
                      icon={<TrophyIcon className="h-6 w-6" />}
                      colorClass="bg-green-500/10 text-green-500"
                      label="Tổng học viên"
                      value={totalStudents}
                    />
                  </div>
                </div>

                {/* Notifications & Requests */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4 text-[#111418] dark:text-white">
                    Thông báo gần đây
                  </h3>
                  <div className="flex flex-col gap-4">
                    <NotificationItem
                      icon={<ChatBubbleLeftEllipsisIcon className="h-5 w-5" />}
                      colorClass="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      text={`Bạn đang quản lý ${totalCourses} khóa học với ${totalStudents} học viên.`}
                      time="Cập nhật vừa xong"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
