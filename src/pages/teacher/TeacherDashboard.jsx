import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import QuickActionCard from "../../components/teacher/dashboard/QuickActionCard";
import DashboardCourseCard from "../../components/teacher/dashboard/DashboardCourseCard";
import StatItem from "../../components/teacher/dashboard/StatItem";
import { getTeacherCourses } from "../../api/classSection";
import { getTeachingAssignments } from "../../api/assignment";
import { getAllTeacherEnrollments } from "../../api/enrollment";
import { getMyNotificationsPage } from "../../api/notification";
import { Spin, Alert } from "antd";
import {
  AcademicCapIcon,
  PlusCircleIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightIcon,
  TrophyIcon,
  UserGroupIcon,
  BookOpenIcon,
  BellIcon,
  ClockIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [pendingEnrollments, setPendingEnrollments] = useState(0);
  const [pendingReviewTotal, setPendingReviewTotal] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchTeacherCourses();
    fetchUpcomingAssignments();
    fetchAllAssignmentsForStats();
    fetchPendingEnrollments();
    fetchNotifications();
  }, []);

  const fetchTeacherCourses = async () => {
    try {
      setLoading(true);
      const res = await getTeacherCourses();
      setCourses(res.data || []);
    } catch (err) {
      setError(err.message || "Lỗi khi tải khóa học");
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const response = await getTeachingAssignments({ tab: "UPCOMING" });
      const payload = response?.data;
      setUpcomingAssignments(Array.isArray(payload?.pageList) ? payload.pageList.slice(0, 5) : []);
    } catch {
      setUpcomingAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const fetchAllAssignmentsForStats = async () => {
    try {
      const response = await getTeachingAssignments({ tab: "ALL", pageSize: 200 });
      const list = response?.data?.pageList || [];
      const total = list.reduce((sum, a) => sum + (a.pendingReviewCount || 0), 0);
      setPendingReviewTotal(total);
    } catch {
      setPendingReviewTotal(0);
    }
  };

  const fetchPendingEnrollments = async () => {
    try {
      const res = await getAllTeacherEnrollments(1, 1, "PENDING");
      setPendingEnrollments(res.data?.totalElements || 0);
    } catch {
      setPendingEnrollments(0);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const res = await getMyNotificationsPage(1, 3);
      setNotifications(res.data?.pageList || []);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const totalStudents = Array.isArray(courses)
    ? courses.reduce((sum, c) => sum + (c.totalEnrollments || 0), 0)
    : 0;
  const totalCourses = Array.isArray(courses) ? courses.length : 0;

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main
          className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 transition-all duration-300 ${
            sidebarCollapsed ? "pl-20" : "pl-64"
          }`}
        >
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight tracking-[-0.015em]">
                  Dashboard Giáo viên
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Tổng quan hoạt động giảng dạy các lớp học của bạn.
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionCard
                      icon={<PlusCircleIcon className="h-8 w-8" />}
                      label="Tạo lớp học"
                      to="/teacher/curriculums"
                    />
                    <QuickActionCard
                      icon={<BookOpenIcon className="h-8 w-8" />}
                      label="Ngân hàng câu hỏi"
                      to="/teacher/question-banks"
                    />
                    <QuickActionCard
                      icon={<PhotoIcon className="h-8 w-8" />}
                      label="Kho media"
                      to="/teacher/media"
                    />
                    <QuickActionCard
                      icon={<ClipboardDocumentCheckIcon className="h-8 w-8" />}
                      label="Quản lý bài tập"
                      to="/teacher/assignments"
                    />
                    <QuickActionCard
                      icon={<DocumentTextIcon className="h-8 w-8" />}
                      label="Báo cáo"
                      to="/teacher/report"
                    />
                  </div>
                </div>

                {/* Teaching Courses */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                      Các lớp học đang giảng dạy
                    </h3>
                    <button
                      onClick={() => navigate("/teacher/class-sections")}
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
                    <Alert description={error} type="error" showIcon />
                  ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.slice(0, 4).map((course) => (
                        <div
                          key={course.id}
                          onClick={() => navigate(`/teacher/class-sections/${course.id}`)}
                          className="cursor-pointer"
                        >
                          <DashboardCourseCard
                            title={course.title}
                            students={course.totalEnrollments || 0}
                            classCode={course.classCode}
                            subject={course.subjectTitle || "Chưa phân loại"}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>Chưa có lớp học nào. Hãy tạo lớp học đầu tiên của bạn!</p>
                      <button
                        onClick={() => navigate("/teacher/curriculums")}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Tạo lớp học
                      </button>
                    </div>
                  )}
                </div>

                {/* Upcoming Assignments */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                      Bài tập sắp đến hạn
                    </h3>
                    <button
                      onClick={() => navigate("/teacher/assignments")}
                      className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                    >
                      <span>Xem tất cả</span>
                      <ArrowRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {assignmentsLoading ? (
                    <div className="flex justify-center py-6">
                      <Spin />
                    </div>
                  ) : upcomingAssignments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                      Không có bài tập nào sắp đến hạn.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingAssignments.map((assignment) => (
                        <button
                          key={`${assignment.assignmentId}-${assignment.classSectionId}`}
                          onClick={() =>
                            navigate(
                              `/teacher/class-sections/${assignment.classSectionId}/assignments/${assignment.assignmentId}/submissions`
                            )
                          }
                          className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-primary/60 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {assignment.assignmentTitle}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {assignment.classSectionTitle}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {assignment.pendingReviewCount > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                  {assignment.pendingReviewCount} chờ chấm
                                </span>
                              )}
                              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                {assignment.turnedInCount}/{assignment.totalStudents} nộp
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
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
                      label="Lớp học"
                      value={totalCourses}
                    />
                    <StatItem
                      icon={<UserGroupIcon className="h-6 w-6" />}
                      colorClass="bg-green-500/10 text-green-500"
                      label="Tổng học viên"
                      value={totalStudents}
                    />
                    <StatItem
                      icon={<TrophyIcon className="h-6 w-6" />}
                      colorClass="bg-amber-500/10 text-amber-500"
                      label="Yêu cầu tham gia chờ duyệt"
                      value={pendingEnrollments}
                    />
                    <StatItem
                      icon={<ClockIcon className="h-6 w-6" />}
                      colorClass="bg-red-500/10 text-red-500"
                      label="Bài nộp chưa chấm"
                      value={pendingReviewTotal}
                    />
                  </div>
                </div>

                {/* Real Notifications */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#111418] dark:text-white">
                      Thông báo gần đây
                    </h3>
                    <button
                      onClick={() => navigate("/notifications")}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Xem tất cả
                    </button>
                  </div>
                  {notificationsLoading ? (
                    <div className="flex justify-center py-4">
                      <Spin size="small" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center py-4 text-slate-400 dark:text-slate-500 gap-2">
                      <BellIcon className="h-8 w-8 opacity-40" />
                      <p className="text-sm">Không có thông báo mới.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                            notif.read
                              ? "bg-slate-50 dark:bg-slate-800/50"
                              : "bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20"
                          }`}
                        >
                          <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 shrink-0 mt-0.5">
                            <BellIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug line-clamp-2">
                              {notif.title || notif.content}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {formatNotificationTime(notif.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
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
