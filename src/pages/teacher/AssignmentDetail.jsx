import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EyeIcon } from "@heroicons/react/24/outline";
import { App, Button, DatePicker, Form, Input, InputNumber, Spin, Switch } from "antd";
import dayjs from "dayjs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getCourseById, createClassContentItem } from "../../api/classSection";
import { createAssignment, getAssignmentById, updateAssignment } from "../../api/assignment";
import { uploadStandaloneResource } from "../../api/resource";
import FileItem from "../../components/common/FileItem";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "link",
];

function mapUploadTypeToResourceType(uploadType) {
  if (uploadType === "video") return "VIDEO";
  if (uploadType === "image") return "IMAGE";
  return "FILE";
}

export default function AssignmentDetail({ isAdmin = false }) {
  const { classSectionId, chapterId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isEditMode = Boolean(assignmentId);
  const basePath = isAdmin ? "/admin" : "/teacher";

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [course, setCourse] = useState(null);
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [resources, setResources] = useState([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const courseResponse = await getCourseById(classSectionId);
        setCourse(courseResponse?.data || courseResponse);

        if (isEditMode) {
          const assignmentResponse = await getAssignmentById(assignmentId);
          const assignment = assignmentResponse?.data || assignmentResponse;

          form.setFieldsValue({
            title: assignment.title,
            maxScore: assignment.maxScore,
            dueAt: assignment.dueAt ? dayjs(assignment.dueAt) : null,
            allowLateSubmission: Boolean(assignment.allowLateSubmission),
          });

          setDescription(assignment.description || "");
          setInstruction(assignment.instruction || "");
          setResources(
            (assignment.resources || []).map((resource) => ({
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
        } else {
          form.setFieldsValue({
            maxScore: 100,
            allowLateSubmission: false,
          });
        }
      } catch (error) {
        console.error(error);
        message.error("Không thể tải thông tin assignment");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [assignmentId, classSectionId, form, isEditMode, message]);

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

  const buildPayload = (values) => ({
    title: values.title?.trim(),
    description,
    instruction,
    maxScore: values.maxScore,
    dueAt: values.dueAt ? values.dueAt.toISOString() : null,
    allowLateSubmission: Boolean(values.allowLateSubmission),
    classSectionId: Number(classSectionId),
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

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      const payload = buildPayload(values);

      let savedAssignment;
      if (isEditMode) {
        const updateResponse = await updateAssignment(assignmentId, payload);
        savedAssignment = updateResponse?.data || updateResponse;
        message.success("Cập nhật assignment thành công");
      } else {
        if (!chapterId) {
          message.error("Thiếu chapterId để gắn assignment vào nội dung lớp");
          return;
        }
        const createResponse = await createAssignment(payload);
        savedAssignment = createResponse?.data || createResponse;
        await createClassContentItem(classSectionId, chapterId, {
          itemType: "ASSIGNMENT",
          assignmentId: savedAssignment.id,
          title: payload.title,
        });
        message.success("Tạo assignment thành công");
      }

      navigate(`${basePath}/class-sections/${classSectionId}`);
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || "Không thể lưu assignment");
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
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-16 lg:pl-64">
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            <button
              onClick={() => navigate(`${basePath}/class-sections/${classSectionId}`)}
              className="text-primary text-sm font-medium hover:underline"
            >
              Quay lại lớp: {course?.title}
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isEditMode ? "Chỉnh sửa Assignment" : "Tạo Assignment"}
                </h1>
                {isEditMode && (
                  <div className="flex items-center gap-2">
                    {!isAdmin && classSectionId && assignmentId && (
                      <Button
                        onClick={() =>
                          navigate(`/teacher/class-sections/${classSectionId}/assignments/${assignmentId}/preview`)
                        }
                        className="flex items-center gap-1.5 border-amber-400 text-amber-600 hover:border-amber-500 hover:text-amber-700"
                        icon={<EyeIcon className="h-4 w-4" />}
                      >
                        Xem như học viên
                      </Button>
                    )}
                    <Button
                      onClick={() =>
                        navigate(`${basePath}/class-sections/${classSectionId}/assignments/${assignmentId}/submissions`)
                      }
                    >
                      Xem Bài Nộp
                    </Button>
                  </div>
                )}
              </div>

              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    label="Tiêu đề"
                    name="title"
                    rules={[{ required: true, message: "Vui lòng nhập tiêu đề assignment" }]}
                  >
                    <Input placeholder="Ví dụ: Assignment 1 - OOP Basics" />
                  </Form.Item>

                  <Form.Item
                    label="Điểm tối đa"
                    name="maxScore"
                    rules={[{ required: true, message: "Vui lòng nhập điểm tối đa" }]}
                  >
                    <InputNumber className="w-full" min={1} />
                  </Form.Item>

                  <Form.Item label="Hạn nộp" name="dueAt">
                    <DatePicker showTime className="w-full" />
                  </Form.Item>

                  <Form.Item label="Cho phép nộp muộn" name="allowLateSubmission" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </div>

                <div className="space-y-2 mb-5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Mô tả</label>
                  <ReactQuill
                    theme="snow"
                    modules={quillModules}
                    formats={quillFormats}
                    value={description}
                    onChange={setDescription}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="space-y-2 mb-6">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Hướng dẫn làm bài</label>
                  <ReactQuill
                    theme="snow"
                    modules={quillModules}
                    formats={quillFormats}
                    value={instruction}
                    onChange={setInstruction}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 mb-6">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Resources</h2>

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
                    <Input
                      placeholder="Tên link (tuỳ chọn)"
                      value={linkTitle}
                      onChange={(event) => setLinkTitle(event.target.value)}
                    />
                    <Input
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
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    {isEditMode ? "Cập nhật Assignment" : "Tạo Assignment"}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}