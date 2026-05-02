import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ClockIcon,
  FlagIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PaperAirplaneIcon,
  Squares2X2Icon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { FlagIcon as FlagIconSolid } from "@heroicons/react/24/solid";
import { message, Spin, Modal, Select } from "antd";
import { getCurrentAttempt, startQuizAttempt, submitAnswer, submitQuiz, getQuizById } from "../../api/quiz";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import QuestionBlocksRenderer from "../../components/quiz/QuestionBlocksRenderer";

const isInteractionQuestion = (type) => ["MATCHING", "DRAG_ORDER", "CLOZE"].includes(type);
const sortByOrder = (items = []) =>
  [...items].sort((left, right) => (left.orderIndex || 0) - (right.orderIndex || 0));

function SortableOrderItem({ itemId, content, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 rounded-lg border transition-shadow ${isDragging ? "border-primary shadow-lg bg-primary/5 dark:bg-primary/10" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50"}`}
    >
      <span className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
        {index + 1}
      </span>
      <span className="flex-1 text-slate-700 dark:text-slate-200 font-medium select-none">{content}</span>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none">
        <Bars3Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function DragOrderQuestion({ itemMap, currentOrder, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const orderedItems = currentOrder.map((id) => itemMap.get(id)).filter(Boolean);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currentOrder.indexOf(active.id);
    const newIndex = currentOrder.indexOf(over.id);
    onReorder(arrayMove(currentOrder, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {orderedItems.map((item, index) => (
            <SortableOrderItem key={item.id} itemId={item.id} content={item.content} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default function QuizAttempt() {
  const { id, classSectionId } = useParams(); // quizId
  const navigate = useNavigate();
  const location = useLocation();
  const classContentItemId = location.state?.classContentItemId ?? location.state?.chapterItemId;

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [quizInfo, setQuizInfo] = useState(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Map questionId -> array of answerIds
  const [contentBlockBlanks, setContentBlockBlanks] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    if (!classContentItemId) {
      console.warn("Missing classContentItemId");
    }
    initializeQuiz();
  }, [id, classContentItemId]);

  const initializeQuiz = async () => {
    try {
      setLoading(true);
      
      // 1. Get Quiz Info
      const quizRes = await getQuizById(id);
      const quiz = quizRes.data || quizRes;
      setQuizInfo(quiz);

      // 2. Get or Start Attempt
      if (classContentItemId) {
          let attemptData = null;
          
          try {
             const currentRes = await getCurrentAttempt(classContentItemId);
             attemptData = currentRes?.data || currentRes;
          } catch(e) { 
            console.log("No current attempt found, will start new one");
          }
          
          // If no current attempt, start a new one
          if (!attemptData) {
            const startRes = await startQuizAttempt(id, classContentItemId);
            attemptData = startRes?.data || startRes;
          }

          if (attemptData) {
            setAttempt(attemptData);
            
            // Map questions from attempt answers
            if (attemptData.answers && Array.isArray(attemptData.answers)) {
                const qs = attemptData.answers.map(a => ({
                  ...a.quizQuestion,
                  attemptAnswerId: a.id,
                  userSelectedAnswers: a.selectedAnswers || [],
                  userTextAnswer: a.textAnswer,
                  userAnswerItems: a.answerItems || [],
                  userContentBlockAnswers: a.contentBlockAnswers || [],
                }));
                setQuestions(qs);

                // Initialize answers state from server data
                const initialAnswers = {};
                const initialContentBlockBlanks = {};
                qs.forEach(q => {
                   if (isInteractionQuestion(q.type) && q.userAnswerItems && q.userAnswerItems.length > 0) {
                       initialAnswers[q.id] = buildInitialInteractionAnswer(q, q.userAnswerItems);
                   } else if (q.type === "SHORT_ANSWER" && q.userTextAnswer) {
                       initialAnswers[q.id] = [q.userTextAnswer];
                   } else if (q.userSelectedAnswers && q.userSelectedAnswers.length > 0) {
                       initialAnswers[q.id] = q.userSelectedAnswers.map(ans => ans.id);
                   }

                   if (q.userContentBlockAnswers && q.userContentBlockAnswers.length > 0) {
                     initialContentBlockBlanks[q.id] = q.userContentBlockAnswers.reduce((acc, item) => {
                       if (item.blankKey) {
                         acc[item.blankKey] = item.answerText || "";
                       }
                       return acc;
                     }, {});
                   }
                });
                setAnswers(initialAnswers);
                setContentBlockBlanks(initialContentBlockBlanks);
            }

            // Timer Setup - use remaining time from attempt if available, else use quiz time limit
            if (attemptData?.remainingTimeSeconds !== null && attemptData?.remainingTimeSeconds !== undefined) {
                setTimeLeft(attemptData.remainingTimeSeconds);
            } else if (quiz?.timeLimitMinutes) {
                setTimeLeft(quiz.timeLimitMinutes * 60); 
            }
          }
      }

    } catch (err) {
      console.error(err);
      message.error(err.message || "Lỗi khi tải bài kiểm tra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleConfirmSubmit(); // Force submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const getQuestionTypeLabel = (type) => {
    switch(type) {
      case 'SINGLE_CHOICE':
        return 'Trắc nghiệm 1 đáp án';
      case 'MULTIPLE_CHOICE':
        return 'Trắc nghiệm nhiều đáp án';
      case 'SHORT_ANSWER':
        return 'Trả lời ngắn';
      case 'MATCHING':
        return 'Ghép cặp';
      case 'DRAG_ORDER':
        return 'Sắp xếp';
      case 'CLOZE':
        return 'Điền chỗ trống';
      default:
        return '';
    }
  };

  const getQuestionTypeBgColor = (type) => {
    switch(type) {
      case 'SINGLE_CHOICE':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'MULTIPLE_CHOICE':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'SHORT_ANSWER':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'MATCHING':
        return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400';
      case 'DRAG_ORDER':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'CLOZE':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
      default:
        return '';
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getItemsByRole = (question, role) =>
    sortByOrder((question.items || []).filter((item) => item.role === role));

  const getContentBlockBlanks = (questionId) => contentBlockBlanks[questionId] || {};

  const buildContentBlockAnswers = (question, blanksMap = {}) =>
    sortByOrder((question.blocks || []).filter((block) => block.blockType === "BLANK_REF" && block.blankKey))
      .map((block) => ({
        blankKey: block.blankKey,
        answerText: blanksMap[block.blankKey] || "",
      }));

  const handleContentBlockBlankChange = (questionId, blankKey, value) => {
    if (!blankKey) return;
    const question = questions.find((item) => item.id === questionId);
    const nextQuestionBlanks = {
      ...(contentBlockBlanks[questionId] || {}),
      [blankKey]: value,
    };
    setContentBlockBlanks((prev) => ({
      ...prev,
      [questionId]: nextQuestionBlanks,
    }));
    if (attempt && question) {
      submitAnswer(attempt.id, questionId, {
        questionId,
        contentBlockAnswers: buildContentBlockAnswers(question, nextQuestionBlanks),
      }).catch((err) => {
        console.error("Failed to save content block answer", err);
      });
    }
  };

  const buildInitialInteractionAnswer = (question, answerItems = []) => {
    if (question.type === "MATCHING") {
      const matches = {};
      answerItems.forEach((item) => {
        if (item.itemId && item.selectedItemId) {
          matches[item.itemId] = item.selectedItemId;
        }
      });
      return { matches };
    }

    if (question.type === "DRAG_ORDER") {
      const order = [...answerItems]
        .filter((item) => item.itemId && item.submittedOrderIndex)
        .sort((left, right) => left.submittedOrderIndex - right.submittedOrderIndex)
        .map((item) => item.itemId);
      return order.length > 0 ? { order } : {};
    }

    if (question.type === "CLOZE") {
      const blanks = {};
      answerItems.forEach((item) => {
        if (item.itemId) {
          blanks[item.itemId] = item.answerText || "";
        }
      });
      return { blanks };
    }

    return {};
  };

  const buildInteractionPayload = (question, answerState = {}) => {
    if (question.type === "MATCHING") {
      const prompts = getItemsByRole(question, "PROMPT");
      return prompts
        .filter((prompt) => answerState.matches?.[prompt.id])
        .map((prompt) => ({
          itemId: prompt.id,
          selectedItemId: answerState.matches[prompt.id],
        }));
    }

    if (question.type === "DRAG_ORDER") {
      const defaultOrder = getItemsByRole(question, "ORDER_ITEM").map((item) => item.id);
      const order = answerState.order || defaultOrder;
      return order.map((itemId, index) => ({
        itemId,
        submittedOrderIndex: index + 1,
      }));
    }

    if (question.type === "CLOZE") {
      const blanks = getItemsByRole(question, "BLANK");
      return blanks.map((blank, index) => ({
        itemId: blank.id,
        blankIndex: blank.blankIndex || index + 1,
        answerText: answerState.blanks?.[blank.id] || "",
      }));
    }

    return [];
  };

  const saveInteractionAnswer = async (question, answerState) => {
    if (!attempt) return;
    try {
      await submitAnswer(attempt.id, question.id, {
        questionId: question.id,
        selectedAnswerIds: [],
        textAnswer: null,
        answerItems: buildInteractionPayload(question, answerState),
      });
    } catch (err) {
      console.error("Failed to submit interaction answer", err);
    }
  };

  const isQuestionAnswered = (question) => {
    const answer = answers[question.id];
    if (!answer) return false;
    if (Array.isArray(answer)) {
      return answer.some((item) => String(item || "").trim() !== "");
    }
    if (question.type === "MATCHING") {
      return Object.values(answer.matches || {}).some(Boolean);
    }
    if (question.type === "DRAG_ORDER") {
      return Array.isArray(answer.order) && answer.order.length > 0;
    }
    if (question.type === "CLOZE") {
      return Object.values(answer.blanks || {}).some((value) => String(value || "").trim() !== "");
    }
    return false;
  };

  const handleAnswerSelect = async (questionId, answerId) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const isMultiple = question.type === "MULTIPLE_CHOICE";
    
    let newSelectedIds = [];
    
    if (isMultiple) {
        const currentIds = answers[questionId] || [];
        if (currentIds.includes(answerId)) {
            newSelectedIds = currentIds.filter(id => id !== answerId);
        } else {
            newSelectedIds = [...currentIds, answerId];
        }
    } else {
        newSelectedIds = [answerId];
    }
    
    setAnswers({ ...answers, [questionId]: newSelectedIds });

    // API Call
    if (attempt) {
        try {
           await submitAnswer(attempt.id, questionId, {
               questionId: questionId,
               selectedAnswerIds: newSelectedIds,
               textAnswer: null 
           });
        } catch (err) {
           console.error("Failed to submit answer", err);
        }
    }
  };

  const handleMatchingSelect = (question, promptId, selectedItemId) => {
    const current = answers[question.id] || { matches: {} };
    const next = {
      ...current,
      matches: {
        ...(current.matches || {}),
        [promptId]: selectedItemId,
      },
    };
    setAnswers({ ...answers, [question.id]: next });
    saveInteractionAnswer(question, next);
  };

  const handleDragMove = (question, itemId, direction) => {
    const defaultOrder = getItemsByRole(question, "ORDER_ITEM").map((item) => item.id);
    const currentOrder = answers[question.id]?.order || defaultOrder;
    const index = currentOrder.indexOf(itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    const next = { order: nextOrder };
    setAnswers({ ...answers, [question.id]: next });
    saveInteractionAnswer(question, next);
  };

  const handleClozeChange = (question, blankId, value) => {
    const current = answers[question.id] || { blanks: {} };
    const next = {
      ...current,
      blanks: {
        ...(current.blanks || {}),
        [blankId]: value,
      },
    };
    setAnswers({ ...answers, [question.id]: next });
    saveInteractionAnswer(question, next);
  };

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
      if (submitting) return;
      if (!attempt) return;
      
      setShowSubmitConfirm(false);
      
      try {
          setSubmitting(true);
          const submitRes = await submitQuiz(attempt.id);
          const result = submitRes?.data || submitRes;
          message.success("Nộp bài thành công!");
          navigate(`/class-sections/${classSectionId}/quizzes/${id}/result`, { state: { attemptId: result.id || attempt.id, classContentItemId } });
      } catch (err) {
          message.error("Lỗi nộp bài: " + err.message);
          setSubmitting(false);
      }
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirm(false);
  };
  
  const toggleFlag = () => {
    const qId = questions[currentQuestionIndex]?.id;
    if (flaggedQuestions.includes(qId)) {
      setFlaggedQuestions(flaggedQuestions.filter((id) => id !== qId));
    } else {
      setFlaggedQuestions([...flaggedQuestions, qId]);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const getQuestionStatusClass = (index) => {
    const q = questions[index];
    if (!q) return "";
    const qId = q.id;
    
    const isCurrent = currentQuestionIndex === index;
    const isAnswered = isQuestionAnswered(q);
    const isFlagged = flaggedQuestions.includes(qId);

    let baseClass = "aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors relative ";

    if (isCurrent) {
      return baseClass + "border-2 border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20";
    }
    if (isFlagged) {
      return baseClass + "bg-yellow-400 text-white hover:bg-yellow-500";
    }
    if (isAnswered) {
      return baseClass + "bg-primary text-white hover:bg-primary/90";
    }
    return baseClass + "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700";
  };

  const renderInteractionAnswer = (question) => {
    if (question.type === "MATCHING") {
      const prompts = getItemsByRole(question, "PROMPT");
      const matches = getItemsByRole(question, "MATCH");
      const current = answers[question.id] || { matches: {} };
      return (
        <div className="space-y-3">
          {prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50"
            >
              <div className="font-medium text-slate-700 dark:text-slate-200">
                {index + 1}. {prompt.content}
              </div>
              <Select
                value={current.matches?.[prompt.id]}
                onChange={(value) => handleMatchingSelect(question, prompt.id, value)}
                options={matches.map((match) => ({ value: match.id, label: match.content }))}
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
      return (
        <DragOrderQuestion
          itemMap={itemMap}
          currentOrder={currentOrder}
          onReorder={(nextOrder) => {
            const next = { order: nextOrder };
            setAnswers({ ...answers, [question.id]: next });
            saveInteractionAnswer(question, next);
          }}
        />
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
  
  if (loading) return <div className="h-screen flex items-center justify-center"><Spin size="large" /></div>;
  if (!classContentItemId) return <div className="p-8">Yêu cầu truy cập từ bài học để ghi nhận kết quả.</div>;
  if (!attempt || questions.length === 0) return <div className="p-8">Không tìm thấy dữ liệu bài kiểm tra.</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const answeredQuestionCount = questions.filter(isQuestionAnswered).length;

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display flex flex-col h-screen overflow-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 z-30">
        <div className="h-full px-4 md:px-6 flex items-center justify-between w-full max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[24px] font-bold">school</span>
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold leading-tight tracking-tight">
                {quizInfo?.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <ClockIcon className="h-5 w-5 text-primary" />
              <span className="font-mono text-lg font-bold text-primary tabular-nums">
                {formatTime(timeLeft)}
              </span>
            </div>
             {/* Mobile Timer */}
            <div className="md:hidden flex items-center gap-1 text-primary font-bold bg-primary/10 px-2 py-1 rounded">
              <ClockIcon className="h-4 w-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Câu hỏi {currentQuestionIndex + 1}
                      </h2>
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getQuestionTypeBgColor(currentQuestion.type)} w-fit`}>
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
                    {flaggedQuestions.includes(currentQuestion.id) ? (
                      <FlagIconSolid className="h-5 w-5" />
                    ) : (
                      <FlagIcon className="h-5 w-5" />
                    )}
                    <span className="hidden sm:inline">Đánh dấu</span>
                  </button>
                </div>

                <div className="p-6 md:p-8">
                  <p className="text-base md:text-lg text-slate-700 dark:text-slate-200 font-medium leading-relaxed mb-4 whitespace-pre-wrap">
                    {currentQuestion.content}
                  </p>

                  {currentQuestion.blocks?.length > 0 && (
                    <div className="mb-6">
                      <QuestionBlocksRenderer
                        blocks={currentQuestion.blocks}
                        blanks={getContentBlockBlanks(currentQuestion.id)}
                        onBlankChange={(blankKey, value) =>
                          handleContentBlockBlankChange(currentQuestion.id, blankKey, value)
                        }
                        showBlanks={true}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {isInteractionQuestion(currentQuestion.type) ? (
                      renderInteractionAnswer(currentQuestion)
                    ) : currentQuestion.type === 'SHORT_ANSWER' ? (
                      // Short answer - Text Area
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Nhập câu trả lời của bạn:
                        </label>
                        <textarea
                          value={answers[currentQuestion.id]?.[0] || ''}
                          onChange={(e) => {
                            setAnswers({ ...answers, [currentQuestion.id]: [e.target.value] });
                            // Auto-save to server
                            if (attempt) {
                              submitAnswer(attempt.id, currentQuestion.id, {
                                questionId: currentQuestion.id,
                                selectedAnswerIds: [],
                                textAnswer: e.target.value
                              }).catch(err => console.error("Failed to save answer", err));
                            }
                          }}
                          placeholder="Viết câu trả lời của bạn ở đây..."
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                          rows="6"
                        />
                      </div>
                    ) : (
                      // Multiple/Single Choice - Radio/Checkbox
                      currentQuestion.answers && currentQuestion.answers.map((option) => {
                        const isSelected = answers[currentQuestion.id]?.includes(option.id);
                        return (
                          <label
                            key={option.id}
                            className="group block cursor-pointer relative"
                          >
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
                                // Checkbox for Multiple Choice
                                <div className={`w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-500 mr-4 flex-shrink-0 relative flex items-center justify-center ${isSelected ? "border-primary bg-primary" : ""}`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              ) : (
                                // Radio button for Single Choice
                                <div className={`w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-500 mr-4 flex-shrink-0 relative flex items-center justify-center ${isSelected ? "border-primary bg-primary" : ""}`}>
                                  {isSelected && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                  )}
                                </div>
                              )}
                              <span className="text-slate-700 dark:text-slate-200 font-medium select-none">
                                {option.content}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Bar */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handlePrev}
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
                  onClick={handleNext}
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

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-[320px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-20 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">
              Danh sách câu hỏi
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chọn một số để chuyển câu
            </p>
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
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={handleSubmitClick}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-0.5"
              disabled={submitting}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </aside>
             {/* Mobile Floating Action Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-slate-800 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all"
        >
          <Squares2X2Icon className="h-6 w-6" />
        </button>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        title="Xác nhận nộp bài"
        open={showSubmitConfirm}
        onOk={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        okText="Có, nộp bài"
        cancelText="Hủy"
        confirmLoading={submitting}
        centered
        className="dark:bg-slate-900"
      >
        <div className="space-y-3">
          <p className="text-base text-slate-700 dark:text-slate-300">
            Bạn có chắc chắn muốn nộp bài quiz này không?
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Thông tin bài nộp:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Tổng câu hỏi: <span className="font-bold">{questions.length}</span></li>
              <li>• Câu đã làm: <span className="font-bold">{answeredQuestionCount}</span></li>
              <li>• Câu chưa làm: <span className="font-bold">{questions.length - answeredQuestionCount}</span></li>
            </ul>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
            ⚠️ Lưu ý: Sau khi nộp bài, bạn không thể chỉnh sửa câu trả lời!
          </p>
        </div>
      </Modal>
    </div>
  );
}
