import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { App, Button, Empty, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import UserIdentity from "../../components/common/UserIdentity";
import { getQuizById, getQuizAttemptsByClassContentItem } from "../../api/quiz";

function formatDateTime(value, locale) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString(locale);
  }
}

function formatEarnedMarks(record) {
  if (record.earnedPoints != null && record.totalPoints != null) {
    return `${Number(record.earnedPoints).toFixed(2)} / ${Number(record.totalPoints).toFixed(2)} (${record.grade ?? 0}%)`;
  }
  return `${record.grade ?? 0}%`;
}

function ResultTag({ record, t }) {
  if (record.gradingStatus === "NEEDS_REVIEW") {
    return <Tag color="gold">{t("quizAttempts.pending")}</Tag>;
  }
  if (record.isPassed) {
    return <Tag color="green">{t("quizAttempts.pass")}</Tag>;
  }
  return <Tag color="red">{t("quizAttempts.fail")}</Tag>;
}

export default function TeachingQuizContentAttempts() {
  const { classSectionId, quizId } = useParams();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const classContentItemId =
    new URLSearchParams(location.search).get("classContentItemId") || location.state?.classContentItemId || null;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const locale = useMemo(() => (i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US"), [i18n.language]);

  useEffect(() => {
    const load = async () => {
      if (!classContentItemId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [quizResponse, attemptsResponse] = await Promise.all([
          getQuizById(quizId, classContentItemId),
          getQuizAttemptsByClassContentItem(classContentItemId, {
            page: page - 1,
            size: pageSize,
          }),
        ]);
        const quizData = quizResponse?.data || quizResponse;
        const attemptsData = attemptsResponse?.data || attemptsResponse;
        setQuiz(quizData);
        setAttempts(attemptsData?.pageList || []);
        setTotal(attemptsData?.totalElements || 0);
      } catch (error) {
        message.error(error?.response?.data?.message || t("quizAttempts.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [classContentItemId, page, pageSize, quizId, message, t]);

  const columns = useMemo(
    () => [
      {
        title: t("quizAttempts.student"),
        dataIndex: "studentName",
        width: 240,
        render: (_, record) => (
          <UserIdentity
            user={record}
            variant="student"
            avatarSizeClass="size-10"
            avatarInitialsClass="text-sm"
            fallbackName={record.studentEmail || `ID: ${record.studentId ?? "-"}`}
          />
        ),
      },
      {
        title: t("quizAttempts.completedAt"),
        dataIndex: "completedTime",
        width: 170,
        render: (value) => (
          <span className="text-slate-600 dark:text-slate-300">{formatDateTime(value, locale)}</span>
        ),
      },
      {
        title: t("quizAttempts.questions"),
        dataIndex: "totalQuestions",
        width: 90,
        align: "center",
      },
      {
        title: t("quizAttempts.correct"),
        dataIndex: "correctAnswers",
        width: 90,
        align: "center",
      },
      {
        title: t("quizAttempts.incorrect"),
        dataIndex: "incorrectAnswers",
        width: 90,
        align: "center",
      },
      {
        title: t("quizAttempts.earnedMarks"),
        width: 150,
        align: "center",
        render: (_, record) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">{formatEarnedMarks(record)}</span>
        ),
      },
      {
        title: t("quizAttempts.result"),
        width: 110,
        align: "center",
        render: (_, record) => <ResultTag record={record} t={t} />,
      },
      {
        title: t("quizAttempts.review"),
        width: 120,
        align: "center",
        render: (_, record) => (
          <Button className="app-table-action-btn" onClick={() => navigate(`/teaching/quiz-attempts/${record.id}`)}>
            {t("quizAttempts.review")}
          </Button>
        ),
      },
    ],
    [locale, navigate, t]
  );

  return (
    <TeachingLayout>
      <div className="mx-auto w-full space-y-4 p-6">
        <AppBreadcrumb
          className="mb-1"
          context={{
            classSectionId,
            quizTitle: quiz?.title || location.state?.itemTitle,
          }}
        />

        {!classContentItemId ? (
          <div className="app-table-shell px-5 py-10 sm:px-6">
            <Empty description={t("quizAttempts.missingContext", "Không tìm thấy ngữ cảnh quiz trong lớp.")} />
          </div>
        ) : (
          <div className="app-table-shell">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
              <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                {quiz?.title || location.state?.itemTitle || `Quiz #${quizId}`}
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("quizAttempts.pagination.total", { count: total })}
              </p>
            </div>

            <div className="px-5 py-4 sm:px-6">
              <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={attempts}
                pagination={false}
                scroll={{ x: 1050 }}
                sticky
                className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:text-slate-600 dark:[&_.ant-table-thead_th]:bg-slate-800 dark:[&_.ant-table-thead_th]:text-slate-200"
                locale={{
                  emptyText: <Empty description={t("quizAttempts.empty")} />,
                }}
              />
            </div>

            <DataPaginationFooter
              currentPage={page}
              pageSize={pageSize}
              total={total}
              totalLabel={t("quizAttempts.pagination.total", { count: total })}
              pageSizeLabel={t("quizAttempts.pagination.pageSize")}
              rangeLabel={t("quizAttempts.pagination.range", {
                start: total === 0 ? 0 : (page - 1) * pageSize + 1,
                end: Math.min(page * pageSize, total),
              })}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </TeachingLayout>
  );
}
