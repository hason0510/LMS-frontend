import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App,
  AutoComplete,
  Button,
  DatePicker,
  Empty,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Spin,
} from "antd";
import Header from "../../components/layout/Header";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import CourseCard from "../../components/course/CourseCard";
import CourseFilters from "../../components/course/CourseFilters";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { useAuth } from "../../contexts/AuthContext";
import {
  getClassSectionJoinPreview,
  searchClassSections,
} from "../../api/classSection";
import { enrollClassSection, enrollPrivateCourse } from "../../api/enrollment";
import { getAllCategories } from "../../api/category";
import { getAllSubjects } from "../../api/subject";
import { useTranslation } from "react-i18next";
import classPlaceholder from "../../assets/class_placeholder.png";

const DEFAULT_PAGE_SIZE = 6;

const createInitialQuery = (scope, extras = {}) => ({
  scope,
  keyword: "",
  teacherKeyword: "",
  subjectKeyword: "",
  categoryId: undefined,
  status: scope === "PUBLIC" ? "PUBLIC" : undefined,
  startDateRange: null,
  sortValue: "createdDate:ASC",
  pageNumber: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  ...extras,
});

const STATUS_STYLES = {
  PUBLIC: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60",
  PRIVATE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60",
  ARCHIVED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
};

const ENROLLMENT_STYLES = {
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/60",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60",
};

function buildSearchParams(query) {
  const [sortBy = "createdDate", sortDirection = "ASC"] = (query.sortValue || "createdDate:ASC").split(":");
  return {
    scope: query.scope,
    keyword: query.keyword || undefined,
    teacherKeyword: query.teacherKeyword || undefined,
    subjectKeyword: query.subjectKeyword || undefined,
    categoryId: query.categoryId || undefined,
    status: query.status || undefined,
    startDateFrom: query.startDateRange?.[0]?.format("YYYY-MM-DD"),
    startDateTo: query.startDateRange?.[1]?.format("YYYY-MM-DD"),
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    sortBy,
    sortDirection,
  };
}

function buildKeywordOptions(items = []) {
  const uniqueValues = new Set();
  items.forEach((item) => {
    [item?.title, item?.teacherName, item?.subjectCode].forEach((value) => {
      if (value) uniqueValues.add(value);
    });
  });
  return Array.from(uniqueValues).slice(0, 12).map((value) => ({ value }));
}

function buildTeacherOptions(myItems = [], publicItems = []) {
  const uniqueValues = new Set();
  [...myItems, ...publicItems].forEach((item) => {
    if (item?.teacherName) uniqueValues.add(item.teacherName);
  });
  return Array.from(uniqueValues).map((value) => ({ value }));
}

function buildSubjectOptions(subjects = [], myItems = [], publicItems = []) {
  const uniqueValues = new Set();
  subjects.forEach((subject) => {
    if (subject?.code) uniqueValues.add(subject.code);
  });
  [...myItems, ...publicItems].forEach((item) => {
    if (item?.subjectCode) uniqueValues.add(item.subjectCode);
  });
  return Array.from(uniqueValues).map((value) => ({ value }));
}

function formatDateRange(startDate, endDate, t) {
  if (!startDate && !endDate) {
    return t("classesPage.card.noSchedule");
  }
  if (!startDate) {
    return `${t("classesPage.card.until")} ${endDate}`;
  }
  if (!endDate) {
    return `${t("classesPage.card.from")} ${startDate}`;
  }
  return `${startDate} - ${endDate}`;
}

function StatusBadge({ value, children }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[value] || STATUS_STYLES.ARCHIVED}`}>
      {children || value}
    </span>
  );
}

function EnrollmentBadge({ value, children }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${ENROLLMENT_STYLES[value] || ENROLLMENT_STYLES.PENDING}`}>
      {children || value}
    </span>
  );
}

