import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spin, Empty, Pagination, Button } from "antd";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Header from "../../components/layout/Header";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import NotificationDetailModal from "../../components/common/NotificationDetailModal";
import { useAuth } from "../../contexts/AuthContext";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "../../api/notification";

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

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";
  const isTeacherOrAdmin = isTeacher || isAdmin;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isNotificationDetailOpen, setIsNotificationDetailOpen] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await getMyNotifications();
      // Format the time field for each notification
      const formattedNotifications = response.data.map((notification) => ({
        ...notification,
        time: formatNotificationTime(notification.time),
      }));
      setNotifications(formattedNotifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      for (const notification of notifications) {
        if (!notification.isRead) {
          await markNotificationAsRead(notification.id);
        }
      }
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedNotifications = notifications?.slice(startIndex, endIndex);
  const unreadCount = notifications?.filter((n) => !n.isRead).length;

  return (
    <div className={`${isTeacherOrAdmin && "min-h-screen"} bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white`}>
      {isTeacherOrAdmin && <TeacherHeader />}
      <div className="flex">
        {isTeacherOrAdmin && <TeacherSidebar />}
        {/* {!isTeacherOrAdmin && <Header />} */}
        <main className={`flex-1 w-full ${isTeacherOrAdmin ? "mt-16 ml-20 lg:ml-64" : ""}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-[#111418] dark:text-white mb-2">
                  Thông báo
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
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
                <Spin size="large" tip="Đang tải thông báo..." />
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
                <div className="space-y-4 mb-6">
                  {paginatedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        notification.isRead
                          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      } hover:shadow-md`}
                      onClick={() => {
                        setSelectedNotification(notification);
                        setIsNotificationDetailOpen(true);
                        if (!notification.isRead) {
                          handleMarkAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex gap-4">
                        {!notification.isRead && (
                          <div className="h-3 w-3 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-[#111418] dark:text-white mb-2">
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              {notification.time}
                            </p>
                            {!notification.isRead && (
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
