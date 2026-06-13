import React, { useCallback, useEffect, useState } from "react";
import { Empty } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  BellIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import Header from "../../components/layout/Header";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { useAuth } from "../../contexts/AuthContext";
import { searchClassSections } from "../../api/classSection";
import { getStudentAssignmentFeed } from "../../api/assignment";
import { getMyNotificationsPage } from "../../api/notification";
import { getNotificationPreview, normalizeNotificationItem } from "../../utils/notificationText";
import { getMySubmissions } from "../../api/submission";
import useForegroundRefresh from "../../hooks/useForegroundRefresh";

function extractPageItems(response) {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.pageList)) return payload.pageList;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function getDisplayName(user) {
  if (!user) return "";
  return user.fullName || user.userName || user.username || "";
}

function isSameDay(value, target) {
  if (!value) return false;
  const date = dayjs(value);
  return date.isValid() && date.isSame(target, "day");
}

function isWithinDays(value, start, days) {
  if (!value) return false;
  const date = dayjs(value);
  if (!date.isValid()) return false;
  const end = start.add(days, "day").endOf("day");
  return date.isAfter(start.subtract(1, "minute")) && date.isBefore(end);
}

function getProgressTone(progress) {
  if (progress >= 70) {
    return {
      bar: "#16a34a",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
    };
  }
  if (progress >= 40) {
    return {
      bar: "#f59e0b",
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    };
  }
  return {
    bar: "#dc2626",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
  };
}

function formatDueTime(value, t) {
  if (!value) return t("studentOverview.common.noDeadline");
  const date = dayjs(value);
  if (!date.isValid()) return t("studentOverview.common.noDeadline");

  const now = dayjs();
  if (date.isSame(now, "day")) {
    return t("studentOverview.common.todayAt", { time: date.format("HH:mm") });
  }
  if (date.isSame(now.add(1, "day"), "day")) {
    return t("studentOverview.common.tomorrowAt", { time: date.format("HH:mm") });
  }
  return date.format("DD/MM HH:mm");
}

function formatRelativeTime(value, t) {
  if (!value) return t("studentOverview.common.justNow");
  const date = dayjs(value);
  if (!date.isValid()) return t("studentOverview.common.justNow");

  const now = dayjs();
  const diffMinutes = now.diff(date, "minute");
  if (diffMinutes < 1) return t("studentOverview.common.justNow");
  if (diffMinutes < 60) return t("studentOverview.common.minutesAgo", { count: diffMinutes });

  const diffHours = now.diff(date, "hour");
  if (diffHours < 24) return t("studentOverview.common.hoursAgo", { count: diffHours });

  const diffDays = now.diff(date, "day");
  if (diffDays < 7) return t("studentOverview.common.daysAgo", { count: diffDays });

  return date.format("DD/MM/YYYY");
}

function getTaskKind(item, t) {
  if (item.submissionStatus === "RETURNED") {
    return {
      label: t("studentOverview.tasks.returned"),
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    };
  }
  if (item.pastDue) {
    return {
      label: t("studentOverview.tasks.overdue"),
      className: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
    };
  }
  return {
    label: t("studentOverview.tasks.upcoming"),
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
  };
}

