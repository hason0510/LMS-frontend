import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Input, Select, Spin, Alert, message } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { createTemplate, updateTemplate, getTemplateById } from "../../api/curriculumTemplate";
import { getAllCategories } from "../../api/category";
import { getSubjectsByCategory } from "../../api/subject";
import { LoadingOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const whiteSpinner = <LoadingOutlined style={{ fontSize: 16, color: "#fff" }} spin />;

export default function CreateCurriculumTemplate({ isAdmin = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();
  const isExisting = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isEditMode, setIsEditMode] = useState(!id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const basePath = isAdmin ? "/admin" : "/teacher";

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories(1, 100);
      setCategories(
        res.data.pageList.map((cat) => ({
          value: cat.id,
          label: cat.title,
        }))
      );
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh mục");
    }
  };

  const handleCategoryChange = async (categoryId) => {
    form.setFieldsValue({ subjectId: undefined });
    if (categoryId) {
      await fetchSubjectsByCategory(categoryId);
    } else {
      setSubjects([]);
    }
  };

  const fetchSubjectsByCategory = async (categoryId) => {
    try {
      setSubjectsLoading(true);
      const res = await getSubjectsByCategory(categoryId);
      const subjectList = res.data || [];
      setSubjects(
        subjectList.map((s) => ({
          value: s.id,
          label: s.title,
        }))
      );
    } catch (err) {
      console.error(err);
      message.error("Không thể tải môn học của danh mục này");
    } finally {
      setSubjectsLoading(false);
    }
  };

  useEffect(() => {
    if (isExisting) {
      const fetchTemplate = async () => {
        try {
          setLoading(true);
          const response = await getTemplateById(id);
          const data = response.data || response;

          form.setFieldsValue({
            name: data.name,
            description: data.description,
            categoryId: data.categoryId,
            subjectId: data.subjectId,
          });

          if (data.categoryId) {
            await fetchSubjectsByCategory(data.categoryId);
          }
        } catch (err) {
          console.error(err);
          message.error("Không thể tải thông tin curriculum template");
        } finally {
          setLoading(false);
        }
      };
      fetchTemplate();
    }
  }, [isExisting, id, form]);

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);

    try {
      if (isExisting) {
        await updateTemplate(id, {
          name: values.name,
          description: values.description,
          subjectId: values.subjectId,
          isDefault: true,
        });
        message.success("Cập nhật template thành công");
        navigate(`${basePath}/curriculums/${id}`);
      } else {
        const res = await createTemplate({
          name: values.name,
          description: values.description,
          subjectId: values.subjectId,
          isDefault: true,
        });
        const newTemplate = res.data || res;
        message.success("Tạo template thành công! Hãy thêm chương học.");
        navigate(`${basePath}/curriculums/${newTemplate.id}`);
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="max-w-4xl mx-auto px-6 py-8">
            <header className="mb-8 flex justify-between items-center">
              <h1 className="text-3xl font-bold">
                {isExisting ? "Chi tiết Curriculum Template" : "Tạo Curriculum Template mới"}
              </h1>
              {isExisting && !isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                  Chỉnh sửa
                </button>
              )}
            </header>

            {error && <Alert type="error" title="Lỗi" description={error} showIcon className="mb-6" />}

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                disabled={!isEditMode}
                validateTrigger="onBlur"
              >
                <div className="space-y-6">
                  <Form.Item
                    label="Tên chương trình học (Template Name)"
                    name="name"
                    rules={[{ required: true, message: "Vui lòng nhập tên template" }]}
                  >
                    <Input placeholder="Ví dụ: Java Backend Development v1" className="h-[40px]" />
                  </Form.Item>

                  <Form.Item
                    label="Danh mục (Category)"
                    name="categoryId"
                    rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
                  >
                    <Select
                      placeholder="Chọn danh mục"
                      options={categories}
                      onChange={handleCategoryChange}
                      className="h-[40px]"
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Môn học (Subject)"
                    name="subjectId"
                    rules={[{ required: true, message: "Vui lòng chọn môn học" }]}
                  >
                    <Select
                      placeholder={form.getFieldValue("categoryId") ? "Chọn môn học" : "Vui lòng chọn danh mục trước"}
                      options={subjects}
                      className="h-[40px]"
                      loading={subjectsLoading}
                      disabled={!form.getFieldValue("categoryId")}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Mô tả"
                    name="description"
                  >
                    <TextArea rows={6} placeholder="Nhập mô tả chi tiết..." />
                  </Form.Item>
                </div>

                {isEditMode && (
                  <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => navigate(`/${userRole}/curriculums`)}
                      className="px-6 py-2 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200"
                    >
                      Hủy
                    </button>
                    <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-white" disabled={loading}>
                      {loading ? <Spin size="small" /> : isExisting ? "Cập nhật" : "Tạo mới"}
                    </button>
                  </div>
                )}
              </Form>
            </div>

            {/* Link to full template detail after save */}
            {isExisting && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/40 flex items-center justify-between">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Quản lý chương và nội dung học tập của template này.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/curriculums/${id}`)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Xem nội dung →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
