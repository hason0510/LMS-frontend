import React from "react";
import { useTranslation } from "react-i18next";
import Header from "../../components/layout/Header";
import MediaLibraryPanel from "../../components/media/MediaLibraryPanel";

export default function PersonalMediaLibraryPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <MediaLibraryPanel
          title={t("mediaManager.pages.personal.title")}
          subtitle={t("mediaManager.pages.personal.subtitle")}
          scopeType="PRIVATE_USER"
          createdByMe
          allowLinkCreate
        />
      </main>
    </div>
  );
}
