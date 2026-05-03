import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  ClockIcon,
  FlagIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PaperAirplaneIcon,
  Squares2X2Icon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { FlagIcon as FlagIconSolid } from "@heroicons/react/24/solid";
import { Modal, Select } from "antd";
import ResourcePreview from "../../components/common/ResourcePreview";

const sortByOrder = (items = []) =>
  [...items].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

const isMatchingQuestion = (type) => type === "MATCHING" || type === "IMAGE_MATCHING";
const isInteractionQuestion = (type) => ["MATCHING", "IMAGE_MATCHING", "DRAG_ORDER", "CLOZE"].includes(type);
const isTextAnswerQuestion = (type) => ["SHORT_ANSWER", "ESSAY"].includes(type);

const getQuestionTypeLabel = (type) => {
  const labels = {
    SINGLE_CHOICE: "Trắc nghiệm 1 đáp án",
    MULTIPLE_CHOICE: "Trắc nghiệm nhiều đáp án",
    TRUE_FALSE: "Đúng / Sai",
    SHORT_ANSWER: "Trả lời ngắn",
    ESSAY: "Tự luận",
    MATCHING: "Ghép cặp",
    IMAGE_MATCHING: "Ghép ảnh",
    DRAG_ORDER: "Sắp xếp",
    CLOZE: "Điền chỗ trống",
  };
  return labels[type] || "";
};

