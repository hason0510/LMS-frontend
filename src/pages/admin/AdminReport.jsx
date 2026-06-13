import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Spin, Tag } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  BuildingLibraryIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentMagnifyingGlassIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassSectionReportContent from "../../components/report/ClassSectionReportContent";
import { DonutSummaryChart, SingleSeriesBarChart } from "../../components/report/ReportCharts";
import ReportMetricCard from "../../components/report/ReportMetricCard";
import ReportSectionCard from "../../components/report/ReportSectionCard";
import { getClassSections } from "../../api/classSection";
import { approveEnrollment, getAllEnrollments, rejectEnrollment } from "../../api/enrollment";
import { getAllSubjects } from "../../api/subject";
import { getAllUsers } from "../../api/user";
import { getClassPeople, getMyTeachingClasses } from "../../api/teaching";
import { getTeachingAssignments } from "../../api/assignment";
import { getManagedQuizAttempts } from "../../api/quiz";
import {
  getClassSectionGradeBook,
  getClassSectionPendingRequests,
} from "../../api/statistics";
import { collectAllPagedItems, unwrapApiData, unwrapPageItems } from "../../utils/reporting";

const REPORT_POLL_INTERVAL_MS = 30_000;

function getTeachingAssistantCount(classSection) {
  return (classSection?.teachingMembers || []).filter((member) => member.role === "TA").length;
}

