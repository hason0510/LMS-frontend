import React, { useEffect, useState } from "react";
import { App, Button, Input, Select, Table, Tabs, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getManagedQuizAttempts } from "../../api/quiz";

const RESULT_TABS = [
  { key: "ALL", result: undefined },
  { key: "PASS", result: "PASS" },
  { key: "FAIL", result: "FAIL" },
  { key: "PENDING", result: "PENDING" },
];

const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

const formatEarnedMarks = (record) => {
  if (record.earnedPoints != null && record.totalPoints != null) {
    return `${Number(record.earnedPoints).toFixed(2)} / ${Number(record.totalPoints).toFixed(2)} (${record.grade ?? 0}%)`;
  }
  return `${record.grade ?? 0}%`;
};

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");

  const result = RESULT_TABS.find((tab) => tab.key === activeTab)?.result;

  const loadAttempts = async () => {
    try {
      setLoading(true);
      const response = await getManagedQuizAttempts({
        page: page - 1,
        size: pageSize,
        result,
        search: search.trim() || undefined,
      });
      const payload = response?.data || response;
      setAttempts(payload?.pageList || []);
      setTotal(payload?.totalElements || 0);
    } catch (error) {
      message.error(error?.message || t("quizAttempts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, [page, pageSize, activeTab]);

  const base = isAdmin ? "/admin" : "/teacher";

  const columns = [
    {
      title: t("quizAttempts.quizInfo"),
      dataIndex: "quizTitle",
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{record.quizTitle || `Quiz #${record.quizId}`}</div>
          <div className="text-xs text-slate-500">{formatDate(record.completedTime || record.startTime)}</div>
          <div className="text-xs text-slate-500">
            {t("quizAttempts.student")}: {record.studentName || record.studentEmail || record.studentId}
          </div>
        </div>
      ),
    },
    {
      title: t("quizAttempts.course"),
      dataIndex: "classSectionTitle",
      render: (value) => value || "-",
    },
    {
      title: t("quizAttempts.questions"),
      dataIndex: "totalQuestions",
      width: 100,
    },
    {
      title: t("quizAttempts.correct"),
      dataIndex: "correctAnswers",
      width: 120,
    },
    {
      title: t("quizAttempts.incorrect"),
      dataIndex: "incorrectAnswers",
      width: 120,
    },
    {
      title: t("quizAttempts.earnedMarks"),
      render: (_, record) => formatEarnedMarks(record),
      width: 170,
    },
    {
      title: t("quizAttempts.result"),
      render: (_, record) => <ResultTag record={record} t={t} />,
      width: 120,
    },
    {
      title: t("quizAttempts.details"),
      width: 120,
      render: (_, record) => (
        <Button onClick={() => navigate(`${base}/quiz-attempts/${record.id}`)}>
          {t("quizAttempts.review")}
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-20 p-6 ${isAdmin ? "lg:pl-72" : "lg:pl-72"}`}>
          <div className="mx-auto max-w-7xl space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("quizAttempts.title")}</h1>
                <p className="text-sm text-slate-500">{t("quizAttempts.subtitle")}</p>
              </div>
              <div className="flex gap-2">
                <Input.Search
                  allowClear
                  placeholder={t("quizAttempts.search")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onSearch={() => {
                    setPage(1);
                    loadAttempts();
                  }}
                  className="w-72"
                />
                <Select
                  value={pageSize}
                  onChange={(value) => {
                    setPageSize(value);
                    setPage(1);
                  }}
                  options={[10, 20, 50].map((value) => ({ value, label: `${value}/page` }))}
                  className="w-28"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key);
                  setPage(1);
                }}
                items={RESULT_TABS.map((tab) => ({
                  key: tab.key,
                  label: t(`quizAttempts.tabs.${tab.key.toLowerCase()}`),
                }))}
              />
              <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={attempts}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: (nextPage, nextPageSize) => {
                    setPage(nextPage);
                    setPageSize(nextPageSize);
                  },
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
