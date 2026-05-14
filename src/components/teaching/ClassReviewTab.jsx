import React, { useEffect, useState } from "react";
import { App, Button, Empty, Segmented, Table, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getClassReviewQueue } from "../../api/teaching";

export default function ClassReviewTab({ classSectionId, canGradeAssignments, canReviewQuizzes }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t, i18n } = useTranslation();
  const [queue, setQueue] = useState([]);
  const defaultFilter = canGradeAssignments && !canReviewQuizzes
    ? "ASSIGNMENT"
    : !canGradeAssignments && canReviewQuizzes
    ? "QUIZ"
    : "ALL";
  const [filter, setFilter] = useState(defaultFilter);
  const [loading, setLoading] = useState(true);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleString(i18n.language === "vi" ? "vi-VN" : "en-US") : "-";

  const loadQueue = async () => {
    try {
      setLoading(true);
      const response = await getClassReviewQueue(classSectionId);
      setQueue(Array.isArray(response) ? response : response?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [classSectionId]);

  useEffect(() => {
    const allowedFilters = new Set(["ALL"]);
    if (canGradeAssignments) {
      allowedFilters.add("ASSIGNMENT");
    }
    if (canReviewQuizzes) {
      allowedFilters.add("QUIZ");
    }
    if (!allowedFilters.has(filter)) {
      setFilter(defaultFilter);
    }
  }, [canGradeAssignments, canReviewQuizzes, filter, defaultFilter]);

  const filtered = queue.filter((item) => filter === "ALL" || item.type === filter);
  const filterOptions = [
    { label: t("teaching.review.filters.all"), value: "ALL" },
    ...(canGradeAssignments ? [{ label: t("teaching.review.filters.assignment"), value: "ASSIGNMENT" }] : []),
    ...(canReviewQuizzes ? [{ label: t("teaching.review.filters.quiz"), value: "QUIZ" }] : []),
  ];

  const openItem = async (item) => {
    if (item?.selfOwned) {
      return;
    }
    if (item.type === "QUIZ") {
      navigate(`/teaching/quiz-attempts/${item.attemptId}`);
      return;
    }
    if (!item.assignmentId) {
      message.error("Không thể mở bài tập này");
      return;
    }
    navigate(`/teaching/class-sections/${classSectionId}/assignments/${item.assignmentId}/submissions`, {
      state: { returnPath: `/teaching/class-sections/${classSectionId}/review` },
    });
  };

  const columns = [
    {
      title: t("teaching.review.columns.task"),
      render: (_, record) => (
        <button
          onClick={() => openItem(record)}
          disabled={record.selfOwned}
          className="text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">{record.title}</p>
          <p className="m-0 text-xs text-slate-500">{record.studentName}</p>
        </button>
      ),
    },
    {
      title: t("teaching.review.columns.type"),
      dataIndex: "type",
      width: 120,
      render: (value) => <Tag color={value === "QUIZ" ? "blue" : "green"}>{t(`teaching.review.types.${String(value || "").toLowerCase()}`)}</Tag>,
    },
    {
      title: t("teaching.review.columns.submittedAt"),
      dataIndex: "submittedAt",
      width: 170,
      render: formatDate,
    },
    {
      title: t("teaching.review.columns.dueAt"),
      dataIndex: "dueAt",
      width: 170,
      render: formatDate,
    },
    {
      title: t("teaching.review.columns.flags"),
      width: 150,
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.late && <Tag color="red">{t("teaching.review.flags.late")}</Tag>}
          {record.selfOwned && <Tag color="gold">{t("teaching.review.flags.selfOwned")}</Tag>}
        </div>
      ),
    },
    {
      title: "",
      width: 110,
      render: (_, record) => (
        <Button size="small" onClick={() => openItem(record)} disabled={record.selfOwned}>
          {record.type === "QUIZ" ? t("teaching.review.actions.review") : t("teaching.review.actions.grade")}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">{t("teaching.review.title")}</h2>
          <p className="m-0 text-sm text-slate-500">{t("teaching.review.subtitle")}</p>
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={filterOptions}
        />
      </div>

      {filtered.length === 0 && !loading ? (
        <Empty description={t("teaching.review.empty")} />
      ) : (
        <Table
          rowKey={(record) => `${record.type}-${record.submissionId || record.attemptId}`}
          loading={loading}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 920 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      )}

    </div>
  );
}
