import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App,
  AutoComplete,
  Button,
  Empty,
  Modal,
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
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
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

const STUDENT_PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90";

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
    if (item?.title) uniqueValues.add(item.title);
  });
  return Array.from(uniqueValues).slice(0, 12).map((value) => ({ value }));
}

function buildSubjectOptions(subjects = []) {
  return subjects
    .filter((subject) => subject?.code || subject?.title)
    .map((subject) => ({
      value: subject?.code || subject?.title,
      label:
        subject?.code && subject?.title
          ? `${subject.code} - ${subject.title}`
          : subject?.code || subject?.title,
      categoryId: subject?.categoryId,
    }));
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

function getProgressColor(progress) {
  if (progress >= 80) return "#22c55e";
  if (progress >= 50) return "#137fec";
  if (progress > 0) return "#f59e0b";
  return "#9ca3af";
}

function StudentViewSwitch({ activeView, onChange, t, myCount, publicCount }) {
  const tabs = [
    { key: "my", label: t("classesPage.views.my"), count: myCount || 0 },
    { key: "public", label: t("classesPage.views.public"), count: publicCount || 0 },
  ];

  return (
    <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800 sm:w-auto">
      {tabs.map((tab) => {
        const isActive = activeView === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none ${
              isActive
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            <span className="truncate">{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ClassesSectionToolbar({
  t,
  query,
  onChange,
  onReset,
  keywordOptions,
  subjectOptions,
  categoryOptions,
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_220px_220px_180px_110px]">
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
          value={query.subjectKeyword || undefined}
          onChange={(value) => onChange({ subjectKeyword: value || "", pageNumber: 1 })}
          options={subjectOptions}
          placeholder={t("classesPage.filters.subject")}
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
            { value: "title:ASC", label: t("classesPage.sort.titleAsc") },
          ]}
          className="w-full"
          showSearch
          optionFilterProp="label"
        />
        <Button onClick={onReset}>{t("classesPage.filters.reset")}</Button>
      </div>
    </div>
  );
}

function StudentClassCard({ type, item, t, onPrimaryAction }) {
  const enrollmentStatus = item?.myEnrollmentStatus;
  const isPending = enrollmentStatus === "PENDING";
  const progress = typeof item?.myProgress === "number" ? Math.max(0, Math.min(item.myProgress, 100)) : null;
  const progressValue = progress ?? 0;
  const subjectText = item?.subjectTitle
    ? item?.subjectCode
      ? `${item.subjectCode} - ${item.subjectTitle}`
      : item.subjectTitle
    : item?.subjectCode || t("classesPage.card.noSubject");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div
        className="aspect-[16/7] bg-cover bg-center"
        style={{ backgroundImage: `url(${item?.imageUrl || classPlaceholder})` }}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
              {item?.title || item?.classCode || t("classesPage.card.classSection")}
            </h3>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("classesPage.card.classCode", { code: item?.classCode || "-" })}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge value={item?.status}>
              {item?.status ? t(`classesPage.status.${item.status.toLowerCase()}`) : null}
            </StatusBadge>
            {type === "my" && enrollmentStatus && (
              <EnrollmentBadge value={enrollmentStatus}>
                {t(`classesPage.enrollment.${enrollmentStatus.toLowerCase()}`)}
              </EnrollmentBadge>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">{t("classesPage.card.category")}:</span>{" "}
            {item?.categoryTitle || t("classesPage.card.noCategory")}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">{t("classesPage.card.subject")}:</span>{" "}
            {subjectText}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">{t("classesPage.card.teacher")}:</span>{" "}
            {item?.teacherName || t("classesPage.card.noTeacher")}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">{t("classesPage.card.schedule")}:</span>{" "}
            {formatDateRange(item?.startDate, item?.endDate, t)}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">{t("classesPage.card.studentsLabel")}:</span>{" "}
            {item?.totalEnrollments || 0}
          </div>
          {type === "my" && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {t("classesPage.card.progress")}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {isPending ? t("classesPage.card.pendingApproval") : `${progressValue}%`}
                </span>
              </div>
              {!isPending && (
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressValue}%`,
                      backgroundColor: getProgressColor(progressValue),
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-1">
          <button
            type="button"
            onClick={onPrimaryAction}
            className={STUDENT_PRIMARY_BUTTON_CLASS}
          >
            {type === "my" ? t("classesPage.actions.openClass") : t("classesPage.actions.joinClass")}
          </button>
        </div>
      </div>
    </article>
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
  const [activeView, setActiveView] = useState("my");
  const [myClasses, setMyClasses] = useState({ items: [], totalElements: 0, loading: true });
  const [publicClasses, setPublicClasses] = useState({ items: [], totalElements: 0, loading: true });
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
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
      const filteredItems = (response.items || []).filter((item) => item?.status !== "ARCHIVED");
      setMyClasses({
        items: filteredItems,
        totalElements:
          filteredItems.length === (response.items || []).length
            ? response.totalElements || filteredItems.length
            : filteredItems.length,
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

  const myKeywordOptions = useMemo(
    () => buildKeywordOptions(myClasses.items),
    [myClasses.items]
  );
  const publicKeywordOptions = useMemo(
    () => buildKeywordOptions(publicClasses.items),
    [publicClasses.items]
  );
  const subjectOptions = useMemo(
    () => buildSubjectOptions(subjects),
    [subjects]
  );
  const activeQuery = activeView === "my" ? myQuery : publicQuery;
  const activeClasses = activeView === "my" ? myClasses : publicClasses;
  const activeKeywordOptions = activeView === "my" ? myKeywordOptions : publicKeywordOptions;
  const activeSubjectOptions = useMemo(() => {
    if (!activeQuery.categoryId) return subjectOptions;
    return subjectOptions.filter((option) => option.categoryId === activeQuery.categoryId);
  }, [activeQuery.categoryId, subjectOptions]);
  const activeTitle = activeView === "my" ? t("classesPage.myClasses.title") : t("classesPage.publicClasses.title");
  const activeSubtitle =
    activeView === "my" ? t("classesPage.myClasses.subtitle") : t("classesPage.publicClasses.subtitle");
  const activeEmptyMessage =
    activeView === "my" ? t("classesPage.empty.myClasses") : t("classesPage.empty.publicClasses");

  const resetMyFilters = () => setMyQuery(createInitialQuery("MY"));
  const resetPublicFilters = () => setPublicQuery(createInitialQuery("PUBLIC", { status: "PUBLIC" }));
  const getSubjectValue = (subject) => subject?.code || subject?.title;

  const handleStudentQueryChange = (view, changes) => {
    const setQuery = view === "my" ? setMyQuery : setPublicQuery;
    setQuery((current) => {
      const next = { ...current, ...changes };

      if (Object.prototype.hasOwnProperty.call(changes, "subjectKeyword")) {
        const matchedSubject = subjects.find((subject) => getSubjectValue(subject) === next.subjectKeyword);
        if (matchedSubject?.categoryId) {
          next.categoryId = matchedSubject.categoryId;
        }
      }

      if (Object.prototype.hasOwnProperty.call(changes, "categoryId") && changes.categoryId) {
        const currentSubject = subjects.find((subject) => getSubjectValue(subject) === next.subjectKeyword);
        if (currentSubject && currentSubject.categoryId !== changes.categoryId) {
          next.subjectKeyword = "";
        }
      }

      if (Object.prototype.hasOwnProperty.call(changes, "categoryId") && !changes.categoryId) {
        next.categoryId = undefined;
      }

      return next;
    });
  };

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

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{activeTitle}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activeSubtitle}</p>
                </div>
                <StudentViewSwitch
                  activeView={activeView}
                  onChange={setActiveView}
                  t={t}
                  myCount={myClasses.totalElements}
                  publicCount={publicClasses.totalElements}
                />
              </div>
            </div>

            {activeView === "public" && (
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 dark:border-primary/30 dark:bg-primary/10">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-base font-semibold text-primary">{t("classesPage.joinBanner.title")}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        {t("classesPage.joinBanner.description")}
                      </div>
                    </div>
                    <form onSubmit={handlePreviewJoin} className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(event) => setJoinCode(event.target.value)}
                        placeholder={t("classesPage.joinBanner.placeholder")}
                        className="h-11 flex-1 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                      />
                      <button
                        type="submit"
                        disabled={joinLoading || !joinCode.trim()}
                        className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {joinLoading ? t("common.dangXuLy") : t("classesPage.actions.previewJoin")}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            <ClassesSectionToolbar
              t={t}
              query={activeQuery}
              onChange={(changes) => handleStudentQueryChange(activeView, changes)}
              onReset={activeView === "my" ? resetMyFilters : resetPublicFilters}
              keywordOptions={activeKeywordOptions}
              subjectOptions={activeSubjectOptions}
              categoryOptions={categoryOptions}
            />

            <div className="px-5 py-5 sm:px-6">
              {activeClasses.loading || metadataLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: activeQuery.pageSize }).map((_, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                      <Skeleton.Image active className="!aspect-[16/7] !h-auto !w-full !rounded-lg" />
                      <Skeleton active paragraph={{ rows: 5 }} className="mt-4" />
                    </div>
                  ))}
                </div>
              ) : activeClasses.items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-16 dark:border-slate-700 dark:bg-slate-900/70">
                  <Empty description={activeEmptyMessage} />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeClasses.items.map((item) => (
                    <StudentClassCard
                      key={item.id}
                      type={activeView === "my" ? "my" : "public"}
                      item={item}
                      t={t}
                      onPrimaryAction={() =>
                        activeView === "my" ? navigate(`/class-sections/${item.id}`) : handleJoinPublicClass(item.id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <DataPaginationFooter
              currentPage={activeQuery.pageNumber}
              pageSize={activeQuery.pageSize}
              total={activeClasses.totalElements}
              pageSizeOptions={[6, 12, 24]}
              totalLabel={t("classesPage.pagination.total", { count: activeClasses.totalElements || 0 })}
              pageSizeLabel={t("classesPage.pagination.pageSize")}
              rangeLabel={t("classesPage.pagination.range", {
                start: activeClasses.totalElements ? (activeQuery.pageNumber - 1) * activeQuery.pageSize + 1 : 0,
                end: activeClasses.totalElements
                  ? Math.min(activeQuery.pageNumber * activeQuery.pageSize, activeClasses.totalElements)
                  : 0,
              })}
              onPageChange={(page) => handleStudentQueryChange(activeView, { pageNumber: page })}
              onPageSizeChange={(pageSize) =>
                handleStudentQueryChange(activeView, { pageSize, pageNumber: 1 })
              }
            />
          </section>
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