function ClassesSectionToolbar({
  t,
  query,
  onChange,
  onReset,
  keywordOptions,
  teacherOptions,
  subjectOptions,
  categoryOptions,
  showStatusFilter = false,
  advancedOpen,
  onToggleAdvanced,
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_220px_160px]">
        <AutoComplete
          value={query.keyword}
          options={keywordOptions}
          onChange={(value) => onChange({ keyword: value, pageNumber: 1 })}
          placeholder={t("classesPage.filters.keywordPlaceholder")}
          className="w-full"
          allowClear
        />
        <Select
          value={query.categoryId}
          onChange={(value) => onChange({ categoryId: value, pageNumber: 1 })}
          options={categoryOptions}
          placeholder={t("classesPage.filters.category")}
          className="w-full"
          allowClear
          showSearch
          optionFilterProp="label"
        />
        <Select
          value={query.sortValue}
          onChange={(value) => onChange({ sortValue: value, pageNumber: 1 })}
          options={[
            { value: "createdDate:ASC", label: t("classesPage.sort.createdAsc") },
            { value: "createdDate:DESC", label: t("classesPage.sort.createdDesc") },
            { value: "startDate:ASC", label: t("classesPage.sort.startAsc") },
            { value: "title:ASC", label: t("classesPage.sort.titleAsc") },
          ]}
          className="w-full"
          showSearch
          optionFilterProp="label"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type={advancedOpen ? "primary" : "default"} onClick={onToggleAdvanced}>
          {advancedOpen ? t("classesPage.filters.hideAdvanced") : t("classesPage.filters.showAdvanced")}
        </Button>
        <Button onClick={onReset}>{t("classesPage.filters.reset")}</Button>
      </div>

      {advancedOpen && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/70 lg:grid-cols-4">
          <AutoComplete
            value={query.teacherKeyword}
            options={teacherOptions}
            onChange={(value) => onChange({ teacherKeyword: value, pageNumber: 1 })}
            placeholder={t("classesPage.filters.teacher")}
            allowClear
          />
          <AutoComplete
            value={query.subjectKeyword}
            options={subjectOptions}
            onChange={(value) => onChange({ subjectKeyword: value, pageNumber: 1 })}
            placeholder={t("classesPage.filters.subject")}
            allowClear
          />
          <DatePicker.RangePicker
            value={query.startDateRange}
            onChange={(value) => onChange({ startDateRange: value, pageNumber: 1 })}
            className="w-full"
            format="DD/MM/YYYY"
          />
          {showStatusFilter ? (
            <Select
              value={query.status}
              onChange={(value) => onChange({ status: value, pageNumber: 1 })}
              options={[
                { value: "PUBLIC", label: t("classesPage.status.public") },
                { value: "PRIVATE", label: t("classesPage.status.private") },
                { value: "ARCHIVED", label: t("classesPage.status.archived") },
              ]}
              placeholder={t("classesPage.filters.status")}
              allowClear
              className="w-full"
              showSearch
              optionFilterProp="label"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {t("classesPage.filters.publicScopeHint")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClassesPaginationFooter({ t, currentPage, pageSize, totalElements, onPageChange, onPageSizeChange }) {
  const safeTotal = totalElements || 0;
  const start = safeTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, safeTotal);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="font-semibold text-slate-700 dark:text-slate-200">
        {t("classesPage.pagination.total", { count: safeTotal })}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span>{t("classesPage.pagination.pageSize")}</span>
          <Select
            value={pageSize}
            onChange={onPageSizeChange}
            options={[6, 12, 24].map((value) => ({ value, label: value }))}
            className="w-24"
            showSearch
            optionFilterProp="label"
          />
        </div>
        <div className="font-semibold text-slate-700 dark:text-slate-200">
          {t("classesPage.pagination.range", { start, end })}
        </div>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={safeTotal}
          onChange={onPageChange}
          showSizeChanger={false}
          size="small"
        />
      </div>
    </div>
  );
}

function StudentClassCard({ type, item, t, onPrimaryAction, onSecondaryAction }) {
  const enrollmentStatus = item?.myEnrollmentStatus;
  const isPending = enrollmentStatus === "PENDING";
  const progress = typeof item?.myProgress === "number" ? Math.max(0, Math.min(item.myProgress, 100)) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div
        className="h-40 bg-cover bg-center"
        style={{ backgroundImage: `url(${item?.imageUrl || classPlaceholder})` }}
      />
      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={item?.status}>
            {item?.status ? t(`classesPage.status.${item.status.toLowerCase()}`) : null}
          </StatusBadge>
          {type === "my" && enrollmentStatus && (
            <EnrollmentBadge value={enrollmentStatus}>
              {t(`classesPage.enrollment.${enrollmentStatus.toLowerCase()}`)}
            </EnrollmentBadge>
          )}
        </div>

        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {[item?.subjectCode, item?.categoryTitle].filter(Boolean).join(" • ") || t("classesPage.card.classSection")}
        </div>
        <h3 className="mt-2 line-clamp-2 text-xl font-bold text-slate-900 dark:text-white">{item?.title || item?.classCode}</h3>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item?.teacherName || t("classesPage.card.noTeacher")}</div>

        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div>{t("classesPage.card.classCode", { code: item?.classCode || "-" })}</div>
          <div>{formatDateRange(item?.startDate, item?.endDate, t)}</div>
          <div>{t("classesPage.card.students", { count: item?.totalEnrollments || 0 })}</div>
        </div>

        {type === "my" && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>{t("classesPage.card.progress")}</span>
              <span>{isPending ? t("classesPage.card.pendingApproval") : `${progress ?? 0}%`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${isPending ? 0 : progress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 pt-4">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {type === "my" ? t("classesPage.actions.openClass") : t("classesPage.actions.joinClass")}
          </button>
          <button
            type="button"
            onClick={onSecondaryAction}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("classesPage.actions.viewDetails")}
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinPreviewModal({ open, preview, loading, onConfirm, onClose, t }) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={520}>
      {preview ? (
        <div className="px-2 py-3 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-primary text-3xl font-bold text-white">
            {preview?.imageUrl ? (
              <img src={preview.imageUrl} alt={preview.title} className="h-full w-full object-cover" />
            ) : (
              (preview?.subjectCode || preview?.title || "CL").slice(0, 2).toUpperCase()
            )}
          </div>
          <h3 className="mt-6 text-[2rem] font-bold leading-tight text-slate-900 dark:text-white">{preview.title}</h3>
          <div className="mt-3 text-base text-slate-600 dark:text-slate-300">
            {[preview.teacherName, t("classesPage.modal.students", { count: preview.totalEnrollments || 0 })]
              .filter(Boolean)
              .join(" • ")}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-lg leading-8 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {preview.joinMessage}
          </div>
          <button
            type="button"
            disabled={loading || preview.alreadyJoined}
            onClick={onConfirm}
            className="mt-6 w-full rounded-2xl bg-primary px-5 py-3.5 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {preview.alreadyJoined
              ? preview.enrollmentStatus === "PENDING"
                ? t("classesPage.actions.pendingJoined")
                : t("classesPage.actions.alreadyJoined")
              : preview.joinMode === "REQUEST"
              ? t("classesPage.actions.sendJoinRequest")
              : t("classesPage.actions.joinNow")}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}

function StudentSection({
  t,
  title,
  subtitle,
  query,
  onQueryChange,
  onReset,
  advancedOpen,
  onToggleAdvanced,
  keywordOptions,
  teacherOptions,
  subjectOptions,
  categoryOptions,
  showStatusFilter,
  items,
  loading,
  totalElements,
  emptyMessage,
  renderCard,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {t("classesPage.sectionCount", { count: totalElements || 0 })}
          </div>
        </div>
      </div>

      <ClassesSectionToolbar
        t={t}
        query={query}
        onChange={onQueryChange}
        onReset={onReset}
        keywordOptions={keywordOptions}
        teacherOptions={teacherOptions}
        subjectOptions={subjectOptions}
        categoryOptions={categoryOptions}
        showStatusFilter={showStatusFilter}
        advancedOpen={advancedOpen}
        onToggleAdvanced={onToggleAdvanced}
      />

      <div className="px-5 py-5 sm:px-6">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: query.pageSize }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <Skeleton.Image active className="!h-40 !w-full !rounded-2xl" />
                <Skeleton active paragraph={{ rows: 4 }} className="mt-4" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 dark:border-slate-700 dark:bg-slate-900/70">
            <Empty description={emptyMessage} />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map(renderCard)}
          </div>
        )}
      </div>

      <ClassesPaginationFooter
        t={t}
        currentPage={query.pageNumber}
        pageSize={query.pageSize}
        totalElements={totalElements}
        onPageChange={(page) => onQueryChange({ pageNumber: page })}
        onPageSizeChange={(pageSize) => onQueryChange({ pageSize, pageNumber: 1 })}
      />
    </section>
  );
}

export default function ClassesPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";

  const [teacherCourses, setTeacherCourses] = useState([]);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherError, setTeacherError] = useState(null);
  const [teacherFilters, setTeacherFilters] = useState({ categories: [] });

  const [myQuery, setMyQuery] = useState(createInitialQuery("MY"));
  const [publicQuery, setPublicQuery] = useState(createInitialQuery("PUBLIC", { status: "PUBLIC" }));
  const [myClasses, setMyClasses] = useState({ items: [], totalElements: 0, loading: true });
  const [publicClasses, setPublicClasses] = useState({ items: [], totalElements: 0, loading: true });
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [myAdvancedOpen, setMyAdvancedOpen] = useState(false);
  const [publicAdvancedOpen, setPublicAdvancedOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinPreview, setJoinPreview] = useState(null);
  const [joinPreviewOpen, setJoinPreviewOpen] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (isTeacherOrAdmin) {
      loadTeacherClasses();
      return;
    }
    loadMetadata();
  }, [isTeacherOrAdmin]);

  useEffect(() => {
    if (isTeacherOrAdmin) {
      loadTeacherClasses();
    }
  }, [isTeacherOrAdmin, teacherFilters]);

  useEffect(() => {
    if (!isTeacherOrAdmin) {
      loadMyClasses();
    }
  }, [isTeacherOrAdmin, myQuery]);

  useEffect(() => {
    if (!isTeacherOrAdmin) {
      loadPublicClasses();
    }
  }, [isTeacherOrAdmin, publicQuery]);

  const loadMetadata = async () => {
    try {
      setMetadataLoading(true);
      const [categoriesResponse, subjectsResponse] = await Promise.all([
        getAllCategories(1, 100),
        getAllSubjects(),
      ]);
      setCategories(categoriesResponse?.data?.pageList || []);
      setSubjects(Array.isArray(subjectsResponse?.data) ? subjectsResponse.data : Array.isArray(subjectsResponse) ? subjectsResponse : []);
    } catch {
      setCategories([]);
      setSubjects([]);
    } finally {
      setMetadataLoading(false);
    }
  };

  const loadTeacherClasses = async () => {
    try {
      setTeacherLoading(true);
      setTeacherError(null);
      const response = await searchClassSections({ scope: "ALL", pageNumber: 1, pageSize: 24, sortBy: "createdDate", sortDirection: "ASC" });
      let items = response?.items || [];
      if (teacherFilters.categories?.length) {
        items = items.filter((item) => teacherFilters.categories.includes(item.categoryTitle));
      }
      setTeacherCourses(items);
    } catch (error) {
      setTeacherError(error?.response?.data?.message || error.message);
    } finally {
      setTeacherLoading(false);
    }
  };

  const loadMyClasses = async () => {
    try {
      setMyClasses((current) => ({ ...current, loading: true }));
      const response = await searchClassSections(buildSearchParams(myQuery));
      setMyClasses({
        items: response.items || [],
        totalElements: response.totalElements || 0,
        loading: false,
      });
    } catch (error) {
      setMyClasses({ items: [], totalElements: 0, loading: false });
      message.error(error?.response?.data?.message || t("classesPage.messages.loadMyFailed"));
    }
  };

  const loadPublicClasses = async () => {
    try {
      setPublicClasses((current) => ({ ...current, loading: true }));
      const response = await searchClassSections(buildSearchParams(publicQuery));
      setPublicClasses({
        items: response.items || [],
        totalElements: response.totalElements || 0,
        loading: false,
      });
    } catch (error) {
      setPublicClasses({ items: [], totalElements: 0, loading: false });
      message.error(error?.response?.data?.message || t("classesPage.messages.loadPublicFailed"));
    }
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.title,
  }));

  const keywordOptions = useMemo(
    () => buildKeywordOptions([...myClasses.items, ...publicClasses.items]),
    [myClasses.items, publicClasses.items]
  );
  const teacherOptions = useMemo(
    () => buildTeacherOptions(myClasses.items, publicClasses.items),
    [myClasses.items, publicClasses.items]
  );
  const subjectOptions = useMemo(
    () => buildSubjectOptions(subjects, myClasses.items, publicClasses.items),
    [subjects, myClasses.items, publicClasses.items]
  );

  const resetMyFilters = () => setMyQuery(createInitialQuery("MY"));
  const resetPublicFilters = () => setPublicQuery(createInitialQuery("PUBLIC", { status: "PUBLIC" }));

  const handlePreviewJoin = async (event) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    try {
      setJoinLoading(true);
      const preview = await getClassSectionJoinPreview(joinCode.trim());
      setJoinPreview(preview);
      setJoinPreviewOpen(true);
    } catch (error) {
      message.error(error?.response?.data?.message || t("classesPage.messages.previewFailed"));
    } finally {
      setJoinLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    try {
      setJoinLoading(true);
      await enrollPrivateCourse(joinCode.trim());
      message.success(
        joinPreview?.joinMode === "REQUEST"
          ? t("classesPage.messages.joinRequestSent")
          : t("classesPage.messages.joinedPublic")
      );
      setJoinPreviewOpen(false);
      setJoinPreview(null);
      setJoinCode("");
      loadMyClasses();
      loadPublicClasses();
    } catch (error) {
      message.error(error?.response?.data?.message || t("classesPage.messages.joinFailed"));
    } finally {
      setJoinLoading(false);
    }
  };

  const handleJoinPublicClass = async (classSectionId) => {
    try {
      await enrollClassSection(classSectionId);
      message.success(t("classesPage.messages.joinedPublic"));
      loadMyClasses();
      loadPublicClasses();
    } catch (error) {
      message.error(error?.response?.data?.message || t("classesPage.messages.joinFailed"));
    }
  };

  if (isTeacherOrAdmin) {
    return (
      <div className="classes-page min-h-screen bg-background-light font-display text-[#111418] dark:bg-background-dark dark:text-slate-100">
        <TeacherHeader />
        <div className="flex">
          <TeacherSidebar />
          <main className="flex-1 lg:ml-64">
            <div className="px-4 py-8 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white">{t("classesPage.teacher.title")}</h1>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">{t("classesPage.teacher.subtitle")}</p>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  <aside className="lg:col-span-1">
                    <div className="sticky top-20">
                      <CourseFilters onFilterChange={setTeacherFilters} />
                    </div>
                  </aside>
                  <div className="lg:col-span-3">
                    {teacherLoading ? (
                      <div className="flex min-h-96 items-center justify-center">
                        <Spin size="large" />
                      </div>
                    ) : teacherError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{teacherError}</div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {teacherCourses.map((course) => (
                          <CourseCard
                            key={course.id}
                            id={course.id}
                            type="teacher"
                            title={course.title}
                            author={course.teacherName}
                            image={course.imageUrl || classPlaceholder}
                            status={course.status}
                            code={course.classCode}
                            studentsCount={course.totalEnrollments || 0}
                            schedule={formatDateRange(course.startDate, course.endDate, t)}
                            onEdit={() => navigate(`/class-sections/${course.id}`)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="classes-page min-h-screen bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <Header />
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AppBreadcrumb className="mb-6" />
          <div className="mb-8">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white">{t("classesPage.title")}</h1>
            <p className="mt-2 max-w-3xl text-base text-slate-500 dark:text-slate-400">{t("classesPage.subtitle")}</p>
          </div>

          <section className="mb-6 overflow-hidden rounded-3xl border border-primary/15 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-primary/30 dark:bg-slate-900 dark:shadow-none">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("classesPage.myClasses.title")}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("classesPage.joinBanner.subtitle")}</p>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 dark:border-primary/30 dark:bg-primary/10 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-primary">{t("classesPage.joinBanner.title")}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t("classesPage.joinBanner.description")}</div>
                  </div>
                  <form onSubmit={handlePreviewJoin} className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(event) => setJoinCode(event.target.value)}
                      placeholder={t("classesPage.joinBanner.placeholder")}
                      className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={joinLoading || !joinCode.trim()}
                      className="h-12 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {joinLoading ? t("common.dangXuLy") : t("classesPage.actions.previewJoin")}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-8">
            <StudentSection
              t={t}
              title={t("classesPage.myClasses.title")}
              subtitle={t("classesPage.myClasses.subtitle")}
              query={myQuery}
              onQueryChange={(changes) => setMyQuery((current) => ({ ...current, ...changes }))}
              onReset={resetMyFilters}
              advancedOpen={myAdvancedOpen}
              onToggleAdvanced={() => setMyAdvancedOpen((current) => !current)}
              keywordOptions={keywordOptions}
              teacherOptions={teacherOptions}
              subjectOptions={subjectOptions}
              categoryOptions={categoryOptions}
              showStatusFilter
              items={myClasses.items}
              loading={myClasses.loading || metadataLoading}
              totalElements={myClasses.totalElements}
              emptyMessage={t("classesPage.empty.myClasses")}
              renderCard={(item) => (
                <StudentClassCard
                  key={item.id}
                  type="my"
                  item={item}
                  t={t}
                  onPrimaryAction={() => navigate(`/class-sections/${item.id}`)}
                  onSecondaryAction={() => navigate(`/class-sections/${item.id}`)}
                />
              )}
            />

            <StudentSection
              t={t}
              title={t("classesPage.publicClasses.title")}
              subtitle={t("classesPage.publicClasses.subtitle")}
              query={publicQuery}
              onQueryChange={(changes) => setPublicQuery((current) => ({ ...current, ...changes }))}
              onReset={resetPublicFilters}
              advancedOpen={publicAdvancedOpen}
              onToggleAdvanced={() => setPublicAdvancedOpen((current) => !current)}
              keywordOptions={keywordOptions}
              teacherOptions={teacherOptions}
              subjectOptions={subjectOptions}
              categoryOptions={categoryOptions}
              showStatusFilter={false}
              items={publicClasses.items}
              loading={publicClasses.loading || metadataLoading}
              totalElements={publicClasses.totalElements}
              emptyMessage={t("classesPage.empty.publicClasses")}
              renderCard={(item) => (
                <StudentClassCard
                  key={item.id}
                  type="public"
                  item={item}
                  t={t}
                  onPrimaryAction={() => handleJoinPublicClass(item.id)}
                  onSecondaryAction={() => navigate(`/class-sections/${item.id}`)}
                />
              )}
            />
          </div>
        </div>
      </main>

      <JoinPreviewModal
        open={joinPreviewOpen}
        preview={joinPreview}
        loading={joinLoading}
        onConfirm={handleJoinByCode}
        onClose={() => {
          setJoinPreviewOpen(false);
          setJoinPreview(null);
        }}
        t={t}
      />
    </div>
  );
}
