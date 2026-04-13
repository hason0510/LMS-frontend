import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import {
  getTemplateById,
  createChapterTemplate,
  updateChapterTemplate,
  deleteChapterTemplate,
  deleteContentItemTemplate,
  updateContentItemTemplate,
} from "../../api/curriculumTemplate";
import { createClassSectionFromTemplateId } from "../../api/classSection";
import {
  Spin,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Empty,
  Tooltip,
} from "antd";
import {
  ArrowLeftIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  TagIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

const ITEM_TYPE_CONFIG = {
  LESSON: {
    Icon: BookOpenIcon,
    label: "Bài giảng",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dotClass: "bg-blue-500",
  },
  QUIZ: {
    Icon: ClipboardDocumentCheckIcon,
    label: "Bài kiểm tra",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  ASSIGNMENT: {
    Icon: DocumentTextIcon,
    label: "Bài tập",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    dotClass: "bg-purple-500",
  },
};

export default function TemplateDetailPage({ isAdmin = false }) {
  const { id: templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();
  const basePath = isAdmin ? "/admin" : "/teacher";

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chapter modal
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterForm] = Form.useForm();
  const [chapterSubmitting, setChapterSubmitting] = useState(false);

  // Content item type selector modal
  const [contentTypeModalOpen, setContentTypeModalOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState(null);

  // Reorder state
  const [reorderingChapter, setReorderingChapter] = useState(false);
  const [reorderingItem, setReorderingItem] = useState(false);

  // Create class section modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classForm] = Form.useForm();
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTemplateById(templateId);
      const data = res.data || res;
      setTemplate(data);
      // Auto-expand all chapters
      const expanded = {};
      (data.chapters || []).forEach((ch) => (expanded[ch.id] = true));
      setExpandedChapters(expanded);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải dữ liệu template");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  // ── Chapter handlers ─────────────────────────────────────
  const openChapterModal = (chapter = null) => {
    setEditingChapter(chapter);
    chapterForm.resetFields();
    if (chapter) {
      chapterForm.setFieldsValue({ title: chapter.title, description: chapter.description });
    } else {
      chapterForm.setFieldsValue({ orderIndex: (template?.chapters?.length || 0) + 1 });
    }
    setChapterModalOpen(true);
  };

  const handleChapterSubmit = async (values) => {
    try {
      setChapterSubmitting(true);
      if (editingChapter) {
        await updateChapterTemplate(templateId, editingChapter.id, values);
        message.success("Cập nhật chương thành công");
      } else {
        await createChapterTemplate(templateId, {
          ...values,
          orderIndex: (template?.chapters?.length || 0) + 1,
        });
        message.success("Thêm chương mới thành công");
      }
      setChapterModalOpen(false);
      await fetchTemplate();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Lỗi khi lưu chương");
    } finally {
      setChapterSubmitting(false);
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    try {
      await deleteChapterTemplate(templateId, chapterId);
      message.success("Xóa chương thành công");
      await fetchTemplate();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Không thể xóa chương");
    }
  };

  // ── Content item handlers ─────────────────────────────────
  const openContentTypeModal = (chapterId) => {
    setSelectedChapterId(chapterId);
    setContentTypeModalOpen(true);
  };

  const handleSelectContentType = (type) => {
    setContentTypeModalOpen(false);
    if (type === "LESSON") {
      navigate(`${basePath}/curriculums/${templateId}/chapters/${selectedChapterId}/lectures/create`, {
        state: { isTemplateMode: true, chapterId: selectedChapterId },
      });
    } else if (type === "QUIZ") {
      navigate(`${basePath}/curriculums/${templateId}/chapters/${selectedChapterId}/quizzes/create`, {
        state: { isTemplateMode: true, chapterId: selectedChapterId },
      });
    } else {
      message.info("Tính năng bài tập đang được phát triển");
    }
  };

  const handleDeleteContentItem = async (chapterId, contentItemId) => {
    try {
      await deleteContentItemTemplate(templateId, chapterId, contentItemId);
      message.success("Xóa nội dung thành công");
      await fetchTemplate();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Không thể xóa nội dung");
    }
  };

  const navigateToContentItem = (item, chapterId) => {
    if (item.itemType === "LESSON" && item.lessonTemplateId) {
      navigate(`${basePath}/curriculums/${templateId}/lectures/${item.lessonTemplateId}`, {
        state: { isTemplateMode: true, chapterId, viewMode: false },
      });
    } else if (item.itemType === "QUIZ" && item.quizTemplateId) {
      navigate(`${basePath}/curriculums/${templateId}/quizzes/${item.quizTemplateId}`, {
        state: { isTemplateMode: true, chapterId },
      });
    }
  };

  // ── Create class section ──────────────────────────────────
  const handleCreateClass = async (values) => {
    try {
      setClassSubmitting(true);
      await createClassSectionFromTemplateId(templateId, {
        title: values.title,
        description: values.description,
        classCode: generatedCode || undefined,
        startDate: values.dates?.[0]?.format("YYYY-MM-DD"),
        endDate: values.dates?.[1]?.format("YYYY-MM-DD"),
        teacherId: user?.id || user?.sub,
      });
      message.success("Tạo lớp học thành công!");
      setClassModalOpen(false);
      classForm.resetFields();
      setGeneratedCode(null);
      navigate(`${basePath}/class-sections`);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Không thể tạo lớp học");
    } finally {
      setClassSubmitting(false);
    }
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  // ── Chapter reorder ────────────────────────────────────────
  const handleMoveChapter = async (sortedChapters, idx, direction) => {
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedChapters.length || reorderingChapter) return;

    const chA = sortedChapters[idx];
    const chB = sortedChapters[swapIdx];

    // Optimistic update — swap positions and assign new orderIndex
    const newSorted = [...sortedChapters];
    newSorted[idx] = { ...chB, orderIndex: idx };
    newSorted[swapIdx] = { ...chA, orderIndex: swapIdx };
    setTemplate((prev) => ({ ...prev, chapters: newSorted }));
    setReorderingChapter(true);

    try {
      await Promise.all([
        updateChapterTemplate(templateId, chA.id, { title: chA.title, description: chA.description, orderIndex: swapIdx }),
        updateChapterTemplate(templateId, chB.id, { title: chB.title, description: chB.description, orderIndex: idx }),
      ]);
    } catch (err) {
      message.error("Lỗi khi sắp xếp chương");
      fetchTemplate();
    } finally {
      setReorderingChapter(false);
    }
  };

  // ── Content item reorder ───────────────────────────────────
  const handleMoveContentItem = async (chapterId, sortedItems, idx, direction) => {
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedItems.length || reorderingItem) return;

    const itemA = sortedItems[idx];
    const itemB = sortedItems[swapIdx];

    // Optimistic update
    const newItems = [...sortedItems];
    newItems[idx] = { ...itemB, orderIndex: idx };
    newItems[swapIdx] = { ...itemA, orderIndex: swapIdx };
    setTemplate((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, contentItems: newItems } : ch
      ),
    }));
    setReorderingItem(true);

    try {
      await Promise.all([
        updateContentItemTemplate(templateId, chapterId, itemA.id, {
          itemType: itemA.itemType,
          orderIndex: swapIdx,
          lessonTemplateId: itemA.lessonTemplateId,
          quizTemplateId: itemA.quizTemplateId,
          assignmentTemplateId: itemA.assignmentTemplateId,
        }),
        updateContentItemTemplate(templateId, chapterId, itemB.id, {
          itemType: itemB.itemType,
          orderIndex: idx,
          lessonTemplateId: itemB.lessonTemplateId,
          quizTemplateId: itemB.quizTemplateId,
          assignmentTemplateId: itemB.assignmentTemplateId,
        }),
      ]);
    } catch (err) {
      message.error("Lỗi khi sắp xếp nội dung");
      fetchTemplate();
    } finally {
      setReorderingItem(false);
    }
  };

  const sortedChapters = [...(template?.chapters || [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  );

  const totalItems = sortedChapters.reduce(
    (acc, ch) => acc + (ch.contentItems?.length || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <TeacherHeader />
        <div className="flex flex-1">
          {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
          <main className={`flex-1 pt-16 flex items-center justify-center ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
            <Spin size="large" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}

        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          {/* ── Breadcrumb ── */}
          <div className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
            <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <button
                onClick={() => navigate(`${basePath}/curriculums`)}
                className="hover:text-primary transition-colors"
              >
                Chương trình học
              </button>
              <ChevronRightIcon className="w-4 h-4 shrink-0" />
              <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                {template?.name}
              </span>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
            {/* ── Header Card ── */}
            <div className="bg-linear-to-br from-primary/10 via-blue-50 to-indigo-50 dark:from-primary/20 dark:via-slate-800 dark:to-slate-800 rounded-2xl border border-primary/20 dark:border-primary/30 p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {template?.name}
                    </h1>
                    {template?.isDefault && (
                      <Tag color="blue" className="text-xs">Mặc định</Tag>
                    )}
                  </div>
                  {template?.description && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">
                      {template.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {template?.categoryTitle && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <TagIcon className="w-4 h-4 text-primary" />
                        <span>{template.categoryTitle}</span>
                      </div>
                    )}
                    {template?.subjectTitle && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <AcademicCapIcon className="w-4 h-4 text-primary" />
                        <span>{template.subjectTitle}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <BookOpenIcon className="w-4 h-4 text-primary" />
                      <span>{template?.chapters?.length || 0} chương · {totalItems} nội dung</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip title="Chỉnh sửa thông tin template">
                    <button
                      onClick={() => navigate(`${basePath}/curriculums/edit/${templateId}`)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary text-sm font-medium transition-all"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                  </Tooltip>
                  <button
                    onClick={() => {
                      classForm.setFieldsValue({
                        title: `${template?.name} - Lớp mới`,
                        description: template?.description || "",
                      });
                      setGeneratedCode(generateRandomCode());
                      setClassModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-semibold transition-all shadow-sm shadow-primary/30"
                  >
                    <UserGroupIcon className="w-4 h-4" />
                    Tạo Lớp Học
                  </button>
                </div>
              </div>
            </div>

            {/* ── Chapters Section ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Nội dung chương trình
                </h2>
                <button
                  onClick={() => openChapterModal()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary text-sm font-medium transition-all"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  Thêm Chương
                </button>
              </div>

              {!template?.chapters?.length ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-16 text-center">
                  <BookOpenIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-slate-600 dark:text-slate-400 font-medium mb-1">Chưa có chương nào</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
                    Thêm chương đầu tiên để bắt đầu thiết kế chương trình học.
                  </p>
                  <button
                    onClick={() => openChapterModal()}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    Thêm Chương Đầu Tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedChapters.map((chapter, idx) => {
                    const isExpanded = expandedChapters[chapter.id];
                    const items = chapter.contentItems || [];
                    return (
                      <div
                        key={chapter.id}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Chapter Header */}
                        <div
                          className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
                          onClick={() => toggleChapter(chapter.id)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {chapter.title}
                            </p>
                            {chapter.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {chapter.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                              {items.length} nội dung
                            </span>
                            {/* Reorder buttons */}
                            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={idx === 0 || reorderingChapter}
                                onClick={(e) => { e.stopPropagation(); handleMoveChapter(sortedChapters, idx, "up"); }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                title="Di chuyển lên"
                              >
                                <ChevronUpIcon className="w-4 h-4" />
                              </button>
                              <button
                                disabled={idx === sortedChapters.length - 1 || reorderingChapter}
                                onClick={(e) => { e.stopPropagation(); handleMoveChapter(sortedChapters, idx, "down"); }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                title="Di chuyển xuống"
                              >
                                <ChevronDownIcon className="w-4 h-4" />
                              </button>
                            </div>
                            <Tooltip title="Chỉnh sửa chương">
                              <button
                                onClick={(e) => { e.stopPropagation(); openChapterModal(chapter); }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Popconfirm
                              title="Xóa chương này?"
                              description="Tất cả nội dung trong chương sẽ bị xóa."
                              onConfirm={(e) => { e?.stopPropagation(); handleDeleteChapter(chapter.id); }}
                              onCancel={(e) => e?.stopPropagation()}
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                            >
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </Popconfirm>
                            <span className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                              <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                            </span>
                          </div>
                        </div>

                        {/* Chapter Content Items */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 dark:border-slate-700">
                            {items.length === 0 ? (
                              <div className="px-5 py-6 text-center">
                                <p className="text-sm text-slate-400 dark:text-slate-500">
                                  Chương này chưa có nội dung.
                                </p>
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {(() => {
                                  const sortedItems = [...items].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
                                  return sortedItems.map((item, itemIdx) => {
                                  const cfg = ITEM_TYPE_CONFIG[item.itemType] || ITEM_TYPE_CONFIG.LESSON;
                                  const { Icon } = cfg;
                                  const itemTitle =
                                    item.lessonTemplateTitle ||
                                    item.quizTemplateTitle ||
                                    item.assignmentTemplateTitle ||
                                    "Chưa có tiêu đề";
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 group transition-colors"
                                    >
                                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.badgeClass}`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                          {itemTitle}
                                        </p>
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.badgeClass}`}>
                                        {cfg.label}
                                      </span>
                                      <div className="flex items-center gap-0.5">
                                        {/* Reorder buttons */}
                                        <button
                                          disabled={itemIdx === 0 || reorderingItem}
                                          onClick={() => handleMoveContentItem(chapter.id, sortedItems, itemIdx, "up")}
                                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                          title="Di chuyển lên"
                                        >
                                          <ChevronUpIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          disabled={itemIdx === sortedItems.length - 1 || reorderingItem}
                                          onClick={() => handleMoveContentItem(chapter.id, sortedItems, itemIdx, "down")}
                                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                          title="Di chuyển xuống"
                                        >
                                          <ChevronDownIcon className="w-3.5 h-3.5" />
                                        </button>
                                        {/* Edit / Delete */}
                                        {(item.lessonTemplateId || item.quizTemplateId) && (
                                          <Tooltip title="Chỉnh sửa nội dung">
                                            <button
                                              onClick={() => navigateToContentItem(item, chapter.id)}
                                              className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                            >
                                              <PencilSquareIcon className="w-3.5 h-3.5" />
                                            </button>
                                          </Tooltip>
                                        )}
                                        <Popconfirm
                                          title="Xóa nội dung này?"
                                          onConfirm={() => handleDeleteContentItem(chapter.id, item.id)}
                                          okText="Xóa"
                                          cancelText="Hủy"
                                          okButtonProps={{ danger: true }}
                                        >
                                          <button className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <TrashIcon className="w-3.5 h-3.5" />
                                          </button>
                                        </Popconfirm>
                                      </div>
                                    </div>
                                  );
                                  });
                                })()}
                              </div>
                            )}
                            <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-700/20">
                              <button
                                onClick={() => openContentTypeModal(chapter.id)}
                                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                              >
                                <PlusCircleIcon className="w-4 h-4" />
                                Thêm nội dung
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add chapter button at bottom */}
                  <button
                    onClick={() => openChapterModal()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-all"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                    Thêm chương mới
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Chapter Modal ── */}
      <Modal
        title={editingChapter ? "Chỉnh sửa chương" : "Thêm chương mới"}
        open={chapterModalOpen}
        onCancel={() => setChapterModalOpen(false)}
        onOk={() => chapterForm.submit()}
        confirmLoading={chapterSubmitting}
        okText={editingChapter ? "Cập nhật" : "Thêm chương"}
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={chapterForm} layout="vertical" onFinish={handleChapterSubmit} className="mt-4">
          <Form.Item
            label="Tên chương"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tên chương" }]}
          >
            <Input placeholder="Ví dụ: Giới thiệu Java và OOP" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về nội dung của chương..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Content Type Selector Modal ── */}
      <Modal
        title="Chọn loại nội dung"
        open={contentTypeModalOpen}
        onCancel={() => setContentTypeModalOpen(false)}
        footer={null}
        width={420}
      >
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Chọn loại nội dung bạn muốn thêm vào chương này:
        </p>
        <div className="space-y-2">
          {[
            { type: "LESSON", desc: "Bài giảng có video, nội dung, tài liệu đính kèm" },
            { type: "QUIZ", desc: "Bài kiểm tra trắc nghiệm từ ngân hàng câu hỏi" },
            { type: "ASSIGNMENT", desc: "Bài tập yêu cầu sinh viên nộp bài" },
          ].map(({ type, desc }) => {
            const cfg = ITEM_TYPE_CONFIG[type];
            const { Icon } = cfg;
            return (
              <button
                key={type}
                onClick={() => handleSelectContentType(type)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all text-left group ${cfg.badgeClass.replace("text-", "hover:").replace("bg-", "bg-")}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.badgeClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                    {cfg.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-primary ml-auto transition-colors" />
              </button>
            );
          })}
        </div>
      </Modal>

      {/* ── Create Class Section Modal ── */}
      <Modal
        title={
          <div>
            <p className="font-semibold text-lg">Tạo Lớp Học Mới</p>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Từ template: <span className="font-medium text-primary">{template?.name}</span>
            </p>
          </div>
        }
        open={classModalOpen}
        onCancel={() => setClassModalOpen(false)}
        onOk={() => classForm.submit()}
        confirmLoading={classSubmitting}
        okText="Tạo Lớp"
        cancelText="Hủy"
        width={520}
        destroyOnHidden
      >
        <Form form={classForm} layout="vertical" onFinish={handleCreateClass} className="mt-4">
          <Form.Item
            label="Tên lớp học"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tên lớp" }]}
          >
            <Input placeholder="Ví dụ: Lớp Java Backend - K12" />
          </Form.Item>
          {/* Teams-style class code display */}
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mã lớp học</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Chia sẻ mã này để học viên có thể tham gia trực tiếp vào lớp.
            </p>
            {generatedCode ? (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
                <p className="text-2xl font-black tracking-widest text-primary font-mono mb-3 select-all">
                  {generatedCode}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Tooltip title="Tạo mã mới">
                    <button
                      type="button"
                      onClick={() => setGeneratedCode(generateRandomCode())}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                      Đặt lại
                    </button>
                  </Tooltip>
                  <Tooltip title="Xóa mã (học viên không thể tham gia bằng mã)">
                    <button
                      type="button"
                      onClick={() => setGeneratedCode(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </Tooltip>
                  <Tooltip title="Sao chép mã">
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(generatedCode); message.success("Đã sao chép mã!"); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      Sao chép
                    </button>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex items-center justify-between">
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">Không sử dụng mã lớp</p>
                <button
                  type="button"
                  onClick={() => setGeneratedCode(generateRandomCode())}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Tạo mã
                </button>
              </div>
            )}
          </div>
          <Form.Item
            label="Thời gian diễn ra"
            name="dates"
            rules={[{ required: true, message: "Vui lòng chọn thời gian" }]}
          >
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>
          <Form.Item label="Mô tả (tùy chọn)" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả thêm về lớp học này..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
