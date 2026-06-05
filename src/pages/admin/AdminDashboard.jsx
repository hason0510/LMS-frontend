import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Empty, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { getAllUsers } from "../../api/user";
import { getClassSections } from "../../api/classSection";
import { getAllEnrollments } from "../../api/enrollment";
import { getAllSubjects } from "../../api/subject";
import { getTeachingReviewQueue, getTeachingWorkbenchSummary } from "../../api/teaching";

function unwrapListPayload(payload) {
  const data = payload?.data ?? payload ?? null;
  if (Array.isArray(data?.pageList)) {
    return data.pageList;
  }
  if (Array.isArray(data?.content)) {
    return data.content;
  }
  return Array.isArray(data) ? data : [];
}

function formatTime(value, language, fallback) {
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

function getClassAccessTone(status) {
  if (status === "PUBLIC") {
    return "emerald";
  }
  if (status === "PRIVATE") {
    return "amber";
  }
  return "slate";
}

function getTeachingAssistantCount(classSection) {
  return (classSection?.teachingMembers || []).filter((member) => member.role === "TA").length;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [topClasses, setTopClasses] = useState([]);
  const [topTeachers, setTopTeachers] = useState([]);
  const [assistants, setAssistants] = useState([]);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersResponse, classesResponse, subjectsResponse, enrollmentsResponse, summaryResponse, reviewQueueResponse] =
        await Promise.all([
          getAllUsers(0, 1),
          getClassSections({ pageNumber: 1, pageSize: 1000 }),
          getAllSubjects(),
          getAllEnrollments(1, 1, "PENDING"),
          getTeachingWorkbenchSummary(),
          getTeachingReviewQueue(),
        ]);

      const classSections = unwrapListPayload(classesResponse);
      const subjects = unwrapListPayload(subjectsResponse);
      const summary = summaryResponse?.data || summaryResponse || null;
      const reviewItems = unwrapListPayload(reviewQueueResponse);
      const totalUsers = usersResponse?.data?.totalElements || 0;
      const pendingJoinRequests = enrollmentsResponse?.data?.totalElements || 0;

      const classStatusCounts = classSections.reduce(
        (accumulator, item) => {
          const status = item.status || "PRIVATE";
          accumulator[status] = (accumulator[status] || 0) + 1;
          return accumulator;
        },
        { PUBLIC: 0, PRIVATE: 0, ARCHIVED: 0 }
      );

      const subjectChartMap = classSections.reduce((accumulator, item) => {
        const subject = item.subjectTitle || t("adminDashboard.defaults.noSubject");
        accumulator[subject] = (accumulator[subject] || 0) + 1;
        return accumulator;
      }, {});

      const nextChartData = Object.entries(subjectChartMap)
        .map(([subject, count]) => ({ subject, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 8);

      const nextTopClasses = [...classSections]
        .sort((left, right) => (Number(right.totalEnrollments) || 0) - (Number(left.totalEnrollments) || 0))
        .slice(0, 5);

      const teacherMap = new Map();
      const assistantMap = new Map();

      classSections.forEach((item) => {
        const teacherKey = item.teacherId || item.teacherName;
        if (teacherKey) {
          const currentTeacher = teacherMap.get(teacherKey) || {
            id: teacherKey,
            name: item.teacherName || t("adminDashboard.defaults.unknownTeacher"),
            classes: 0,
            students: 0,
          };
          currentTeacher.classes += 1;
          currentTeacher.students += Number(item.totalEnrollments) || 0;
          teacherMap.set(teacherKey, currentTeacher);
        }

        (item.teachingMembers || [])
          .filter((member) => member.role === "TA")
          .forEach((member) => {
            const assistantKey = member.userId || member.id || member.email;
            if (!assistantKey) {
              return;
            }

            const currentAssistant = assistantMap.get(assistantKey) || {
              id: assistantKey,
              name: member.fullName || member.username || t("adminDashboard.defaults.unknownAssistant"),
              email: member.email,
              classes: [],
            };

            if (!currentAssistant.classes.some((classItem) => classItem.id === item.id)) {
              currentAssistant.classes.push({
                id: item.id,
                title: item.title || item.classCode || t("adminDashboard.defaults.classTitle", { id: item.id }),
              });
            }

            assistantMap.set(assistantKey, currentAssistant);
          });
      });

      const nextTopTeachers = Array.from(teacherMap.values())
        .sort((left, right) => {
          const classGap = right.classes - left.classes;
          if (classGap !== 0) {
            return classGap;
          }
          return right.students - left.students;
        })
        .slice(0, 5);

      const nextAssistants = Array.from(assistantMap.values())
        .sort((left, right) => right.classes.length - left.classes.length)
        .slice(0, 6);

      setStats({
        totalUsers,
        totalClasses: classSections.length,
        totalSubjects: subjects.length,
        pendingJoinRequests,
        teachingStaff: nextTopTeachers.length,
        assistants: assistantMap.size,
        waitingFeedback: (Number(summary?.pendingSubmissions) || 0) + (Number(summary?.pendingQuizReviews) || 0),
        totalStudents: Number(summary?.totalStudents) || classSections.reduce((sum, item) => sum + (Number(item.totalEnrollments) || 0), 0),
        classStatusCounts,
      });
      setChartData(nextChartData);
      setReviewQueue(reviewItems.slice(0, 6));
      setTopClasses(nextTopClasses);
      setTopTeachers(nextTopTeachers);
      setAssistants(nextAssistants);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("adminDashboard.errors.loadDashboard"));
      setStats(null);
      setChartData([]);
      setReviewQueue([]);
      setTopClasses([]);
      setTopTeachers([]);
      setAssistants([]);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      {
        key: "users",
        label: t("adminDashboard.stats.totalUsers"),
        value: stats.totalUsers,
        icon: <UserGroupIcon className="h-6 w-6" />,
        tone: "blue",
      },
      {
        key: "classes",
        label: t("adminDashboard.stats.totalClasses"),
        value: stats.totalClasses,
        icon: <Squares2X2Icon className="h-6 w-6" />,
        tone: "emerald",
      },
      {
        key: "pendingRequests",
        label: t("adminDashboard.stats.pendingRequests"),
        value: stats.pendingJoinRequests,
        icon: <UserPlusIcon className="h-6 w-6" />,
        tone: "amber",
      },
      {
        key: "teachers",
        label: t("adminDashboard.stats.teachers"),
        value: stats.teachingStaff,
        icon: <AcademicCapIcon className="h-6 w-6" />,
        tone: "sky",
      },
      {
        key: "assistants",
        label: t("adminDashboard.stats.assistants"),
        value: stats.assistants,
        icon: <BookOpenIcon className="h-6 w-6" />,
        tone: "violet",
      },
      {
        key: "waitingFeedback",
        label: t("adminDashboard.stats.waitingFeedback"),
        value: stats.waitingFeedback,
        icon: <ChatBubbleLeftRightIcon className="h-6 w-6" />,
        tone: "rose",
      },
    ];
  }, [stats, t]);

  const reviewQueueEmpty = reviewQueue.length === 0;

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-slate-950">
      <TeacherHeader />
      <AdminSidebar />

      <main
        className={`pt-16 pb-8 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <AppBreadcrumb className="mb-5 mt-3" />

          <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  {t("adminDashboard.header.eyebrow")}
                </p>
                <h1 className="m-0 mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {t("adminDashboard.header.title")}
                </h1>
                <p className="m-0 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t("adminDashboard.header.subtitle")}
                </p>
              </div>

              <Button icon={<ArrowPathIcon className="h-4 w-4" />} onClick={loadDashboard}>
                {t("adminDashboard.actions.refresh")}
              </Button>
            </div>

            {stats ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <HeaderChip
                  label={t("adminDashboard.header.studentsLabel")}
                  value={t("adminDashboard.header.studentsValue", { count: stats.totalStudents })}
                />
                <HeaderChip
                  label={t("adminDashboard.header.subjectsLabel")}
                  value={t("adminDashboard.header.subjectsValue", { count: stats.totalSubjects })}
                />
                <HeaderChip
                  label={t("adminDashboard.header.pendingLabel")}
                  value={t("adminDashboard.header.pendingValue", { count: stats.pendingJoinRequests })}
                />
              </div>
            ) : null}
          </section>

          {error ? (
            <Alert
              type="error"
              showIcon
              message={t("adminDashboard.errors.alertTitle")}
              description={error}
              className="mt-6"
            />
          ) : null}

          {loading ? (
            <DashboardSkeleton />
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {statCards.map((item) => (
                  <MetricCard
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    icon={item.icon}
                    tone={item.tone}
                  />
                ))}
              </div>

              {stats ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <StatusCard
                    label={t("adminDashboard.classAccess.open")}
                    value={stats.classStatusCounts.PUBLIC}
                    hint={t("adminDashboard.classAccess.openHint")}
                    tone="emerald"
                  />
                  <StatusCard
                    label={t("adminDashboard.classAccess.approval")}
                    value={stats.classStatusCounts.PRIVATE}
                    hint={t("adminDashboard.classAccess.approvalHint")}
                    tone="amber"
                  />
                  <StatusCard
                    label={t("adminDashboard.classAccess.archived")}
                    value={stats.classStatusCounts.ARCHIVED}
                    hint={t("adminDashboard.classAccess.archivedHint")}
                    tone="slate"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.85fr]">
                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <SectionHeader
                    title={t("adminDashboard.subjects.title")}
                    subtitle={t("adminDashboard.subjects.subtitle")}
                  />

                  {chartData.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-16 dark:border-slate-800">
                      <Empty description={t("adminDashboard.subjects.empty")} />
                    </div>
                  ) : (
                    <div className="mt-6 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ left: -10, right: 12, top: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis
                            dataKey="subject"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            interval={0}
                            angle={-18}
                            textAnchor="end"
                            height={54}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ fill: "transparent" }}
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) {
                                return null;
                              }

                              return (
                                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                  <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">
                                    {payload[0].payload.subject}
                                  </p>
                                  <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {t("adminDashboard.subjects.tooltip", { count: payload[0].value })}
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="count" fill="#137fec" radius={[6, 6, 0, 0]} barSize={34} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <SectionHeader
                    title={t("adminDashboard.attention.title")}
                    subtitle={t("adminDashboard.attention.subtitle")}
                  />

                  {stats ? (
                    <div className="mt-4 space-y-3">
                      <AttentionTile
                        title={t("adminDashboard.attention.pendingRequests")}
                        description={t("adminDashboard.attention.pendingRequestsHint", { count: stats.pendingJoinRequests })}
                        tone="amber"
                      />
                      <AttentionTile
                        title={t("adminDashboard.attention.waitingFeedback")}
                        description={t("adminDashboard.attention.waitingFeedbackHint", { count: stats.waitingFeedback })}
                        tone="rose"
                      />
                      <AttentionTile
                        title={t("adminDashboard.attention.assistants")}
                        description={t("adminDashboard.attention.assistantsHint", { count: stats.assistants })}
                        tone="sky"
                      />
                    </div>
                  ) : null}
                </section>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <SectionHeader
                    title={t("adminDashboard.topClasses.title")}
                    subtitle={t("adminDashboard.topClasses.subtitle")}
                    actionLabel={t("adminDashboard.topClasses.action")}
                    onAction={() => navigate("/admin/class-sections")}
                  />

                  {topClasses.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-12 dark:border-slate-800">
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("adminDashboard.topClasses.empty")} />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {topClasses.map((item, index) => (
                        <button
                          key={item.id}
                          onClick={() => navigate(`/admin/class-sections/${item.id}`)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">
                                {index + 1}. {item.title || item.classCode}
                              </p>
                              <p className="m-0 mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                {item.subjectTitle || t("adminDashboard.defaults.noSubject")} · {item.teacherName || t("adminDashboard.defaults.unknownTeacher")}
                              </p>
                            </div>
                            <Tag color={getClassAccessTone(item.status) === "emerald" ? "green" : getClassAccessTone(item.status) === "amber" ? "gold" : "default"}>
                              {t(`adminDashboard.classAccessTag.${String(item.status || "PRIVATE").toLowerCase()}`)}
                            </Tag>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{t("adminDashboard.topClasses.studentsLabel")}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {t("adminDashboard.topClasses.studentsValue", { count: item.totalEnrollments || 0 })}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{t("adminDashboard.topClasses.assistantsLabel")}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {t("adminDashboard.topClasses.assistantsValue", { count: getTeachingAssistantCount(item) })}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <SectionHeader
                    title={t("adminDashboard.teachers.title")}
                    subtitle={t("adminDashboard.teachers.subtitle")}
                  />

                  {topTeachers.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-12 dark:border-slate-800">
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("adminDashboard.teachers.empty")} />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {topTeachers.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800"
                        >
                          <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{t("adminDashboard.teachers.classesLabel")}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {t("adminDashboard.teachers.classesValue", { count: item.classes })}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{t("adminDashboard.teachers.studentsLabel")}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {t("adminDashboard.teachers.studentsValue", { count: item.students })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <SectionHeader
                    title={t("adminDashboard.assistants.title")}
                    subtitle={t("adminDashboard.assistants.subtitle")}
                  />

                  {assistants.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-12 dark:border-slate-800">
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("adminDashboard.assistants.empty")} />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {assistants.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800"
                        >
                          <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                          <p className="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {t("adminDashboard.assistants.supportingCount", { count: item.classes.length })}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.classes.slice(0, 4).map((classItem) => (
                              <button
                                key={classItem.id}
                                onClick={() => navigate(`/admin/class-sections/${classItem.id}`)}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                {classItem.title}
                              </button>
                            ))}
                            {item.classes.length > 4 ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {t("adminDashboard.assistants.moreClasses", { count: item.classes.length - 4 })}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <SectionHeader
                  title={t("adminDashboard.reviewQueue.title")}
                  subtitle={t("adminDashboard.reviewQueue.subtitle")}
                  actionLabel={t("adminDashboard.reviewQueue.action")}
                  onAction={() => navigate("/admin/assignments")}
                />

                {reviewQueueEmpty ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-12 dark:border-slate-800">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("adminDashboard.reviewQueue.empty")} />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {reviewQueue.map((item) => (
                      <button
                        key={`${item.type}-${item.submissionId || item.attemptId}`}
                        onClick={() => {
                          if (String(item.type).toUpperCase() === "QUIZ" && item.attemptId) {
                            navigate(`/admin/quiz-attempts/${item.attemptId}`);
                            return;
                          }
                          if (item.classSectionId && item.assignmentId) {
                            navigate(`/admin/class-sections/${item.classSectionId}/assignments/${item.assignmentId}/submissions`);
                          }
                        }}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Tag color={String(item.type).toUpperCase() === "QUIZ" ? "blue" : "green"}>
                                {String(item.type).toUpperCase() === "QUIZ"
                                  ? t("adminDashboard.reviewQueue.quiz")
                                  : t("adminDashboard.reviewQueue.assignment")}
                              </Tag>
                              {item.late ? (
                                <Tag color="red">{t("adminDashboard.reviewQueue.late")}</Tag>
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
                              {formatTime(item.submittedAt || item.dueAt, i18n.language, t("adminDashboard.defaults.noTime"))}
                            </p>
                            <p className="m-0 mt-1 font-semibold text-primary">
                              {t("adminDashboard.reviewQueue.open")}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.85fr]">
        <div className="h-80 animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
        <div className="h-80 animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-96 animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
        ))}
      </div>
      <div className="h-[28rem] animate-pulse rounded-[24px] bg-white shadow-sm dark:bg-slate-900" />
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

function MetricCard({ label, value, icon, tone }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
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

function StatusCard({ label, value, hint, tone }) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };

  return (
    <div className={`rounded-[24px] border p-5 ${toneMap[tone] || toneMap.slate}`}>
      <p className="m-0 text-sm font-bold">{label}</p>
      <p className="m-0 mt-3 text-3xl font-black">{value}</p>
      <p className="m-0 mt-2 text-sm opacity-80">{hint}</p>
    </div>
  );
}

function AttentionTile({ title, description, tone }) {
  const toneMap = {
    amber: "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
    rose: "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10",
    sky: "border-sky-200 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone] || toneMap.sky}`}>
      <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">{title}</p>
      <p className="m-0 mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}
