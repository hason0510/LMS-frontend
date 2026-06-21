import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, AutoComplete, Button, Empty, Input, Select, Spin, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { Eye } from "lucide-react";
import dayjs from "dayjs";
import Header from "../../components/layout/Header";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { getStudentAssignmentFeed } from "../../api/assignment";
import { getApprovedClassSections } from "../../api/classSection";
import { useTranslation } from "react-i18next";
import useForegroundRefresh from "../../hooks/useForegroundRefresh";

const TAB_OPTIONS = [
  { key: "UPCOMING" },
  { key: "PAST_DUE" },
  { key: "COMPLETED" },
];
const DEFAULT_PAGE_SIZE = 10;
const SUBMISSION_STATUS_COLORS = {
  NOT_SUBMITTED: "processing",
  SUBMITTED: "processing",
  LATE_SUBMITTED: "warning",
  GRADED: "success",
  RETURNED: "purple",
};

function formatDue(value, fallback) {
  if (!value) return fallback;
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function getFeedState(item) {
  if (item.pastDue) return { key: "missing", color: "error" };
  const key = item.submissionStatus || (item.completed ? "SUBMITTED" : "NOT_SUBMITTED");
  return { key, color: SUBMISSION_STATUS_COLORS[key] || "default" };
}

export default function StudentAssignmentsPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("UPCOMING");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [classSectionId, setClassSectionId] = useState();
  const [classOptions, setClassOptions] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = await getApprovedClassSections();
        const classes = response?.data || [];
        setClassOptions(
          classes.map((classSection) => ({
            label: classSection.title,
            value: classSection.id,
          }))
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getStudentAssignmentFeed({
        tab: activeTab,
        keyword: debouncedKeyword || undefined,
        classSectionId: classSectionId || undefined,
      });
      const payload = response?.data;
      setItems(Array.isArray(payload?.pageList) ? payload.pageList : []);
    } catch (error) {
      console.error(error);
      message.error(t("assignments.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, classSectionId, debouncedKeyword, message, t]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useForegroundRefresh(fetchFeed);

  useEffect(() => {
    setPage(1);
  }, [activeTab, classSectionId, debouncedKeyword, pageSize]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const searchOptions = useMemo(() => {
    const values = new Set();
    items.forEach((item) => {
      if (item.assignmentTitle) values.add(item.assignmentTitle);
      if (item.classSectionTitle) values.add(item.classSectionTitle);
    });
    return Array.from(values).slice(0, 12).map((value) => ({ value }));
  }, [items]);

  const columns = useMemo(
    () => [
      {
        title: t("assignments.table.assignment"),
        key: "assignment",
        render: (_, record) => (
          <div className="min-w-0">
            <p className="!m-0 truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white">
              {record.assignmentTitle}
            </p>
            <p className="!m-0 !mt-1 text-xs leading-tight text-slate-500">
              {record.classSectionTitle}
            </p>
          </div>
        ),
      },
      {
        title: t("assignments.table.dueAt"),
        dataIndex: "dueAt",
        key: "dueAt",
        width: 190,
        render: (value, record) => {
          if (!value) {
            return <span className="text-sm text-slate-400">{t("assignments.noDeadline")}</span>;
          }
          if (record.pastDue) {
            const days = Math.max(0, dayjs().startOf("day").diff(dayjs(value).startOf("day"), "day"));
            return (
              <div className="leading-tight text-rose-600 dark:text-rose-400">
                <div className="text-sm">{formatDue(value)}</div>
                <div className="text-xs font-semibold">
                  {days > 0 ? t("assignments.overdueBy", { count: days }) : t("assignments.status.missing")}
                </div>
              </div>
            );
          }
          return (
            <span className="text-sm text-slate-700 dark:text-slate-300">{formatDue(value)}</span>
          );
        },
      },
      {
        title: t("assignments.table.score"),
        key: "score",
        width: 130,
        align: "right",
        render: (_, record) => (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {record.grade !== null && record.grade !== undefined
              ? `${record.grade}/${record.maxScore || 100}`
              : `—/${record.maxScore || 100}`}
          </span>
        ),
      },
      {
        title: t("assignments.table.status"),
        key: "status",
        width: 160,
        align: "center",
        render: (_, record) => {
          const state = getFeedState(record);
          const labelKey =
            state.key === "missing"
              ? "assignments.status.missing"
              : `assignments.submissionStatus.${state.key}`;
          return <Tag color={state.color}>{t(labelKey)}</Tag>;
        },
      },
      {
        title: "",
        key: "action",
        width: 120,
        align: "center",
        render: (_, record) => (
          <div className="flex justify-center">
            <Button
              icon={<Eye size={16} />}
              className="app-table-action-btn"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/class-sections/${record.classSectionId}/assignments/${record.assignmentId}`);
              }}
            >
              {t("assignments.details")}
            </Button>
          </div>
        ),
      },
    ],
    [navigate, t]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="app-table-shell !rounded-2xl">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
            <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
              {t("assignments.studentTitle")}
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {t("assignments.studentSubtitle")}
            </p>
          </div>

          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-1 pb-2 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "text-slate-900 dark:text-white border-primary"
                      : "text-slate-500 dark:text-slate-400 border-transparent"
                  }`}
                >
                  {t(`assignments.tabs.${tab.key.toLowerCase()}`)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <AutoComplete
                value={searchKeyword}
                onChange={setSearchKeyword}
                options={searchOptions}
                className="w-full md:col-span-7"
                allowClear
              >
                <Input prefix={<SearchOutlined />} placeholder={t("assignments.searchPlaceholder")} />
              </AutoComplete>
              <Select
                loading={loadingClasses}
                allowClear
                showSearch
                optionFilterProp="label"
                value={classSectionId}
                onChange={setClassSectionId}
                placeholder={t("assignments.classFilterPlaceholder")}
                options={classOptions}
                className="md:col-span-5"
              />
            </div>
          </div>

          <div className="px-5 py-4 sm:px-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spin size="large" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-16">
                <Empty description={t("assignments.empty")} />
              </div>
            ) : (
              <Table
                rowKey={(record) => `${record.assignmentId}-${record.classSectionId}`}
                columns={columns}
                dataSource={pageItems}
                pagination={false}
                scroll={{ x: 820 }}
                rowClassName={() => "!cursor-pointer"}
                onRow={(record) => ({
                  onClick: () =>
                    navigate(`/class-sections/${record.classSectionId}/assignments/${record.assignmentId}`),
                })}
              />
            )}
          </div>

          {!loading && items.length > 0 && (
            <DataPaginationFooter
              currentPage={page}
              pageSize={pageSize}
              total={items.length}
              totalLabel={t("assignments.pagination.total", { count: items.length })}
              pageSizeLabel={t("assignments.pagination.pageSize")}
              rangeLabel={t("assignments.pagination.range", {
                start: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
                end: Math.min(page * pageSize, items.length),
              })}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
