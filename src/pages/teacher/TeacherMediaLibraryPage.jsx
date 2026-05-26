import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import MediaLibraryPanel from "../../components/media/MediaLibraryPanel";

export default function TeacherMediaLibraryPage() {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main
          className={`flex-1 min-w-0 pt-16 transition-all duration-300 ${
            sidebarCollapsed ? "pl-20" : "pl-64"
          }`}
        >
          <div className="p-6">
            <AppBreadcrumb className="mb-5" />
            <MediaLibraryPanel
              title={t("mediaManager.pages.personal.title")}
              subtitle={t("mediaManager.pages.personal.subtitle")}
              fixedScope={false}
              createdByMe
              ownerLibrary
              allowLinkCreate
            />
          </div>
        </main>
      </div>
    </div>
  );
}
