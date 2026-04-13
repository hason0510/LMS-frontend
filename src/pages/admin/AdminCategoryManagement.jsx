import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Table, Popconfirm, Tag } from "antd";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "../../api/category";

const { TextArea } = Input;

export default function AdminCategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form] = Form.useForm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      setLoading(true);
      const res = await getAllCategories(1, 100);
      setCategories(res.data?.pageList || []);
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedCategory(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEditModal = (category) => {
    setModalMode("edit");
    setSelectedCategory(category);
    form.setFieldsValue({
      title: category.title,
      description: category.description,
    });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (modalMode === "create") {
        await createCategory(values);
        message.success("Tạo danh mục thành công");
      } else {
        await updateCategory(selectedCategory.id, values);
        message.success("Cập nhật danh một thành công");
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      message.error(err.message || "Lỗi khi lưu danh mục");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      message.success("Xóa danh mục thành công");
      fetchCategories();
    } catch (err) {
      message.error("Lỗi khi xóa danh mục");
    }
  };

  const filteredCategories = categories.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (text) => <span className="font-semibold">{text}</span>,
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
          <button
            onClick={() => handleOpenEditModal(record)}
            className="p-1 text-slate-500 hover:text-primary transition-colors"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <Popconfirm
            title="Xóa danh mục?"
            description="Lưu ý: Hành động này có thể ảnh hưởng đến các môn học thuộc danh mục này."
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Danh mục</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Quản lý các danh mục chính trong hệ thống</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors"
            >
              <PlusCircleIcon className="h-5 w-5" />
              Tạo danh mục mới
            </button>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm danh mục..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <Table
              columns={columns}
              dataSource={filteredCategories}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              className="dark:text-white"
            />
          </div>
        </div>
      </main>

      <Modal
        title={modalMode === "create" ? "Tạo danh mục mới" : "Chỉnh sửa danh mục"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item
            label="Tiêu đề"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
          >
            <Input placeholder="Ví dụ: Công nghệ thông tin" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <TextArea rows={4} placeholder="Nhập mô tả cho danh mục" />
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
