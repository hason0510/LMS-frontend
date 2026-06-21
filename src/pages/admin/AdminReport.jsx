import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Empty, Spin } from "antd";
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
  UserGroupIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassSectionReportContent from "../../components/report/ClassSectionReportContent";
import { DonutSummaryChart, SingleSeriesBarChart } from "../../components/report/ReportCharts";
import PaginatedLoadChart from "../../components/report/PaginatedLoadChart";
import AssistantListSection from "../../components/report/AssistantListSection";
import ReportMetricCard from "../../components/report/ReportMetricCard";
import ReportSectionCard from "../../components/report/ReportSectionCard";
import { getClassSections } from "../../api/classSection";
import { approveEnrollment, rejectEnrollment } from "../../api/enrollment";
import {
  getClassSectionGradeBook,
  getClassSectionPendingRequests,
  getAdminReportSummary,
  getAdminTeacherLoad,
  getAdminSubjectLoad,
  getAdminAssistants,
  getClassReportOverview,
  getClassAssignmentReport,
  getClassQuizReport,
} from "../../api/statistics";
import { getClassPeople } from "../../api/teaching";
import { collectAllPagedItems, unwrapApiData } from "../../utils/reporting";

const REPORT_POLL_INTERVAL_MS = 30_000;
const MAIN_TABS = ["overview", "report"];

// ── Sub-components ─────────────────────────────────────────────────────────

