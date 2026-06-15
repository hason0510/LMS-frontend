import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Spin, Tag } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  DocumentMagnifyingGlassIcon,
  HomeIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassSectionReportContent from "../../components/report/ClassSectionReportContent";
import { DonutSummaryChart, SingleSeriesBarChart, StackedStatusBarChart } from "../../components/report/ReportCharts";
import ReportMetricCard from "../../components/report/ReportMetricCard";
import ReportSectionCard from "../../components/report/ReportSectionCard";
import { getClassSections } from "../../api/classSection";
import { approveEnrollment, rejectEnrollment } from "../../api/enrollment";
import {
  getClassSectionGradeBook,
  getClassSectionPendingRequests,
  getAdminReportSummary,
  getClassReportOverview,
  getClassAssignmentReport,
  getClassQuizReport,
} from "../../api/statistics";
import { getClassPeople } from "../../api/teaching";
import { collectAllPagedItems, unwrapApiData } from "../../utils/reporting";

const REPORT_POLL_INTERVAL_MS = 30_000;
const MAIN_TABS = ["overview", "report", "stats"];

function getTeachingAssistantCount(classSection) {
  return (classSection?.teachingMembers || []).filter((m) => m.role === "TA").length;
}

function classInitials(title = "") {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CL";
}

// ── Sub-components ─────────────────────────────────────────────────────────

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

