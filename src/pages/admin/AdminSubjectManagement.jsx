import React, { useEffect, useMemo, useState } from "react";
import { Button, Empty, Form, Input, Modal, Popconfirm, Select, Table, message } from "antd";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { getAllCategories } from "../../api/category";
import { createSubject, deleteSubject, getAllSubjects, updateSubject } from "../../api/subject";

const { TextArea } = Input;
const DEFAULT_PAGE_SIZE = 10;

export default function AdminSubjectManagement() {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);
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
    fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, pageSize]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.title })),
    [categories]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectResponse, categoryResponse] = await Promise.all([getAllSubjects(), getAllCategories(1, 1000)]);
      setSubjects(subjectResponse.data || subjectResponse || []);
      setCategories(categoryResponse.data?.pageList || []);
    } catch (err) {
      console.error(err);
      message.error(t("adminCatalog.messages.loadSubjectsFailed"));
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return subjects.filter((subject) => {
      const matchesSearch =
        !keyword ||
        [subject.code, subject.title, subject.description, subject.categoryTitle]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesCategory = !categoryFilter || subject.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [subjects, searchQuery, categoryFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, page, pageSize]);

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
      code: subject.code,
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
        message.success(t("adminCatalog.messages.subjectCreated"));
      } else {
        await updateSubject(selectedSubject.id, values);
        message.success(t("adminCatalog.messages.subjectUpdated"));
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || t("adminCatalog.messages.saveSubjectFailed"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSubject(id);
      message.success(t("adminCatalog.messages.subjectDeleted"));
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.message || t("adminCatalog.messages.deleteSubjectFailed"));
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
      title: t("adminCatalog.columns.subjectTitle"),
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900 dark:text-white" title={record.title}>
            {record.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="shrink-0">{t("adminCatalog.columns.subjectCode")}:</span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {record.code || "-"}
            </code>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="shrink-0">{t("adminCatalog.columns.category")}:</span>
            {record.categoryTitle ? (
              <span className="truncate" title={record.categoryTitle}>
                {record.categoryTitle}
              </span>
            ) : (
              <span>{t("adminCatalog.empty.noCategory")}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: t("adminCatalog.columns.action"),
      key: "action",
      width: 150,
      align: "right",
      render: (_, record) => (
        <div className="flex justify-end gap-2">
          <Button
            type="text"
            size="small"
            className="!inline-flex !h-8 !items-center !justify-center !rounded-md !border !border-slate-300 !bg-white !px-3 !text-slate-700 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900 dark:!border-slate-600 dark:!bg-slate-800 dark:!text-slate-200 dark:hover:!border-slate-500 dark:hover:!bg-slate-700 dark:hover:!text-white"
            onClick={() => handleOpenEditModal(record)}
          >
            {t("adminCatalog.actions.edit")}
          </Button>
          <Popconfirm
            title={t("adminCatalog.confirm.deleteSubjectTitle")}
            description={t("adminCatalog.confirm.deleteSubjectDescription")}
            okText={t("adminCatalog.actions.delete")}
            cancelText={t("adminCatalog.actions.cancel")}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              size="small"
              className="!inline-flex !h-8 !items-center !justify-center !rounded-md !border !border-red-300 !bg-white !px-3 !text-red-600 hover:!border-red-400 hover:!bg-red-50 hover:!text-red-700 dark:!border-red-900/60 dark:!bg-slate-800 dark:!text-red-300 dark:hover:!border-red-700 dark:hover:!bg-red-950/40 dark:hover:!text-red-200"
            >
              {t("adminCatalog.actions.delete")}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-subject-page min-h-screen bg-slate-50 dark:bg-background-dark">
      <TeacherHeader />
      <AdminSidebar />
      <main
        className={`px-4 pb-8 pt-16 transition-all duration-300 sm:px-6 lg:px-8 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <div className="mx-auto mt-3 max-w-7xl">
          <AppBreadcrumb className="mb-5" />
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div>
                <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminCatalog.subjects.title")}
                </h1>
                <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("adminCatalog.subjects.subtitle")}
                </p>
              </div>
              <Button type="primary" onClick={handleOpenCreateModal} className="dark:bg-blue-600 dark:hover:bg-blue-500">
                {t("adminCatalog.subjects.create")}
              </Button>
            </div>

            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <Input.Search
                  allowClear
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("adminCatalog.subjects.searchPlaceholder")}
                className="md:col-span-7"
              />
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  placeholder={t("adminCatalog.subjects.categoryFilterPlaceholder")}
                  options={categoryOptions}
                className="md:col-span-5"
              />
            </div>
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
                  emptyText: <Empty description={t("adminCatalog.empty.subjects")} />,
                }}
                className="admin-subject-table"
                scroll={{ x: 840 }}
              />
            </div>

            {!loading && filteredSubjects.length > 0 && (
              <DataPaginationFooter
                currentPage={page}
                pageSize={pageSize}
                total={filteredSubjects.length}
                totalLabel={t("adminCatalog.pagination.total", { count: filteredSubjects.length })}
                pageSizeLabel={t("adminCatalog.pagination.pageSize")}
                rangeLabel={t("adminCatalog.pagination.range", {
                  start: (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, filteredSubjects.length),
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
          modalMode === "create" ? t("adminCatalog.subjects.createModalTitle") : t("adminCatalog.subjects.editModalTitle")
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item
            label={t("adminCatalog.fields.subjectCode")}
            name="code"
            rules={[{ required: true, message: t("adminCatalog.validation.subjectCodeRequired") }]}
          >
            <Input placeholder={t("adminCatalog.subjects.codePlaceholder")} />
          </Form.Item>
          <Form.Item
            label={t("adminCatalog.fields.subjectTitle")}
            name="title"
            rules={[{ required: true, message: t("adminCatalog.validation.subjectRequired") }]}
          >
            <Input placeholder={t("adminCatalog.subjects.titlePlaceholder")} />
          </Form.Item>
          <Form.Item
            label={t("adminCatalog.fields.category")}
            name="categoryId"
            rules={[{ required: true, message: t("adminCatalog.validation.categoryRequired") }]}
          >
            <Select
              placeholder={t("adminCatalog.subjects.categoryPlaceholder")}
              showSearch
              optionFilterProp="label"
              options={categoryOptions}
            />
          </Form.Item>
          <Form.Item label={t("adminCatalog.fields.description")} name="description">
            <TextArea rows={4} placeholder={t("adminCatalog.subjects.descriptionPlaceholder")} />
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
