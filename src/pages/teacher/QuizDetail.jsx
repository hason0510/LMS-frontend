import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Select, DatePicker, Form, Input, Button, Checkbox, Radio, Spin, Alert, App, Switch } from "antd";
import dayjs from "dayjs";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import { createQuiz, getQuizById, updateQuiz } from "../../api/quiz";
import { getQuestionBankById, getQuestionBanks, getTags } from "../../api/questionBank";
import {
  createContentItemTemplate,
  getTemplateById,
  createQuizTemplate,
  getQuizTemplateById,
  updateQuizTemplate,
} from "../../api/curriculumTemplate";
import { createClassContentItem } from "../../api/classSection";
import {
  TrashIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
  ArrowLeftIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { getCourseById } from "../../api/classSection";

const QUIZ_BUILD_MODE = {
  MANUAL: "MANUAL",
  QUESTION_BANK: "QUESTION_BANK",
};

const SOURCE_SELECTION_OPTIONS = [
  { value: "ALL_MATCHED", label: "Lay tat ca cau phu hop" },
  { value: "RANDOM", label: "Lay ngau nhien" },
  { value: "MANUAL", label: "Chon thu cong" },
];

const DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "De" },
  { value: "MEDIUM", label: "Trung binh" },
  { value: "HARD", label: "Kho" },
];

const createSourceId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createItemId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyBankSource = () => ({
  sourceId: createSourceId(),
  id: null,
  questionBankId: null,
  tagId: null,
  selectionMode: "ALL_MATCHED",
  questionCount: null,
  difficultyLevel: null,
  manualQuestionIds: [],
});

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const isInteractionType = (type) => ["MATCHING", "DRAG_ORDER", "CLOZE"].includes(type);
const splitAcceptedAnswers = (value = "") =>
  value
    .split(/\r?\n|,/)
    .map((answer) => answer.trim())
    .filter(Boolean);

const createMatchingPairItems = () => {
  const id = createItemId();
  return [
    {
      id: `prompt-${id}`,
      content: "",
      itemKey: `prompt-${id}`,
      role: "PROMPT",
      correctMatchKey: `match-${id}`,
      orderIndex: 1,
    },
    {
      id: `match-${id}`,
      content: "",
      itemKey: `match-${id}`,
      role: "MATCH",
      orderIndex: 1,
    },
  ];
};

const createDefaultItemsForType = (type) => {
  if (type === "MATCHING") {
    const first = createMatchingPairItems();
    const second = createMatchingPairItems().map((item) => ({ ...item, orderIndex: 2 }));
    return [...first, ...second];
  }
  if (type === "DRAG_ORDER") {
    return [1, 2].map((index) => ({
      id: createItemId(),
      content: "",
      itemKey: `order-${index}-${createItemId()}`,
      role: "ORDER_ITEM",
      correctOrderIndex: index,
      orderIndex: index,
    }));
  }
  if (type === "CLOZE") {
    return [
      {
        id: createItemId(),
        content: "Blank 1",
        itemKey: `blank-${createItemId()}`,
        role: "BLANK",
        blankIndex: 1,
        acceptedAnswers: [],
        orderIndex: 1,
      },
    ];
  }
  return [];
};

const sortByOrder = (items = []) =>
  [...items].sort((left, right) => (left.orderIndex || 0) - (right.orderIndex || 0));

const buildItemsForPayload = (question) => {
  const items = question.items || [];
  if (question.type === "MATCHING") {
    const prompts = sortByOrder(items.filter((item) => item.role === "PROMPT"));
    const matchesByKey = new Map(
      items.filter((item) => item.role === "MATCH").map((item) => [item.itemKey, item])
    );
    return prompts.flatMap((prompt, index) => {
      const match = matchesByKey.get(prompt.correctMatchKey);
      return [
        {
          content: prompt.content || "",
          itemKey: prompt.itemKey,
          role: "PROMPT",
          correctMatchKey: prompt.correctMatchKey,
          orderIndex: index + 1,
        },
        {
          content: match?.content || "",
          itemKey: prompt.correctMatchKey,
          role: "MATCH",
          orderIndex: index + 1,
        },
      ];
    });
  }

  if (question.type === "DRAG_ORDER") {
    return sortByOrder(items.filter((item) => item.role === "ORDER_ITEM")).map((item, index) => ({
      content: item.content || "",
      itemKey: item.itemKey || `order-${index + 1}`,
      role: "ORDER_ITEM",
      correctOrderIndex: index + 1,
      orderIndex: index + 1,
    }));
  }

  if (question.type === "CLOZE") {
    return sortByOrder(items.filter((item) => item.role === "BLANK")).map((item, index) => ({
      content: item.content || `Blank ${index + 1}`,
      itemKey: item.itemKey || `blank-${index + 1}`,
      role: "BLANK",
      blankIndex: index + 1,
      acceptedAnswers: Array.isArray(item.acceptedAnswers)
        ? item.acceptedAnswers
        : splitAcceptedAnswers(item.acceptedAnswersText || ""),
      orderIndex: index + 1,
    }));
  }

  return [];
};

