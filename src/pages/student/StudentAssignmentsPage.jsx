import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Empty, Input, Select, Spin, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import Header from "../../components/layout/Header";
import { getStudentAssignmentFeed } from "../../api/assignment";
import { getApprovedClassSections } from "../../api/classSection";
import { useTranslation } from "react-i18next";

const TAB_OPTIONS = [
  { key: "UPCOMING", color: "blue" },
  { key: "PAST_DUE", color: "red" },
  { key: "COMPLETED", color: "green" },
];

function formatDue(value) {
  if (!value) return "No deadline";
  return dayjs(value).format("DD/MM/YYYY HH:mm");
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = await getApprovedClassSections();
        const classes = response?.data || response || [];
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

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        const response = await getStudentAssignmentFeed({
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
    fetchFeed();
  }, [activeTab, classSectionId, debouncedKeyword, message, t]);

  const groupedItems = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const dateKey = item.dueAt ? dayjs(item.dueAt).format("MMM D") : t("assignments.noDeadline");
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(item);
    }
    return Array.from(map.entries());
  }, [items, t]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-1 pb-2 text-2xl font-semibold border-b-2 transition-colors ${
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

          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spin size="large" />
              </div>
            ) : groupedItems.length === 0 ? (
              <Empty description={t("assignments.empty")} />
            ) : (
              <div className="space-y-6">
                {groupedItems.map(([dateKey, assignments]) => (
                  <section key={dateKey}>
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">{dateKey}</h3>
                    <div className="space-y-3">
                      {assignments.map((item) => (
                        <button
                          key={`${item.assignmentId}-${item.classSectionId}`}
                          onClick={() =>
                            navigate(`/class-sections/${item.classSectionId}/assignments/${item.assignmentId}`)
                          }
                          className="w-full text-left border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 hover:border-primary/60 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                                {item.assignmentTitle}
                              </p>
                              <p className="text-xl text-slate-600 dark:text-slate-300">{item.classSectionTitle}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {t("assignments.dueLabel")}: {formatDue(item.dueAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.completed ? (
                                <Tag color="success">{t("assignments.status.turnedIn")}</Tag>
                              ) : item.pastDue ? (
                                <Tag color="error">{t("assignments.status.missing")}</Tag>
                              ) : (
                                <Tag color="processing">{t("assignments.status.pending")}</Tag>
                              )}
                              {item.grade !== null && item.grade !== undefined && (
                                <Tag color="blue">
                                  {item.grade}/{item.maxScore || 100}
                                </Tag>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

