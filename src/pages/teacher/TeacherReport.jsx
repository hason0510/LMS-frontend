import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Empty, Spin } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassSectionReportContent from "../../components/report/ClassSectionReportContent";
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

// ── Main component ─────────────────────────────────────────────────────────

export default function TeacherReport() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Class list (for the report selector) + selected class report data
  const [classSections, setClassSections] = useState([]);
  const [gradeBook, setGradeBook] = useState([]);
  const [peopleRows, setPeopleRows] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [classOverview, setClassOverview] = useState(null);
  const [assignmentReport, setAssignmentReport] = useState(null);
  const [quizReport, setQuizReport] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL state
  const selectedClassSectionId = Number(searchParams.get("classSectionId")) || null;

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

  const selectClassSection = (classSectionId) => {
    const p = new URLSearchParams();
    if (classSectionId) p.set("classSectionId", String(classSectionId));
    setSearchParams(p, { replace: true });
  };

  const loadSummaryData = async () => {
    try {
      setLoadingClasses(true);
      setError(null);
      const summaryRaw = await getTeacherReportSummary();
      const s = unwrapApiData(summaryRaw) || {};

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
        if (selectedClassSectionId) {
          messageApi.warning(
            t("report.invalidClassRedirect", "Lớp không tồn tại hoặc bạn không có quyền, đã chuyển về lớp đầu tiên.")
          );
        }
        selectClassSection(uniqueClasses[0].id || uniqueClasses[0].classSectionId);
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

            {/* Error */}
            {error ? <Alert type="error" showIcon message={t("reportsPage.shared.alertTitle")} description={error} className="mb-6" /> : null}

            {/* ── BÁO CÁO LỚP (hiển thị thẳng, không còn tab cấp trang) ── */}
            {loadingClasses ? (
              <div className="flex min-h-[300px] items-center justify-center"><Spin size="large" /></div>
            ) : classSections.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <Empty description={t("report.noClassesForReport", "Bạn chưa có lớp nào để xem báo cáo")} />
              </div>
            ) : (
              <div className="space-y-6">
                <ClassSectionReportContent
                  classSections={classSections}
                  selectedClassSectionId={selectedClassSectionId}
                  onSelectClassSection={selectClassSection}
                  managedClassCount={classSections.length}
                  currentClassSection={currentClassSection}
                  loading={loadingReport}
                  gradeBook={gradeBook}
                  peopleRows={peopleRows}
                  pendingRequests={pendingRequests}
                  classOverview={classOverview}
                  assignmentReport={assignmentReport}
                  quizReport={quizReport}
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
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
