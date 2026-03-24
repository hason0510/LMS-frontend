import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import CourseTabs from "../../components/course/CourseTabs";
import DescriptionCourse from "../../components/course/DescriptionCourse";
import CourseContent from "../../components/course/CourseContent";
import ReviewTab from "../../components/course/ReviewTab";
import TeacherTab from "../../components/course/TeacherTab";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCourseById, publishCourse, enrollCourse, checkEnrollmentStatus } from "../../api/course";
import { Spin, Alert, Modal, Button, message } from "antd";
import { ArrowLeftIcon, ArrowRightIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

export default function CourseDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";
  const isTeacherOrAdmin = isTeacher || isAdmin;
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
    useEffect(() => {
      const handleResize = () => {
        setSidebarCollapsed(window.innerWidth < 1024);
      };
  
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

  const fetchCourse = async () => {
    try {
      const response = await getCourseById(id);
      console.log("Fetched course details:", response);
      setCourse(response.data);
      
      // Check enrollment status if user is a student
      if (isStudent) {
        const res = await checkEnrollmentStatus(id);
        // console.log("Enrollment status:", res);
        setEnrollmentStatus(res.data.enrollmentStatus);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchCourse().finally(() => setLoading(false));
    }
  }, [id, isStudent]);

  // Helper function to render stars based on rating
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating % 1) >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    const stars = [];

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span
          key={`full-${i}`}
          className="material-symbols-outlined !text-base text-yellow-500"
          style={{ fontVariationSettings: '"FILL" 1' }}
        >
          star
        </span>
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <span
          key="half"
          className="material-symbols-outlined !text-base text-yellow-500"
          style={{ fontVariationSettings: '"FILL" 1' }}
        >
          star_half
        </span>
      );
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span
          key={`empty-${i}`}
          className="material-symbols-outlined !text-base text-gray-300 dark:text-gray-600"
          style={{ fontVariationSettings: '"FILL" 0' }}
        >
          star
        </span>
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <Alert message="Lỗi" description={error} type="error" showIcon />
      </div>
    );
  }

  if (!course) return null;

  const handlePublish = () => {
    Modal.confirm({
      title: "Xuất bản khóa học",
      content: `Bạn có chắc chắn muốn xuất bản khóa học "${course.title}" không? Khóa học sẽ trở thành công khai.`,
      okText: "Xuất bản",
      cancelText: "Hủy",
      okButtonProps: { danger: false },
      onOk: async () => {
        try {
          setPublishing(true);
          await publishCourse(id);
          message.success("Khóa học đã được xuất bản thành công!");
          // Refresh course data
          const response = await getCourseById(id);
          setCourse(response.data);
        } catch (err) {
          message.error(err.message || "Lỗi khi xuất bản khóa học");
        } finally {
          setPublishing(false);
        }
      },
    });
  };

  const handleEnroll = async () => {
    Modal.confirm({
      title: "Xác nhận đăng ký khóa học",
      content: `Bạn có chắc chắn muốn đăng ký khóa học "${course.title}" không?`,
      okText: "Đăng ký",
      cancelText: "Hủy",
      okButtonProps: { danger: false },
      onOk: async () => {
        try {
          setEnrolling(true);
          await enrollCourse(id);
          message.success("Bạn đã gửi đăng ký khóa học. Vui lòng chờ phê duyệt.");
          setEnrollmentStatus("PENDING");
          // Refresh course data
          const response = await getCourseById(id);
          setCourse(response.data);
        } catch (err) {
          message.error(err.message || "Lỗi khi đăng ký khóa học");
        } finally {
          setEnrolling(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#333333] dark:text-gray-200">
        {isTeacherOrAdmin ? <TeacherHeader /> : <Header />}
          <div className="flex items-center justify-center">
            {isTeacherOrAdmin && <TeacherSidebar />}
            <main className={`flex-1 ${isTeacherOrAdmin ? `${
          sidebarCollapsed ? "pl-20 pt-16" : "pl-64 pt-16"
        }` : "max-w-7xl"} w-full`}>
              <div className="container mx-auto sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span className="font-medium">
                    Quay lại danh sách khóa học
                  </span>
                </button>
                <div className="grid grid-cols-12 gap-8">
                  {/* Main Content (Left Column) */}
                  <div className="col-span-12 lg:col-span-8">
                    <div className="flex flex-col gap-4 mb-6">
                      <p className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                        {course.title}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 text-lg">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300 mt-2">
                        <div className="flex items-center gap-2">
                          {course.teacherImageUrl ? (
                            <img
                              alt={`Avatar giảng viên ${course.teacherName}`}
                              className="w-8 h-8 rounded-full object-cover"
                              src={course.teacherImageUrl}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-semibold text-xs">
                              {course.teacherName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>
                            Giảng viên:{" "}
                            <span className="font-semibold text-[#111418] dark:text-white">
                              {course.teacherName}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-yellow-500">{course.rating?.toFixed(1) || "0.0"}</span>
                          <div className="flex gap-0.5 text-yellow-500">
                            {renderStars(course.rating)}
                          </div>
                          <span className="text-gray-500 dark:text-gray-400">
                            ({course.reviewCounts || 0} đánh giá)
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Tabs */}
                    <div className="w-full">
                      {/* Tabs */}
                      <CourseTabs
                        tabs={[
                          {
                            label: "Mô tả",
                            content: (
                              <DescriptionCourse
                                description={course.description}
                              />
                            ),
                          },
                          {
                            label: "Nội dung khóa học",
                            content: <CourseContent enrollmentStatus={enrollmentStatus} />,
                          },
                          { label: "Giảng viên", content: <TeacherTab course={course} /> },
                          { label: "Đánh giá", content: <ReviewTab enrollmentStatus={enrollmentStatus} onReviewChanged={fetchCourse} /> },
                        ]}
                        defaultIndex={0}
                      />
                    </div>
                  </div>
                  {/* Sidebar (Right Column) */}
                  <div className="col-span-12 lg:col-span-4">
                    <div className="sticky top-24 space-y-6">
                      {/* Course Info List */}
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-[#111418] dark:text-white mb-4">
                          Thông tin khóa học
                        </h3>
                        <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                          <li className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                              schedule
                            </span>
                            <span>Thời lượng: 30 giờ video</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                              slideshow
                            </span>
                            <span>Số bài giảng: 215</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                              bar_chart
                            </span>
                            <span>Cấp độ: Mọi cấp độ</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                              language
                            </span>
                            <span>Ngôn ngữ: Tiếng Việt</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">
                              workspace_premium
                            </span>
                            <span>Có chứng chỉ hoàn thành</span>
                          </li>
                        </ul>
                      </div>
                      {isTeacherOrAdmin && course.status === "PRIVATE" && (
                        <Button
                          type="primary"
                          size="large"
                          block
                          loading={publishing}
                          onClick={handlePublish}
                          className="h-12 text-base font-bold flex items-center justify-center gap-2"
                        >
                          Xuất bản khóa học
                          <PaperAirplaneIcon className="w-5 h-5 ml-2" />
                        </Button>
                      )}
                      {!isTeacherOrAdmin && (enrollmentStatus === null || enrollmentStatus === "REJECTED") && (
                        <Button
                          type="primary"
                          size="large"
                          block
                          loading={enrolling}
                          onClick={handleEnroll}
                          className="h-12 text-base group font-bold flex items-center justify-center gap-2"
                        >
                          Đăng ký học
                          <ArrowRightIcon className="h-4 w-4 transform transition-transform duration-200 group-hover:translate-x-2" />
                        </Button>
                      )}
                      {!isTeacherOrAdmin && enrollmentStatus === "PENDING" && (
                        <div className="w-full h-12 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-500 rounded-lg flex items-center justify-center text-yellow-700 dark:text-yellow-200 font-bold">
                          Chờ duyệt
                        </div>
                      )}
                      {!isTeacherOrAdmin && enrollmentStatus === "APPROVED" && (
                        <div className="w-full h-12 bg-green-100 dark:bg-green-900 border-2 border-green-500 rounded-lg flex items-center justify-center text-green-700 dark:text-green-200 font-bold">
                          Đã đăng ký khóa học
                        </div>
                      )}
                      {!isTeacherOrAdmin && enrollmentStatus === "REJECTED" && (
                        <div className="w-full h-12 bg-red-100 dark:bg-red-900 border-2 border-red-500 rounded-lg flex items-center justify-center text-red-700 dark:text-red-200 font-bold">
                          Yêu cầu bị từ chối
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
    </div>
  );
}
