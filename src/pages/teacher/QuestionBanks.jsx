import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Modal, Form, Input, Select, Button, message, Table, Tag, Tooltip } from "antd";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { useAuth } from "../../contexts/AuthContext";
import {
  createQuestionBank,
  deleteQuestionBank,
  getQuestionBanks,
  updateQuestionBank,
} from "../../api/questionBank";
import { getAllCategories } from "../../api/category";
import { getAllSubjects, getSubjectsByCategory } from "../../api/subject";
import {
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";

const { TextArea } = Input;

export default function QuestionBanks({ isAdmin = false }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userRole = user?.role.toLowerCase();
  
  const [banks, setBanks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filters, setFilters] = useState({
    subjectId: undefined,
  });

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBanks();
  }, [filters.subjectId]);

  const formatSubjectLabel = (subject) =>
    [subject?.code, subject?.title].filter(Boolean).join(" - ") || "Chưa gán môn học";

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [banksRes, catRes, subjectRes] = await Promise.all([
        getQuestionBanks({ subjectId: filters.subjectId }),
        getAllCategories(1, 100),
        getAllSubjects()
      ]);
      setBanks(Array.isArray(banksRes) ? banksRes : []);
      setCategories(catRes.data?.pageList.map(cat => ({ value: cat.id, label: cat.title })) || []);
      setAllSubjects(subjectRes.data || subjectRes || []);
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.subjectId) params.subjectId = filters.subjectId;
      const banksRes = await getQuestionBanks(params);
      setBanks(Array.isArray(banksRes) ? banksRes : []);
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải ngân hàng câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (value) => {
    form.setFieldsValue({ subjectId: undefined });
    if (value) {
      try {
        setSubjectsLoading(true);
        const res = await getSubjectsByCategory(value);
        const subjectList = res.data || [];
        setSubjects(subjectList.map(sub => ({ value: sub.id, label: formatSubjectLabel(sub) })));
      } catch (err) {
        console.error(err);
      } finally {
        setSubjectsLoading(false);
      }
    } else {
      setSubjects([]);
    }
  };

  const handleCreate = async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        scopeType: "SUBJECT_WIDE",
        subjectId: values.subjectId
      };
      await createQuestionBank(payload);
      message.success("Tạo Ngân hàng câu hỏi thành công");
      setIsModalOpen(false);
      form.resetFields();
      fetchBanks();
    } catch (err) {
      message.error("Lỗi khi tạo Ngân hàng câu hỏi");
    }
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setSubjects([]);
  };

  const handleOpenEdit = (record) => {
    setEditingBank(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description || "",
      subjectId: record.subjectId,
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingBank(null);
    editForm.resetFields();
  };

  const handleUpdate = async () => {
    if (!editingBank?.id) return;
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      await updateQuestionBank(editingBank.id, values);
      message.success("Đã cập nhật ngân hàng câu hỏi");
      closeEditModal();
      fetchBanks();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Lỗi khi cập nhật Ngân hàng câu hỏi");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: "Xác nhận xóa ngân hàng câu hỏi",
      content: `Bạn có chắc muốn xóa "${record.name}" không? Hành động này không thể hoàn tác.`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteQuestionBank(record.id);
          message.success("Đã xóa ngân hàng câu hỏi");
          fetchBanks();
        } catch (err) {
          message.error(err?.response?.data?.message || "Không thể xóa ngân hàng câu hỏi");
        }
      },
    });
  };

  const columns = [
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Link to={`/${userRole}/question-banks/${record.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-base dark:text-blue-300 dark:hover:text-blue-200">
          {text}
        </Link>
      )
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (text) => <span className="text-gray-500 dark:text-gray-400">{text || "-"}</span>
    },
    {
      title: "Môn học",
      key: "subject",
      render: (_, record) => (
        <span className="font-medium text-gray-700 dark:text-gray-200">{[record.subjectCode, record.subjectTitle].filter(Boolean).join(" - ") || record.subjectId || "-"}</span>
      )
    },
    {
      title: "Owner",
      dataIndex: "ownerName",
      key: "ownerName",
      render: (ownerName, record) => {
        const name = ownerName || (record.ownerId ? `#${record.ownerId}` : "-");
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold uppercase dark:bg-indigo-950/60 dark:text-indigo-200">
              {name !== "-" ? name.charAt(0) : "?"}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{name}</span>
          </div>
        );
      }
    },
    {
      title: "Vai trò của tôi",
      dataIndex: "myRole",
      key: "myRole",
      render: (role) => {
        if (!role) return "-";
        const color = role === "OWNER" ? "gold" : role === "EDITOR" ? "blue" : "default";
        return <Tag color={color} className="font-medium border-0 shadow-sm">{role}</Tag>;
      }
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, record) => {
        const canManage = isAdmin || record.myRole === "OWNER";

        return (
          <div className="flex items-center gap-2">
            <Tooltip title="Chi tiết">
              <Link to={`/${userRole}/question-banks/${record.id}`}>
                <Button type="text" className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center justify-center rounded-md dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/50 dark:hover:text-blue-100" icon={<EyeIcon className="h-4 w-4" />} />
              </Link>
            </Tooltip>
            {canManage && (
              <>
                <Tooltip title="Sửa">
                  <Button type="text" className="text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center justify-center rounded-md dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50 dark:hover:text-amber-100" icon={<PencilSquareIcon className="h-4 w-4" />} onClick={() => handleOpenEdit(record)} />
                </Tooltip>
                <Tooltip title="Xóa">
                  <Button type="text" className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 flex items-center justify-center rounded-md dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50 dark:hover:text-red-100" icon={<TrashIcon className="h-4 w-4" />} onClick={() => handleDelete(record)} />
                </Tooltip>
              </>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="question-banks-page min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            <AppBreadcrumb className="mb-6" />
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Ngân hàng câu hỏi</h1>
                  <p className="text-slate-500 mt-1 dark:text-slate-400">Quản lý kho câu hỏi dùng cho bài Quizz/Assignment.</p>
                </div>
              </div>
              {/*<Button
                type="primary"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-full px-5 h-10 shadow-sm bg-blue-600 hover:bg-blue-700 border-0"
                icon={<PlusCircleIcon className="h-5 w-5" />}
              >
                Tạo mới
              </Button>*/}
              <Button
                  type="primary"
                  onClick={() => setIsModalOpen(true)}
                  // 1. Thêm justify-center để căn giữa hoàn hảo
                  className="flex items-center justify-center gap-2 rounded-full px-5 h-10 shadow-sm bg-blue-600 hover:bg-blue-700 border-0"
              >
                {/* 2. Đưa icon vào đây làm con trực tiếp */}
                <PlusIcon className="h-4 w-4" />

                {/* 3. Bọc chữ trong thẻ span và thêm leading-none để triệt tiêu chiều cao dòng thừa */}
                <span className="leading-none">Tạo mới</span>
              </Button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-md">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Môn học / mã học phần</label>
                  <Select
                    className="w-full h-10"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Tất cả môn học"
                    value={filters.subjectId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, subjectId: value }))}
                    options={allSubjects.map((subject) => ({
                      value: subject.id,
                      label: formatSubjectLabel(subject),
                    }))}
                  />
                </div>
                <Button
                  className="h-10 px-4 rounded-lg flex items-center justify-center bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                  onClick={() => setFilters({ subjectId: undefined })}
                >
                  Reset
                </Button>
              </div>
              <Table 
                columns={columns} 
                dataSource={banks} 
                rowKey="id" 
                loading={loading}
                pagination={{ pageSize: 10, className: "mt-6" }}
                className="question-banks-table [&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:text-slate-600 [&_.ant-table-thead_th]:font-semibold dark:[&_.ant-table-thead_th]:bg-slate-800 dark:[&_.ant-table-thead_th]:text-slate-200"
              />
            </div>
          </div>
        </main>
      </div>

      <Modal
        title="Tạo Ngân hàng câu hỏi mới"
        open={isModalOpen}
        onCancel={closeCreateModal}
        footer={null}
        forceRender
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} className="question-banks-modal">
          <Form.Item label="Tên ngân hàng" name="name" rules={[{ required: true, message: "Bắt buộc nhập" }]}>
            <Input placeholder="Ví dụ: Ngân hàng câu hỏi Java" />
          </Form.Item>
          <Form.Item label="Danh mục (Category)" name="categoryId" rules={[{ required: true, message: "Bắt buộc chọn" }]}>
            <Select options={categories} placeholder="Chọn danh mục" onChange={handleCategoryChange} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="Môn học (Subject)" name="subjectId" rules={[{ required: true, message: "Bắt buộc chọn" }]}>
            <Select 
              options={subjects} 
              placeholder={form.getFieldValue("categoryId") ? "Chọn môn học" : "Vui lòng chọn danh mục trước"} 
              loading={subjectsLoading}
              disabled={!form.getFieldValue("categoryId")}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <TextArea rows={4} placeholder="Mô tả" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeCreateModal}>Hủy</Button>
            <Button type="primary" htmlType="submit">Tạo</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Sửa Ngân hàng câu hỏi"
        open={editModalOpen}
        onCancel={closeEditModal}
        footer={null}
        forceRender
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate} className="question-banks-modal">
          <Form.Item label="Tên ngân hàng" name="name" rules={[{ required: true, message: "Bắt buộc nhập" }]}>
            <Input placeholder="Tên ngân hàng" />
          </Form.Item>
          <Form.Item label="Môn học" name="subjectId" rules={[{ required: true, message: "Bắt buộc chọn" }]}>
            <Select
              options={allSubjects.map((subject) => ({
                value: subject.id,
                label: formatSubjectLabel(subject),
              }))}
              placeholder="Chọn môn học"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <TextArea rows={4} placeholder="Mô tả" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeEditModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={editLoading}>
              Lưu
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
