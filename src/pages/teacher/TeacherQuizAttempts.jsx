import React, { useEffect, useMemo, useState } from "react";
import { App, Button, Empty, Input, Select, Table, Tabs, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { getManagedQuizAttempts } from "../../api/quiz";
import {
  getAdminCourses,
  getClassChapters,
  getClassContentItems,
  getTeacherCourses,
} from "../../api/classSection";

const RESULT_TABS = [
  { key: "ALL", result: undefined },
  { key: "PASS", result: "PASS" },
  { key: "FAIL", result: "FAIL" },
  { key: "PENDING", result: "PENDING" },
];

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_FILTERS = {
  classSectionId: undefined,
  quizId: undefined,
  studentKeyword: "",
};

function unwrapList(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  return data?.pageList || [];
}

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

export default function TeacherQuizAttempts({ isAdmin = false }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [quizOptions, setQuizOptions] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [activeTab, setActiveTab] = useState("ALL");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState(DEFAULT_FILTERS);

  const base = isAdmin ? "/admin" : "/teacher";
  const result = RESULT_TABS.find((tab) => tab.key === activeTab)?.result;
  const locale = useMemo(() => (i18n.language?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US"), [i18n.language]);

  const applyFiltersNow = () => {
    setDebouncedFilters({
      classSectionId: filters.classSectionId,
      quizId: filters.quizId,
      studentKeyword: filters.studentKeyword.trim(),
    });
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setDebouncedFilters({
          classSectionId: filters.classSectionId,
          quizId: filters.quizId,
          studentKeyword: filters.studentKeyword.trim(),
        }),
      300
    );
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedFilters, activeTab, pageSize]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setFiltersLoading(true);
        const response = isAdmin ? await getAdminCourses(1, 200) : await getTeacherCourses(1, 200);
        setCourses(unwrapList(response));
      } catch (error) {
        message.error(error?.response?.data?.message || error?.message || t("quizAttempts.loadFiltersFailed"));
      } finally {
        setFiltersLoading(false);
      }
    };

    loadCourses();
  }, [isAdmin, message, t]);

  useEffect(() => {
    const loadQuizOptions = async () => {
      if (!filters.classSectionId) {
        setQuizOptions([]);
        return;
      }

      try {
        setFiltersLoading(true);
        const chapters = await getClassChapters(filters.classSectionId);
        const chapterList = Array.isArray(chapters?.data) ? chapters.data : Array.isArray(chapters) ? chapters : [];

        const contentCollections = await Promise.all(
          chapterList.map(async (chapter) => {
            if (Array.isArray(chapter?.contentItems) && chapter.contentItems.length > 0) {
              return chapter.contentItems;
            }
            const contentItems = await getClassContentItems(filters.classSectionId, chapter.id);
            return Array.isArray(contentItems?.data) ? contentItems.data : Array.isArray(contentItems) ? contentItems : [];
          })
        );

        const seenQuizIds = new Set();
        const nextQuizOptions = contentCollections
          .flat()
          .filter((item) => item?.itemType === "QUIZ" && item?.quizId != null && !seenQuizIds.has(item.quizId))
          .map((item) => {
            seenQuizIds.add(item.quizId);
            return {
              value: item.quizId,
              label: item.displayTitle || item.title || `Quiz #${item.quizId}`,
            };
          });

        setQuizOptions(nextQuizOptions);
      } catch (error) {
        setQuizOptions([]);
        message.error(error?.response?.data?.message || error?.message || t("quizAttempts.loadQuizOptionsFailed"));
      } finally {
        setFiltersLoading(false);
      }
    };

    loadQuizOptions();
  }, [filters.classSectionId, message, t]);

  const loadAttempts = async () => {
    try {
      setLoading(true);
      const response = await getManagedQuizAttempts({
        page: page - 1,
        size: pageSize,
        result,
        classSectionId: debouncedFilters.classSectionId,
        quizId: debouncedFilters.quizId,
        studentKeyword: debouncedFilters.studentKeyword || undefined,
      });
      const payload = response?.data;
      const pageList = Array.isArray(payload?.pageList) ? payload.pageList : Array.isArray(payload) ? payload : [];
      const totalElements = payload?.totalElements ?? pageList.length ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
      if (page > totalPages && totalElements > 0) {
        setPage(totalPages);
        return;
      }
      setAttempts(pageList);
      setTotal(totalElements);
    } catch (error) {
      message.error(error?.response?.data?.message || error?.message || t("quizAttempts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, activeTab, debouncedFilters]);

  const columns = useMemo(
    () => [
      {
        title: t("quizAttempts.quizInfo"),
        dataIndex: "quizTitle",
        width: 280,
        render: (_, record) => (
          <div className="min-w-0 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-white break-words">
              {record.quizTitle || `Quiz #${record.quizId}`}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {formatDateTime(record.completedTime || record.startTime, locale)}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {t("quizAttempts.student")}: {record.studentName || record.studentEmail || record.studentId}
            </div>
          </div>
        ),
      },
      {
        title: t("quizAttempts.course"),
        dataIndex: "classSectionTitle",
        width: 180,
        render: (value) => <span className="text-slate-700 dark:text-slate-300">{value || "-"}</span>,
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
        render: (_, record) => <span className="font-medium text-slate-700 dark:text-slate-300">{formatEarnedMarks(record)}</span>,
        width: 140,
        align: "center",
      },
      {
        title: t("quizAttempts.result"),
        render: (_, record) => <ResultTag record={record} t={t} />,
        width: 110,
        align: "center",
      },
      {
        title: t("quizAttempts.details"),
        width: 110,
        align: "center",
        render: (_, record) => (
          <Button
            className="app-table-action-btn"
            onClick={() => navigate(`${base}/quiz-attempts/${record.id}`)}
          >
            {t("quizAttempts.review")}
          </Button>
        ),
      },
    ],
    [base, locale, navigate, t]
  );

  return (
    <div className="teacher-list-page min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-white">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-16 lg:pl-64">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <AppBreadcrumb className="mb-4" />

            <div className="app-table-shell">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">{t("quizAttempts.title")}</h1>
                    <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">{t("quizAttempts.subtitle")}</p>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Select
                    className="w-full"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("quizAttempts.filters.classSection")}
                    loading={filtersLoading}
                    value={filters.classSectionId}
                    onChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        classSectionId: value,
                        quizId: undefined,
                      }))
                    }
                    options={courses.map((course) => ({
                      value: course.id,
                      label: course.title,
                    }))}
                  />
                  <Select
                    className="w-full"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    disabled={!filters.classSectionId}
                    loading={filtersLoading}
                    placeholder={t("quizAttempts.filters.quiz")}
                    value={filters.quizId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, quizId: value }))}
                    options={quizOptions}
                    notFoundContent={filters.classSectionId ? undefined : null}
                  />
                  <Input
                    allowClear
                    value={filters.studentKeyword}
                    onChange={(event) => setFilters((prev) => ({ ...prev, studentKeyword: event.target.value }))}
                    onPressEnter={applyFiltersNow}
                    prefix={<MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />}
                    placeholder={t("quizAttempts.filters.studentKeyword")}
                    className="w-full"
                  />
                  <Button
                    icon={<ArrowPathIcon className="h-4 w-4" />}
                    onClick={() => {
                      setFilters(DEFAULT_FILTERS);
                      setDebouncedFilters(DEFAULT_FILTERS);
                      setQuizOptions([]);
                      setPage(1);
                    }}
                  >
                    {t("quizAttempts.filters.reset")}
                  </Button>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => setActiveTab(key)}
                  items={RESULT_TABS.map((tab) => ({
                    key: tab.key,
                    label: t(`quizAttempts.tabs.${tab.key.toLowerCase()}`),
                  }))}
                />
              </div>

              <div className="px-5 py-4 sm:px-6">
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={columns}
                  dataSource={attempts}
                  pagination={false}
                  tableLayout="fixed"
                  scroll={{ x: 1000 }}
                  sticky
                  className="teacher-quiz-attempts-table [&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:text-slate-600 dark:[&_.ant-table-thead_th]:bg-slate-800 dark:[&_.ant-table-thead_th]:text-slate-200"
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
          </div>
        </main>
      </div>
    </div>
  );
}
