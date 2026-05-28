import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Empty, Input, Popconfirm, Select, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { deleteClassSection, getClassSections } from "../../api/classSection";
import { getAllCategories } from "../../api/category";
import { getAllSubjects } from "../../api/subject";
import classPlaceholder from "../../assets/class_placeholder.png";

const DEFAULT_PAGE_SIZE = 9;
const ACTION_BUTTON_CLASS =
  "!rounded-md !border !border-slate-300 !bg-white !px-3 !text-slate-700 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900 dark:!border-slate-600 dark:!bg-slate-800 dark:!text-slate-200 dark:hover:!border-slate-500 dark:hover:!bg-slate-700 dark:hover:!text-white";
const DANGER_BUTTON_CLASS =
  "!rounded-md !border !border-red-300 !bg-white !px-3 !text-red-600 hover:!border-red-400 hover:!bg-red-50 hover:!text-red-700 dark:!border-red-900/60 dark:!bg-slate-800 dark:!text-red-300 dark:hover:!border-red-700 dark:hover:!bg-red-950/40 dark:hover:!text-red-200";

function normalizeCategories(payload) {
  return Array.isArray(payload?.data?.pageList) ? payload.data.pageList : [];
}

function normalizeSubjects(payload) {
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

function formatDateRange(startDate, endDate, fallback) {
  if (!startDate && !endDate) return fallback;
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate || fallback;
}

export default function TeacherClassSections({ isAdmin = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const basePath = isAdmin ? "/admin" : "/teacher";
  const teacherId = user?.id || user?.sub;

  const [classSections, setClassSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState(undefined);
  const [selectedStatus, setSelectedStatus] = useState(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [categoryResponse, subjectResponse] = await Promise.all([getAllCategories(1, 1000), getAllSubjects()]);
        setCategories(normalizeCategories(categoryResponse));
        setSubjects(normalizeSubjects(subjectResponse));
      } catch (error) {
        console.error(error);
      }
    };

    loadReferences();
  }, []);

  useEffect(() => {
    const loadClassSections = async () => {
      try {
        setLoading(true);
        const response = await getClassSections(isAdmin ? {} : { teacherId });
        const items = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        setClassSections(items);
      } catch (error) {
        console.error(error);
        message.error(t("teacherLists.classSections.messages.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    loadClassSections();
  }, [isAdmin, teacherId, message, t]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategoryId, selectedSubjectId, selectedStatus, pageSize]);

  const availableSubjects = useMemo(() => {
    if (!selectedCategoryId) return subjects;
    return subjects.filter((subject) => subject.categoryId === selectedCategoryId);
  }, [selectedCategoryId, subjects]);

  const filteredItems = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return classSections.filter((section) => {
      const matchesKeyword =
        !keyword ||
        [section.title, section.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesCategory = !selectedCategoryId || section.categoryId === selectedCategoryId;
      const matchesSubject = !selectedSubjectId || section.subjectId === selectedSubjectId;
      const matchesStatus = !selectedStatus || section.status === selectedStatus;
      return matchesKeyword && matchesCategory && matchesSubject && matchesStatus;
    });
  }, [classSections, searchQuery, selectedCategoryId, selectedStatus, selectedSubjectId]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.title })),
    [categories]
  );

  const subjectOptions = useMemo(
    () =>
      availableSubjects.map((subject) => ({
        value: subject.id,
        label: subject.title,
      })),
    [availableSubjects]
  );

  const statusOptions = [
    { value: "PUBLIC", label: t("teacherLists.classSections.status.public") },
    { value: "PRIVATE", label: t("teacherLists.classSections.status.private") },
    { value: "ARCHIVED", label: t("teacherLists.classSections.status.archived") },
  ];

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
    setSelectedCategoryId(undefined);
    setSelectedSubjectId(undefined);
    setSelectedStatus(undefined);
  };

  const handleDelete = async (id) => {
    try {
      await deleteClassSection(id);
      setClassSections((prev) => prev.filter((item) => item.id !== id));
      message.success(t("teacherLists.classSections.messages.deleteSuccess"));
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("teacherLists.classSections.messages.deleteFailed"));
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

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                      {t("teacherLists.classSections.title")}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("teacherLists.classSections.subtitle")}
                    </p>
                  </div>
                  <Button type="primary" onClick={() => navigate(`${basePath}/curriculums`)}>
                    {t("teacherLists.classSections.actions.create")}
                  </Button>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_180px_110px]">
                  <Input.Search
                    allowClear
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("teacherLists.classSections.filters.searchPlaceholder")}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedCategoryId}
                    onChange={handleCategoryChange}
                    placeholder={t("teacherLists.classSections.filters.categoryPlaceholder")}
                    options={categoryOptions}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedSubjectId}
                    onChange={handleSubjectChange}
                    placeholder={t("teacherLists.classSections.filters.subjectPlaceholder")}
                    options={subjectOptions}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value || undefined)}
                    placeholder={t("teacherLists.classSections.filters.statusPlaceholder")}
                    options={statusOptions}
                  />
                  <Button onClick={resetFilters}>{t("teacherLists.shared.reset")}</Button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Spin size="large" />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-16">
                    <Empty description={t("teacherLists.classSections.empty")} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pageItems.map((section) => (
                      <article
                        key={section.id}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="aspect-[16/8] overflow-hidden border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                          <img
                            src={section.imageUrl || classPlaceholder}
                            alt={section.title || t("teacherLists.shared.untitled")}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="m-0 truncate text-lg font-semibold text-slate-900 dark:text-white">
                                {section.title || t("teacherLists.shared.untitled")}
                              </h2>
                              <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {section.classCode || t("teacherLists.shared.noCode")}
                              </p>
                            </div>
                            <Tag
                              color={section.status === "PUBLIC" ? "green" : section.status === "PRIVATE" ? "gold" : "default"}
                            >
                              {t(`teacherLists.classSections.status.${String(section.status || "archived").toLowerCase()}`)}
                            </Tag>
                          </div>

                          <div className="mt-4 space-y-2 text-sm">
                            <div className="text-slate-600 dark:text-slate-300">
                              <span className="font-medium text-slate-800 dark:text-slate-100">
                                {t("teacherLists.curriculums.labels.category")}:
                              </span>{" "}
                              {section.categoryTitle || t("teacherLists.shared.noCategory")}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              <span className="font-medium text-slate-800 dark:text-slate-100">
                                {t("teacherLists.curriculums.labels.subject")}:
                              </span>{" "}
                              {section.subjectTitle || t("teacherLists.shared.noSubject")}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              <span className="font-medium text-slate-800 dark:text-slate-100">
                                {t("teacherLists.classSections.labels.students")}:
                              </span>{" "}
                              {section.totalEnrollments || 0}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              <span className="font-medium text-slate-800 dark:text-slate-100">
                                {t("teacherLists.classSections.labels.schedule")}:
                              </span>{" "}
                              {formatDateRange(
                                section.startDate,
                                section.endDate,
                                t("teacherLists.classSections.labels.noSchedule")
                              )}
                            </div>
                          </div>

                          {section.description && (
                            <p className="m-0 mt-4 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
                          )}

                          <div className="mt-5 flex flex-wrap gap-2">
                            <Button
                              className={ACTION_BUTTON_CLASS}
                              onClick={() => navigate(`${basePath}/class-sections/${section.id}`)}
                            >
                              {t("teacherLists.classSections.actions.open")}
                            </Button>
                            <Popconfirm
                              title={t("teacherLists.classSections.confirm.deleteTitle")}
                              description={t("teacherLists.classSections.confirm.deleteDescription")}
                              okText={t("teacherLists.shared.delete")}
                              cancelText={t("teacherLists.shared.cancel")}
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDelete(section.id)}
                            >
                              <Button className={DANGER_BUTTON_CLASS}>{t("teacherLists.shared.delete")}</Button>
                            </Popconfirm>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {!loading && filteredItems.length > 0 && (
                <DataPaginationFooter
                  currentPage={page}
                  pageSize={pageSize}
                  total={filteredItems.length}
                  totalLabel={t("teacherLists.shared.pagination.total", { count: filteredItems.length })}
                  pageSizeLabel={t("teacherLists.shared.pagination.pageSize")}
                  rangeLabel={t("teacherLists.shared.pagination.range", {
                    start: (page - 1) * pageSize + 1,
                    end: Math.min(page * pageSize, filteredItems.length),
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
    </div>
  );
}