export default function AdminReport() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [systemClassSections, setSystemClassSections] = useState([]);
  const [managedClassSections, setManagedClassSections] = useState([]);
  const [gradeBook, setGradeBook] = useState([]);
  const [peopleRows, setPeopleRows] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [assignmentOverviews, setAssignmentOverviews] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalClassSections: 0,
    totalSubjects: 0,
    pendingEnrollments: 0,
  });
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const selectedClassSectionId = Number(searchParams.get("classSectionId")) || null;
  const activeTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    if (!selectedClassSectionId) {
      return;
    }
    loadReportData(selectedClassSectionId);
  }, [selectedClassSectionId]);

  useEffect(() => {
    if (!selectedClassSectionId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      loadReportData(selectedClassSectionId);
    }, REPORT_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [selectedClassSectionId]);

  const updateSearchState = (classSectionId, tab = activeTab) => {
    const nextParams = new URLSearchParams();
    if (classSectionId) {
      nextParams.set("classSectionId", String(classSectionId));
    }
    if (tab && tab !== "overview") {
      nextParams.set("tab", tab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const loadPageData = async () => {
    try {
      setLoadingPage(true);
      setError(null);
      const [classSectionResponse, managedClassesResponse, usersResponse, subjectsResponse, pendingResponse] = await Promise.all([
        getClassSections(),
        getMyTeachingClasses(),
        getAllUsers(0, 1),
        getAllSubjects(),
        getAllEnrollments(1, 1, "PENDING"),
      ]);

      const sectionItems = Array.isArray(unwrapApiData(classSectionResponse))
        ? unwrapApiData(classSectionResponse)
        : [];
      const myClassItems = Array.isArray(unwrapApiData(managedClassesResponse))
        ? unwrapApiData(managedClassesResponse)
        : Array.isArray(managedClassesResponse)
        ? managedClassesResponse
        : [];
      const subjectItems = Array.isArray(unwrapApiData(subjectsResponse))
        ? unwrapApiData(subjectsResponse)
        : [];

      setSystemClassSections(sectionItems);
      setManagedClassSections(myClassItems);
      setSystemStats({
        totalUsers: usersResponse?.data?.totalElements || 0,
        totalClassSections: sectionItems.length,
        totalSubjects: subjectItems.length,
        pendingEnrollments: pendingResponse?.data?.totalElements || 0,
      });

      if (!myClassItems.length) {
        return;
      }

      const hasSelectedClass = myClassItems.some((item) => item.id === selectedClassSectionId);
      if (!hasSelectedClass) {
        updateSearchState(myClassItems[0].id, activeTab);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("reportsPage.admin.errors.loadPage"));
    } finally {
      setLoadingPage(false);
    }
  };

  const loadReportData = async (classSectionId = selectedClassSectionId) => {
    if (!classSectionId) {
      return;
    }

    try {
      setLoadingReport(true);
      setError(null);
      const [gradeBookResponse, peopleResponse, pendingRequestItems, assignmentsResponse, quizAttemptItems] = await Promise.all([
        getClassSectionGradeBook(classSectionId),
        getClassPeople(classSectionId, { status: "APPROVED" }),
        collectAllPagedItems(
          (pageNumber) => getClassSectionPendingRequests(classSectionId, pageNumber, 250),
          { startPage: 1, maxPages: 8 }
        ),
        getTeachingAssignments({ classSectionId, tab: "ALL" }),
        collectAllPagedItems(
          (page) => getManagedQuizAttempts({ classSectionId, page, size: 250 }),
          { startPage: 0, maxPages: 12, zeroBased: true }
        ),
      ]);

      setGradeBook(Array.isArray(unwrapApiData(gradeBookResponse)) ? unwrapApiData(gradeBookResponse) : []);
      setPeopleRows(Array.isArray(peopleResponse) ? peopleResponse : peopleResponse?.data || []);
      setPendingRequests(pendingRequestItems);
      setAssignmentOverviews(unwrapPageItems(assignmentsResponse));
      setQuizAttempts(quizAttemptItems);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("reportsPage.admin.errors.loadReport"));
    } finally {
      setLoadingReport(false);
    }
  };

  const currentClassSection = managedClassSections.find((item) => item.id === selectedClassSectionId) || null;
  const statusCounts = systemClassSections.reduce(
    (accumulator, item) => {
      const status = item.status || "PRIVATE";
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    },
    { PUBLIC: 0, PRIVATE: 0, ARCHIVED: 0 }
  );
  const topClasses = [...managedClassSections]
    .sort((left, right) => (Number(right.totalEnrollments) || 0) - (Number(left.totalEnrollments) || 0))
    .slice(0, 5);
  const assistantCount = useMemo(() => {
    const assistantIds = new Set();

    systemClassSections.forEach((classSection) => {
      (classSection?.teachingMembers || []).forEach((member) => {
        if (member?.role !== "TA") {
          return;
        }

        assistantIds.add(member.userId || member.id || member.email || member.username || `${classSection.id}-${member.fullName}`);
      });
    });

    return assistantIds.size;
  }, [systemClassSections]);
  const totalClassCount = systemStats.totalClassSections || systemClassSections.length || 0;
  const statusChartData = useMemo(
    () => [
      { key: "public", label: t("teaching.status.public"), value: statusCounts.PUBLIC, color: "#10b981" },
      { key: "private", label: t("teaching.status.private"), value: statusCounts.PRIVATE, color: "#f59e0b" },
      { key: "archived", label: t("teaching.status.archived"), value: statusCounts.ARCHIVED, color: "#64748b" },
    ],
    [statusCounts.ARCHIVED, statusCounts.PRIVATE, statusCounts.PUBLIC, t]
  );
  const teacherLoadChartData = useMemo(() => {
    const teacherMap = systemClassSections.reduce((accumulator, item) => {
      const teacherKey = item.teacherId || item.teacherName;
      if (!teacherKey) {
        return accumulator;
      }

      const current = accumulator.get(teacherKey) || {
        label: item.teacherName || t("reportsPage.shared.defaults.unknownTeacher"),
        value: 0,
        students: 0,
      };
      current.value += 1;
      current.students += Number(item.totalEnrollments) || 0;
      accumulator.set(teacherKey, current);
      return accumulator;
    }, new Map());

    return Array.from(teacherMap.values())
      .sort((left, right) => {
        const classGap = right.value - left.value;
        if (classGap !== 0) {
          return classGap;
        }
        return right.students - left.students;
      })
      .slice(0, 6)
      .map((item) => ({
        ...item,
        barPercent: totalClassCount > 0 ? Number(((item.value / totalClassCount) * 100).toFixed(1)) : 0,
        color: item.value >= 6 ? "#f59e0b" : "#137fec",
      }));
  }, [systemClassSections, t, totalClassCount]);
  const subjectLoadChartData = useMemo(() => {
    const subjectMap = systemClassSections.reduce((accumulator, item) => {
      const subject = item.subjectTitle || t("reportsPage.shared.defaults.noSubject");
      accumulator.set(subject, (accumulator.get(subject) || 0) + 1);
      return accumulator;
    }, new Map());

    return Array.from(subjectMap.entries())
      .map(([label, value]) => ({
        label,
        value,
        barPercent: totalClassCount > 0 ? Number(((value / totalClassCount) * 100).toFixed(1)) : 0,
        color: "#8b5cf6",
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [systemClassSections, t, totalClassCount]);

  const handleApprove = (record) => {
    modalApi.confirm({
      title: t("reportsPage.shared.modals.approve.title"),
      content: t("reportsPage.admin.modals.approve.content", { name: record.fullName }),
      okText: t("reportsPage.shared.actions.approve"),
      cancelText: t("common.huyBo"),
      okButtonProps: { icon: <CheckOutlined /> },
      async onOk() {
        try {
          await approveEnrollment(record.studentId, null, record.classSectionId);
          messageApi.success(t("reportsPage.shared.messages.approveSuccess"));
          loadReportData();
        } catch (err) {
          messageApi.error(err?.response?.data?.message || err.message || t("reportsPage.shared.errors.approveFailed"));
        }
      },
    });
  };

  const handleReject = (record) => {
    modalApi.confirm({
      title: t("reportsPage.shared.modals.reject.title"),
      content: t("reportsPage.admin.modals.reject.content", { name: record.fullName }),
      okText: t("reportsPage.shared.actions.reject"),
      cancelText: t("common.huyBo"),
      okButtonProps: { danger: true, icon: <CloseOutlined /> },
      async onOk() {
        try {
          await rejectEnrollment(record.studentId, null, record.classSectionId);
          messageApi.success(t("reportsPage.shared.messages.rejectSuccess"));
          loadReportData();
        } catch (err) {
          messageApi.error(err?.response?.data?.message || err.message || t("reportsPage.shared.errors.rejectFailed"));
        }
      },
    });
  };

  return (
    <div className="admin-report-page report-page min-h-screen bg-[#f4f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <TeacherHeader />
      <AdminSidebar />
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <div className="mx-auto w-full max-w-7xl !px-4 !py-6 sm:!px-6 lg:!px-7">
          <AppBreadcrumb className="mb-5" />

          <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#9a3412_0%,#1d4ed8_100%)] !p-5 text-white shadow-xl sm:!p-7">
            <div className="flex flex-col !gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/80">
                  <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                  {t("reportsPage.admin.hero.badge")}
                </div>
                <h1 className="m-0 mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {t("reportsPage.admin.hero.title")}
                </h1>
                <p className="m-0 mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                  {t("reportsPage.admin.hero.subtitle")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HeroInsight
                  icon={<BuildingLibraryIcon className="h-5 w-5" />}
                  label={t("reportsPage.admin.hero.scopeLabel")}
                  value={t("reportsPage.admin.hero.scopeValue", { count: systemStats.totalClassSections })}
                />
                <HeroInsight
                  icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                  label={t("reportsPage.admin.hero.modeLabel")}
                  value={t("reportsPage.admin.hero.modeValue")}
                />
              </div>
            </div>
          </section>

          <div className="mt-6">
            {error ? <Alert type="error" showIcon message={t("reportsPage.shared.alertTitle")} description={error} className="mb-6" /> : null}

            {loadingPage ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Spin size="large" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 !gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <ReportMetricCard
                    icon={<UserGroupIcon className="h-6 w-6" />}
                    label={t("reportsPage.admin.metrics.totalUsers")}
                    value={systemStats.totalUsers}
                    hint={t("reportsPage.admin.metrics.totalUsersHint")}
                    tone="blue"
                    loading={loadingPage}
                  />
                  <ReportMetricCard
                    icon={<BuildingLibraryIcon className="h-6 w-6" />}
                    label={t("reportsPage.admin.metrics.classSections")}
                    value={systemStats.totalClassSections}
                    hint={t("reportsPage.admin.metrics.classSectionsHint", {
                      public: statusCounts.PUBLIC,
                      private: statusCounts.PRIVATE,
                      archived: statusCounts.ARCHIVED,
                    })}
                    tone="emerald"
                    loading={loadingPage}
                  />
                  <ReportMetricCard
                    icon={<ChartBarIcon className="h-6 w-6" />}
                    label={t("reportsPage.admin.metrics.subjects")}
                    value={systemStats.totalSubjects}
                    hint={t("reportsPage.admin.metrics.subjectsHint")}
                    tone="amber"
                    loading={loadingPage}
                  />
                  <ReportMetricCard
                    icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                    label={t("reportsPage.admin.metrics.pendingEnrollments")}
                    value={systemStats.pendingEnrollments}
                    hint={t("reportsPage.admin.metrics.pendingEnrollmentsHint")}
                    tone="rose"
                    loading={loadingPage}
                  />
                  <ReportMetricCard
                    icon={<UserGroupIcon className="h-6 w-6" />}
                    label={t("reportsPage.admin.metrics.assistants")}
                    value={assistantCount}
                    hint={t("reportsPage.admin.metrics.assistantsHint", { count: assistantCount })}
                    tone="slate"
                    loading={loadingPage}
                  />
                </div>

                <div className="grid grid-cols-1 !gap-4 xl:grid-cols-3">
                  <ReportSectionCard
                    title={t("reportsPage.admin.sections.statusDistribution.title")}
                    subtitle={t("reportsPage.admin.sections.statusDistribution.subtitle")}
                  >
                    <DonutSummaryChart
                      data={statusChartData}
                      totalValue={systemStats.totalClassSections}
                      totalLabel={t("reportsPage.admin.charts.statusCenter")}
                      emptyText={t("reportsPage.admin.sections.statusDistribution.empty")}
                      loading={loadingPage}
                    />
                  </ReportSectionCard>

                  <ReportSectionCard
                    title={t("reportsPage.admin.sections.teacherLoad.title")}
                    subtitle={t("reportsPage.admin.sections.teacherLoad.subtitle")}
                  >
                    <SingleSeriesBarChart
                      data={teacherLoadChartData}
                      dataKey="value"
                      labelKey="label"
                      layout="vertical"
                      barPercentKey="barPercent"
                      emptyText={t("reportsPage.admin.sections.teacherLoad.empty")}
                      color="#137fec"
                      valueFormatter={(value, _, payload) =>
                        t("reportsPage.admin.charts.teacherLoadValue", {
                          classes: value,
                          students: payload?.students || 0,
                        })
                      }
                      loading={loadingPage}
                    />
                  </ReportSectionCard>

                  <ReportSectionCard
                    title={t("reportsPage.admin.sections.subjectLoad.title")}
                    subtitle={t("reportsPage.admin.sections.subjectLoad.subtitle")}
                  >
                    <SingleSeriesBarChart
                      data={subjectLoadChartData}
                      dataKey="value"
                      labelKey="label"
                      layout="vertical"
                      barPercentKey="barPercent"
                      emptyText={t("reportsPage.admin.sections.subjectLoad.empty")}
                      color="#8b5cf6"
                      valueFormatter={(value) => t("reportsPage.admin.charts.subjectLoadValue", { count: value })}
                      loading={loadingPage}
                    />
                  </ReportSectionCard>
                </div>

                <ReportSectionCard
                  title={t("reportsPage.admin.sections.topClasses.title")}
                  subtitle={t("reportsPage.admin.sections.topClasses.subtitle")}
                >
                  <div className="space-y-3">
                    {topClasses.length === 0 ? (
                      <p className="m-0 text-sm text-slate-500 dark:text-slate-400">{t("reportsPage.admin.sections.topClasses.empty")}</p>
                    ) : (
                      topClasses.map((item, index) => (
                        <button
                          key={item.id}
                          onClick={() => updateSearchState(item.id, activeTab)}
                          className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
                            item.id === selectedClassSectionId
                              ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                              : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/60"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">
                              {index + 1}. {item.title || item.classCode}
                            </p>
                            <p className="m-0 mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {item.subjectTitle || t("reportsPage.shared.defaults.noSubject")} · {item.teacherName || t("reportsPage.shared.defaults.unknownTeacher")}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <Tag color="blue">{t("reportsPage.admin.sections.topClasses.students", { count: item.totalEnrollments || 0 })}</Tag>
                            <Tag>{t("reportsPage.admin.sections.topClasses.assistants", { count: getTeachingAssistantCount(item) })}</Tag>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ReportSectionCard>

                <ClassSectionReportContent
                  classSections={managedClassSections}
                  selectedClassSectionId={selectedClassSectionId}
                  onSelectClassSection={(classSectionId) => updateSearchState(classSectionId, activeTab)}
                  currentClassSection={currentClassSection}
                  loading={loadingReport}
                  gradeBook={gradeBook}
                  peopleRows={peopleRows}
                  pendingRequests={pendingRequests}
                  assignmentOverviews={assignmentOverviews}
                  quizAttempts={quizAttempts}
                  activeTab={activeTab}
                  onTabChange={(tab) => updateSearchState(selectedClassSectionId, tab)}
                  onApproveRequest={handleApprove}
                  onRejectRequest={handleReject}
                  workspaceBasePath="/admin"
                  selectorLabel={t("reportsPage.admin.selectorLabel")}
                  emptyMessage={t("reportsPage.admin.emptyMessage")}
                  extendedInsights
                />

                {managedClassSections.length > 0 ? (
                  <div className="flex justify-end">
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        loadPageData();
                        loadReportData();
                      }}
                      loading={loadingPage || loadingReport}
                    >
                      {t("reportsPage.admin.actions.reload")}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function HeroInsight({ icon, label, value }) {
  return (
    <div className="!rounded-2xl border border-white/15 bg-white/10 !p-4 backdrop-blur-sm">
      <div className="flex items-center !gap-2 text-white/80">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="!m-0 !mt-3 text-lg font-black text-white">{value}</p>
    </div>
  );
}
