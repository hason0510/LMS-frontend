import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, Alert } from "antd";
import { ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import LessonComments from "../../components/lesson/LessonComments";
import FileItem from "../../components/common/FileItem";
import VideoPlayer from "../../components/common/VideoPlayer";
import { getLessonById } from "../../api/lesson";
import { getResourcesByLessonId } from "../../api/resource";

export default function TeacherLessonPreview() {
  const { classSectionId, lectureId } = useParams();
  const navigate = useNavigate();
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
        const lessonRes = await getLessonById(lectureId);
        const lessonData = lessonRes?.data || lessonRes;
        setLesson(lessonData);
        try {
          const res = await getResourcesByLessonId(lectureId);
          setResources(Array.isArray(res) ? res : res?.data || []);
        } catch {
          setResources([]);
        }
      } catch (err) {
        setError("Không thể tải dữ liệu bài giảng");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [lectureId]);

  const extractVideoId = (url) => {
    if (!url) return null;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return { platform: "youtube", id: yt[1] };
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return { platform: "vimeo", id: vm[1] };
    return null;
  };

  const getVideoEmbedUrl = (info) => {
    if (!info) return null;
    if (info.platform === "youtube") return `https://www.youtube.com/embed/${info.id}?controls=1&modestbranding=1`;
    if (info.platform === "vimeo") return `https://player.vimeo.com/video/${info.id}`;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <TeacherHeader />
        <div className="flex">
          <TeacherSidebar />
          <main className={`flex-1 pt-16 flex items-center justify-center ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
            <Spin size="large" />
          </main>
        </div>
      </div>
    );
  }

  const videoInfo = lesson?.videoUrl ? extractVideoId(lesson.videoUrl) : null;
  const videoEmbedUrl = getVideoEmbedUrl(videoInfo);
  const uploadedVideoResource = resources.find((r) => r.type === "VIDEO" && r.source === "UPLOAD");
  const nonVideoResources = resources.filter((r) => !(r.type === "VIDEO" && r.source === "UPLOAD"));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          {/* Preview Banner */}
          <div className="sticky top-16 z-20 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
              <EyeIcon className="h-4 w-4" />
              Chế độ xem trước — Đây là giao diện học viên thấy khi học bài giảng này
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Quay lại chỉnh sửa
            </button>
          </div>

          {error && (
            <div className="max-w-7xl mx-auto px-6 pt-6">
              <Alert message="Lỗi" description={error} type="error" showIcon />
            </div>
          )}

          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#111418] dark:text-white mb-2">
                {lesson?.title || "Bài giảng"}
              </h1>
            </div>

            {uploadedVideoResource ? (
              <div className="mb-8">
                <VideoPlayer
                  fileUrl={uploadedVideoResource.fileUrl}
                  hlsUrl={uploadedVideoResource.hlsUrl}
                  title={lesson?.title}
                />
              </div>
            ) : videoEmbedUrl ? (
              <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={videoEmbedUrl}
                    title={lesson?.title}
                    frameBorder="0"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {lesson?.content && (
                  <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-md">
                    <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4">
                      Nội dung bài giảng
                    </h2>
                    <div
                      className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_.ql-align-justify]:text-justify [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:mt-4 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-5 [&_h2]:mt-3 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
                      dangerouslySetInnerHTML={{ __html: lesson.content }}
                    />
                  </div>
                )}
              </div>

              {nonVideoResources.length > 0 && (
                <div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-md sticky top-36">
                    <h3 className="text-md font-semibold text-[#111418] dark:text-white mb-3">
                      Tài liệu bài giảng
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

            <LessonComments lectureId={lectureId} />
          </div>
        </main>
      </div>
    </div>
  );
}
