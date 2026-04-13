import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Select, DatePicker, Form, Input, Button, Checkbox, Radio, Spin, Alert, App, Modal } from "antd";
import dayjs from "dayjs";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import { createQuiz, getQuizById, updateQuiz } from "../../api/quiz";
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
} from "@heroicons/react/24/outline";
import { getCourseById } from "../../api/classSection";

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
    questions: [
      {
        id: 1,
        type: "SINGLE_CHOICE",
        content: "",
        points: 1,
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

  useEffect(() => {
    if (isEditMode && quizId) {
      fetchQuizData();
    } else {
      setLoading(false);
    }
  }, [quizId]);

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
          answers: (q.answers || []).map(a => ({
            id: a.id,
            content: a.content || "",
            isCorrect: a.isCorrect || false,
          })),
        }));

        setQuizData({
          title: quiz.title || "",
          description: quiz.description || "",
          timeLimitMinutes: quiz.timeLimitMinutes || 30,
          minPassScore: quiz.minPassScore || null,
          maxAttempts: quiz.maxAttempts || null,
          availableFrom: quiz.availableFrom || null,
          availableUntil: quiz.availableUntil || null,
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
          // If changing to ESSAY, initialize with empty model answer
          if (type === "ESSAY" && (q.answers.length === 0 || q.type !== "ESSAY")) {
            return {
              ...q,
              type,
              answers: [{ id: Date.now(), content: "", isCorrect: true }]
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

  const handleFormSubmit = async (values) => {
    try {
      setSubmitting(true);
      
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

      // Skip question validation in template mode (QuizTemplate has no questions)
      if (!isTemplateMode) {

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
        
        if (q.type === "ESSAY") {
          // Validate essay answers
          if (!q.answers || q.answers.length === 0) {
            messageApi.error(`Câu hỏi tự luận ${quizData.questions.indexOf(q) + 1} không có đáp án mẫu`);
            setSubmitting(false);
            return;
          }
          // Validate answer content
          for (let a of q.answers) {
            if (!a.content || a.content.trim() === "") {
              messageApi.error(`Câu hỏi tự luận ${quizData.questions.indexOf(q) + 1} có đáp án không có nội dung`);
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
      const processedQuestions = quizData.questions.map(q => {
        const isTempId = q.id > 2000000000; // a simple heuristic, or check if it was present in initial load
        return {
          ...q,
          id: isTempId ? null : q.id,
          // Ensure points is sent (default 1)
          points: q.points || 1,
          answers: q.answers.map(a => {
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
        timeLimitMinutes: parseInt(values.timeLimitMinutes) || 30,
        minPassScore: values.minPassScore ? parseInt(values.minPassScore) : 0,
        maxAttempts: values.maxAttempts ? parseInt(values.maxAttempts) : null,
        availableFrom: values.availableFrom ? values.availableFrom.toISOString() : null,
        availableUntil: values.availableUntil ? values.availableUntil.toISOString() : null,
        questions: processedQuestions,
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
                }}
              >
                <div className="grid grid-cols-2 gap-x-4">
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
              {!isTemplateMode && (<>
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
                            { value: "ESSAY", label: "Tự luận" },
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
                      {question.type === "ESSAY" ? (
                        // Essay answer input
                        <div className="flex flex-col gap-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#617589] dark:text-gray-400">
                            Đáp án mẫu (mô tả cách trả lời đúng)
                          </label>
                          <Input.TextArea
                            placeholder="Nhập đáp án mẫu hoặc hướng dẫn chấm điểm..."
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
              </>)}
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