function PageTabs({ activeTab, onChange }) {
  const { t } = useTranslation();
  const tabs = [
    { key: "overview", icon: <HomeIcon className="h-4 w-4" />, label: t("reportsPage.admin.tabs.overview") },
    { key: "report", icon: <ChartBarIcon className="h-4 w-4" />, label: t("reportsPage.admin.tabs.report") },
  ];
  return (
    <div className="mb-6 flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-150 ${
            activeTab === tab.key
              ? "bg-gradient-to-r from-orange-700 to-blue-700 !text-white shadow-md"
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
  const activeMainTab = MAIN_TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "overview";
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
      setManagedClassSections(classes);

      if (classes.length && !classes.some((c) => c.id === selectedClassSectionId)) {
        if (selectedClassSectionId) {
          messageApi.warning(
            t("report.invalidClassRedirect", "Lớp không tồn tại hoặc bạn không có quyền, đã chuyển về lớp đầu tiên.")
          );
        }
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
    () => [...managedClassSections].sort((a, b) => (b.totalEnrollments || 0) - (a.totalEnrollments || 0)).slice(0, 8),
    [managedClassSections]
  );

  const statusChartData = useMemo(() => [
    { key: "public", label: t("teaching.status.public"), value: statusCounts.PUBLIC, color: STATUS_COLORS.PUBLIC },
    { key: "private", label: t("teaching.status.private"), value: statusCounts.PRIVATE, color: STATUS_COLORS.PRIVATE },
    { key: "archived", label: t("teaching.status.archived"), value: statusCounts.ARCHIVED, color: STATUS_COLORS.ARCHIVED },
  ], [statusCounts, t]);

  // [4] Top lớp đông người học nhất (bar ngang, top 8, không phân trang)
  const topClassesChartData = useMemo(() =>
    topClasses.map((item) => ({
      label: item.title || item.classCode || "—",
      value: Number(item.totalEnrollments) || 0,
      color: "#137fec",
    })), [topClasses]);

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
                  label={t("reportsPage.admin.hero.teachersLabel") || "Giảng viên"}
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
                    <ReportMetricCard icon={<UserGroupIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.totalUsers")} value={systemStats.totalUsers} tone="blue" loading={loadingPage} />
                    <ReportMetricCard icon={<BuildingLibraryIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.classSections")} value={systemStats.totalClassSections} tone="emerald" loading={loadingPage} />
                    <ReportMetricCard icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.pendingEnrollments")} value={systemStats.pendingEnrollments} tone="amber" loading={loadingPage} />
                    <ReportMetricCard icon={<UserIcon className="h-6 w-6" />} label={t("reportsPage.admin.overviewMetrics.teachers") || "Giảng viên"} value={systemStats.totalTeachers} tone="sky" loading={loadingPage} />
                    <ReportMetricCard icon={<AcademicCapIcon className="h-6 w-6" />} label={t("reportsPage.admin.metrics.assistants")} value={systemStats.totalAssistants} tone="violet" loading={loadingPage} />
                    <ReportMetricCard icon={<ChartBarIcon className="h-6 w-6" />} label={t("reportsPage.admin.overviewMetrics.pendingReviews") || "Chờ phản hồi"} value={(systemStats.pendingSubmissions || 0) + (systemStats.pendingQuizReviews || 0)} tone="rose" loading={loadingPage} />
                  </div>

                  {/* ── Lưới 2×2 biểu đồ ──────────────────────── */}
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {/* [1] Donut – phân bố trạng thái lớp */}
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

                    {/* [4] Top lớp đông người học nhất */}
                    <ReportSectionCard title="Top lớp đông người học nhất" subtitle="Xếp theo số người học đã được duyệt (top 8)">
                      <SingleSeriesBarChart
                        data={topClassesChartData}
                        dataKey="value"
                        labelKey="label"
                        layout="vertical"
                        emptyText={t("reportsPage.admin.sections.topClasses.empty")}
                        color="#137fec"
                        valueFormatter={(v) => `${v} người học`}
                        loading={loadingPage}
                      />
                    </ReportSectionCard>

                    {/* [2] Tải của giảng viên – tìm kiếm + sắp xếp + phân trang */}
                    <PaginatedLoadChart
                      title={t("reportsPage.admin.sections.teacherLoad.title")}
                      subtitle="Số lớp mỗi giảng viên phụ trách"
                      fetcher={getAdminTeacherLoad}
                      mapItem={(it) => ({ id: it.teacherId, label: it.teacherName || t("reportsPage.shared.defaults.unknownTeacher"), value: it.classCount })}
                      searchPlaceholder="Tìm giảng viên..."
                      unitLabel="lớp"
                      color="#1d4ed8"
                      totalClasses={systemStats.totalClassSections}
                      entityLabel="GV"
                      emptyText={t("reportsPage.admin.sections.teacherLoad.empty")}
                    />

                    {/* [3] Tải theo môn học – tìm kiếm + sắp xếp + phân trang */}
                    <PaginatedLoadChart
                      title={t("reportsPage.admin.sections.subjectLoad.title")}
                      subtitle="Số lớp mỗi môn đang mở"
                      fetcher={getAdminSubjectLoad}
                      mapItem={(it) => ({ id: it.subjectId, label: it.subjectTitle || t("reportsPage.shared.defaults.noSubject"), value: it.classCount })}
                      searchPlaceholder="Tìm môn học..."
                      unitLabel="lớp"
                      color="#0f766e"
                      totalClasses={systemStats.totalClassSections}
                      entityLabel="môn"
                      emptyText={t("reportsPage.admin.sections.subjectLoad.empty")}
                    />
                  </div>

                  {/* ── Danh sách Trợ giảng (TA) ──────────────── */}
                  <AssistantListSection fetcher={getAdminAssistants} />
                </>
              )}
            </div>
          )}

          {/* ── TAB: BÁO CÁO LỚP ────────────────────────── */}
          {activeMainTab === "report" && (
            <div className="space-y-6">
              {loadingPage ? (
                <div className="flex min-h-[300px] items-center justify-center"><Spin size="large" /></div>
              ) : managedClassSections.length === 0 ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <Empty description={t("report.noClassesForReport", "Bạn chưa có lớp nào để xem báo cáo")} />
                </div>
              ) : (
                <>
                  {/* Chỉ giữ phần chọn lớp báo cáo trở xuống (giống trang giảng viên) */}
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

        </div>
      </main>
    </div>
  );
}
