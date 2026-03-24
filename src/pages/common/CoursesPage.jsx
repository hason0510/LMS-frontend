import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import CourseCard from "../../components/course/CourseCard";
import CourseFilters from "../../components/course/CourseFilters";
import { Select, Spin, Alert } from "antd";
import { getAllCourses } from "../../api/course";
import { useAuth } from "../../contexts/AuthContext";

export default function CoursesPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";
  const isTeacherOrAdmin = isTeacher || isAdmin;
  console.log("User role:", user?.role);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({
    categories: [],
    rating: null
  });

  useEffect(() => {
    fetchCourses(1); // Reset to page 1 when filters change
  }, [filters]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchCourses(currentPage);
    }
  }, [currentPage]);

  const fetchCourses = async (page) => {
    try {
      setLoading(true);
      const response = await getAllCourses(page, 10); // Default page size 10
      let filteredCourses = response.data.pageList;

      // Apply filters locally
      if (filters.categories && filters.categories.length > 0) {
        filteredCourses = filteredCourses.filter(course => 
          filters.categories.includes(course.categoryName || course.category)
        );
      }

      if (filters.rating) {
        const minRating = parseFloat(filters.rating);
        filteredCourses = filteredCourses.filter(course => 
          (course.rating || 0) >= minRating
        );
      }

      setCourses(filteredCourses);
      console.log("Fetched courses:", response.data.pageList);
      setTotalPages(response.data.totalPage);
      setTotalElements(filteredCourses.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

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
                      Tất cả khóa học
                    </h1>
                    <p className="text-[#617589] dark:text-gray-400">
                      Khám phá và quản lý các khóa học có sẵn
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
                          Kết quả: <span className="text-primary">{totalElements}</span> khóa học
                        </h2>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span className="text-sm font-medium text-[#617589] dark:text-gray-400 flex-shrink-0">
                            Sắp xếp:
                          </span>
                          <Select
                            defaultValue="popular"
                            options={[
                              { value: "popular", label: "Phổ biến nhất" },
                              { value: "newest", label: "Mới nhất" },
                              { value: "rating", label: "Đánh giá cao" },
                            ]}
                            className="w-full sm:w-48"
                          />
                        </div>
                      </div>

                      {loading ? (
                        <div className="flex justify-center items-center min-h-96">
                          <Spin size="large" tip="Đang tải khóa học..." />
                        </div>
                      ) : error ? (
                        <Alert
                          message="Lỗi tải khóa học"
                          description={error}
                          type="error"
                          showIcon
                          className="mb-6"
                        />
                      ) : courses?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-96 gap-4">
                          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">
                            school
                          </span>
                          <p className="text-lg text-gray-600 dark:text-gray-400">
                            Không tìm thấy khóa học nào
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses?.map((c) => (
                              <CourseCard
                                key={c.id}
                                id={c.id}
                                title={c.title || c.courseName}
                                author={c.teacherName || c.instructor?.fullName}
                                image={
                                  c.imageUrl ||
                                  c.avatar ||
                                  "https://via.placeholder.com/300x200?text=No+Image"
                                }
                                rating={c.rating || 0}
                                reviews={c.reviewCount?.toString() || "0"}
                              />
                            ))}
                          </div>

                          {totalPages > 1 && (
                            <div className="flex justify-center mt-12">
                              <nav
                                aria-label="Pagination"
                                className="flex items-center gap-2"
                              >
                                <button
                                  onClick={() =>
                                    handlePageChange(currentPage - 1)
                                  }
                                  disabled={currentPage === 1}
                                  className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Trang trước"
                                >
                                  <span className="material-symbols-outlined !text-xl">
                                    chevron_left
                                  </span>
                                </button>

                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-4">
                                  Trang <span className="font-bold text-primary">{currentPage}</span> / {totalPages}
                                </span>

                                <button
                                  onClick={() =>
                                    handlePageChange(currentPage + 1)
                                  }
                                  disabled={currentPage === totalPages}
                                  className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title="Trang sau"
                                >
                                  <span className="material-symbols-outlined !text-xl">
                                    chevron_right
                                  </span>
                                </button>
                              </nav>
                            </div>
                          )}
                        </>
                      )}
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
                    Tất cả khóa học
                  </h1>
                  <p className="text-[#617589] dark:text-gray-400">
                    Khám phá các khóa học chất lượng cao từ những chuyên gia hàng đầu
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
                        Kết quả: <span className="text-primary">{totalElements}</span> khóa học
                      </h2>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium text-[#617589] dark:text-gray-400 flex-shrink-0">
                          Sắp xếp:
                        </span>
                        <Select
                          defaultValue="popular"
                          options={[
                            { value: "popular", label: "Phổ biến nhất" },
                            { value: "newest", label: "Mới nhất" },
                            { value: "rating", label: "Đánh giá cao" },
                          ]}
                          className="w-full sm:w-48"
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className="flex justify-center items-center min-h-96">
                        <Spin size="large" tip="Đang tải khóa học..." />
                      </div>
                    ) : error ? (
                      <Alert
                        message="Lỗi tải khóa học"
                        description={error}
                        type="error"
                        showIcon
                        className="mb-6"
                      />
                    ) : courses?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
                        <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">
                          school
                        </span>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                          Không tìm thấy khóa học nào
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {courses?.map((c) => (
                            <CourseCard
                              key={c.id}
                              id={c.id}
                              title={c.title || c.courseName}
                              author={c.teacherName || c.instructor?.fullName}
                              image={
                                c.imageUrl ||
                                c.avatar ||
                                "https://via.placeholder.com/300x200?text=No+Image"
                              }
                              rating={c.rating || 0}
                              reviews={c.reviewCount?.toString() || "0"}
                            />
                          ))}
                        </div>

                        {totalPages > 1 && (
                          <div className="flex justify-center mt-12">
                            <nav
                              aria-label="Pagination"
                              className="flex items-center gap-2"
                            >
                              <button
                                onClick={() =>
                                  handlePageChange(currentPage - 1)
                                }
                                disabled={currentPage === 1}
                                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Trang trước"
                              >
                                <span className="material-symbols-outlined !text-xl">
                                  chevron_left
                                </span>
                              </button>

                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-4">
                                Trang <span className="font-bold text-primary">{currentPage}</span> / {totalPages}
                              </span>

                              <button
                                onClick={() =>
                                  handlePageChange(currentPage + 1)
                                }
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Trang sau"
                              >
                                <span className="material-symbols-outlined !text-xl">
                                  chevron_right
                                </span>
                              </button>
                            </nav>
                          </div>
                        )}
                      </>
                    )}
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
