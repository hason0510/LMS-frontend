import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import MediaLibraryPanel from "../../components/media/MediaLibraryPanel";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";

export default function TeachingClassMediaPage() {
  const { id } = useParams();
  const { t } = useTranslation();

  return (
    <TeachingLayout>
      <AppBreadcrumb className="mb-5" />
      <MediaLibraryPanel
        title={t("mediaManager.pages.classSection.title")}
        subtitle={t("mediaManager.pages.classSection.teachingSubtitle", { id })}
        scopeType="CLASS_SECTION"
        scopeId={Number(id)}
      />
    </TeachingLayout>
  );
}
