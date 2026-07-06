import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Spin, Alert } from "antd";
import { EyeIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import LessonComments from "../../components/lesson/LessonComments";
import FileItem from "../../components/common/FileItem";
import VideoPlayer from "../../components/common/VideoPlayer";
import SafeHtml from "../../components/common/SafeHtml";
import { getLessonById } from "../../api/lesson";
import { getResourcesByLessonId } from "../../api/resource";
import { getLessonTemplateById } from "../../api/curriculumTemplate";

export default function TeacherLessonPreview({ isAdmin = false }) {
  const { lectureId, templateId } = useParams();
  const isTemplate = !!templateId;
  const { t } = useTranslation();
  const [lesson, setLesson] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        if (isTemplate) {
          const lessonRes = await getLessonTemplateById(lectureId);
          const lessonData = lessonRes?.data || lessonRes;
          setLesson(lessonData);
          setResources(Array.isArray(lessonData?.resources) ? lessonData.resources : []);
        } else {
          const lessonRes = await getLessonById(lectureId);
          const lessonData = lessonRes?.data || lessonRes;
          setLesson(lessonData);
          try {
            const res = await getResourcesByLessonId(lectureId);
            setResources(Array.isArray(res) ? res : res?.data || []);
          } catch {
            setResources([]);
          }
        }
      } catch (err) {
        setError(t("classContent.lessonPreview.loadError"));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [lectureId, isTemplate]);

  const extractVideoId = (url) => {
    if (!url) return null;
    const normalizedUrl = url.trim();
    const lowerUrl = normalizedUrl.toLowerCase();

    const yt = normalizedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return { platform: "youtube", id: yt[1] };
    const vm = normalizedUrl.match(/vimeo\.com\/(\d+)/);
    if (vm) return { platform: "vimeo", id: vm[1] };
    if (lowerUrl.includes("onedrive.live.com/embed") || lowerUrl.includes("1drv.ms/v/")) {
      return { platform: "onedrive", url: normalizedUrl };
    }
    if (lowerUrl.includes("1drv.ms") || lowerUrl.includes("onedrive.live.com")) {
      return { platform: "onedrive-share", url: normalizedUrl };
    }
    return null;
  };

  const getVideoEmbedUrl = (info) => {
    if (!info) return null;
    if (info.platform === "youtube") return `https://www.youtube.com/embed/${info.id}?controls=1&modestbranding=1`;
    if (info.platform === "vimeo") return `https://player.vimeo.com/video/${info.id}`;
    if (info.platform === "onedrive") return info.url;
    return null;
  };

  const resolvePrimaryVideoResource = (items) =>
    (items || []).find((resource) => resource.type === "VIDEO") || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <TeacherHeader />
        <div className="flex">
          {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
          <main className={`flex-1 pt-16 flex items-center justify-center ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
            <Spin size="large" />
          </main>
        </div>
      </div>
    );
  }

  const videoInfo = lesson?.videoUrl ? extractVideoId(lesson.videoUrl) : null;
  const videoEmbedUrl = getVideoEmbedUrl(videoInfo);
  const primaryVideoResource = resolvePrimaryVideoResource(resources);
  const primaryVideoResourceRawUrl =
    primaryVideoResource?.embedUrl || primaryVideoResource?.fileUrl || "";
  const primaryVideoResourceInfo = extractVideoId(
    primaryVideoResourceRawUrl
  );
  const primaryVideoResourceEmbedUrl =
    primaryVideoResource?.source === "EMBED" && primaryVideoResource?.embedUrl
      ? primaryVideoResource.embedUrl
      : getVideoEmbedUrl(primaryVideoResourceInfo);
  const nonVideoResources = resources.filter((resource) => resource.type !== "VIDEO");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          {/* Preview Banner */}
          <div className="sticky top-16 z-20 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
              <EyeIcon className="h-4 w-4" />
              {t("classContent.lessonPreview.banner")}
            </div>
          </div>

          {error && (
            <div className="max-w-7xl mx-auto px-6 pt-6">
              <Alert message={t("classContent.lessonPreview.errorTitle")} description={error} type="error" showIcon />
            </div>
          )}

          <div className="max-w-7xl mx-auto px-6 py-8">
            <AppBreadcrumb
              className="mb-5"
              context={{
                classTitle: lesson?.classSectionTitle || lesson?.classTitle,
                templateName: lesson?.templateName || lesson?.name,
                lectureTitle: lesson?.title,
              }}
            />
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#111418] dark:text-white mb-2">
                {lesson?.title || t("classContent.lessonPreview.defaultTitle")}
              </h1>
            </div>

            {primaryVideoResource ? (
              <div className="mb-8">
                {primaryVideoResourceEmbedUrl ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                      <iframe
                        src={primaryVideoResourceEmbedUrl}
                        title={lesson?.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {primaryVideoResourceInfo?.platform === "onedrive-share" ? (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                        <p className="text-yellow-800 dark:text-yellow-400 text-sm font-medium">{t("classContent.lessonPreview.onedrive.title")}</p>
                        <p className="text-yellow-700 dark:text-yellow-500 text-xs mt-1">{t("classContent.lessonPreview.onedrive.hint")} <code>https://onedrive.live.com/embed?resid=...</code></p>
                      </div>
                    ) : (
                      <VideoPlayer
                        fileUrl={primaryVideoResource.fileUrl || primaryVideoResource.embedUrl}
                      />
                    )}
                  </>
                )}
              </div>
            ) : videoEmbedUrl ? (
              <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={videoEmbedUrl}
                    title={lesson?.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                  />
                </div>
              </div>
            ) : videoInfo?.platform === "onedrive-share" ? (
              <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-400 text-sm font-medium">{t("classContent.lessonPreview.onedrive.title")}</p>
                <p className="text-yellow-700 dark:text-yellow-500 text-xs mt-1">{t("classContent.lessonPreview.onedrive.hint")} <code>https://onedrive.live.com/embed?resid=...</code></p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {lesson?.content && (
                  <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-md">
                    <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4">
                      {t("classContent.lessonPreview.contentHeading")}
                    </h2>
                    <SafeHtml
                      className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_.ql-align-justify]:text-justify [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:mt-4 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-5 [&_h2]:mt-3 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
                      html={lesson.content}
                    />
                  </div>
                )}
              </div>

              {nonVideoResources.length > 0 && (
                <div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-md sticky top-36">
                    <h3 className="text-md font-semibold text-[#111418] dark:text-white mb-3">
                      {t("classContent.lessonPreview.resourcesHeading")}
                    </h3>
                    <div className="space-y-2">
                      {nonVideoResources.map((resource) => (
                        <FileItem
                          key={resource.id}
                          fileUrl={resource.fileUrl || resource.url}
                          fileName={resource.title || resource.name || "Resource"}
                          fileSize={resource.fileSize}
                          mimeType={resource.mimeType}
                          type={resource.type}
                          source={resource.source}
                          embedUrl={resource.embedUrl}
                          showDelete={false}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isTemplate && <LessonComments lectureId={lectureId} previewMode />}
          </div>
        </main>
      </div>
    </div>
  );
}
