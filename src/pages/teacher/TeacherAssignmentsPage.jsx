import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, DatePicker, Empty, Select, Spin, Table } from "antd";
import dayjs from "dayjs";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getTeachingAssignments } from "../../api/assignment";
import { getAllCourses, getTeacherCourses } from "../../api/classSection";
import { useTranslation } from "react-i18next";

export default function TeacherAssignmentsPage({ isAdmin = false }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const basePath = isAdmin ? "/admin" : "/teacher";

  const [sortOrder, setSortOrder] = useState("DESC");
  const [classSectionId, setClassSectionId] = useState(undefined);
  const [filterDate, setFilterDate] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [items, setItems] = useState([]);

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
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await getTeachingAssignments({
          tab: "ALL",
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
  }, [classSectionId, message, t]);

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

  const columns = useMemo(
    () => [
      {
        title: t("assignments.table.assignment"),
        key: "assignment",
        render: (_, record) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-white text-sm">
              {record.assignmentTitle}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              Course: {record.classSectionTitle}
            </p>
          </div>
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
        title: "",
        key: "action",
        width: 110,
        align: "right",
        render: (_, record) => (
          <Button
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
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-700">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">
                  {t("assignments.teacherTitle")}
                </h1>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col gap-1 min-w-45 flex-1 sm:flex-none">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t("assignments.classFilterPlaceholder")}
                    </span>
                    <Select
                      loading={loadingClasses}
                      showSearch
                      optionFilterProp="label"
                      value={classSectionId}
                      onChange={(v) => setClassSectionId(v)}
                      options={courseSelectOptions}
                      className="w-full sm:w-52"
                      popupMatchSelectWidth={false}
                    />
                  </div>

                  <div className="flex flex-col gap-1 min-w-35">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t("assignments.sortBy")}
                    </span>
                    <Select
                      value={sortOrder}
                      onChange={setSortOrder}
                      options={sortOptions}
                      className="w-full sm:w-36"
                    />
                  </div>

                  <div className="flex flex-col gap-1 min-w-40">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t("assignments.dueDateFilter")}
                    </span>
                    <DatePicker
                      value={filterDate ? dayjs(filterDate) : null}
                      onChange={(date) => setFilterDate(date ? date.toISOString() : null)}
                      className="w-full sm:w-44"
                      allowClear
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="px-6 py-4">
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
                    dataSource={processedItems}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    className="assignment-teacher-table"
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
