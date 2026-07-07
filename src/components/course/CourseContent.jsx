import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import UserIdentity from "../../components/common/UserIdentity";
import {
  PlusIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleLeftEllipsisIcon,
  XMarkIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";
import LessonComments from "../lesson/LessonComments";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  getClassChapters,
  getClassContentItems,
  deleteClassChapter,
  deleteClassContentItem,
  createClassChapter,
  overrideClassChapter,
  moveClassContentItem,
  getClassContentCompletion,
  updateClassChapter,
  updateClassContentItem,
} from "../../api/classSection";
import { App, Spin, Alert, Dropdown, Modal, Form, Input, DatePicker, Switch, Segmented, Empty, Button } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const canManageRole = (role) => role === "TEACHER" || role === "ADMIN";

export default function CourseContent({ enrollmentStatus = null, workspaceMode = "default", capabilities = [], archived = false }) {
  const { t, i18n } = useTranslation();
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const { id: classSectionId } = useParams();
  const navigate = useNavigate();

  const userRole = user?.role;
  const canManage = canManageRole(userRole);
  const canMutateContent = canManage && !archived;
  const isStudentNotApproved = userRole === "STUDENT" && enrollmentStatus !== "APPROVED";
  const isTeachingWorkspace = workspaceMode === "teaching";
  const canReviewQuizzes = capabilities.includes("REVIEW_QUIZZES");
  const canManageAssignments = capabilities.includes("MANAGE_ASSIGNMENTS") || capabilities.includes("GRADE_ASSIGNMENTS");
  const canManageAssignmentContent = isTeachingWorkspace && canManageAssignments && !archived;
  const canViewStudentProgress = capabilities.includes("VIEW_PEOPLE");
  // GV/ADMIN (role toàn cục) hoặc TA trong workspace hỗ trợ được cấp quyền REPLY_COMMENTS
  // đều mở được ngăn bình luận để trả lời người học.
  const canReplyComments = canManage || (isTeachingWorkspace && capabilities.includes("REPLY_COMMENTS"));
  const contentRoutePrefix = isTeachingWorkspace ? "teaching" : userRole?.toLowerCase();

  // Chapter list state
  const [chapters, setChapters] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [chapterItems, setChapterItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingItems, setLoadingItems] = useState({});

  // Async operation state
  const [reorderingChapter, setReorderingChapter] = useState(false);
  const [reorderingItem, setReorderingItem] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteChapterId, setDeleteChapterId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Create chapter modal
  const [createChapterModal, setCreateChapterModal] = useState(false);
  const [createChapterForm] = Form.useForm();
  const [creatingChapter, setCreatingChapter] = useState(false);

  // Edit chapter modal
  const [editChapterModal, setEditChapterModal] = useState({ visible: false, chapter: null });
  const [editChapterForm] = Form.useForm();
  const [savingChapter, setSavingChapter] = useState(false);

  // Edit content item modal
  const [editItemModal, setEditItemModal] = useState({ visible: false, item: null, chapterId: null });
  const [editItemForm] = Form.useForm();
  const [savingItem, setSavingItem] = useState(false);

  // Comment drawer
  const [commentDrawer, setCommentDrawer] = useState({ open: false, lessonId: null, title: "" });
  const closeCommentDrawer = () => setCommentDrawer({ open: false, lessonId: null, title: "" });
  const [searchParams, setSearchParams] = useSearchParams();

  // Mở sẵn drawer bình luận khi điều hướng từ thông báo (?commentLessonId=...).
  useEffect(() => {
    const lessonId = searchParams.get("commentLessonId");
    if (lessonId) {
      if (canReplyComments) {
        setCommentDrawer({ open: true, lessonId: Number(lessonId), title: "" });
      }
      const next = new URLSearchParams(searchParams);
      next.delete("commentLessonId");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, canReplyComments]);

  // Lesson completion modal
  const [lessonCompletionModal, setLessonCompletionModal] = useState({ open: false, itemId: null, title: "" });
  const [lessonCompletionRows, setLessonCompletionRows] = useState([]);
  const [lessonCompletionLoading, setLessonCompletionLoading] = useState(false);
  const [lessonCompletionFilter, setLessonCompletionFilter] = useState("ALL");
  const [lessonCompletionKeyword, setLessonCompletionKeyword] = useState("");
  const [lessonProgressPickerOpen, setLessonProgressPickerOpen] = useState(false);
  const [lessonProgressPickerLoading, setLessonProgressPickerLoading] = useState(false);
  const [lessonProgressPickerRows, setLessonProgressPickerRows] = useState([]);
  const [lessonProgressPickerKeyword, setLessonProgressPickerKeyword] = useState("");
  const tc = (key, options) => t(`classContent.${key}`, options);

  const resolveItemAccessMessage = (item) => {
    if (item?.accessMessageKey) {
      return t(item.accessMessageKey);
    }
    if (item?.availabilityStatus) {
      return t(`classContent.access.byStatus.${item.availabilityStatus}`, {
        defaultValue: item.accessMessage || t("classContent.access.unavailable"),
      });
    }
    return item?.accessMessage || t("classContent.access.unavailable");
  };

  const closeLessonCompletionModal = () => {
    setLessonCompletionModal({ open: false, itemId: null, title: "" });
    setLessonCompletionFilter("ALL");
    setLessonCompletionKeyword("");
  };

  const closeLessonProgressPicker = () => {
    setLessonProgressPickerOpen(false);
    setLessonProgressPickerKeyword("");
  };

  useEffect(() => {
    fetchChapters();
  }, [classSectionId]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await getClassChapters(classSectionId);
      const data = Array.isArray(response) ? response : response?.data || [];
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        : [];
      setChapters(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterItems = async (chapterId) => {
    try {
      setLoadingItems((prev) => ({ ...prev, [chapterId]: true }));
      const response = await getClassContentItems(classSectionId, chapterId);
      const data = Array.isArray(response) ? response : response?.data || [];
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        : [];
      setChapterItems((prev) => ({ ...prev, [chapterId]: sorted }));
    } catch (err) {
      message.error(tc("messages.loadItemsFailed", { error: err.message }));
    } finally {
      setLoadingItems((prev) => ({ ...prev, [chapterId]: false }));
    }
  };

  const openLessonCompletionModal = async (item) => {
    try {
      setLessonCompletionModal({
        open: true,
        itemId: item.id,
        title: item.displayTitle || item.title || t("classContent.unknownItem"),
      });
      setLessonCompletionLoading(true);
      setLessonCompletionFilter("ALL");
      setLessonCompletionKeyword("");
      const response = await getClassContentCompletion(classSectionId, item.id);
      setLessonCompletionRows(Array.isArray(response) ? response : []);
    } catch (err) {
      message.error(err?.response?.data?.message || t("classContent.lessonCompletion.messages.loadFailed"));
      setLessonCompletionRows([]);
    } finally {
      setLessonCompletionLoading(false);
    }
  };

  const openLessonProgressPicker = async () => {
    try {
      setLessonProgressPickerOpen(true);
      setLessonProgressPickerLoading(true);
      setLessonProgressPickerKeyword("");

      const chapterRows = await Promise.all(
        chapters.map(async (chapter) => {
          const chapterItemsList =
            chapterItems[chapter.id] ||
            (await (async () => {
              const response = await getClassContentItems(classSectionId, chapter.id);
              return Array.isArray(response) ? response : response?.data || [];
            })());

          return (Array.isArray(chapterItemsList) ? chapterItemsList : [])
            .filter((item) => item.itemType === "LESSON")
            .map((item) => ({
              ...item,
              chapterTitle: chapter.title,
              chapterOrderIndex: chapter.orderIndex ?? 0,
              itemOrderIndex: item.orderIndex ?? 0,
            }));
        })
      );

      const flattened = chapterRows.flat().sort(
        (a, b) =>
          (a.chapterOrderIndex ?? 0) - (b.chapterOrderIndex ?? 0) ||
          (a.itemOrderIndex ?? 0) - (b.itemOrderIndex ?? 0)
      );

      setLessonProgressPickerRows(flattened);
    } catch (err) {
      message.error(err?.response?.data?.message || t("classContent.lessonCompletionPicker.messages.loadFailed"));
      setLessonProgressPickerRows([]);
    } finally {
      setLessonProgressPickerLoading(false);
    }
  };

  const lessonCompletionCounts = useMemo(() => {
    return lessonCompletionRows.reduce(
      (acc, row) => {
        if (row.completed) {
          acc.completed += 1;
        } else {
          acc.notCompleted += 1;
        }
        return acc;
      },
      { completed: 0, notCompleted: 0 }
    );
  }, [lessonCompletionRows]);

  const filteredLessonCompletionRows = useMemo(() => {
    const keyword = lessonCompletionKeyword.trim().toLowerCase();
    return lessonCompletionRows.filter((row) => {
      const matchesFilter =
        lessonCompletionFilter === "ALL" ||
        (lessonCompletionFilter === "COMPLETED" && row.completed) ||
        (lessonCompletionFilter === "NOT_COMPLETED" && !row.completed);

      if (!matchesFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [row.studentName, row.studentNumber, row.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [lessonCompletionFilter, lessonCompletionKeyword, lessonCompletionRows]);

  const filteredLessonProgressPickerRows = useMemo(() => {
    const keyword = lessonProgressPickerKeyword.trim().toLowerCase();
    if (!keyword) {
      return lessonProgressPickerRows;
    }

    return lessonProgressPickerRows.filter((item) => {
      return [item.displayTitle, item.title, item.chapterTitle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [lessonProgressPickerKeyword, lessonProgressPickerRows]);

  const formatCompletionTime = (value) => {
    if (!value) {
      return t("classContent.lessonCompletion.defaults.notCompletedTime");
    }

    try {
      const locale = i18n.resolvedLanguage?.startsWith("vi") ? "vi-VN" : "en-US";
      return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch (error) {
      return value;
    }
  };

  // ── Toggle chapter expand ──────────────────────────────────────────────────
  const handleToggleChapter = (chapterId) => {
    const next = new Set(expandedChapters);
    if (next.has(chapterId)) {
      next.delete(chapterId);
    } else {
      next.add(chapterId);
      if (!chapterItems[chapterId]) {
        fetchChapterItems(chapterId);
      }
    }
    setExpandedChapters(next);
  };

  // ── Chapter reorder ────────────────────────────────────────────────────────
  const handleMoveChapter = async (index, direction) => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= chapters.length || reorderingChapter) return;

    const newChapters = [...chapters];
    [newChapters[index], newChapters[swapIndex]] = [newChapters[swapIndex], newChapters[index]];
    setChapters(newChapters);
    setReorderingChapter(true);

    try {
      await Promise.all([
        overrideClassChapter(classSectionId, newChapters[index].id, { orderIndex: index }),
        overrideClassChapter(classSectionId, newChapters[swapIndex].id, { orderIndex: swapIndex }),
      ]);
    } catch (err) {
      message.error(tc("messages.reorderChapterFailed"));
      fetchChapters();
    } finally {
      setReorderingChapter(false);
    }
  };

  // ── Content item reorder ───────────────────────────────────────────────────
  const handleMoveItem = async (chapterId, index, direction) => {
    const items = chapterItems[chapterId] || [];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length || reorderingItem) return;

    const movedItemId = items[index].id;
    const newItems = [...items];
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setChapterItems((prev) => ({ ...prev, [chapterId]: newItems }));
    setReorderingItem(true);

    try {
      await moveClassContentItem(classSectionId, movedItemId, direction === "up" ? "UP" : "DOWN");
    } catch (err) {
      message.error(tc("messages.reorderItemFailed"));
      fetchChapterItems(chapterId);
    } finally {
      setReorderingItem(false);
    }
  };

  // ── Item click navigation (FIXED: use lessonId / quizId) ──────────────────
  const handleClickItem = (item) => {
    if (isStudentNotApproved) {
      message.warning(t("classContent.access.waitForApproval"));
      return;
    }
    if (userRole === "STUDENT" && item.accessible === false) {
      message.warning(resolveItemAccessMessage(item));
      return;
    }

    const role = userRole?.toLowerCase();
    const classContentQuery = `?classContentItemId=${item.id}`;

    if (isTeachingWorkspace && item.itemType === "QUIZ") {
      const quizId = item.quizId || item.id;
      if (!canReviewQuizzes) {
        navigate(`/teaching/class-sections/${classSectionId}/quizzes/${quizId}/view`, {
          state: {
            classContentItemId: item.id,
            itemTitle: item.displayTitle || item.title,
          },
        });
        return;
      }
      navigate(`/teaching/class-sections/${classSectionId}/quizzes/${quizId}/attempts${classContentQuery}`, {
        state: {
          classContentItemId: item.id,
          itemTitle: item.displayTitle || item.title,
        },
      });
      return;
    }

    if (isTeachingWorkspace && item.itemType === "ASSIGNMENT") {
      const currentAssignmentId = item.assignmentId || item.id;
      if (!canManageAssignments) {
        navigate(`/teaching/class-sections/${classSectionId}/assignments/${currentAssignmentId}/view`, {
          state: {
            classContentItemId: item.id,
            itemTitle: item.displayTitle || item.title,
          },
        });
        return;
      }
      navigate(`/teaching/class-sections/${classSectionId}/assignments/${currentAssignmentId}/submissions${classContentQuery}`, {
        state: {
          classContentItemId: item.id,
          itemTitle: item.displayTitle || item.title,
        },
      });
      return;
    }

    if (item.itemType === "LESSON") {
      const lectureId = item.lessonId || item.id;
      if (isTeachingWorkspace) {
        navigate(`/teaching/class-sections/${classSectionId}/lectures/${lectureId}`, {
          state: { classContentItemId: item.id },
        });
      } else if (userRole === "STUDENT") {
        navigate(`/class-sections/${classSectionId}/lectures/${lectureId}${classContentQuery}`, {
          state: { classContentItemId: item.id },
        });
      } else {
        navigate(`/${role}/class-sections/${classSectionId}/lectures/${lectureId}`, {
          state: { classContentItemId: item.id },
        });
      }
    } else if (item.itemType === "QUIZ") {
      const quizId = item.quizId || item.id;
      if (userRole === "STUDENT") {
        navigate(`/class-sections/${classSectionId}/quizzes/${quizId}/detail${classContentQuery}`, {
          state: { classContentItemId: item.id },
        });
      } else {
        navigate(`/${role}/class-sections/${classSectionId}/quizzes/${quizId}`, {
          state: { classContentItemId: item.id },
        });
      }
    } else if (item.itemType === "ASSIGNMENT") {
      const currentAssignmentId = item.assignmentId || item.id;
      if (userRole === "STUDENT") {
        navigate(`/class-sections/${classSectionId}/assignments/${currentAssignmentId}${classContentQuery}`, {
          state: { classContentItemId: item.id },
        });
      } else {
        navigate(`/${role}/class-sections/${classSectionId}/assignments/${currentAssignmentId}`, {
          state: { classContentItemId: item.id },
        });
      }
    }
  };

  const getTeachingViewOnlyLabel = (item) => {
    if (!isTeachingWorkspace) {
      return null;
    }
    if (item.itemType === "QUIZ" && !canReviewQuizzes) {
      return t("classContent.badges.viewOnly");
    }
    if (item.itemType === "ASSIGNMENT" && !canManageAssignments) {
      return t("classContent.badges.viewOnly");
    }
    return null;
  };

  // ── Create chapter ─────────────────────────────────────────────────────────
  const handleCreateChapter = async (values) => {
    try {
      setCreatingChapter(true);
      await createClassChapter(classSectionId, {
        title: values.title,
        description: values.description || "",
        orderIndex: chapters.length,
      });
      message.success(tc("messages.createChapterSuccess"));
      setCreateChapterModal(false);
      createChapterForm.resetFields();
      fetchChapters();
    } catch (err) {
      message.error(err.response?.data?.message || tc("messages.createChapterFailed"));
    } finally {
      setCreatingChapter(false);
    }
  };

  // ── Edit chapter ──────────────────────────────────────────────────────────
  const handleOpenEditChapter = (e, chapter) => {
    e.stopPropagation();
    editChapterForm.setFieldsValue({
      title: chapter.title,
      description: chapter.description || "",
    });
    setEditChapterModal({ visible: true, chapter });
  };

  const handleSaveChapter = async (values) => {
    try {
      setSavingChapter(true);
      await updateClassChapter(classSectionId, editChapterModal.chapter.id, {
        title: values.title,
        description: values.description,
      });
      message.success(tc("messages.updateChapterSuccess"));
      setEditChapterModal({ visible: false, chapter: null });
      fetchChapters();
    } catch (err) {
      message.error(err.response?.data?.message || tc("messages.updateChapterFailed"));
    } finally {
      setSavingChapter(false);
    }
  };

  // ── Edit content item ─────────────────────────────────────────────────────
  const handleOpenEditItem = (e, chapterId, item) => {
    e.stopPropagation();
    editItemForm.setFieldsValue({
      hidden: item.hidden || false,
      locked: item.locked || false,
      availableFrom: item.availableFrom ? dayjs(item.availableFrom) : null,
      availableTo: item.availableTo ? dayjs(item.availableTo) : null,
    });
    setEditItemModal({ visible: true, item, chapterId });
  };

  const handleSaveItem = async (values) => {
    try {
      setSavingItem(true);
      await updateClassContentItem(classSectionId, editItemModal.item.id, {
        hidden: values.hidden,
        locked: values.locked,
        availableFrom: values.availableFrom?.format('YYYY-MM-DDTHH:mm:ss') || null,
        availableTo: values.availableTo?.format('YYYY-MM-DDTHH:mm:ss') || null,
      });
      message.success(tc("messages.updateContentSuccess"));
      setEditItemModal({ visible: false, item: null, chapterId: null });
      if (editItemModal.chapterId) {
        fetchChapterItems(editItemModal.chapterId);
      }
    } catch (err) {
      message.error(err.response?.data?.message || tc("messages.updateContentFailed"));
    } finally {
      setSavingItem(false);
    }
  };

  // ── Delete handlers ───────────────────────────────────────────────────────
  const handleDeleteItem = async (chapterId, itemId) => {
    try {
      setDeletingItem(itemId);
      await deleteClassContentItem(classSectionId, itemId);
      message.success(tc("messages.deleteContentSuccess"));
      fetchChapterItems(chapterId);
    } catch (err) {
      message.error(err.message || tc("messages.deleteContentFailed"));
    } finally {
      setDeletingItem(null);
    }
  };

  const confirmDeleteChapter = async () => {
    try {
      setDeleting(true);
      await deleteClassChapter(classSectionId, deleteChapterId);
      message.success(tc("messages.deleteChapterSuccess"));
      setDeleteChapterId(null);
      fetchChapters();
    } catch (err) {
      message.error(err.message || tc("messages.deleteChapterFailed"));
    } finally {
      setDeleting(false);
    }
  };

  // ── Chapter dropdown menu ─────────────────────────────────────────────────
  const getChapterMenuItems = (chapter) => {
    if (!canMutateContent && !canManageAssignmentContent) {
      return [];
    }
    if (!canMutateContent) {
      return [
        {
          key: "add-assignment",
          label: t("classContent.actions.addAssignment"),
          onClick: () =>
            navigate(`/${contentRoutePrefix}/class-sections/${classSectionId}/chapters/${chapter.id}/assignments/create`),
        },
      ];
    }
    return [
      {
        key: "edit",
        label: tc("menu.editChapter"),
        icon: <PencilSquareIcon className="h-4 w-4" />,
        onClick: ({ domEvent }) => handleOpenEditChapter(domEvent, chapter),
      },
      { type: "divider" },
      {
        key: "add-lecture",
        label: t("classContent.actions.addLesson"),
        onClick: () =>
          navigate(`/${contentRoutePrefix}/class-sections/${classSectionId}/chapters/${chapter.id}/lectures/create`),
      },
      {
        key: "add-quiz",
        label: t("classContent.actions.addQuiz"),
        onClick: () =>
          navigate(`/${contentRoutePrefix}/class-sections/${classSectionId}/chapters/${chapter.id}/quizzes/create`),
      },
      {
        key: "add-assignment",
        label: t("classContent.actions.addAssignment"),
        onClick: () =>
          navigate(`/${contentRoutePrefix}/class-sections/${classSectionId}/chapters/${chapter.id}/assignments/create`),
      },
      { type: "divider" },
      {
        key: "delete",
        label: tc("menu.deleteChapter"),
        danger: true,
        icon: <TrashIcon className="h-4 w-4" />,
        onClick: () => setDeleteChapterId(chapter.id),
      },
    ];
  };

  // ── Type config ───────────────────────────────────────────────────────────
  const getTypeConfig = (itemType) => {
    switch (itemType) {
      case "LESSON":
        return {
          label: tc("types.lesson"),
          icon: "description",
          bg: "bg-blue-100 dark:bg-blue-900/30",
          text: "text-blue-600 dark:text-blue-400",
        };
      case "QUIZ":
        return {
          label: tc("types.quiz"),
          icon: "quiz",
          bg: "bg-orange-100 dark:bg-orange-900/30",
          text: "text-orange-600 dark:text-orange-400",
        };
      case "ASSIGNMENT":
        return {
          label: tc("types.assignment"),
          icon: "assignment",
          bg: "bg-green-100 dark:bg-green-900/30",
          text: "text-green-600 dark:text-green-400",
        };
      default:
        return {
          label: itemType || tc("types.default"),
          icon: "article",
          bg: "bg-gray-100 dark:bg-gray-700",
          text: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const getStudentCompletionMeta = (item) => {
    if (userRole !== "STUDENT" || isTeachingWorkspace) {
      return null;
    }

    if (item.itemType === "ASSIGNMENT") {
      const isCompleted = item.completed === true;
      const assignmentStatus = item.assignmentStatus || "NOT_SUBMITTED";
      const statusLabelMap = {
        NOT_SUBMITTED: tc("assignmentStatus.notSubmitted"),
        SUBMITTED: tc("assignmentStatus.submitted"),
        LATE_SUBMITTED: tc("assignmentStatus.lateSubmitted"),
        GRADED: tc("assignmentStatus.graded"),
        RETURNED: tc("assignmentStatus.returned"),
      };
      return {
        completed: isCompleted,
        label: statusLabelMap[assignmentStatus] || tc("types.assignment"),
      };
    }

    if (item.progressEligible) {
      return {
        completed: item.completed === true,
        label: item.completed ? tc("completionStatus.completed") : tc("completionStatus.notCompleted"),
      };
    }

    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert message={tc("errors.loadContent")} description={error} type="error" showIcon className="my-4" />
    );
  }

  return (
    <div className="space-y-4">
      {archived && (
        <Alert
          type="info"
          showIcon
          message={t("classContent.archived.title")}
          description={t("classContent.archived.description")}
          className="!mb-8"
        />
      )}
      {/* ── Section header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#111418] dark:text-white">
          {tc("pageTitle")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && chapters.length > 0 && (
            <button
              onClick={openLessonProgressPicker}
              className="flex items-center gap-2 rounded-lg border border-emerald-400 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircleSolidIcon className="h-4 w-4" />
              <span>{t("classContent.lessonCompletionPicker.actions.open")}</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setCreateChapterModal(true)}
              disabled={!canMutateContent}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm active:scale-95"
            >
              <PlusIcon className="h-4 w-4" />
              <span>{t("classContent.actions.addChapter")}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Chapter list ── */}
      <div className="space-y-3">
        {chapters.length > 0 ? (
          chapters.map((chapter, chapterIndex) => {
            const isExpanded = expandedChapters.has(chapter.id);
            const items = chapterItems[chapter.id] || [];

            return (
              <div
                key={chapter.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
              >
                {/* Chapter header */}
                <div
                  onClick={() => handleToggleChapter(chapter.id)}
                  className={`flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isExpanded ? "bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-gray-700" : ""
                    }`}
                >
                  {/* Left: expand toggle + title */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition-colors ${isExpanded
                        ? "bg-primary text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                        }`}
                    >
                      <PlusIcon
                        className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-45" : ""}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[#111418] dark:text-white block truncate">
                        {chapter.title}
                      </span>
                      {chapter.description && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                          {chapter.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: reorder + menu + expand */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {canMutateContent && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapter(chapterIndex, "up");
                          }}
                          disabled={chapterIndex === 0 || reorderingChapter}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                          title={tc("tooltips.moveUp")}
                        >
                          <ChevronUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapter(chapterIndex, "down");
                          }}
                          disabled={chapterIndex === chapters.length - 1 || reorderingChapter}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                          title={tc("tooltips.moveDown")}
                        >
                          <ChevronDownIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {(canMutateContent || canManageAssignmentContent) && (
                      <Dropdown
                        menu={{ items: getChapterMenuItems(chapter) }}
                        trigger={["click"]}
                        placement="bottomRight"
                      >
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      </Dropdown>
                    )}

                    <span
                      className={`material-symbols-outlined text-gray-400 transition-transform duration-300 select-none ${isExpanded ? "rotate-180" : ""
                        }`}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Chapter body */}
                {isExpanded && (
                  <div className="p-4 space-y-2 bg-white dark:bg-gray-800">
                    {loadingItems[chapter.id] ? (
                      <div className="flex justify-center py-6">
                        <Spin size="small" />
                      </div>
                    ) : items.length > 0 ? (
                      <div className="space-y-2">
                        {items.map((item, itemIndex) => {
                          const typeConfig = getTypeConfig(item.itemType);
                          const isStudentBlocked =
                            isStudentNotApproved || (userRole === "STUDENT" && item.accessible === false);
                          const viewOnlyLabel = getTeachingViewOnlyLabel(item);
                          const completionMeta = getStudentCompletionMeta(item);
                          const canManageThisItem =
                            canMutateContent || (canManageAssignmentContent && item.itemType === "ASSIGNMENT");
                          const canEditAssignmentDefinition =
                            isTeachingWorkspace && canManageAssignmentContent && item.itemType === "ASSIGNMENT";
                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3 transition-all ${isStudentBlocked
                                ? "opacity-70 cursor-not-allowed"
                                : "hover:shadow-sm hover:border-primary/30 cursor-pointer"
                                }`}
                              onClick={() => handleClickItem(item)}
                            >
                              {/* Type icon */}
                              <div className={`p-2 rounded-lg shrink-0 ${typeConfig.bg}`}>
                                <span className={`material-symbols-outlined text-lg leading-none ${typeConfig.text}`}>
                                  {typeConfig.icon}
                                </span>
                              </div>

                              {/* Title + badges */}
                              <div className="flex-1 min-w-0">
                                <p className="!m-0 font-semibold leading-none text-sm text-[#111418] dark:text-white truncate">
                                  {item.displayTitle || item.title || t("classContent.unknownItem")}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{typeConfig.label}</span>
                                  {completionMeta?.label && (
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${completionMeta.completed
                                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300"
                                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                      }`}>
                                      {completionMeta.label}
                                    </span>
                                  )}
                                  {viewOnlyLabel && (
                                    <span className="text-[10px] font-medium bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                                      {viewOnlyLabel}
                                    </span>
                                  )}
                                  {item.hidden && (
                                    <span className="text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
                                      {t("classContent.badges.hidden")}
                                    </span>
                                  )}
                                  {item.locked && (
                                    <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                                      {t("classContent.badges.locked")}
                                    </span>
                                  )}
                                  {item.availabilityStatus === "NOT_OPEN_YET" && (
                                    <span className="text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                                      {t("classContent.badges.notOpenYet")}
                                    </span>
                                  )}
                                  {item.availabilityStatus === "CLOSED" && (
                                    <span className="text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                                      {t("classContent.badges.closed")}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {userRole === "STUDENT" && !isTeachingWorkspace && (
                                <div className="flex shrink-0 items-center justify-center">
                                  {completionMeta?.completed ? (
                                    <div className="flex h-9 w-9 items-center justify-center">
                                      <CheckCircleSolidIcon className="h-7 w-7 text-green-500 dark:text-green-400" />
                                    </div>
                                  ) : item.accessible === false ? (
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                      <LockClosedIcon className="h-4 w-4" />
                                    </span>
                                  ) : (
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500">
                                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Actions */}
                              {(canManage || canManageThisItem) && (
                                <div
                                  className="flex items-center gap-0.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {canManage && isTeachingWorkspace && item.itemType === "LESSON" && canViewStudentProgress && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openLessonCompletionModal(item);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
                                      title={t("classContent.lessonCompletion.actions.open")}
                                    >
                                      <CheckCircleSolidIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canReplyComments && item.itemType === "LESSON" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCommentDrawer({
                                          open: true,
                                          lessonId: item.lessonId || item.id,
                                          title: item.displayTitle || item.title,
                                        });
                                      }}
                                      className="relative p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 transition-colors"
                                      title={t("classContent.lessonComments.actions.open")}
                                    >
                                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                                      {item.unansweredCommentCount > 0 && (
                                        <span
                                          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white"
                                          title={t("classContent.lessonComments.unansweredTitle", { count: item.unansweredCommentCount })}
                                        >
                                          {item.unansweredCommentCount > 9 ? "9+" : item.unansweredCommentCount}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveItem(chapter.id, itemIndex, "up");
                                    }}
                                    disabled={!canManageThisItem || itemIndex === 0 || reorderingItem}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                    title={tc("tooltips.moveUp")}
                                  >
                                    <ChevronUpIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveItem(chapter.id, itemIndex, "down");
                                    }}
                                    disabled={!canManageThisItem || itemIndex === items.length - 1 || reorderingItem}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                    title={tc("tooltips.moveDown")}
                                  >
                                    <ChevronDownIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      if (canEditAssignmentDefinition) {
                                        e.stopPropagation();
                                        navigate(`/${contentRoutePrefix}/class-sections/${classSectionId}/assignments/${item.assignmentId || item.id}`, {
                                          state: { classContentItemId: item.id },
                                        });
                                        return;
                                      }
                                      handleOpenEditItem(e, chapter.id, item);
                                    }}
                                    disabled={!canManageThisItem}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                                    title={tc("tooltips.edit")}
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      modal.confirm({
                                        title: tc("confirmations.deleteContent.title"),
                                        icon: <ExclamationCircleOutlined />,
                                        content: tc("confirmations.deleteContent.content", {
                                          title: item.displayTitle || item.title,
                                        }),
                                        okText: tc("buttons.delete"),
                                        cancelText: tc("buttons.cancel"),
                                        okButtonProps: { danger: true },
                                        onOk: () => handleDeleteItem(chapter.id, item.id),
                                      });
                                    }}
                                    disabled={!canManageThisItem || deletingItem === item.id}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50"
                                    title={tc("tooltips.delete")}
                                  >
                                    {deletingItem === item.id ? (
                                      <Spin size="small" />
                                    ) : (
                                      <TrashIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {tc("empty.chapterHasNoContent")}
                        </p>
                        {(canMutateContent || canManageAssignmentContent) && (
                          <div className="flex justify-center gap-3 flex-wrap">
                            {canMutateContent && (
                              <>
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/${contentRoutePrefix}/class-sections/${classSectionId}/chapters/${chapter.id}/lectures/create`
                                    )
                                  }
                                  className="text-xs text-primary hover:underline font-medium"
                                >
                                  {tc("actions.addLesson")}
                                </button>
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/${contentRoutePrefix}/class-sections/${classSectionId}/chapters/${chapter.id}/quizzes/create`
                                    )
                                  }
                                  className="text-xs text-primary hover:underline font-medium"
                                >
                                  {tc("actions.addQuiz")}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() =>
                                navigate(
                                  `/${contentRoutePrefix}/class-sections/${classSectionId}/chapters/${chapter.id}/assignments/create`
                                )
                              }
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              {tc("actions.addAssignment")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <AcademicCapIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-semibold text-base mb-1">
              {tc("empty.noChapters")}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {canManage
                ? tc("empty.noChaptersAdminHint")
                : tc("empty.noChaptersTeacherHint")}
            </p>
          </div>
        )}
      </div>

      <Modal
        title={t("classContent.lessonCompletionPicker.title")}
        open={lessonProgressPickerOpen}
        onCancel={closeLessonProgressPicker}
        footer={null}
        width={860}
        centered
      >
        <div className="space-y-5">
          <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
            {t("classContent.lessonCompletionPicker.subtitle")}
          </p>
          <Input.Search
            allowClear
            size="large"
            value={lessonProgressPickerKeyword}
            onChange={(event) => setLessonProgressPickerKeyword(event.target.value)}
            placeholder={t("classContent.lessonCompletionPicker.filters.searchPlaceholder")}
          />
          {lessonProgressPickerLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Spin size="large" />
            </div>
          ) : filteredLessonProgressPickerRows.length > 0 ? (
            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {filteredLessonProgressPickerRows.map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-[68px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-blue-500 md:flex-row md:items-center md:justify-between md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[15px] font-bold leading-tight! text-slate-900 dark:text-white md:text-base">
                      {item.displayTitle || item.title || t("classContent.unknownItem")}
                    </p>
                    <p className="m-0 -mt-0.5! truncate text-sm leading-tight! text-slate-500 dark:text-slate-400">
                      {item.chapterTitle || t("classContent.lessonCompletionPicker.defaults.noChapter")}
                    </p>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    className="shrink-0"
                    onClick={async () => {
                      closeLessonProgressPicker();
                      await openLessonCompletionModal(item);
                    }}
                  >
                    {t("classContent.lessonCompletionPicker.table.action")}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              description={
                <span className="text-slate-500 dark:text-slate-400">
                  {lessonProgressPickerRows.length > 0
                    ? t("classContent.lessonCompletionPicker.empty.filtered")
                    : t("classContent.lessonCompletionPicker.empty.default")}
                </span>
              }
            />
          )}
        </div>
      </Modal>

      {/* ── Create Chapter Modal ── */}
      <Modal
        title={tc("modals.createChapter.title")}
        open={createChapterModal}
        onCancel={() => { setCreateChapterModal(false); createChapterForm.resetFields(); }}
        onOk={() => createChapterForm.submit()}
        confirmLoading={creatingChapter}
        okText={tc("buttons.addChapter")}
        cancelText={tc("buttons.cancel")}
        centered
      >
        <Form form={createChapterForm} layout="vertical" onFinish={handleCreateChapter} className="mt-4">
          <Form.Item
            label={tc("forms.chapterTitle.label")}
            name="title"
            rules={[{ required: true, message: tc("forms.chapterTitle.required") }]}
          >
            <Input placeholder={tc("forms.chapterTitle.placeholder")} />
          </Form.Item>
          <Form.Item label={tc("forms.description.label")} name="description">
            <Input.TextArea rows={3} placeholder={tc("forms.description.placeholder")} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Delete Chapter Modal ── */}
      <Modal
        title={tc("modals.deleteChapter.title")}
        open={deleteChapterId !== null}
        onCancel={() => setDeleteChapterId(null)}
        footer={null}
        centered
      >
        <div className="py-2">
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {tc("modals.deleteChapter.description")}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteChapterId(null)}
              disabled={deleting}
              className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors font-medium"
            >
              {tc("buttons.cancel")}
            </button>
            <button
              onClick={confirmDeleteChapter}
              disabled={deleting}
              className="px-5 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2 hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-70"
            >
              {deleting ? <Spin size="small" /> : <TrashIcon className="h-4 w-4" />}
              {tc("buttons.deleteChapter")}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Chapter Modal ── */}
      <Modal
        title={tc("modals.editChapter.title")}
        open={editChapterModal.visible}
        onCancel={() => setEditChapterModal({ visible: false, chapter: null })}
        onOk={() => editChapterForm.submit()}
        confirmLoading={savingChapter}
        okText={tc("buttons.saveChanges")}
        cancelText={tc("buttons.cancel")}
        centered
      >
        <Form form={editChapterForm} layout="vertical" onFinish={handleSaveChapter} className="mt-4">
          <Form.Item
            label={tc("forms.chapterTitle.label")}
            name="title"
            rules={[{ required: true, message: tc("forms.chapterTitle.required") }]}
          >
            <Input placeholder={tc("forms.chapterTitle.editPlaceholder")} />
          </Form.Item>
          <Form.Item label={tc("forms.description.label")} name="description">
            <Input.TextArea rows={3} placeholder={tc("forms.description.placeholder")} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit Content Item Modal ── */}
      <Modal
        title={tc("modals.editContent.title")}
        open={editItemModal.visible}
        onCancel={() => setEditItemModal({ visible: false, item: null, chapterId: null })}
        onOk={() => editItemForm.submit()}
        confirmLoading={savingItem}
        okText={tc("buttons.saveChanges")}
        cancelText={tc("buttons.cancel")}
        centered
        width={480}
      >
        <Form form={editItemForm} layout="vertical" onFinish={handleSaveItem} className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label={tc("forms.editContent.hidden")} name="hidden" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label={tc("forms.editContent.locked")} name="locked" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item label={tc("forms.editContent.availableFrom")} name="availableFrom">
            <DatePicker
              className="w-full"
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder={tc("forms.editContent.availableFromPlaceholder")}
            />
          </Form.Item>
          <Form.Item label={tc("forms.editContent.availableTo")} name="availableTo">
            <DatePicker
              className="w-full"
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder={tc("forms.editContent.availableToPlaceholder")}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={null}
        open={lessonCompletionModal.open}
        onCancel={closeLessonCompletionModal}
        footer={null}
        width={860}
        centered
      >
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="m-0 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {t("classContent.lessonCompletion.title")}
            </p>
            <h3 className="m-0 text-lg font-semibold text-slate-900 dark:text-white">
              {lessonCompletionModal.title}
            </h3>
            <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
              {t("classContent.lessonCompletion.subtitle")}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="m-0 text-xs text-slate-500 dark:text-slate-400">
                {t("classContent.lessonCompletion.summary.students")}
              </p>
              <p className="m-0 mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                {lessonCompletionRows.length}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p className="m-0 text-xs text-emerald-700 dark:text-emerald-300">
                {t("classContent.lessonCompletion.summary.completed")}
              </p>
              <p className="m-0 mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-200">
                {lessonCompletionCounts.completed}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
              <p className="m-0 text-xs text-amber-700 dark:text-amber-300">
                {t("classContent.lessonCompletion.summary.notCompleted")}
              </p>
              <p className="m-0 mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-200">
                {lessonCompletionCounts.notCompleted}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Segmented
              value={lessonCompletionFilter}
              onChange={setLessonCompletionFilter}
              options={[
                { label: t("classContent.lessonCompletion.filters.status.all"), value: "ALL" },
                { label: t("classContent.lessonCompletion.filters.status.completed"), value: "COMPLETED" },
                { label: t("classContent.lessonCompletion.filters.status.notCompleted"), value: "NOT_COMPLETED" },
              ]}
            />
            <Input.Search
              allowClear
              value={lessonCompletionKeyword}
              onChange={(event) => setLessonCompletionKeyword(event.target.value)}
              placeholder={t("classContent.lessonCompletion.filters.searchPlaceholder")}
              className="w-full lg:max-w-sm"
            />
          </div>

          {lessonCompletionLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <Spin size="large" />
            </div>
          ) : filteredLessonCompletionRows.length > 0 ? (
            <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
              {filteredLessonCompletionRows.map((row) => {
                return (
                  <div
                    key={row.studentId}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 md:flex-row md:items-center md:justify-between"
                  >
                    <UserIdentity
                      user={{
                        name: row.studentName || t("reportsPage.shared.defaults.noName"),
                        avatarUrl: row.avatarUrl
                      }}
                      secondaryText={row.studentNumber || row.email || t("classContent.lessonCompletion.defaults.noStudentInfo")}
                      avatarSizeClass="size-11"
                      className="min-w-0"
                    />

                    <div className="grid gap-3 md:grid-cols-[140px_180px] md:items-center">
                      <div>
                        <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          {t("classContent.lessonCompletion.table.status")}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${row.completed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                            }`}
                        >
                          {row.completed
                            ? t("classContent.lessonCompletion.status.completed")
                            : t("classContent.lessonCompletion.status.notCompleted")}
                        </span>
                      </div>
                      <div>
                        <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          {t("classContent.lessonCompletion.table.completedAt")}
                        </p>
                        <p className="m-0 mt-1 text-sm text-slate-700 dark:text-slate-300">
                          {formatCompletionTime(row.completedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 dark:border-slate-700 dark:bg-slate-800/60">
              <Empty
                description={
                  <span className="text-slate-500 dark:text-slate-400">
                    {lessonCompletionRows.length > 0
                      ? t("classContent.lessonCompletion.empty.filtered")
                      : t("classContent.lessonCompletion.empty.default")}
                  </span>
                }
              />
            </div>
          )}
        </div>
      </Modal>

      {/* ── Comment Drawer ── */}
      {commentDrawer.open && (
        <>
          {/* Backdrop: làm tối nền (đồng bộ mask ~45% của các Ant Design Drawer khác),
              bấm ra ngoài để đóng. z-40 dưới panel z-50. */}
          <div
            className="fixed inset-0 z-40 bg-black/45"
            onClick={closeCommentDrawer}
            aria-hidden="true"
          />
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-125 bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mb-0.5">{t("classContent.lessonComments.title")}</p>
                <h3 className="font-semibold text-sm text-[#111418] dark:text-white truncate">{commentDrawer.title}</h3>
              </div>
            </div>
            <button
              onClick={closeCommentDrawer}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors shrink-0 ml-3"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <LessonComments
              lectureId={commentDrawer.lessonId}
              classSectionId={classSectionId}
              readOnlyReason={archived ? t("lessonComments.archivedReadOnly") : null}
            />
          </div>
        </div>
        </>
      )}
    </div>
  );
}
