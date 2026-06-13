import React, { useEffect, useMemo, useState } from "react";
import { Button, Empty, InputNumber, Segmented, Select, Space, Table, Tabs, Tag } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  QueueListIcon,
  RectangleStackIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import ReportMetricCard from "./ReportMetricCard";
import ReportSectionCard from "./ReportSectionCard";
import { SingleSeriesBarChart, StackedStatusBarChart } from "./ReportCharts";
import UserIdentity from "../common/UserIdentity";
import { getAssignmentSubmissions } from "../../api/submission";
import {
  buildAssignmentStatusChartData,
  buildGradebookTable,
  buildQuizParticipationRows,
  buildQuizHistogramData,
  buildQuizPassRateData,
  buildQuizSummaries,
  calculateClassSectionStats,
  collectAllPagedItems,
  formatDateTimeWithOptions,
  getBestQuizAttemptsByStudent,
  getProgressBuckets,
  summarizeAssignmentSubmissions,
} from "../../utils/reporting";

const statusToneMap = {
  PUBLIC: "green",
  PRIVATE: "gold",
  ARCHIVED: "default",
};

const DEFAULT_PROGRESS_THRESHOLDS = {
  low: 50,
  high: 80,
};

function getProgressThresholdStorageKey(workspaceBasePath) {
  const scope = workspaceBasePath?.includes("/admin") ? "admin" : "teacher";
  return `report-progress-thresholds:${scope}`;
}

function normalizeProgressThresholds(thresholds = DEFAULT_PROGRESS_THRESHOLDS) {
  const rawLow = Number(thresholds?.low);
  const rawHigh = Number(thresholds?.high);
  const low = Number.isFinite(rawLow) ? Math.max(0, Math.min(99, rawLow)) : DEFAULT_PROGRESS_THRESHOLDS.low;
  const highBase = Number.isFinite(rawHigh) ? rawHigh : DEFAULT_PROGRESS_THRESHOLDS.high;
  const high = Math.max(low + 1, Math.min(100, highBase));

  return { low, high };
}

function getTeachingAssistantCount(classSection) {
  return (classSection?.teachingMembers || []).filter((member) => member.role === "TA").length;
}

