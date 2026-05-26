import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ResourcePreview from "../../components/common/ResourcePreview";
import QuizRichText from "../../components/common/QuizRichText";
import { splitClozeContent } from "../../utils/cloze";

const sortByOrder = (items = []) =>
  [...items].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

const isMatchingQuestion = (type) => type === "MATCHING" || type === "IMAGE_MATCHING";

const getItemsByRole = (question, role) =>
  sortByOrder((question.items || []).filter((item) => item.role === role));

const itemLabel = (item, fallback) => item?.content || (item?.resource || item?.resourceId ? "Ảnh" : fallback);
const getBlankLabel = (_, index) => `Blank ${index + 1}`;

const HtmlAnswerList = ({ items = [] }) => (
  <div className="space-y-2">
    {items.map((item, index) => (
      <div key={`${index}-${item?.id || "html"}`} className="space-y-2">
        <QuizRichText
          html={item?.content || ""}
          className="font-medium text-[#111418] dark:text-white"
        />
        <ResourcePreview resource={item?.resource} />
      </div>
    ))}
  </div>
);

const renderQuestionStem = (question) => {
  if (question?.type !== "CLOZE") {
    return <QuizRichText html={question?.content || ""} className="text-lg font-medium text-[#111418] dark:text-white" />;
  }
  const blanks = getItemsByRole(question, "BLANK");
  const { segments, blankCount } = splitClozeContent(question?.content || "");
  if (blankCount === 0) {
    return <QuizRichText html={question?.content || ""} className="text-lg font-medium text-[#111418] dark:text-white" />;
  }
  return (
    <p className="text-lg font-medium text-[#111418] dark:text-white leading-8">
      {segments.map((segment, idx) => {
        if (segment.type === "text") return <span key={`txt-${idx}`}>{segment.value}</span>;
        const blank = blanks[segment.blankIndex];
        const blankLength = Math.max(6, (blank?.acceptedAnswers?.[0] || "").length);
        return <span key={`blank-${idx}`} className="inline-block mx-1 border-b-2 border-slate-400 min-w-14">{Array(blankLength).fill("_").join("")}</span>;
      })}
    </p>
  );
};

const formatUserAnswer = (question, answers) => {
  const answer = answers[question.id];
  if (!answer) return "Không có câu trả lời";

  if (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE" || question.type === "IMAGE_ANSWERING") {
    const selectedIds = Array.isArray(answer) ? answer : [];
    if (selectedIds.length === 0) return "Không có câu trả lời";
    const contents = selectedIds
      .map((id) => (question.answers || []).find((a) => a.id === id)?.content)
      .filter(Boolean);
    return contents.join(", ") || "Không có câu trả lời";
  }

  if (question.type === "SHORT_ANSWER" || question.type === "ESSAY") {
    return answer[0]?.trim() || "Không có câu trả lời";
  }

  if (isMatchingQuestion(question.type)) {
    const prompts = getItemsByRole(question, "PROMPT");
    const matchItems = getItemsByRole(question, "MATCH");
    const matchById = new Map(matchItems.map((m) => [m.id, m]));
    const matches = answer.matches || {};
    return prompts
      .map((p) => {
        const matched = matchById.get(matches[p.id]);
        return `${itemLabel(p, "Prompt")} → ${itemLabel(matched, "Không chọn")}`;
      })
      .join("; ");
  }

  if (question.type === "DRAG_ORDER") {
    const itemMap = new Map(getItemsByRole(question, "ORDER_ITEM").map((item) => [item.id, item]));
    return (answer.order || [])
      .map((id, index) => `${index + 1}. ${itemMap.get(id)?.content || "?"}`)
      .join(" → ");
  }

  if (question.type === "CLOZE") {
    const blanks = getItemsByRole(question, "BLANK");
    const { segments, blankCount } = splitClozeContent(question.content || "");
    if (blankCount > 0) {
      return segments
        .map((segment) => {
          if (segment.type === "text") return segment.value;
          const blank = blanks[segment.blankIndex];
          if (!blank) return "____";
          const userValue = answer.blanks?.[blank.id];
          return (userValue || "").trim() || "____";
        })
        .join("");
    }
    return blanks
      .map((blank, index) => `${getBlankLabel(blank, index)}: ${answer.blanks?.[blank.id] || "Không trả lời"}`)
      .join("; ");
  }

  return "Không có câu trả lời";
};

