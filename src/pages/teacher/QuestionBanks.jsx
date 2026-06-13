import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { App, Button, Empty, Form, Input, Modal, Popconfirm, Select, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";
import { EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { useAuth } from "../../contexts/AuthContext";
import { createQuestionBank, deleteQuestionBank, getQuestionBanks, updateQuestionBank } from "../../api/questionBank";
import { getAllCategories } from "../../api/category";
import { getAllSubjects, getSubjectsByCategory } from "../../api/subject";

const { TextArea } = Input;
const DEFAULT_PAGE_SIZE = 10;
const ACTION_BUTTON_CLASS = "app-table-action-btn";
const DANGER_BUTTON_CLASS = "app-table-action-btn app-table-action-btn--danger";

function normalizeCategories(payload) {
  return Array.isArray(payload?.data?.pageList) ? payload.data.pageList : [];
}

function normalizeSubjects(payload) {
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

function formatSubjectLabel(subject) {
  return (
    [subject?.subjectCode || subject?.code, subject?.subjectTitle || subject?.title].filter(Boolean).join(" - ") ||
    subject?.subjectTitle ||
    subject?.title ||
    ""
  );
}

export default function QuestionBanks({ isAdmin = false }) {
  const navigate = useNavigate();
  useAuth();
  const userRole = isAdmin ? "admin" : "teacher";
  const { message } = App.useApp();
  const { t } = useTranslation();

  const [banks, setBanks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [modalSubjects, setModalSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [banksResponse, categoriesResponse, subjectsResponse] = await Promise.all([
        getQuestionBanks(),
        getAllCategories(1, 1000),
        getAllSubjects(),
      ]);
      setBanks(Array.isArray(banksResponse) ? banksResponse : []);
      setCategories(normalizeCategories(categoriesResponse));
      setAllSubjects(normalizeSubjects(subjectsResponse));
    } catch (error) {
      console.error(error);
      message.error(t("teacherLists.questionBanks.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, ownerSearchQuery, selectedCategoryId, selectedSubjectId, pageSize]);

  const availableSubjects = useMemo(() => {
    if (!selectedCategoryId) return allSubjects;
    return allSubjects.filter((subject) => subject.categoryId === selectedCategoryId);
  }, [allSubjects, selectedCategoryId]);

  const filteredBanks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const ownerKeyword = ownerSearchQuery.trim().toLowerCase();
    return banks.filter((bank) => {
      const matchesKeyword =
        !keyword ||
        [bank.name, bank.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesOwner =
        !ownerKeyword ||
        [bank.ownerName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(ownerKeyword));
      const matchedSubject = allSubjects.find((subject) => subject.id === bank.subjectId);
      const matchesCategory = !selectedCategoryId || matchedSubject?.categoryId === selectedCategoryId;
      const matchesSubject = !selectedSubjectId || bank.subjectId === selectedSubjectId;
      return matchesKeyword && matchesOwner && matchesCategory && matchesSubject;
    });
  }, [allSubjects, banks, ownerSearchQuery, searchQuery, selectedCategoryId, selectedSubjectId]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBanks.slice(start, start + pageSize);
  }, [filteredBanks, page, pageSize]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.title })),
    [categories]
  );

  const categoryTitleById = useMemo(
    () =>
      categories.reduce((accumulator, category) => {
        accumulator[category.id] = category.title;
        return accumulator;
      }, {}),
    [categories]
  );

  const subjectOptions = useMemo(
    () => availableSubjects.map((subject) => ({ value: subject.id, label: formatSubjectLabel(subject) })),
    [availableSubjects]
  );

  const handleToolbarCategoryChange = (value) => {
    setSelectedCategoryId(value || undefined);
    if (!value) return;

    const selectedSubject = allSubjects.find((subject) => subject.id === selectedSubjectId);
    if (selectedSubject && selectedSubject.categoryId !== value) {
      setSelectedSubjectId(undefined);
    }
  };

  const handleToolbarSubjectChange = (value) => {
    const nextValue = value || undefined;
    setSelectedSubjectId(nextValue);
    if (!nextValue) return;
    const matchedSubject = allSubjects.find((subject) => subject.id === nextValue);
    if (matchedSubject?.categoryId) {
      setSelectedCategoryId(matchedSubject.categoryId);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setOwnerSearchQuery("");
    setSelectedCategoryId(undefined);
    setSelectedSubjectId(undefined);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setModalSubjects([]);
    form.resetFields();
  };

  const openEditModal = (record) => {
    setEditingBank(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description || "",
      subjectId: record.subjectId,
    });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingBank(null);
    editForm.resetFields();
  };

  const handleCreateCategoryChange = async (value) => {
    form.setFieldsValue({ subjectId: undefined });
    if (!value) {
      setModalSubjects([]);
      return;
    }

    try {
      setSubjectsLoading(true);
      const response = await getSubjectsByCategory(value);
      setModalSubjects(normalizeSubjects(response));
    } catch (error) {
      console.error(error);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      await createQuestionBank({
        name: values.name,
        description: values.description,
        scopeType: "SUBJECT_WIDE",
        subjectId: values.subjectId,
      });
      message.success(t("teacherLists.questionBanks.messages.createSuccess"));
      closeCreateModal();
      loadData();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("teacherLists.questionBanks.messages.createFailed"));
    }
  };

  const handleUpdate = async () => {
    if (!editingBank?.id) return;
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      await updateQuestionBank(editingBank.id, values);
      message.success(t("teacherLists.questionBanks.messages.updateSuccess"));
      closeEditModal();
      loadData();
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error(error?.response?.data?.message || t("teacherLists.questionBanks.messages.updateFailed"));
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteQuestionBank(id);
      message.success(t("teacherLists.questionBanks.messages.deleteSuccess"));
      setBanks((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("teacherLists.questionBanks.messages.deleteFailed"));
    }
  };

  const columns = useMemo(
    () => [
      {
        title: t("teacherLists.questionBanks.columns.bank"),
        key: "name",
        render: (_, record) => (
          <div className="min-w-0">
            <Link
              to={`/${userRole}/question-banks/${record.id}`}
              className="block truncate text-sm font-semibold text-primary hover:text-blue-700 dark:hover:text-blue-300"
            >
              {record.name}
            </Link>
            <p className="m-0 mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {record.description || t("teacherLists.shared.noDescription")}
            </p>
          </div>
        ),
      },
      {
        title: t("teacherLists.questionBanks.columns.subject"),
        key: "subject",
        render: (_, record) => {
          const matchedSubject = allSubjects.find((subject) => subject.id === record.subjectId);
          return (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {formatSubjectLabel(record) || t("teacherLists.shared.noSubject")}
              </div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {matchedSubject?.categoryTitle || categoryTitleById[matchedSubject?.categoryId] || t("teacherLists.shared.noCategory")}
              </div>
            </div>
          );
        },
      },
      {
        title: t("teacherLists.questionBanks.columns.owner"),
        dataIndex: "ownerName",
        key: "ownerName",
        render: (value) => <span className="text-sm text-slate-700 dark:text-slate-300">{value || "—"}</span>,
      },
      {
        title: t("teacherLists.questionBanks.columns.role"),
        dataIndex: "myRole",
        key: "myRole",
        width: 140,
        align: "center",
        render: (value) =>
          value ? (
            <Tag color={value === "OWNER" ? "gold" : value === "EDITOR" ? "blue" : "default"}>{value}</Tag>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        title: t("teacherLists.questionBanks.columns.action"),
        key: "action",
        width: 140,
        align: "center",
        render: (_, record) => {
          const canManage = isAdmin || record.myRole === "OWNER";
          return (
            <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                className="p-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
                title={t("teacherLists.shared.view")}
                onClick={() => navigate(`/${userRole}/question-banks/${record.id}`)}
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              {canManage && (
                <button
                  className="p-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
                  title={t("teacherLists.shared.edit")}
                  onClick={() => openEditModal(record)}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              {canManage && (
                <Popconfirm
                  title={t("teacherLists.questionBanks.confirm.deleteTitle")}
                  description={t("teacherLists.questionBanks.confirm.deleteDescription")}
                  okText={t("teacherLists.shared.delete")}
                  cancelText={t("teacherLists.shared.cancel")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record.id)}
                >
                  <button
                    className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title={t("teacherLists.shared.delete")}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </Popconfirm>
              )}
            </div>
          );
        },
      },
    ],
    [allSubjects, isAdmin, t, userRole]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <AppBreadcrumb className="mb-4" />

            <div className="app-table-shell">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                      {t("teacherLists.questionBanks.title")}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("teacherLists.questionBanks.subtitle")}
                    </p>
                  </div>
                  <Button type="primary" onClick={() => setIsCreateOpen(true)}>
                    {t("teacherLists.questionBanks.actions.create")}
                  </Button>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_220px_220px_110px]">
                  <Input.Search
                    allowClear
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("teacherLists.questionBanks.filters.searchPlaceholder")}
                  />
                  <Input
                    allowClear
                    value={ownerSearchQuery}
                    onChange={(event) => setOwnerSearchQuery(event.target.value)}
                    placeholder={t("teacherLists.questionBanks.filters.ownerSearchPlaceholder")}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedCategoryId}
                    onChange={handleToolbarCategoryChange}
                    placeholder={t("teacherLists.questionBanks.filters.categoryPlaceholder")}
                    options={categoryOptions}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedSubjectId}
                    onChange={handleToolbarSubjectChange}
                    placeholder={t("teacherLists.questionBanks.filters.subjectPlaceholder")}
                    options={subjectOptions}
                  />
                  <Button onClick={resetFilters}>{t("teacherLists.shared.reset")}</Button>
                </div>
              </div>

              <div className="px-5 py-4 sm:px-6">
                <div className="hidden md:block">
                  <Table
                    columns={columns}
                    dataSource={pageItems}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    tableLayout="fixed"
                    locale={{ emptyText: <Empty description={t("teacherLists.questionBanks.empty")} /> }}
                    className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:text-slate-600 dark:[&_.ant-table-thead_th]:bg-slate-800 dark:[&_.ant-table-thead_th]:text-slate-200"
                    scroll={{ x: 920 }}
                  />
                </div>

                <div className="space-y-3 md:hidden">
                  {!loading && pageItems.length === 0 && <Empty description={t("teacherLists.questionBanks.empty")} />}
                  {pageItems.map((bank) => {
                    const matchedSubject = allSubjects.find((subject) => subject.id === bank.subjectId);
                    const canManage = isAdmin || bank.myRole === "OWNER";
                    return (
                      <article
                        key={bank.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40"
                      >
                        <Link
                          to={`/${userRole}/question-banks/${bank.id}`}
                          className="block text-sm font-semibold text-primary dark:text-blue-300"
                        >
                          {bank.name}
                        </Link>
                        <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {bank.description || t("teacherLists.shared.noDescription")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Tag color="blue">{formatSubjectLabel(bank) || t("teacherLists.shared.noSubject")}</Tag>
                          <Tag>{matchedSubject?.categoryTitle || categoryTitleById[matchedSubject?.categoryId] || t("teacherLists.shared.noCategory")}</Tag>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button className={ACTION_BUTTON_CLASS} onClick={() => navigate(`/${userRole}/question-banks/${bank.id}`)}>
                            {t("teacherLists.shared.view")}
                          </Button>
                          {canManage && (
                            <Button className={ACTION_BUTTON_CLASS} onClick={() => openEditModal(bank)}>
                              {t("teacherLists.shared.edit")}
                            </Button>
                          )}
                          {canManage && (
                            <Popconfirm
                              title={t("teacherLists.questionBanks.confirm.deleteTitle")}
                              description={t("teacherLists.questionBanks.confirm.deleteDescription")}
                              okText={t("teacherLists.shared.delete")}
                              cancelText={t("teacherLists.shared.cancel")}
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDelete(bank.id)}
                            >
                              <Button className={DANGER_BUTTON_CLASS}>{t("teacherLists.shared.delete")}</Button>
                            </Popconfirm>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {!loading && filteredBanks.length > 0 && (
                <DataPaginationFooter
                  currentPage={page}
                  pageSize={pageSize}
                  total={filteredBanks.length}
                  totalLabel={t("teacherLists.shared.pagination.total", { count: filteredBanks.length })}
                  pageSizeLabel={t("teacherLists.shared.pagination.pageSize")}
                  rangeLabel={t("teacherLists.shared.pagination.range", {
                    start: (page - 1) * pageSize + 1,
                    end: Math.min(page * pageSize, filteredBanks.length),
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
      </div>

      <Modal
        title={t("teacherLists.questionBanks.modals.createTitle")}
        open={isCreateOpen}
        onCancel={closeCreateModal}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} className="mt-4">
          <Form.Item
            label={t("teacherLists.questionBanks.fields.name")}
            name="name"
            rules={[{ required: true, message: t("teacherLists.questionBanks.validation.nameRequired") }]}
          >
            <Input placeholder={t("teacherLists.questionBanks.placeholders.name")} />
          </Form.Item>
          <Form.Item
            label={t("teacherLists.questionBanks.fields.category")}
            name="categoryId"
            rules={[{ required: true, message: t("teacherLists.questionBanks.validation.categoryRequired") }]}
          >
            <Select
              options={categoryOptions}
              placeholder={t("teacherLists.questionBanks.placeholders.category")}
              onChange={handleCreateCategoryChange}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            label={t("teacherLists.questionBanks.fields.subject")}
            name="subjectId"
            rules={[{ required: true, message: t("teacherLists.questionBanks.validation.subjectRequired") }]}
          >
            <Select
              options={modalSubjects.map((subject) => ({ value: subject.id, label: formatSubjectLabel(subject) }))}
              placeholder={
                form.getFieldValue("categoryId")
                  ? t("teacherLists.questionBanks.placeholders.subject")
                  : t("teacherLists.questionBanks.placeholders.subjectDisabled")
              }
              loading={subjectsLoading}
              disabled={!form.getFieldValue("categoryId")}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label={t("teacherLists.questionBanks.fields.description")} name="description">
            <TextArea rows={4} placeholder={t("teacherLists.questionBanks.placeholders.description")} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeCreateModal}>{t("teacherLists.shared.cancel")}</Button>
            <Button type="primary" htmlType="submit">
              {t("teacherLists.shared.create")}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title={t("teacherLists.questionBanks.modals.editTitle")}
        open={isEditOpen}
        onCancel={closeEditModal}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate} className="mt-4">
          <Form.Item
            label={t("teacherLists.questionBanks.fields.name")}
            name="name"
            rules={[{ required: true, message: t("teacherLists.questionBanks.validation.nameRequired") }]}
          >
            <Input placeholder={t("teacherLists.questionBanks.placeholders.name")} />
          </Form.Item>
          <Form.Item
            label={t("teacherLists.questionBanks.fields.subject")}
            name="subjectId"
            rules={[{ required: true, message: t("teacherLists.questionBanks.validation.subjectRequired") }]}
          >
            <Select
              options={allSubjects.map((subject) => ({ value: subject.id, label: formatSubjectLabel(subject) }))}
              placeholder={t("teacherLists.questionBanks.placeholders.subject")}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label={t("teacherLists.questionBanks.fields.description")} name="description">
            <TextArea rows={4} placeholder={t("teacherLists.questionBanks.placeholders.description")} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeEditModal}>{t("teacherLists.shared.cancel")}</Button>
            <Button type="primary" htmlType="submit" loading={editLoading}>
              {t("teacherLists.shared.save")}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
