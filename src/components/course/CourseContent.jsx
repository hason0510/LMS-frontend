import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { PlusIcon, EllipsisVerticalIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useParams, useNavigate } from "react-router-dom";
import { getChaptersByCourseId, deleteChapter, getChapterItems, updateChapterItemOrder, deleteChapterItem } from "../../api/chapter";
import { Spin, Alert, Dropdown, Modal, message } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

export default function CourseContent({ enrollmentStatus = null }) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  // Check if student is approved
  const isStudentApproved = user?.role === "STUDENT" && enrollmentStatus === "APPROVED";
  const isStudentNotApproved = user?.role === "STUDENT" && enrollmentStatus !== "APPROVED";
  const [deleteChapterId, setDeleteChapterId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [chapterItems, setChapterItems] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteItemId, setDeleteItemId] = useState(null);

  useEffect(() => {
    fetchChapters();
  }, [id]);

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await getChaptersByCourseId(id);
      setChapters(response.data || response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterItems = async (chapterId) => {
    try {
      setLoadingItems(prev => ({ ...prev, [chapterId]: true }));
      const response = await getChapterItems(chapterId);
      setChapterItems(prev => ({ ...prev, [chapterId]: response.data || response }));
    } catch (err) {
      message.error("Lỗi khi tải danh sách bài học: " + err.message);
    } finally {
      setLoadingItems(prev => ({ ...prev, [chapterId]: false }));
    }
  };

  const handleToggleChapter = (chapterId) => {
    if (expandedChapter === chapterId) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(chapterId);
      // Fetch items if not already loaded
      if (!chapterItems[chapterId]) {
        fetchChapterItems(chapterId);
      }
    }
  };

  const handleAddLecture = () => {
    navigate(`/teacher/courses/${id}/lectures/create`);
  };

  const handleAddChapter = () => {
    navigate(`/teacher/courses/${id}/chapters/create`);
  };

  const handleEditLecture = (lectureId) => {
    if (user?.role === "TEACHER") {
      navigate(`/teacher/courses/${id}/lectures/${lectureId}`, { state: { viewMode: true } });
    } else {
      navigate(`/courses/${id}/lectures/${lectureId}`);
    }
  };

  const handleQuizClick = (quizId, chapterItemId) => {
    if (user?.role === "TEACHER" || user?.role === "ADMIN") {
      navigate(`/teacher/courses/${id}/quizzes/${quizId}`);
    } else {
      navigate(`/courses/${id}/quizzes/${quizId}/detail`, { state: { chapterItemId } });
    }
  };

  const handleMoveItem = async (chapterId, itemIndex, direction) => {
    const items = chapterItems[chapterId];
    if (!items) return;

    // Xác định index mới
    const newIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    
    // Kiểm tra có valid không
    if (newIndex < 0 || newIndex >= items.length) {
      return;
    }

    try {
      setUpdatingOrder(chapterId);
      
      // Swap 2 items trong local state
      const newItems = [...items];
      [newItems[itemIndex], newItems[newIndex]] = [newItems[newIndex], newItems[itemIndex]];
      
      // Lấy danh sách ID theo thứ tự mới
      const orderedItemIds = newItems.map(item => item.id);
      
      // Gọi API update order
      await updateChapterItemOrder(chapterId, orderedItemIds);
      
      // Update state
      setChapterItems(prev => ({
        ...prev,
        [chapterId]: newItems
      }));
      
      message.success("Cập nhật thứ tự thành công");
    } catch (err) {
      message.error(err.message || "Lỗi khi cập nhật thứ tự");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleDeleteItem = async (chapterId, itemId) => {
    try {
      setDeletingItem(itemId);
      await deleteChapterItem(itemId);
      message.success("Xóa thành công");
      setDeleteItemId(null);
      // Refresh chapter items
      await fetchChapterItems(chapterId);
    } catch (err) {
      message.error(err.message || "Lỗi khi xóa");
    } finally {
      setDeletingItem(null);
    }
  };

  const handleDeleteChapter = (chapterId) => {
    setDeleteChapterId(chapterId);
  };

  const confirmDeleteChapter = async () => {
    try {
      setDeleting(true);
      await deleteChapter(deleteChapterId);
      message.success("Xóa chương thành công");
      setDeleteChapterId(null);
      fetchChapters();
    } catch (err) {
      message.error(err.message || "Lỗi khi xóa chương");
    } finally {
      setDeleting(false);
    }
  };

  const getChapterMenuItems = (chapterId) => [
    {
      key: "add-lecture",
      label: "Thêm bài giảng",
      onClick: () => {
        navigate(`/teacher/courses/${id}/chapters/${chapterId}/lectures/create`);
      },
    },
    {
      key: "add-quiz",
      label: "Thêm bài kiểm tra",
      onClick: () => {
        navigate(`/teacher/courses/${id}/chapters/${chapterId}/quizzes/create`);
      },
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "Xóa chương",
      danger: true,
      onClick: () => {
        handleDeleteChapter(chapterId);
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert message="Lỗi" description={error} type="error" showIcon />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#111418] dark:text-white">
          Nội dung khóa học
        </h2>
        {user?.role === "TEACHER" && (
          <div className="flex gap-2">
            <button
              onClick={handleAddChapter}
              className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Thêm chương</span>
            </button>
            {/* <button
              onClick={handleAddLecture}
              className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Thêm bài giảng</span>
            </button> */}
          </div>
        )}
      </div>
      <div className="space-y-3">
        {chapters && chapters.length > 0 ? (
          chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div
                onClick={() => handleToggleChapter(chapter.id)}
                className="flex cursor-pointer items-center justify-between p-4 list-none hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="font-semibold text-[#111418] dark:text-white">
                  {chapter.title}
                </span>
                <div className="flex items-center gap-4">
                  {user?.role === "TEACHER" && (
                    <Dropdown
                      menu={{ items: getChapterMenuItems(chapter.id) }}
                      trigger={["click"]}
                      placement="bottomRight"
                    >
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </Dropdown>
                  )}
                  <span 
                    className={`material-symbols-outlined transition-transform ${
                      expandedChapter === chapter.id ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </div>
              </div>
              
              {expandedChapter === chapter.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  {loadingItems[chapter.id] ? (
                    <div className="flex justify-center py-4">
                      <Spin size="small" />
                    </div>
                  ) : chapterItems[chapter.id] && chapterItems[chapter.id].length > 0 ? (
                    <div className="space-y-2">
                      {chapterItems[chapter.id].map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className={`p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-between transition-colors group ${
                            isStudentNotApproved ? "" : "hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                          }`}
                          onClick={() => {
                            if (isStudentNotApproved) {
                              message.warning("Vui lòng chờ giáo viên duyệt đơn đăng ký để truy cập nội dung khóa học.");
                              return;
                            }
                            if (item.type === "LESSON") {
                              handleEditLecture(item.item?.id);
                            } else if (item.type === "QUIZ") {
                              handleQuizClick(item.item?.id, item.id);
                            }
                          }}
                        >
                          <div className="flex-1 flex items-center gap-3">
                            {/* Icon phân biệt loại */}
                            {item.type === "LESSON" ? (
                              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">
                                description
                              </span>
                            ) : (
                              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 flex-shrink-0">
                                quiz
                              </span>
                            )}
                            <div>
                              <p className="font-medium text-[#111418] dark:text-white">
                                {item.item?.title || "Không xác định"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.type === "LESSON" ? "Bài giảng" : "Bài kiểm tra"}
                              </p>
                            </div>
                          </div>
                          
                          {/* Icon di chuyển lên/xuống và xóa (chỉ cho teacher) */}
                          {user?.role === "TEACHER" && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Move up */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveItem(chapter.id, itemIndex, "up");
                                }}
                                disabled={itemIndex === 0 || updatingOrder === chapter.id}
                                className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              >
                                <ChevronUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </button>
                              
                              {/* Move down */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveItem(chapter.id, itemIndex, "down");
                                }}
                                disabled={itemIndex === chapterItems[chapter.id].length - 1 || updatingOrder === chapter.id}
                                className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              >
                                <ChevronDownIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </button>
                              
                              {/* Delete */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteItemId(item.id);
                                  Modal.confirm({
                                    title: "Xác nhận xóa",
                                    icon: <ExclamationCircleOutlined />,
                                    content: `Bạn có chắc chắn muốn xóa ${item.type === "LESSON" ? "bài giảng" : "bài kiểm tra"} này?`,
                                    okText: "Xóa",
                                    cancelText: "Hủy",
                                    okButtonProps: { danger: true },
                                    onOk() {
                                      handleDeleteItem(chapter.id, item.id);
                                    },
                                  });
                                }}
                                disabled={deletingItem === item.id}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              >
                                <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-4">
                      Chương này không có nội dung nào
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Chưa có chương nào được tạo
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        title="Xác nhận xóa chương"
        open={deleteChapterId !== null}
        onCancel={() => setDeleteChapterId(null)}
        footer={null}
        centered
      >
        <p className="mb-6">
          Bạn có chắc chắn muốn xóa chương này? Hành động này không thể hoàn
          tác.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={() => setDeleteChapterId(null)}
            className="px-6 py-2 rounded-lg bg-slate-100 text-slate-700"
            disabled={deleting}
          >
            Hủy
          </button>
          <button
            onClick={confirmDeleteChapter}
            className="px-6 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2"
            disabled={deleting}
          >
            {deleting ? <Spin size="small" /> : "Xóa"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
