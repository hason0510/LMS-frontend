import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, DatePicker, Empty, Form, Input, Modal, Popconfirm, Select, Spin, Table } from "antd";
import { useTranslation } from "react-i18next";
import { EyeIcon, PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { getTemplates, deleteTemplate } from "../../api/curriculumTemplate";
import { createClassSectionFromTemplateId } from "../../api/classSection";
import { getAllCategories } from "../../api/category";
import { getAllSubjects } from "../../api/subject";
import { getAllUsers } from "../../api/user";

const DEFAULT_PAGE_SIZE = 9;
const ACTION_BUTTON_CLASS = "app-table-action-btn";
const DANGER_BUTTON_CLASS = "app-table-action-btn app-table-action-btn--danger";

function normalizeSubjects(payload) {
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

function normalizeCategories(payload) {
  return Array.isArray(payload?.data?.pageList) ? payload.data.pageList : [];
}

function getTemplateName(template) {
  return template?.name || template?.title || "";
}

function getTemplateDescription(template) {
  return template?.description || "";
}

function generateRandomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function TeacherCurriculums({ isAdmin = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const basePath = isAdmin ? "/admin" : "/teacher";
  const currentUserId = user?.id || user?.sub;

  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [instantiateModalVisible, setInstantiateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [instantiateLoading, setInstantiateLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [instantiateForm] = Form.useForm();

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [categoryResponse, subjectResponse] = await Promise.all([getAllCategories(1, 1000), getAllSubjects()]);
        setCategories(normalizeCategories(categoryResponse));
        setSubjects(normalizeSubjects(subjectResponse));
      } catch (error) {
        console.error(error);
        message.error(t("teacherLists.curriculums.messages.loadReferencesFailed"));
      }
    };

    loadReferences();
  }, [message, t]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const response = await getTemplates({
          keyword: debouncedKeyword || undefined,
          categoryId: selectedCategoryId || undefined,
          subjectId: selectedSubjectId || undefined,
          includeChapters: true,
        });
        setTemplates(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error(error);
        message.error(t("teacherLists.curriculums.messages.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [debouncedKeyword, selectedCategoryId, selectedSubjectId, message, t]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, selectedCategoryId, selectedSubjectId, pageSize]);

  const availableSubjects = useMemo(() => {
    if (!selectedCategoryId) return subjects;
    return subjects.filter((subject) => subject.categoryId === selectedCategoryId);
  }, [selectedCategoryId, subjects]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.title })),
    [categories]
  );

  const subjectOptions = useMemo(
    () =>
      availableSubjects.map((subject) => ({
        value: subject.id,
        label: subject.title,
        categoryId: subject.categoryId,
      })),
    [availableSubjects]
  );

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return templates.slice(start, start + pageSize);
  }, [page, pageSize, templates]);

  const columns = useMemo(
    () => [
      {
        title: t("teacherLists.curriculums.columns.name"),
        key: "name",
        render: (_, record) => (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white">
              {getTemplateName(record)}
            </div>
            <div className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
              {getTemplateDescription(record) || t("teacherLists.shared.noDescription")}
            </div>
          </div>
        ),
      },
      {
        title: t("teacherLists.curriculums.columns.subject"),
        key: "subject",
        render: (_, record) => (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="truncate text-sm leading-tight text-slate-800 dark:text-slate-200">
              {record.subjectTitle || t("teacherLists.shared.noSubject")}
            </div>
            <div className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
              {record.categoryTitle || t("teacherLists.shared.noCategory")}
            </div>
          </div>
        ),
      },
      {
        title: t("teacherLists.curriculums.columns.action"),
        key: "action",
        width: 140,
        align: "center",
        render: (_, record) => (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              className="p-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
              title={t("teacherLists.curriculums.actions.view")}
              onClick={() => navigate(`${basePath}/curriculums/${record.id}`)}
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              className="p-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
              title={t("teacherLists.curriculums.actions.instantiate")}
              onClick={() => openInstantiateModal(record)}
            >
              <PlusCircleIcon className="h-4 w-4" />
            </button>
            <Popconfirm
              title={t("teacherLists.curriculums.confirm.deleteTitle")}
              description={t("teacherLists.curriculums.confirm.deleteDescription")}
              okText={t("teacherLists.shared.delete")}
              cancelText={t("teacherLists.shared.cancel")}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteTemplate(record.id)}
            >
              <button
                className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title={t("teacherLists.shared.delete")}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [basePath, navigate, t]
  );

  const handleCategoryChange = (value) => {
    setSelectedCategoryId(value || undefined);
    if (!value) return;

    const currentSubject = subjects.find((subject) => subject.id === selectedSubjectId);
    if (currentSubject && currentSubject.categoryId !== value) {
      setSelectedSubjectId(undefined);
    }
  };

  const handleSubjectChange = (value) => {
    const nextValue = value || undefined;
    setSelectedSubjectId(nextValue);

    if (!nextValue) return;
    const matchedSubject = subjects.find((subject) => subject.id === nextValue);
    if (matchedSubject?.categoryId) {
      setSelectedCategoryId(matchedSubject.categoryId);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDebouncedKeyword("");
    setSelectedCategoryId(undefined);
    setSelectedSubjectId(undefined);
  };

  const openInstantiateModal = async (template) => {
    setSelectedTemplate(template);
    setGeneratedCode(generateRandomCode());
    instantiateForm.setFieldsValue({
      title: `${getTemplateName(template)} - ${t("teacherLists.curriculums.instantiate.defaultClassSuffix")}`,
      description: getTemplateDescription(template),
      teacherId: isAdmin ? currentUserId : undefined,
    });
    setInstantiateModalVisible(true);

    if (!isAdmin) return;

    try {
      setTeacherLoading(true);
      const response = await getAllUsers(0, 500);
      const users = response?.data?.pageList || [];
      const teachers = users.filter((item) => {
        const role = item?.roleName || item?.role?.roleName || item?.role;
        return role === "TEACHER";
      });
      const selfOption = currentUserId
        ? [
            {
              value: currentUserId,
              label: `${user?.fullName || user?.userName || "Admin"} (${t("teacherLists.shared.currentUser")})`,
            },
          ]
        : [];
      setTeacherOptions([
        ...selfOption,
        ...teachers
          .filter((item) => item.id !== currentUserId)
          .map((item) => ({
            value: item.id,
            label: `${item.fullName || item.userName || item.username}${item.gmail ? ` - ${item.gmail}` : ""}`,
          })),
      ]);
    } catch (error) {
      console.error(error);
      message.error(t("teacherLists.curriculums.messages.loadTeachersFailed"));
      setTeacherOptions([]);
    } finally {
      setTeacherLoading(false);
    }
  };

  const closeInstantiateModal = () => {
    setInstantiateModalVisible(false);
    setSelectedTemplate(null);
    setGeneratedCode(null);
    instantiateForm.resetFields();
  };

  const handleInstantiate = async (values) => {
    if (!selectedTemplate?.id) return;

    try {
      setInstantiateLoading(true);
      await createClassSectionFromTemplateId(selectedTemplate.id, {
        title: values.title,
        description: values.description,
        classCode: generatedCode || undefined,
        startDate: values.dates?.[0]?.format("YYYY-MM-DD"),
        endDate: values.dates?.[1]?.format("YYYY-MM-DD"),
        teacherId: isAdmin ? values.teacherId || currentUserId : currentUserId,
      });
      message.success(t("teacherLists.curriculums.messages.instantiateSuccess"));
      closeInstantiateModal();
      navigate(`${basePath}/class-sections`);
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("teacherLists.curriculums.messages.instantiateFailed"));
    } finally {
      setInstantiateLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await deleteTemplate(templateId);
      message.success(t("teacherLists.curriculums.messages.deleteSuccess"));
      setTemplates((prev) => prev.filter((item) => item.id !== templateId));
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("teacherLists.curriculums.messages.deleteFailed"));
    }
  };

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
                      {t("teacherLists.curriculums.title")}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("teacherLists.curriculums.subtitle")}
                    </p>
                  </div>
                  <Button type="primary" onClick={() => navigate(`${basePath}/curriculums/create`)}>
                    {t("teacherLists.curriculums.actions.create")}
                  </Button>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.3fr)_220px_220px_110px]">
                  <Input.Search
                    allowClear
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("teacherLists.curriculums.filters.searchPlaceholder")}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedCategoryId}
                    onChange={handleCategoryChange}
                    placeholder={t("teacherLists.curriculums.filters.categoryPlaceholder")}
                    options={categoryOptions}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedSubjectId}
                    onChange={handleSubjectChange}
                    placeholder={t("teacherLists.curriculums.filters.subjectPlaceholder")}
                    options={subjectOptions}
                  />
                  <Button onClick={resetFilters}>{t("teacherLists.shared.reset")}</Button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Spin size="large" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-16">
                    <Empty description={t("teacherLists.curriculums.empty")} />
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    dataSource={pageItems}
                    rowKey="id"
                    pagination={false}
                    tableLayout="fixed"
                    locale={{ emptyText: <Empty description={t("teacherLists.curriculums.empty")} /> }}
                    className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:text-slate-600 dark:[&_.ant-table-thead_th]:bg-slate-800 dark:[&_.ant-table-thead_th]:text-slate-200"
                    scroll={{ x: 960 }}
                  />
                )}
              </div>

              {!loading && templates.length > 0 && (
                <DataPaginationFooter
                  currentPage={page}
                  pageSize={pageSize}
                  total={templates.length}
                  totalLabel={t("teacherLists.shared.pagination.total", { count: templates.length })}
                  pageSizeLabel={t("teacherLists.shared.pagination.pageSize")}
                  rangeLabel={t("teacherLists.shared.pagination.range", {
                    start: (page - 1) * pageSize + 1,
                    end: Math.min(page * pageSize, templates.length),
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
        title={t("teacherLists.curriculums.instantiate.title", {
          name: selectedTemplate ? getTemplateName(selectedTemplate) : "",
        })}
        open={instantiateModalVisible}
        onCancel={closeInstantiateModal}
        onOk={() => instantiateForm.submit()}
        confirmLoading={instantiateLoading}
        okText={t("teacherLists.curriculums.actions.instantiate")}
        cancelText={t("teacherLists.shared.cancel")}
        destroyOnHidden
      >
        <Form form={instantiateForm} layout="vertical" onFinish={handleInstantiate} className="mt-4">
          {isAdmin && (
            <Form.Item
              label={t("teacherLists.curriculums.instantiate.teacherLabel")}
              name="teacherId"
              rules={[{ required: true, message: t("teacherLists.curriculums.instantiate.teacherRequired") }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t("teacherLists.curriculums.instantiate.teacherPlaceholder")}
                loading={teacherLoading}
                options={teacherOptions}
              />
            </Form.Item>
          )}

          <Form.Item
            label={t("teacherLists.curriculums.instantiate.classTitle")}
            name="title"
            rules={[{ required: true, message: t("teacherLists.curriculums.instantiate.classTitleRequired") }]}
          >
            <Input placeholder={t("teacherLists.curriculums.instantiate.classTitlePlaceholder")} />
          </Form.Item>

          <Form.Item label={t("teacherLists.curriculums.instantiate.classCode")}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-lg tracking-[0.2em] text-primary">{generatedCode || "------"}</strong>
                <div className="flex gap-2">
                  <Button size="small" onClick={() => setGeneratedCode(generateRandomCode())}>
                    {t("teacherLists.shared.refresh")}
                  </Button>
                  <Button size="small" onClick={() => setGeneratedCode(null)}>
                    {t("teacherLists.shared.clear")}
                  </Button>
                </div>
              </div>
            </div>
          </Form.Item>

          <Form.Item label={t("teacherLists.curriculums.instantiate.description")} name="description">
            <Input.TextArea rows={3} placeholder={t("teacherLists.curriculums.instantiate.descriptionPlaceholder")} />
          </Form.Item>

          <Form.Item label={t("teacherLists.curriculums.instantiate.dateRange")} name="dates">
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
