import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Spin, Tag } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  AcademicCapIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassSectionReportContent from "../../components/report/ClassSectionReportContent";
import { Select } from "antd";
import ReportMetricCard from "../../components/report/ReportMetricCard";
import ReportSectionCard from "../../components/report/ReportSectionCard";
import { approveEnrollment, rejectEnrollment } from "../../api/enrollment";
import { getClassPeople } from "../../api/teaching";
import {
  getClassSectionGradeBook,
  getClassSectionPendingRequests,
  getClassReportOverview,
  getClassAssignmentReport,
  getTeacherReportSummary,
  getClassQuizReport,
} from "../../api/statistics";
import { collectAllPagedItems, unwrapApiData } from "../../utils/reporting";

const REPORT_POLL_INTERVAL_MS = 30_000;

function getTeachingAssistantCount(classSection) {
  return (classSection?.teachingMembers || []).filter((m) => m.role === "TA").length;
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
    { key: "overview", icon: <HomeIcon className="h-4 w-4" />, label: t("reportsPage.teacher.tabs.overview") || "Tổng quan" },
    { key: "report", icon: <ChartBarIcon className="h-4 w-4" />, label: t("reportsPage.teacher.tabs.report") || "Báo cáo lớp" },
    { key: "stats", icon: <PresentationChartLineIcon className="h-4 w-4" />, label: t("reportsPage.teacher.tabs.stats") || "Thống kê" },
  ];
  return (
    <div className="mb-6 flex w-fit gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-150 ${
            activeTab === tab.key
              ? "bg-gradient-to-r from-teal-700 to-blue-700 text-white shadow-md"
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

function QueueItem({ icon, iconClass, title, meta, tag, tagColor }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        {meta && <p className="m-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</p>}
      </div>
      {tag && <Tag color={tagColor}>{tag}</Tag>}
    </div>
  );
}

function ClassPill({ item, isSelected, onClick }) {
  const statusColor = item.status === "PUBLIC" ? "green" : item.status === "ARCHIVED" ? "default" : "gold";
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
        isSelected
          ? "border-teal-300 bg-teal-50 dark:border-teal-600/40 dark:bg-teal-900/20"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
      }`}
    >
      <p className="m-0 text-sm font-semibold text-slate-900 dark:text-white truncate">{item.title || item.classCode}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">{item.totalEnrollments || 0} người học</span>
        <Tag color={statusColor} className="!m-0 !text-[10px] !leading-4">{item.status}</Tag>
      </div>
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

// ── Main component ─────────────────────────────────────────────────────────

export default function TeacherReport() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Summary (overview tab)
  const [teacherSummary, setTeacherSummary] = useState({
    totalClasses: 0, totalStudents: 0, pendingSubmissions: 0,
    pendingQuizReviews: 0, atRiskStudents: 0, pendingRequests: 0,
    taughtClasses: [], assistedClasses: [],
  });
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Class-level
  const [classSections, setClassSections] = useState([]);
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

  useEffect(() => { loadSummaryData(); }, []);

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

  const loadSummaryData = async () => {
    try {
      setLoadingClasses(true);
      setError(null);
      const summaryRaw = await getTeacherReportSummary();
      const s = unwrapApiData(summaryRaw) || {};

      setTeacherSummary({
        totalClasses: s.totalClasses || 0,
        totalStudents: s.totalStudents || 0,
        pendingSubmissions: s.pendingSubmissions || 0,
        pendingQuizReviews: s.pendingQuizReviews || 0,
        atRiskStudents: s.atRiskStudents || 0,
        pendingRequests: s.pendingRequests || 0,
        taughtClasses: s.taughtClasses || [],
        assistedClasses: s.assistedClasses || [],
      });

      const allClasses = [...(s.taughtClasses || []), ...(s.assistedClasses || [])];
      // Filter out duplicate classes by ID, code, or title to avoid duplicate key warnings and duplicate render items
      const uniqueClasses = [];
      const seen = new Set();
      allClasses.forEach((c) => {
        if (!c) return;
        const identifier = c.id || c.classSectionId || c.classCode || c.title;
        if (identifier && !seen.has(identifier)) {
          seen.add(identifier);
          uniqueClasses.push(c);
        } else if (!identifier) {
          uniqueClasses.push(c);
        }
      });
      setClassSections(uniqueClasses);

      if (uniqueClasses.length && !uniqueClasses.some((c) => (c.id || c.classSectionId) === selectedClassSectionId)) {
        updateSearchState(uniqueClasses[0].id || uniqueClasses[0].classSectionId, activeMainTab);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("reportsPage.teacher.errors.loadClasses"));
    } finally {
      setLoadingClasses(false);
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
      setError(err?.response?.data?.message || err.message || t("reportsPage.teacher.errors.loadReport"));
    } finally {
      setLoadingReport(false);
    }
  };

  const currentClassSection = classSections.find((c) => (c.id || c.classSectionId) === selectedClassSectionId) || null;

  // Compute at-risk students from classOverview
  const atRiskList = useMemo(() => {
    if (classOverview?.atRiskStudents && Array.isArray(classOverview.atRiskStudentsList)) {
      return classOverview.atRiskStudentsList.slice(0, 6);
    }
    return peopleRows
      .filter((s) => Number(s.progress || 0) < 40)
      .slice(0, 6);
  }, [classOverview, peopleRows]);

  const handleApprove = (record) => {
    modalApi.confirm({
      title: t("reportsPage.shared.modals.approve.title"),
      content: t("reportsPage.teacher.modals.approve.content", { name: record.fullName }),
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
      content: t("reportsPage.teacher.modals.reject.content", { name: record.fullName }),
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
    <div className="teacher-report-page min-h-screen bg-[#f4f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="mx-auto w-full max-w-[1380px] !px-4 !py-6 sm:!px-6 lg:!px-8">
            <AppBreadcrumb className="mb-5" />

            {/* ── HERO ─────────────────────────────────────── */}
            {/*
            <section className="mb-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-teal-700 via-teal-600 to-blue-700 !p-6 text-white shadow-xl sm:!p-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
                    <DocumentChartBarIcon className="h-4 w-4" />
                    {t("reportsPage.teacher.hero.badge")}
                  </div>
                  <h1 className="!m-0 !mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    {t("reportsPage.teacher.hero.title")}
                  </h1>
                  <p className="!m-0 !mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                    {t("reportsPage.teacher.hero.subtitle")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <HeroInsight
                    icon={<ChartBarIcon className="h-4 w-4" />}
                    label={t("reportsPage.teacher.hero.scopeLabel")}
                    value={currentClassSection?.title || t("reportsPage.teacher.hero.scopeValue")}
                  />
                  <HeroInsight
                    icon={<AcademicCapIcon className="h-4 w-4" />}
                    label={t("reportsPage.teacher.hero.assistantsLabel")}
                    value={t("reportsPage.teacher.hero.assistantsValue", { count: getTeachingAssistantCount(currentClassSection) })}
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
                {loadingClasses ? (
                  <div className="flex min-h-[300px] items-center justify-center"><Spin size="large" /></div>
                ) : (
                  <>
                    {/* 6 metric cards */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <ReportMetricCard icon={<ChartBarIcon className="h-6 w-6" />} label={t("reportsPage.teacher.overviewMetrics.totalClasses") || "Tổng lớp"} value={teacherSummary.totalClasses} hint={`${(teacherSummary.taughtClasses || []).length} GV chính · ${(teacherSummary.assistedClasses || []).length} TA`} tone="blue" loading={loadingClasses} />
                      <ReportMetricCard icon={<UserGroupIcon className="h-6 w-6" />} label={t("reportsPage.teacher.overviewMetrics.totalStudents") || "Tổng người học"} value={teacherSummary.totalStudents} hint="Đã được duyệt" tone="emerald" loading={loadingClasses} />
                      <ReportMetricCard icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label={t("reportsPage.teacher.overviewMetrics.pendingSubmissions") || "BT chờ chấm"} value={teacherSummary.pendingSubmissions} hint="Cần phản hồi" tone="amber" loading={loadingClasses} />
                      <ReportMetricCard icon={<AcademicCapIcon className="h-6 w-6" />} label={t("reportsPage.teacher.overviewMetrics.pendingQuizzes") || "Quiz chờ duyệt"} value={teacherSummary.pendingQuizReviews} hint="Bài tự luận" tone="violet" loading={loadingClasses} />
                      <ReportMetricCard icon={<ExclamationTriangleIcon className="h-6 w-6" />} label={t("reportsPage.teacher.overviewMetrics.atRisk") || "Người học nguy cơ"} value={teacherSummary.atRiskStudents} hint="Tiến độ < 40%" tone="rose" loading={loadingClasses} />
                      <ReportMetricCard icon={<UserPlusIcon className="h-6 w-6" />} label={t("reportsPage.teacher.overviewMetrics.pendingRequests") || "Yêu cầu chờ"} value={teacherSummary.pendingRequests} hint="Chưa duyệt join" tone="sky" loading={loadingClasses} />
                    </div>

                    {/* 2-col: Classes list + Overview actions */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {/* My classes list */}
                      <ReportSectionCard title={t("reportsPage.teacher.sections.myClasses") || "Lớp của tôi"} subtitle={t("reportsPage.teacher.sections.myClassesSubtitle") || "Các lớp bạn đang phụ trách"}>
                        <div className="space-y-2">
                          {classSections.length === 0 ? (
                            <p className="text-sm text-slate-500">{t("reportsPage.teacher.emptyMessage")}</p>
                          ) : classSections.map((item, index) => (
                            <ClassPill
                              key={item.id || item.classSectionId || item.classCode || index}
                              item={item}
                              isSelected={(item.id || item.classSectionId) === selectedClassSectionId}
                              onClick={() => updateSearchState(item.id || item.classSectionId, "report")}
                            />
                          ))}
                        </div>
                      </ReportSectionCard>

                      {/* At-risk students table */}
                      <ReportSectionCard
                        title={t("reportsPage.teacher.sections.atRisk") || "Người học cần chú ý"}
                        subtitle={`${t("reportsPage.teacher.sections.atRiskSubtitle") || "Tiến độ thấp hoặc chưa nộp bài"} – ${currentClassSection?.title || t("reportsPage.teacher.hero.scopeValue")}`}
                        actions={
                          <Select
                            showSearch
                            optionFilterProp="label"
                            className="min-w-[250px]"
                            value={selectedClassSectionId || undefined}
                            onChange={(val) => updateSearchState(Number(val), "report")}
                            options={classSections.map((c, index) => ({
                              value: c.id || c.classSectionId,
                              label: c.title || c.classCode
                            }))}
                          />
                        }
                      >
                        {loadingReport ? (
                          <div className="flex h-24 items-center justify-center"><Spin /></div>
                        ) : atRiskList.length === 0 ? (
                          <p className="text-sm text-slate-500">Không có người học cần chú ý.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                                  {["Người học", "Tiến độ", "Trạng thái"].map((h) => (
                                    <th key={h} className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {atRiskList.map((s, i) => {
                                  const prog = Number(s.progress || 0);
                                  const color = prog < 25 ? "#e11d48" : prog < 45 ? "#f59e0b" : "#0f766e";
                                  return (
                                    <tr key={s.userId || i} className="border-b border-slate-100 dark:border-slate-800">
                                      <td className="px-2 py-2.5">
                                        <p className="m-0 font-semibold text-slate-900 dark:text-white">{s.fullName || s.name || "—"}</p>
                                        <p className="m-0 text-xs text-slate-400">{s.email || s.studentNumber || ""}</p>
                                      </td>
                                      <td className="px-2 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                            <div className="h-full rounded-full" style={{ width: `${prog}%`, background: color }} />
                                          </div>
                                          <span className="text-xs font-bold" style={{ color }}>{prog}%</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-2.5">
                                        <Tag color={prog < 25 ? "red" : "orange"}>{prog < 25 ? "Nguy cơ cao" : "Cần theo dõi"}</Tag>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </ReportSectionCard>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: BÁO CÁO LỚP ────────────────────────── */}
            {activeMainTab === "report" && (
              <div className="space-y-6">
                {loadingClasses ? (
                  <div className="flex min-h-[300px] items-center justify-center"><Spin size="large" /></div>
                ) : (
                  <>
                    <ClassSectionReportContent
                      classSections={classSections}
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
                      workspaceBasePath="/teacher"
                      selectorLabel={t("reportsPage.teacher.selectorLabel")}
                      emptyMessage={t("reportsPage.teacher.emptyMessage")}
                      extendedInsights
                    />
                    <div className="flex justify-end">
                      <Button icon={<ReloadOutlined />} onClick={() => loadReportData()} loading={loadingReport}>
                        {t("reportsPage.teacher.actions.reload")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: THỐNG KÊ ────────────────────────────── */}
            {activeMainTab === "stats" && (
              <div className="space-y-6">
                {/* Summary across all classes */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <ReportMetricCard icon={<ChartBarIcon className="h-6 w-6" />} label="Tổng lớp" value={teacherSummary.totalClasses} tone="blue" loading={loadingClasses} />
                  <ReportMetricCard icon={<UserGroupIcon className="h-6 w-6" />} label="Tổng người học" value={teacherSummary.totalStudents} tone="emerald" loading={loadingClasses} />
                  <ReportMetricCard icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label="BT chờ chấm" value={teacherSummary.pendingSubmissions} tone="amber" loading={loadingClasses} />
                  <ReportMetricCard icon={<AcademicCapIcon className="h-6 w-6" />} label="Quiz chờ duyệt" value={teacherSummary.pendingQuizReviews} tone="violet" loading={loadingClasses} />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {/* Classes I teach */}
                  <ReportSectionCard
                    title="Lớp tôi phụ trách (GV chính)"
                    subtitle={`${(teacherSummary.taughtClasses || []).length} lớp`}
                  >
                    <div className="space-y-2">
                      {(teacherSummary.taughtClasses || []).length === 0 ? (
                        <p className="text-sm text-slate-500">Không có lớp nào.</p>
                      ) : (teacherSummary.taughtClasses || []).map((item) => (
                        <SubjectBarItem
                          key={item.id || item.classSectionId}
                          label={item.title || item.classCode}
                          value={`${item.totalEnrollments || 0} người học`}
                          percent={Math.min(100, ((item.totalEnrollments || 0) / Math.max(...(teacherSummary.taughtClasses || [{ totalEnrollments: 1 }]).map((c) => c.totalEnrollments || 1))) * 100)}
                          color="#0f766e"
                        />
                      ))}
                    </div>
                  </ReportSectionCard>

                  {/* Classes I assist */}
                  <ReportSectionCard
                    title="Lớp hỗ trợ (TA)"
                    subtitle={`${(teacherSummary.assistedClasses || []).length} lớp`}
                  >
                    <div className="space-y-2">
                      {(teacherSummary.assistedClasses || []).length === 0 ? (
                        <p className="text-sm text-slate-500">Bạn không đang hỗ trợ lớp nào với tư cách TA.</p>
                      ) : (teacherSummary.assistedClasses || []).map((item) => (
                        <SubjectBarItem
                          key={item.id || item.classSectionId}
                          label={item.title || item.classCode}
                          value={`${item.totalEnrollments || 0} người học`}
                          percent={Math.min(100, ((item.totalEnrollments || 0) / Math.max(...(teacherSummary.assistedClasses || [{ totalEnrollments: 1 }]).map((c) => c.totalEnrollments || 1))) * 100)}
                          color="#8b5cf6"
                        />
                      ))}
                    </div>
                  </ReportSectionCard>
                </div>

                {/* At-risk students */}
                {atRiskList.length > 0 && (
                  <ReportSectionCard
                    title="Người học nguy cơ – lớp đang chọn"
                    subtitle={`${currentClassSection?.title || "Chưa chọn lớp"} · Tiến độ thấp`}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                            {["Người học", "Tiến độ", "Trạng thái"].map((h) => (
                              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {atRiskList.map((s, i) => {
                            const prog = Number(s.progress || 0);
                            const color = prog < 25 ? "#e11d48" : "#f59e0b";
                            return (
                              <tr key={s.userId || i} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="px-3 py-3">
                                  <p className="m-0 font-semibold text-slate-900 dark:text-white">{s.fullName || s.name || "—"}</p>
                                  <p className="m-0 text-xs text-slate-400">{s.email || ""}</p>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                                      <div className="h-full rounded-full" style={{ width: `${prog}%`, background: color }} />
                                    </div>
                                    <span className="text-xs font-bold" style={{ color }}>{prog}%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <Tag color={prog < 25 ? "red" : "orange"}>{prog < 25 ? "Nguy cơ cao" : "Cần theo dõi"}</Tag>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ReportSectionCard>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
