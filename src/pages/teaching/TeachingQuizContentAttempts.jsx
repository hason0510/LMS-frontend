import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { App, Button, Empty, Spin, Table, Tag } from "antd";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { getQuizById, getQuizAttemptsByClassContentItem } from "../../api/quiz";

const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

const formatScore = (record) => {
  if (record.earnedPoints != null && record.totalPoints != null) {
    return `${Number(record.earnedPoints).toFixed(2)} / ${Number(record.totalPoints).toFixed(2)}`;
  }
  return record.grade != null ? `${record.grade}%` : "-";
};

export default function TeachingQuizContentAttempts() {
  const { classSectionId, quizId } = useParams();
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
        message.error(error?.response?.data?.message || "Không thể tải danh sách bài làm quiz");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [classContentItemId, page, pageSize, quizId, message]);

  const columns = [
    {
      title: "Người học",
      dataIndex: "studentName",
      render: (_, record) => (
        <div>
          <p className="m-0 font-semibold text-slate-900 dark:text-white">{record.studentName || "N/A"}</p>
          <p className="m-0 text-xs text-slate-500">{record.studentEmail || `ID: ${record.studentId || "N/A"}`}</p>
        </div>
      ),
    },
    {
      title: "Nộp lúc",
      dataIndex: "completedTime",
      width: 180,
      render: formatDate,
    },
    {
      title: "Điểm",
      width: 140,
      render: (_, record) => formatScore(record),
    },
    {
      title: "Trạng thái",
      width: 150,
      render: (_, record) => (
        <Tag color={record.gradingStatus === "NEEDS_REVIEW" ? "gold" : record.isPassed ? "green" : "default"}>
          {record.gradingStatus === "NEEDS_REVIEW" ? "Cần rà soát" : record.isPassed ? "Đạt" : "Đã chấm"}
        </Tag>
      ),
    },
    {
      title: "",
      width: 120,
      render: (_, record) => (
        <Button onClick={() => navigate(`/teaching/quiz-attempts/${record.id}`)}>
          Mở bài
        </Button>
      ),
    },
  ];

  return (
    <TeachingLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <AppBreadcrumb
          className="mb-1"
          context={{
            classSectionId,
            quizTitle: quiz?.title || location.state?.itemTitle,
          }}
        />
{/*        <button
          onClick={() => navigate(`/teaching/class-sections/${classSectionId}/content`)}
          className="text-primary text-sm font-medium hover:underline"
        >
          Quay lại nội dung lớp
        </button>*/}

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Spin size="large" />
          </div>
        ) : !classContentItemId ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            Không tìm thấy ngữ cảnh quiz trong lớp.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Bài làm quiz: {quiz?.title || location.state?.itemTitle || `Quiz #${quizId}`}
            </h1>
            <p className="text-sm text-slate-500 mb-5">
              Tổng số lượt làm: {total}
            </p>

            {attempts.length === 0 ? (
              <Empty description="Chưa có bài làm nào cho quiz này" />
            ) : (
              <Table
                rowKey="id"
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
            )}
          </div>
        )}
      </div>
    </TeachingLayout>
  );
}
