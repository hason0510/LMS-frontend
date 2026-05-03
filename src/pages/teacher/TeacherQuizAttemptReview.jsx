import React, { useEffect, useMemo, useState } from "react";
import { App, Button, Input, InputNumber, Spin, Table, Tag } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getAttemptDetail, reviewQuizAttempt } from "../../api/quiz";

const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

const formatAnswerItems = (answer) => {
  if (answer.textAnswer) return answer.textAnswer;
  if (answer.selectedAnswers?.length) {
    return answer.selectedAnswers.map((item) => item.content).join(", ");
  }
  if (answer.answerItems?.length) {
    return answer.answerItems
      .map((item) => item.answerText || item.submittedOrderIndex || item.selectedItemId || "")
      .filter(Boolean)
      .join(", ");
  }
  return "-";
};

const formatCorrectAnswer = (answer) => {
  const question = answer.quizQuestion || {};
  if (question.type === "ESSAY") return "-";
  if (question.answers?.length) {
    const correct = question.answers.filter((item) => item.isCorrect);
    return correct.length ? correct.map((item) => item.content).join(", ") : "-";
  }
  if (question.items?.length) {
    return question.items
      .filter((item) => item.acceptedAnswers?.length || item.correctMatchKey || item.correctOrderIndex)
      .map((item) => item.acceptedAnswers?.join(", ") || item.correctMatchKey || item.correctOrderIndex)
      .join("; ");
  }
  return "-";
};

const answerResult = (answer, t) => {
  if (answer.gradingStatus === "NEEDS_REVIEW") return <Tag color="gold">{t("quizAttempts.pending")}</Tag>;
  if (answer.earnedPoints != null && answer.maxPoints != null) {
    const earned = Number(answer.earnedPoints);
    const max = Number(answer.maxPoints);
    if (earned > 0 && earned < max) return <Tag color="blue">{t("quizAttempts.partial")}</Tag>;
  }
  if (answer.isCorrect === true) return <Tag color="green">{t("quizAttempts.correct")}</Tag>;
  if (answer.isCorrect === false) return <Tag color="red">{t("quizAttempts.incorrect")}</Tag>;
  return <Tag>{t("quizAttempts.unanswered")}</Tag>;
};

