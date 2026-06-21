import React, { useCallback, useEffect, useState } from "react";
import { Empty } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AcademicCapIcon,
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
import { getStudentQuizFeed } from "../../api/quiz";
import { getMyNotificationsPage } from "../../api/notification";
import { getNotificationPreview, normalizeNotificationItem } from "../../utils/notificationText";
import { getMySubmissions } from "../../api/submission";
import useForegroundRefresh from "../../hooks/useForegroundRefresh";

// ── Helpers ──────────────────────────────────────────────────────────────

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
  if (progress >= 70) return { bar: "#16a34a", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" };
  if (progress >= 40) return { bar: "#f59e0b", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
  return { bar: "#dc2626", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" };
}

function formatDueTime(value, t) {
  if (!value) return t("studentOverview.common.noDeadline");
  const date = dayjs(value);
  if (!date.isValid()) return t("studentOverview.common.noDeadline");
  const now = dayjs();
  if (date.isSame(now, "day")) return t("studentOverview.common.todayAt", { time: date.format("HH:mm") });
  if (date.isSame(now.add(1, "day"), "day")) return t("studentOverview.common.tomorrowAt", { time: date.format("HH:mm") });
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

const BADGE = {
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function getAssignmentBadge(item, t) {
  if (item.submissionStatus === "RETURNED") return { label: t("studentOverview.tasks.returned"), className: BADGE.amber };
  if (item.pastDue) return { label: t("studentOverview.tasks.overdue"), className: BADGE.rose };
  return { label: t("studentOverview.tasks.upcoming"), className: BADGE.sky };
}

function getQuizBadge(item, t) {
  if (item.needsReview) return { label: t("studentOverview.tasks.needsReview"), className: BADGE.slate };
  if (item.inProgress) return { label: t("studentOverview.tasks.inProgress"), className: BADGE.amber };
  if (item.pastDue) return { label: t("studentOverview.tasks.overdue"), className: BADGE.rose };
  return { label: t("studentOverview.tasks.upcoming"), className: BADGE.sky };
}

// Gộp bài tập + quiz thành một danh sách "việc cần làm" thống nhất, ưu tiên việc gấp lên trước.
function buildUnifiedTasks({ assignmentsUpcoming, assignmentsOverdue, quizzesUpcoming, quizzesOverdue }, t) {
  const tasks = [];
  const seen = new Set();

  [...assignmentsOverdue, ...assignmentsUpcoming].forEach((item) => {
    const key = `a-${item.assignmentId}-${item.classSectionId}`;
    if (seen.has(key)) return;
    seen.add(key);
    tasks.push({
      key,
      kind: "assignment",
      title: item.assignmentTitle,
      classTitle: item.classSectionTitle,
      dueAt: item.dueAt,
      badge: getAssignmentBadge(item, t),
      meta: item.maxScore ? t("studentOverview.tasks.maxScore", { score: item.maxScore }) : null,
      priority: item.submissionStatus === "RETURNED" ? 0 : item.pastDue ? 1 : 3,
      to: `/class-sections/${item.classSectionId}/assignments/${item.assignmentId}`,
    });
  });

  [...quizzesOverdue, ...quizzesUpcoming].forEach((item) => {
    const key = `q-${item.classContentItemId}`;
    if (seen.has(key)) return;
    seen.add(key);
    const attemptsMeta = item.maxAttempts == null
      ? t("studentOverview.tasks.unlimitedAttempts")
      : t("studentOverview.tasks.attemptsLeft", { count: Math.max(0, (item.maxAttempts || 0) - (item.attemptsUsed || 0)) });
    tasks.push({
      key,
      kind: "quiz",
      title: item.quizTitle,
      classTitle: item.classSectionTitle,
      dueAt: item.availableUntil,
      badge: getQuizBadge(item, t),
      meta: attemptsMeta,
      priority: item.inProgress ? 1 : item.pastDue ? 1 : 3,
      to: `/class-sections/${item.classSectionId}/quizzes/${item.quizId}/detail?classContentItemId=${item.classContentItemId}`,
    });
  });

  return tasks.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    const leftDue = left.dueAt ? dayjs(left.dueAt).valueOf() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? dayjs(right.dueAt).valueOf() : Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  });
}

function getResultTone(item) {
  if (item.status === "RETURNED") return BADGE.amber;
  if (item.grade === null || item.grade === undefined) return BADGE.slate;
  if (item.grade >= 70) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (item.grade >= 50) return BADGE.amber;
  return BADGE.rose;
}

// ── UI atoms ───────────────────────────────────────────────────────────────

const CARD = "!rounded-2xl !border !border-slate-200 !bg-white dark:!border-slate-800 dark:!bg-slate-900";

function StatTile({ icon: Icon, label, value, hint, accent = "slate" }) {
  const dot = {
    slate: "!text-slate-400",
    sky: "!text-sky-500",
    amber: "!text-amber-500",
    rose: "!text-rose-500",
    emerald: "!text-emerald-500",
  }[accent];
  return (
    <div className={`${CARD} !p-5`}>
      <div className="!flex !items-center !justify-between">
        <p className="!m-0 !text-xs !font-semibold !uppercase !tracking-[0.12em] !text-slate-400">{label}</p>
        <Icon className={`!h-5 !w-5 ${dot}`} />
      </div>
      <p className="!m-0 !mt-3 !text-3xl !font-black !tracking-tight !text-slate-900 dark:!text-white">{value}</p>
      {hint ? <p className="!m-0 !mt-1.5 !text-xs !leading-5 !text-slate-500 dark:!text-slate-400">{hint}</p> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, actionLabel, onAction, children }) {
  return (
    <section className={`${CARD} !overflow-hidden`}>
      <div className="!flex !items-start !justify-between !gap-4 !border-b !border-slate-100 !px-5 !py-4 dark:!border-slate-800 sm:!px-6">
        <div className="!min-w-0">
          <h2 className="!m-0 !text-base !font-bold !text-slate-900 dark:!text-white sm:!text-lg">{title}</h2>
          {subtitle ? <p className="!m-0 !mt-1 !text-xs !leading-5 !text-slate-500 dark:!text-slate-400 sm:!text-sm">{subtitle}</p> : null}
        </div>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="!inline-flex !shrink-0 !items-center !gap-1 !text-sm !font-semibold !text-primary hover:!opacity-80"
          >
            <span>{actionLabel}</span>
            <ArrowRightIcon className="!h-4 !w-4" />
          </button>
        ) : null}
      </div>
      <div className="!px-5 !py-5 sm:!px-6">{children}</div>
    </section>
  );
}

function RowButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="!flex !w-full !items-start !gap-3 !rounded-xl !border !border-slate-200 !bg-slate-50/60 !p-3.5 !text-left !transition hover:!border-primary/40 hover:!bg-primary/5 dark:!border-slate-800 dark:!bg-slate-800/40 dark:hover:!bg-slate-800"
    >
      {children}
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="!space-y-6 !animate-pulse">
      <div className="!grid !gap-4 md:!grid-cols-2 xl:!grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${CARD} !h-28`} />
        ))}
      </div>
      <div className="!grid !gap-6 xl:!grid-cols-[1.4fr_1fr]">
        <div className={`${CARD} !h-96`} />
        <div className={`${CARD} !h-96`} />
      </div>
    </div>
  );
}