const formatCorrectAnswer = (question) => {
  if (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE" || question.type === "IMAGE_ANSWERING") {
    const correct = (question.answers || []).filter((a) => a.isCorrect).map((a) => a.content);
    return correct.join(", ") || "—";
  }

  if (question.type === "SHORT_ANSWER") {
    const accepted = question.items?.[0]?.acceptedAnswers || question.items?.[0]?.acceptedAnswersText || [];
    return accepted.join(" / ") || "—";
  }

  if (question.type === "ESSAY") {
    return "Chấm tay";
  }

  if (isMatchingQuestion(question.type)) {
    const prompts = getItemsByRole(question, "PROMPT");
    const matchItems = getItemsByRole(question, "MATCH");
    const matchByKey = new Map(matchItems.map((m) => [m.itemKey, m]));
    return prompts
      .map((p) => {
        const correct = matchByKey.get(p.correctMatchKey);
        return `${itemLabel(p, "Prompt")} → ${itemLabel(correct, "?")}`;
      })
      .join("; ");
  }

  if (question.type === "DRAG_ORDER") {
    const orderItems = sortByOrder(getItemsByRole(question, "ORDER_ITEM"));
    return orderItems.map((item, i) => `${i + 1}. ${item.content}`).join(" → ");
  }

  if (question.type === "CLOZE") {
    const blanks = getItemsByRole(question, "BLANK");
    const { segments, blankCount } = splitClozeContent(question.content || "");
    if (blankCount > 0) {
      return segments
        .map((segment) => {
          if (segment.type === "text") return segment.value;
          const blank = blanks[segment.blankIndex];
          if (!blank) return "____";
          const accepted = blank.acceptedAnswers || blank.acceptedAnswersText || [];
          return accepted[0] || "____";
        })
        .join("");
    }
    return blanks
      .map((blank, index) => {
        const accepted = blank.acceptedAnswers || blank.acceptedAnswersText || [];
        return `${getBlankLabel(blank, index)}: ${accepted.join(" / ") || "?"}`;
      })
      .join("; ");
  }

  return "—";
};

