import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { MagnifyingGlassIcon, PlusCircleIcon, DocumentCheckIcon } from "@heroicons/react/24/outline";
import { getTemplates, deleteTemplate } from "../../api/curriculumTemplate";
import { createClassSectionFromTemplateId } from "../../api/classSection";
import { getAllCategories } from "../../api/category";
import { getSubjectsByCategory } from "../../api/subject";
import { Spin, Alert, Card, Tag, Select, Modal, Form, Input, DatePicker, message, Tooltip, Popconfirm } from "antd";
import { UserPlusIcon, ChevronRightIcon, ArrowPathIcon, TrashIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

export default function TeacherCurriculums({ isAdmin = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [instantiateModalVisible, setInstantiateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [instantiateForm] = Form.useForm();
  const [instantiateLoading, setInstantiateLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories(1, 100);
      setCategories(res.data?.pageList || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTemplates = async (subjectId = null) => {
    try {
      setLoading(true);
      const params = { includeVersions: true };
      if (subjectId) params.subjectId = subjectId;
      const response = await getTemplates(params);
      setTemplates(response.data?.pageList || response.data || response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (value) => {
    setSelectedCategoryId(value);
    setSelectedSubjectId(null);
    setSubjects([]);
    if (value) {
      try {
        setSubjectsLoading(true);
        const res = await getSubjectsByCategory(value);
        setSubjects(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSubjectsLoading(false);
      }
    }
    fetchTemplates(); // Reset to all or filter by category if backend supported it, but here we filter by subject
  };

  const handleSubjectChange = (value) => {
    setSelectedSubjectId(value);
    fetchTemplates(value);
  };

  const handleInstantiate = (template) => {
    setSelectedTemplate(template);
    const code = generateRandomCode();
    setGeneratedCode(code);
    instantiateForm.setFieldsValue({
      title: `${template.name} - Lớp mới`,
      description: template.description || "",
    });
    setInstantiateModalVisible(true);
  };

  const onInstantiateFinish = async (values) => {
    try {
      setInstantiateLoading(true);
      await createClassSectionFromTemplateId(selectedTemplate.id, {
        title: values.title,
        description: values.description,
        classCode: generatedCode || undefined,
        startDate: values.dates?.[0]?.format("YYYY-MM-DD"),
        endDate: values.dates?.[1]?.format("YYYY-MM-DD"),
        teacherId: user?.id || user?.sub,
      });
      message.success("Tạo lớp học thành công!");
      setInstantiateModalVisible(false);
      instantiateForm.resetFields();
      setGeneratedCode(null);
      navigate(`/${userRole}/class-sections`);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Không thể tạo lớp học");
    } finally {
      setInstantiateLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await deleteTemplate(id);
      message.success("Đã xóa chương trình học!");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      message.error("Không thể xóa: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredTemplates = templates?.filter((t) => {
    if (searchQuery && !t.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !t.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight tracking-[-0.015em]">
                  {isAdmin ? "Quản lý Curriculum Templates" : "Chương trình học (Curriculum Templates)"}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Thiết kế cấu trúc môn học chuẩn (Blueprints) dùng để tạo ra các lớp học (Class Sections).
                </p>
              </div>
              <button
                onClick={() => navigate(`/${userRole}/curriculums/create`)}
                className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span>Tạo Template Mới</span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Select
                  placeholder="Lọc theo danh mục"
                  className="w-full h-[45px]"
                  allowClear
                  onChange={handleCategoryChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>{cat.title}</Select.Option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <Select
                  placeholder="Lọc theo môn học"
                  className="w-full h-[45px]"
                  allowClear
                  onChange={handleSubjectChange}
                  value={selectedSubjectId}
                  loading={subjectsLoading}
                  disabled={!selectedCategoryId}
                  showSearch
                  optionFilterProp="children"
                >
                  {subjects.map(sub => (
                    <Select.Option key={sub.id} value={sub.id}>{sub.title}</Select.Option>
                  ))}
                </Select>
              </div>
              <div className="relative flex-[2]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-10 bg-white dark:bg-gray-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm dark:text-white"
                  placeholder="Tìm kiếm template..."
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64"><Spin size="large" /></div>
            ) : error ? (
              <Alert title="Lỗi" description={error} type="error" showIcon />
            ) : !filteredTemplates || filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Chưa có template nào</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Hãy tạo chương trình học đầu tiên của bạn.</p>
                <button
                  onClick={() => navigate(`/${userRole}/curriculums/create`)}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90"
                >
                  <PlusCircleIcon className="h-5 w-5" /> Tạo Template Mới
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates?.map((template) => (
                  <Card key={template.id} className="shadow-sm hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <DocumentCheckIcon className="h-6 w-6 text-primary" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white truncate">{template.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                      {template.description || "Không có mô tả."}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      {template.subjectTitle && (
                        <Tag color="blue">{template.subjectTitle}</Tag>
                      )}
                      {template.chapters?.length > 0 && (
                        <Tag color="cyan">{template.chapters.length} chương</Tag>
                      )}
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                      <button
                        onClick={() => navigate(`/${userRole}/curriculums/${template.id}`)}
                        className="flex-1 px-3 py-2 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded flex items-center justify-center gap-1"
                      >
                        Xem nội dung
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleInstantiate(template)}
                        className="px-3 py-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded flex items-center gap-1 font-medium"
                        title="Tạo lớp học từ template này"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        Tạo lớp
                      </button>
                      <Popconfirm
                        title="Xóa chương trình học?"
                        description="Hành động này không thể hoàn tác."
                        onConfirm={() => handleDeleteTemplate(template.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <button
                          className="flex items-center justify-center w-9 h-9 rounded border border-slate-200 dark:border-slate-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Xóa template"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </Popconfirm>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <Modal
        title={`Tạo Lớp Học từ: ${selectedTemplate?.title || selectedTemplate?.name}`}
        open={instantiateModalVisible}
        onCancel={() => setInstantiateModalVisible(false)}
        onOk={() => instantiateForm.submit()}
        confirmLoading={instantiateLoading}
        okText="Tạo Lớp"
        cancelText="Hủy"
      >
        <Form
          form={instantiateForm}
          layout="vertical"
          onFinish={onInstantiateFinish}
          className="mt-4"
        >
          <Form.Item
            label="Tên lớp học"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tên lớp" }]}
          >
            <Input placeholder="Ví dụ: Lớp Java Cơ Bản - K12" />
          </Form.Item>

          {/* Teams-style class code display */}
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mã lớp học</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Chia sẻ mã này để học viên có thể tham gia trực tiếp vào lớp.
            </p>
            {generatedCode ? (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
                <p className="text-2xl font-black tracking-widest text-primary font-mono mb-3 select-all">
                  {generatedCode}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Tooltip title="Tạo mã mới">
                    <button
                      type="button"
                      onClick={() => setGeneratedCode(generateRandomCode())}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                      Đặt lại
                    </button>
                  </Tooltip>
                  <Tooltip title="Xóa mã (học viên không thể tham gia bằng mã)">
                    <button
                      type="button"
                      onClick={() => setGeneratedCode(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </Tooltip>
                  <Tooltip title="Sao chép mã">
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(generatedCode); message.success("Đã sao chép mã!"); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      Sao chép
                    </button>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex items-center justify-between">
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">Không sử dụng mã lớp</p>
                <button
                  type="button"
                  onClick={() => setGeneratedCode(generateRandomCode())}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Tạo mã
                </button>
              </div>
            )}
          </div>

          <Form.Item
            label="Thời gian diễn ra"
            name="dates"
            rules={[{ required: true, message: "Vui lòng chọn thời gian" }]}
          >
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>

          <Form.Item
            label="Mô tả lớp học"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="Nhập mô tả riêng cho lớp này (nếu có)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
