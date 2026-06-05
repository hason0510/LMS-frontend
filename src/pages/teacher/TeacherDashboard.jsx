import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Empty, Select, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import {
  getClassPeople,
  getClassReviewQueue,
  getClassWorkbenchSummary,
  getMyTeachingClasses,
  getTeachingReviewQueue,
  getTeachingWorkbenchSummary,
} from "../../api/teaching";
import { getTeachingAssignments } from "../../api/assignment";

const DEFAULT_STUDENT_PAGE_SIZE = 5;

function getSelectedClassSectionId(searchParams) {
  const rawValue = searchParams.get("classSectionId");
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function unwrapPageItems(response) {
  const payload = response?.data || response || null;
  if (Array.isArray(payload?.pageList)) {
    return payload.pageList;
  }
  if (Array.isArray(payload?.content)) {
    return payload.content;
  }
  return Array.isArray(payload) ? payload : [];
}

function formatDateTime(value, language, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAttentionList(rows = []) {
  return [...rows]
    .filter((row) => {
      const progress = Number(row.progress) || 0;
      return progress < 80 || Number(row.missingAssignments) > 0 || Number(row.pendingReviews) > 0;
    })
    .sort((left, right) => {
      const progressGap = (Number(left.progress) || 0) - (Number(right.progress) || 0);
      if (progressGap !== 0) {
        return progressGap;
      }

      const missingGap = (Number(right.missingAssignments) || 0) - (Number(left.missingAssignments) || 0);
      if (missingGap !== 0) {
        return missingGap;
      }

      const reviewGap = (Number(right.pendingReviews) || 0) - (Number(left.pendingReviews) || 0);
      if (reviewGap !== 0) {
        return reviewGap;
      }

      return (Number(left.latestScore) || 0) - (Number(right.latestScore) || 0);
    });
}

function getTeachingAssistantCount(classSection) {
  return (classSection?.teachingMembers || []).filter((member) => member.role === "TA").length;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [attentionStudents, setAttentionStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(DEFAULT_STUDENT_PAGE_SIZE);

  const selectedClassSectionId = getSelectedClassSectionId(searchParams);
  const selectedClass = classes.find((item) => item.id === selectedClassSectionId) || null;
  const isAllClasses = !selectedClassSectionId;

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (loadingClasses) {
      return;
    }
    loadDashboardData(selectedClassSectionId);
  }, [loadingClasses, selectedClassSectionId]);

  useEffect(() => {
    setStudentPage(1);
  }, [selectedClassSectionId]);

  const visibleAttentionStudents = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return attentionStudents.slice(start, start + studentPageSize);
  }, [attentionStudents, studentPage, studentPageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(attentionStudents.length / studentPageSize));
    if (studentPage > totalPages) {
      setStudentPage(totalPages);
    }
  }, [attentionStudents.length, studentPage, studentPageSize]);

  const updateSearchState = (classSectionId) => {
    const nextParams = new URLSearchParams(searchParams);
    if (classSectionId) {
      nextParams.set("classSectionId", String(classSectionId));
    } else {
      nextParams.delete("classSectionId");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      setError(null);
      const response = await getMyTeachingClasses();
      const items = Array.isArray(response) ? response : response?.data || [];
      setClasses(items);

      if (selectedClassSectionId && !items.some((item) => item.id === selectedClassSectionId)) {
        updateSearchState(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("teacherDashboard.errors.loadClasses"));
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadDashboardData = async (classSectionId) => {
    try {
      setLoadingDashboard(true);
      setError(null);

      if (classSectionId) {
        const [summaryResponse, reviewQueueResponse, assignmentsResponse, peopleResponse] = await Promise.all([
          getClassWorkbenchSummary(classSectionId),
          getClassReviewQueue(classSectionId),
          getTeachingAssignments({ tab: "UPCOMING", classSectionId }),
          getClassPeople(classSectionId, { status: "APPROVED" }),
        ]);

        const peopleRows = Array.isArray(peopleResponse) ? peopleResponse : peopleResponse?.data || [];
        setSummary(summaryResponse?.data || summaryResponse || null);
        setReviewQueue(Array.isArray(reviewQueueResponse) ? reviewQueueResponse : reviewQueueResponse?.data || []);
        setUpcomingAssignments(unwrapPageItems(assignmentsResponse).slice(0, 5));
        setAttentionStudents(buildAttentionList(peopleRows));
        return;
      }

      const [summaryResponse, reviewQueueResponse, assignmentsResponse] = await Promise.all([
        getTeachingWorkbenchSummary(),
        getTeachingReviewQueue(),
        getTeachingAssignments({ tab: "UPCOMING" }),
      ]);

      setSummary(summaryResponse?.data || summaryResponse || null);
      setReviewQueue(Array.isArray(reviewQueueResponse) ? reviewQueueResponse : reviewQueueResponse?.data || []);
      setUpcomingAssignments(unwrapPageItems(assignmentsResponse).slice(0, 5));
      setAttentionStudents([]);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("teacherDashboard.errors.loadDashboard"));
      setSummary(null);
      setReviewQueue([]);
      setUpcomingAssignments([]);
      setAttentionStudents([]);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const stats = {
    totalClasses: Number(summary?.totalClasses) || classes.length,
    totalStudents: Number(summary?.totalStudents) || classes.reduce((sum, item) => sum + (Number(item.totalEnrollments) || 0), 0),
    pendingSubmissions: Number(summary?.pendingSubmissions) || 0,
    pendingQuizReviews: Number(summary?.pendingQuizReviews) || 0,
    atRiskStudents: Number(summary?.atRiskStudents) || 0,
  };

  const studentTableColumns = [
    {
      title: t("teacherDashboard.students.columns.student"),
      dataIndex: "studentName",
      render: (_, record) => (
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">
            {record.studentName || t("teacherDashboard.students.defaults.noName")}
          </p>
          <p className="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
            {record.email || record.studentNumber || t("teacherDashboard.students.defaults.noStudentNumber")}
          </p>
        </div>
      ),
    },
    {
      title: t("teacherDashboard.students.columns.progress"),
      dataIndex: "progress",
      width: 180,
      render: (value) => <ProgressPill value={value} />,
    },
    {
      title: t("teacherDashboard.students.columns.missingAssignments"),
      dataIndex: "missingAssignments",
      width: 140,
      align: "right",
      render: (value) => <span className="font-semibold text-slate-700 dark:text-slate-200">{value || 0}</span>,
    },
    {
      title: t("teacherDashboard.students.columns.pendingReviews"),
      dataIndex: "pendingReviews",
      width: 160,
      align: "right",
      render: (value) => <span className="font-semibold text-slate-700 dark:text-slate-200">{value || 0}</span>,
    },
    {
      title: t("teacherDashboard.students.columns.latestScore"),
      dataIndex: "latestScore",
      width: 130,
      align: "right",
      render: (value) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {value ?? t("teacherDashboard.students.defaults.scoreFallback")}
        </span>
      ),
    },
    {
      title: t("teacherDashboard.students.columns.action"),
      key: "actions",
      width: 120,
      align: "right",
      render: () => (
        <button
          onClick={() => navigate(`/teacher/class-sections/${selectedClassSectionId}`)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t("teacherDashboard.students.openClass")}
        </button>
      ),
    },
  ];

  const studentRangeStart = attentionStudents.length === 0 ? 0 : (studentPage - 1) * studentPageSize + 1;
  const studentRangeEnd = Math.min(studentPage * studentPageSize, attentionStudents.length);

  const openReviewItem = (item) => {
    if (!item) {
      return;
    }

    if (String(item.type).toUpperCase() === "QUIZ" && item.attemptId) {
      navigate(`/teacher/quiz-attempts/${item.attemptId}`);
      return;
    }

    if (item.classSectionId && item.assignmentId) {
      navigate(`/teacher/class-sections/${item.classSectionId}/assignments/${item.assignmentId}/submissions`);
    }
  };

  const contentLoading = loadingClasses || loadingDashboard;

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-display text-slate-950 dark:bg-slate-950 dark:text-white">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main
          className={`flex-1 pt-16 transition-all duration-300 ${
            sidebarCollapsed ? "pl-20" : "pl-64"
          }`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <AppBreadcrumb className="mb-5" />

            <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    {t("teacherDashboard.header.eyebrow")}
                  </p>
                  <h1 className="m-0 mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    {t("teacherDashboard.header.title")}
                  </h1>
                  <p className="m-0 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("teacherDashboard.header.subtitle")}
                  </p>
                </div>

                <div className="w-full xl:max-w-sm">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("teacherDashboard.filters.label")}
                  </label>
                  <Select
                    value={selectedClassSectionId || "ALL"}
                    onChange={(value) => updateSearchState(value === "ALL" ? null : value)}
                    className="w-full"
                    optionFilterProp="label"
                    showSearch
                    options={[
                      { value: "ALL", label: t("teacherDashboard.filters.allClasses") },
                      ...classes.map((item) => ({
                        value: item.id,
                        label: item.title || item.classCode || t("teacherDashboard.defaults.classTitle", { id: item.id }),
                      })),
                    ]}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <HeaderChip
                  label={t("teacherDashboard.header.scopeLabel")}
                  value={selectedClass?.title || t("teacherDashboard.filters.allClasses")}
                />
                <HeaderChip
                  label={t("teacherDashboard.header.focusLabel")}
                  value={t("teacherDashboard.header.focusValue", {
                    submissions: stats.pendingSubmissions,
                    quizzes: stats.pendingQuizReviews,
                  })}
                />
              </div>
            </section>

            {error ? (
              <Alert
                type="error"
                showIcon
                message={t("teacherDashboard.errors.alertTitle")}
                description={error}
                className="mt-6"
              />
            ) : null}

            {contentLoading ? (
              <DashboardSkeleton />
            ) : classes.length === 0 ? (
              <section className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <Empty description={t("teacherDashboard.empty.title")}>
                  <Button type="primary" onClick={() => navigate("/teacher/curriculums")}>
                    {t("teacherDashboard.empty.action")}
                  </Button>
                </Empty>
              </section>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    icon={<Squares2X2Icon className="h-6 w-6" />}
                    label={t("teacherDashboard.stats.classes")}
                    value={stats.totalClasses}
                    tone="blue"
                  />
                  <MetricCard
                    icon={<UserGroupIcon className="h-6 w-6" />}
                    label={t("teacherDashboard.stats.students")}
                    value={stats.totalStudents}
                    tone="emerald"
                  />
                  <MetricCard
                    icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
                    label={t("teacherDashboard.stats.pendingSubmissions")}
                    value={stats.pendingSubmissions}
                    tone="amber"
                  />
                  <MetricCard
                    icon={<QueueListIcon className="h-6 w-6" />}
                    label={t("teacherDashboard.stats.pendingQuizReviews")}
                    value={stats.pendingQuizReviews}
                    tone="sky"
                  />
                  <MetricCard
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                    label={t("teacherDashboard.stats.atRiskStudents")}
                    value={stats.atRiskStudents}
                    tone="rose"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_0.95fr]">
                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionHeader
                      title={t("teacherDashboard.reviewQueue.title")}
                      subtitle={t("teacherDashboard.reviewQueue.subtitle")}
                      actionLabel={t("teacherDashboard.reviewQueue.action")}
                      onAction={() => navigate("/teacher/assignments")}
                    />

                    {reviewQueue.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("teacherDashboard.reviewQueue.empty")} />
                    ) : (
                      <div className="mt-4 space-y-3">
                        {reviewQueue.slice(0, 6).map((item) => (
                          <button
                            key={`${item.type}-${item.submissionId || item.attemptId}`}
                            onClick={() => openReviewItem(item)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Tag color={String(item.type).toUpperCase() === "QUIZ" ? "blue" : "green"}>
                                    {String(item.type).toUpperCase() === "QUIZ"
                                      ? t("teacherDashboard.reviewQueue.types.quiz")
                                      : t("teacherDashboard.reviewQueue.types.assignment")}
                                  </Tag>
                                  {item.late ? (
                                    <Tag color="red">{t("teacherDashboard.reviewQueue.late")}</Tag>
                                  ) : null}
                                </div>
                                <p className="m-0 mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {item.title}
                                </p>
                                <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  {item.classSectionTitle} · {item.studentName}
                                </p>
                              </div>

                              <div className="shrink-0 text-sm text-slate-500 dark:text-slate-400 sm:text-right">
                                <p className="m-0">
                                  {formatDateTime(
                                    item.submittedAt || item.dueAt,
                                    i18n.language,
                                    t("teacherDashboard.defaults.noDate")
                                  )}
                                </p>
                                <p className="m-0 mt-1 font-semibold text-primary">
                                  {t("teacherDashboard.reviewQueue.open")}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <SectionHeader
                      title={t("teacherDashboard.classes.title")}
                      subtitle={t("teacherDashboard.classes.subtitle")}
                      actionLabel={t("teacherDashboard.classes.action")}
                      onAction={() => navigate("/teacher/class-sections")}
                    />

                    <div className="mt-4 space-y-3">
                      <button
                        onClick={() => updateSearchState(null)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isAllClasses
                            ? "border-primary/40 bg-primary/5"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                        }`}
                      >
                        <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">
                          {t("teacherDashboard.filters.allClasses")}
                        </p>
                        <p className="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {t("teacherDashboard.classes.allClassesHint")}
                        </p>
                      </button>

                      {classes.slice(0, 6).map((item) => {
                        const isSelected = item.id === selectedClassSectionId;
                        const teachingAssistantCount = getTeachingAssistantCount(item);
                        return (
                          <button
                            key={item.id}
                            onClick={() => updateSearchState(item.id)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                              isSelected
                                ? "border-primary/40 bg-primary/5"
                                : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {item.title || item.classCode}
                                </p>
                                <p className="m-0 mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                  {item.subjectTitle || t("teacherDashboard.defaults.noSubject")} · {t("teacherDashboard.classes.assistants", { count: teachingAssistantCount })}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {t("teacherDashboard.classes.students", { count: item.totalEnrollments || 0 })}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <SectionHeader
                    title={t("teacherDashboard.upcoming.title")}
                    subtitle={t("teacherDashboard.upcoming.subtitle")}
                    actionLabel={t("teacherDashboard.upcoming.action")}
                    onAction={() => navigate("/teacher/assignments")}
                  />

                  {upcomingAssignments.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("teacherDashboard.upcoming.empty")} />
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {upcomingAssignments.map((assignment) => {
                        const totalStudents = Number(assignment.totalStudents) || 0;
                        const turnedInCount = Number(assignment.turnedInCount) || 0;
                        const pendingReviewCount = Number(assignment.pendingReviewCount) || 0;
                        const gradedCount = Number(assignment.gradedCount) || 0;
                        const notSubmittedCount = Math.max(0, totalStudents - turnedInCount);

                        return (
                          <button
                            key={`${assignment.assignmentId}-${assignment.classSectionId}`}
                            onClick={() =>
                              navigate(
                                `/teacher/class-sections/${assignment.classSectionId}/assignments/${assignment.assignmentId}/submissions`
                              )
                            }
                            className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {assignment.assignmentTitle}
                                </p>
                                <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  {assignment.classSectionTitle}
                                </p>
                              </div>
                              <div className="shrink-0 text-sm text-slate-500 dark:text-slate-400 sm:text-right">
                                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  <CalendarDaysIcon className="h-4 w-4" />
                                  {formatDateTime(
                                    assignment.dueAt,
                                    i18n.language,
                                    t("teacherDashboard.defaults.noDate")
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 space-y-3">
                              <AssignmentStatusBar
                                label={t("teacherDashboard.upcoming.submitted")}
                                value={turnedInCount}
                                total={totalStudents}
                                tone="bg-blue-500"
                              />
                              <AssignmentStatusBar
                                label={t("teacherDashboard.upcoming.waitingFeedback")}
                                value={pendingReviewCount}
                                total={totalStudents}
                                tone="bg-amber-500"
                              />
                              <AssignmentStatusBar
                                label={t("teacherDashboard.upcoming.notSubmitted")}
                                value={notSubmittedCount}
                                total={totalStudents}
                                tone="bg-rose-500"
                              />
                              <AssignmentStatusBar
                                label={t("teacherDashboard.upcoming.feedbackSent")}
                                value={gradedCount}
                                total={totalStudents}
                                tone="bg-emerald-500"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="px-5 py-5">
                    <SectionHeader
                      title={t("teacherDashboard.students.title")}
                      subtitle={
                        selectedClass
                          ? t("teacherDashboard.students.subtitleForClass", { classTitle: selectedClass.title || selectedClass.classCode })
                          : t("teacherDashboard.students.subtitleAllClasses")
                      }
                    />
                  </div>

                  {!selectedClass ? (
                    <div className="border-t border-slate-200 px-5 py-12 dark:border-slate-800">
                      <Empty description={t("teacherDashboard.students.selectClassPrompt")} />
                    </div>
                  ) : attentionStudents.length === 0 ? (
                    <div className="border-t border-slate-200 px-5 py-12 dark:border-slate-800">
                      <Empty description={t("teacherDashboard.students.empty")} />
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:block">
                        <Table
                          rowKey="studentId"
                          columns={studentTableColumns}
                          dataSource={visibleAttentionStudents}
                          pagination={false}
                          scroll={{ x: 860 }}
                        />
                      </div>

                      <div className="space-y-3 px-5 pb-5 md:hidden">
                        {visibleAttentionStudents.map((student) => (
                          <div key={student.studentId} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {student.studentName || t("teacherDashboard.students.defaults.noName")}
                                </p>
                                <p className="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {student.email || student.studentNumber || t("teacherDashboard.students.defaults.noStudentNumber")}
                                </p>
                              </div>
                              <button
                                onClick={() => navigate(`/teacher/class-sections/${selectedClassSectionId}`)}
                                className="shrink-0 text-sm font-semibold text-primary"
                              >
                                {t("teacherDashboard.students.openClass")}
                              </button>
                            </div>

                            <div className="mt-4 space-y-3">
                              <ProgressPill value={student.progress} />
                              <MobileMetricRow
                                label={t("teacherDashboard.students.columns.missingAssignments")}
                                value={student.missingAssignments || 0}
                              />
                              <MobileMetricRow
                                label={t("teacherDashboard.students.columns.pendingReviews")}
                                value={student.pendingReviews || 0}
                              />
                              <MobileMetricRow
                                label={t("teacherDashboard.students.columns.latestScore")}
                                value={student.latestScore ?? t("teacherDashboard.students.defaults.scoreFallback")}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <DataPaginationFooter
                        currentPage={studentPage}
                        pageSize={studentPageSize}
                        total={attentionStudents.length}
                        pageSizeOptions={[5, 10, 15]}
                        totalLabel={t("teacherDashboard.students.pagination.total", { count: attentionStudents.length })}
                        pageSizeLabel={t("teacherDashboard.students.pagination.pageSize")}
                        rangeLabel={t("teacherDashboard.students.pagination.range", {
                          start: studentRangeStart,
                          end: studentRangeEnd,
                        })}
                        onPageChange={setStudentPage}
                        onPageSizeChange={(value) => {
                          setStudentPageSize(value);
                          setStudentPage(1);
                        }}
                      />
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="h-96 animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
        <div className="h-96 animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
      </div>
      <div className="h-[30rem] animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
      <div className="h-[34rem] animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
    </div>
  );
}

function HeaderChip({ label, value }) {
  return (
    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
      <span className="font-semibold">{label}:</span> {value}
    </div>
  );
}

function MetricCard({ icon, label, value, tone }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="m-0 mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[tone] || toneMap.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">{title}</h2>
        {subtitle ? <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          {actionLabel}
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function AssignmentStatusBar({ label, value, total, tone }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeValue = Math.max(0, Number(value) || 0);
  const percent = safeTotal > 0 ? Math.min(100, Math.round((safeValue / safeTotal) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {safeValue}/{safeTotal}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ProgressPill({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const toneClass =
    safeValue < 50
      ? "bg-rose-500"
      : safeValue < 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{safeValue}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-2 rounded-full ${toneClass}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function MobileMetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}
