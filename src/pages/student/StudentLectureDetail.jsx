import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import LessonComments from "../../components/lesson/LessonComments";
import { getLessonById } from "../../api/lesson";
import { getResourcesByLessonId } from "../../api/resource";
import { Spin, Alert, Button, message } from "antd";
import { ArrowLeftIcon, DocumentArrowDownIcon, PlayCircleIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function StudentLectureDetail() {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Fetch lesson data
        const lessonResponse = await getLessonById(lectureId);
        const lessonData = lessonResponse.data || lessonResponse;
        setLesson(lessonData);

        // Fetch resources for this lesson
        try {
          const resourcesResponse = await getResourcesByLessonId(lectureId);
          const resourcesList = Array.isArray(resourcesResponse)
            ? resourcesResponse
            : resourcesResponse.data || [];
          setResources(resourcesList);
        } catch (resourceErr) {
          console.error("Failed to fetch resources:", resourceErr);
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

    // YouTube URL patterns
    const youtubeRegex =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return { platform: "youtube", id: youtubeMatch[1] };
    }

    // Vimeo URL pattern
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return { platform: "vimeo", id: vimeoMatch[1] };
    }

    return null;
  };

  const getVideoEmbedUrl = (videoInfo) => {
    if (!videoInfo) return null;

    if (videoInfo.platform === "youtube") {
      return `https://www.youtube.com/embed/${videoInfo.id}?controls=1&modestbranding=1`;
    } else if (videoInfo.platform === "vimeo") {
      return `https://player.vimeo.com/video/${videoInfo.id}`;
    }

    return null;
  };

  const handleDownloadResource = (resource) => {
    if (resource.url) {
      const link = document.createElement("a");
      link.href = resource.url;
      link.download = resource.name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex justify-center items-center flex-1">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="p-6 max-w-7xl mx-auto w-full">
          <Alert message="Lỗi" description={error} type="error" showIcon />
        </div>
      </div>
    );
  }

  const videoInfo = lesson?.videoUrl ? extractVideoId(lesson.videoUrl) : null;
  const videoEmbedUrl = getVideoEmbedUrl(videoInfo);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-6 font-medium transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Quay lại</span>
          </button>

          {/* Lesson Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#111418] dark:text-white mb-2">
              {lesson?.title || "Bài giảng"}
            </h1>
          </div>

          {/* Video Section */}
          {videoEmbedUrl && (
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={videoEmbedUrl}
                  title={lesson?.title}
                  frameBorder="0"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                ></iframe>
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2">
              {/* Lesson Content */}
              {lesson?.content && (
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-md">
                  <h2 className="text-2xl font-bold text-[#111418] dark:text-white mb-4">
                    Nội dung bài giảng
                  </h2>
                  <div
                    className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 [&_.ql-align-center]:text-center [&_.ql-align-right]:text-right [&_.ql-align-justify]:text-justify [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:mt-4 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-5 [&_h2]:mt-3 [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  ></div>
                </div>
              )}

              {/* Notes Section */}
              {lesson?.notes && (
                <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">
                    Ghi chú
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300">
                    {lesson.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Resources */}
            <div>
              {resources && resources.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-md sticky top-24">
                  <h3 className="text-md font-semibold text-[#111418] dark:text-white mb-3">
                    Tài liệu bài giảng
                  </h3>
                  <div className="space-y-2">
                    {resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        onClick={() => handleDownloadResource(resource)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded text-green-600 dark:text-green-400 shrink-0">
                            {resource.type === "VIDEO" ? (
                              <PlayCircleIcon className="h-5 w-5" />
                            ) : (
                              <DocumentTextIcon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {resource.title || resource.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {resource.type || "File"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lesson Comments Section */}
          <LessonComments lectureId={lectureId} />
        </div>
      </div>
    </div>
  );
}
