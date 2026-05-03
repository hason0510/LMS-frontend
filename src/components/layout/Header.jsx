import React, { useState, useRef, useEffect } from "react";
import Avatar from "../common/Avatar";
import ConfirmModal from "../common/ConfirmModal";
import NotificationDetailModal from "../common/NotificationDetailModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import useUserStore from "../../store/useUserStore";
import {
  BellIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  getMyNotifications,
  countUnreadNotifications,
  markNotificationAsRead,
} from "../../api/notification";

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

export default function Header({ menuItems }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, logout } = useAuth();
  const user = useUserStore((state) => state.user);

  // Use Notification Store
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isNotificationDetailOpen, setIsNotificationDetailOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const defaultMenuItems = [
    { label: "Lớp học", path: "/classes", icon: BookOpenIcon },
    ...(user?.role === "STUDENT"
      ? [{ label: t("assignments.studentTitle"), path: "/student/assignments", icon: ClipboardDocumentListIcon }]
      : []),
    { label: t("header.gioiThieu"), path: "/home", icon: HomeIcon },
    // { label: "Liên hệ", path: "#" },
    { label: t("header.trangCaNhan"), path: "/student/profile", icon: UserCircleIcon },
  ];

  const itemsToRender = menuItems || defaultMenuItems;

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isLoggedIn && isNotificationOpen) {
      const load = async () => {
        setIsLoadingNotifications(true);
        await fetchNotifications();
        setIsLoadingNotifications(false);
      };
      load();
    }
  }, [isNotificationOpen, isLoggedIn, fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const formattedNotifications = notifications.map((n) => ({
    ...n,
    time: formatNotificationTime(n.time || n.createdAt),
  }));

  // Helper function to check if a path is active
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, notificationRef]);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      logout();
      setShowLogoutConfirm(false);
      navigate("/home");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };
  return (
    <>
      <header className="sticky top-0 z-50 flex justify-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-solid border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between whitespace-nowrap px-4 sm:px-6 lg:px-8 py-3 w-full max-w-7xl">
          <div className="flex items-center gap-8">
{/*            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-primary text-3xl">
                school
              </span>
              <h2 className="hidden sm:block text-xl font-bold leading-tight tracking-[-0.015em] text-[#111418] dark:text-white">
                LearnOnline
              </h2>
            </div>*/}
            <div className="flex items-center gap-3 text-primary">
              {/* 1. Icon nên có leading-none để xóa sạch padding thừa của font icon */}
              <span className="material-symbols-outlined text-primary text-3xl leading-none">
                school
              </span>
              {/* 2. Tinh chỉnh translate-y:
      - Nếu chữ đang cao hơn icon: dùng translate-y-[1px] hoặc [2px]
      - Nếu chữ đang thấp hơn icon: dùng -translate-y-[1px] hoặc [-2px]
  */}
              <h2 className="hidden sm:block text-xl font-bold leading-none tracking-[-0.015em] text-[#111418] dark:text-white transform translate-y-[4px]">
                LearnOnline
              </h2>
            </div>
            <nav className="hidden lg:flex items-center gap-8">
              {itemsToRender.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className={`text-sm font-medium leading-normal hover:text-primary bg-transparent ${
                    isActive(item.path) && item.path !== "#"
                      ? "text-primary font-bold"
                      : "text-[#111418] dark:text-white/90"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <nav className="flex lg:hidden items-center gap-6">
              {itemsToRender.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={index}
                    to={item.path}
                    className={`transition-colors ${
                      isActive(item.path) && item.path !== "#"
                        ? "text-primary"
                        : "text-[#111418] dark:text-white/90 hover:text-primary"
                    }`}
                    title={item.label}
                  >
                    {Icon && <Icon className="h-6 w-6" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-1 justify-end gap-2 sm:gap-4 items-center">
            {isLoggedIn ? (
              <>
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="text-[#111418] dark:text-white hover:text-primary transition-colors relative p-1 focus:outline-none"
                  >
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"></span>
                    )}
                  </button>

                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 dark:border-gray-700 animate-fade-in-scale">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Thông báo {unreadCount > 0 && `(${unreadCount})`}
                        </h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {isLoadingNotifications ? (
                          <div className="px-4 py-3 text-center text-sm text-gray-500">
                            Đang tải...
                          </div>
                        ) : formattedNotifications.length > 0 ? (
                          formattedNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 relative transition-colors"
                            onClick={() => {                              setSelectedNotification(notification);
                              setIsNotificationDetailOpen(true);                              if (!notification.isRead) {
                                handleMarkAsRead(notification.id);
                              }
                            }}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Thời gian gửi: {notification.time}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                              )}
                            </div>
                          </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-sm text-gray-500">
                            Không có thông báo
                          </div>
                        )}
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700">
                        <Link
                          to="/student/profile/notifications"
                          className="block px-4 py-2 text-xs font-medium text-center text-primary hover:text-primary/80"
                        >
                          Xem tất cả thông báo
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded-lg transition-colors"
                  >
                    <Avatar
                      src={user?.imageUrl}
                      alt={user?.fullName || user?.username}
                    />
                    <div className="hidden sm:flex flex-col text-left">
                      <p className="text-sm font-bold text-[#111418] dark:text-white max-w-[150px] truncate">
                        {user?.fullName || user?.username || "User"}
                      </p>
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 dark:border-gray-700 animate-fade-in-scale">
                      <Link
                        to="/student/profile"
                        state={{ activeTab: "profile" }}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        {t("common.hoSo")}
                      </Link>
                      <Link
                        to="/student/profile/settings"
                        state={{ activeTab: "settings" }}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        {t("common.caiDat")}
                      </Link>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t("common.dangXuat")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-slate-100 dark:bg-slate-800 text-[#111418] dark:text-white text-sm font-bold transition-colors duration-150 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {t("common.dangnhap")}
                </Link>
                <Link
                  to="/register"
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold transition-colors duration-150 hover:bg-primary/90"
                >
                  {t("common.dangky")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Xác nhận Đăng xuất */}
      <ConfirmModal
        open={showLogoutConfirm}
        title={t("common.xacNhanDangXuat")}
        message={t("common.banCoChacChanMuonDangXuat")}
        actionName={t("common.dangXuat")}
        color="red"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        isLoading={isLoggingOut}
      />
      <NotificationDetailModal
        open={isNotificationDetailOpen}
        notification={selectedNotification}
        onClose={() => {
          setIsNotificationDetailOpen(false);
          setSelectedNotification(null);
        }}
      />
    </>
  );
}