const getTypeBgColor = (type) => {
  const colors = {
    SINGLE_CHOICE: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    MULTIPLE_CHOICE: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    TRUE_FALSE: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    SHORT_ANSWER: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    ESSAY: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    MATCHING: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
    IMAGE_MATCHING: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
    DRAG_ORDER: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    CLOZE: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
  };
  return colors[type] || "";
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const getItemsByRole = (question, role) =>
  sortByOrder((question.items || []).filter((item) => item.role === role));

const scoreQuestion = (question, answers) => {
  const selected = answers[question.id];

  if (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE" || question.type === "IMAGE_ANSWERING") {
    const correctIds = (question.answers || [])
      .filter((a) => a.isCorrect)
      .map((a) => String(a.id))
      .sort();
    const selectedIds = (selected || []).map((id) => String(id)).sort();
    return (
      correctIds.length > 0 &&
      correctIds.length === selectedIds.length &&
      correctIds.every((id, i) => id === selectedIds[i])
    );
  }

  if (question.type === "SHORT_ANSWER") {
    const text = (selected?.[0] || "").trim().toLowerCase();
    if (!text) return false;
    const accepted = (question.items?.[0]?.acceptedAnswers ||
      question.items?.[0]?.acceptedAnswersText || []).map((t) =>
      String(t).trim().toLowerCase()
    );
    return accepted.length > 0 && accepted.some((t) => t === text);
  }

  if (question.type === "ESSAY") {
    return null;
  }

  if (isMatchingQuestion(question.type)) {
    const prompts = getItemsByRole(question, "PROMPT");
    const matchItems = getItemsByRole(question, "MATCH");
    const matchByKey = new Map(matchItems.map((m) => [m.itemKey, m]));
    const matches = selected?.matches || {};
    if (prompts.length === 0) return null;
    return prompts.every((prompt) => {
      const correctMatch = matchByKey.get(prompt.correctMatchKey);
      if (!correctMatch) return false;
      return String(matches[prompt.id]) === String(correctMatch.id);
    });
  }

  if (question.type === "DRAG_ORDER") {
    const orderItems = getItemsByRole(question, "ORDER_ITEM");
    const correctOrder = orderItems.map((item) => String(item.id));
    const submittedOrder = (selected?.order || []).map(String);
    return (
      correctOrder.length > 0 &&
      correctOrder.length === submittedOrder.length &&
      correctOrder.every((id, i) => id === submittedOrder[i])
    );
  }

  if (question.type === "CLOZE") {
    const blanks = getItemsByRole(question, "BLANK");
    const userBlanks = selected?.blanks || {};
    if (blanks.length === 0) return null;
    return blanks.every((blank) => {
      const text = (userBlanks[blank.id] || "").trim().toLowerCase();
      if (!text) return false;
      const accepted = (blank.acceptedAnswers || blank.acceptedAnswersText || []).map((t) =>
        String(t).trim().toLowerCase()
      );
      return accepted.some((t) => t === text);
    });
  }

  return null;
};

export default function TeacherQuizAttemptPreview({ isAdmin = false }) {
  const { classSectionId, quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const quizData = location.state?.quizData;

  const questions = quizData?.questions || [];
  const hasTimeLimit = (quizData?.timeLimitMinutes || 0) > 0;
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(hasTimeLimit ? quizData.timeLimitMinutes * 60 : null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const submittedRef = useRef(false);
  const base = isAdmin ? "/admin" : "/teacher";

  useEffect(() => {
    if (!hasTimeLimit) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!submittedRef.current) handleConfirmSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const previewRoot = `${base}/class-sections/${classSectionId}/quizzes/${quizId}/preview`;

  if (!quizData) {
    // State lost (e.g. page refresh) — redirect to quiz preview page which fetches fresh data
    return <Navigate to={previewRoot} replace />;
  }

  if (questions.length === 0) {
    // Bank-mode or empty quiz — can't simulate locally
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 max-w-md">
          Bài kiểm tra này tạo câu hỏi ngẫu nhiên từ ngân hàng câu hỏi và không thể mô phỏng ở chế độ xem trước.
        </p>
        <button
          onClick={() => navigate(previewRoot)}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Quay lại trang xem trước
        </button>
      </div>
    );
  }

  const isQuestionAnswered = (question) => {
    const answer = answers[question.id];
    if (!answer) return false;
    if (Array.isArray(answer)) return answer.some((v) => String(v || "").trim() !== "");
    if (isMatchingQuestion(question.type)) return Object.values(answer.matches || {}).some(Boolean);
    if (question.type === "DRAG_ORDER") return Array.isArray(answer.order) && answer.order.length > 0;
    if (question.type === "CLOZE") return Object.values(answer.blanks || {}).some((v) => String(v || "").trim() !== "");
    return false;
  };

  const handleAnswerSelect = (questionId, answerId) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;
    const isMultiple = question.type === "MULTIPLE_CHOICE";
    const current = answers[questionId] || [];
    let next;
    if (isMultiple) {
      next = current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId];
    } else {
      next = [answerId];
    }
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
  };

  const handleMatchingSelect = (question, promptId, selectedItemId) => {
    const current = answers[question.id] || { matches: {} };
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { ...current, matches: { ...(current.matches || {}), [promptId]: selectedItemId } },
    }));
  };

  const handleDragMove = (question, itemId, direction) => {
    const defaultOrder = getItemsByRole(question, "ORDER_ITEM").map((item) => item.id);
    const currentOrder = answers[question.id]?.order || defaultOrder;
    const index = currentOrder.indexOf(itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    setAnswers((prev) => ({ ...prev, [question.id]: { order: nextOrder } }));
  };

  const handleClozeChange = (question, blankId, value) => {
    const current = answers[question.id] || { blanks: {} };
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { ...current, blanks: { ...(current.blanks || {}), [blankId]: value } },
    }));
  };

  const handleConfirmSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setShowSubmitConfirm(false);

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const scoredQuestions = questions.map((q) => {
      const pts = q.points || 1;
      totalPoints += pts;
      const isAnswered = isQuestionAnswered(q);
      if (!isAnswered) {
        unansweredCount++;
        return { ...q, isCorrect: false, isAnswered: false };
      }
      const result = scoreQuestion(q, answers);
      if (result === true) {
        correctCount++;
        earnedPoints += pts;
      } else {
        incorrectCount++;
      }
      return { ...q, isCorrect: result, isAnswered: true };
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = score >= (quizData.minPassScore || 0);

    navigate(
      `${base}/class-sections/${classSectionId}/quizzes/${quizId}/preview/result`,
      {
        state: {
          quizData,
          answers,
          scoredQuestions,
          score,
          isPassed,
          correctCount,
          incorrectCount,
          unansweredCount,
        },
      }
    );
  };

  const toggleFlag = () => {
    const qId = questions[currentQuestionIndex]?.id;
    if (!qId) return;
    setFlaggedQuestions((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const getQuestionStatusClass = (index) => {
    const q = questions[index];
    if (!q) return "";
    const isCurrent = currentQuestionIndex === index;
    const isAnswered = isQuestionAnswered(q);
    const isFlagged = flaggedQuestions.includes(q.id);
    const base = "aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors relative ";
    if (isCurrent) return base + "border-2 border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20";
    if (isFlagged) return base + "bg-yellow-400 text-white hover:bg-yellow-500";
    if (isAnswered) return base + "bg-primary text-white hover:bg-primary/90";
    return base + "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700";
  };

  const renderInteractionAnswer = (question) => {
    if (isMatchingQuestion(question.type)) {
      const prompts = getItemsByRole(question, "PROMPT");
      const matches = getItemsByRole(question, "MATCH");
      const current = answers[question.id] || { matches: {} };
      const renderItem = (item, fallback) => (
        <div className="space-y-2">
          {item?.resource && <ResourcePreview resource={item.resource} />}
          {!item?.resource && item?.resourceId && (
            <img
              src={`${import.meta.env.VITE_BACKEND_URL}/api/v1/lms/resources/${item.resourceId}/view`}
              className="max-h-40 max-w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
              alt=""
            />
          )}
          <span>{item?.content || fallback}</span>
        </div>
      );
      return (
        <div className="space-y-3">
          {prompts.map((prompt, index) => (
            <div key={prompt.id} className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
              <div className="font-medium text-slate-700 dark:text-slate-200">
                <span>{index + 1}. </span>
                {renderItem(prompt, `Ảnh ${index + 1}`)}
              </div>
              <Select
                value={current.matches?.[prompt.id]}
                onChange={(value) => handleMatchingSelect(question, prompt.id, value)}
                options={matches.map((match, matchIndex) => ({
                  value: match.id,
                  label: renderItem(match, `Đáp án ${matchIndex + 1}`),
                }))}
                placeholder="Chọn đáp án"
                className="w-full"
              />
            </div>
          ))}
        </div>
      );
    }

    if (question.type === "DRAG_ORDER") {
      const itemMap = new Map(getItemsByRole(question, "ORDER_ITEM").map((item) => [item.id, item]));
      const defaultOrder = [...itemMap.keys()];
      const currentOrder = answers[question.id]?.order || defaultOrder;
      const orderedItems = currentOrder.map((id) => itemMap.get(id)).filter(Boolean);
      return (
        <div className="space-y-3">
          {orderedItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
              <span className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">{index + 1}</span>
              <span className="flex-1 text-slate-700 dark:text-slate-200 font-medium">{item.content}</span>
              <button type="button" onClick={() => handleDragMove(question, item.id, -1)} disabled={index === 0} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40">↑</button>
              <button type="button" onClick={() => handleDragMove(question, item.id, 1)} disabled={index === orderedItems.length - 1} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40">↓</button>
            </div>
          ))}
        </div>
      );
    }

    if (question.type === "CLOZE") {
      const blanks = getItemsByRole(question, "BLANK");
      const current = answers[question.id] || { blanks: {} };
      return (
        <div className="space-y-3">
          {blanks.map((blank, index) => (
            <div key={blank.id} className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {blank.content || `Blank ${index + 1}`}
              </label>
              <input
                value={current.blanks?.[blank.id] || ""}
                onChange={(e) => handleClozeChange(question, blank.id, e.target.value)}
                placeholder="Nhập đáp án"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = questions.filter(isQuestionAnswered).length;

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display flex flex-col h-screen overflow-hidden antialiased">
      {/* Header */}
      <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 z-30">
        <div className="h-full px-4 md:px-6 flex items-center justify-between w-full max-w-[1920px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg text-sm font-semibold">
              <EyeIcon className="h-4 w-4" />
              Xem trước
            </div>
            <h1 className="text-base md:text-lg font-bold leading-tight tracking-tight">
              {quizData?.title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <ClockIcon className="h-5 w-5 text-primary" />
              <span className="font-mono text-lg font-bold text-primary tabular-nums">
                {hasTimeLimit ? formatTime(timeLeft ?? 0) : "Không giới hạn"}
              </span>
            </div>
            <div className="md:hidden flex items-center gap-1 text-primary font-bold bg-primary/10 px-2 py-1 rounded">
              <ClockIcon className="h-4 w-4" />
              <span>{hasTimeLimit ? formatTime(timeLeft ?? 0) : "∞"}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Question Card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold shadow-sm">
                      {currentQuestionIndex + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Câu hỏi {currentQuestionIndex + 1}</h2>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getTypeBgColor(currentQuestion.type)} w-fit`}>
                        {getQuestionTypeLabel(currentQuestion.type)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={toggleFlag}
                    className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded transition-colors ${
                      flaggedQuestions.includes(currentQuestion.id)
                        ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                        : "text-slate-400 hover:text-yellow-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {flaggedQuestions.includes(currentQuestion.id)
                      ? <FlagIconSolid className="h-5 w-5" />
                      : <FlagIcon className="h-5 w-5" />}
                    <span className="hidden sm:inline">Đánh dấu</span>
                  </button>
                </div>

                <div className="p-6 md:p-8">
                  <p className="text-base md:text-lg text-slate-700 dark:text-slate-200 font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                    {currentQuestion.content}
                  </p>
                  <div className="space-y-3">
                    {isInteractionQuestion(currentQuestion.type) ? (
                      renderInteractionAnswer(currentQuestion)
                    ) : isTextAnswerQuestion(currentQuestion.type) ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          {currentQuestion.type === "ESSAY" ? "Nhập bài tự luận của bạn:" : "Nhập câu trả lời của bạn:"}
                        </label>
                        <textarea
                          value={answers[currentQuestion.id]?.[0] || ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: [e.target.value] }))
                          }
                          placeholder="Viết câu trả lời của bạn ở đây..."
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                          rows="6"
                        />
                      </div>
                    ) : (
                      (currentQuestion.answers || []).map((option) => {
                        const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
                        return (
                          <label key={option.id} className="group block cursor-pointer relative">
                            <input
                              className="peer sr-only"
                              name={`question_${currentQuestion.id}`}
                              type={currentQuestion.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                              value={option.id}
                              checked={!!isSelected}
                              onChange={() => handleAnswerSelect(currentQuestion.id, option.id)}
                            />
                            <div className="flex items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary/5 group-hover:border-primary/50">
                              {currentQuestion.type === "MULTIPLE_CHOICE" ? (
                                <div className={`w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-500 mr-4 flex-shrink-0 relative flex items-center justify-center ${isSelected ? "border-primary bg-primary" : ""}`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              ) : (
                                <div className={`w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-500 mr-4 flex-shrink-0 relative flex items-center justify-center ${isSelected ? "border-primary bg-primary" : ""}`}>
                                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="block text-slate-700 dark:text-slate-200 font-medium select-none">{option.content}</span>
                                <ResourcePreview resource={option.resource} className="mt-2" />
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  disabled={currentQuestionIndex === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold transition-colors ${
                    currentQuestionIndex === 0
                      ? "text-slate-300 dark:text-slate-700 cursor-not-allowed"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span>Câu trước</span>
                </button>
                <button
                  onClick={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold shadow-md transition-all transform active:scale-95 ${
                    currentQuestionIndex === questions.length - 1
                      ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none"
                      : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                  }`}
                >
                  <span>Câu tiếp theo</span>
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-[320px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-20 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Danh sách câu hỏi</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Chọn một số để chuyển câu</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="grid grid-cols-5 gap-3">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={getQuestionStatusClass(index)}
                >
                  {index + 1}
                  {flaggedQuestions.includes(questions[index].id) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-0.5"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              Nộp bài
            </button>
          </div>
        </aside>

        {/* Mobile FAB */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-slate-800 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all"
        >
          <Squares2X2Icon className="h-6 w-6" />
        </button>
      </div>

      {/* Submit Modal */}
      <Modal
        title="Xác nhận nộp bài (Xem trước)"
        open={showSubmitConfirm}
        onOk={handleConfirmSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
        okText="Nộp bài & xem kết quả"
        cancelText="Hủy"
        centered
      >
        <div className="space-y-3">
          <p className="text-base text-slate-700 dark:text-slate-300">
            Bạn có muốn nộp bài và xem kết quả mô phỏng không?
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Thông tin bài nộp:</p>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-0.5">
              <li>• Tổng câu hỏi: <span className="font-bold">{questions.length}</span></li>
              <li>• Câu đã làm: <span className="font-bold">{answeredCount}</span></li>
              <li>• Câu chưa làm: <span className="font-bold">{questions.length - answeredCount}</span></li>
            </ul>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
            Kết quả không được lưu vào hệ thống — đây là chế độ xem trước dành cho giáo viên.
          </div>
        </div>
      </Modal>
    </div>
  );
}