export default function QuizDetail({ isAdmin = false }) {
  const { classSectionId, quizId, chapterId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!quizId;
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [isViewMode, setIsViewMode] = useState(isEditMode);
  const [course, setCourse] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quizBuildMode, setQuizBuildMode] = useState(QUIZ_BUILD_MODE.MANUAL);
  const [questionBanks, setQuestionBanks] = useState([]);
  const [questionBanksLoading, setQuestionBanksLoading] = useState(false);
  const [bankSources, setBankSources] = useState([]);
  const [bankDetailsById, setBankDetailsById] = useState({});
  const [bankTagsById, setBankTagsById] = useState({});

  const location = useLocation();
  const isTemplateMode = location.state?.isTemplateMode || false;
  const chapterIdFromState = location.state?.chapterId || chapterId;
  const templateIdFromPath = useParams().templateId;

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    timeLimitMinutes: 30,
    minPassScore: null,
    maxAttempts: null,
    generateQuestionsPerAttempt: false,
    shuffleQuestions: false,
    shuffleAnswers: false,
    questions: [
      {
        id: 1,
        type: "SINGLE_CHOICE",
        content: "",
        points: 1,
        items: [],
        answers: [
          { id: 1, content: "", isCorrect: true },
          { id: 2, content: "", isCorrect: false },
          { id: 3, content: "", isCorrect: false },
        ],
      },
    ],
  });

  useEffect(() => {
      fetchCourse();
    }, [classSectionId]);
  
    const fetchCourse = async () => {
      try {
        setLoading(true);
        if (isTemplateMode && templateIdFromPath) {
          const response = await getTemplateById(templateIdFromPath);
          setCourse(response.data || response);
        } else if (classSectionId) {
          const response = await getCourseById(classSectionId);
          setCourse(response.data || response);
        }
      } catch (err) {
        setError("Không thể tải thông tin");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  const loadQuestionBanks = async () => {
    if (isTemplateMode) {
      return;
    }

    try {
      setQuestionBanksLoading(true);
      const response = await getQuestionBanks({ includeQuestions: false });
      setQuestionBanks(response?.data || response || []);
    } catch (err) {
      console.error(err);
      messageApi.error("Khong the tai danh sach question-bank");
    } finally {
      setQuestionBanksLoading(false);
    }
  };

  const ensureQuestionBankDetail = async (questionBankId) => {
    if (!questionBankId || bankDetailsById[questionBankId]) {
      return;
    }
    try {
      const response = await getQuestionBankById(questionBankId);
      const detail = response?.data || response;
      setBankDetailsById((prev) => ({ ...prev, [questionBankId]: detail }));
    } catch (err) {
      console.error(err);
      messageApi.error("Khong the tai chi tiet question-bank");
    }
  };

  const ensureBankTags = async (questionBankId) => {
    if (!questionBankId || bankTagsById[questionBankId]) return;
    try {
      const res = await getTags(questionBankId);
      const tags = res?.data || res || [];
      setBankTagsById((prev) => ({ ...prev, [questionBankId]: tags }));
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    loadQuestionBanks();
  }, [isTemplateMode]);

  useEffect(() => {
    if (isEditMode && quizId) {
      fetchQuizData();
    } else {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (isTemplateMode || bankSources.length === 0) {
      return;
    }

    const uniqueBankIds = [...new Set(bankSources.map((source) => source.questionBankId).filter(Boolean))];
    uniqueBankIds.forEach((questionBankId) => {
      ensureQuestionBankDetail(questionBankId);
      ensureBankTags(questionBankId);
    });
  }, [bankSources, isTemplateMode]);

  // Fix for: Warning: Instance created by `useForm` is not connected to any Form element.
  useEffect(() => {
    if (!loading && quizData && isEditMode) {
      form.setFieldsValue({
        title: quizData.title || "",
        description: quizData.description || "",
        timeLimitMinutes: quizData.timeLimitMinutes ? String(quizData.timeLimitMinutes) : "30",
        minPassScore: quizData.minPassScore || undefined,
        maxAttempts: quizData.maxAttempts || undefined,
        availableFrom: quizData.availableFrom ? dayjs(quizData.availableFrom) : null,
        availableUntil: quizData.availableUntil ? dayjs(quizData.availableUntil) : null,
        generateQuestionsPerAttempt: !!quizData.generateQuestionsPerAttempt,
        shuffleQuestions: !!quizData.shuffleQuestions,
        shuffleAnswers: !!quizData.shuffleAnswers,
      });
    }
  }, [loading, quizData, isEditMode, form]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      setError(null);

        if (isTemplateMode) {
        // Fetch QuizTemplate (settings only, no questions)
        const response = await getQuizTemplateById(quizId);
        const quiz = response.data || response;
        setQuizData(prev => ({
          ...prev,
          title: quiz.title || "",
          description: quiz.description || "",
          timeLimitMinutes: quiz.timeLimitMinutes || 30,
          minPassScore: quiz.minPassScore || null,
          maxAttempts: quiz.maxAttempts || null,
          availableFrom: quiz.availableFrom || null,
          availableUntil: quiz.availableTo || null,
        }));
        form.setFieldsValue({
          title: quiz.title || "",
          description: quiz.description || "",
          timeLimitMinutes: quiz.timeLimitMinutes ? String(quiz.timeLimitMinutes) : "30",
          minPassScore: quiz.minPassScore || undefined,
          maxAttempts: quiz.maxAttempts || undefined,
          availableFrom: quiz.availableFrom ? dayjs(quiz.availableFrom) : null,
          availableUntil: quiz.availableTo ? dayjs(quiz.availableTo) : null,
        });
        } else {
          const response = await getQuizById(quizId);
          const quiz = response.data || response;

        const transformedQuestions = (quiz.questions || []).map(q => ({
          id: q.id,
          type: q.type || "SINGLE_CHOICE",
          content: q.content || "",
          points: q.points || 1,
          items: (q.items || []).map((item) => ({
            ...item,
            id: item.id || createItemId(),
            acceptedAnswers: item.acceptedAnswers || [],
            acceptedAnswersText: (item.acceptedAnswers || []).join("\n"),
          })),
          answers: (q.answers || []).map(a => ({
            id: a.id,
            content: a.content || "",
            isCorrect: a.isCorrect || false,
          })),
        }));

        const transformedBankSources = (quiz.bankSources || []).map((source, index) => ({
          sourceId: source.id ? String(source.id) : `${source.questionBankId || "bank"}-${index}`,
          id: source.id || null,
          questionBankId: source.questionBankId || null,
          tagId: source.tagId || null,
          selectionMode: source.selectionMode || "ALL_MATCHED",
          questionCount: source.questionCount || null,
          difficultyLevel: source.difficultyLevel || null,
          manualQuestionIds: source.manualQuestionIds || [],
        }));

        if (transformedBankSources.length > 0) {
          setQuizBuildMode(QUIZ_BUILD_MODE.QUESTION_BANK);
          setBankSources(transformedBankSources);
        } else {
          setQuizBuildMode(QUIZ_BUILD_MODE.MANUAL);
          setBankSources([]);
        }

        setQuizData({
          title: quiz.title || "",
          description: quiz.description || "",
          timeLimitMinutes: quiz.timeLimitMinutes || 30,
          minPassScore: quiz.minPassScore || null,
          maxAttempts: quiz.maxAttempts || null,
          availableFrom: quiz.availableFrom || null,
          availableUntil: quiz.availableUntil || null,
          generateQuestionsPerAttempt: !!quiz.generateQuestionsPerAttempt,
          shuffleQuestions: !!quiz.shuffleQuestions,
          shuffleAnswers: !!quiz.shuffleAnswers,
          questions: transformedQuestions.length > 0 ? transformedQuestions : quizData.questions,
        });
      }
    } catch (err) {
      setError(err.message || "Lỗi khi tải dữ liệu bài kiểm tra");
      console.error("Error fetching quiz:", err);
      messageApi.error("Lỗi khi tải dữ liệu bài kiểm tra");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuizData({
      ...quizData,
      questions: [
        ...quizData.questions,
        {
          id: Date.now(),
          type: "SINGLE_CHOICE",
          content: "",
          points: 1,
          items: [],
          answers: [
            { id: 1, content: "", isCorrect: false },
            { id: 2, content: "", isCorrect: false },
          ],
        },
      ],
    });
  };

  const handleDeleteQuestion = (questionId) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.filter((q) => q.id !== questionId),
    });
  };

  const handleQuestionTypeChange = (questionId, type) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) => {
        if (q.id === questionId) {
          // If changing to SHORT_ANSWER, initialize with empty correct answer
          if (type === "SHORT_ANSWER" && ((q.answers || []).length === 0 || q.type !== "SHORT_ANSWER")) {
            return {
              ...q,
              type,
              items: [],
              answers: [{ id: Date.now(), content: "", isCorrect: true }]
            };
          }
          if (isInteractionType(type)) {
            return {
              ...q,
              type,
              answers: [],
              items: q.type === type && q.items?.length ? q.items : createDefaultItemsForType(type),
            };
          }
          if (isInteractionType(q.type)) {
            return {
              ...q,
              type,
              items: [],
              answers: [
                { id: Date.now(), content: "", isCorrect: true },
                { id: Date.now() + 1, content: "", isCorrect: false },
              ],
            };
          }
          return { ...q, type };
        }
        return q;
      }),
    });
  };

  const handleQuestionChange = (questionId, content) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) =>
        q.id === questionId ? { ...q, content } : q
      ),
    });
  };

  const handlePointsChange = (questionId, points) => {
    // allow empty string for input clearing
    const newPoints = points === "" ? "" : parseInt(points);
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) =>
        q.id === questionId ? { ...q, points: newPoints } : q
      ),
    });
  };

  const handleOptionChange = (questionId, optionId, content) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.map((o) =>
                o.id === optionId ? { ...o, content } : o
              ),
            }
          : q
      ),
    });
  };

  const handleCorrectOptionChange = (questionId, optionId) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) => {
        if (q.id !== questionId) return q;

        if (q.type === "SINGLE_CHOICE") {
          return {
            ...q,
            answers: q.answers.map((o) => ({
              ...o,
              isCorrect: o.id === optionId,
            })),
          };
        } else if (q.type === "MULTIPLE_CHOICE") {
          return {
            ...q,
            answers: q.answers.map((o) =>
              o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o
            ),
          };
        }
        return q;
      }),
    });
  };

  const handleAddOption = (questionId) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: [
                ...q.answers,
                { id: Date.now(), content: "", isCorrect: false },
              ],
            }
          : q
      ),
    });
  };

  const handleDeleteOption = (questionId, optionId) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              answers: q.answers.filter((o) => o.id !== optionId),
            }
          : q
      ),
    });
  };

  const updateQuestionItems = (questionId, updater) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.map((q) =>
        q.id === questionId ? { ...q, items: updater(q.items || []) } : q
      ),
    });
  };

  const handleMatchingItemChange = (questionId, itemKey, content) => {
    updateQuestionItems(questionId, (items) =>
      items.map((item) => (item.itemKey === itemKey ? { ...item, content } : item))
    );
  };

  const handleAddMatchingPair = (questionId) => {
    updateQuestionItems(questionId, (items) => {
      const nextOrder =
        Math.max(0, ...items.filter((item) => item.role === "PROMPT").map((item) => item.orderIndex || 0)) + 1;
      return [...items, ...createMatchingPairItems().map((item) => ({ ...item, orderIndex: nextOrder }))];
    });
  };

  const handleDeleteMatchingPair = (questionId, promptItem) => {
    updateQuestionItems(questionId, (items) =>
      items.filter((item) => item.itemKey !== promptItem.itemKey && item.itemKey !== promptItem.correctMatchKey)
    );
  };

  const handleDragItemChange = (questionId, itemId, content) => {
    updateQuestionItems(questionId, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, content } : item))
    );
  };

  const handleMoveDragItem = (questionId, itemId, direction) => {
    updateQuestionItems(questionId, (items) => {
      const orderItems = sortByOrder(items.filter((item) => item.role === "ORDER_ITEM"));
      const index = orderItems.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= orderItems.length) return items;
      const nextOrderItems = [...orderItems];
      [nextOrderItems[index], nextOrderItems[nextIndex]] = [nextOrderItems[nextIndex], nextOrderItems[index]];
      const reordered = nextOrderItems.map((item, orderIndex) => ({
        ...item,
        orderIndex: orderIndex + 1,
        correctOrderIndex: orderIndex + 1,
      }));
      return [...items.filter((item) => item.role !== "ORDER_ITEM"), ...reordered];
    });
  };

  const handleAddDragItem = (questionId) => {
    updateQuestionItems(questionId, (items) => {
      const nextOrder =
        Math.max(0, ...items.filter((item) => item.role === "ORDER_ITEM").map((item) => item.orderIndex || 0)) + 1;
      return [
        ...items,
        {
          id: createItemId(),
          content: "",
          itemKey: `order-${createItemId()}`,
          role: "ORDER_ITEM",
          correctOrderIndex: nextOrder,
          orderIndex: nextOrder,
        },
      ];
    });
  };

  const handleDeleteDragItem = (questionId, itemId) => {
    updateQuestionItems(questionId, (items) =>
      sortByOrder(items.filter((item) => item.id !== itemId)).map((item, index) => ({
        ...item,
        orderIndex: index + 1,
        correctOrderIndex: index + 1,
      }))
    );
  };

  const handleClozeBlankChange = (questionId, itemId, patch) => {
    updateQuestionItems(questionId, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  };

  const handleAddClozeBlank = (questionId) => {
    updateQuestionItems(questionId, (items) => {
      const nextIndex =
        Math.max(0, ...items.filter((item) => item.role === "BLANK").map((item) => item.blankIndex || 0)) + 1;
      return [
        ...items,
        {
          id: createItemId(),
          content: `Blank ${nextIndex}`,
          itemKey: `blank-${createItemId()}`,
          role: "BLANK",
          blankIndex: nextIndex,
          acceptedAnswers: [],
          acceptedAnswersText: "",
          orderIndex: nextIndex,
        },
      ];
    });
  };

  const handleDeleteClozeBlank = (questionId, itemId) => {
    updateQuestionItems(questionId, (items) =>
      sortByOrder(items.filter((item) => item.id !== itemId)).map((item, index) => ({
        ...item,
        blankIndex: index + 1,
        orderIndex: index + 1,
      }))
    );
  };

  const updateBankSource = (sourceId, patch) => {
    setBankSources((prev) =>
      prev.map((source) => (source.sourceId === sourceId ? { ...source, ...patch } : source))
    );
  };

  const handleBuildModeChange = (mode) => {
    setQuizBuildMode(mode);
    if (mode !== QUIZ_BUILD_MODE.QUESTION_BANK) {
      form.setFieldsValue({ generateQuestionsPerAttempt: false });
    }
    if (mode === QUIZ_BUILD_MODE.QUESTION_BANK && bankSources.length === 0) {
      setBankSources([createEmptyBankSource()]);
    }
  };

  const handleAddBankSource = () => {
    setBankSources((prev) => [...prev, createEmptyBankSource()]);
  };

  const handleRemoveBankSource = (sourceId) => {
    setBankSources((prev) => prev.filter((source) => source.sourceId !== sourceId));
  };

  const handleBankSourceQuestionBankChange = async (sourceId, questionBankId) => {
    updateBankSource(sourceId, {
      questionBankId,
      tagId: null,
      manualQuestionIds: [],
    });
    await Promise.all([
      ensureQuestionBankDetail(questionBankId),
      ensureBankTags(questionBankId),
    ]);
  };

  const getTagOptionsForSource = (source) => {
    const tags = bankTagsById[source.questionBankId] || [];
    return tags.map((t) => ({ value: t.id, label: t.name }));
  };

  const getQuestionOptionsForSource = (source) => {
    const bankDetail = bankDetailsById[source.questionBankId];
    if (!bankDetail?.questions) {
      return [];
    }

    let filteredQuestions = bankDetail.questions;
    if (source.tagId) {
      filteredQuestions = filteredQuestions.filter((question) =>
        (question.tags || []).some((tag) => tag?.id === source.tagId)
      );
    }
    if (source.difficultyLevel) {
      filteredQuestions = filteredQuestions.filter((question) => question.difficultyLevel === source.difficultyLevel);
    }

    return filteredQuestions.map((question) => ({
      value: question.id,
      label: `#${question.id} ${stripHtml(question.content || "").slice(0, 90) || "Cau hoi khong noi dung"}`,
    }));
  };

  const handleFormSubmit = async (values) => {
    try {
      setSubmitting(true);
      let processedBankSources = null;
      
      // Validate form fields
      if (!values.title || values.title.trim() === "") {
        messageApi.error("Vui lòng nhập tiêu đề bài kiểm tra");
        setSubmitting(false);
        return;
      }

      if (!values.timeLimitMinutes || values.timeLimitMinutes === "") {
        messageApi.error("Vui lòng nhập thời gian làm bài");
        setSubmitting(false);
        return;
      }

      if (!isTemplateMode && quizBuildMode === QUIZ_BUILD_MODE.QUESTION_BANK) {
        if (!bankSources.length) {
          messageApi.error("Vui long them it nhat 1 nguon question-bank");
          setSubmitting(false);
          return;
        }

        for (let i = 0; i < bankSources.length; i++) {
          const source = bankSources[i];
          if (!source.questionBankId) {
            messageApi.error(`Nguon #${i + 1}: vui long chon question-bank`);
            setSubmitting(false);
            return;
          }
          if (source.selectionMode === "RANDOM" && (!source.questionCount || Number(source.questionCount) <= 0)) {
            messageApi.error(`Nguon #${i + 1}: vui long nhap so luong cau hoi > 0`);
            setSubmitting(false);
            return;
          }
          if (source.selectionMode === "MANUAL" && (!source.manualQuestionIds || source.manualQuestionIds.length === 0)) {
            messageApi.error(`Nguon #${i + 1}: vui long chon it nhat 1 cau hoi thu cong`);
            setSubmitting(false);
            return;
          }
        }

        processedBankSources = bankSources.map((source) => ({
          id: source.id || null,
          questionBankId: source.questionBankId,
          tagId: source.tagId || null,
          selectionMode: source.selectionMode,
          questionCount: source.selectionMode === "RANDOM" ? Number(source.questionCount) : null,
          difficultyLevel: source.difficultyLevel || null,
          manualQuestionIds: source.selectionMode === "MANUAL" ? (source.manualQuestionIds || []) : [],
        }));
      }

      // Skip question validation in template mode (QuizTemplate has no questions)
      if (!isTemplateMode && quizBuildMode !== QUIZ_BUILD_MODE.QUESTION_BANK) {

      // Validate questions
      if (!quizData.questions || quizData.questions.length === 0) {
        messageApi.error("Vui lòng thêm ít nhất 1 câu hỏi");
        setSubmitting(false);
        return;
      }

      // Validate each question
      for (let q of quizData.questions) {
        if (!q.content || q.content.trim() === "") {
          messageApi.error(`Câu hỏi ${quizData.questions.indexOf(q) + 1} không có nội dung`);
          setSubmitting(false);
          return;
        }
        
        if (isInteractionType(q.type)) {
          const items = buildItemsForPayload(q);
          if (q.type === "MATCHING" && items.some((item) => !item.content.trim())) {
            messageApi.error(`Câu hỏi ghép cặp ${quizData.questions.indexOf(q) + 1} chưa nhập đủ cặp`);
            setSubmitting(false);
            return;
          }
          if (q.type === "DRAG_ORDER" && (items.length < 2 || items.some((item) => !item.content.trim()))) {
            messageApi.error(`Câu hỏi sắp xếp ${quizData.questions.indexOf(q) + 1} cần ít nhất 2 mục`);
            setSubmitting(false);
            return;
          }
          if (q.type === "CLOZE" && items.some((item) => !item.acceptedAnswers || item.acceptedAnswers.length === 0)) {
            messageApi.error(`Câu hỏi điền chỗ trống ${quizData.questions.indexOf(q) + 1} chưa có đáp án`);
            setSubmitting(false);
            return;
          }
        } else if (q.type === "SHORT_ANSWER") {
          // Validate short answer
          if (!q.answers || q.answers.length === 0) {
            messageApi.error(`Câu hỏi trả lời ngắn ${quizData.questions.indexOf(q) + 1} không có đáp án đúng`);
            setSubmitting(false);
            return;
          }
          // Validate answer content
          for (let a of q.answers) {
            if (!a.content || a.content.trim() === "") {
              messageApi.error(`Câu hỏi trả lời ngắn ${quizData.questions.indexOf(q) + 1} có đáp án không có nội dung`);
              setSubmitting(false);
              return;
            }
          }
        } else {
          // Validate multiple choice/single choice
          if (!q.answers || q.answers.length === 0) {
            messageApi.error(`Câu hỏi ${quizData.questions.indexOf(q) + 1} không có đáp án`);
            setSubmitting(false);
            return;
          }
          // Validate at least one correct answer
          const hasCorrect = q.answers.some(a => a.isCorrect);
          if (!hasCorrect) {
            messageApi.error(`Câu hỏi ${quizData.questions.indexOf(q) + 1} phải có ít nhất 1 đáp án đúng`);
            setSubmitting(false);
            return;
          }
          // Validate answer content
          for (let a of q.answers) {
            if (!a.content || a.content.trim() === "") {
              messageApi.error(`Câu hỏi ${quizData.questions.indexOf(q) + 1} có đáp án không có nội dung`);
              setSubmitting(false);
              return;
            }
          }
        }
      }
      } // end if (!isTemplateMode)

      // Process questions to ensure IDs are handled correctly for backend
      // Real IDs are small integers. Temp IDs are Date.now() (very large).
      // We set ID to null for temp IDs so backend treats them as new.
      const processedQuestions = quizBuildMode === QUIZ_BUILD_MODE.QUESTION_BANK || isTemplateMode
        ? null
        : quizData.questions.map(q => {
        const isTempId = q.id > 2000000000; // a simple heuristic, or check if it was present in initial load
        return {
          ...q,
          id: isTempId ? null : q.id,
          // Ensure points is sent (default 1)
          points: q.points || 1,
          items: isInteractionType(q.type) ? buildItemsForPayload(q) : [],
          answers: isInteractionType(q.type) ? [] : (q.answers || []).map(a => {
            const isTempAnswerId = a.id > 2000000000;
            return {
              ...a,
              id: isTempAnswerId ? null : a.id
            };
          })
        };
      });

      const formData = {
        ...values,
        generateQuestionsPerAttempt: quizBuildMode === QUIZ_BUILD_MODE.QUESTION_BANK && !!values.generateQuestionsPerAttempt,
        shuffleQuestions: !!values.shuffleQuestions,
        shuffleAnswers: !!values.shuffleAnswers,
        timeLimitMinutes: parseInt(values.timeLimitMinutes) || 30,
        minPassScore: values.minPassScore ? parseInt(values.minPassScore) : 0,
        maxAttempts: values.maxAttempts ? parseInt(values.maxAttempts) : null,
        availableFrom: values.availableFrom ? values.availableFrom.toISOString() : null,
        availableUntil: values.availableUntil ? values.availableUntil.toISOString() : null,
        questions: processedQuestions,
        bankSources: processedBankSources,
      };

      // Template-specific payload (no questions)
      const templatePayload = {
        title: values.title,
        description: values.description || null,
        timeLimitMinutes: parseInt(values.timeLimitMinutes) || 30,
        minPassScore: values.minPassScore ? parseInt(values.minPassScore) : null,
        maxAttempts: values.maxAttempts ? parseInt(values.maxAttempts) : null,
        availableFrom: values.availableFrom ? values.availableFrom.toISOString() : null,
        availableTo: values.availableUntil ? values.availableUntil.toISOString() : null,
      };

      let savedQuiz;
      if (isTemplateMode && templateIdFromPath) {
        if (isEditMode) {
          // ── Template edit: update existing QuizTemplate ──
          const response = await updateQuizTemplate(quizId, templatePayload);
          savedQuiz = response.data || response;
          messageApi.success("Cập nhật bài kiểm tra mẫu thành công");
        } else {
          // ── Template create: create QuizTemplate → link to template chapter ──
          const response = await createQuizTemplate(templatePayload);
          savedQuiz = response.data || response;

          await createContentItemTemplate(templateIdFromPath, chapterIdFromState, {
            itemType: "QUIZ",
            quizTemplateId: savedQuiz.id,
          });

          messageApi.success("Tạo và gắn bài kiểm tra vào chương trình thành công");
        }
      } else if (isEditMode) {
        // Update existing quiz in class section
        const response = await updateQuiz(quizId, formData);
        savedQuiz = response.data || response;
        messageApi.success("Cập nhật bài kiểm tra thành công");
      } else {
        // ── Class section flow: create quiz → link to class chapter ──
        const response = await createQuiz(formData);
        savedQuiz = response.data || response;

        const chapterIdForSection = chapterId || chapterIdFromState;
        if (classSectionId && chapterIdForSection) {
          await createClassContentItem(classSectionId, chapterIdForSection, {
            itemType: "QUIZ",
            quizId: savedQuiz.id,
            title: formData.title,
          });
        }
        messageApi.success("Tạo bài kiểm tra thành công");
      }
      
      // Navigate back after success
      setTimeout(() => {
        const base = isAdmin ? "/admin" : "/teacher";
        if (isTemplateMode && templateIdFromPath) {
          navigate(`${base}/curriculums/${templateIdFromPath}`);
        } else if (classSectionId) {
          navigate(`${base}/class-sections/${classSectionId}`);
        } else {
          navigate(`${base}/curriculums`);
        }
      }, 1000);

    } catch (err) {
      console.error(err);
      messageApi.error(err.message || "Có lỗi xảy ra");
      setSubmitting(false);
    }
  };

  const renderInteractionEditor = (question) => {
    const items = question.items || [];

    if (question.type === "MATCHING") {
      const prompts = sortByOrder(items.filter((item) => item.role === "PROMPT"));
      const matchesByKey = new Map(
        items.filter((item) => item.role === "MATCH").map((item) => [item.itemKey, item])
      );

      return (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#617589] dark:text-gray-400 mb-3">
            Các cặp ghép
          </label>
          <div className="flex flex-col gap-3">
            {prompts.map((prompt, index) => {
              const match = matchesByKey.get(prompt.correctMatchKey);
              return (
                <div key={prompt.itemKey} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                  <Input
                    placeholder={`Vế trái ${index + 1}`}
                    value={prompt.content || ""}
                    onChange={(e) => handleMatchingItemChange(question.id, prompt.itemKey, e.target.value)}
                    disabled={isViewMode}
                  />
                  <Input
                    placeholder={`Vế phải ${index + 1}`}
                    value={match?.content || ""}
                    onChange={(e) => handleMatchingItemChange(question.id, prompt.correctMatchKey, e.target.value)}
                    disabled={isViewMode}
                  />
                  <Button
                    type="text"
                    danger
                    onClick={() => handleDeleteMatchingPair(question.id, prompt)}
                    icon={<XMarkIcon className="h-5 w-5" />}
                    disabled={isViewMode || prompts.length <= 1}
                  />
                </div>
              );
            })}
            <button
              onClick={() => handleAddMatchingPair(question.id)}
              className="flex items-center gap-2 text-primary hover:text-blue-600 text-sm font-bold py-2 w-fit"
              disabled={isViewMode}
            >
              <PlusCircleIcon className="h-5 w-5" />
              Thêm cặp ghép
            </button>
          </div>
        </div>
      );
    }

    if (question.type === "DRAG_ORDER") {
      const orderItems = sortByOrder(items.filter((item) => item.role === "ORDER_ITEM"));
      return (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#617589] dark:text-gray-400 mb-3">
            Thứ tự đúng
          </label>
          <div className="flex flex-col gap-3">
            {orderItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="w-8 text-center text-sm font-semibold text-[#617589] dark:text-gray-400">
                  {index + 1}
                </span>
                <Input
                  placeholder={`Mục ${index + 1}`}
                  value={item.content || ""}
                  onChange={(e) => handleDragItemChange(question.id, item.id, e.target.value)}
                  disabled={isViewMode}
                />
                <Button onClick={() => handleMoveDragItem(question.id, item.id, -1)} disabled={isViewMode || index === 0}>
                  ↑
                </Button>
                <Button onClick={() => handleMoveDragItem(question.id, item.id, 1)} disabled={isViewMode || index === orderItems.length - 1}>
                  ↓
                </Button>
                <Button
                  type="text"
                  danger
                  onClick={() => handleDeleteDragItem(question.id, item.id)}
                  icon={<XMarkIcon className="h-5 w-5" />}
                  disabled={isViewMode || orderItems.length <= 2}
                />
              </div>
            ))}
            <button
              onClick={() => handleAddDragItem(question.id)}
              className="flex items-center gap-2 text-primary hover:text-blue-600 text-sm font-bold py-2 w-fit"
              disabled={isViewMode}
            >
              <PlusCircleIcon className="h-5 w-5" />
              Thêm mục
            </button>
          </div>
        </div>
      );
    }

    if (question.type === "CLOZE") {
      const blanks = sortByOrder(items.filter((item) => item.role === "BLANK"));
      return (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#617589] dark:text-gray-400 mb-3">
            Chỗ trống
          </label>
          <div className="flex flex-col gap-3">
            {blanks.map((blank, index) => (
              <div key={blank.id} className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto] gap-3">
                <Input
                  placeholder={`Blank ${index + 1}`}
                  value={blank.content || ""}
                  onChange={(e) => handleClozeBlankChange(question.id, blank.id, { content: e.target.value })}
                  disabled={isViewMode}
                />
                <Input.TextArea
                  rows={2}
                  placeholder="Đáp án chấp nhận, mỗi dòng một đáp án"
                  value={blank.acceptedAnswersText ?? (blank.acceptedAnswers || []).join("\n")}
                  onChange={(e) =>
                    handleClozeBlankChange(question.id, blank.id, {
                      acceptedAnswersText: e.target.value,
                      acceptedAnswers: splitAcceptedAnswers(e.target.value),
                    })
                  }
                  disabled={isViewMode}
                />
                <Button
                  type="text"
                  danger
                  onClick={() => handleDeleteClozeBlank(question.id, blank.id)}
                  icon={<XMarkIcon className="h-5 w-5" />}
                  disabled={isViewMode || blanks.length <= 1}
                />
              </div>
            ))}
            <button
              onClick={() => handleAddClozeBlank(question.id)}
              className="flex items-center gap-2 text-primary hover:text-blue-600 text-sm font-bold py-2 w-fit"
              disabled={isViewMode}
            >
              <PlusCircleIcon className="h-5 w-5" />
              Thêm chỗ trống
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />
      <div className="flex">
        <TeacherSidebar />
        <main className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 flex flex-col h-screen transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="flex-1 overflow-y-auto p-6 md:px-12 md:py-8">
            <button
              onClick={() => {
                const base = isAdmin ? "/admin" : "/teacher";
                if (isTemplateMode && templateIdFromPath) {
                  navigate(`${base}/curriculums/${templateIdFromPath}`);
                } else {
                  navigate(`${base}/class-sections/${classSectionId}`);
                }
              }}
              className="flex items-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">
                Quay lại {isTemplateMode ? `khung chương trình: ${course?.name}` : `khóa học: ${course?.title}`}
              </span>
            </button>
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Spin size="large" description="Đang tải dữ liệu..." />
              </div>
            ) : error ? (
              <Alert
                title="Lỗi"
                description={error}
                type="error"
                showIcon
                className="mb-4"
              />
            ) : (
            <div className="mx-auto flex flex-col gap-4">
              {/* Page Heading */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-black text-[#111418] dark:text-white tracking-tight">
                    {isViewMode ? "Xem Quiz" : (isEditMode ? "Chỉnh sửa Quiz" : "Tạo Quiz mới")}
                  </h1>
                  <p className="text-[#617589] dark:text-gray-400 mt-1">
                    Thiết lập bài kiểm tra trắc nghiệm cho khóa học này.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isEditMode && isViewMode && (
                    <Button
                      type="primary"
                      onClick={() => setIsViewMode(false)}
                      className="px-6 py-2.5 h-10 rounded-lg font-bold flex items-center gap-2"
                      icon={<PencilIcon className="h-4 w-4" />}
                    >
                      Chỉnh sửa
                    </Button>
                  )}
                  {isEditMode && isViewMode && !isTemplateMode && classSectionId && quizId && (
                    <Button
                      onClick={() => navigate(`/teacher/class-sections/${classSectionId}/quizzes/${quizId}/preview`)}
                      className="px-6 py-2.5 h-10 rounded-lg font-bold flex items-center gap-2 border-amber-400 text-amber-600 hover:border-amber-500 hover:text-amber-700"
                      icon={<EyeIcon className="h-4 w-4" />}
                    >
                      Xem như học viên
                    </Button>
                  )}
                </div>
              </div>

              {/* General Settings Card */}
              <Form
                layout="vertical"
                form={form}
                onFinish={handleFormSubmit}
                className={isViewMode ? "view-mode-inputs" : ""}
                initialValues={{
                  title: "",
                  description: "",
                  timeLimitMinutes: "30",
                  minPassScore: undefined,
                  maxAttempts: undefined,
                  generateQuestionsPerAttempt: false,
                  shuffleQuestions: false,
                  shuffleAnswers: false,
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  {/* Quiz Title */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Tiêu đề bài kiểm tra
                      </span>
                    }
                    name="title"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập tiêu đề bài kiểm tra",
                      },
                      {
                        min: 3,
                        message: "Tiêu đề bài kiểm tra phải có ít nhất 3 ký tự",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Nhập tiêu đề bài kiểm tra..."
                      className="h-12"
                      disabled={isViewMode}
                    />
                  </Form.Item>
                  {/* Duration */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Thời gian làm bài (phút)
                      </span>
                    }
                    name="timeLimitMinutes"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập thời gian làm bài",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Nhập số phút (0 = không giới hạn)..."
                      type="number"
                      className="h-12"
                      min={0}
                      disabled={isViewMode}
                    />
                  </Form.Item>
                  {/* Min Pass Score */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Điểm đạt (Tùy chọn)
                      </span>
                    }
                    name="minPassScore"
                  >
                    <Input
                      placeholder="Nhập điểm tối thiểu để đạt..."
                      type="number"
                      className="h-12"
                      min={0}
                      max={100}
                      disabled={isViewMode}
                    />
                  </Form.Item>
                  {/* Max Attempts */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Số lần làm bài (Tùy chọn)
                      </span>
                    }
                    name="maxAttempts"
                  >
                    <Input
                      placeholder="Số lần tối đa (0 = không giới hạn)..."
                      type="number"
                      className="h-12"
                      min={0}
                      disabled={isViewMode}
                    />
                  </Form.Item>
                  {/* Available From */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Ngày mở (Tùy chọn)
                      </span>
                    }
                    name="availableFrom"
                  >
                    <DatePicker showTime className="h-12 w-full" placeholder="Chọn ngày giờ mở" disabled={isViewMode} />
                  </Form.Item>
                  {/* Available Until */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Ngày đóng (Tùy chọn)
                      </span>
                    }
                    name="availableUntil"
                  >
                    <DatePicker showTime className="h-12 w-full" placeholder="Chọn ngày giờ đóng" disabled={isViewMode} />
                  </Form.Item>

                  {!isTemplateMode && (
                    <>
                      <Form.Item
                        label={
                          <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                            Sinh đề riêng cho mỗi lần làm
                          </span>
                        }
                        name="generateQuestionsPerAttempt"
                        valuePropName="checked"
                      >
                        <Switch
                          disabled={isViewMode || quizBuildMode !== QUIZ_BUILD_MODE.QUESTION_BANK}
                        />
                      </Form.Item>

                      <Form.Item
                        label={
                          <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                            Đảo thứ tự câu hỏi
                          </span>
                        }
                        name="shuffleQuestions"
                        valuePropName="checked"
                      >
                        <Switch disabled={isViewMode} />
                      </Form.Item>

                      <Form.Item
                        label={
                          <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                            Đảo thứ tự đáp án
                          </span>
                        }
                        name="shuffleAnswers"
                        valuePropName="checked"
                      >
                        <Switch disabled={isViewMode} />
                      </Form.Item>
                    </>
                  )}
                  {/* Description */}
                  <Form.Item
                    label={
                      <span className="text-[#111418] dark:text-gray-200 text-base font-medium">
                        Mô tả (Tùy chọn)
                      </span>
                    }
                    name="description"
                    className="md:col-span-2"
                  >
                    <Input.TextArea
                      placeholder="Thêm hướng dẫn hoặc ngữ cảnh cho học viên..."
                      rows={4}
                      className="rounded-lg text-sm"
                      disabled={isViewMode}
                    />
                  </Form.Item>

                </div>
              </Form>

              {/* Questions section — hidden in template mode (QuizTemplate has no questions) */}
              {!isTemplateMode && (
                <>
              <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
                <label className="block text-sm font-semibold text-[#111418] dark:text-gray-100 mb-2">
                  Cach tao bo cau hoi
                </label>
                <Select
                  value={quizBuildMode}
                  onChange={handleBuildModeChange}
                  className="w-full md:w-80"
                  disabled={isViewMode}
                  options={[
                    { value: QUIZ_BUILD_MODE.MANUAL, label: "Nhap cau hoi thu cong" },
                    { value: QUIZ_BUILD_MODE.QUESTION_BANK, label: "Lay cau hoi tu question-bank" },
                  ]}
                />
              </div>

              {quizBuildMode === QUIZ_BUILD_MODE.MANUAL ? (
                <>
              <div className="flex items-center justify-between mt-4">
                <h3 className="text-xl font-bold text-[#111418] dark:text-white">
                  Danh sách câu hỏi
                </h3>
                <span className="text-sm text-[#617589] dark:text-gray-400">
                  {quizData.questions.length} câu hỏi đã thêm
                </span>
              </div>

              {/* Questions List */}
              <div className={isViewMode ? "view-mode-inputs" : ""}>
              {quizData.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white mb-2 dark:bg-card-dark rounded-xl border border-primary dark:border-primary shadow-lg ring-1 ring-primary/20 dark:ring-primary/20 transition-all"
                >
                  <div className="p-4 md:p-6 flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold">
                          {index + 1}
                        </span>
                        <Select
                          value={question.type}
                          onChange={(value) =>
                            handleQuestionTypeChange(question.id, value)
                          }
                          variant="borderless"
                          className="min-w-[200px] font-semibold text-[#617589] dark:text-gray-400"
                          options={[
                            {
                              value: "SINGLE_CHOICE",
                              label: "Trắc nghiệm (1 đáp án)",
                            },
                            {
                              value: "MULTIPLE_CHOICE",
                              label: "Trắc nghiệm (Nhiều đáp án)",
                            },
                            { value: "SHORT_ANSWER", label: "Trả lời ngắn" },
                            { value: "MATCHING", label: "Ghép cặp" },
                            { value: "DRAG_ORDER", label: "Sắp xếp" },
                            { value: "CLOZE", label: "Điền chỗ trống" },
                          ]}
                        />
                        {/* Points Input */}
                        <div className="flex items-center gap-2 ml-4">
                           <span className="text-sm font-medium text-[#617589] dark:text-gray-400">Điểm:</span>
                           <Input
                             type="number"
                             min={1}
                             defaultValue={1}
                             value={question.points}
                             onChange={(e) => handlePointsChange(question.id, e.target.value)}
                             className="w-20"
                             disabled={isViewMode}
                           />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="p-2 text-[#617589] dark:text-gray-400 hover:text-red-500 transition-colors"
                          title="Xóa câu hỏi"
                          disabled={isViewMode}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    {/* Question Content */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#617589] dark:text-gray-400 mb-2">
                        Nội dung câu hỏi
                      </label>
                      <Input.TextArea
                        placeholder="Nhập nội dung câu hỏi..."
                        rows={3}
                        value={question.content}
                        onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded"
                        disabled={isViewMode}
                      />
                    </div>
                    {/* Answer Options */}
                    <div className="flex flex-col gap-3 mt-2">
                      {isInteractionType(question.type) ? (
                        renderInteractionEditor(question)
                      ) : question.type === "SHORT_ANSWER" ? (
                        // Short answer input
                        <div className="flex flex-col gap-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#617589] dark:text-gray-400">
                            Đáp án đúng
                          </label>
                          <Input.TextArea
                            placeholder="Nhập đáp án đúng..."
                            rows={4}
                            value={question.answers[0]?.content || ""}
                            onChange={(e) => {
                              const existingAnswers = question.answers || [];
                              if (existingAnswers.length > 0) {
                                handleOptionChange(question.id, existingAnswers[0].id, e.target.value);
                              } else {
                                // Create first answer if not exists
                                setQuizData({
                                  ...quizData,
                                  questions: quizData.questions.map((q) =>
                                    q.id === question.id
                                      ? {
                                          ...q,
                                          answers: [{ id: Date.now(), content: e.target.value, isCorrect: true }]
                                        }
                                      : q
                                  ),
                                });
                              }
                            }}
                            className="rounded border border-gray-300 dark:border-gray-600"
                            disabled={isViewMode}
                          />
                          {question.answers.length > 0 && question.answers[0].content && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircleIcon className="h-4 w-4" /> Đã nhập đáp án
                            </span>
                          )}
                        </div>
                      ) : (
                        // Multiple choice/single choice options
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#617589] dark:text-gray-400 mb-3">
                            Các lựa chọn
                          </label>
                          <div className="flex flex-col gap-3">
                            {question.answers.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center gap-3 group"
                              >
                                <div className="shrink-0 flex items-center justify-center">
                                  {question.type === "SINGLE_CHOICE" ? (
                                    <Radio
                                      name={`q${question.id}_correct`}
                                      checked={option.isCorrect}
                                      onChange={() =>
                                        handleCorrectOptionChange(
                                          question.id,
                                          option.id
                                        )
                                      }
                                      title="Đánh dấu là đáp án đúng"
                                    />
                                  ) : (
                                    <Checkbox
                                      checked={option.isCorrect}
                                      onChange={() =>
                                        handleCorrectOptionChange(
                                          question.id,
                                          option.id
                                        )
                                      }
                                      title="Đánh dấu là đáp án đúng"
                                    />
                                  )}
                                </div>
                                <div className="flex-1 relative">
                                  <Input
                                    placeholder="Lựa chọn"
                                    value={option.content}
                                    onChange={(e) =>
                                      handleOptionChange(
                                        question.id,
                                        option.id,
                                        e.target.value
                                      )
                                    }
                                    className={`rounded ${
                                      option.isCorrect
                                        ? "!border-green-500/50 !bg-green-50 dark:!bg-green-900/10"
                                        : ""
                                    }`}
                                    status={option.isCorrect ? "success" : ""}
                                    disabled={isViewMode}
                                  />
                                  {option.isCorrect && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 text-xs font-bold flex items-center gap-1">
                                      <CheckCircleIcon className="h-4 w-4" /> Đúng
                                    </span>
                                  )}
                                </div>
                                <Button
                                  type="text"
                                  danger
                                  onClick={() =>
                                    handleDeleteOption(question.id, option.id)
                                  }
                                  className="opacity-0 group-hover:opacity-100 p-1 text-[#617589] hover:text-red-500 transition-all"
                                  icon={<XMarkIcon className="h-5 w-5" />}
                                  disabled={isViewMode}
                                />
                              </div>
                            ))}
                            {/* Add Option Button */}
                            <button
                              onClick={() => handleAddOption(question.id)}
                              className="flex items-center gap-2 text-primary hover:text-blue-600 text-sm font-bold py-2 w-fit"
                              disabled={isViewMode}
                            >
                              <PlusCircleIcon className="h-5 w-5" />
                              Thêm lựa chọn khác
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* Add Question Button */}
              {!isViewMode && (<button
                onClick={handleAddQuestion}
                className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-[#617589] dark:text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group"
                disabled={isViewMode}
              >
                <PlusCircleIcon className="h-8 w-8 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Thêm câu hỏi mới</span>
              </button>)}
              </>
              ) : (
                <>
                  <div className="flex items-center justify-between mt-4">
                    <h3 className="text-xl font-bold text-[#111418] dark:text-white">
                      Nguon cau hoi tu question-bank
                    </h3>
                    <span className="text-sm text-[#617589] dark:text-gray-400">
                      {bankSources.length} nguon
                    </span>
                  </div>

                  {questionBanksLoading ? (
                    <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                      <Spin size="small" />
                      <span className="text-sm text-[#617589] dark:text-gray-400">Dang tai danh sach question-bank...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bankSources.map((source, index) => {
                        const tagOptions = getTagOptionsForSource(source);
                        const questionOptions = getQuestionOptionsForSource(source);
                        return (
                          <div
                            key={source.sourceId}
                            className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-semibold text-[#111418] dark:text-gray-100">
                                Nguon #{index + 1}
                              </h4>
                              {!isViewMode && (
                                <Button danger type="text" onClick={() => handleRemoveBankSource(source.sourceId)}>
                                  Xoa nguon
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-[#617589] dark:text-gray-400 mb-1">Question-bank</label>
                                <Select
                                  value={source.questionBankId}
                                  onChange={(value) => handleBankSourceQuestionBankChange(source.sourceId, value)}
                                  options={questionBanks.map((bank) => ({
                                    value: bank.id,
                                    label: bank.name || `Question bank #${bank.id}`,
                                  }))}
                                  placeholder="Chon question-bank"
                                  className="w-full"
                                  disabled={isViewMode}
                                  showSearch
                                  optionFilterProp="label"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-[#617589] dark:text-gray-400 mb-1">Cach lay cau hoi</label>
                                <Select
                                  value={source.selectionMode}
                                  onChange={(value) =>
                                    updateBankSource(source.sourceId, {
                                      selectionMode: value,
                                      questionCount: null,
                                      manualQuestionIds: [],
                                    })
                                  }
                                  options={SOURCE_SELECTION_OPTIONS}
                                  className="w-full"
                                  disabled={isViewMode}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-[#617589] dark:text-gray-400 mb-1">Loc theo tag (tuy chon)</label>
                                <Select
                                  value={source.tagId}
                                  onChange={(value) => updateBankSource(source.sourceId, { tagId: value || null, manualQuestionIds: [] })}
                                  options={tagOptions}
                                  placeholder="Tat ca tag"
                                  allowClear
                                  className="w-full"
                                  disabled={isViewMode || !source.questionBankId}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-[#617589] dark:text-gray-400 mb-1">Do kho (tuy chon)</label>
                                <Select
                                  value={source.difficultyLevel}
                                  onChange={(value) =>
                                    updateBankSource(source.sourceId, {
                                      difficultyLevel: value || null,
                                      manualQuestionIds: [],
                                    })
                                  }
                                  options={DIFFICULTY_OPTIONS}
                                  placeholder="Tat ca muc do"
                                  allowClear
                                  className="w-full"
                                  disabled={isViewMode}
                                />
                              </div>

                              {source.selectionMode === "RANDOM" && (
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-[#617589] dark:text-gray-400 mb-1">So cau hoi lay ngau nhien</label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={source.questionCount || ""}
                                    onChange={(event) =>
                                      updateBankSource(source.sourceId, {
                                        questionCount: event.target.value ? Number(event.target.value) : null,
                                      })
                                    }
                                    disabled={isViewMode}
                                  />
                                </div>
                              )}

                              {source.selectionMode === "MANUAL" && (
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-[#617589] dark:text-gray-400 mb-1">
                                    Chon cau hoi thu cong ({questionOptions.length} cau phu hop)
                                  </label>
                                  <Select
                                    mode="multiple"
                                    value={source.manualQuestionIds || []}
                                    onChange={(value) => updateBankSource(source.sourceId, { manualQuestionIds: value })}
                                    options={questionOptions}
                                    placeholder="Chon cac cau hoi tu question-bank"
                                    className="w-full"
                                    disabled={isViewMode || !source.questionBankId}
                                    showSearch
                                    optionFilterProp="label"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {bankSources.length === 0 && (
                        <div className="bg-white dark:bg-card-dark rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-5 text-sm text-[#617589] dark:text-gray-400">
                          Chua co nguon question-bank nao. Hay them nguon de he thong tao de tu dong.
                        </div>
                      )}
                    </div>
                  )}

                  {!isViewMode && (
                    <Button
                      type="dashed"
                      className="w-full h-11 mt-2"
                      icon={<PlusCircleIcon className="h-5 w-5" />}
                      onClick={handleAddBankSource}
                    >
                      Them nguon question-bank
                    </Button>
                  )}
                </>
              )}
              </>
              )}
            </div>
            )}
          </div>
              {/* </div> */}

          {/* Sticky Bottom Actions */}
          {!loading && !isViewMode && (
          <div className="w-full bg-white dark:bg-card-dark border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between md:justify-end gap-4 shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button
              onClick={() => isEditMode ? setIsViewMode(true) : navigate(-1)}
              className="px-6 py-2.5 rounded-lg w-full md:w-auto"
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              onClick={() => form.submit()}
              className="px-8 py-2.5 h-10 rounded-lg w-full md:w-auto flex items-center justify-center gap-2"
              icon={submitting ? <Spin size="small" /> : <CheckIcon className="h-5 w-5" />}
              disabled={submitting}
              loading={submitting}
            >
              {submitting ? "Đang lưu..." : (isEditMode ? "Cập nhật Quiz" : "Lưu & Xuất bản")}
            </Button>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
