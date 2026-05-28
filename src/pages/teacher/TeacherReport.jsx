import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, App, Button, Spin } from "antd";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassSectionReportContent from "../../components/report/ClassSectionReportContent";
import { getClassPeople, getMyTeachingClasses } from "../../api/teaching";
import { approveEnrollment, rejectEnrollment } from "../../api/enrollment";
import { getTeachingAssignments } from "../../api/assignment";
import { getManagedQuizAttempts } from "../../api/quiz";
import {
  getClassSectionGradeBook,
  getClassSectionPendingRequests,
} from "../../api/statistics";
import { collectAllPagedItems, unwrapApiData, unwrapPageItems } from "../../utils/reporting";

export default function TeacherReport() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [classSections, setClassSections] = useState([]);
  const [gradeBook, setGradeBook] = useState([]);
  const [peopleRows, setPeopleRows] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [assignmentOverviews, setAssignmentOverviews] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
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
    loadClassSections();
  }, []);

  useEffect(() => {
    if (!selectedClassSectionId) {
      return;
    }
    loadReportData(selectedClassSectionId);
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

  const loadClassSections = async () => {
    try {
      setLoadingClasses(true);
      setError(null);
      const response = await getMyTeachingClasses();
      const items = Array.isArray(response) ? response : response?.data || [];
      setClassSections(items);

      if (!items.length) {
        return;
      }

      const hasSelectedClass = items.some((item) => item.id === selectedClassSectionId);
      if (!hasSelectedClass) {
        updateSearchState(items[0].id, activeTab);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("reportsPage.teacher.errors.loadClasses"));
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadReportData = async (classSectionId = selectedClassSectionId) => {
    if (!classSectionId) {
      return;
    }

    try {
      setLoadingReport(true);
      setError(null);
      const [gradeBookResponse, peopleResponse, pendingRequestsItems, assignmentsResponse, quizAttemptItems] = await Promise.all([
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
      setPendingRequests(pendingRequestsItems);
      setAssignmentOverviews(unwrapPageItems(assignmentsResponse));
      setQuizAttempts(quizAttemptItems);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("reportsPage.teacher.errors.loadReport"));
    } finally {
      setLoadingReport(false);
    }
  };

  const currentClassSection = classSections.find((item) => item.id === selectedClassSectionId) || null;

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
    <div className="teacher-report-page report-page min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
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

            <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0f766e_0%,#1d4ed8_100%)] p-6 text-white shadow-xl sm:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/80">
                  <DocumentChartBarIcon className="h-4 w-4" />
                  {t("reportsPage.teacher.hero.badge")}
                </div>
                <h1 className="m-0 mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {t("reportsPage.teacher.hero.title")}
                </h1>
                <p className="m-0 mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                  {t("reportsPage.teacher.hero.subtitle")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <HeroInsight
                  icon={<ChartBarIcon className="h-5 w-5" />}
                  label={t("reportsPage.teacher.hero.scopeLabel")}
                  value={currentClassSection?.title || t("reportsPage.teacher.hero.scopeValue")}
                />
                <HeroInsight
                  icon={<PresentationChartLineIcon className="h-5 w-5" />}
                  label={t("reportsPage.teacher.hero.sourceLabel")}
                  value={t("reportsPage.teacher.hero.sourceValue")}
                />
              </div>
            </div>
          </section>

          <div className="mt-6">
            {error ? <Alert type="error" showIcon message={t("reportsPage.shared.alertTitle")} description={error} className="mb-6" /> : null}

            {loadingClasses ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Spin size="large" />
              </div>
            ) : (
              <ClassSectionReportContent
                classSections={classSections}
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
                workspaceBasePath="/teacher"
                selectorLabel={t("reportsPage.teacher.selectorLabel")}
                emptyMessage={t("reportsPage.teacher.emptyMessage")}
                extendedInsights
              />
            )}
          </div>

          {!loadingClasses && classSections.length > 0 ? (
            <div className="mt-6 flex justify-end">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadReportData()}
                loading={loadingReport}
              >
                {t("reportsPage.teacher.actions.reload")}
              </Button>
            </div>
          ) : null}
        </div>
      </main>
      </div>
    </div>
  );
}

function HeroInsight({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/80">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="m-0 mt-3 text-lg font-black text-white">{value}</p>
    </div>
  );
}
