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
import { getClassSections, deleteClassSection } from "../../api/classSection";
import { Spin, Alert, message } from "antd";
import AdminSidebar from "../../components/layout/AdminSidebar";
import classPlaceholder from "../../assets/class_placeholder.png";

export default function TeacherClassSections({ isAdmin = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [classSections, setClassSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchClassSections();
  }, []);

  const fetchClassSections = async () => {
    try {
      setLoading(true);
      const params = isAdmin ? {} : { teacherId: user?.id || user?.sub };
      const response = await getClassSections(params);
      setClassSections(response.data || response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteClassSection(id);
      message.success("Đã xóa lớp học!");
      setClassSections((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      message.error("Không thể xóa lớp học: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredClassSections = classSections?.filter((section) => {
    if (searchQuery && !section.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !section.classCode?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeTab === "active" && section.status !== "PUBLIC") return false;
    if (activeTab === "draft" && section.status !== "PRIVATE") return false;
    if (activeTab === "archived" && section.status !== "ARCHIVED") return false;
    return true;
  });

  const handleCreateClassSection = () => {
    navigate(`/${userRole}/curriculums`);
  };

  const tabConfig = [
    { key: "all", label: "Tất cả", count: classSections?.length ?? 0 },
    {
      key: "active",
      label: "Đang hoạt động",
      count: classSections?.filter((s) => s.status === "PUBLIC").length ?? 0,
    },
    {
      key: "draft",
      label: "Bản nháp",
      count: classSections?.filter((s) => s.status === "PRIVATE").length ?? 0,
    },
    {
      key: "archived",
      label: "Lưu trữ",
      count: classSections?.filter((s) => s.status === "ARCHIVED").length ?? 0,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main
          className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 transition-all duration-300 ${
            sidebarCollapsed ? "pl-20" : "pl-64"
          }`}
        >
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight">
                  {isAdmin ? "Quản lý Lớp học" : "Lớp học của tôi"}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  {isAdmin
                    ? "Quản lý tất cả các lớp học trong hệ thống."
                    : "Quản lý tất cả các lớp học bạn đang giảng dạy."}
                </p>
              </div>
              <button
                onClick={handleCreateClassSection}
                className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors shrink-0"
              >
                <PlusCircleIcon className="h-5 w-5" />
                Tạo lớp từ Chương Trình Học
              </button>
            </div>

            {/* Search + Filter */}
            <div className="space-y-4 mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-gray-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm dark:text-white"
                  placeholder="Tìm kiếm theo tên hoặc mã lớp..."
                />
              </div>

              {/* Status filter tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabConfig.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 h-9 shrink-0 rounded-lg px-4 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "bg-primary text-white"
                        : "bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tab.label}
                    {!loading && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          activeTab === tab.key
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : error ? (
              <Alert description={error} type="error" showIcon />
            ) : !filteredClassSections || filteredClassSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  {activeTab !== "all" ? "Không có lớp nào phù hợp" : "Chưa có lớp học nào"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 text-center max-w-xs">
                  {isAdmin
                    ? "Không có lớp học nào trong hệ thống."
                    : "Hãy tạo lớp học từ chương trình học để bắt đầu giảng dạy."}
                </p>
                {!isAdmin && activeTab === "all" && (
                  <button
                    onClick={handleCreateClassSection}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    <PlusCircleIcon className="h-5 w-5" />
                    Tạo lớp học mới
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredClassSections.map((section) => (
                  <CourseCard
                    key={section.id}
                    id={section.id}
                    type="teacher"
                    title={section.title || section.classCode}
                    image={section.imageUrl || classPlaceholder}
                    status={section.status || "PRIVATE"}
                    code={section.classCode}
                    studentsCount={section.totalEnrollments || 0}
                    schedule={section.subjectTitle || section.subjectName || "Chưa có môn học"}
                    onPreview={() => navigate(`/${userRole}/class-sections/${section.id}`)}
                    onDelete={() => handleDelete(section.id)}
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
