import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { App, Button, Spin } from "antd";
import dayjs from "dayjs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Header from "../../components/layout/Header";
import { getAssignmentById } from "../../api/assignment";
import { getMySubmission, submitAssignment } from "../../api/submission";
import { uploadStandaloneResource } from "../../api/resource";
import FileItem from "../../components/common/FileItem";

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

const quillFormats = ["header", "bold", "italic", "underline", "list", "bullet", "link"];

const SUBMISSION_STATUS_META = {
  NOT_SUBMITTED: {
    label: "Chưa nộp",
    className: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  SUBMITTED: {
    label: "Đã nộp",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
  },
  LATE_SUBMITTED: {
    label: "Nộp muộn",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  },
  GRADED: {
    label: "Đã chấm điểm",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  RETURNED: {
    label: "Đã trả lại",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
  },
};

function mapUploadTypeToResourceType(uploadType) {
  if (uploadType === "video") return "VIDEO";
  if (uploadType === "audio") return "AUDIO";
  if (uploadType === "image") return "IMAGE";
  return "FILE";
}

function formatDate(value, fallback = "Chưa có") {
  return value ? dayjs(value).format("DD/MM/YYYY HH:mm") : fallback;
}

function getStatusMeta(status) {
  return SUBMISSION_STATUS_META[status] || {
    label: status || "Chưa rõ",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  };
}

function hasRichTextContent(value) {
  if (!value) return false;
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim().length > 0;
}

function StatusPill({ status }) {
  const meta = getStatusMeta(status);
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function StudentAssignmentDetail() {
  const { classSectionId, assignmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const classContentItemId =
    new URLSearchParams(location.search).get("classContentItemId") || location.state?.classContentItemId || null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [description, setDescription] = useState("");
  const [resources, setResources] = useState([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingSubmission, setEditingSubmission] = useState(false);

  const normalizeResources = (items = []) =>
    items.map((resource) => ({
      id: resource.id || `${resource.source}-${Math.random()}`,
      title: resource.title,
      source: resource.source,
      type: resource.type,
      fileUrl: resource.fileUrl,
      embedUrl: resource.embedUrl,
      cloudinaryId: resource.cloudinaryId,
      mimeType: resource.mimeType,
      fileSize: resource.fileSize,
    }));

  const resetDraftFromSubmission = (nextSubmission = submission) => {
    setDescription(nextSubmission?.description || "");
    setResources(normalizeResources(nextSubmission?.resources || []));
    setLinkTitle("");
    setLinkUrl("");
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      const [assignmentResponse, submissionResponse] = await Promise.all([
        getAssignmentById(assignmentId, classContentItemId),
        getMySubmission(assignmentId, classSectionId),
      ]);

      const assignmentData = assignmentResponse?.data || assignmentResponse;
      const submissionData = submissionResponse?.data || submissionResponse;

      setAssignment(assignmentData);
      setSubmission(submissionData);
      setDescription(submissionData?.description || "");
      setResources(normalizeResources(submissionData?.resources || []));
    } catch (error) {
      console.error(error);
      message.error("Không thể tải assignment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [assignmentId, classSectionId, classContentItemId]);

  const status = submission?.status || "NOT_SUBMITTED";
  const hasSubmitted = status !== "NOT_SUBMITTED" && Boolean(submission?.submissionTime);
  const maxScore = assignment?.maxScore ?? 100;
  const hasGrade = submission?.grade !== null && submission?.grade !== undefined;
  const scorePercent = hasGrade && maxScore > 0 ? Math.min(100, Math.max(0, (submission.grade / maxScore) * 100)) : 0;
  const canResubmit = submission?.canResubmit !== false;
  const showEditor = editingSubmission || (!hasSubmitted && canResubmit);
  const submissionResources = submission?.resources || [];

  const handleStartEditing = () => {
    resetDraftFromSubmission();
    setEditingSubmission(true);
  };

  const handleCancelEditing = () => {
    resetDraftFromSubmission();
    setEditingSubmission(false);
  };

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadedResources = [];
      for (const file of files) {
        const uploaded = await uploadStandaloneResource(file);
        uploadedResources.push({
          id: `${Date.now()}-${Math.random()}`,
          title: file.name,
          source: "UPLOAD",
          type: mapUploadTypeToResourceType(uploaded.type),
          fileUrl: uploaded.url,
          embedUrl: null,
          cloudinaryId: uploaded.publicId,
          mimeType: file.type,
          fileSize: file.size,
        });
      }
      setResources((prev) => [...prev, ...uploadedResources]);
      message.success(`Đã tải lên ${uploadedResources.length} file`);
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || "Tải file thất bại");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      message.warning("Vui lòng nhập URL");
      return;
    }

    try {
      new URL(linkUrl.trim());
    } catch {
      message.warning("URL không hợp lệ");
      return;
    }

    setResources((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        title: linkTitle.trim() || linkUrl.trim(),
        source: "LINK",
        type: "LINK",
        fileUrl: linkUrl.trim(),
        embedUrl: null,
        cloudinaryId: null,
        mimeType: null,
        fileSize: null,
      },
    ]);
    setLinkTitle("");
    setLinkUrl("");
  };

  const handleRemoveResource = (resourceId) => {
    setResources((prev) => prev.filter((resource) => resource.id !== resourceId));
  };

  const handleSubmit = async () => {
    if (!hasRichTextContent(description) && resources.length === 0) {
      message.warning("Vui lòng nhập nội dung hoặc đính kèm ít nhất 1 tài nguyên");
      return;
    }

    try {
      setSubmitting(true);
      await submitAssignment(assignmentId, classSectionId, {
        description,
        resources: resources.map((resource) => ({
          title: resource.title,
          description: null,
          source: resource.source,
          type: resource.type || (resource.source === "EMBED" || resource.source === "LINK" ? "LINK" : "FILE"),
          fileUrl: resource.fileUrl || null,
          embedUrl: resource.embedUrl || null,
          cloudinaryId: resource.cloudinaryId || null,
          mimeType: resource.mimeType || null,
          fileSize: resource.fileSize || null,
        })),
      });
      message.success("Nộp bài thành công");
      setEditingSubmission(false);
      await refreshData();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || "Không thể nộp bài");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => navigate(`/class-sections/${classSectionId}`)}
            className="font-medium text-primary hover:underline"
          >
            Lớp học
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => navigate("/student/assignments")}
            className="font-medium text-primary hover:underline"
          >
            Bài tập
          </button>
          <span>/</span>
          <span className="max-w-[520px] truncate text-slate-700 dark:text-slate-200">
            {assignment?.title || "Chi tiết bài tập"}
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Bài tập
                    </p>
                    <h1 className="m-0 mt-2 text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                      {assignment?.title}
                    </h1>
                  </div>
                  <StatusPill status={status} />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="m-0 text-xs text-slate-500">Hạn nộp</p>
                    <p className="m-0 mt-1 font-semibold text-slate-900 dark:text-white">
                      {formatDate(assignment?.dueAt, "Không giới hạn")}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="m-0 text-xs text-slate-500">Đóng nhận bài</p>
                    <p className="m-0 mt-1 font-semibold text-slate-900 dark:text-white">
                      {formatDate(assignment?.closeAt, "Không giới hạn")}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="m-0 text-xs text-slate-500">Nộp muộn</p>
                    <p className="m-0 mt-1 font-semibold text-slate-900 dark:text-white">
                      {assignment?.allowLateSubmission ? "Được phép" : "Không cho phép"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-5 py-5 sm:px-6">
                {assignment?.description && (
                  <section>
                    <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-slate-500">Mô tả</h2>
                    <div
                      className="prose prose-sm mt-3 max-w-none text-slate-700 dark:prose-invert dark:text-slate-200"
                      dangerouslySetInnerHTML={{ __html: assignment.description }}
                    />
                  </section>
                )}

                {assignment?.instruction && (
                  <section className="border-t border-slate-100 pt-5 dark:border-slate-700">
                    <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-slate-500">Hướng dẫn</h2>
                    <div
                      className="prose prose-sm mt-3 max-w-none text-slate-700 dark:prose-invert dark:text-slate-200"
                      dangerouslySetInnerHTML={{ __html: assignment.instruction }}
                    />
                  </section>
                )}

                {Array.isArray(assignment?.resources) && assignment.resources.length > 0 && (
                  <section className="border-t border-slate-100 pt-5 dark:border-slate-700">
                    <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Tài liệu từ giảng viên
                    </h2>
                    <div className="mt-3 space-y-2">
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
                  </section>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="m-0 text-lg font-bold text-slate-950 dark:text-white">Bài nộp của bạn</h2>
                  <p className="m-0 mt-1 text-sm text-slate-500">
                    {hasSubmitted
                      ? `Nộp lúc ${formatDate(submission?.submissionTime)}`
                      : "Bạn chưa gửi bài nộp cho assignment này."}
                  </p>
                </div>
                <StatusPill status={status} />
              </div>

              {hasSubmitted ? (
                <div className="space-y-5 px-5 py-5 sm:px-6">
                  <section>
                    <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Nội dung đã nộp
                    </h3>
                    {hasRichTextContent(submission?.description) ? (
                      <div
                        className="prose prose-sm mt-3 max-w-none rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 dark:prose-invert dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                        dangerouslySetInnerHTML={{ __html: submission.description }}
                      />
                    ) : (
                      <p className="m-0 mt-3 rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700">
                        Bài nộp không có nội dung văn bản.
                      </p>
                    )}
                  </section>

                  {submissionResources.length > 0 && (
                    <section className="border-t border-slate-100 pt-5 dark:border-slate-700">
                      <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        File / link đã nộp
                      </h3>
                      <div className="mt-3 space-y-2">
                        {submissionResources.map((resource) => (
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
                    </section>
                  )}
                </div>
              ) : (
                <div className="px-5 py-8 text-center sm:px-6">
                  <p className="m-0 text-sm font-semibold text-slate-900 dark:text-white">
                    Chưa có bài nộp
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Khi bạn gửi bài, nội dung sẽ được khóa lại ở chế độ xem để dễ đối chiếu với điểm và nhận xét.
                  </p>
                </div>
              )}
            </div>

            {showEditor && (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                  <h2 className="m-0 text-lg font-bold text-slate-950 dark:text-white">
                    {hasSubmitted ? "Tạo bài nộp mới" : "Nộp bài"}
                  </h2>
                  <p className="m-0 mt-1 text-sm text-slate-500">
                    Form này dùng cho lần nộp mới. Bài đã nộp ở phía trên vẫn được giữ ở chế độ xem.
                  </p>
                </div>

                <div className="space-y-5 px-5 py-5 sm:px-6">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Nội dung nộp bài
                    </p>
                    <div className="assignment-editor overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      <ReactQuill
                        theme="snow"
                        modules={quillModules}
                        formats={quillFormats}
                        value={description}
                        onChange={setDescription}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="m-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Đính kèm file / link
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/60">
                        {uploading ? "Đang tải..." : "Upload file"}
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={handleUploadFiles}
                          disabled={uploading}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.6fr_auto]">
                      <input
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="Tên link (tuỳ chọn)"
                        value={linkTitle}
                        onChange={(event) => setLinkTitle(event.target.value)}
                      />
                      <input
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        placeholder="https://drive.google.com/..."
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                      />
                      <Button onClick={handleAddLink}>Thêm Link</Button>
                    </div>

                    {resources.length > 0 && (
                      <div className="space-y-2">
                        {resources.map((resource) => (
                          <FileItem
                            key={resource.id}
                            fileUrl={resource.fileUrl}
                            fileName={resource.title}
                            fileSize={resource.fileSize}
                            mimeType={resource.mimeType}
                            type={resource.type}
                            source={resource.source}
                            embedUrl={resource.embedUrl}
                            onDelete={() => handleRemoveResource(resource.id)}
                            showDelete={true}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
                    {hasSubmitted && (
                      <Button onClick={handleCancelEditing} disabled={submitting}>
                        Hủy
                      </Button>
                    )}
                    <Button type="primary" loading={submitting} onClick={handleSubmit} disabled={!canResubmit}>
                      {hasSubmitted ? "Nộp lại" : "Nộp bài"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="m-0 text-base font-bold text-slate-950 dark:text-white">Kết quả</h2>
                  <StatusPill status={status} />
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="m-0 text-sm font-medium text-slate-500">Điểm số</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-5xl font-bold leading-none text-slate-950 dark:text-white">
                      {hasGrade ? submission.grade : "--"}
                    </span>
                    <span className="pb-1 text-lg font-semibold text-slate-500">/ {maxScore}</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${scorePercent}%` }} />
                  </div>
                </div>

                <div className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-700">
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-slate-500">Lần nộp</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {submission?.submissionCount ? `Lần ${submission.submissionCount}` : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-slate-500">Nộp lúc</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-white">
                      {formatDate(submission?.submissionTime, "--")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <span className="text-slate-500">Chấm lúc</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-white">
                      {formatDate(submission?.gradedAt, "--")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {submission?.feedback && (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800">
                <h2 className="m-0 text-base font-bold text-slate-950 dark:text-white">Nhận xét giáo viên</h2>
                <div
                  className="prose prose-sm mt-3 max-w-none rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-slate-700 dark:prose-invert dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: submission.feedback }}
                />
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <h2 className="m-0 text-base font-bold text-slate-950 dark:text-white">
                {hasSubmitted ? "Cần cập nhật bài?" : "Sẵn sàng nộp bài?"}
              </h2>
              <p className="m-0 mt-2 text-sm text-slate-500">
                {canResubmit
                  ? "Bạn có thể gửi bài mới trước thời điểm hệ thống đóng nhận bài."
                  : "Assignment này đã đóng nhận bài hoặc không còn cho phép nộp lại."}
              </p>
              <Button
                type="primary"
                className="mt-4 w-full"
                disabled={!canResubmit || showEditor}
                onClick={handleStartEditing}
              >
                {hasSubmitted ? "Tạo bài nộp mới" : "Mở form nộp bài"}
              </Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
