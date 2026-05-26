import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { App, Button, Empty, Input, InputNumber, Modal, Select, Spin, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { ArrowLeft, ClipboardCheck, FileCheck2 } from "lucide-react";
import dayjs from "dayjs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import Avatar from "../../components/common/Avatar";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { getAssignmentById } from "../../api/assignment";
import { getAssignmentSubmissions, gradeSubmission, returnSubmission } from "../../api/submission";

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

const quillFormats = ["header", "bold", "italic", "underline", "list", "bullet", "link"];

const DEFAULT_PAGE_SIZE = 10;
const SUBMISSION_STATUSES = ["ALL", "NOT_SUBMITTED", "SUBMITTED", "LATE_SUBMITTED", "GRADED", "RETURNED"];

function formatSubmissionTime(value, fallback) {
  if (!value) return fallback;
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function getStatusColor(status) {
  return {
    NOT_SUBMITTED: "default",
    SUBMITTED: "processing",
    LATE_SUBMITTED: "warning",
    GRADED: "success",
    RETURNED: "purple",
  }[status] || "default";
}

function getStudentAvatar(record) {
  return record.studentAvatar || record.avatarUrl || record.imageUrl || record.avatar || null;
}

function SubmissionMetric({ icon: Icon, label, value, tone = "blue" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className="m-0 mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

export default function AssignmentSubmissions({ isAdmin = false, teachingMode = false }) {
  const { classSectionId, assignmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const basePath = isAdmin ? "/admin" : "/teacher";
  const classContentItemId =
    new URLSearchParams(location.search).get("classContentItemId") || location.state?.classContentItemId || null;
  const returnPath = location.state?.returnPath || null;

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grading, setGrading] = useState(false);
  const [gradeValue, setGradeValue] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [assignmentResponse, submissionsResponse] = await Promise.all([
        getAssignmentById(assignmentId, classContentItemId),
        getAssignmentSubmissions(assignmentId, {
          classSectionId,
          includeNotSubmitted: true,
          keyword: debouncedKeyword || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          pageNumber: page,
          pageSize,
        }),
      ]);

      const assignmentData = assignmentResponse?.data || assignmentResponse;
      const submissionsData = submissionsResponse?.data || submissionsResponse;
      const pageList = Array.isArray(submissionsData?.pageList)
        ? submissionsData.pageList
        : (Array.isArray(submissionsData) ? submissionsData : []);
      setAssignment(assignmentData);
      setSubmissions(pageList);
      setTotalSubmissions(submissionsData?.totalElements ?? pageList.length);
    } catch (error) {
      console.error(error);
      message.error(t("assignments.submissions.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [assignmentId, classSectionId, classContentItemId, debouncedKeyword, statusFilter, page, pageSize]);

  const openGradeModal = (submission) => {
    setSelectedSubmission(submission);
    setGradeValue(submission.grade ?? null);
    setFeedback(submission.feedback || "");
  };

  const closeGradeModal = () => {
    setSelectedSubmission(null);
    setGradeValue(null);
    setFeedback("");
  };

  const handleGrade = async () => {
    if (!selectedSubmission?.id) return;
    if (gradeValue === null || gradeValue === undefined) {
      message.warning(t("assignments.submissions.errors.inputGrade"));
      return;
    }

    try {
      setGrading(true);
      await gradeSubmission(selectedSubmission.id, {
        grade: Number(gradeValue),
        feedback,
      });
      message.success(t("assignments.submissions.messages.graded"));
      closeGradeModal();
      await refreshData();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("assignments.submissions.errors.gradeFailed"));
    } finally {
      setGrading(false);
    }
  };

  const handleReturnOnly = async () => {
    if (!selectedSubmission?.id) return;
    if (!feedback?.trim()) {
      message.warning(t("assignments.submissions.errors.inputFeedback"));
      return;
    }

    try {
      setGrading(true);
      await returnSubmission(selectedSubmission.id, { feedback });
      message.success(t("assignments.submissions.messages.returned"));
      closeGradeModal();
      await refreshData();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || t("assignments.submissions.errors.returnFailed"));
    } finally {
      setGrading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, statusFilter, pageSize]);

  const metrics = useMemo(
    () => ({
      total: totalSubmissions,
      submitted: submissions.filter((item) => item.status && item.status !== "NOT_SUBMITTED").length,
      pending: submissions.filter((item) => item.status === "SUBMITTED" || item.status === "LATE_SUBMITTED").length,
      graded: submissions.filter((item) => item.status === "GRADED").length,
    }),
    [submissions, totalSubmissions]
  );

  const statusOptions = useMemo(
    () =>
      SUBMISSION_STATUSES.map((status) => ({
        value: status,
        label:
          status === "ALL"
            ? t("assignments.submissions.filters.allStatuses")
            : t(`assignments.submissionStatus.${status}`),
      })),
    [t]
  );

  const columns = useMemo(
    () => [
      {
        title: t("assignments.submissions.columns.student"),
        dataIndex: "studentName",
        key: "studentName",
        render: (_, record) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={getStudentAvatar(record)}
              alt={record.studentName}
              sizeClass="size-10"
              initialsClass="text-sm"
            />
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
                {record.studentName || t("assignments.submissions.unknownStudent", { id: record.studentId ?? "N/A" })}
              </p>
              <p className="m-0 mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("assignments.submissions.studentNumber")}: {record.studentNumber || "N/A"}
              </p>
            </div>
          </div>
        ),
      },
      {
        title: t("assignments.submissions.columns.status"),
        dataIndex: "status",
        key: "status",
        width: 150,
        align: "center",
        render: (value) => (
          <Tag color={getStatusColor(value)}>{t(`assignments.submissionStatus.${value || "NOT_SUBMITTED"}`)}</Tag>
        ),
      },
      {
        title: t("assignments.submissions.columns.submittedAt"),
        dataIndex: "submissionTime",
        key: "submissionTime",
        width: 180,
        render: (value) => formatSubmissionTime(value, t("assignments.submissions.notSubmitted")),
      },
      {
        title: t("assignments.submissions.columns.grade"),
        dataIndex: "grade",
        key: "grade",
        width: 120,
        align: "right",
        render: (value) => (value === null || value === undefined ? "—" : `${value}/${assignment?.maxScore || 100}`),
      },
      {
        title: t("assignments.submissions.columns.action"),
        key: "action",
        width: 150,
        align: "right",
        render: (_, record) => (
          <Button
            disabled={!record.id || record.status === "NOT_SUBMITTED"}
            onClick={() => openGradeModal(record)}
          >
            {t("assignments.submissions.actions.gradeReturn")}
          </Button>
        ),
      },
    ],
    [assignment?.maxScore, t]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const backPath = teachingMode
    ? returnPath || `/teaching/class-sections/${classSectionId}/content`
    : `${basePath}/class-sections/${classSectionId}/assignments/${assignmentId}`;

  const content = (
      <div className="mx-auto w-full max-w-[1440px] p-6 space-y-4">
      <AppBreadcrumb
        className="mb-1"
        context={{
          classTitle: assignment?.classSectionTitle || assignment?.classTitle,
          assignmentTitle: assignment?.title,
        }}
      />
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate(backPath)}
        className="px-0! text-primary!"
      >
        {teachingMode ? t("assignments.submissions.backToContent") : t("assignments.submissions.backToAssignment")}
      </Button>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SubmissionMetric icon={ClipboardCheck} label={t("assignments.submissions.metrics.total")} value={metrics.total} />
        <SubmissionMetric icon={FileCheck2} label={t("assignments.submissions.metrics.submitted")} value={metrics.submitted} tone="green" />
        <SubmissionMetric icon={ClipboardCheck} label={t("assignments.submissions.metrics.pending")} value={metrics.pending} tone="amber" />
        <SubmissionMetric icon={FileCheck2} label={t("assignments.submissions.metrics.graded")} value={metrics.graded} tone="slate" />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
          <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
            {t("assignments.submissions.title", { title: assignment?.title || `#${assignmentId}` })}
          </h1>
          <p className="m-0 mt-1 text-sm text-slate-500">
            {t("assignments.submissions.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            className="w-full"
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t("assignments.submissions.searchPlaceholder")}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            className="w-full"
            showSearch
            optionFilterProp="label"
          />
        </div>

        <div className="px-5 py-4 sm:px-6">
          {submissions.length === 0 ? (
            <div className="py-16">
              <Empty description={t("assignments.submissions.empty")} />
            </div>
          ) : (
            <Table
              rowKey={(record) => `${record.studentId || "none"}-${record.id || "empty"}`}
              columns={columns}
              dataSource={submissions}
              pagination={false}
              scroll={{ x: 860 }}
            />
          )}
        </div>

        {totalSubmissions > 0 && (
          <DataPaginationFooter
            currentPage={page}
            pageSize={pageSize}
            total={totalSubmissions}
            totalLabel={t("assignments.pagination.total", { count: totalSubmissions })}
            pageSizeLabel={t("assignments.pagination.pageSize")}
            rangeLabel={t("assignments.pagination.range", {
              start: totalSubmissions === 0 ? 0 : (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, totalSubmissions),
            })}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        )}
      </div>

      <Modal
        title={t("assignments.submissions.modal.title")}
        open={Boolean(selectedSubmission)}
        onCancel={closeGradeModal}
        footer={null}
        width={880}
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Avatar
                src={getStudentAvatar(selectedSubmission)}
                alt={selectedSubmission.studentName}
                sizeClass="size-12"
              />
              <div>
                <p className="m-0 font-semibold text-slate-900">{selectedSubmission.studentName}</p>
                <p className="m-0 text-xs text-slate-500">
                  {t("assignments.submissions.studentNumber")}: {selectedSubmission.studentNumber || "N/A"}
                </p>
                <p className="m-0 text-xs text-slate-500">
                  {t("assignments.submissions.columns.submittedAt")}: {formatSubmissionTime(selectedSubmission.submissionTime, t("assignments.submissions.notSubmitted"))}
                </p>
              </div>
            </div>

            {selectedSubmission.description && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs uppercase text-slate-500 mb-2">{t("assignments.submissions.modal.content")}</p>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedSubmission.description }}
                />
              </div>
            )}

            {Array.isArray(selectedSubmission.resources) && selectedSubmission.resources.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="text-xs uppercase text-slate-500">{t("assignments.submissions.modal.attachments")}</p>
                {selectedSubmission.resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.fileUrl || resource.embedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-primary hover:underline text-sm"
                  >
                    {resource.title}
                  </a>
                ))}
              </div>
            )}

            <div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">{t("assignments.submissions.modal.grade")}</p>
                <InputNumber
                  className="w-full"
                  min={0}
                  max={assignment?.maxScore || 100}
                  value={gradeValue}
                  onChange={setGradeValue}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">{t("assignments.submissions.modal.feedback")}</p>
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                value={feedback}
                onChange={setFeedback}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleReturnOnly} loading={grading}>
                {t("assignments.submissions.actions.returnOnly")}
              </Button>
              <Button type="primary" onClick={handleGrade} loading={grading}>
                {t("assignments.submissions.actions.saveGrade")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  if (teachingMode) {
    return <TeachingLayout>{content}</TeachingLayout>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-16 lg:pl-64">{content}</main>
      </div>
    </div>
  );
}
