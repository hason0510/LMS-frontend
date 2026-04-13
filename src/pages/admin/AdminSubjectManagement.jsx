import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Table, Popconfirm, Select, Tag } from "antd";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { getAllSubjects, createSubject, updateSubject, deleteSubject } from "../../api/subject";
import { getAllCategories } from "../../api/category";

const { TextArea } = Input;

export default function AdminSubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [form] = Form.useForm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, catRes] = await Promise.all([
        getAllSubjects(),
        getAllCategories(1, 100)
      ]);
      setSubjects(subRes.data || []);
      setCategories(catRes.data?.pageList || []);
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedSubject(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEditModal = (subject) => {
    setModalMode("edit");
    setSelectedSubject(subject);
    form.setFieldsValue({
      title: subject.title,
      description: subject.description,
      categoryId: subject.categoryId,
    });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (modalMode === "create") {
        await createSubject(values);
        message.success("Tạo môn học thành công");
      } else {
        await updateSubject(selectedSubject.id, values);
        message.success("Cập nhật môn học thành công");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(err.message || "Lỗi khi lưu môn học");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSubject(id);
      message.success("Xóa môn học thành công");
      fetchData();
    } catch (err) {
      message.error("Lỗi khi xóa môn học");
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || s.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Tên môn học",
      dataIndex: "title",
      key: "title",
      render: (text) => <span className="font-semibold text-primary">{text}</span>,
    },
    {
      title: "Danh mục",
      dataIndex: "categoryTitle",
      key: "categoryTitle",
      render: (text) => <Tag color="blue">{text || "Không có"}</Tag>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Hành động",
      key: "action",
      width: 120,
      render: (_, record) => (
        <div className="flex gap-2">
          <button onClick={() => handleOpenEditModal(record)} className="p-1 text-slate-500 hover:text-primary transition-colors">
            <PencilIcon className="h-4 w-4" />
          </button>
          <Popconfirm
            title="Xóa môn học?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <button className="p-1 text-red-500 hover:text-red-700 transition-colors">
              <TrashIcon className="h-4 w-4" />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TeacherHeader />
      <AdminSidebar />
      <main className={`pt-16 pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap mt-3 items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Môn học</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Quản lý các môn học và phân loại theo danh mục</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors"
            >
              <PlusCircleIcon className="h-5 w-5" />
              Tạo môn học mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm môn học..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary h-[40px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              placeholder="Lọc theo danh mục"
              allowClear
              className="w-full h-[40px]"
              onChange={setCategoryFilter}
              options={categories.map(c => ({ value: c.id, label: c.title }))}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <Table
              columns={columns}
              dataSource={filteredSubjects}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              className="dark:text-white"
            />
          </div>
        </div>
      </main>

      <Modal
        title={modalMode === "create" ? "Tạo môn học mới" : "Chỉnh sửa môn học"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item
            label="Tên môn học"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tên môn học" }]}
          >
            <Input placeholder="Ví dụ: Java Web Development" />
          </Form.Item>
          <Form.Item
            label="Danh mục chủ quản"
            name="categoryId"
            rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
          >
            <Select
              placeholder="Chọn danh mục"
              showSearch
              optionFilterProp="label"
              options={categories.map(c => ({ value: c.id, label: c.title }))}
            />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <TextArea rows={4} placeholder="Nhập mô tả cho môn học" />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              {modalMode === "create" ? "Tạo mới" : "Lưu thay đổi"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
