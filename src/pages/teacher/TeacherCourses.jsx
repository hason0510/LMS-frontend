import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import CourseCard from "../../components/course/CourseCard";
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { getTeacherCourses, getAdminCourses } from "../../api/course";
import { Spin, Alert } from "antd";
import AdminSidebar from "../../components/layout/AdminSidebar";

export default function TeacherCourses({ isAdmin = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'active', 'draft', 'archived'
  const [searchQuery, setSearchQuery] = useState("");
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
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // Fetch all courses for admin, or teacher's courses for teacher
      const response = isAdmin
        ? await getAdminCourses(1, 100)
        : await getTeacherCourses(1, 100);
      setCourses(response.data.pageList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses?.filter((course) => {
    // Filter by search query
    if (
      searchQuery &&
      !course.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    // Filter by status (mock logic as API doesn't return status yet)
    if (activeTab === "all") return true;
    // return course.status === activeTab; // Uncomment when API supports status
    return true;
  });

  const handleCreateCourse = () => {
    navigate(`/${userRole}/courses/create`);
  };

  const handleEditCourse = (id) => {
    navigate(`/${userRole}/courses/edit/${id}`);
  };

  const handlePreviewCourse = (id) => {
    navigate(`/${userRole}/courses/${id}`);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />

      <div className="flex">
        {/* Sidebar - Reused structure from TeacherDashboard */}
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}

        {/* Main Content */}
        <main className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            {/* Page Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight tracking-[-0.015em]">
                  {isAdmin ? "Quản lý khóa học" : "Khóa học của tôi"}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {isAdmin
                    ? "Quản lý tất cả các khóa học trong hệ thống."
                    : "Quản lý tất cả các khóa học của bạn tại một nơi."}
                </p>
              </div>
              {/* {!isAdmin && ( */}
                <button
                  onClick={handleCreateCourse}
                  className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  <PlusCircleIcon className="h-5 w-5" />
                  <span>Tạo khóa học mới</span>
                </button>
              {/* )} */}
            </div>

            {/* Toolbar & Filters */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-gray-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm dark:text-white"
                  placeholder="Tìm kiếm theo tên hoặc mã khóa học..."
                />
              </div>

              {/* Filter Chips */}
              {/* <div className="flex gap-3 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    activeTab === "all"
                      ? "bg-primary/20 text-primary"
                      : "bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm font-medium">Tất cả</span>
                </button>
                <button
                  onClick={() => setActiveTab("active")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    activeTab === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm font-medium">Đang hoạt động</span>
                </button>
                <button
                  onClick={() => setActiveTab("draft")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    activeTab === "draft"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm font-medium">Bản nháp</span>
                </button>
                <button
                  onClick={() => setActiveTab("archived")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
                    activeTab === "archived"
                      ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      : "bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm font-medium">Đã lưu trữ</span>
                </button>
              </div> */}
            </div>

            {/* Course Grid */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : error ? (
              <Alert message="Lỗi" description={error} type="error" showIcon />
            ) : filteredCourses?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Chưa có khóa học nào
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {isAdmin
                      ? "Không có khóa học nào trong hệ thống"
                      : "Bắt đầu tạo khóa học của bạn để bắt đầu giảng dạy"}
                  </p>
                </div>
                {!isAdmin && (
                  <button
                    onClick={handleCreateCourse}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                    <span>Tạo khóa học mới</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses?.map((course) => (
                  <CourseCard
                    key={course.id}
                    type="teacher"
                    title={course.title}
                    image={
                      course.imageUrl ||
                      "https://via.placeholder.com/300x200?text=No+Image"
                    }
                    status={course.status}
                    code={course.classCode}
                    studentsCount={course.totalEnrollments}
                    schedule={"Chưa có lịch"} // Mock schedule
                    onPreview={() => handlePreviewCourse(course.id)}
                    onManage={() => handleEditCourse(course.id)}
                    onEdit={() => handleEditCourse(course.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
