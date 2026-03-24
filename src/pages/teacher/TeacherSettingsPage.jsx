import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AccountSettings from "../../components/student/profile/AccountSettings";

export default function TeacherSettingsPage() {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      {/* Teacher Header */}
      <TeacherHeader />

      <div className="flex">
        {/* Sidebar */}
        <TeacherSidebar />

        {/* Main Content */}
        <main className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight tracking-[-0.015em]">
                {t("settings.caiDatHeThong")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {t("settings.quanLyCaiDat")}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <AccountSettings />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