export default function TeacherQuizResultPreview({ isAdmin = false }) {
  const { classSectionId, quizId, templateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { quizData, answers = {}, scoredQuestions = [], score = 0, isPassed = false, correctCount = 0, incorrectCount = 0, unansweredCount = 0 } = location.state || {};
  const base = isAdmin ? "/admin" : "/teacher";
  const isTemplate = !!templateId;
  const previewUrl = isTemplate
    ? `${base}/curriculums/${templateId}/quizzes/${quizId}/preview`
    : `${base}/class-sections/${classSectionId}/quizzes/${quizId}/preview`;
  const editUrl = isTemplate
    ? `${base}/curriculums/${templateId}/quizzes/${quizId}`
    : `${base}/class-sections/${classSectionId}/quizzes/${quizId}`;

  if (!quizData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            Không có dữ liệu kết quả. Vui lòng thực hiện xem trước lại.
          </p>
          <button
            onClick={() => navigate(previewUrl)}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const renderUserAnswer = (question) => {
    const answer = answers[question.id];
    const selectedIds = Array.isArray(answer) ? answer : [];
    const selectedOptions = selectedIds
      .map((id) => (question.answers || []).find((option) => option.id === id))
      .filter(Boolean);

    if (selectedOptions.length > 0) {
      return <HtmlAnswerList items={selectedOptions} />;
    }

    if (question.type === "SHORT_ANSWER" || question.type === "ESSAY") {
      return (
        <span className="font-medium text-[#111418] dark:text-white max-w-2xl break-words whitespace-pre-wrap">
          {formatUserAnswer(question, answers)}
        </span>
      );
    }

    return (
      <span className="font-medium text-[#111418] dark:text-white max-w-2xl break-words">
        {formatUserAnswer(question, answers)}
      </span>
    );
  };

  const renderCorrectAnswer = (question) => {
    const correctOptions = (question.answers || []).filter((option) => option.isCorrect);

    if (correctOptions.length > 0) {
      return <HtmlAnswerList items={correctOptions} />;
    }

    return (
      <span className="font-medium text-[#111418] dark:text-white max-w-2xl break-words whitespace-pre-wrap">
        {formatCorrectAnswer(question)}
      </span>
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display min-h-screen flex flex-col">
      {/* Preview Banner */}
      <div className="sticky top-0 z-30 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
          <EyeIcon className="h-4 w-4" />
          Kết quả xem trước — Không được lưu vào hệ thống
        </div>
        <button
          onClick={() => navigate(editUrl)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Về trang chỉnh sửa quiz
        </button>
      </div>

      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center px-4 py-5 md:px-10 lg:px-40">
          <div className="layout-content-container flex max-w-[960px] flex-1 flex-col gap-6">
            <AppBreadcrumb
              className="mb-1"
              context={{
                classTitle: quizData?.classSectionTitle || quizData?.classTitle,
                templateName: quizData?.templateName,
                quizTitle: quizData?.title,
              }}
            />
            {/* Main Result Card */}
            <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm dark:bg-[#1A2633] dark:shadow-gray-900 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Score Circle */}
                <div className="relative flex size-32 shrink-0 items-center justify-center rounded-full border-[6px] border-[#e6f4ea] bg-white dark:border-green-900/30 dark:bg-[#1A2633]">
                  <svg className="absolute size-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle className="text-[#e6f4ea] dark:text-green-900/30" cx="50" cy="50" fill="transparent" r="44" stroke="currentColor" strokeWidth="6" />
                    <circle
                      className="text-[#2eb85c]"
                      cx="50" cy="50" fill="transparent" r="44"
                      stroke="currentColor"
                      strokeDasharray="276"
                      strokeDashoffset={276 - (276 * score) / 100}
                      strokeLinecap="round"
                      strokeWidth="6"
                    />
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-[#111418] dark:text-white">{score}</span>
                    <span className="text-xs font-medium text-[#617589] dark:text-gray-400">/ 100</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black leading-tight tracking-[-0.033em] text-[#111418] dark:text-white md:text-3xl">
                      {quizData.title}
                    </h1>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${isPassed ? "bg-[#e6f4ea] text-[#1d8f44] dark:bg-green-900/40 dark:text-green-400" : "bg-[#fdecea] text-[#d32f2f] dark:bg-red-900/40 dark:text-red-400"}`}>
                      {isPassed ? "Đạt" : "Không đạt"}
                    </span>
                  </div>
                  <p className="text-base font-normal leading-normal text-[#617589] dark:text-gray-400">
                    Kết quả mô phỏng dành cho giáo viên
                  </p>
                  <p className="text-base font-medium text-[#111418] dark:text-gray-200">
                    {isPassed ? "Bài kiểm tra đạt yêu cầu." : "Bài kiểm tra chưa đạt yêu cầu."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                <button
                  onClick={() => navigate(previewUrl, { state: { quizData } })}
                  className="flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 text-sm font-bold text-white transition"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Xem trước lại
                </button>
                <button
                  onClick={() => navigate(editUrl)}
                  className="flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[#f0f2f4] px-4 text-sm font-bold text-[#111418] transition hover:bg-[#e0e2e4] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Về chỉnh sửa quiz
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#dbe0e6] bg-white p-4 text-center dark:border-gray-700 dark:bg-[#1A2633]">
                <div className="flex items-center gap-2 text-[#1d8f44] dark:text-green-400">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Câu đúng</span>
                </div>
                <p className="text-xl font-bold leading-tight text-[#111418] dark:text-white md:text-2xl">{correctCount}</p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#dbe0e6] bg-white p-4 text-center dark:border-gray-700 dark:bg-[#1A2633]">
                <div className="flex items-center gap-2 text-[#d32f2f] dark:text-red-400">
                  <XCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Câu sai</span>
                </div>
                <p className="text-xl font-bold leading-tight text-[#111418] dark:text-white md:text-2xl">{incorrectCount}</p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#dbe0e6] bg-white p-4 text-center dark:border-gray-700 dark:bg-[#1A2633]">
                <div className="flex items-center gap-2 text-[#f57c00] dark:text-orange-400">
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Chưa trả lời</span>
                </div>
                <p className="text-xl font-bold leading-tight text-[#111418] dark:text-white md:text-2xl">{unansweredCount}</p>
              </div>
            </div>

            {/* Review Section */}
            <div className="flex flex-col gap-4">
              <h3 className="px-2 text-xl font-bold text-[#111418] dark:text-white">Chi tiết bài làm</h3>
              {scoredQuestions.map((question, index) => {
                const isCorrect = question.isCorrect;
                const hasGradedScore =
                  question.earnedPoints != null && question.maxPoints != null;
                const isPartial =
                  hasGradedScore &&
                  Number(question.earnedPoints) > 0 &&
                  Number(question.earnedPoints) < Number(question.maxPoints);

                return (
                  <div key={question.id || index} className="flex flex-col gap-4 rounded-xl border border-[#dbe0e6] bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#1A2633]">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div className="flex gap-3 flex-1">
                        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isCorrect ? "bg-[#e6f4ea] text-[#1d8f44] dark:bg-green-900/40 dark:text-green-400" : isPartial ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : isCorrect === false ? "bg-[#fdecea] text-[#d32f2f] dark:bg-red-900/40 dark:text-red-400" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          {renderQuestionStem(question)}
                        </div>
                      </div>
                      <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${isCorrect === true ? "bg-[#e6f4ea] text-[#1d8f44] dark:bg-green-900/40 dark:text-green-400" : isPartial ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : isCorrect === false ? "bg-[#fdecea] text-[#d32f2f] dark:bg-red-900/40 dark:text-red-400" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {isPartial ? "Một phần" : isCorrect === true ? "Đúng" : isCorrect === false ? "Sai" : "Chưa chấm"}
                      </span>
                    </div>
                    <ResourcePreview resource={question.resource} className="pl-0 sm:pl-11" />

                    <div className="mt-2 flex flex-col gap-3 pl-0 sm:pl-11">
                      {/* User answer */}
                      <div className={`flex items-start gap-3 rounded-lg border p-3 ${isCorrect ? "border-[#e6f4ea] bg-[#f7fbf8] dark:border-green-900/30 dark:bg-green-900/10" : isPartial ? "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10" : isCorrect === false ? "border-[#fdecea] bg-[#fff8f8] dark:border-red-900/30 dark:bg-red-900/10" : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"}`}>
                        {isCorrect === true ? (
                          <CheckCircleIcon className="h-6 w-6 text-[#1d8f44] dark:text-green-400 flex-shrink-0" />
                        ) : isPartial ? (
                          <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        ) : isCorrect === false ? (
                          <XCircleIcon className="h-6 w-6 text-[#d32f2f] dark:text-red-400 flex-shrink-0" />
                        ) : (
                          <QuestionMarkCircleIcon className="h-6 w-6 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-[#617589] dark:text-gray-400">Câu trả lời đã chọn</span>
                          {renderUserAnswer(question)}
                          {hasGradedScore && (
                            <span className="mt-1 text-xs font-semibold text-primary">
                              {Number(question.earnedPoints).toFixed(2)} / {Number(question.maxPoints).toFixed(2)} điểm
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Correct answer (teacher-only) */}
                      {isCorrect !== true && (
                        <div className="flex items-start gap-3 rounded-lg border border-[#e6f4ea] bg-[#f7fbf8] dark:border-green-900/30 dark:bg-green-900/10 p-3">
                          <CheckCircleIcon className="h-6 w-6 text-[#1d8f44] dark:text-green-400 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-[#617589] dark:text-gray-400">Đáp án đúng</span>
                          {renderCorrectAnswer(question)}
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
