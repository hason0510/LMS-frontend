import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Alert,
  message,
  Spin,
} from "antd";
import { ArrowLeftIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import { getCourseById } from "../../api/course";
import { createChapter } from "../../api/chapter";

const { TextArea } = Input;

export default function CreateChapter() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [addLessons, setAddLessons] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await getCourseById(courseId);
      setCourse(response.data);
      form.setFieldsValue({
        courseId: courseId,
        orderIndex: 1,
      });
    } catch (err) {
      setError("Không thể tải thông tin khóa học");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    try {
      setSubmitting(true);
      setError(null);

      const chapterData = {
        title: values.title,
        orderIndex: String(values.orderIndex),
        courseId: courseId,
        description: values.description || "",
      };

      await createChapter(courseId, chapterData);
      message.success("Tạo chương thành công");

      if (addLessons) {
        navigate(`/teacher/courses/${courseId}/lectures/create`);
      } else {
        navigate(`/teacher/courses/${courseId}`);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi tạo chương");
      message.error(err.message || "Lỗi khi tạo chương");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <TeacherHeader />
        <div className="flex">
          <TeacherSidebar />
          <main className={`flex-1 pt-16 flex items-center justify-center transition-all duration-300 ${
            sidebarCollapsed ? "pl-20" : "pl-64"
          }`}>
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
        <TeacherSidebar />

        <main className={`flex-1 pt-16 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Back Button */}
            <button
              onClick={() => navigate(`/teacher/courses/${courseId}`)}
              className="flex items-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">
                Quay lại khóa học {course?.title}
              </span>
            </button>
            <div className="mx-auto w-full flex flex-col gap-6">
              {/* Page Heading */}
              <div className="flex flex-col gap-2">
                <h1 className="text-[#111418] dark:text-white text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">
                  Tạo Chương mới
                </h1>
                <p className="text-[#617589] dark:text-gray-400 text-base font-normal">
                  Thêm chương mới vào cấu trúc khóa học của bạn để tổ chức bài
                  giảng.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert
                  message="Lỗi"
                  description={error}
                  type="error"
                  showIcon
                  className="mb-4"
                />
              )}

              {/* Main Form Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#dbe0e6] dark:border-gray-700 p-6 lg:p-8">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  className="flex flex-col gap-6"
                >
                  {/* Course Display */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[#111418] dark:text-gray-200 text-base font-medium">
                      Thuộc khóa học
                    </label>
                    <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-[#dbe0e6] dark:border-gray-600">
                      <p className="text-[#111418] dark:text-white font-medium">
                        {course?.title}
                      </p>
                    </div>
                  </div>

                  {/* Title & Order Grid */}
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
                          {
                            required: true,
                            message: "Vui lòng nhập tên chương",
                          },
                          {
                            min: 3,
                            message: "Tên chương phải có ít nhất 3 ký tự",
                          },
                        ]}
                      >
                        <Input
                          placeholder="Ví dụ: Giới thiệu về React Components"
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
                        rules={[
                          { required: true, message: "Vui lòng nhập thứ tự" },
                        ]}
                      >
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          className="h-12 rounded-lg"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[#111418] dark:text-gray-200 text-base font-medium">
                      Mô tả chương
                    </label>
                    <Form.Item name="description" className="mb-0">
                      <TextArea
                        rows={6}
                        placeholder="Mô tả ngắn gọn về nội dung học viên sẽ đạt được trong chương này..."
                        className="rounded-lg"
                      />
                    </Form.Item>
                  </div>

                  {/* Checkbox */}
                  <div className="flex items-start gap-3 py-2">
                    <Checkbox
                      checked={addLessons}
                      onChange={(e) => setAddLessons(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div className="text-sm leading-6">
                      <p className="font-medium text-[#111418] dark:text-gray-200">
                        Thêm bài giảng vào chương này ngay bây giờ
                      </p>
                      <p className="text-[#617589] dark:text-gray-400 text-xs">
                        Nếu được chọn, bạn sẽ được chuyển hướng đến trang tạo
                        bài giảng sau khi lưu.
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-[#f0f2f4] dark:bg-gray-700 w-full my-2"></div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4">
                    <Button
                      type="default"
                      size="large"
                      onClick={() => navigate(`/teacher/courses/${courseId}`)}
                      className="w-full sm:w-auto"
                    >
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

              {/* Helper Tip */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                <span className="material-symbols-outlined text-primary mt-0.5">
                  info
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-[#111418] dark:text-white">
                    Lời khuyên
                  </p>
                  <p className="text-sm text-[#617589] dark:text-gray-300">
                    Chia nhỏ khóa học thành các chương rõ ràng giúp học viên dễ
                    dàng theo dõi tiến độ. Mỗi chương nên có từ 3-7 bài giảng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