export default function ClassSectionReportContent({
  classSections,
  selectedClassSectionId,
  onSelectClassSection,
  currentClassSection,
  loading,
  gradeBook,
  approvedStudents = [],
  peopleRows = [],
  pendingRequests,
  assignmentOverviews = [],
  quizAttempts = [],
  activeTab,
  onTabChange,
  onApproveRequest,
  onRejectRequest,
  selectorLabel,
  emptyMessage,
  workspaceBasePath = "/teacher",
  extendedInsights = false,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [loadingAssignmentSubmissions, setLoadingAssignmentSubmissions] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [progressThresholds, setProgressThresholds] = useState(DEFAULT_PROGRESS_THRESHOLDS);
  const [draftProgressThresholds, setDraftProgressThresholds] = useState(DEFAULT_PROGRESS_THRESHOLDS);
  const [progressGroupFilter, setProgressGroupFilter] = useState("ALL");
  const [studentStatusFilters, setStudentStatusFilters] = useState([]);
  const [quizParticipationFilter, setQuizParticipationFilter] = useState("ALL");

  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";
  const emptyDateLabel = t("reportsPage.shared.defaults.noData");
  const defaultSelectorLabel = selectorLabel || t("reportsPage.shared.filter.placeholder");
  const defaultEmptyMessage = emptyMessage || t("reportsPage.shared.empty.classSections");
  const teachingAssistantCount = getTeachingAssistantCount(currentClassSection);
  const statusLabelMap = {
    PUBLIC: t("teaching.status.public"),
    PRIVATE: t("teaching.status.private"),
    ARCHIVED: t("teaching.status.archived"),
  };

  const reportStudents = useMemo(() => {
    if (Array.isArray(peopleRows) && peopleRows.length > 0) {
      return peopleRows.map((student) => ({
        id: student.enrollmentId || student.studentId,
        studentId: student.studentId,
        fullName: student.studentName,
        studentNumber: student.studentNumber,
        email: student.email,
        avatarUrl: student.avatarUrl,
        progress: student.progress,
        approvalStatus: student.enrollmentStatus || "APPROVED",
        missingAssignments: student.missingAssignments,
        pendingReviews: student.pendingReviews,
        latestScore: student.latestScore,
      }));
    }

    return (Array.isArray(approvedStudents) ? approvedStudents : []).map((student) => ({
      ...student,
      fullName: student.fullName || student.studentName,
      studentId: student.studentId,
      avatarUrl: student.avatarUrl || student.studentAvatar || student.avatar,
      missingAssignments: student.missingAssignments || 0,
      pendingReviews: student.pendingReviews || 0,
      latestScore: student.latestScore ?? null,
    }));
  }, [approvedStudents, peopleRows]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = getProgressThresholdStorageKey(workspaceBasePath);

    try {
      const savedValue = window.localStorage.getItem(storageKey);
      if (!savedValue) {
        setProgressThresholds(DEFAULT_PROGRESS_THRESHOLDS);
        setDraftProgressThresholds(DEFAULT_PROGRESS_THRESHOLDS);
        return;
      }

      const parsedValue = JSON.parse(savedValue);
      const nextThresholds = normalizeProgressThresholds(parsedValue);
      setProgressThresholds(nextThresholds);
      setDraftProgressThresholds(nextThresholds);
    } catch {
      setProgressThresholds(DEFAULT_PROGRESS_THRESHOLDS);
      setDraftProgressThresholds(DEFAULT_PROGRESS_THRESHOLDS);
    }
  }, [workspaceBasePath]);

  const stats = calculateClassSectionStats(reportStudents, pendingRequests, gradeBook, progressThresholds);
  const buckets = getProgressBuckets(reportStudents, progressThresholds);
  const gradebookTable = buildGradebookTable(gradeBook, reportStudents, {
    fallbackStudentName: t("reportsPage.shared.defaults.noName"),
    fallbackStudentNumber: t("reportsPage.shared.defaults.noStudentNumber"),
    fallbackQuizTitle: t("reportsPage.shared.defaults.quizTitle"),
  });
  const quizSummaries = useMemo(
    () =>
      buildQuizSummaries(quizAttempts, {
        fallbackQuizTitle: t("reportsPage.shared.defaults.quizTitle"),
      }),
    [quizAttempts, t]
  );
  const progressChartData = useMemo(
    () => [
      { key: "low", label: t("reportsPage.shared.buckets.low.label"), value: buckets.low, color: "#f43f5e" },
      { key: "medium", label: t("reportsPage.shared.buckets.medium.label"), value: buckets.medium, color: "#f59e0b" },
      { key: "high", label: t("reportsPage.shared.buckets.high.label"), value: buckets.high, color: "#10b981" },
    ],
    [buckets.high, buckets.low, buckets.medium, t]
  );
  const assignmentStatusChartData = useMemo(
    () =>
      buildAssignmentStatusChartData(assignmentOverviews, {
        fallbackAssignmentTitle: t("reportsPage.shared.defaults.assignmentTitle"),
      }),
    [assignmentOverviews, t]
  );
  const quizPassRateData = useMemo(() => buildQuizPassRateData(quizSummaries), [quizSummaries]);

  const selectedAssignment =
    assignmentOverviews.find((item) => item.assignmentId === selectedAssignmentId) || assignmentOverviews[0] || null;
  const selectedQuizSummary =
    quizSummaries.find((item) => item.id === selectedQuizId) || quizSummaries[0] || null;
  const selectedQuizAttempts = useMemo(() => {
    if (!selectedQuizSummary) {
      return [];
    }

    return [...selectedQuizSummary.attempts].sort((left, right) => {
      const leftDate = new Date(left.completedTime || left.startTime || 0).getTime();
      const rightDate = new Date(right.completedTime || right.startTime || 0).getTime();
      return rightDate - leftDate;
    });
  }, [selectedQuizSummary]);
  const selectedQuizBestAttempts = useMemo(
    () => getBestQuizAttemptsByStudent(selectedQuizSummary?.attempts || []),
    [selectedQuizSummary]
  );
  const quizParticipationRows = useMemo(
    () => buildQuizParticipationRows(reportStudents, selectedQuizSummary?.attempts || []),
    [reportStudents, selectedQuizSummary]
  );
  const quizHistogramData = useMemo(
    () => buildQuizHistogramData(selectedQuizSummary?.attempts || []),
    [selectedQuizSummary]
  );
  const assignmentSubmissionSummary = summarizeAssignmentSubmissions(assignmentSubmissions);

  useEffect(() => {
    if (!assignmentOverviews.length) {
      setSelectedAssignmentId(null);
      return;
    }

    if (!assignmentOverviews.some((item) => item.assignmentId === selectedAssignmentId)) {
      setSelectedAssignmentId(assignmentOverviews[0].assignmentId);
    }
  }, [assignmentOverviews, selectedAssignmentId]);

  useEffect(() => {
    if (!quizSummaries.length) {
      setSelectedQuizId(null);
      return;
    }

    if (!quizSummaries.some((item) => item.id === selectedQuizId)) {
      setSelectedQuizId(quizSummaries[0].id);
    }
  }, [quizSummaries, selectedQuizId]);

  useEffect(() => {
    setQuizParticipationFilter("ALL");
  }, [selectedQuizId, selectedClassSectionId]);

  useEffect(() => {
    if (!extendedInsights || !selectedAssignment?.assignmentId || !selectedClassSectionId) {
      setAssignmentSubmissions([]);
      return;
    }

    const loadSubmissions = async () => {
      try {
        setLoadingAssignmentSubmissions(true);
        const items = await collectAllPagedItems(
          (pageNumber) =>
            getAssignmentSubmissions(selectedAssignment.assignmentId, {
              classSectionId: selectedClassSectionId,
              includeNotSubmitted: true,
              pageNumber,
              pageSize: 250,
            }),
          { startPage: 1, maxPages: 8 }
        );
        setAssignmentSubmissions(items);
      } catch {
        setAssignmentSubmissions([]);
      } finally {
        setLoadingAssignmentSubmissions(false);
      }
    };

    loadSubmissions();
  }, [extendedInsights, selectedAssignment?.assignmentId, selectedClassSectionId]);

  const gradeBookColumns = [
    {
      title: t("reportsPage.shared.tables.student"),
      dataIndex: "studentName",
      fixed: "left",
      width: 220,
      render: (_, record) => (
        <UserIdentity
          user={record}
          variant="student"
          showAvatar={false}
          fallbackName={t("reportsPage.shared.defaults.noName")}
          nameClassName="m-0 text-sm font-bold text-slate-900 dark:text-white"
          secondaryClassName="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400"
        />
      ),
    },
    {
      title: t("reportsPage.shared.tables.progress"),
      dataIndex: "progress",
      width: 140,
      render: (progress) => <ProgressCell progress={progress} thresholds={progressThresholds} />,
    },
    ...gradebookTable.quizzes.map((quiz) => ({
      title: quiz.title,
      dataIndex: `quiz_${quiz.id}`,
      key: `quiz_${quiz.id}`,
      width: 110,
      align: "center",
      render: (value) => (typeof value === "number" ? value : t("reportsPage.shared.defaults.dash")),
      sorter: (left, right) => (left[`quiz_${quiz.id}`] || 0) - (right[`quiz_${quiz.id}`] || 0),
    })),
    {
      title: t("reportsPage.shared.tables.quizAverage"),
      dataIndex: "averageScore",
      key: "averageScore",
      width: 110,
      align: "center",
      render: (value) => (
        <span className="font-bold text-slate-900 dark:text-white">{value ?? t("reportsPage.shared.defaults.dash")}</span>
      ),
      sorter: (left, right) => (left.averageScore || 0) - (right.averageScore || 0),
    },
  ];

  const progressColumns = [
    {
      title: t("reportsPage.shared.tables.student"),
      dataIndex: "fullName",
      render: (_, record) => (
        <UserIdentity
          user={record}
          variant="student"
          avatarSizeClass="size-10"
          fallbackName={t("reportsPage.shared.defaults.noName")}
          nameClassName="m-0 text-sm font-bold text-slate-900 dark:text-white"
          secondaryClassName="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400"
        />
      ),
    },
    {
      title: t("reportsPage.shared.tables.progress"),
      dataIndex: "progress",
      width: 160,
      render: (progress) => <ProgressCell progress={progress} thresholds={progressThresholds} />,
      sorter: (left, right) => (left.progress || 0) - (right.progress || 0),
    },
    {
      title: t("reportsPage.shared.tables.missingAssignments"),
      dataIndex: "missingAssignments",
      width: 140,
      align: "right",
      render: (value) => value || 0,
      sorter: (left, right) => (left.missingAssignments || 0) - (right.missingAssignments || 0),
    },
    {
      title: t("reportsPage.shared.tables.pendingFeedback"),
      dataIndex: "pendingReviews",
      width: 170,
      align: "right",
      render: (value) => value || 0,
      sorter: (left, right) => (left.pendingReviews || 0) - (right.pendingReviews || 0),
    },
    {
      title: t("reportsPage.shared.tables.latestScore"),
      dataIndex: "latestScore",
      width: 130,
      align: "right",
      render: (value) => value ?? t("reportsPage.shared.defaults.dash"),
      sorter: (left, right) => (left.latestScore || 0) - (right.latestScore || 0),
    },
  ];

  const pendingColumns = [
    {
      title: t("reportsPage.shared.tables.student"),
      dataIndex: "fullName",
      render: (_, record) => (
        <div>
          <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">
            {record.fullName || t("reportsPage.shared.defaults.noName")}
          </p>
          <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
            {record.email || record.studentNumber || t("reportsPage.shared.defaults.noStudentNumber")}
          </p>
        </div>
      ),
    },
    {
      title: t("reportsPage.shared.tables.studentNumber"),
      dataIndex: "studentNumber",
      width: 150,
    },
    {
      title: t("reportsPage.shared.tables.currentProgress"),
      dataIndex: "progress",
      width: 170,
      render: (progress) => <ProgressCell progress={progress} thresholds={progressThresholds} />,
    },
    {
      title: t("reportsPage.shared.tables.status"),
      dataIndex: "approvalStatus",
      width: 130,
      render: (status) => (
        <Tag color="gold">{status === "PENDING" ? t("teaching.enrollmentStatus.pending") : status}</Tag>
      ),
    },
    {
      title: t("reportsPage.shared.tables.actions"),
      key: "actions",
      width: 180,
      align: "right",
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<CheckOutlined />} className="px-0" onClick={() => onApproveRequest?.(record)}>
            {t("reportsPage.shared.actions.approve")}
          </Button>
          <Button type="link" danger icon={<CloseOutlined />} className="px-0" onClick={() => onRejectRequest?.(record)}>
            {t("reportsPage.shared.actions.reject")}
          </Button>
        </Space>
      ),
    },
  ];

  const quizParticipationColumns = [
    {
      title: t("reportsPage.shared.tables.student"),
      dataIndex: "fullName",
      render: (_, record) => (
        <div>
          <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">
            {record.fullName || t("reportsPage.shared.defaults.noName")}
          </p>
          <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
            {record.email || record.studentNumber || t("reportsPage.shared.defaults.noStudentNumber")}
          </p>
        </div>
      ),
    },
    {
      title: t("reportsPage.shared.tables.quizParticipation"),
      dataIndex: "status",
      width: 190,
      render: (value) => <QuizParticipationTag status={value} t={t} />,
    },
    {
      title: t("reportsPage.shared.tables.attemptsCount"),
      dataIndex: "attemptsCount",
      width: 130,
      align: "right",
      render: (value) => value || 0,
    },
    {
      title: t("reportsPage.shared.tables.completedAt"),
      dataIndex: "latestCompletedAt",
      width: 180,
      render: (value) =>
        formatDateTimeWithOptions(value, {
          locale,
          emptyLabel: emptyDateLabel,
        }),
    },
    {
      title: t("reportsPage.shared.tables.bestScore"),
      dataIndex: "bestScore",
      width: 120,
      align: "right",
      render: (value) => (value == null ? t("reportsPage.shared.defaults.dash") : `${value}%`),
    },
    {
      title: t("reportsPage.shared.tables.actions"),
      key: "actions",
      width: 130,
      align: "right",
      render: (_, record) =>
        record.latestAttemptId ? (
          <Button
            type="link"
            className="px-0"
            onClick={() => navigate(`${workspaceBasePath}/quiz-attempts/${record.latestAttemptId}`)}
          >
            {t("reportsPage.shared.actions.openAttempt")}
          </Button>
        ) : null,
    },
  ];

  const recentQuizAttempts = selectedQuizAttempts.slice(0, 5);
  const lowScoreThreshold = useMemo(() => {
    const numericScores = reportStudents
      .map((item) => Number(item.latestScore))
      .filter((value) => Number.isFinite(value));

    if (!numericScores.length) {
      return 50;
    }

    const maxScore = Math.max(...numericScores);
    return maxScore <= 10 ? 5 : 50;
  }, [reportStudents]);

  const filteredStudents = useMemo(() => {
    return reportStudents.filter((student) => {
      const progress = Number(student.progress) || 0;
      const latestScore = Number(student.latestScore);
      const hasLatestScore = Number.isFinite(latestScore);

      const matchesGroup =
        progressGroupFilter === "ALL" ||
        (progressGroupFilter === "LOW" && progress < progressThresholds.low) ||
        (progressGroupFilter === "MEDIUM" &&
          progress >= progressThresholds.low &&
          progress < progressThresholds.high) ||
        (progressGroupFilter === "HIGH" && progress >= progressThresholds.high);

      if (!matchesGroup) {
        return false;
      }

      return studentStatusFilters.every((filterKey) => {
        if (filterKey === "MISSING_ASSIGNMENTS") {
          return Number(student.missingAssignments) > 0;
        }
        if (filterKey === "PENDING_REVIEWS") {
          return Number(student.pendingReviews) > 0;
        }
        if (filterKey === "LOW_LATEST_SCORE") {
          return hasLatestScore && latestScore < lowScoreThreshold;
        }
        if (filterKey === "NO_LATEST_SCORE") {
          return !hasLatestScore;
        }
        return true;
      });
    });
  }, [lowScoreThreshold, progressGroupFilter, progressThresholds.high, progressThresholds.low, reportStudents, studentStatusFilters]);
  const filteredQuizParticipationRows = useMemo(() => {
    return quizParticipationRows.filter((row) => {
      if (quizParticipationFilter === "ALL") {
        return true;
      }
      return row.status === quizParticipationFilter;
    });
  }, [quizParticipationFilter, quizParticipationRows]);
  const quizParticipationCounts = useMemo(
    () => ({
      started: quizParticipationRows.filter((row) => row.status !== "NOT_STARTED").length,
      notStarted: quizParticipationRows.filter((row) => row.status === "NOT_STARTED").length,
      waitingReview: quizParticipationRows.filter((row) => row.status === "WAITING_REVIEW").length,
      passed: quizParticipationRows.filter((row) => row.status === "PASSED").length,
      notPassed: quizParticipationRows.filter((row) => row.status === "NOT_PASSED").length,
    }),
    [quizParticipationRows]
  );

  const activeStudentFilterCount = (progressGroupFilter !== "ALL" ? 1 : 0) + studentStatusFilters.length;
  const areThresholdsChanged =
    progressThresholds.low !== draftProgressThresholds.low || progressThresholds.high !== draftProgressThresholds.high;
  const areThresholdsValid = draftProgressThresholds.low < draftProgressThresholds.high;

  const applyProgressThresholds = () => {
    if (!areThresholdsValid) {
      return;
    }

    const nextThresholds = normalizeProgressThresholds(draftProgressThresholds);
    setProgressThresholds(nextThresholds);
    setDraftProgressThresholds(nextThresholds);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        getProgressThresholdStorageKey(workspaceBasePath),
        JSON.stringify(nextThresholds)
      );
    }
  };

  const resetProgressThresholds = () => {
    setProgressThresholds(DEFAULT_PROGRESS_THRESHOLDS);
    setDraftProgressThresholds(DEFAULT_PROGRESS_THRESHOLDS);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getProgressThresholdStorageKey(workspaceBasePath));
    }
  };

  const resetStudentFilters = () => {
    setProgressGroupFilter("ALL");
    setStudentStatusFilters([]);
  };

  const toggleStudentStatusFilter = (filterKey) => {
    setStudentStatusFilters((current) =>
      current.includes(filterKey)
        ? current.filter((item) => item !== filterKey)
        : [...current, filterKey]
    );
  };

  const assignmentTab = {
    key: "assignments",
    label: t("reportsPage.shared.tabs.assignments"),
    children: (
      <div className="!space-y-4">
        <ReportSectionCard
          title={t("reportsPage.shared.sections.assignments.title")}
          subtitle={t("reportsPage.shared.sections.assignments.subtitle")}
          actions={
            assignmentOverviews.length > 0 ? (
              <div className="flex w-full flex-col !gap-3 md:w-auto md:flex-row">
                <Select
                  value={selectedAssignment?.assignmentId}
                  onChange={setSelectedAssignmentId}
                  showSearch
                  optionFilterProp="label"
                  className="w-full md:!w-80"
                  options={assignmentOverviews.map((item) => ({
                    value: item.assignmentId,
                    label: item.assignmentTitle,
                  }))}
                />
                {selectedAssignment ? (
                  <Button
                    onClick={() =>
                      navigate(
                        `${workspaceBasePath}/class-sections/${selectedClassSectionId}/assignments/${selectedAssignment.assignmentId}/submissions`
                      )
                    }
                  >
                    {t("reportsPage.shared.actions.openAssignment")}
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        >
          {assignmentOverviews.length === 0 || !selectedAssignment ? (
            <Empty description={t("reportsPage.shared.empty.assignments")} />
          ) : (
            <div className="!space-y-4">
              <div className="grid grid-cols-1 !gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ReportMetricCard
                  icon={<UserGroupIcon className="h-6 w-6" />}
                  label={t("reportsPage.shared.assignmentMetrics.totalStudents")}
                  value={selectedAssignment.totalStudents || 0}
                  hint={t("reportsPage.shared.assignmentMetrics.totalStudentsHint")}
                  tone="blue"
                  loading={loading}
                />
                <ReportMetricCard
                  icon={<DocumentTextIcon className="h-6 w-6" />}
                  label={t("reportsPage.shared.assignmentMetrics.submitted")}
                  value={selectedAssignment.turnedInCount || 0}
                  hint={t("reportsPage.shared.assignmentMetrics.submittedHint")}
                  tone="emerald"
                  loading={loading}
                />
                <ReportMetricCard
                  icon={<ClockIcon className="h-6 w-6" />}
                  label={t("reportsPage.shared.assignmentMetrics.waitingFeedback")}
                  value={selectedAssignment.pendingReviewCount || 0}
                  hint={t("reportsPage.shared.assignmentMetrics.waitingFeedbackHint")}
                  tone="amber"
                  loading={loading}
                />
                <ReportMetricCard
                  icon={<CheckCircleIcon className="h-6 w-6" />}
                  label={t("reportsPage.shared.assignmentMetrics.graded")}
                  value={selectedAssignment.gradedCount || 0}
                  hint={t("reportsPage.shared.assignmentMetrics.gradedHint")}
                  tone="rose"
                  loading={loading}
                />
              </div>

              <ReportSectionCard
                title={t("reportsPage.shared.sections.assignmentCoverage.title")}
                subtitle={t("reportsPage.shared.sections.assignmentCoverage.subtitle")}
              >
                <StackedStatusBarChart
                  data={assignmentStatusChartData}
                  series={[
                    {
                      key: "feedbackSent",
                      label: t("reportsPage.shared.charts.assignmentLegend.feedbackSent"),
                      color: "#10b981",
                    },
                    {
                      key: "waitingFeedback",
                      label: t("reportsPage.shared.charts.assignmentLegend.waitingFeedback"),
                      color: "#f59e0b",
                    },
                    {
                      key: "notSubmitted",
                      label: t("reportsPage.shared.charts.assignmentLegend.notSubmitted"),
                      color: "#f43f5e",
                    },
                  ]}
                  emptyText={t("reportsPage.shared.empty.assignments")}
                  loading={loading}
                />
              </ReportSectionCard>

              <div className="grid grid-cols-1 !gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <ReportSectionCard
                  title={t("reportsPage.shared.sections.assignmentDetails.title")}
                  subtitle={t("reportsPage.shared.sections.assignmentDetails.subtitle")}
                >
                  <div className="!space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <MetaRow label={t("reportsPage.shared.meta.assignmentTitle")} value={selectedAssignment.assignmentTitle} loading={loading} />
                    <MetaRow
                      label={t("reportsPage.shared.meta.assignmentDueDate")}
                      value={formatDateTimeWithOptions(selectedAssignment.dueAt, {
                        locale,
                        emptyLabel: emptyDateLabel,
                      })}
                      loading={loading}
                    />
                    <MetaRow
                      label={t("reportsPage.shared.meta.assignmentCloseDate")}
                      value={formatDateTimeWithOptions(selectedAssignment.closeAt, {
                        locale,
                        emptyLabel: emptyDateLabel,
                      })}
                      loading={loading}
                    />
                    <MetaRow label={t("reportsPage.shared.meta.assignmentScore")} value={selectedAssignment.maxScore || 0} loading={loading} />
                  </div>
                </ReportSectionCard>

                <ReportSectionCard
                  title={t("reportsPage.shared.sections.assignmentSubmissions.title")}
                  subtitle={t("reportsPage.shared.sections.assignmentSubmissions.subtitle")}
                  actions={
                    selectedAssignment ? (
                      <Button
                        onClick={() =>
                          navigate(
                            `${workspaceBasePath}/class-sections/${selectedClassSectionId}/assignments/${selectedAssignment.assignmentId}/submissions`
                          )
                        }
                      >
                        {t("reportsPage.shared.actions.openAssignmentSubmissions")}
                      </Button>
                    ) : null
                  }
                >
                  <div className="grid grid-cols-1 !gap-3 sm:grid-cols-3">
                    <MiniSummary
                      icon={<DocumentTextIcon className="h-5 w-5" />}
                      label={t("reportsPage.shared.assignmentSummary.notSubmitted")}
                      value={assignmentSubmissionSummary.notSubmitted}
                      loading={loadingAssignmentSubmissions}
                    />
                    <MiniSummary
                      icon={<ClockIcon className="h-5 w-5" />}
                      label={t("reportsPage.shared.assignmentSummary.late")}
                      value={assignmentSubmissionSummary.late}
                      loading={loadingAssignmentSubmissions}
                    />
                    <MiniSummary
                      icon={<CheckCircleIcon className="h-5 w-5" />}
                      label={t("reportsPage.shared.assignmentSummary.returned")}
                      value={assignmentSubmissionSummary.returned}
                      loading={loadingAssignmentSubmissions}
                    />
                  </div>
                  <p className="!m-0 !pt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {loadingAssignmentSubmissions
                      ? t("reportsPage.shared.sections.assignmentSubmissions.loading")
                      : t("reportsPage.shared.sections.assignmentSubmissions.note")}
                  </p>
                </ReportSectionCard>
              </div>
            </div>
          )}
        </ReportSectionCard>
      </div>
    ),
  };

  const quizTab = {
    key: "quizzes",
    label: t("reportsPage.shared.tabs.quizzes"),
    children: (
      <ReportSectionCard
        title={t("reportsPage.shared.sections.quizzes.title")}
        subtitle={t("reportsPage.shared.sections.quizzes.subtitle")}
        actions={
          quizSummaries.length > 0 ? (
            <div className="flex w-full flex-col !gap-3 md:w-auto md:flex-row">
              <Select
                value={selectedQuizSummary?.id}
                onChange={setSelectedQuizId}
                showSearch
                optionFilterProp="label"
                className="w-full md:!w-80"
                options={quizSummaries.map((item) => ({
                  value: item.id,
                  label: item.title,
                }))}
              />
              <Button onClick={() => navigate(`${workspaceBasePath}/quiz-attempts`)}>
                {t("reportsPage.shared.actions.openQuizAttempts")}
              </Button>
            </div>
          ) : null
        }
      >
        {quizSummaries.length === 0 || !selectedQuizSummary ? (
          <Empty description={t("reportsPage.shared.empty.quizzes")} />
        ) : (
          <div className="!space-y-4">
            <div className="grid grid-cols-1 !gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard
                icon={<QueueListIcon className="h-6 w-6" />}
                label={t("reportsPage.shared.quizMetrics.attempts")}
                value={selectedQuizSummary.totalAttempts}
                hint={t("reportsPage.shared.quizMetrics.attemptsHint")}
                tone="blue"
                loading={loading}
              />
              <ReportMetricCard
                icon={<ClockIcon className="h-6 w-6" />}
                label={t("reportsPage.shared.quizMetrics.waitingReview")}
                value={selectedQuizSummary.waitingReview}
                hint={t("reportsPage.shared.quizMetrics.waitingReviewHint")}
                tone="amber"
                loading={loading}
              />
              <ReportMetricCard
                icon={<CheckCircleIcon className="h-6 w-6" />}
                label={t("reportsPage.shared.quizMetrics.passed")}
                value={selectedQuizSummary.passed}
                hint={t("reportsPage.shared.quizMetrics.passedHint")}
                tone="emerald"
                loading={loading}
              />
              <ReportMetricCard
                icon={<TrophyIcon className="h-6 w-6" />}
                label={t("reportsPage.shared.quizMetrics.averageScore")}
                value={`${selectedQuizSummary.averageScore}%`}
                hint={t("reportsPage.shared.quizMetrics.averageScoreHint", {
                  score: selectedQuizSummary.highestScore,
                })}
                tone="rose"
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 !gap-4 xl:grid-cols-2">
              <ReportSectionCard
                title={t("reportsPage.shared.sections.quizDistribution.title")}
                subtitle={t("reportsPage.shared.sections.quizDistribution.subtitle")}
              >
                <SingleSeriesBarChart
                  data={selectedQuizBestAttempts.length ? quizHistogramData : []}
                  dataKey="value"
                  labelKey="label"
                  emptyText={t("reportsPage.shared.empty.quizDistribution")}
                  color="#137fec"
                  valueFormatter={(value) => t("reportsPage.shared.charts.studentsCount", { count: value })}
                  yTickFormatter={(value) => value}
                  loading={loading}
                />
              </ReportSectionCard>

              <ReportSectionCard
                title={t("reportsPage.shared.sections.quizPassRate.title")}
                subtitle={t("reportsPage.shared.sections.quizPassRate.subtitle")}
              >
                <SingleSeriesBarChart
                  data={quizPassRateData.filter((item) => item.passed || item.notPassed || item.waitingReview)}
                  dataKey="value"
                  labelKey="label"
                  layout="vertical"
                  barPercentKey="value"
                  emptyText={t("reportsPage.shared.empty.quizPassRate")}
                  color="#137fec"
                  valueFormatter={(value, _, payload) =>
                    t("reportsPage.shared.charts.quizPassRateValue", {
                      rate: value,
                      passed: payload?.passed || 0,
                      total: (payload?.passed || 0) + (payload?.notPassed || 0),
                    })
                  }
                  loading={loading}
                />
              </ReportSectionCard>
            </div>

            <ReportSectionCard
              title={t("reportsPage.shared.sections.quizParticipation.title")}
              subtitle={t("reportsPage.shared.sections.quizParticipation.subtitle")}
            >
              <div className="!mb-4 grid grid-cols-1 !gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MiniSummary
                  icon={<UserGroupIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizParticipationSummary.started")}
                  value={quizParticipationCounts.started}
                  loading={loading}
                />
                <MiniSummary
                  icon={<RectangleStackIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizParticipationSummary.notStarted")}
                  value={quizParticipationCounts.notStarted}
                  loading={loading}
                />
                <MiniSummary
                  icon={<ClockIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizParticipationSummary.waitingReview")}
                  value={quizParticipationCounts.waitingReview}
                  loading={loading}
                />
                <MiniSummary
                  icon={<CheckCircleIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizParticipationSummary.passed")}
                  value={quizParticipationCounts.passed}
                  loading={loading}
                />
                <MiniSummary
                  icon={<TrophyIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizParticipationSummary.notPassed")}
                  value={quizParticipationCounts.notPassed}
                  loading={loading}
                />
              </div>

              <div className="!mb-4 flex flex-col !gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="!m-0 text-sm font-bold text-slate-900 dark:text-white">
                    {t("reportsPage.shared.filters.quizParticipation.label")}
                  </p>
                  <p className="!m-0 !mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    {t("reportsPage.shared.filters.quizParticipation.hint")}
                  </p>
                </div>
                <Segmented
                  value={quizParticipationFilter}
                  onChange={setQuizParticipationFilter}
                  options={[
                    { value: "ALL", label: t("reportsPage.shared.filters.quizParticipation.options.all") },
                    { value: "NOT_STARTED", label: t("reportsPage.shared.quizParticipationStatus.notStarted") },
                    { value: "WAITING_REVIEW", label: t("reportsPage.shared.quizParticipationStatus.waitingReview") },
                    { value: "PASSED", label: t("reportsPage.shared.quizParticipationStatus.passed") },
                    { value: "NOT_PASSED", label: t("reportsPage.shared.quizParticipationStatus.notPassed") },
                  ]}
                />
              </div>

              <Table
                columns={quizParticipationColumns}
                dataSource={filteredQuizParticipationRows}
                loading={loading}
                locale={{ emptyText: t("reportsPage.shared.empty.quizParticipation") }}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                scroll={{ x: 920 }}
              />
            </ReportSectionCard>

            <ReportSectionCard
              title={t("reportsPage.shared.sections.quizAttempts.title")}
              subtitle={t("reportsPage.shared.sections.quizAttempts.subtitle")}
            >
              <div className="!mb-4 grid grid-cols-1 !gap-3 sm:grid-cols-3">
                <MiniSummary
                  icon={<UserGroupIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizSummary.bestResults")}
                  value={selectedQuizBestAttempts.length}
                  loading={loading}
                />
                <MiniSummary
                  icon={<CheckCircleIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizSummary.passed")}
                  value={selectedQuizBestAttempts.filter((item) => item.isPassed === true && item.gradingStatus !== "NEEDS_REVIEW").length}
                  loading={loading}
                />
                <MiniSummary
                  icon={<ClockIcon className="h-5 w-5" />}
                  label={t("reportsPage.shared.quizSummary.waitingReview")}
                  value={selectedQuizBestAttempts.filter((item) => item.gradingStatus === "NEEDS_REVIEW").length}
                  loading={loading}
                />
              </div>
              {recentQuizAttempts.length === 0 ? (
                <Empty description={t("reportsPage.shared.empty.quizAttempts")} />
              ) : (
                <div className="!space-y-3">
                  {recentQuizAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex flex-col !gap-3 !rounded-2xl border border-slate-200 bg-slate-50 !p-4 dark:border-slate-800 dark:bg-slate-800/60 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="!m-0 truncate text-sm font-bold text-slate-900 dark:text-white">
                          {attempt.studentName || t("reportsPage.shared.defaults.noName")}
                        </p>
                        <p className="!m-0 !mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTimeWithOptions(attempt.completedTime || attempt.startTime, {
                            locale,
                            emptyLabel: emptyDateLabel,
                          })}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center !gap-3">
                        <QuizResultTag attempt={attempt} t={t} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {attempt.grade == null ? t("reportsPage.shared.defaults.dash") : `${attempt.grade}%`}
                        </span>
                        <Button type="link" className="px-0" onClick={() => navigate(`${workspaceBasePath}/quiz-attempts/${attempt.id}`)}>
                          {t("reportsPage.shared.actions.openAttempt")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ReportSectionCard>
          </div>
        )}
      </ReportSectionCard>
    ),
  };

  const overviewTab = {
    key: "overview",
    label: t("reportsPage.shared.tabs.overview"),
    children: (
      <div className="grid grid-cols-1 !gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <ReportSectionCard
          title={t("reportsPage.shared.sections.progressDistribution.title")}
          subtitle={t("reportsPage.shared.sections.progressDistribution.subtitle", {
            low: progressThresholds.low,
            high: progressThresholds.high,
          })}
        >
          <div className="!space-y-4">
            <div className="grid grid-cols-1 !gap-3 sm:grid-cols-3">
              {progressChartData.map((item) => (
                <MiniSummary
                  key={item.key}
                  icon={<RectangleStackIcon className="h-5 w-5" />}
                  label={item.label}
                  value={item.value}
                  loading={loading}
                  accentColor={item.color}
                />
              ))}
            </div>
            <SingleSeriesBarChart
              data={progressChartData}
              dataKey="value"
              labelKey="label"
              layout="vertical"
              emptyText={t("reportsPage.shared.empty.progressChart")}
              valueFormatter={(value) => t("reportsPage.shared.charts.studentsCount", { count: value })}
              loading={loading}
            />
          </div>
        </ReportSectionCard>

        <ReportSectionCard
          title={t("reportsPage.shared.sections.classProfile.title")}
          subtitle={t("reportsPage.shared.sections.classProfile.subtitle")}
        >
          <div className="!mb-4 grid grid-cols-1 !gap-3 sm:grid-cols-2">
            <MiniSummary
              icon={<UserGroupIcon className="h-5 w-5" />}
              label={t("reportsPage.shared.metrics.teachingAssistants")}
              value={teachingAssistantCount}
              loading={loading}
            />
            <MiniSummary
              icon={<ClockIcon className="h-5 w-5" />}
              label={t("reportsPage.shared.metrics.pendingRequests")}
              value={stats.pendingCount}
              loading={loading}
            />
          </div>
          <div className="grid grid-cols-1 !gap-3 text-sm text-slate-600 dark:text-slate-300">
            <MetaRow label={t("reportsPage.shared.meta.className")} value={currentClassSection?.title || t("reportsPage.shared.defaults.untitledClass")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.classCode")} value={currentClassSection?.classCode || t("reportsPage.shared.defaults.noStudentNumber")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.subject")} value={currentClassSection?.subjectTitle || t("reportsPage.shared.defaults.noSubject")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.primaryTeacher")} value={currentClassSection?.teacherName || t("reportsPage.shared.defaults.unknownTeacher")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.teachingAssistants")} value={teachingAssistantCount} loading={loading} />
            <MetaRow
              label={t("reportsPage.shared.meta.status")}
              value={
                <Tag color={statusToneMap[currentClassSection?.status] || "default"}>
                  {statusLabelMap[currentClassSection?.status] || currentClassSection?.status || t("reportsPage.shared.defaults.noStudentNumber")}
                </Tag>
              }
              loading={loading}
            />
            <MetaRow label={t("reportsPage.shared.meta.startDate")} value={formatDateTimeWithOptions(currentClassSection?.startDate, { locale, emptyLabel: emptyDateLabel })} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.endDate")} value={formatDateTimeWithOptions(currentClassSection?.endDate, { locale, emptyLabel: emptyDateLabel })} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.trackedQuizzes")} value={stats.trackedQuizzes} loading={loading} />
          </div>
        </ReportSectionCard>
      </div>
    ),
  };

  const gradebookTab = {
    key: "gradebook",
    label: t("reportsPage.shared.tabs.gradebookWithCount", { count: stats.trackedQuizzes }),
    children: (
      <ReportSectionCard
        title={t("reportsPage.shared.sections.gradebook.title")}
        subtitle={t("reportsPage.shared.sections.gradebook.subtitle")}
      >
        {loading ? (
          <div className="!py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t("reportsPage.shared.loading.gradebook")}</div>
        ) : gradebookTable.rows.length === 0 ? (
          <Empty description={t("reportsPage.shared.empty.gradebook")} />
        ) : (
          <Table
            columns={gradeBookColumns}
            dataSource={gradebookTable.rows}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: Math.max(980, 520 + gradebookTable.quizzes.length * 110) }}
          />
        )}
      </ReportSectionCard>
    ),
  };

  const progressTab = {
    key: "students",
    label: extendedInsights
      ? t("reportsPage.shared.tabs.progressWithCount", { count: reportStudents.length })
      : t("reportsPage.shared.tabs.studentsWithCount", { count: reportStudents.length }),
    children: (
      <div className="!space-y-4">
        <ReportSectionCard
          title={t("reportsPage.shared.sections.progressThresholds.title")}
          subtitle={t("reportsPage.shared.sections.progressThresholds.subtitle")}
        >
          <div className="grid grid-cols-1 !gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <div className="grid grid-cols-1 !gap-4 md:grid-cols-2">
              <ThresholdField
                label={t("reportsPage.shared.thresholds.low.label")}
                hint={t("reportsPage.shared.thresholds.low.hint")}
                value={draftProgressThresholds.low}
                onChange={(value) =>
                  setDraftProgressThresholds((current) => ({
                    ...current,
                    low: Number.isFinite(value) ? value : 0,
                  }))
                }
              />
              <ThresholdField
                label={t("reportsPage.shared.thresholds.high.label")}
                hint={t("reportsPage.shared.thresholds.high.hint")}
                value={draftProgressThresholds.high}
                onChange={(value) =>
                  setDraftProgressThresholds((current) => ({
                    ...current,
                    high: Number.isFinite(value) ? value : 100,
                  }))
                }
              />
            </div>

            <div className="flex flex-wrap items-center !gap-2 xl:justify-end">
              <Button onClick={resetProgressThresholds}>
                {t("reportsPage.shared.actions.resetThresholds")}
              </Button>
              <Button
                type="primary"
                onClick={applyProgressThresholds}
                disabled={!areThresholdsValid || !areThresholdsChanged}
              >
                {t("reportsPage.shared.actions.applyThresholds")}
              </Button>
            </div>
          </div>

          <div className="!mt-4 flex flex-wrap items-center !gap-2">
            <ThresholdBadge
              label={t("reportsPage.shared.buckets.low.label")}
              hint={t("reportsPage.shared.buckets.low.hint", { low: progressThresholds.low })}
              tone="rose"
            />
            <ThresholdBadge
              label={t("reportsPage.shared.buckets.medium.label")}
              hint={t("reportsPage.shared.buckets.medium.hint", {
                low: progressThresholds.low,
                high: progressThresholds.high,
              })}
              tone="amber"
            />
            <ThresholdBadge
              label={t("reportsPage.shared.buckets.high.label")}
              hint={t("reportsPage.shared.buckets.high.hint", { high: progressThresholds.high })}
              tone="emerald"
            />
          </div>

          {!areThresholdsValid ? (
            <p className="m-0 mt-3 text-sm font-medium text-rose-600 dark:text-rose-300">
              {t("reportsPage.shared.thresholds.validation")}
            </p>
          ) : null}
        </ReportSectionCard>

        <ReportSectionCard
          title={
            extendedInsights
              ? t("reportsPage.shared.sections.progressStudents.title")
              : t("reportsPage.shared.sections.students.title")
          }
          subtitle={
            extendedInsights
              ? t("reportsPage.shared.sections.progressStudents.subtitle")
              : t("reportsPage.shared.sections.students.subtitle")
          }
        >
          <div className="!mb-4 !space-y-4">
            <div className="flex flex-col !gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="!m-0 text-sm font-bold text-slate-900 dark:text-white">
                  {t("reportsPage.shared.filters.studentGroups.label")}
                </p>
                <p className="!m-0 !mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  {t("reportsPage.shared.filters.studentGroups.hint")}
                </p>
              </div>

              <Segmented
                value={progressGroupFilter}
                onChange={setProgressGroupFilter}
                options={[
                  { value: "ALL", label: t("reportsPage.shared.filters.studentGroups.options.all") },
                  { value: "LOW", label: t("reportsPage.shared.buckets.low.label") },
                  { value: "MEDIUM", label: t("reportsPage.shared.buckets.medium.label") },
                  { value: "HIGH", label: t("reportsPage.shared.buckets.high.label") },
                ]}
              />
            </div>

            <div className="flex flex-col !gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="!m-0 text-sm font-bold text-slate-900 dark:text-white">
                  {t("reportsPage.shared.filters.studentStatus.label")}
                </p>
                <p className="!m-0 !mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  {t("reportsPage.shared.filters.studentStatus.hint")}
                </p>
              </div>

              <div className="flex flex-wrap items-center !gap-2 xl:justify-end">
                <FilterChip
                  active={studentStatusFilters.includes("MISSING_ASSIGNMENTS")}
                  label={t("reportsPage.shared.filters.studentStatus.options.missingAssignments")}
                  onClick={() => toggleStudentStatusFilter("MISSING_ASSIGNMENTS")}
                />
                <FilterChip
                  active={studentStatusFilters.includes("PENDING_REVIEWS")}
                  label={t("reportsPage.shared.filters.studentStatus.options.pendingReviews")}
                  onClick={() => toggleStudentStatusFilter("PENDING_REVIEWS")}
                />
                <FilterChip
                  active={studentStatusFilters.includes("LOW_LATEST_SCORE")}
                  label={t("reportsPage.shared.filters.studentStatus.options.lowLatestScore", {
                    score: lowScoreThreshold,
                  })}
                  onClick={() => toggleStudentStatusFilter("LOW_LATEST_SCORE")}
                />
                <FilterChip
                  active={studentStatusFilters.includes("NO_LATEST_SCORE")}
                  label={t("reportsPage.shared.filters.studentStatus.options.noLatestScore")}
                  onClick={() => toggleStudentStatusFilter("NO_LATEST_SCORE")}
                />
                <Button onClick={resetStudentFilters} disabled={activeStudentFilterCount === 0}>
                  {t("reportsPage.shared.actions.clearStudentFilters")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 !gap-3 sm:grid-cols-3">
              <MiniSummary
                icon={<UserGroupIcon className="h-5 w-5" />}
                label={t("reportsPage.shared.summary.filteredStudents")}
                value={filteredStudents.length}
                loading={loading}
              />
              <MiniSummary
                icon={<RectangleStackIcon className="h-5 w-5" />}
                label={t("reportsPage.shared.summary.activeStudentFilters")}
                value={activeStudentFilterCount}
                loading={loading}
              />
              <MiniSummary
                icon={<TrophyIcon className="h-5 w-5" />}
                label={t("reportsPage.shared.summary.scoreWatchMark")}
                value={`${lowScoreThreshold}${t("reportsPage.shared.defaults.scoreUnit")}`}
                loading={loading}
              />
            </div>
          </div>

          <Table
            columns={progressColumns}
            dataSource={filteredStudents.map((item) => ({ ...item, key: item.id || item.studentId }))}
            loading={loading}
            locale={{ emptyText: t("reportsPage.shared.empty.filteredStudents") }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 940 }}
          />
        </ReportSectionCard>
      </div>
    ),
  };

  const requestsTab = {
    key: "requests",
    label: t("reportsPage.shared.tabs.requestsWithCount", { count: pendingRequests.length }),
    children: (
      <ReportSectionCard
        title={t("reportsPage.shared.sections.requests.title")}
        subtitle={t("reportsPage.shared.sections.requests.subtitle")}
      >
        <Table
          columns={pendingColumns}
          dataSource={pendingRequests.map((item) => ({ ...item, key: item.id || item.studentId }))}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 860 }}
        />
      </ReportSectionCard>
    ),
  };

  const tabItems = extendedInsights
    ? [overviewTab, assignmentTab, quizTab, gradebookTab, progressTab, requestsTab]
    : [overviewTab, gradebookTab, progressTab, requestsTab];

  if (!classSections.length) {
    return (
      <ReportSectionCard title={t("reportsPage.shared.sections.emptyState.title")} subtitle={t("reportsPage.shared.sections.emptyState.subtitle")}>
        <Empty description={defaultEmptyMessage} />
      </ReportSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <ReportSectionCard
        title={t("reportsPage.shared.sections.filters.title")}
        subtitle={t("reportsPage.shared.sections.filters.subtitle")}
        actions={
          <div className="w-full md:!w-80">
            <Select
              value={selectedClassSectionId}
              onChange={onSelectClassSection}
              showSearch
              optionFilterProp="label"
              className="w-full"
              options={classSections.map((item) => ({
                value: item.id,
                label: item.title || item.classCode || t("reportsPage.shared.defaults.classTitle", { id: item.id }),
              }))}
              placeholder={defaultSelectorLabel}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 !gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ReportMetricCard
            icon={<UserGroupIcon className="h-6 w-6" />}
            label={t("reportsPage.shared.metrics.totalStudents")}
            value={stats.totalStudents}
            hint={t("reportsPage.shared.metrics.totalStudentsHint", {
              count: stats.atRiskStudents,
              low: progressThresholds.low,
            })}
            tone="blue"
            loading={loading}
          />
          <ReportMetricCard
            icon={<ClockIcon className="h-6 w-6" />}
            label={t("reportsPage.shared.metrics.pendingRequests")}
            value={stats.pendingCount}
            hint={t("reportsPage.shared.metrics.pendingRequestsHint")}
            tone="amber"
            loading={loading}
          />
          <ReportMetricCard
            icon={<TrophyIcon className="h-6 w-6" />}
            label={t("reportsPage.shared.metrics.averageQuizScore")}
            value={stats.averageQuizScore}
            hint={t("reportsPage.shared.metrics.averageQuizScoreHint", { score: stats.topScore })}
            tone="emerald"
            loading={loading}
          />
          <ReportMetricCard
            icon={<CheckCircleIcon className="h-6 w-6" />}
            label={t("reportsPage.shared.metrics.averageProgress")}
            value={`${stats.averageProgress}%`}
            hint={t("reportsPage.shared.metrics.averageProgressHint", {
              count: stats.engagedStudents,
              high: progressThresholds.high,
            })}
            tone="rose"
            loading={loading}
          />
          <ReportMetricCard
            icon={<AcademicCapIcon className="h-6 w-6" />}
            label={t("reportsPage.shared.metrics.teachingAssistants")}
            value={teachingAssistantCount}
            hint={t("reportsPage.shared.metrics.teachingAssistantsHint", { count: teachingAssistantCount })}
            tone="slate"
            loading={loading}
          />
        </div>
      </ReportSectionCard>

      <div className="grid grid-cols-1 !gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <ReportSectionCard
          title={t("reportsPage.shared.sections.operations.title")}
          subtitle={t("reportsPage.shared.sections.operations.subtitle")}
        >
          <div className="grid grid-cols-1 !gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniSummary
              icon={<AcademicCapIcon className="h-5 w-5" />}
              label={t("reportsPage.shared.summary.trackedQuizzes")}
              value={stats.trackedQuizzes}
              loading={loading}
            />
            <MiniSummary
              icon={<RectangleStackIcon className="h-5 w-5" />}
              label={t("reportsPage.shared.summary.atRiskStudents")}
              value={stats.atRiskStudents}
              loading={loading}
            />
            <MiniSummary
              icon={<UserGroupIcon className="h-5 w-5" />}
              label={t("reportsPage.shared.summary.engagedStudents")}
              value={stats.engagedStudents}
              loading={loading}
            />
            <MiniSummary
              icon={<AcademicCapIcon className="h-5 w-5" />}
              label={t("reportsPage.shared.metrics.teachingAssistants")}
              value={teachingAssistantCount}
              loading={loading}
            />
          </div>
        </ReportSectionCard>

        <ReportSectionCard
          title={t("reportsPage.shared.sections.context.title")}
          subtitle={t("reportsPage.shared.sections.context.subtitle")}
        >
          <div className="!space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <MetaRow label={t("reportsPage.shared.meta.currentClass")} value={currentClassSection?.title || t("reportsPage.shared.defaults.noSelectedClass")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.classCode")} value={currentClassSection?.classCode || t("reportsPage.shared.defaults.noStudentNumber")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.subject")} value={currentClassSection?.subjectTitle || t("reportsPage.shared.defaults.noSubject")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.teacher")} value={currentClassSection?.teacherName || t("reportsPage.shared.defaults.unknownTeacher")} loading={loading} />
            <MetaRow label={t("reportsPage.shared.meta.teachingAssistants")} value={teachingAssistantCount} loading={loading} />
          </div>
        </ReportSectionCard>
      </div>

      <ReportSectionCard title={t("reportsPage.shared.sections.details.title")}>
        <Tabs activeKey={activeTab} onChange={onTabChange} items={tabItems} />
      </ReportSectionCard>
    </div>
  );
}

function ProgressCell({ progress, thresholds = DEFAULT_PROGRESS_THRESHOLDS }) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
  const normalizedThresholds = normalizeProgressThresholds(thresholds);
  const toneClass =
    safeProgress < normalizedThresholds.low
      ? "bg-rose-500"
      : safeProgress < normalizedThresholds.high
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="dark:text-slate-400">{safeProgress}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-2 rounded-full ${toneClass}`} style={{ width: `${safeProgress}%` }} />
      </div>
    </div>
  );
}

function ThresholdField({ label, hint, value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
      <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">{label}</p>
      <p className="m-0 mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>
      <div className="mt-3 flex items-center gap-2">
        <InputNumber
          min={0}
          max={100}
          value={value}
          onChange={onChange}
          controls
          className="w-full"
        />
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">%</span>
      </div>
    </div>
  );
}

function ThresholdBadge({ label, hint, tone }) {
  const toneClass = {
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300",
  }[tone];

  return (
    <div className={`rounded-full border px-3 py-2 ${toneClass}`}>
      <div className="text-xs font-bold uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-1 text-xs">{hint}</div>
    </div>
  );
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary dark:border-blue-400/50 dark:bg-blue-500/15 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function MiniSummary({ icon, label, value, loading = false, accentColor = null }) {
  return (
    <div className="!rounded-2xl border border-slate-200 bg-slate-50 !p-4 dark:border-slate-800 dark:bg-slate-800/70">
      <div className="flex items-center !gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[0.16em]">{label}</span>
      </div>
      {loading ? (
        <div className="!mt-3 h-8 w-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      ) : (
        <p className="!m-0 !mt-3 text-3xl font-black text-slate-950 dark:text-white" style={accentColor ? { color: accentColor } : undefined}>
          {value}
        </p>
      )}
    </div>
  );
}

function MetaRow({ label, value, loading = false }) {
  return (
    <div className="flex items-start justify-between !gap-4 border-b border-dashed border-slate-200 !pb-3 last:border-b-0 last:!pb-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      {loading ? (
        <div className="h-4 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      ) : (
        <div className="text-right font-semibold text-slate-900 dark:text-white">{value}</div>
      )}
    </div>
  );
}

function QuizResultTag({ attempt, t }) {
  if (attempt.gradingStatus === "NEEDS_REVIEW") {
    return <Tag color="gold">{t("reportsPage.shared.quizResult.waitingReview")}</Tag>;
  }
  if (attempt.isPassed === true) {
    return <Tag color="green">{t("reportsPage.shared.quizResult.passed")}</Tag>;
  }
  if (attempt.isPassed === false) {
    return <Tag color="red">{t("reportsPage.shared.quizResult.notPassed")}</Tag>;
  }
  return <Tag>{t("reportsPage.shared.defaults.dash")}</Tag>;
}

function QuizParticipationTag({ status, t }) {
  if (status === "NOT_STARTED") {
    return <Tag>{t("reportsPage.shared.quizParticipationStatus.notStarted")}</Tag>;
  }
  if (status === "WAITING_REVIEW") {
    return <Tag color="gold">{t("reportsPage.shared.quizParticipationStatus.waitingReview")}</Tag>;
  }
  if (status === "PASSED") {
    return <Tag color="green">{t("reportsPage.shared.quizParticipationStatus.passed")}</Tag>;
  }
  if (status === "NOT_PASSED") {
    return <Tag color="red">{t("reportsPage.shared.quizParticipationStatus.notPassed")}</Tag>;
  }
  return <Tag>{t("reportsPage.shared.defaults.dash")}</Tag>;
}