function buildTaskList(upcomingItems, overdueItems) {
  const seen = new Set();
  const merged = [...overdueItems, ...upcomingItems].filter((item) => {
    const key = `${item.assignmentId}-${item.classSectionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return merged.sort((left, right) => {
    const leftPriority = left.submissionStatus === "RETURNED" ? 0 : left.pastDue ? 1 : 2;
    const rightPriority = right.submissionStatus === "RETURNED" ? 0 : right.pastDue ? 1 : 2;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftDue = left.dueAt ? dayjs(left.dueAt).valueOf() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? dayjs(right.dueAt).valueOf() : Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  });
}

function getTaskPriority(item) {
  if (item?.submissionStatus === "RETURNED") return 0;
  if (item?.pastDue) return 1;
  if (item?.dueAt && isWithinDays(item.dueAt, dayjs(), 3)) return 2;
  return 3;
}

function getClassUrgency(item, taskItems) {
  const relatedTasks = taskItems.filter((task) => task.classSectionId === item.id);
  if (!relatedTasks.length) return Number.MAX_SAFE_INTEGER;
  return Math.min(...relatedTasks.map(getTaskPriority));
}

function getResultTone(item) {
  if (item.status === "RETURNED") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200";
  }
  if (item.grade === null || item.grade === undefined) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }
  if (item.grade >= 70) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (item.grade >= 50) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200";
  }
  return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="h-96 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
        <div className="h-96 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="h-80 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
        <div className="h-80 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, actionLabel, onAction, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
          >
            <span>{actionLabel}</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = "primary" }) {
  const toneClassMap = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          {hint ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClassMap[tone] || toneClassMap.primary}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [overdueAssignments, setOverdueAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [errors, setErrors] = useState({
    classes: false,
    assignments: false,
    notifications: false,
    results: false,
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    const [classesResult, upcomingResult, overdueResult, notificationsResult, gradedResult, returnedResult] = await Promise.allSettled([
      searchClassSections({
        scope: "MY",
        pageNumber: 1,
        pageSize: 24,
        sortBy: "createdDate",
        sortDirection: "ASC",
      }),
      getStudentAssignmentFeed({ tab: "UPCOMING" }),
      getStudentAssignmentFeed({ tab: "PAST_DUE" }),
      getMyNotificationsPage(1, 5),
      getMySubmissions({ status: "GRADED", classSectionId: undefined }),
      getMySubmissions({ status: "RETURNED", classSectionId: undefined }),
    ]);

    const nextErrors = {
      classes: classesResult.status === "rejected",
      assignments: upcomingResult.status === "rejected" || overdueResult.status === "rejected",
      notifications: notificationsResult.status === "rejected",
      results: gradedResult.status === "rejected" && returnedResult.status === "rejected",
    };

    setErrors(nextErrors);

    if (classesResult.status === "fulfilled") {
      setMyClasses((classesResult.value?.items || []).filter((item) => item?.status !== "ARCHIVED"));
    } else {
      setMyClasses([]);
    }

    if (upcomingResult.status === "fulfilled") {
      setUpcomingAssignments(extractPageItems(upcomingResult.value));
    } else {
      setUpcomingAssignments([]);
    }

    if (overdueResult.status === "fulfilled") {
      setOverdueAssignments(extractPageItems(overdueResult.value));
    } else {
      setOverdueAssignments([]);
    }

    if (notificationsResult.status === "fulfilled") {
      setNotifications(
        extractPageItems(notificationsResult.value).map((item) => normalizeNotificationItem(item))
      );
    } else {
      setNotifications([]);
    }

    const mergedResults = [];
    if (gradedResult.status === "fulfilled") {
      mergedResults.push(...extractPageItems(gradedResult.value));
    }
    if (returnedResult.status === "fulfilled") {
      mergedResults.push(...extractPageItems(returnedResult.value));
    }

    setRecentResults(
      mergedResults
        .filter((item) => item?.status === "GRADED" || item?.status === "RETURNED")
        .sort((left, right) => {
          const leftTime = dayjs(left.gradedAt || left.submissionTime).valueOf();
          const rightTime = dayjs(right.gradedAt || right.submissionTime).valueOf();
          return rightTime - leftTime;
        })
        .slice(0, 5)
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useForegroundRefresh(loadDashboard);

  const now = dayjs();
  const approvedClasses = myClasses.filter((item) => item?.myEnrollmentStatus === "APPROVED");
  const pendingClasses = myClasses.filter((item) => item?.myEnrollmentStatus === "PENDING");

  const averageProgress = approvedClasses.length
    ? Math.round(
        approvedClasses.reduce((total, item) => total + (Number(item.myProgress) || 0), 0) / approvedClasses.length
      )
    : 0;

  const dueSoonAssignments = upcomingAssignments.filter(
    (item) =>
      item?.submissionStatus !== "SUBMITTED" &&
      item?.submissionStatus !== "LATE_SUBMITTED" &&
      item?.submissionStatus !== "GRADED" &&
      isWithinDays(item?.dueAt, now, 7)
  );

  const dueTodayCount = dueSoonAssignments.filter((item) => isSameDay(item?.dueAt, now)).length;
  const returnedCount = [...upcomingAssignments, ...overdueAssignments].filter(
    (item) => item?.submissionStatus === "RETURNED"
  ).length;
  const urgentCount = overdueAssignments.length + returnedCount;
  const taskItems = buildTaskList(upcomingAssignments, overdueAssignments).slice(0, 6);
  const progressClasses = [...approvedClasses]
    .sort((left, right) => {
      const leftUrgency = getClassUrgency(left, taskItems);
      const rightUrgency = getClassUrgency(right, taskItems);
      if (leftUrgency !== rightUrgency) return leftUrgency - rightUrgency;
      return (Number(left.myProgress) || 0) - (Number(right.myProgress) || 0);
    })
    .slice(0, 6);

  const studentName = getDisplayName(user);
  const classTitleMap = new Map(myClasses.map((item) => [item.id, item.title || item.classCode]));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <AppBreadcrumb className="mb-6" />

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {t("studentOverview.eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {t("studentOverview.greeting", { name: studentName || t("studentOverview.you") })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                {approvedClasses.length > 0 && taskItems.length === 0
                  ? t("studentOverview.greetingHintQuiet", {
                      classCount: approvedClasses.length,
                    })
                  : approvedClasses.length > 0
                  ? t("studentOverview.greetingHint", {
                      classCount: approvedClasses.length,
                      taskCount: taskItems.length,
                    })
                  : t("studentOverview.greetingHintEmpty")}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {t("studentOverview.todayLabel", { date: now.format("DD/MM/YYYY") })}
            </div>
          </div>
        </section>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={BookOpenIcon}
                label={t("studentOverview.stats.classes.label")}
                value={approvedClasses.length}
                hint={
                  pendingClasses.length > 0
                    ? t("studentOverview.stats.classes.hintPending", { count: pendingClasses.length })
                    : t("studentOverview.stats.classes.hintReady")
                }
              />
              <StatCard
                icon={ClipboardDocumentListIcon}
                label={t("studentOverview.stats.assignments.label")}
                value={dueSoonAssignments.length}
                hint={
                  dueTodayCount > 0
                    ? t("studentOverview.stats.assignments.hintToday", { count: dueTodayCount })
                    : t("studentOverview.stats.assignments.hintWeek")
                }
                tone={dueTodayCount > 0 ? "amber" : "primary"}
              />
              <StatCard
                icon={ExclamationTriangleIcon}
                label={t("studentOverview.stats.urgent.label")}
                value={urgentCount}
                hint={
                  urgentCount > 0
                    ? t("studentOverview.stats.urgent.hint", {
                        overdue: overdueAssignments.length,
                        returned: returnedCount,
                      })
                    : t("studentOverview.stats.urgent.hintClear")
                }
                tone={urgentCount > 0 ? "rose" : "emerald"}
              />
              <StatCard
                icon={CheckCircleIcon}
                label={t("studentOverview.stats.progress.label")}
                value={`${averageProgress}%`}
                hint={t("studentOverview.stats.progress.hint", { count: approvedClasses.length })}
                tone={averageProgress >= 70 ? "emerald" : averageProgress >= 40 ? "amber" : "rose"}
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <SectionCard
                title={t("studentOverview.sections.tasks.title")}
                subtitle={t("studentOverview.sections.tasks.subtitle")}
                actionLabel={t("studentOverview.actions.viewAllAssignments")}
                onAction={() => navigate("/student/assignments")}
              >
                {errors.assignments ? (
                  <WidgetError
                    message={t("studentOverview.errors.assignments")}
                    onRetry={loadDashboard}
                    retryLabel={t("studentOverview.actions.retry")}
                  />
                ) : taskItems.length === 0 ? (
                  <Empty description={t("studentOverview.empty.tasks")} />
                ) : (
                  <div className="flex flex-col !gap-4">
                    {taskItems.map((item) => {
                      const taskKind = getTaskKind(item, t);
                      return (
                        <button
                          key={`${item.assignmentId}-${item.classSectionId}`}
                          type="button"
                          onClick={() => navigate(`/class-sections/${item.classSectionId}/assignments/${item.assignmentId}`)}
                          className="flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <ClipboardDocumentListIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
                                  {item.assignmentTitle}
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  {item.classSectionTitle}
                                </p>
                              </div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${taskKind.className}`}>
                                {taskKind.label}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                              <span>{formatDueTime(item.dueAt, t)}</span>
                              {item.maxScore ? <span>{t("studentOverview.tasks.maxScore", { score: item.maxScore })}</span> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title={t("studentOverview.sections.progress.title")}
                subtitle={t("studentOverview.sections.progress.subtitle")}
                actionLabel={t("studentOverview.actions.viewAllClasses")}
                onAction={() => navigate("/classes")}
              >
                {errors.classes ? (
                  <WidgetError
                    message={t("studentOverview.errors.classes")}
                    onRetry={loadDashboard}
                    retryLabel={t("studentOverview.actions.retry")}
                  />
                ) : progressClasses.length === 0 ? (
                  <Empty description={t("studentOverview.empty.classes")} />
                ) : (
                  <div className="flex flex-col !gap-4">
                    {progressClasses.map((item) => {
                      const progressValue = Math.max(0, Math.min(Number(item.myProgress) || 0, 100));
                      const tone = getProgressTone(progressValue);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(`/class-sections/${item.id}`)}
                          className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.title || item.classCode}</p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.teacherName || t("studentOverview.common.teacherUnknown")}</p>
                            </div>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                              {progressValue < 40
                                ? t("studentOverview.progress.needsAttention")
                                : progressValue < 70
                                ? t("studentOverview.progress.inProgress")
                                : t("studentOverview.progress.onTrack")}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <span>{t("studentOverview.progress.label")}</span>
                              <span>{progressValue}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progressValue}%`, backgroundColor: tone.bar }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                title={t("studentOverview.sections.results.title")}
                subtitle={t("studentOverview.sections.results.subtitle")}
              >
                {errors.results ? (
                  <WidgetError
                    message={t("studentOverview.errors.results")}
                    onRetry={loadDashboard}
                    retryLabel={t("studentOverview.actions.retry")}
                  />
                ) : recentResults.length === 0 ? (
                  <Empty description={t("studentOverview.empty.results")} />
                ) : (
                  <div className="flex flex-col !gap-4">
                    {recentResults.map((item) => {
                      const classTitle = classTitleMap.get(item.classSectionId) || t("studentOverview.common.classUnknown");
                      return (
                        <button
                          key={`${item.id || "submission"}-${item.assignmentId}`}
                          type="button"
                          onClick={() => navigate(`/class-sections/${item.classSectionId}/assignments/${item.assignmentId}`)}
                          className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <CheckCircleIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">{item.assignmentTitle}</p>
                              <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                                {formatRelativeTime(item.gradedAt || item.submissionTime, t)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{classTitle}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getResultTone(item)}`}>
                                {item.status === "RETURNED"
                                  ? t("studentOverview.results.returned")
                                  : item.grade !== null && item.grade !== undefined
                                  ? t("studentOverview.results.gradeLabel", { grade: item.grade })
                                  : t("studentOverview.results.feedbackReady")}
                              </span>
                              {item.feedback ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {t("studentOverview.results.feedbackHint")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title={t("studentOverview.sections.notifications.title")}
                subtitle={t("studentOverview.sections.notifications.subtitle")}
                actionLabel={t("studentOverview.actions.viewAllNotifications")}
                onAction={() => navigate("/notifications")}
              >
                {errors.notifications ? (
                  <WidgetError
                    message={t("studentOverview.errors.notifications")}
                    onRetry={loadDashboard}
                    retryLabel={t("studentOverview.actions.retry")}
                  />
                ) : notifications.length === 0 ? (
                  <Empty description={t("studentOverview.empty.notifications")} />
                ) : (
                  <div className="flex flex-col !gap-4">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.actionUrl || "/notifications")}
                        className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                      >
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <BellIcon className="h-5 w-5" />
                          {!item.readStatus ? (
                            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                              {formatRelativeTime(item.time || item.createdAt, t)}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                            {getNotificationPreview(item)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function WidgetError({ message, retryLabel, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-900/40 dark:bg-rose-950/30">
      <p className="text-sm font-medium text-rose-700 dark:text-rose-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:underline dark:text-rose-200"
      >
        <ClockIcon className="h-4 w-4" />
        <span>{retryLabel}</span>
      </button>
    </div>
  );
}
