import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  PlusIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { useParams, useNavigate } from "react-router-dom";
import {
  getClassChapters,
  getClassContentItems,
  deleteClassChapter,
  deleteClassContentItem,
  createClassChapter,
  overrideClassChapter,
  overrideClassContentItem,
  updateClassChapter,
  updateClassContentItem,
} from "../../api/classSection";
import { App, Spin, Alert, Dropdown, Modal, Form, Input, DatePicker, Switch } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const canManageRole = (role) => role === "TEACHER" || role === "ADMIN";

export default function CourseContent({ enrollmentStatus = null }) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { id: classSectionId } = useParams();
  const navigate = useNavigate();

  const userRole = user?.role;
  const canManage = canManageRole(userRole);
  const isStudentNotApproved = userRole === "STUDENT" && enrollmentStatus !== "APPROVED";

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

  useEffect(() => {
    fetchChapters();
  }, [classSectionId]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await getClassChapters(classSectionId);
      const data = response.data || response;
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
      const data = response.data || response;
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        : [];
      setChapterItems((prev) => ({ ...prev, [chapterId]: sorted }));
    } catch (err) {
      message.error("Lỗi khi tải danh sách nội dung: " + err.message);
    } finally {
      setLoadingItems((prev) => ({ ...prev, [chapterId]: false }));
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
      message.error("Lỗi khi sắp xếp chương");
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

    const newItems = [...items];
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    setChapterItems((prev) => ({ ...prev, [chapterId]: newItems }));
    setReorderingItem(true);

    try {
      await Promise.all([
        overrideClassContentItem(classSectionId, newItems[index].id, { orderIndex: index }),
        overrideClassContentItem(classSectionId, newItems[swapIndex].id, { orderIndex: swapIndex }),
      ]);
    } catch (err) {
      message.error("Lỗi khi sắp xếp nội dung");
      fetchChapterItems(chapterId);
    } finally {
      setReorderingItem(false);
    }
  };

  // ── Item click navigation (FIXED: use lessonId / quizId) ──────────────────
  const handleClickItem = (item) => {
    if (isStudentNotApproved) {
      message.warning("Vui lòng chờ giáo viên duyệt đơn đăng ký để truy cập nội dung.");
      return;
    }

    const role = userRole?.toLowerCase();

    if (item.itemType === "LESSON") {
      const lectureId = item.lessonId || item.id;
      if (userRole === "STUDENT") {
        navigate(`/class-sections/${classSectionId}/lectures/${lectureId}`, {
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
        navigate(`/class-sections/${classSectionId}/quizzes/${quizId}/detail`, {
          state: { classContentItemId: item.id },
        });
      } else {
        navigate(`/${role}/class-sections/${classSectionId}/quizzes/${quizId}`, {
          state: { classContentItemId: item.id },
        });
      }
    }
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
      message.success("Thêm chương thành công");
      setCreateChapterModal(false);
      createChapterForm.resetFields();
      fetchChapters();
    } catch (err) {
      message.error(err.response?.data?.message || "Lỗi khi thêm chương");
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
      message.success("Cập nhật chương thành công");
      setEditChapterModal({ visible: false, chapter: null });
      fetchChapters();
    } catch (err) {
      message.error(err.response?.data?.message || "Lỗi khi cập nhật chương");
    } finally {
      setSavingChapter(false);
    }
  };

  // ── Edit content item ─────────────────────────────────────────────────────
  const handleOpenEditItem = (e, chapterId, item) => {
    e.stopPropagation();
    editItemForm.setFieldsValue({
      title: item.title,
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
        title: values.title,
        hidden: values.hidden,
        locked: values.locked,
        availableFrom: values.availableFrom?.toISOString() || null,
        availableTo: values.availableTo?.toISOString() || null,
      });
      message.success("Cập nhật nội dung thành công");
      setEditItemModal({ visible: false, item: null, chapterId: null });
      if (editItemModal.chapterId) {
        fetchChapterItems(editItemModal.chapterId);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Lỗi khi cập nhật nội dung");
    } finally {
      setSavingItem(false);
    }
  };

  // ── Delete handlers ───────────────────────────────────────────────────────
  const handleDeleteItem = async (chapterId, itemId) => {
    try {
      setDeletingItem(itemId);
      await deleteClassContentItem(classSectionId, itemId);
      message.success("Xóa nội dung thành công");
      fetchChapterItems(chapterId);
    } catch (err) {
      message.error(err.message || "Lỗi khi xóa nội dung");
    } finally {
      setDeletingItem(null);
    }
  };

  const confirmDeleteChapter = async () => {
    try {
      setDeleting(true);
      await deleteClassChapter(classSectionId, deleteChapterId);
      message.success("Xóa chương thành công");
      setDeleteChapterId(null);
      fetchChapters();
    } catch (err) {
      message.error(err.message || "Lỗi khi xóa chương");
    } finally {
      setDeleting(false);
    }
  };

  // ── Chapter dropdown menu ─────────────────────────────────────────────────
  const getChapterMenuItems = (chapter) => {
    const role = userRole?.toLowerCase();
    return [
      {
        key: "edit",
        label: "Chỉnh sửa chương",
        icon: <PencilSquareIcon className="h-4 w-4" />,
        onClick: ({ domEvent }) => handleOpenEditChapter(domEvent, chapter),
      },
      { type: "divider" },
      {
        key: "add-lecture",
        label: "Thêm bài giảng",
        onClick: () =>
          navigate(`/${role}/class-sections/${classSectionId}/chapters/${chapter.id}/lectures/create`),
      },
      {
        key: "add-quiz",
        label: "Thêm bài kiểm tra",
        onClick: () =>
          navigate(`/${role}/class-sections/${classSectionId}/chapters/${chapter.id}/quizzes/create`),
      },
      { type: "divider" },
      {
        key: "delete",
        label: "Xóa chương",
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
          label: "Bài giảng",
          icon: "description",
          bg: "bg-blue-100 dark:bg-blue-900/30",
          text: "text-blue-600 dark:text-blue-400",
        };
      case "QUIZ":
        return {
          label: "Bài kiểm tra",
          icon: "quiz",
          bg: "bg-orange-100 dark:bg-orange-900/30",
          text: "text-orange-600 dark:text-orange-400",
        };
      case "ASSIGNMENT":
        return {
          label: "Bài tập",
          icon: "assignment",
          bg: "bg-green-100 dark:bg-green-900/30",
          text: "text-green-600 dark:text-green-400",
        };
      default:
        return {
          label: itemType || "Nội dung",
          icon: "article",
          bg: "bg-gray-100 dark:bg-gray-700",
          text: "text-gray-600 dark:text-gray-400",
        };
    }
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
      <Alert message="Không thể tải nội dung" description={error} type="error" showIcon className="my-4" />
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#111418] dark:text-white">
          Nội dung lớp học
        </h2>
        {canManage && (
          <button
            onClick={() => setCreateChapterModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Thêm chương</span>
          </button>
        )}
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
                  className={`flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    isExpanded ? "bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-gray-700" : ""
                  }`}
                >
                  {/* Left: expand toggle + title */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        isExpanded
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
                    {canManage && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveChapter(chapterIndex, "up");
                          }}
                          disabled={chapterIndex === 0 || reorderingChapter}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                          title="Di chuyển lên"
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
                          title="Di chuyển xuống"
                        >
                          <ChevronDownIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {canManage && (
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
                      className={`material-symbols-outlined text-gray-400 transition-transform duration-300 select-none ${
                        isExpanded ? "rotate-180" : ""
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
                          const tc = getTypeConfig(item.itemType);
                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3 transition-all ${
                                isStudentNotApproved
                                  ? "opacity-70 cursor-not-allowed"
                                  : "hover:shadow-sm hover:border-primary/30 cursor-pointer"
                              }`}
                              onClick={() => handleClickItem(item)}
                            >
                              {/* Type icon */}
                              <div className={`p-2 rounded-lg shrink-0 ${tc.bg}`}>
                                <span className={`material-symbols-outlined text-lg leading-none ${tc.text}`}>
                                  {tc.icon}
                                </span>
                              </div>

                              {/* Title + badges */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-[#111418] dark:text-white truncate">
                                  {item.title || "Không xác định"}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{tc.label}</span>
                                  {item.hidden && (
                                    <span className="text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
                                      Ẩn
                                    </span>
                                  )}
                                  {item.locked && (
                                    <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                                      Khóa
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions (teacher/admin only) */}
                              {canManage && (
                                <div
                                  className="flex items-center gap-0.5 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveItem(chapter.id, itemIndex, "up");
                                    }}
                                    disabled={itemIndex === 0 || reorderingItem}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                    title="Di chuyển lên"
                                  >
                                    <ChevronUpIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveItem(chapter.id, itemIndex, "down");
                                    }}
                                    disabled={itemIndex === items.length - 1 || reorderingItem}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                    title="Di chuyển xuống"
                                  >
                                    <ChevronDownIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenEditItem(e, chapter.id, item)}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                                    title="Chỉnh sửa"
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      Modal.confirm({
                                        title: "Xác nhận xóa nội dung",
                                        icon: <ExclamationCircleOutlined />,
                                        content: `Xóa "${item.title}"?`,
                                        okText: "Xóa",
                                        cancelText: "Hủy",
                                        okButtonProps: { danger: true },
                                        onOk: () => handleDeleteItem(chapter.id, item.id),
                                      });
                                    }}
                                    disabled={deletingItem === item.id}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50"
                                    title="Xóa"
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
                          Chương này chưa có nội dung nào
                        </p>
                        {canManage && (
                          <div className="flex justify-center gap-3 flex-wrap">
                            <button
                              onClick={() =>
                                navigate(
                                  `/${userRole.toLowerCase()}/class-sections/${classSectionId}/chapters/${chapter.id}/lectures/create`
                                )
                              }
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              + Thêm bài giảng
                            </button>
                            <button
                              onClick={() =>
                                navigate(
                                  `/${userRole.toLowerCase()}/class-sections/${classSectionId}/chapters/${chapter.id}/quizzes/create`
                                )
                              }
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              + Thêm bài kiểm tra
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
              Chưa có chương nào
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {canManage
                ? 'Nhấn "Thêm chương" để bắt đầu thiết lập nội dung lớp học.'
                : "Giáo viên chưa thiết lập nội dung cho lớp học này."}
            </p>
          </div>
        )}
      </div>

      {/* ── Create Chapter Modal ── */}
      <Modal
        title="Thêm chương mới"
        open={createChapterModal}
        onCancel={() => { setCreateChapterModal(false); createChapterForm.resetFields(); }}
        onOk={() => createChapterForm.submit()}
        confirmLoading={creatingChapter}
        okText="Thêm chương"
        cancelText="Hủy"
        centered
      >
        <Form form={createChapterForm} layout="vertical" onFinish={handleCreateChapter} className="mt-4">
          <Form.Item
            label="Tên chương"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tên chương" }]}
          >
            <Input placeholder="Ví dụ: Chương 1 - Giới thiệu" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Nhập mô tả chương (tùy chọn)..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Delete Chapter Modal ── */}
      <Modal
        title="Xác nhận xóa chương"
        open={deleteChapterId !== null}
        onCancel={() => setDeleteChapterId(null)}
        footer={null}
        centered
      >
        <div className="py-2">
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Bạn có chắc chắn muốn xóa chương này? Tất cả nội dung bên trong cũng sẽ bị xóa.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteChapterId(null)}
              disabled={deleting}
              className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              onClick={confirmDeleteChapter}
              disabled={deleting}
              className="px-5 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2 hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-70"
            >
              {deleting ? <Spin size="small" /> : <TrashIcon className="h-4 w-4" />}
              Xóa chương
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Chapter Modal ── */}
      <Modal
        title="Chỉnh sửa chương"
        open={editChapterModal.visible}
        onCancel={() => setEditChapterModal({ visible: false, chapter: null })}
        onOk={() => editChapterForm.submit()}
        confirmLoading={savingChapter}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        centered
      >
        <Form form={editChapterForm} layout="vertical" onFinish={handleSaveChapter} className="mt-4">
          <Form.Item
            label="Tên chương"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tên chương" }]}
          >
            <Input placeholder="Nhập tên chương..." />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Nhập mô tả chương (tùy chọn)..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Edit Content Item Modal ── */}
      <Modal
        title="Chỉnh sửa nội dung"
        open={editItemModal.visible}
        onCancel={() => setEditItemModal({ visible: false, item: null, chapterId: null })}
        onOk={() => editItemForm.submit()}
        confirmLoading={savingItem}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        centered
        width={480}
      >
        <Form form={editItemForm} layout="vertical" onFinish={handleSaveItem} className="mt-4">
          <Form.Item
            label="Tiêu đề"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
          >
            <Input placeholder="Nhập tiêu đề nội dung..." />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Ẩn với học sinh" name="hidden" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Khóa truy cập" name="locked" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item label="Mở từ ngày" name="availableFrom">
            <DatePicker
              className="w-full"
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn ngày bắt đầu (tùy chọn)"
            />
          </Form.Item>
          <Form.Item label="Đến ngày" name="availableTo">
            <DatePicker
              className="w-full"
              showTime
              format="DD/MM/YYYY HH:mm"
              placeholder="Chọn ngày kết thúc (tùy chọn)"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
