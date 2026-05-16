import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import AdminSidebar from "../../components/layout/AdminSidebar";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import MediaLibraryPanel from "../../components/media/MediaLibraryPanel";

export default function ClassSectionMediaPage({ isAdmin = false }) {
  const { id, classSectionId } = useParams();
  const { t } = useTranslation();
  const scopeId = Number(id || classSectionId);
  const location = useLocation();
  const adminMode = isAdmin || location.pathname.startsWith("/admin");
  const Sidebar = adminMode ? AdminSidebar : TeacherSidebar;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TeacherHeader />
        <main className="ml-64 mt-16 p-6">
          <MediaLibraryPanel
            title={t("mediaManager.pages.classSection.title")}
            subtitle={t("mediaManager.pages.classSection.subtitle", { id: scopeId })}
            scopeType="CLASS_SECTION"
            scopeId={scopeId}
          />
        </main>
      </div>
    </div>
  );
}
