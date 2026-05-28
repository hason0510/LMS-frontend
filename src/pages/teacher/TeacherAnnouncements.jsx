import React, { useEffect, useMemo, useState } from "react";
import { App, Button, DatePicker, Dropdown, Empty, Form, Input, Modal, Select, Table } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "../../api/announcement";
import { getAdminCourses, getTeacherCourses } from "../../api/classSection";
import { getAllSubjects } from "../../api/subject";
import {
  ArrowPathIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  MegaphoneIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_FILTERS = {
  classSectionId: undefined,
  subjectId: undefined,
  sort: "DESC",
  dateRange: null,
};

function unwrapList(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  return data?.pageList || [];
}

function formatDateTime(value, locale) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return dayjs(value).format("YYYY-MM-DD HH:mm");
  }
}

function getAnnouncementScope(record, t) {
  const subjectLabel = [record.subjectCode, record.subjectTitle].filter(Boolean).join(" - ");
  return (
    <div className="min-w-0 space-y-1">
      <div className="truncate font-semibold text-slate-900 dark:text-white">
        {record.classSectionTitle || t("announcementsPage.scope.unknownClass")}
      </div>
      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
        {subjectLabel || t("announcementsPage.scope.unknownSubject")}
      </div>
    </div>
  );
}

export default function TeacherAnnouncements({ isAdmin = false }) {
  const { message } = App.useApp();
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const locale = useMemo(() => (i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US"), [i18n.language]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedKeyword, filters.classSectionId, filters.subjectId, filters.sort, filters.dateRange, pageSize]);

  useEffect(() => {
    loadCourses();
    loadSubjects();
  }, [isAdmin]);

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, pageSize, filters.classSectionId, filters.subjectId, filters.sort, filters.dateRange, debouncedKeyword]);

  const loadCourses = async () => {
    try {
      const response = isAdmin ? await getAdminCourses(1, 100) : await getTeacherCourses(1, 100);
      setCourses(unwrapList(response));
    } catch (error) {
      console.error(error);
      message.error(t("announcementsPage.errors.loadClasses"));
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await getAllSubjects();
      setSubjects(response?.data || []);
    } catch (error) {
      console.error(error);
      message.error(t("announcementsPage.errors.loadSubjects"));
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await getAnnouncements({
        classSectionId: filters.classSectionId,
        subjectId: filters.subjectId,
        contentKeyword: debouncedKeyword || undefined,
        sort: filters.sort,
        dateFrom: filters.dateRange?.[0] ? filters.dateRange[0].format("YYYY-MM-DD") : undefined,
        dateTo: filters.dateRange?.[1] ? filters.dateRange[1].format("YYYY-MM-DD") : undefined,
        pageNumber: page,
        pageSize,
      });
      const data = response?.data;
      const pageList = Array.isArray(data?.pageList) ? data.pageList : Array.isArray(data) ? data : [];
      const totalElements = data?.totalElements ?? pageList.length ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
      if (page > totalPages && totalElements > 0) {
        setPage(totalPages);
        return;
      }
      setAnnouncements(pageList);
      setTotalAnnouncements(totalElements);
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("announcementsPage.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    if (courses.length > 0) {
      form.setFieldsValue({ classSectionId: courses[0].id });
    }
    setModalOpen(true);
  };

  const openEditModal = (announcement) => {
    setEditing(announcement);
    form.setFieldsValue({
      classSectionId: announcement.classSectionId,
      title: announcement.title,
      summary: announcement.summary,
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        classSectionId: values.classSectionId,
        title: values.title?.trim(),
        summary: values.summary,
      };
      if (editing) {
        await updateAnnouncement(editing.id, payload);
        message.success(t("announcementsPage.messages.updated"));
      } else {
        await createAnnouncement(payload);
        message.success(t("announcementsPage.messages.created"));
      }
      setModalOpen(false);
      await loadAnnouncements();
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error(error?.response?.data?.message || t("announcementsPage.errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (announcement) => {
    try {
      await deleteAnnouncement(announcement.id);
      message.success(t("announcementsPage.messages.deleted"));
      setDetailOpen(false);
      await loadAnnouncements();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("announcementsPage.errors.deleteFailed"));
    }
  };

  const columns = useMemo(
    () => [
      {
        title: t("announcementsPage.columns.publishedAt"),
        dataIndex: "createdAt",
        width: 180,
        render: (value) => (
          <div className="space-y-1">
            <div className="font-semibold text-slate-900 dark:text-white">
              {formatDateTime(value, locale)}
            </div>
          </div>
        ),
      },
      {
        title: t("announcementsPage.columns.announcement"),
        dataIndex: "title",
        render: (_, record) => (
          <div className="min-w-0 space-y-1">
            <div className="truncate font-semibold text-slate-900 dark:text-white">
              {record.title}
            </div>
            <div className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {record.summary || t("announcementsPage.emptySummary")}
            </div>
          </div>
        ),
      },
      {
        title: t("announcementsPage.columns.scope"),
        dataIndex: "classSectionTitle",
        width: 280,
        render: (_, record) => getAnnouncementScope(record, t),
      },
      {
        title: t("announcementsPage.columns.actions"),
        width: 180,
        align: "right",
        render: (_, record) => (
          <div className="flex justify-end gap-2">
            <Button
              icon={<EyeIcon className="h-4 w-4" />}
              onClick={() => {
                setSelected(record);
                setDetailOpen(true);
              }}
            >
              {t("announcementsPage.actions.details")}
            </Button>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "edit", label: t("announcementsPage.actions.edit"), icon: <PencilSquareIcon className="h-4 w-4" /> },
                  { key: "delete", label: t("announcementsPage.actions.delete"), danger: true, icon: <TrashIcon className="h-4 w-4" /> },
                ],
                onClick: ({ key }) => {
                  if (key === "edit") openEditModal(record);
                  if (key === "delete") handleDelete(record);
                },
              }}
            >
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label={t("announcementsPage.actions.more")}
              >
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>
            </Dropdown>
          </div>
        ),
      },
    ],
    [locale, t]
  );

  return (
    <div className="teacher-list-page min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-16 lg:pl-64">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <AppBreadcrumb className="mb-4" />

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                      {t("announcementsPage.title")}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("announcementsPage.subtitle")}
                    </p>
                  </div>
                  <Button type="primary" icon={<PlusIcon className="h-4 w-4" />} onClick={openCreateModal}>
                    {t("announcementsPage.actions.create")}
                  </Button>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_280px_minmax(0,1fr)_auto]">
                  <Select
                    className="w-full"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("announcementsPage.filters.class")}
                    value={filters.classSectionId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, classSectionId: value }))}
                    options={courses.map((course) => ({
                      value: course.id,
                      label: [course.title, course.classCode].filter(Boolean).join(" - "),
                    }))}
                  />
                  <Select
                    className="w-full"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("announcementsPage.filters.subject")}
                    value={filters.subjectId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, subjectId: value }))}
                    options={subjects.map((subject) => ({
                      value: subject.id,
                      label: [subject.code, subject.title].filter(Boolean).join(" - "),
                    }))}
                  />
                  <Select
                    className="w-full"
                    value={filters.sort}
                    onChange={(value) => setFilters((prev) => ({ ...prev, sort: value }))}
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("announcementsPage.filters.sort")}
                    options={[
                      { value: "DESC", label: t("announcementsPage.filters.latestFirst") },
                      { value: "ASC", label: t("announcementsPage.filters.oldestFirst") },
                    ]}
                  />
                  <DatePicker.RangePicker
                    className="w-full"
                    allowClear
                    value={filters.dateRange}
                    onChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
                    placeholder={[
                      t("announcementsPage.filters.dateFrom"),
                      t("announcementsPage.filters.dateTo"),
                    ]}
                  />
                  <Input
                    allowClear
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    prefix={<MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />}
                    placeholder={t("announcementsPage.searchPlaceholder")}
                    className="w-full"
                  />
                  <Button
                    icon={<ArrowPathIcon className="h-4 w-4" />}
                    onClick={() => {
                      setFilters(DEFAULT_FILTERS);
                      setSearchKeyword("");
                      setDebouncedKeyword("");
                      setPage(1);
                    }}
                  >
                    {t("announcementsPage.filters.reset")}
                  </Button>
                </div>
              </div>

              <div className="px-5 py-4 sm:px-6">
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={announcements}
                  columns={columns}
                  pagination={false}
                  tableLayout="fixed"
                  scroll={{ x: 1180 }}
                  sticky
                  className="teacher-announcements-table [&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:text-slate-600 dark:[&_.ant-table-thead_th]:bg-slate-800 dark:[&_.ant-table-thead_th]:text-slate-200"
                  locale={{
                    emptyText: <Empty description={t("announcementsPage.empty")} />,
                  }}
                />
              </div>

              <DataPaginationFooter
                currentPage={page}
                pageSize={pageSize}
                total={totalAnnouncements}
                totalLabel={t("announcementsPage.pagination.total", { count: totalAnnouncements })}
                pageSizeLabel={t("announcementsPage.pagination.pageSize")}
                rangeLabel={t("announcementsPage.pagination.range", {
                  start: totalAnnouncements === 0 ? 0 : (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, totalAnnouncements),
                })}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? t("announcementsPage.modal.update") : t("announcementsPage.modal.publish")}
        cancelText={t("announcementsPage.modal.cancel")}
        confirmLoading={submitting}
        title={editing ? t("announcementsPage.modal.editTitle") : t("announcementsPage.modal.createTitle")}
        width={760}
      >
        <div className="mt-4 border-y border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
          <Form form={form} layout="vertical">
            <Form.Item
              name="classSectionId"
              label={t("announcementsPage.modal.class")}
              rules={[{ required: true, message: t("announcementsPage.validation.classRequired") }]}
            >
              <Select
                placeholder={t("announcementsPage.modal.classPlaceholder")}
                showSearch
                optionFilterProp="label"
                options={courses.map((course) => ({
                  value: course.id,
                  label: [course.title, course.classCode].filter(Boolean).join(" - "),
                }))}
              />
            </Form.Item>
            <Form.Item
              name="title"
              label={t("announcementsPage.modal.title")}
              rules={[{ required: true, message: t("announcementsPage.validation.titleRequired") }]}
            >
              <Input placeholder={t("announcementsPage.modal.titlePlaceholder")} />
            </Form.Item>
            <Form.Item name="summary" label={t("announcementsPage.modal.summary")}>
              <Input.TextArea rows={8} placeholder={t("announcementsPage.modal.summaryPlaceholder")} />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          selected
            ? [
                <Button key="cancel" onClick={() => setDetailOpen(false)}>
                  {t("announcementsPage.modal.cancel")}
                </Button>,
                <Button
                  key="delete"
                  danger
                  icon={<TrashIcon className="h-4 w-4" />}
                  onClick={() => handleDelete(selected)}
                  className="border-red-200 text-red-600 hover:!border-red-300 hover:!bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:!bg-red-950/40 dark:hover:!border-red-600"
                >
                  {t("announcementsPage.actions.delete")}
                </Button>,
                <Button key="edit" type="primary" icon={<PencilSquareIcon className="h-4 w-4" />} onClick={() => openEditModal(selected)}>
                  {t("announcementsPage.actions.edit")}
                </Button>,
              ]
            : null
        }
        width={760}
        title={null}
      >
        {selected && (
          <div className="space-y-6 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MegaphoneIcon className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{selected.title}</h2>
              <p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-slate-600 dark:text-slate-300">
                {selected.summary}
              </p>
            </div>
            <div className="grid border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  {t("announcementsPage.modal.class")}
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {selected.classSectionTitle}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  {t("announcementsPage.modal.publishedAt")}
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {formatDateTime(selected.createdAt, locale)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
