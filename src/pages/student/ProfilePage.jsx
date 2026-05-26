import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import MyCertificate from "../../components/student/profile/MyCertificate";
import MyInformation from "../../components/student/profile/MyInformation";
import AccountSettings from "../../components/student/profile/AccountSettings";
import ChangePassword from "../../components/student/profile/ChangePassword";
import NotificationsPage from "../common/NotificationsPage";
import Avatar from "../../components/common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { getUserById } from "../../api/user";
import useUserStore from "../../store/useUserStore";
import {
  UserIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  CameraIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeUserProfile = (data) => {
    if (!data) return data;
    return {
      ...data,
      username: data.userName || data.username || "",
      role: data.role || data.roleName || user?.role,
    };
  };

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          setIsLoading(true);
          const fullData = await getUserById(user.id);
          const normalizedFullData = normalizeUserProfile(fullData);
          setUserData(normalizedFullData);
          setProfileData(normalizedFullData);

          if (normalizedFullData) {
            useUserStore.getState().updateUser(normalizedFullData);
          }
        } catch (err) {
          console.error("Failed to fetch user data:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchUserData();
  }, [user?.id]);

  // Update active tab based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("information")) {
      setActiveTab("profile");
    } else if (path.includes("courses")) {
      setActiveTab("courses");
    } else if (path.includes("certificate")) {
      setActiveTab("certificate");
    } else if (path.includes("notifications")) {
      setActiveTab("notifications");
    } else if (path.includes("password")) {
      setActiveTab("password");
    } else if (path.includes("settings")) {
      setActiveTab("settings");
    } else {
      setActiveTab("profile");
    }
  }, [location.pathname]);

  const handleProfileUpdate = (updatedData) => {
    const normalizedUpdatedData = normalizeUserProfile(updatedData);
    setProfileData(normalizedUpdatedData);
    setUserData(normalizedUpdatedData);
    useUserStore.getState().updateUser(normalizedUpdatedData);
  };

  const handleTabClick = (tabId) => {
    const tabRoutes = {
      profile: "/student/profile/information",
      courses: "/student/profile/courses",
      certificate: "/student/profile/certificate",
      notifications: "/student/profile/notifications",
      password: "/student/profile/password",
      settings: "/student/profile/settings",
    };
    navigate(tabRoutes[tabId] || "/student/profile/information");
  };

  const roleValue =
    profileData?.roleName || userData?.roleName || user?.role || "STUDENT";
  const roleLabel =
    roleValue === "ADMIN"
      ? t("header.roles.admin")
      : roleValue === "TEACHER"
        ? t("header.roles.teacher")
        : t("header.roles.student");
  const displayName =
    profileData?.fullName ||
    userData?.fullName ||
    user?.fullName ||
    user?.username ||
    user?.userName ||
    "User";
  const displayEmail =
    profileData?.gmail || userData?.gmail || user?.gmail || "No email";
  const displayStudentNumber =
    profileData?.studentNumber || userData?.studentNumber || user?.studentNumber;
  const avatarSrc =
    userData?.imageUrl ||
    userData?.avatar ||
    userData?.profilePicture ||
    user?.imageUrl ||
    user?.avatar ||
    user?.profilePicture;

  const tabs = [
    { id: "profile", label: t("profile.thongTinCaNhan"), icon: UserIcon },
    { id: "notifications", label: t("profile.thongBao"), icon: BellIcon },
    { id: "password", label: t("profile.doiMatKhau"), icon: LockClosedIcon },
    { id: "settings", label: t("common.caiDat"), icon: Cog6ToothIcon },
  ];
  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <MyInformation userData={userData} isLoading={isLoading} onUpdate={handleProfileUpdate} />;
      case "certificate":
        return <MyCertificate />;
      case "notifications":
        return <NotificationsPage embedded />;
      case "transactions":
        return (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            {t("profile.noiDungDangCapNhat")}
          </div>
        );
      case "settings":
        return <AccountSettings />;
      case "password":
        return <ChangePassword />;
      default:
        return null;
    }
  };

  return (
    <div className="profile-page min-h-screen bg-[#f5f7fa] dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <Header />
      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="lg:col-span-2">
            <AppBreadcrumb className="mb-1" />
          </div>
          <aside className="min-w-0">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-background-dark/50">
              <div className="h-20 bg-gradient-to-r from-[#137fec] via-[#3b82f6] to-[#6366f1]" />
              <div className="px-5 pb-5 text-center">
                <div className="-mt-10 flex flex-col items-center">
                  <div className="relative group shrink-0">
                    <Avatar
                      src={avatarSrc}
                      alt={displayName}
                      sizeClass="size-20"
                      initialsClass="text-3xl"
                      className="border-4 border-white shadow-sm"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                      <CameraIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 min-w-0">
                    <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                      {displayName}
                    </h1>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {displayEmail}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    {roleLabel}
                  </span>
                  {displayStudentNumber && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                      MSSV: {displayStudentNumber}
                    </span>
                  )}
                </div>

                <nav className="mt-5 flex flex-col gap-1 text-left">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-background-dark/50">
            <div className="p-5 sm:p-6 lg:p-8">{renderContent()}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
