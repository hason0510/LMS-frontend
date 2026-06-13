import React, { useEffect, useMemo, useState } from "react";
import { Button, Empty, Form, Input, Modal, Popconfirm, Table, message } from "antd";
import { useTranslation } from "react-i18next";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { createCategory, deleteCategory, getAllCategories, updateCategory } from "../../api/category";

const { TextArea } = Input;
const DEFAULT_PAGE_SIZE = 10;

export default function AdminCategoryManagement() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await getAllCategories(1, 1000);
      setCategories(res.data?.pageList || []);
    } catch (err) {
      console.error(err);
      message.error(t("adminCatalog.messages.loadCategoriesFailed"));
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return categories;
    return categories.filter((category) =>
      [category.title, category.description].filter(Boolean).some((value) => value.toLowerCase().includes(keyword))
    );
  }, [categories, searchQuery]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, page, pageSize]);

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
        message.success(t("adminCatalog.messages.categoryCreated"));
      } else {
        await updateCategory(selectedCategory.id, values);
        message.success(t("adminCatalog.messages.categoryUpdated"));
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || t("adminCatalog.messages.saveCategoryFailed"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      message.success(t("adminCatalog.messages.categoryDeleted"));
      fetchCategories();
    } catch (err) {
      message.error(err?.response?.data?.message || t("adminCatalog.messages.deleteCategoryFailed"));
    }
  };

  const columns = [
    {
      title: t("adminCatalog.columns.index"),
      key: "index",
      width: 80,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: t("adminCatalog.columns.categoryTitle"),
      dataIndex: "title",
      key: "title",
      render: (text) => <span className="font-semibold text-slate-900 dark:text-white">{text}</span>,
    },
    {
      title: t("adminCatalog.columns.description"),
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text) =>
        text ? (
          <span className="block truncate" title={text}>
            {text}
          </span>
        ) : (
          <span className="text-slate-400">{t("adminCatalog.empty.noDescription")}</span>
        ),
    },
    {
      title: t("adminCatalog.columns.action"),
      key: "action",
      width: 150,
      align: "center",
      render: (_, record) => (
        <div className="flex justify-center gap-2">
          <Button
            type="text"
            size="small"
            icon={<PencilIcon className="h-4 w-4" />}
            className="app-table-action-btn"
            onClick={() => handleOpenEditModal(record)}
          >
            {t("adminCatalog.actions.edit")}
          </Button>
          <Popconfirm
            title={t("adminCatalog.confirm.deleteCategoryTitle")}
            description={t("adminCatalog.confirm.deleteCategoryDescription")}
            okText={t("adminCatalog.actions.delete")}
            cancelText={t("adminCatalog.actions.cancel")}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              size="small"
              icon={<TrashIcon className="h-4 w-4" />}
              className="app-table-action-btn app-table-action-btn--danger"
            >
              {t("adminCatalog.actions.delete")}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-category-page min-h-screen bg-slate-50 dark:bg-background-dark">
      <TeacherHeader />
      <AdminSidebar />
      <main
        className={`px-4 pb-8 pt-16 transition-all duration-300 sm:px-6 lg:px-8 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <div className="mx-auto mt-3 max-w-7xl">
          <AppBreadcrumb className="mb-5" />
          <div className="app-table-shell">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div>
                <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminCatalog.categories.title")}
                </h1>
                <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("adminCatalog.categories.subtitle")}
                </p>
              </div>
              <Button type="primary" onClick={handleOpenCreateModal} className="dark:bg-blue-600 dark:hover:bg-blue-500">
                {t("adminCatalog.categories.create")}
              </Button>
            </div>

            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
              <Input.Search
                allowClear
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("adminCatalog.categories.searchPlaceholder")}
                className="max-w-xl"
              />
            </div>

            <div className="px-5 py-4 sm:px-6">
              <Table
                columns={columns}
                dataSource={pageItems}
                rowKey="id"
                loading={loading}
                pagination={false}
                tableLayout="fixed"
                locale={{
                  emptyText: <Empty description={t("adminCatalog.empty.categories")} />,
                }}
                className="admin-category-table"
                scroll={{ x: 760 }}
              />
            </div>

            {!loading && filteredCategories.length > 0 && (
              <DataPaginationFooter
                currentPage={page}
                pageSize={pageSize}
                total={filteredCategories.length}
                totalLabel={t("adminCatalog.pagination.total", { count: filteredCategories.length })}
                pageSizeLabel={t("adminCatalog.pagination.pageSize")}
                rangeLabel={t("adminCatalog.pagination.range", {
                  start: (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, filteredCategories.length),
                })}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
              />
            )}
          </div>
        </div>
      </main>

      <Modal
        title={
          modalMode === "create"
            ? t("adminCatalog.categories.createModalTitle")
            : t("adminCatalog.categories.editModalTitle")
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item
            label={t("adminCatalog.fields.title")}
            name="title"
            rules={[{ required: true, message: t("adminCatalog.validation.titleRequired") }]}
          >
            <Input placeholder={t("adminCatalog.categories.titlePlaceholder")} />
          </Form.Item>
          <Form.Item label={t("adminCatalog.fields.description")} name="description">
            <TextArea rows={4} placeholder={t("adminCatalog.categories.descriptionPlaceholder")} />
          </Form.Item>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>{t("adminCatalog.actions.cancel")}</Button>
            <Button type="primary" htmlType="submit">
              {modalMode === "create" ? t("adminCatalog.actions.create") : t("adminCatalog.actions.save")}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
