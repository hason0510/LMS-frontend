import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Checkbox, Form, Input, Spin, message } from "antd";
import { ArrowLeftIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { createChapterTemplate, getTemplateById } from "../../api/curriculumTemplate";

const { TextArea } = Input;

export default function CreateChapter({ isAdmin = false }) {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [addLectureImmediately, setAddLectureImmediately] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const basePath = useMemo(() => (isAdmin ? "/admin" : "/teacher"), [isAdmin]);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) {
        setError("Template ID is missing.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getTemplateById(templateId);
        setTemplate(data);
        const nextOrder = (data?.chapters?.length || 0) + 1;
        form.setFieldsValue({ orderIndex: nextOrder });
      } catch (err) {
        setError("Không thể tải thông tin chương trình học");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [form, templateId]);

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        title: values.title?.trim(),
        description: values.description?.trim() || "",
        orderIndex: Number(values.orderIndex || (template?.chapters?.length || 0) + 1),
      };
      const response = await createChapterTemplate(templateId, payload);
      const createdChapter = response?.data ?? response;

      message.success("Tạo chương thành công");

      if (addLectureImmediately && createdChapter?.id) {
        navigate(`${basePath}/curriculums/${templateId}/chapters/${createdChapter.id}/lectures/create`, {
          state: { isTemplateMode: true, chapterId: createdChapter.id },
        });
        return;
      }
      navigate(`${basePath}/curriculums/${templateId}`);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const fallback = "Lỗi khi tạo chương";
      setError(apiMessage || fallback);
      message.error(apiMessage || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => navigate(`${basePath}/curriculums/${templateId}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <TeacherHeader />
        <div className="flex">
          {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
          <main
            className={`flex-1 pt-16 flex items-center justify-center transition-all duration-300 ${
              sidebarCollapsed ? "pl-20" : "pl-64"
            }`}
          >
            <Spin size="large" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />

      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}

        <main
          className={`flex-1 pt-16 overflow-y-auto transition-all duration-300 ${
            sidebarCollapsed ? "pl-20" : "pl-64"
          }`}
        >
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <AppBreadcrumb className="mb-5" context={{ templateName: template?.name }} />
            <button
              onClick={handleBack}
              className="flex items-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">Quay lại chương trình học {template?.name}</span>
            </button>

            <div className="mx-auto w-full flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-[#111418] dark:text-white text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">
                  Tạo Chương Mới
                </h1>
                <p className="text-[#617589] dark:text-gray-400 text-base font-normal">
                  Thêm một chương mới vào cấu trúc chương trình học hiện tại.
                </p>
              </div>

              {error && (
                <Alert
                  message="Lỗi"
                  description={error}
                  type="error"
                  showIcon
                  className="mb-4"
                />
              )}

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#dbe0e6] dark:border-gray-700 p-6 lg:p-8">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleFinish}
                  className="flex flex-col gap-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3">
                      <Form.Item
                        label={
                          <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                            Tên chương
                          </span>
                        }
                        name="title"
                        rules={[
                          { required: true, message: "Vui lòng nhập tên chương" },
                          { min: 3, message: "Tên chương phải có ít nhất 3 ký tự" },
                        ]}
                      >
                        <Input
                          placeholder="Ví dụ: Tổng quan về dữ liệu và mô hình"
                          className="h-12 rounded-lg"
                        />
                      </Form.Item>
                    </div>

                    <div className="md:col-span-1">
                      <Form.Item
                        label={
                          <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                            Thứ tự
                          </span>
                        }
                        name="orderIndex"
                        rules={[{ required: true, message: "Vui lòng nhập thứ tự" }]}
                      >
                        <Input type="number" min="1" placeholder="1" className="h-12 rounded-lg" />
                      </Form.Item>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#111418] dark:text-gray-200 text-base font-medium">Mô tả chương</label>
                    <Form.Item name="description" className="mb-0">
                      <TextArea
                        rows={6}
                        placeholder="Mô tả ngắn gọn nội dung và mục tiêu học tập của chương này..."
                        className="rounded-lg"
                      />
                    </Form.Item>
                  </div>

                  <div className="flex items-start gap-3 py-2">
                    <Checkbox
                      checked={addLectureImmediately}
                      onChange={(e) => setAddLectureImmediately(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div className="text-sm leading-6">
                      <p className="font-medium text-[#111418] dark:text-gray-200">
                        Tạo bài giảng ngay sau khi lưu chương
                      </p>
                      <p className="text-[#617589] dark:text-gray-400 text-xs">
                        Sau khi lưu chương thành công, hệ thống sẽ chuyển qua màn tạo bài giảng.
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-[#f0f2f4] dark:bg-gray-700 w-full my-2"></div>

                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4">
                    <Button type="default" size="large" onClick={handleBack} className="w-full sm:w-auto">
                      Hủy bỏ
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      loading={submitting}
                      icon={<PlusCircleIcon className="w-5 h-5" />}
                      className="w-full sm:w-auto"
                    >
                      Tạo chương
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