function WidgetError({ message, retryLabel, onRetry }) {
  return (
    <div className="!rounded-xl !border !border-rose-200 !bg-rose-50 !px-4 !py-4 dark:!border-rose-900/40 dark:!bg-rose-950/30">
      <p className="!m-0 !text-sm !font-medium !text-rose-700 dark:!text-rose-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="!mt-3 !inline-flex !items-center !gap-2 !text-sm !font-semibold !text-rose-700 hover:!underline dark:!text-rose-300"
      >
        <ClockIcon className="!h-4 !w-4" />
        <span>{retryLabel}</span>
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState([]);
  const [assignmentsUpcoming, setAssignmentsUpcoming] = useState([]);
  const [assignmentsOverdue, setAssignmentsOverdue] = useState([]);
  const [quizzesUpcoming, setQuizzesUpcoming] = useState([]);
  const [quizzesOverdue, setQuizzesOverdue] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [errors, setErrors] = useState({ classes: false, tasks: false, notifications: false, results: false });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const [classesRes, aUpcoming, aOverdue, qUpcoming, qOverdue, notiRes, gradedRes, returnedRes] =
      await Promise.allSettled([
        searchClassSections({ scope: "MY", pageNumber: 1, pageSize: 24, sortBy: "createdDate", sortDirection: "ASC" }),
        getStudentAssignmentFeed({ tab: "UPCOMING" }),
        getStudentAssignmentFeed({ tab: "PAST_DUE" }),
        getStudentQuizFeed({ tab: "UPCOMING" }),
        getStudentQuizFeed({ tab: "PAST_DUE" }),
        getMyNotificationsPage(1, 5),
        getMySubmissions({ status: "GRADED" }),
        getMySubmissions({ status: "RETURNED" }),
      ]);

    setErrors({
      classes: classesRes.status === "rejected",
      tasks:
        aUpcoming.status === "rejected" &&
        aOverdue.status === "rejected" &&
        qUpcoming.status === "rejected" &&
        qOverdue.status === "rejected",
      notifications: notiRes.status === "rejected",
      results: gradedRes.status === "rejected" && returnedRes.status === "rejected",
    });

    setMyClasses(
      classesRes.status === "fulfilled"
        ? (classesRes.value?.items || []).filter((item) => item?.status !== "ARCHIVED")
        : []
    );
    setAssignmentsUpcoming(aUpcoming.status === "fulfilled" ? extractPageItems(aUpcoming.value) : []);
    setAssignmentsOverdue(aOverdue.status === "fulfilled" ? extractPageItems(aOverdue.value) : []);
    setQuizzesUpcoming(qUpcoming.status === "fulfilled" ? extractPageItems(qUpcoming.value) : []);
    setQuizzesOverdue(qOverdue.status === "fulfilled" ? extractPageItems(qOverdue.value) : []);
    setNotifications(
      notiRes.status === "fulfilled"
        ? extractPageItems(notiRes.value).map((item) => normalizeNotificationItem(item))
        : []
    );

    const mergedResults = [];
    if (gradedRes.status === "fulfilled") mergedResults.push(...extractPageItems(gradedRes.value));
    if (returnedRes.status === "fulfilled") mergedResults.push(...extractPageItems(returnedRes.value));
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
    ? Math.round(approvedClasses.reduce((total, item) => total + (Number(item.myProgress) || 0), 0) / approvedClasses.length)
    : 0;

  // Việc đến hạn trong 7 ngày (chưa hoàn thành) — gồm cả bài tập và quiz
  const dueSoonAssignments = assignmentsUpcoming.filter(
    (item) =>
      !["SUBMITTED", "LATE_SUBMITTED", "GRADED"].includes(item?.submissionStatus) &&
      isWithinDays(item?.dueAt, now, 7)
  );
  const dueSoonQuizzes = quizzesUpcoming.filter((item) => isWithinDays(item?.availableUntil, now, 7));
  const dueSoonCount = dueSoonAssignments.length + dueSoonQuizzes.length;
  const dueTodayCount =
    dueSoonAssignments.filter((item) => isSameDay(item?.dueAt, now)).length +
    dueSoonQuizzes.filter((item) => isSameDay(item?.availableUntil, now)).length;

  const returnedCount = [...assignmentsUpcoming, ...assignmentsOverdue].filter(
    (item) => item?.submissionStatus === "RETURNED"
  ).length;
  const urgentCount = assignmentsOverdue.length + quizzesOverdue.length + returnedCount;

  const taskItems = buildUnifiedTasks({ assignmentsUpcoming, assignmentsOverdue, quizzesUpcoming, quizzesOverdue }, t).slice(0, 6);

  const progressClasses = [...approvedClasses]
    .sort((left, right) => (Number(left.myProgress) || 0) - (Number(right.myProgress) || 0))
    .slice(0, 6);

  const studentName = getDisplayName(user);
  const classTitleMap = new Map(myClasses.map((item) => [item.id, item.title || item.classCode]));

  return (
    <div className="!min-h-screen !bg-slate-50 dark:!bg-slate-950">
      <Header />
      <main className="!mx-auto !w-full !max-w-[1280px] !px-4 !pb-12 !pt-16 sm:!px-6 lg:!px-8">
        <AppBreadcrumb className="!mb-5" />

        {/* Lời chào — không bọc card, giữ tối giản */}
        <header className="!mb-7 !flex !flex-col !gap-3 sm:!flex-row sm:!items-end sm:!justify-between">
          <div className="!min-w-0">
            <h1 className="!m-0 !text-2xl !font-bold !tracking-tight !text-slate-900 dark:!text-white sm:!text-3xl">
              {t("studentOverview.greeting", { name: studentName || t("studentOverview.you") })}
            </h1>
            <p className="!m-0 !mt-2 !max-w-2xl !text-sm !leading-6 !text-slate-500 dark:!text-slate-400">
              {approvedClasses.length > 0 && taskItems.length === 0
                ? t("studentOverview.greetingHintQuiet", { classCount: approvedClasses.length })
                : approvedClasses.length > 0
                ? t("studentOverview.greetingHint", { classCount: approvedClasses.length, taskCount: taskItems.length })
                : t("studentOverview.greetingHintEmpty")}
            </p>
          </div>
          <span className="!shrink-0 !rounded-full !border !border-slate-200 !bg-white !px-3.5 !py-1.5 !text-xs !font-semibold !text-slate-500 dark:!border-slate-800 dark:!bg-slate-900 dark:!text-slate-300">
            {t("studentOverview.todayLabel", { date: now.format("DD/MM/YYYY") })}
          </span>
        </header>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="!space-y-6">
            {/* 4 ô chỉ số gọn */}
            <section className="!grid !gap-4 md:!grid-cols-2 xl:!grid-cols-4">
              <StatTile
                icon={BookOpenIcon}
                label={t("studentOverview.stats.classes.label")}
                value={approvedClasses.length}
                hint={
                  pendingClasses.length > 0
                    ? t("studentOverview.stats.classes.hintPending", { count: pendingClasses.length })
                    : t("studentOverview.stats.classes.hintReady")
                }
                accent="sky"
              />
              <StatTile
                icon={ClipboardDocumentListIcon}
                label={t("studentOverview.stats.assignments.label")}
                value={dueSoonCount}
                hint={
                  dueTodayCount > 0
                    ? t("studentOverview.stats.assignments.hintToday", { count: dueTodayCount })
                    : t("studentOverview.stats.assignments.hintWeek")
                }
                accent={dueTodayCount > 0 ? "amber" : "slate"}
              />
              <StatTile
                icon={ExclamationTriangleIcon}
                label={t("studentOverview.stats.urgent.label")}
                value={urgentCount}
                hint={
                  urgentCount > 0
                    ? t("studentOverview.stats.urgent.hint", { overdue: assignmentsOverdue.length + quizzesOverdue.length, returned: returnedCount })
                    : t("studentOverview.stats.urgent.hintClear")
                }
                accent={urgentCount > 0 ? "rose" : "emerald"}
              />
              <StatTile
                icon={CheckCircleIcon}
                label={t("studentOverview.stats.progress.label")}
                value={`${averageProgress}%`}
                hint={t("studentOverview.stats.progress.hint", { count: approvedClasses.length })}
                accent={averageProgress >= 70 ? "emerald" : averageProgress >= 40 ? "amber" : "rose"}
              />
            </section>

            {/* Việc cần làm + Lớp của tôi */}
            <div className="!grid !gap-6 xl:!grid-cols-[1.4fr_1fr]">
              <SectionCard
                title={t("studentOverview.sections.tasks.title")}
                subtitle={t("studentOverview.sections.tasks.subtitle")}
                actionLabel={t("studentOverview.actions.viewAllAssignments")}
                onAction={() => navigate("/student/assignments")}
              >
                {errors.tasks ? (
                  <WidgetError message={t("studentOverview.errors.assignments")} onRetry={loadDashboard} retryLabel={t("studentOverview.actions.retry")} />
                ) : taskItems.length === 0 ? (
                  <Empty description={t("studentOverview.empty.tasks")} />
                ) : (
                  <div className="!flex !flex-col !gap-3">
                    {taskItems.map((task) => {
                      const Icon = task.kind === "quiz" ? AcademicCapIcon : ClipboardDocumentListIcon;
                      const typeLabel = task.kind === "quiz" ? t("studentOverview.taskTypes.quiz") : t("studentOverview.taskTypes.assignment");
                      return (
                        <RowButton key={task.key} onClick={() => navigate(task.to)}>
                          <div className="!flex !h-10 !w-10 !shrink-0 !items-center !justify-center !rounded-xl !bg-primary/10 !text-primary">
                            <Icon className="!h-5 !w-5" />
                          </div>
                          <div className="!min-w-0 !flex-1">
                            <div className="!flex !flex-col !gap-1.5 sm:!flex-row sm:!items-start sm:!justify-between sm:!gap-3">
                              <div className="!min-w-0">
                                <p className="!m-0 !line-clamp-2 !text-sm !font-bold !leading-snug !text-slate-900 dark:!text-white">{task.title}</p>
                                <p className="!m-0 !mt-1 !truncate !text-xs !text-slate-500 dark:!text-slate-400">{task.classTitle}</p>
                              </div>
                              <span className={`!inline-flex !shrink-0 !rounded-full !px-2.5 !py-1 !text-xs !font-semibold ${task.badge.className}`}>
                                {task.badge.label}
                              </span>
                            </div>
                            <div className="!mt-2.5 !flex !flex-wrap !items-center !gap-x-3 !gap-y-1 !text-xs !font-medium !text-slate-500 dark:!text-slate-400">
                              <span className="!inline-flex !items-center !gap-1 !rounded-md !bg-slate-100 !px-2 !py-0.5 !text-[11px] dark:!bg-slate-800">{typeLabel}</span>
                              <span>{formatDueTime(task.dueAt, t)}</span>
                              {task.meta ? <span>· {task.meta}</span> : null}
                            </div>
                          </div>
                        </RowButton>
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
                  <WidgetError message={t("studentOverview.errors.classes")} onRetry={loadDashboard} retryLabel={t("studentOverview.actions.retry")} />
                ) : progressClasses.length === 0 ? (
                  <Empty description={t("studentOverview.empty.classes")} />
                ) : (
                  <div className="!flex !flex-col !gap-3">
                    {progressClasses.map((item) => {
                      const progressValue = Math.max(0, Math.min(Number(item.myProgress) || 0, 100));
                      const tone = getProgressTone(progressValue);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(`/class-sections/${item.id}`)}
                          className="!block !w-full !rounded-xl !border !border-slate-200 !bg-slate-50/60 !p-3.5 !text-left !transition hover:!border-primary/40 hover:!bg-primary/5 dark:!border-slate-800 dark:!bg-slate-800/40 dark:hover:!bg-slate-800"
                        >
                          <div className="!min-w-0">
                            <p className="!m-0 !truncate !text-sm !font-bold !text-slate-900 dark:!text-white">{item.title || item.classCode}</p>
                            <p className="!m-0 !mt-1 !truncate !text-xs !text-slate-500 dark:!text-slate-400">{item.teacherName || t("studentOverview.common.teacherUnknown")}</p>
                          </div>
                          <div className="!mt-3">
                            <div className="!mb-1.5 !flex !items-center !justify-between !text-xs !font-semibold !text-slate-500 dark:!text-slate-400">
                              <span>{t("studentOverview.progress.label")}</span>
                              <span>{progressValue}%</span>
                            </div>
                            <div className="!h-2 !overflow-hidden !rounded-full !bg-slate-200 dark:!bg-slate-700">
                              <div className="!h-full !rounded-full !transition-all" style={{ width: `${progressValue}%`, backgroundColor: tone.bar }} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Kết quả + Thông báo */}
            <div className="!grid !gap-6 xl:!grid-cols-2">
              <SectionCard title={t("studentOverview.sections.results.title")} subtitle={t("studentOverview.sections.results.subtitle")}>
                {errors.results ? (
                  <WidgetError message={t("studentOverview.errors.results")} onRetry={loadDashboard} retryLabel={t("studentOverview.actions.retry")} />
                ) : recentResults.length === 0 ? (
                  <Empty description={t("studentOverview.empty.results")} />
                ) : (
                  <div className="!flex !flex-col !gap-3">
                    {recentResults.map((item) => {
                      const classTitle = classTitleMap.get(item.classSectionId) || t("studentOverview.common.classUnknown");
                      return (
                        <RowButton key={`${item.id || "submission"}-${item.assignmentId}`} onClick={() => navigate(`/class-sections/${item.classSectionId}/assignments/${item.assignmentId}`)}>
                          <div className="!flex !h-10 !w-10 !shrink-0 !items-center !justify-center !rounded-xl !bg-primary/10 !text-primary">
                            <CheckCircleIcon className="!h-5 !w-5" />
                          </div>
                          <div className="!min-w-0 !flex-1">
                            <div className="!flex !items-start !justify-between !gap-3">
                              <p className="!m-0 !line-clamp-1 !text-sm !font-bold !text-slate-900 dark:!text-white">{item.assignmentTitle}</p>
                              <span className="!shrink-0 !text-xs !text-slate-400">{formatRelativeTime(item.gradedAt || item.submissionTime, t)}</span>
                            </div>
                            <p className="!m-0 !mt-1 !truncate !text-xs !text-slate-500 dark:!text-slate-400">{classTitle}</p>
                            <div className="!mt-2.5 !flex !flex-wrap !items-center !gap-2">
                              <span className={`!inline-flex !rounded-full !px-2.5 !py-1 !text-xs !font-semibold ${getResultTone(item)}`}>
                                {item.status === "RETURNED"
                                  ? t("studentOverview.results.returned")
                                  : item.grade !== null && item.grade !== undefined
                                  ? t("studentOverview.results.gradeLabel", { grade: item.grade })
                                  : t("studentOverview.results.feedbackReady")}
                              </span>
                              {item.feedback ? <span className="!text-xs !text-slate-400">{t("studentOverview.results.feedbackHint")}</span> : null}
                            </div>
                          </div>
                        </RowButton>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title={t("studentOverview.sections.notifications.title")}
                subtitle={t("studentOverview.sections.notifications.subtitle")}
                actionLabel={t("studentOverview.actions.viewAllNotifications")}
                onAction={() => navigate("/student/profile/notifications")}
              >
                {errors.notifications ? (
                  <WidgetError message={t("studentOverview.errors.notifications")} onRetry={loadDashboard} retryLabel={t("studentOverview.actions.retry")} />
                ) : notifications.length === 0 ? (
                  <Empty description={t("studentOverview.empty.notifications")} />
                ) : (
                  <div className="!flex !flex-col !gap-3">
                    {notifications.map((item) => (
                      <RowButton key={item.id} onClick={() => navigate(item.actionUrl || "/student/profile/notifications")}>
                        <div className="!relative !flex !h-10 !w-10 !shrink-0 !items-center !justify-center !rounded-xl !bg-primary/10 !text-primary">
                          <BellIcon className="!h-5 !w-5" />
                          {!item.readStatus ? <span className="!absolute !right-1 !top-1 !h-2.5 !w-2.5 !rounded-full !bg-rose-500" /> : null}
                        </div>
                        <div className="!min-w-0 !flex-1">
                          <div className="!flex !items-start !justify-between !gap-3">
                            <p className="!m-0 !line-clamp-1 !text-sm !font-bold !text-slate-900 dark:!text-white">{item.title}</p>
                            <span className="!shrink-0 !text-xs !text-slate-400">{formatRelativeTime(item.time || item.createdAt, t)}</span>
                          </div>
                          <p className="!m-0 !mt-1 !line-clamp-2 !text-xs !leading-5 !text-slate-500 dark:!text-slate-400">{getNotificationPreview(item)}</p>
                        </div>
                      </RowButton>
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
