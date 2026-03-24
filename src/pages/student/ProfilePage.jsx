import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import MyCertificate from "../../components/student/profile/MyCertificate";
import MyInformation from "../../components/student/profile/MyInformation";
import MyCourses from "../../components/student/profile/MyCourses";
import AccountSettings from "../../components/student/profile/AccountSettings";
import ChangePassword from "../../components/student/profile/ChangePassword";
import NotificationsPage from "../common/NotificationsPage";
import Avatar from "../../components/common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { getUserById } from "../../api/user";
import {
  UserIcon,
  BookOpenIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  ReceiptPercentIcon,
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

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          setIsLoading(true);
          const res = await getUserById(user.id);
          setUserData(res.data);
          setProfileData(res.data);
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
    setProfileData(updatedData);
    setUserData(updatedData);
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

  const tabs = [
    { id: "profile", label: t("profile.thongTinCaNhan"), icon: UserIcon },
    { id: "courses", label: t("profile.khoaHocCuaToi"), icon: BookOpenIcon },
    // { id: "certificate", label: t("profile.chungChiCuaToi"), icon: AcademicCapIcon },
    { id: "notifications", label: t("profile.thongBao"), icon: BellIcon },
    // {
    //   id: "transactions",
    //   label: t("profile.lichSuGiaoDich"),
    //   icon: ReceiptPercentIcon,
    // },
    { id: "password", label: t("profile.doiMatKhau"), icon: LockClosedIcon },
    { id: "settings", label: t("common.caiDat"), icon: Cog6ToothIcon },
  ];
  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <MyInformation userData={userData} isLoading={isLoading} onUpdate={handleProfileUpdate} />;
      case "courses":
        return <MyCourses />;
      case "certificate":
        return <MyCertificate />;
      case "notifications":
        return <NotificationsPage />;
      case "transactions":
        return (
          <div className="text-center py-10 text-gray-500">
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <Header />
      <main className="flex flex-1 justify-center py-5 md:py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl">
          {/* Sidebar Tabs */}
          <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
            <div className="flex h-full flex-col justify-between bg-white dark:bg-background-dark/50 p-4 rounded-xl border border-black/10 dark:border-white/10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Avatar
                      src={userData?.avatar || userData?.profilePicture}
                      alt={userData?.fullName || userData?.username}
                      className="w-12 h-12"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <CameraIcon className="text-white h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-[#111418] dark:text-white text-base font-medium leading-normal break-all">
                      {profileData?.fullName || user?.username || "User"}
                    </h1>
                    <p className="text-[#617589] dark:text-gray-400 text-sm font-normal leading-normal break-all">
                      {profileData?.gmail || profileData?.email || "No email"}
                    </p>
                  </div>
                </div>
                <nav className="flex flex-col gap-2 pt-4">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? "bg-primary/10 text-primary dark:bg-primary/20"
                            : "hover:bg-black/5 dark:hover:bg-white/5 text-[#111418] dark:text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <p className="text-sm font-medium leading-normal">
                          {tab.label}
                        </p>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 bg-white dark:bg-background-dark/50 p-4 sm:p-6 lg:p-8 rounded-xl border border-black/10 dark:border-white/10">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
