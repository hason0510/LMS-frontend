import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, Tag } from "antd";
import dayjs from "dayjs";
import { ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import { getAssignmentById } from "../../api/assignment";
import FileItem from "../../components/common/FileItem";

export default function TeacherAssignmentPreview() {
  const { classSectionId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
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
        const res = await getAssignmentById(assignmentId);
        setAssignment(res?.data || res);
      } catch (err) {
        setError(err.message || "Không thể tải thông tin bài tập");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [assignmentId]);

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

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <TeacherHeader />
        <div className="flex">
          <TeacherSidebar />
          <main className={`flex-1 pt-16 flex items-center justify-center ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-red-600">{error || "Không tải được dữ liệu"}</p>
              <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Quay lại
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
              Chế độ xem trước — Đây là giao diện học viên thấy khi xem bài tập này
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Quay lại chỉnh sửa
            </button>
          </div>

          <div className="max-w-5xl mx-auto pt-8 px-4 pb-10 space-y-6">
            {/* Assignment Info Card */}
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{assignment.title}</h1>

              <div className="flex items-center gap-2 flex-wrap">
                {assignment.dueAt && (
                  <Tag color="blue">Hạn nộp: {dayjs(assignment.dueAt).format("DD/MM/YYYY HH:mm")}</Tag>
                )}
                <Tag color={assignment.allowLateSubmission ? "green" : "orange"}>
                  {assignment.allowLateSubmission ? "Cho phép nộp muộn" : "Không cho nộp muộn"}
                </Tag>
                {assignment.maxScore && (
                  <Tag color="purple">Điểm tối đa: {assignment.maxScore}</Tag>
                )}
              </div>

              {assignment.description && (
                <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                  <p className="text-xs uppercase text-slate-500 mb-2">Mô tả</p>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: assignment.description }}
                  />
                </div>
              )}

              {assignment.instruction && (
                <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                  <p className="text-xs uppercase text-slate-500 mb-2">Hướng dẫn</p>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: assignment.instruction }}
                  />
                </div>
              )}

              {Array.isArray(assignment.resources) && assignment.resources.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-2">
                  <p className="text-xs uppercase text-slate-500">Tài liệu từ giảng viên</p>
                  <div className="space-y-2">
                    {assignment.resources.map((resource) => (
                      <FileItem
                        key={resource.id}
                        fileUrl={resource.fileUrl}
                        fileName={resource.title}
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
              )}
            </div>

            {/* Submission Area — mirrors actual student form, all controls disabled */}
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Bài nộp của bạn</h2>
                <Tag color="geekblue">NOT_SUBMITTED</Tag>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nội dung nộp bài (rich text)</p>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg min-h-30 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-400 dark:text-slate-500 italic select-none">
                  Học viên nhập nội dung bài làm ở đây...
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Đính kèm file / link</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 select-none">
                    Upload file
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    disabled
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                    placeholder="Tên link (tuỳ chọn)"
                  />
                  <input
                    disabled
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                    placeholder="https://drive.google.com/..."
                  />
                  <button
                    disabled
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm opacity-50 cursor-not-allowed bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    Thêm Link
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  disabled
                  className="px-5 py-2 bg-primary text-white rounded-lg font-medium opacity-50 cursor-not-allowed text-sm"
                >
                  Nộp bài
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
                Đây là giao diện học viên thấy khi chưa nộp bài. Tất cả các nút bấm không hoạt động ở chế độ xem trước.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
