import React, { useEffect, useMemo, useState } from "react";
import { App, Button, Input, InputNumber, Modal, Spin, Table, Tag } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import { getAttemptDetail, reviewQuizAttempt } from "../../api/quiz";
import ResourcePreview from "../../components/common/ResourcePreview";
import QuizRichText from "../../components/common/QuizRichText";
import { splitClozeContent } from "../../utils/cloze";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";

const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

const stripHtml = (html) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
const hasExplanation = (item) => typeof item?.explanation === "string" && item.explanation.trim().length > 0;

const AnswerOptionReviewList = ({ items = [] }) => {
  if (!items.length) {
    return <span>-</span>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${item?.id || "answer"}-${index}`}
          className="rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/40"
        >
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            <QuizRichText html={item?.content || ""} className="text-sm font-medium text-slate-700 dark:text-slate-200" />
          </div>
          <ResourcePreview resource={item?.resource} className="mt-2" />
          {hasExplanation(item) && (
            <div className="mt-2 rounded bg-white px-2 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Giải thích
              </p>
              <QuizRichText html={item.explanation} className="text-xs text-slate-600 dark:text-slate-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const formatAnswerItems = (answer) => {
  if (answer.textAnswer) return answer.textAnswer;
  if (answer.selectedAnswers?.length) {
    return answer.selectedAnswers.map((item) => item.content).join(", ");
  }
  if (answer.quizQuestion?.type === "CLOZE" && answer.answerItems?.length) {
    const question = answer.quizQuestion || {};
    const blanks = (question.items || []).filter((item) => item.role === "BLANK");
    const answerByItemId = new Map((answer.answerItems || []).map((item) => [item.itemId, item.answerText || ""]));
    const { segments, blankCount } = splitClozeContent(question.content || "");
    if (blankCount > 0) {
      return segments
        .map((segment) => {
          if (segment.type === "text") return segment.value;
          const blank = blanks[segment.blankIndex];
          if (!blank) return "____";
          const userValue = answerByItemId.get(blank.id);
          return (userValue || "").trim() || "____";
        })
        .join("");
    }
    return answer.answerItems
      .map((ai) => `Chỗ trống ${ai.blankIndex}: ${ai.answerText || "Không trả lời"}`)
      .join("; ");
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
    return correct.length ? <AnswerOptionReviewList items={correct} /> : "-";
  }
  if (question.items?.length) {
    if (question.type === "CLOZE") {
      const blanks = (question.items || []).filter((item) => item.role === "BLANK");
      const { segments, blankCount } = splitClozeContent(question.content || "");
      if (blankCount > 0) {
        return segments
          .map((segment) => {
            if (segment.type === "text") return segment.value;
            const blank = blanks[segment.blankIndex];
            if (!blank) return "____";
            const accepted = blank.acceptedAnswers || [];
            return accepted[0] || "____";
          })
          .join("");
      }
    }
    return question.items
      .filter((item) => item.acceptedAnswers?.length || item.correctMatchKey || item.correctOrderIndex)
      .map((item, index) => {
        const label = `Chỗ trống ${item.blankIndex || index + 1}`;
        const correct = item.acceptedAnswers?.join(" / ") || item.correctMatchKey || String(item.correctOrderIndex);
        return `${label}: ${correct}`;
      })
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

export default function TeacherQuizAttemptReview({ isAdmin = false, teachingMode = false }) {
  const { t } = useTranslation();
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [reviews, setReviews] = useState({});
  const [instructorFeedback, setInstructorFeedback] = useState("");
  const [previewQuestion, setPreviewQuestion] = useState(null);

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
      render: (_, answer) => {
        const content = answer.quizQuestion?.content || "";
        return (
          <div className="space-y-1">
            <div className="line-clamp-2 max-w-xs text-sm font-medium text-slate-700 dark:text-slate-200">
              {stripHtml(content)}
            </div>
            {content && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setPreviewQuestion(answer.quizQuestion)}
              >
                Xem chi tiết
              </button>
            )}
          </div>
        );
      },
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
  const backPath = teachingMode
    ? attempt?.classSectionId && attempt?.quizId && attempt?.classContentItemId
      ? `/teaching/class-sections/${attempt.classSectionId}/quizzes/${attempt.quizId}/attempts?classContentItemId=${attempt.classContentItemId}`
      : "/teaching/classes"
    : `${base}/quiz-attempts`;
  const content = (
    <div className="mx-auto max-w-7xl space-y-5">
      <AppBreadcrumb
        className="mb-1"
        context={{
          classTitle: attempt?.classSectionTitle || attempt?.classTitle,
          classSectionId: attempt?.classSectionId,
          quizTitle: attempt?.quizTitle,
          attemptTitle: `${t("breadcrumbs.attempt")} #${attemptId}`,
        }}
      />
      <Button onClick={() => navigate(backPath)}>{t("quizAttempts.back")}</Button>

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
        <Table rowKey="id" columns={columns} dataSource={attempt?.answers || []} pagination={false} scroll={{ x: 900 }} />

        <div className="mt-5 space-y-3">
          {essayAnswers.map((answer) => (
            <div key={answer.id} className="rounded border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-2 text-sm font-semibold">
                <QuizRichText html={answer.quizQuestion?.content || ""} className="text-sm font-semibold text-slate-900 dark:text-white" />
              </div>
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

      <Modal
        open={!!previewQuestion}
        onCancel={() => setPreviewQuestion(null)}
        footer={null}
        title="Nội dung câu hỏi"
        width={700}
        destroyOnHidden
      >
        <div className="prose prose-sm max-w-none">
          {previewQuestion && <QuizRichText html={previewQuestion.content || ""} className="prose prose-sm max-w-none" />}
        </div>
        {previewQuestion && <ResourcePreview resource={previewQuestion.resource} className="mt-4" />}
        {!!previewQuestion?.answers?.length && (
          <div className="mt-5 space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Đáp án và giải thích</h4>
            <AnswerOptionReviewList items={previewQuestion.answers} />
          </div>
        )}
      </Modal>
    </div>
  );

  if (teachingMode) {
    return <TeachingLayout>{content}</TeachingLayout>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-20 p-6 lg:pl-72">{content}</main>
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
