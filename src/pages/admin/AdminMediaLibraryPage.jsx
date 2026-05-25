import React from "react";
import { useTranslation } from "react-i18next";
import AdminSidebar from "../../components/layout/AdminSidebar";
import TeacherHeader from "../../components/layout/TeacherHeader";
import MediaLibraryPanel from "../../components/media/MediaLibraryPanel";

export default function AdminMediaLibraryPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <TeacherHeader />
        <main className="ml-64 mt-16 p-6">
          <MediaLibraryPanel
            title={t("mediaManager.pages.admin.title")}
            subtitle={t("mediaManager.pages.admin.subtitle")}
            fixedScope={false}
            allowLinkCreate
            governance
          />
        </main>
      </div>
    </div>
  );
}
