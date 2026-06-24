import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Empty, Spin } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassSectionReportContent from "../../components/report/ClassSectionReportContent";
import { approveEnrollment, rejectEnrollment } from "../../api/enrollment";
import { getTeacherReportSummary } from "../../api/statistics";
import { unwrapApiData } from "../../utils/reporting";
import useClassReportData, { EMPTY_REPORT } from "../../hooks/useClassReportData";

const errMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

// ── Main component ─────────────────────────────────────────────────────────

export default function TeacherReport() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL state
  const selectedClassSectionId = Number(searchParams.get("classSectionId")) || null;

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selectClassSection = (classSectionId) => {
    const p = new URLSearchParams();
    if (classSectionId) p.set("classSectionId", String(classSectionId));
    setSearchParams(p, { replace: true });
  };

  // ── Danh sách lớp (summary) ──
  const summaryQuery = useQuery({
    queryKey: ["teacherReportSummary"],
    queryFn: getTeacherReportSummary,
  });

  const classSections = useMemo(() => {
    const s = unwrapApiData(summaryQuery.data) || {};
    const allClasses = [...(s.taughtClasses || []), ...(s.assistedClasses || [])];
    // Lọc lớp trùng theo ID / mã / tiêu đề để tránh duplicate key & render trùng
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
    return uniqueClasses;
  }, [summaryQuery.data]);

  // Tự chuyển về lớp đầu nếu lớp đang chọn không hợp lệ
  useEffect(() => {
    if (!classSections.length) return;
    if (!classSections.some((c) => (c.id || c.classSectionId) === selectedClassSectionId)) {
      if (selectedClassSectionId) {
        messageApi.warning(
          t("report.invalidClassRedirect", "Lớp không tồn tại hoặc bạn không có quyền, đã chuyển về lớp đầu tiên.")
        );
      }
      selectClassSection(classSections[0].id || classSections[0].classSectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSections, selectedClassSectionId]);

  // ── Dữ liệu báo cáo của lớp đang chọn (React Query → hết race khi đổi lớp) ──
  const reportQuery = useClassReportData(selectedClassSectionId);
  const {
    gradeBook,
    peopleRows,
    pendingRequests,
    classOverview,
    assignmentReport,
    quizReport,
  } = reportQuery.data || EMPTY_REPORT;

  const loadingClasses = summaryQuery.isLoading;
  const loadingReport = reportQuery.isLoading; // chỉ true lần đầu/đổi lớp, không nhấp nháy khi refetch nền
  const error = summaryQuery.isError
    ? errMessage(summaryQuery.error, t("reportsPage.teacher.errors.loadClasses"))
    : reportQuery.isError
      ? errMessage(reportQuery.error, t("reportsPage.teacher.errors.loadReport"))
      : null;

  const currentClassSection =
    classSections.find((c) => (c.id || c.classSectionId) === selectedClassSectionId) || null;

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
          reportQuery.refetch();
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
          reportQuery.refetch();
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
                  <Button icon={<ReloadOutlined />} onClick={() => reportQuery.refetch()} loading={reportQuery.isFetching}>
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
