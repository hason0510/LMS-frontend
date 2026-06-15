import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spin, Empty, Pagination, Button } from "antd";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import NotificationDetailModal from "../../components/common/NotificationDetailModal";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { useAuth } from "../../contexts/AuthContext";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "../../api/notification";
import { normalizeNotificationItem } from "../../utils/notificationText";
import useNotificationStore from "../../store/useNotificationStore";

// Format timestamp to readable format (HH:mm:ss DD/MM/YYYY)
const formatNotificationTime = (timestamp) => {
  if (!timestamp) return "N/A";
  try {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  } catch (err) {
    return timestamp;
  }
};

export default function NotificationsPage({ embedded = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const isTeacherOrAdmin = isTeacher || isAdmin;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isNotificationDetailOpen, setIsNotificationDetailOpen] = useState(false);
  const pageSize = 10;

  const storeNotifications = useNotificationStore((state) => state.notifications);
  const storeUnreadCount = useNotificationStore((state) => state.unreadCount);
  const storeFetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAsReadStore = useNotificationStore((state) => state.markAsRead);

  // Map the time property for display
  const notifications = React.useMemo(() => {
    return storeNotifications.map((notification) => ({
      ...notification,
      time: formatNotificationTime(notification.time || notification.createdAt),
    }));
  }, [storeNotifications]);

  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      try {
        await storeFetchNotifications();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (storeNotifications.length === 0) {
      initFetch();
    }
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      await storeFetchNotifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markAsReadStore(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    for (const notification of notifications) {
      if (!notification.isRead && !notification.readStatus) {
        await markAsReadStore(notification.id);
      }
    }
  };

  // Pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedNotifications = notifications?.slice(startIndex, endIndex);
  const unreadCount = storeUnreadCount;

  return (
    <div className={`${isTeacherOrAdmin && !embedded ? "min-h-screen" : ""} ${embedded ? "bg-transparent" : "bg-background-light dark:bg-background-dark"} font-display text-[#111418] dark:text-white`}>
      {isTeacherOrAdmin && !embedded && <TeacherHeader />}
      <div className="flex">
        {isTeacher && !embedded && <TeacherSidebar />}
        {isAdmin && !embedded && <AdminSidebar />}
        <main className={`flex-1 w-full ${isTeacherOrAdmin && !embedded ? "mt-16 ml-20 lg:ml-64" : ""}`}>
          <div className={embedded ? "py-0" : "px-4 py-8 sm:px-6 lg:px-8"}>
            <div className={`${embedded ? "max-w-none" : "mx-auto max-w-7xl"}`}>
            {!embedded && <AppBreadcrumb className="mb-6" />}
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10 mb-6">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="!mb-1 text-2xl font-bold tracking-tight text-[#111418] dark:text-white sm:text-[2rem]">
                  Thông báo
                </p>
                <p className="!mb-1 text-base font-normal leading-normal text-[#617589] dark:text-gray-400">
                  {unreadCount > 0
                    ? `Bạn có ${unreadCount} thông báo chưa đọc`
                    : "Tất cả thông báo đều đã được đọc"}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button
                  type="primary"
                  onClick={handleMarkAllAsRead}
                  className="hover:opacity-80"
                >
                  Đánh dấu tất cả là đã đọc
                </Button>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center min-h-96">
                <Spin size="large" description="Đang tải thông báo..." />
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-800 dark:text-red-200">
                  Lỗi: {error}
                </p>
                <Button
                  type="primary"
                  onClick={fetchNotifications}
                  className="mt-4"
                >
                  Thử lại
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && notifications.length === 0 && (
              <Empty
                description="Không có thông báo"
                style={{ marginTop: "50px" }}
              />
            )}

            {/* Notifications List */}
            {!loading && notifications.length > 0 && (
              <>
                <div className="mb-6 space-y-4">
                  {paginatedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        notification.isRead || notification.readStatus
                          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      } hover:shadow-md`}
                      onClick={() => {
                        setSelectedNotification(notification);
                        if (!notification.isRead && !notification.readStatus) {
                          handleMarkAsRead(notification.id);
                        }
                        if (notification.actionUrl) {
                          navigate(notification.actionUrl);
                          return;
                        }
                        setIsNotificationDetailOpen(true);
                      }}
                    >
                      <div className="flex gap-4">
                        {!notification.isRead && !notification.readStatus && (
                          <div className="h-3 w-3 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-[#111418] dark:text-white mb-2">
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {notification.summary || notification.description || notification.message}
                          </p>
                          {notification.classSectionTitle && (
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                              Lớp: {notification.classSectionTitle}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              {notification.time}
                            </p>
                            {!notification.isRead && !notification.readStatus && (
                              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                Chưa đọc
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {notifications.length > pageSize && (
                  <div className="flex justify-center">
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={notifications.length}
                      onChange={(page) => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showSizeChanger={false}
                    />
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </main>
      </div>
      <NotificationDetailModal
        open={isNotificationDetailOpen}
        notification={selectedNotification}
        onClose={() => {
          setIsNotificationDetailOpen(false);
          setSelectedNotification(null);
          // Refresh notifications when modal closes to show updated read status
          fetchNotifications();
        }}
      />
    </div>
  );
}
