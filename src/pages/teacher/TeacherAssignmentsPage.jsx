import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, AutoComplete, Button, DatePicker, Empty, Input, Select, Spin, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { BookOpenCheck, CheckCircle2, Clock3, Eye, FileCheck2 } from "lucide-react";
import dayjs from "dayjs";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import { getTeachingAssignments } from "../../api/assignment";
import { getAllCourses, getTeacherCourses } from "../../api/classSection";
import { useTranslation } from "react-i18next";

const DEFAULT_PAGE_SIZE = 10;

function formatDue(value, fallback) {
  if (!value) return fallback;
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function getAssignmentState(record) {
  if (record.completed) return { key: "completed", color: "success" };
  if (record.pastDue) return { key: "pastDue", color: "error" };
  return { key: "upcoming", color: "processing" };
}

function MetricCard({ icon: Icon, label, value, tone = "blue" }) {
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

export default function TeacherAssignmentsPage({ isAdmin = false }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const basePath = isAdmin ? "/admin" : "/teacher";

  const [sortOrder, setSortOrder] = useState("DESC");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [classSectionId, setClassSectionId] = useState(undefined);
  const [filterDate, setFilterDate] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = isAdmin ? await getAllCourses(1, 1000) : await getTeacherCourses(1, 1000);
        const payload = response?.data ?? response;
        const classes = Array.isArray(payload) ? payload : (payload?.pageList ?? []);
        setClassOptions(
          classes.map((c) => ({ label: c.title, value: c.id }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await getTeachingAssignments({
          tab: "ALL",
          keyword: debouncedKeyword || undefined,
          classSectionId: classSectionId || undefined,
        });
        const payload = response?.data;
        setItems(Array.isArray(payload?.pageList) ? payload.pageList : []);
      } catch (err) {
        console.error(err);
        message.error(t("assignments.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [classSectionId, debouncedKeyword, message, t]);

  useEffect(() => {
    setPage(1);
  }, [classSectionId, debouncedKeyword, filterDate, sortOrder, pageSize]);

  const processedItems = useMemo(() => {
    let result = [...items];

    if (filterDate) {
      const targetDate = dayjs(filterDate).format("YYYY-MM-DD");
      result = result.filter(
        (item) => item.dueAt && dayjs(item.dueAt).format("YYYY-MM-DD") === targetDate
      );
    }

    result.sort((a, b) => {
      const aTime = a.dueAt ? dayjs(a.dueAt).unix() : 0;
      const bTime = b.dueAt ? dayjs(b.dueAt).unix() : 0;
      return sortOrder === "DESC" ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [items, sortOrder, filterDate]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedItems.slice(start, start + pageSize);
  }, [page, pageSize, processedItems]);

  const metrics = useMemo(
    () => ({
      total: processedItems.length,
      submitted: processedItems.reduce((sum, item) => sum + (item.turnedInCount || 0), 0),
      pending: processedItems.reduce((sum, item) => sum + (item.pendingReviewCount || 0), 0),
      graded: processedItems.reduce((sum, item) => sum + (item.gradedCount || 0), 0),
    }),
    [processedItems]
  );

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
            <p className="m-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
              {record.assignmentTitle}
            </p>
            <p className="m-0 mt-1 text-xs text-slate-500">
              {t("assignments.classLabel")}: {record.classSectionTitle}
            </p>
          </div>
        ),
      },
      {
        title: t("assignments.table.dueAt"),
        dataIndex: "dueAt",
        key: "dueAt",
        width: 170,
        render: (value) => (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {formatDue(value, t("assignments.noDeadline"))}
          </span>
        ),
      },
      {
        title: t("assignments.table.totalMarks"),
        dataIndex: "maxScore",
        key: "maxScore",
        width: 130,
        align: "center",
        render: (value) => (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {value ?? "—"}
          </span>
        ),
      },
      {
        title: t("assignments.table.totalSubmit"),
        key: "totalSubmit",
        width: 140,
        align: "center",
        render: (_, record) => (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {record.turnedInCount ?? 0}
          </span>
        ),
      },
      {
        title: t("assignments.table.pending"),
        dataIndex: "pendingReviewCount",
        key: "pendingReviewCount",
        width: 130,
        align: "center",
        render: (value) => (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {value ?? 0}
          </span>
        ),
      },
      {
        title: t("assignments.table.status"),
        key: "status",
        width: 140,
        align: "center",
        render: (_, record) => {
          const state = getAssignmentState(record);
          return <Tag color={state.color}>{t(`assignments.status.${state.key}`)}</Tag>;
        },
      },
      {
        title: "",
        key: "action",
        width: 120,
        align: "right",
        render: (_, record) => (
          <Button
            icon={<Eye size={16} />}
            onClick={() =>
              navigate(
                `${basePath}/class-sections/${record.classSectionId}/assignments/${record.assignmentId}/submissions`
              )
            }
            className="text-slate-600! dark:text-slate-300! border-slate-300! dark:border-slate-600! hover:border-blue-500! hover:text-blue-500!"
          >
            {t("assignments.details")}
          </Button>
        ),
      },
    ],
    [basePath, navigate, t]
  );

  const courseSelectOptions = useMemo(
    () => [
      { label: t("assignments.allCourses"), value: undefined },
      ...classOptions,
    ],
    [classOptions, t]
  );

  const sortOptions = [
    { label: t("assignments.sortDesc"), value: "DESC" },
    { label: t("assignments.sortAsc"), value: "ASC" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main
          className={`flex-1 pt-16 transition-all duration-300 ${
            sidebarCollapsed ? "pl-20" : "pl-64"
          }`}
        >
          <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1440px] space-y-4">
              <AppBreadcrumb className="mb-2" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <MetricCard icon={BookOpenCheck} label={t("assignments.metrics.total")} value={metrics.total} />
                <MetricCard icon={FileCheck2} label={t("assignments.metrics.submitted")} value={metrics.submitted} tone="green" />
                <MetricCard icon={Clock3} label={t("assignments.metrics.pending")} value={metrics.pending} tone="amber" />
                <MetricCard icon={CheckCircle2} label={t("assignments.metrics.graded")} value={metrics.graded} tone="slate" />
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800">
                <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                        {t("assignments.teacherTitle")}
                      </h1>
                      <p className="m-0 mt-1 text-sm text-slate-500">
                        {t("assignments.teacherSubtitle")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px_170px_180px]">
                    <AutoComplete
                      value={searchKeyword}
                      onChange={setSearchKeyword}
                      options={searchOptions}
                      className="w-full"
                      allowClear
                    >
                      <Input prefix={<SearchOutlined />} placeholder={t("assignments.searchPlaceholder")} />
                    </AutoComplete>
                    <Select
                      loading={loadingClasses}
                      showSearch
                      optionFilterProp="label"
                      value={classSectionId}
                      onChange={(v) => setClassSectionId(v)}
                      options={courseSelectOptions}
                      className="w-full"
                      popupMatchSelectWidth={false}
                    />
                    <Select
                      value={sortOrder}
                      onChange={setSortOrder}
                      options={sortOptions}
                      className="w-full"
                      showSearch
                      optionFilterProp="label"
                    />
                    <DatePicker
                      value={filterDate ? dayjs(filterDate) : null}
                      onChange={(date) => setFilterDate(date ? date.toISOString() : null)}
                      placeholder={t("assignments.dueDateFilter")}
                      className="w-full"
                      allowClear
                    />
                  </div>
                </div>

                <div className="px-5 py-4 sm:px-6">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Spin size="large" />
                  </div>
                ) : processedItems.length === 0 ? (
                  <div className="py-16">
                    <Empty description={t("assignments.empty")} />
                  </div>
                ) : (
                  <Table
                    rowKey={(record) =>
                      `${record.assignmentId}-${record.classSectionId}`
                    }
                    columns={columns}
                    dataSource={pageItems}
                    pagination={false}
                    scroll={{ x: 980 }}
                    className="assignment-teacher-table"
                  />
                )}
                </div>

                {!loading && processedItems.length > 0 && (
                  <DataPaginationFooter
                    currentPage={page}
                    pageSize={pageSize}
                    total={processedItems.length}
                    totalLabel={t("assignments.pagination.total", { count: processedItems.length })}
                    pageSizeLabel={t("assignments.pagination.pageSize")}
                    rangeLabel={t("assignments.pagination.range", {
                      start: processedItems.length === 0 ? 0 : (page - 1) * pageSize + 1,
                      end: Math.min(page * pageSize, processedItems.length),
                    })}
                    onPageChange={setPage}
                    onPageSizeChange={(nextSize) => {
                      setPageSize(nextSize);
                      setPage(1);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
