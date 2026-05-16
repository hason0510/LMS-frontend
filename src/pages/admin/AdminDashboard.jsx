import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import {
  UserGroupIcon,
  AcademicCapIcon,
  UserPlusIcon,
  BookOpenIcon,
  UsersIcon,
  CheckBadgeIcon,
  TagIcon,
  ListBulletIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { Spin } from "antd";
import { getAllUsers } from "../../api/user";
import { getAdminCourses as getAdminClassSections } from "../../api/classSection";
import { getAllEnrollments } from "../../api/enrollment";
import { getAllSubjects } from "../../api/subject";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState([
    { label: "Tổng số người dùng", value: "...", icon: UserGroupIcon, color: "blue" },
    { label: "Lớp học đang hoạt động", value: "...", icon: AcademicCapIcon, color: "green" },
    { label: "Yêu cầu đăng ký mới", value: "...", icon: UserPlusIcon, color: "amber" },
    { label: "Tổng môn học", value: "...", icon: BookOpenIcon, color: "purple" },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, classSectionsRes, subjectsRes] = await Promise.all([
        getAllUsers(0, 1),
        getAdminClassSections(1, 1000),
        getAllSubjects(),
      ]);

      const totalUsers = usersRes.data?.totalElements || 0;

      const classSectionsList = Array.isArray(classSectionsRes.data)
        ? classSectionsRes.data
        : classSectionsRes.data?.pageList || [];
      const totalClassSections = classSectionsRes.data?.totalElements ?? classSectionsList.length;

      const totalSubjects = Array.isArray(subjectsRes.data)
        ? subjectsRes.data.length
        : subjectsRes.data?.totalElements || 0;

      // Pending enrollments — null = fetch failed (unknown), number = confirmed count
      let pendingEnrollmentsCount = null;
      try {
        const pendingRes = await getAllEnrollments(1, 1, "PENDING");
        pendingEnrollmentsCount = pendingRes.data?.totalElements ?? 0;
      } catch {
        // leave null so we don't falsely claim "all clear"
      }

      // Chart: class sections grouped by subject
      const subjectMap = {};
      classSectionsList.forEach((cs) => {
        const subject = cs.subjectTitle || "Chưa phân loại";
        subjectMap[subject] = (subjectMap[subject] || 0) + 1;
      });
      const rawChartData = Object.entries(subjectMap)
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setChartData(rawChartData);

      // Alerts
      const newAlerts = [];
      if (pendingEnrollmentsCount === null) {
        newAlerts.push({
          id: 1,
          type: "warning",
          title: "Không thể tải yêu cầu tham gia",
          message: "Không thể xác nhận trạng thái yêu cầu đăng ký. Hãy kiểm tra lại.",
          action: null,
          actionLabel: null,
        });
      } else if (pendingEnrollmentsCount > 0) {
        newAlerts.push({
          id: 1,
          type: "info",
          title: "Yêu cầu tham gia chờ xử lý",
          message: `Có ${pendingEnrollmentsCount} yêu cầu tham gia lớp học đang chờ phê duyệt.`,
          action: null,
          actionLabel: null,
        });
      } else {
        newAlerts.push({
          id: 1,
          type: "success",
          title: "Hệ thống ổn định",
          message: "Không có yêu cầu tham gia lớp học nào đang chờ xử lý.",
          action: null,
          actionLabel: null,
        });
      }
      setAlerts(newAlerts);

      setStats([
        {
          label: "Tổng số người dùng",
          value: totalUsers.toLocaleString(),
          icon: UserGroupIcon,
          color: "blue",
        },
        {
          label: "Lớp học đang hoạt động",
          value: totalClassSections.toLocaleString(),
          icon: AcademicCapIcon,
          color: "green",
        },
        {
          label: "Yêu cầu đăng ký mới",
          value: pendingEnrollmentsCount !== null ? pendingEnrollmentsCount.toLocaleString() : "—",
          icon: UserPlusIcon,
          color: "amber",
        },
        {
          label: "Tổng môn học",
          value: totalSubjects.toLocaleString(),
          icon: BookOpenIcon,
          color: "purple",
        },
      ]);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Lỗi khi tải dữ liệu bảng điều khiển");
    } finally {
      setLoading(false);
    }
  };

  const colorMap = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  };

  const alertColorMap = {
    warning: {
      card: "bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20",
      title: "text-amber-900 dark:text-amber-200",
      message: "text-amber-800/80 dark:text-amber-400/80",
    },
    info: {
      card: "bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20",
      title: "text-blue-900 dark:text-blue-200",
      message: "text-blue-800/80 dark:text-blue-400/80",
    },
    success: {
      card: "bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20",
      title: "text-green-900 dark:text-green-200",
      message: "text-green-800/80 dark:text-green-400/80",
    },
  };

  const quickActions = [
    { label: "Quản lý người dùng", icon: UsersIcon, to: "/admin/users" },
    { label: "Duyệt lớp học", icon: CheckBadgeIcon, to: "/admin/class-sections" },
    { label: "Danh mục", icon: TagIcon, to: "/admin/categories" },
    { label: "Môn học", icon: ListBulletIcon, to: "/admin/subjects" },
    { label: "Quản lý media", icon: PhotoIcon, to: "/admin/media" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TeacherHeader />
      <AdminSidebar />

      <main
        className={`pt-16 pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-wrap mt-3 items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Bảng quản trị hệ thống
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Quản lý tổng thể tài khoản, lớp học và đăng ký.
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Làm mới
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.to}
                  onClick={() => navigate(action.to)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm hover:border-primary/50 hover:shadow-md transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="rounded-xl p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${colorMap[stat.color]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Chart: class sections per subject */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800/50 lg:col-span-3 shadow-sm">
              <div className="mb-6">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  Lớp học theo môn học
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Phân bổ lớp học hiện có theo từng môn
                </p>
              </div>

              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
                  Chưa có dữ liệu lớp học.
                </div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="subject"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9ca3af", fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-xl">
                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                  {payload[0].payload.subject}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  Lớp học:{" "}
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {payload[0].value}
                                  </span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="#137fec" radius={[4, 4, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Alerts Section */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800/50 lg:col-span-2 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
                Việc cần xử lý
              </h3>
              <div className="space-y-4">
                {alerts.map((alert) => {
                  const colors = alertColorMap[alert.type] || alertColorMap.info;
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl ${colors.card}`}
                    >
                      <p className={`text-sm font-bold mb-1 ${colors.title}`}>
                        {alert.title}
                      </p>
                      <p className={`text-xs leading-relaxed ${colors.message}`}>
                        {alert.message}
                      </p>
                      {alert.action && (
                        <button
                          onClick={alert.action}
                          className="mt-2 text-xs font-semibold text-primary hover:underline"
                        >
                          {alert.actionLabel}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
