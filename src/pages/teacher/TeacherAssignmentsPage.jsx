import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Empty, Input, Select, Spin, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getTeachingAssignments } from "../../api/assignment";
import { getAllCourses, getTeacherCourses } from "../../api/classSection";
import { useTranslation } from "react-i18next";

function formatDue(value) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

const TAB_OPTIONS = ["ALL", "UPCOMING", "PAST_DUE", "COMPLETED"];

export default function TeacherAssignmentsPage({ isAdmin = false }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const basePath = isAdmin ? "/admin" : "/teacher";

  const [activeTab, setActiveTab] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [classSectionId, setClassSectionId] = useState();
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
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = isAdmin ? await getAllCourses(1, 1000) : await getTeacherCourses(1, 1000);
        const payload = response?.data ?? response;
        const classes = Array.isArray(payload) ? payload : (payload?.pageList ?? []);
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
  }, [isAdmin]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await getTeachingAssignments({
          tab: activeTab,
          keyword: debouncedKeyword || undefined,
          classSectionId: classSectionId || undefined,
        });
        const payload = response?.data || response;
        setItems(Array.isArray(payload?.pageList) ? payload.pageList : []);
      } catch (error) {
        console.error(error);
        message.error(t("assignments.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [activeTab, classSectionId, debouncedKeyword, message, t]);

  const columns = useMemo(
    () => [
      {
        title: t("assignments.table.assignment"),
        key: "assignment",
        render: (_, record) => (
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{record.assignmentTitle}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{record.classSectionTitle}</p>
          </div>
        ),
      },
      {
        title: t("assignments.table.dueAt"),
        dataIndex: "dueAt",
        key: "dueAt",
        render: formatDue,
      },
      {
        title: t("assignments.table.score"),
        dataIndex: "maxScore",
        key: "maxScore",
        render: (value) => value ?? "—",
      },
      {
        title: t("assignments.table.submitted"),
        key: "submitted",
        render: (_, record) => `${record.turnedInCount}/${record.totalStudents}`,
      },
      {
        title: t("assignments.table.pending"),
        dataIndex: "pendingReviewCount",
        key: "pendingReviewCount",
      },
      {
        title: t("assignments.table.status"),
        key: "status",
        render: (_, record) => {
          if (record.completed) {
            return <Tag color="success">{t("assignments.status.completed")}</Tag>;
          }
          if (record.pastDue) {
            return <Tag color="error">{t("assignments.status.pastDue")}</Tag>;
          }
          return <Tag color="processing">{t("assignments.status.upcoming")}</Tag>;
        },
      },
      {
        title: "",
        key: "action",
        align: "right",
        render: (_, record) => (
          <Button
            onClick={() =>
              navigate(`${basePath}/class-sections/${record.classSectionId}/assignments/${record.assignmentId}/submissions`)
            }
          >
            {t("assignments.details")}
          </Button>
        ),
      },
    ],
    [basePath, navigate, t]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 space-y-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("assignments.teacherTitle")}</h1>
                <div className="flex flex-wrap items-center gap-4">
                  {TAB_OPTIONS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-1 pb-2 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === tab
                          ? "text-primary border-primary"
                          : "text-slate-500 dark:text-slate-400 border-transparent"
                      }`}
                    >
                      {t(`assignments.tabs.${tab.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <Input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    prefix={<SearchOutlined />}
                    placeholder={t("assignments.searchPlaceholder")}
                    className="md:col-span-7"
                  />
                  <Select
                    loading={loadingClasses}
                    allowClear
                    value={classSectionId}
                    onChange={setClassSectionId}
                    placeholder={t("assignments.classFilterPlaceholder")}
                    options={classOptions}
                    className="md:col-span-5"
                  />
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Spin size="large" />
                  </div>
                ) : items.length === 0 ? (
                  <Empty description={t("assignments.empty")} />
                ) : (
                  <Table
                    rowKey={(record) => `${record.assignmentId}-${record.classSectionId}`}
                    columns={columns}
                    dataSource={items}
                    pagination={{ pageSize: 10 }}
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