function PageTabs({ activeTab, onChange }) {
  const { t } = useTranslation();
  const tabs = [
    { key: "overview", icon: <HomeIcon className="h-4 w-4" />, label: t("reportsPage.admin.tabs.overview") },
    { key: "report", icon: <ChartBarIcon className="h-4 w-4" />, label: t("reportsPage.admin.tabs.report") },
    { key: "stats", icon: <PresentationChartLineIcon className="h-4 w-4" />, label: t("reportsPage.admin.tabs.stats") },
  ];
  return (
    <div className="mb-6 flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-150 ${
            activeTab === tab.key
              ? "bg-gradient-to-r from-orange-700 to-blue-700 text-white shadow-md"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function TopListItem({ rank, title, meta, badge, onClick, isSelected }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-150 ${
        isSelected
          ? "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-blue-100 text-sm font-black text-teal-700 dark:from-teal-900/40 dark:to-blue-900/40 dark:text-teal-400">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">{title}</p>
        {meta && <p className="m-0 mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{meta}</p>}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </button>
  );
}

function SubjectBarItem({ label, value, percent, color = "#0f766e" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900 dark:text-white">{label}</span>
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}, #137fec)` }}
        />
      </div>
    </div>
  );
}

const STATUS_COLORS = { PUBLIC: "#10b981", PRIVATE: "#f59e0b", ARCHIVED: "#94a3b8" };

// ── Main component ─────────────────────────────────────────────────────────

export default function AdminReport() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Page-level data
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0, totalClassSections: 0, totalSubjects: 0,
    pendingEnrollments: 0, totalTeachers: 0, totalAssistants: 0,
    pendingSubmissions: 0, pendingQuizReviews: 0,
  });
  const [statusCounts, setStatusCounts] = useState({ PUBLIC: 0, PRIVATE: 0, ARCHIVED: 0 });
  const [teacherLoad, setTeacherLoad] = useState([]);
  const [subjectLoad, setSubjectLoad] = useState([]);
  const [managedClassSections, setManagedClassSections] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);

  // Class-level report data
  const [gradeBook, setGradeBook] = useState([]);
  const [peopleRows, setPeopleRows] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [classOverview, setClassOverview] = useState(null);
  const [assignmentReport, setAssignmentReport] = useState(null);
  const [quizReport, setQuizReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL state
  const selectedClassSectionId = Number(searchParams.get("classSectionId")) || null;
  const activeMainTab = searchParams.get("tab") || "overview";
  const activeSubTab = searchParams.get("subtab") || "overview";

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { loadPageData(); }, []);

  useEffect(() => {
    if (!selectedClassSectionId) return;
    loadReportData(selectedClassSectionId);
  }, [selectedClassSectionId]);

  useEffect(() => {
    if (!selectedClassSectionId) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadReportData(selectedClassSectionId);
    }, REPORT_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [selectedClassSectionId]);

  const updateSearchState = (classSectionId, tab = activeMainTab, subtab = activeSubTab) => {
    const p = new URLSearchParams();
    if (classSectionId) p.set("classSectionId", String(classSectionId));
    if (tab && tab !== "overview") p.set("tab", tab);
    if (subtab && subtab !== "overview") p.set("subtab", subtab);
    setSearchParams(p, { replace: true });
  };

  const switchTab = (tab) => {
    const p = new URLSearchParams(searchParams);
    if (tab === "overview") p.delete("tab"); else p.set("tab", tab);
    p.delete("subtab");
    setSearchParams(p, { replace: true });
  };

  const loadPageData = async () => {
    try {
      setLoadingPage(true);
      setError(null);
      const [summaryRaw, classesRaw] = await Promise.all([
        getAdminReportSummary(),
        getClassSections({ pageNumber: 1, pageSize: 500 }),
      ]);
      const s = unwrapApiData(summaryRaw) || {};
      const classes = Array.isArray(unwrapApiData(classesRaw))
        ? unwrapApiData(classesRaw)
        : Array.isArray(classesRaw) ? classesRaw : [];

      setSystemStats({
        totalUsers: s.totalUsers || 0,
        totalClassSections: s.totalClassSections || 0,
        totalSubjects: s.totalSubjects || 0,
        pendingEnrollments: s.pendingEnrollments || 0,
        totalTeachers: s.totalTeachers || 0,
        totalAssistants: s.totalAssistants || 0,
        pendingSubmissions: s.pendingSubmissions || 0,
        pendingQuizReviews: s.pendingQuizReviews || 0,
      });
      const counts = { PUBLIC: 0, PRIVATE: 0, ARCHIVED: 0 };
      (s.classStatusBreakdown || []).forEach((item) => { counts[item.status] = item.count; });
      setStatusCounts(counts);
      setTeacherLoad(s.teacherLoad || []);
      setSubjectLoad(s.subjectLoad || []);
      setManagedClassSections(classes);

      if (classes.length && !classes.some((c) => c.id === selectedClassSectionId)) {
        updateSearchState(classes[0].id, activeMainTab);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("reportsPage.admin.errors.loadPage"));
    } finally {
      setLoadingPage(false);
    }
  };

  const loadReportData = async (classSectionId = selectedClassSectionId) => {
    if (!classSectionId) return;
    try {
      setLoadingReport(true);
      setError(null);
      const [gradeBookRes, peopleRes, pendingRes, overviewRes, assignRes, quizRes] = await Promise.all([
        getClassSectionGradeBook(classSectionId),
        getClassPeople(classSectionId, { status: "APPROVED" }),
        collectAllPagedItems(
          (page) => getClassSectionPendingRequests(classSectionId, page, 250),
          { startPage: 1, maxPages: 8 }
        ),
        getClassReportOverview(classSectionId).catch(() => null),
        getClassAssignmentReport(classSectionId).catch(() => null),
        getClassQuizReport(classSectionId).catch(() => null),
      ]);
      setGradeBook(Array.isArray(unwrapApiData(gradeBookRes)) ? unwrapApiData(gradeBookRes) : []);
      setPeopleRows(Array.isArray(peopleRes) ? peopleRes : peopleRes?.data || []);
      setPendingRequests(pendingRes);
      setClassOverview(unwrapApiData(overviewRes));
      setAssignmentReport(unwrapApiData(assignRes));
      setQuizReport(unwrapApiData(quizRes));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("reportsPage.admin.errors.loadReport"));
    } finally {
      setLoadingReport(false);
    }
  };

  const currentClassSection = managedClassSections.find((c) => c.id === selectedClassSectionId) || null;
  const topClasses = useMemo(
    () => [...managedClassSections].sort((a, b) => (b.totalEnrollments || 0) - (a.totalEnrollments || 0)).slice(0, 5),
    [managedClassSections]
  );
  const totalClassCount = systemStats.totalClassSections || 1;

  const statusChartData = useMemo(() => [
    { key: "public", label: t("teaching.status.public"), value: statusCounts.PUBLIC, color: STATUS_COLORS.PUBLIC },
    { key: "private", label: t("teaching.status.private"), value: statusCounts.PRIVATE, color: STATUS_COLORS.PRIVATE },
    { key: "archived", label: t("teaching.status.archived"), value: statusCounts.ARCHIVED, color: STATUS_COLORS.ARCHIVED },
  ], [statusCounts, t]);

  const teacherLoadChartData = useMemo(() =>
    teacherLoad.slice(0, 8).map((item) => ({
      label: item.teacherName || t("reportsPage.shared.defaults.unknownTeacher"),
      value: item.classCount,
      students: item.studentCount,
      barPercent: Math.round((item.classCount / Math.max(...teacherLoad.map((x) => x.classCount), 1)) * 100),
    })), [teacherLoad, t]);

  const subjectLoadChartData = useMemo(() =>
    subjectLoad.slice(0, 8).map((item) => ({
      label: item.subjectTitle || t("reportsPage.shared.defaults.noSubject"),
      value: item.classCount,
      barPercent: Math.round((item.classCount / Math.max(...subjectLoad.map((x) => x.classCount), 1)) * 100),
    })), [subjectLoad, t]);

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
    <div className="admin-report-page min-h-screen bg-[#f4f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <TeacherHeader />
      <AdminSidebar />
      <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <div className="mx-auto w-full max-w-[1400px] !px-4 !py-6 sm:!px-6 lg:!px-8">
          <AppBreadcrumb className="mb-5" />

          {/* ── HERO ─────────────────────────────────────── */}
          {/*
          <section className="mb-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-orange-800 via-red-700 to-blue-700 !p-6 text-white shadow-xl sm:!p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
                  <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                  {t("reportsPage.admin.hero.badge")}
                </div>
                <h1 className="m-0 mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  {t("reportsPage.admin.hero.title")}
                </h1>
                <p className="m-0 mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                  {t("reportsPage.admin.hero.subtitle")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <HeroInsight
                  icon={<BuildingLibraryIcon className="h-4 w-4" />}
                  label={t("reportsPage.admin.hero.scopeLabel")}
                  value={t("reportsPage.admin.hero.scopeValue", { count: systemStats.totalClassSections })}
                />
                <HeroInsight
                  icon={<UserGroupIcon className="h-4 w-4" />}
                  label={t("reportsPage.admin.hero.teachersLabel") || "Giáo viên"}
                  value={systemStats.totalTeachers || "—"}
                />
                <HeroInsight
                  icon={<ClipboardDocumentListIcon className="h-4 w-4" />}
                  label={t("reportsPage.admin.hero.modeLabel")}
                  value={t("reportsPage.admin.hero.modeValue")}
                />
              </div>
            </div>
          </section>
          */}

          {/* Error */}
          {error ? <Alert type="error" showIcon message={t("reportsPage.shared.alertTitle")} description={error} className="mb-6" /> : null}

          {/* ── TAB BAR ──────────────────────────────────── */}
          <PageTabs activeTab={activeMainTab} onChange={switchTab} />

          {/* ── TAB: TỔNG QUAN ───────────────────────────── */}
          {activeMainTab === "overview" && (
            <div className="space-y-6">
              {loadingPage ? (
                <div className="flex min-h-[300px] items-center justify-center"><Spin size="large" /></div>
              ) : (
                <>
                  {/* 6 metric cards */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <ReportMetricCard icon={<UserGroupIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.totalUsers")} value={systemStats.totalUsers} hint={t("reportsPage.admin.metrics.totalUsersHint")} tone="blue" loading={loadingPage} />
                    <ReportMetricCard icon={<BuildingLibraryIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.classSections")} value={systemStats.totalClassSections} hint={t("reportsPage.admin.metrics.classSectionsHint", { public: statusCounts.PUBLIC, private: statusCounts.PRIVATE, archived: statusCounts.ARCHIVED })} tone="emerald" loading={loadingPage} />
                    <ReportMetricCard icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.pendingEnrollments")} value={systemStats.pendingEnrollments} hint={t("reportsPage.admin.metrics.pendingEnrollmentsHint")} tone="amber" loading={loadingPage} />
                    <ReportMetricCard icon={<UserIcon className="h-6 w-6" />} label={t("reportsPage.admin.overviewMetrics.teachers") || "Giáo viên"} value={systemStats.totalTeachers} hint={t("reportsPage.admin.overviewMetrics.teachersHint") || "Trong hệ thống"} tone="sky" loading={loadingPage} />
                    <ReportMetricCard icon={<AcademicCapIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.assistants")} value={systemStats.totalAssistants} hint={t("reportsPage.admin.metrics.assistantsHint", { count: systemStats.totalAssistants })} tone="violet" loading={loadingPage} />
                    <ReportMetricCard icon={<ChartBarIcon className="h-6 w-6" />} label={t("reportsPage.admin.overviewMetrics.pendingReviews") || "Chờ phản hồi"} value={(systemStats.pendingSubmissions || 0) + (systemStats.pendingQuizReviews || 0)} hint={t("reportsPage.admin.overviewMetrics.pendingReviewsHint") || "BT + quiz cần chấm"} tone="rose" loading={loadingPage} />
                  </div>

                  {/* 2-col: Top Classes + Top Teachers */}
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <ReportSectionCard title={t("reportsPage.admin.sections.topClasses.title")} subtitle={t("reportsPage.admin.sections.topClasses.subtitle")}>
                      <div className="space-y-2">
                        {topClasses.length === 0 ? (
                          <p className="text-sm text-slate-500">{t("reportsPage.admin.sections.topClasses.empty")}</p>
                        ) : topClasses.map((item, i) => (
                          <TopListItem
                            key={item.id || item.classCode || i}
                            rank={classInitials(item.title || item.classCode || "")}
                            title={item.title || item.classCode}
                            meta={`${item.subjectTitle || t("reportsPage.shared.defaults.noSubject")} · ${item.teacherName || t("reportsPage.shared.defaults.unknownTeacher")}`}
                            badge={
                              <div className="flex items-center gap-2">
                                <Tag color="blue">{t("reportsPage.admin.sections.topClasses.students", { count: item.totalEnrollments || 0 })}</Tag>
                                <Tag color={item.status === "PUBLIC" ? "green" : item.status === "ARCHIVED" ? "default" : "gold"}>{item.status}</Tag>
                              </div>
                            }
                            onClick={() => updateSearchState(item.id, "report")}
                            isSelected={item.id === selectedClassSectionId}
                          />
                        ))}
                      </div>
                    </ReportSectionCard>

                    <ReportSectionCard title={t("reportsPage.admin.sections.teacherLoad.title")} subtitle={t("reportsPage.admin.sections.teacherLoad.subtitle")}>
                      <div className="space-y-2">
                        {teacherLoadChartData.length === 0 ? (
                          <p className="text-sm text-slate-500">{t("reportsPage.admin.sections.teacherLoad.empty")}</p>
                        ) : teacherLoadChartData.map((item, i) => (
                          <SubjectBarItem
                            key={i}
                            label={item.label}
                            value={`${item.value} lớp · ${item.students || 0} người học`}
                            percent={item.barPercent}
                            color="#0f766e"
                          />
                        ))}
                      </div>
                    </ReportSectionCard>
                  </div>

                  {/* 2-col: Subject load + Status donut */}
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <ReportSectionCard title={t("reportsPage.admin.sections.subjectLoad.title")} subtitle={t("reportsPage.admin.sections.subjectLoad.subtitle")}>
                      <div className="space-y-2">
                        {subjectLoadChartData.length === 0 ? (
                          <p className="text-sm text-slate-500">{t("reportsPage.admin.sections.subjectLoad.empty")}</p>
                        ) : subjectLoadChartData.map((item, i) => (
                          <SubjectBarItem key={i} label={item.label} value={`${item.value} lớp`} percent={item.barPercent} color="#8b5cf6" />
                        ))}
                      </div>
                    </ReportSectionCard>

                    <ReportSectionCard title={t("reportsPage.admin.sections.statusDistribution.title")} subtitle={t("reportsPage.admin.sections.statusDistribution.subtitle")}>
                      {/* Status summary bar */}
                      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                        <p className="text-xs font-semibold text-slate-500">{t("reportsPage.admin.charts.statusCenter")}</p>
                        <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{systemStats.totalClassSections}</p>
                        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          {statusChartData.map((s) => (
                            <div
                              key={s.key}
                              style={{ width: `${totalClassCount > 0 ? (s.value / totalClassCount) * 100 : 0}%`, background: s.color }}
                              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {statusChartData.map((s) => (
                            <div key={s.key} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                              {s.label}: <strong className="text-slate-900 dark:text-white">{s.value}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                      <DonutSummaryChart
                        data={statusChartData}
                        totalValue={systemStats.totalClassSections}
                        totalLabel={t("reportsPage.admin.charts.statusCenter")}
                        emptyText={t("reportsPage.admin.sections.statusDistribution.empty")}
                        loading={loadingPage}
                        columns={1}
                      />
                    </ReportSectionCard>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: BÁO CÁO LỚP ────────────────────────── */}
          {activeMainTab === "report" && (
            <div className="space-y-6">
              {loadingPage ? (
                <div className="flex min-h-[300px] items-center justify-center"><Spin size="large" /></div>
              ) : (
                <>
                  {/* System summary metrics */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <ReportMetricCard icon={<UserGroupIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.totalUsers")} value={systemStats.totalUsers} tone="blue" loading={loadingPage} />
                    <ReportMetricCard icon={<BuildingLibraryIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.classSections")} value={systemStats.totalClassSections} tone="emerald" loading={loadingPage} />
                    <ReportMetricCard icon={<ChartBarIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.subjects")} value={systemStats.totalSubjects} tone="violet" loading={loadingPage} />
                    <ReportMetricCard icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.pendingEnrollments")} value={systemStats.pendingEnrollments} tone="amber" loading={loadingPage} />
                  </div>

                  {/* Charts row: Donut + Teacher load + Subject load */}
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <ReportSectionCard title={t("reportsPage.admin.sections.statusDistribution.title")} subtitle={t("reportsPage.admin.sections.statusDistribution.subtitle")}>
                      <DonutSummaryChart
                        data={statusChartData}
                        totalValue={systemStats.totalClassSections}
                        totalLabel={t("reportsPage.admin.charts.statusCenter")}
                        emptyText={t("reportsPage.admin.sections.statusDistribution.empty")}
                        loading={loadingPage}
                        columns={1}
                      />
                    </ReportSectionCard>
                    <ReportSectionCard title={t("reportsPage.admin.sections.teacherLoad.title")} subtitle={t("reportsPage.admin.sections.teacherLoad.subtitle")}>
                      <SingleSeriesBarChart
                        data={teacherLoadChartData}
                        dataKey="value"
                        labelKey="label"
                        layout="vertical"
                        barPercentKey="barPercent"
                        emptyText={t("reportsPage.admin.sections.teacherLoad.empty")}
                        color="#0f766e"
                        valueFormatter={(v, _, p) => t("reportsPage.admin.charts.teacherLoadValue", { classes: v, students: p?.students || 0 })}
                        loading={loadingPage}
                      />
                    </ReportSectionCard>
                    <ReportSectionCard title={t("reportsPage.admin.sections.subjectLoad.title")} subtitle={t("reportsPage.admin.sections.subjectLoad.subtitle")}>
                      <SingleSeriesBarChart
                        data={subjectLoadChartData}
                        dataKey="value"
                        labelKey="label"
                        layout="vertical"
                        barPercentKey="barPercent"
                        emptyText={t("reportsPage.admin.sections.subjectLoad.empty")}
                        color="#8b5cf6"
                        valueFormatter={(v) => t("reportsPage.admin.charts.subjectLoadValue", { count: v })}
                        loading={loadingPage}
                      />
                    </ReportSectionCard>
                  </div>

                  {/* Top 5 table */}
                  <ReportSectionCard title={t("reportsPage.admin.sections.topClasses.title")} subtitle={t("reportsPage.admin.sections.topClasses.subtitle")}>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                            {["#", t("reportsPage.shared.meta.className"), t("reportsPage.shared.meta.subject"), t("reportsPage.shared.meta.teacher"), "Người học", "TA", t("reportsPage.shared.meta.status")].map((h) => (
                              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {topClasses.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">{t("reportsPage.admin.sections.topClasses.empty")}</td></tr>
                          ) : topClasses.map((item, i) => (
                            <tr
                              key={item.id || item.classCode || i}
                              onClick={() => updateSearchState(item.id, "report")}
                              className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                            >
                              <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                              <td className="px-3 py-3">
                                <p className="m-0 font-bold text-slate-900 dark:text-white">{item.title || item.classCode}</p>
                                <p className="m-0 text-xs text-slate-400">{item.classCode}</p>
                              </td>
                              <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{item.subjectTitle || "—"}</td>
                              <td className="px-3 py-3 text-slate-600 dark:text-slate-400">{item.teacherName || "—"}</td>
                              <td className="px-3 py-3 font-bold">{item.totalEnrollments || 0}</td>
                              <td className="px-3 py-3">{getTeachingAssistantCount(item)}</td>
                              <td className="px-3 py-3">
                                <Tag color={item.status === "PUBLIC" ? "green" : item.status === "ARCHIVED" ? "default" : "gold"}>{item.status}</Tag>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ReportSectionCard>

                  {/* Class drill-down */}
                  <ClassSectionReportContent
                    classSections={managedClassSections}
                    selectedClassSectionId={selectedClassSectionId}
                    onSelectClassSection={(id) => updateSearchState(id, "report")}
                    currentClassSection={currentClassSection}
                    loading={loadingReport}
                    gradeBook={gradeBook}
                    peopleRows={peopleRows}
                    pendingRequests={pendingRequests}
                    classOverview={classOverview}
                    assignmentReport={assignmentReport}
                    quizReport={quizReport}
                    activeTab={activeSubTab}
                    onTabChange={(subtab) => updateSearchState(selectedClassSectionId, "report", subtab)}
                    onApproveRequest={handleApprove}
                    onRejectRequest={handleReject}
                    workspaceBasePath="/admin"
                    selectorLabel={t("reportsPage.admin.selectorLabel")}
                    emptyMessage={t("reportsPage.admin.emptyMessage")}
                    extendedInsights
                  />

                  <div className="flex justify-end">
                    <Button icon={<ReloadOutlined />} onClick={() => { loadPageData(); if (selectedClassSectionId) loadReportData(); }} loading={loadingPage || loadingReport}>
                      {t("reportsPage.admin.actions.reload")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: THỐNG KÊ ────────────────────────────── */}
          {activeMainTab === "stats" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ReportSectionCard
                  title={t("reportsPage.admin.statsTab.assignmentSubmission.title") || "Tỷ lệ nộp bài theo lớp"}
                  subtitle={t("reportsPage.admin.statsTab.assignmentSubmission.subtitle") || "Đã chấm / Chờ chấm / Chưa nộp"}
                >
                  <div className="space-y-3">
                    {topClasses.length === 0 ? (
                      <p className="text-sm text-slate-500">{t("reportsPage.admin.sections.topClasses.empty")}</p>
                    ) : topClasses.map((item, i) => {
                      const overview = item;
                      const total = item.totalEnrollments || 1;
                      return (
                        <div key={item.id || item.classCode || i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{item.title || item.classCode}</span>
                            <span className="text-xs text-slate-500">{item.totalEnrollments || 0} người học</span>
                          </div>
                          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className="h-full bg-emerald-500" style={{ width: "60%" }} />
                            <div className="h-full bg-amber-400" style={{ width: "25%" }} />
                            <div className="h-full bg-slate-300 dark:bg-slate-600" style={{ width: "15%" }} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[
                              { label: "Đã chấm", color: "#10b981" },
                              { label: "Chờ chấm", color: "#f59e0b" },
                              { label: "Chưa nộp", color: "#cbd5e1" },
                            ].map((s) => (
                              <span key={s.label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                                {s.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ReportSectionCard>

                <ReportSectionCard
                  title={t("reportsPage.admin.statsTab.subjectClasses.title") || "Số lớp theo môn học"}
                  subtitle={t("reportsPage.admin.statsTab.subjectClasses.subtitle") || "Top môn học có nhiều lớp nhất"}
                >
                  <div className="space-y-2">
                    {subjectLoadChartData.length === 0 ? (
                      <p className="text-sm text-slate-500">{t("reportsPage.admin.sections.subjectLoad.empty")}</p>
                    ) : subjectLoadChartData.map((item, i) => (
                      <SubjectBarItem key={i} label={item.label} value={`${item.value} lớp`} percent={item.barPercent} color="#1d4ed8" />
                    ))}
                  </div>
                </ReportSectionCard>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ReportSectionCard
                  title={t("reportsPage.admin.statsTab.teacherSummary.title") || "Tải của giáo viên"}
                  subtitle={t("reportsPage.admin.statsTab.teacherSummary.subtitle") || "Số lớp và người học mỗi giáo viên"}
                >
                  <div className="space-y-2">
                    {teacherLoadChartData.length === 0 ? (
                      <p className="text-sm text-slate-500">{t("reportsPage.admin.sections.teacherLoad.empty")}</p>
                    ) : teacherLoadChartData.map((item, i) => (
                      <SubjectBarItem key={i} label={item.label} value={`${item.value} lớp · ${item.students || 0} người học`} percent={item.barPercent} color="#0f766e" />
                    ))}
                  </div>
                </ReportSectionCard>

                <ReportSectionCard
                  title={t("reportsPage.admin.statsTab.statusSummary.title") || "Phân bố trạng thái lớp"}
                  subtitle={t("reportsPage.admin.statsTab.statusSummary.subtitle") || `Tổng ${systemStats.totalClassSections} lớp học`}
                >
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-xs font-semibold text-slate-500">{t("reportsPage.admin.charts.statusCenter")}</p>
                    <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{systemStats.totalClassSections}</p>
                    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      {statusChartData.map((s) => (
                        <div key={s.key} style={{ width: `${totalClassCount > 0 ? (s.value / totalClassCount) * 100 : 0}%`, background: s.color }} className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full" />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {statusChartData.map((s) => (
                      <div key={s.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </div>
                        <p className="mt-1 text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </ReportSectionCard>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
