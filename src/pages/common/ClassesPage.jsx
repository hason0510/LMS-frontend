import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import CourseCard from "../../components/course/CourseCard";
import CourseFilters from "../../components/course/CourseFilters";
import { Select, Spin, Alert } from "antd";
import { getClassSections } from "../../api/classSection";
import { enrollPrivateCourse } from "../../api/enrollment";
import { useAuth } from "../../contexts/AuthContext";
import { KeyIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import classPlaceholder from "../../assets/class_placeholder.png";

export default function ClassesPage() {
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ categories: [] });

  // Join by code state (student only)
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinResult, setJoinResult] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, [filters, isTeacherOrAdmin]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getClassSections({});
      const allCourses = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      let filteredCourses = isTeacherOrAdmin
        ? allCourses
        : allCourses.filter((course) => course?.status === "PUBLIC");

      if (filters.categories && filters.categories.length > 0) {
        filteredCourses = filteredCourses.filter((course) =>
          filters.categories.includes(course.subjectTitle)
        );
      }

      setCourses(filteredCourses);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinResult(null);
    try {
      await enrollPrivateCourse(joinCode.trim());
      setJoinResult({ type: "success", message: "Gia nhập lớp thành công! Kiểm tra lớp học của bạn." });
      setJoinCode("");
    } catch (err) {
      const msg = err?.response?.data?.message || "Mã lớp không hợp lệ hoặc lớp học không tồn tại.";
      setJoinResult({ type: "error", message: msg });
    } finally {
      setJoinLoading(false);
    }
  };

  const sortOptions = [
    { value: "popular", label: "Phổ biến nhất" },
    { value: "newest", label: "Mới nhất" },
  ];

  const CourseGrid = ({ items }) =>
    loading ? (
      <div className="flex justify-center items-center min-h-96">
        <Spin size="large" />
      </div>
    ) : error ? (
      <Alert message="Lỗi tải lớp học" description={error} type="error" showIcon className="mb-6" />
    ) : items.length === 0 ? (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">school</span>
        <p className="text-lg text-gray-600 dark:text-gray-400">Không tìm thấy lớp học nào</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((c) => (
          <CourseCard
            key={c.id}
            id={c.id}
            title={c.title || c.classCode}
            author={c.teacherName}
            image={c.imageUrl || classPlaceholder}
          />
        ))}
      </div>
    );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      {isTeacherOrAdmin ? (
        <>
          <TeacherHeader />
          <div className="flex">
            <TeacherSidebar />
            <main className="flex-1 lg:ml-64">
              <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-7xl mx-auto">
                  <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-black text-[#111418] dark:text-white mb-2">
                      Tất cả lớp học
                    </h1>
                    <p className="text-[#617589] dark:text-gray-400">
                      Khám phá và quản lý các lớp học có sẵn
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <aside className="lg:col-span-1">
                      <div className="sticky top-20">
                        <CourseFilters onFilterChange={handleFilterChange} />
                      </div>
                    </aside>
                    <div className="lg:col-span-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h2 className="text-lg font-bold text-[#111418] dark:text-white">
                          Kết quả: <span className="text-primary">{courses.length}</span> lớp học
                        </h2>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span className="text-sm font-medium text-[#617589] dark:text-gray-400 flex-shrink-0">Sắp xếp:</span>
                          <Select defaultValue="popular" options={sortOptions} className="w-full sm:w-48" />
                        </div>
                      </div>
                      <CourseGrid items={courses} />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </>
      ) : (
        <>
          <Header />
          <main className="flex-1">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-black text-[#111418] dark:text-white mb-2">
                    Tất cả lớp học
                  </h1>
                  <p className="text-[#617589] dark:text-gray-400">
                    Khám phá các lớp học chất lượng cao từ những chuyên gia hàng đầu
                  </p>
                </div>

                {/* Join by Code – student only */}
                <div className="mb-6 max-w-3xl rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 p-4 sm:p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/20 text-primary flex-shrink-0">
                      <KeyIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#111418] dark:text-white">Gia nhập lớp học bằng mã</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Nhập mã lớp do giảng viên cung cấp để tham gia ngay.</p>
                    </div>
                  </div>
                  <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => { setJoinCode(e.target.value); setJoinResult(null); }}
                      placeholder="Nhập mã lớp học..."
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#111418] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={joinLoading}
                    />
                    <button
                      type="submit"
                      disabled={joinLoading || !joinCode.trim()}
                      className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-opacity"
                    >
                      {joinLoading ? (
                        <span className="flex items-center gap-2"><Spin size="small" /> Đang xử lý...</span>
                      ) : (
                        <><KeyIcon className="h-4 w-4" /> Gia nhập</>
                      )}
                    </button>
                  </form>
                  {joinResult && (
                    <div className={`mt-3 flex items-start gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
                      joinResult.type === "success"
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    }`}>
                      {joinResult.type === "success"
                        ? <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        : <XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                      <span>{joinResult.message}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <aside className="lg:col-span-1">
                    <div className="sticky top-20">
                      <CourseFilters onFilterChange={handleFilterChange} />
                    </div>
                  </aside>
                  <div className="lg:col-span-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                      <h2 className="text-lg font-bold text-[#111418] dark:text-white">
                        Kết quả: <span className="text-primary">{courses.length}</span> lớp học
                      </h2>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium text-[#617589] dark:text-gray-400 flex-shrink-0">Sắp xếp:</span>
                        <Select defaultValue="popular" options={sortOptions} className="w-full sm:w-48" />
                      </div>
                    </div>
                    <CourseGrid items={courses} />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
