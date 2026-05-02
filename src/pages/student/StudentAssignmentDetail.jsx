import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Spin, Tag } from "antd";
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

function mapUploadTypeToResourceType(uploadType) {
  if (uploadType === "video") return "VIDEO";
  if (uploadType === "image") return "IMAGE";
  return "FILE";
}

export default function StudentAssignmentDetail() {
  const { classSectionId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [description, setDescription] = useState("");
  const [resources, setResources] = useState([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const refreshData = async () => {
    try {
      setLoading(true);
      const [assignmentResponse, submissionResponse] = await Promise.all([
        getAssignmentById(assignmentId),
        getMySubmission(assignmentId, classSectionId),
      ]);

      const assignmentData = assignmentResponse?.data || assignmentResponse;
      const submissionData = submissionResponse?.data || submissionResponse;

      setAssignment(assignmentData);
      setSubmission(submissionData);
      setDescription(submissionData?.description || "");
      setResources(
        (submissionData?.resources || []).map((resource) => ({
          id: resource.id || `${resource.source}-${Math.random()}`,
          title: resource.title,
          source: resource.source,
          type: resource.type,
          fileUrl: resource.fileUrl,
          embedUrl: resource.embedUrl,
          cloudinaryId: resource.cloudinaryId,
          mimeType: resource.mimeType,
          fileSize: resource.fileSize,
        }))
      );
    } catch (error) {
      console.error(error);
      message.error("Không thể tải assignment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [assignmentId, classSectionId]);

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadedResources = [];
      for (const file of files) {
        const uploadResponse = await uploadStandaloneResource(file);
        const uploaded = uploadResponse?.data || uploadResponse;
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
        source: "EMBED",
        type: "LINK",
        fileUrl: null,
        embedUrl: linkUrl.trim(),
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
    if (!description?.trim() && resources.length === 0) {
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
          type: resource.type || (resource.source === "EMBED" ? "LINK" : "FILE"),
          fileUrl: resource.fileUrl || null,
          embedUrl: resource.embedUrl || null,
          cloudinaryId: resource.cloudinaryId || null,
          mimeType: resource.mimeType || null,
          fileSize: resource.fileSize || null,
        })),
      });
      message.success("Nộp bài thành công");
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
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-5xl mx-auto pt-24 px-4 pb-10 space-y-6">
        <button
          onClick={() => navigate(`/class-sections/${classSectionId}`)}
          className="text-primary text-sm font-medium hover:underline"
        >
          Quay lại lớp học
        </button>

        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{assignment?.title}</h1>

          <div className="flex items-center gap-2 flex-wrap">
            {assignment?.dueAt && (
              <Tag color="blue">Hạn nộp: {dayjs(assignment.dueAt).format("DD/MM/YYYY HH:mm")}</Tag>
            )}
            {assignment?.closeAt && (
              <Tag color="red">Đóng nhận bài: {dayjs(assignment.closeAt).format("DD/MM/YYYY HH:mm")}</Tag>
            )}
            <Tag color={assignment?.allowLateSubmission ? "green" : "orange"}>
              {assignment?.allowLateSubmission ? "Cho phép nộp muộn" : "Không cho nộp muộn"}
            </Tag>
          </div>

          {assignment?.description && (
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-xs uppercase text-slate-500 mb-2">Mô tả</p>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: assignment.description }}
              />
            </div>
          )}

          {assignment?.instruction && (
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-xs uppercase text-slate-500 mb-2">Hướng dẫn</p>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: assignment.instruction }}
              />
            </div>
          )}

          {Array.isArray(assignment?.resources) && assignment.resources.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
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

        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Bài nộp của bạn</h2>
            <Tag color="geekblue">{submission?.status || "NOT_SUBMITTED"}</Tag>
          </div>

          {(submission?.grade !== null && submission?.grade !== undefined) && (
            <Tag color="green">Điểm: {submission.grade}</Tag>
          )}

          {submission?.feedback && (
            <div className="border border-slate-200 rounded-lg p-4">
              <p className="text-xs uppercase text-slate-500 mb-2">Nhận xét từ giảng viên</p>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: submission.feedback }}
              />
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Nội dung nộp bài (rich text)</p>
            <ReactQuill
              theme="snow"
              modules={quillModules}
              formats={quillFormats}
              value={description}
              onChange={setDescription}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Đính kèm file / link</p>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="px-4 py-2 rounded-lg border border-slate-300 text-sm cursor-pointer hover:bg-slate-50">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Tên link (tuỳ chọn)"
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
              />
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
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

          <div className="flex justify-end">
            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              disabled={submission?.canResubmit === false}
            >
              {submission?.status && submission.status !== "NOT_SUBMITTED" ? "Nộp lại" : "Nộp bài"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