export default function TeacherQuizAttemptReview({ isAdmin = false }) {
  const { t } = useTranslation();
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [reviews, setReviews] = useState({});
  const [instructorFeedback, setInstructorFeedback] = useState("");

  const essayAnswers = useMemo(
    () => (attempt?.answers || []).filter((answer) => answer.quizQuestion?.type === "ESSAY"),
    [attempt]
  );

  const loadAttempt = async () => {
    try {
      setLoading(true);
      const response = await getAttemptDetail(attemptId);
      const payload = response?.data || response;
      setAttempt(payload);
      setInstructorFeedback(payload?.instructorFeedback || "");
      const nextReviews = {};
      (payload?.answers || []).forEach((answer) => {
        if (answer.quizQuestion?.type === "ESSAY") {
          nextReviews[answer.id] = {
            score: answer.earnedPoints ?? 0,
            feedback: answer.teacherFeedback || "",
          };
        }
      });
      setReviews(nextReviews);
    } catch (error) {
      message.error(error?.message || t("quizAttempts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  const saveReview = async () => {
    try {
      setSaving(true);
      const response = await reviewQuizAttempt(attemptId, {
        instructorFeedback,
        answers: essayAnswers.map((answer) => ({
          answerId: answer.id,
          score: reviews[answer.id]?.score ?? 0,
          feedback: reviews[answer.id]?.feedback || "",
        })),
      });
      const payload = response?.data || response;
      setAttempt(payload);
      message.success(t("quizAttempts.reviewSaved"));
    } catch (error) {
      message.error(error?.message || t("quizAttempts.reviewSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: t("quizAttempts.no"), render: (_, __, index) => index + 1, width: 60 },
    {
      title: t("quizAttempts.type"),
      render: (_, answer) => answer.quizQuestion?.type || "-",
      width: 140,
    },
    {
      title: t("quizAttempts.question"),
      render: (_, answer) => (
        <div className="space-y-2">
          <div className="font-medium">{answer.quizQuestion?.content}</div>
        </div>
      ),
    },
    {
      title: t("quizAttempts.givenAnswer"),
      render: (_, answer) => formatAnswerItems(answer),
    },
    {
      title: t("quizAttempts.correctAnswer"),
      render: (_, answer) => formatCorrectAnswer(answer),
    },
    {
      title: t("quizAttempts.earnedMarks"),
      render: (_, answer) =>
        answer.quizQuestion?.type === "ESSAY" ? (
          <InputNumber
            min={0}
            max={Number(answer.maxPoints || answer.quizQuestion?.points || 1)}
            step={0.25}
            value={reviews[answer.id]?.score}
            onChange={(value) =>
              setReviews((prev) => ({
                ...prev,
                [answer.id]: { ...(prev[answer.id] || {}), score: value ?? 0 },
              }))
            }
          />
        ) : (
          `${Number(answer.earnedPoints || 0).toFixed(2)} / ${Number(answer.maxPoints || answer.quizQuestion?.points || 1).toFixed(2)}`
        ),
      width: 150,
    },
    {
      title: t("quizAttempts.result"),
      render: (_, answer) => answerResult(answer, t),
      width: 130,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const base = isAdmin ? "/admin" : "/teacher";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-20 p-6 lg:pl-72">
          <div className="mx-auto max-w-7xl space-y-5">
            <Button onClick={() => navigate(`${base}/quiz-attempts`)}>{t("quizAttempts.back")}</Button>

            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t("quizAttempts.quiz")}</p>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {attempt?.quizTitle || `Quiz #${attempt?.quizId}`}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {t("quizAttempts.student")}: {attempt?.studentName || attempt?.studentEmail || attempt?.studentId}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {Number(attempt?.earnedPoints || 0).toFixed(2)} / {Number(attempt?.totalPoints || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-500">{attempt?.grade ?? 0}%</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                <Summary label={t("quizAttempts.completedAt")} value={formatDate(attempt?.completedTime)} />
                <Summary label={t("quizAttempts.questions")} value={attempt?.totalQuestions ?? 0} />
                <Summary label={t("quizAttempts.correct")} value={attempt?.correctAnswers ?? 0} />
                <Summary label={t("quizAttempts.incorrect")} value={attempt?.incorrectAnswers ?? 0} />
                <Summary
                  label={t("quizAttempts.result")}
                  value={
                    attempt?.gradingStatus === "NEEDS_REVIEW"
                      ? t("quizAttempts.pending")
                      : attempt?.isPassed
                        ? t("quizAttempts.pass")
                        : t("quizAttempts.fail")
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <Table rowKey="id" columns={columns} dataSource={attempt?.answers || []} pagination={false} />

              <div className="mt-5 space-y-3">
                {essayAnswers.map((answer) => (
                  <div key={answer.id} className="rounded border border-slate-200 p-3">
                    <div className="mb-2 text-sm font-semibold">{answer.quizQuestion?.content}</div>
                    <Input.TextArea
                      rows={2}
                      placeholder={t("quizAttempts.answerFeedback")}
                      value={reviews[answer.id]?.feedback}
                      onChange={(event) =>
                        setReviews((prev) => ({
                          ...prev,
                          [answer.id]: { ...(prev[answer.id] || {}), feedback: event.target.value },
                        }))
                      }
                    />
                  </div>
                ))}

                <Input.TextArea
                  rows={4}
                  placeholder={t("quizAttempts.instructorFeedback")}
                  value={instructorFeedback}
                  onChange={(event) => setInstructorFeedback(event.target.value)}
                />

                <div className="flex justify-end">
                  <Button type="primary" loading={saving} onClick={saveReview}>
                    {t("quizAttempts.saveReview")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
