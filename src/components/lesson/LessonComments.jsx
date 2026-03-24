import React, { useState, useEffect } from "react";
import { Input, Button, Avatar, Spin, message, Empty } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCommentsByLesson,
  createComment,
  replyComment,
} from "../../api/lessonComment";
import { SendOutlined } from "@ant-design/icons";

export default function LessonComments({ lectureId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [lectureId]);

  const fetchComments = async () => {
    if (!lectureId) return;
    try {
      setLoading(true);
      const response = await getCommentsByLesson(lectureId);
      // Response có cấu trúc: { data: { content: [...] } } từ PageResponse
      const commentsList = response.data.pageList;
    //   const commentsList = pageData.content
    //     ? pageData.content
    //     : Array.isArray(pageData)
    //     ? pageData
    //     : [];
      setComments(commentsList);
    } catch (err) {
      console.error("Error fetching comments:", err);
      message.error("Lỗi khi tải bình luận");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      message.error("Vui lòng nhập bình luận");
      return;
    }

    try {
      setSubmitting(true);
      await createComment(lectureId, {
        content: commentText,
      });
      message.success("Bình luận thành công");
      setCommentText("");
      setShowCommentForm(false);
      await fetchComments();
    } catch (err) {
      message.error(err.message || "Lỗi khi gửi bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyComment = async () => {
    if (!replyText.trim()) {
      message.error("Vui lòng nhập phản hồi");
      return;
    }

    try {
      setSubmitting(true);
      await replyComment(replyingTo, {
        content: replyText,
        lessonId: lectureId,
      });
      message.success("Phản hồi thành công");
      setReplyText("");
      setReplyingTo(null);
      await fetchComments();
    } catch (err) {
      message.error(err.message || "Lỗi khi gửi phản hồi");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "vừa xong";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;

    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <h3 className="text-xl font-bold text-[#111418] dark:text-white mb-6">
        Bình luận ({comments.length})
      </h3>

      {/* Comment Button / Form */}
      {user ? (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          {!showCommentForm ? (
            <Button
              type="primary"
              size="large"
              onClick={() => setShowCommentForm(true)}
              className="w-full"
            >
              Thêm bình luận mới
            </Button>
          ) : (
            <div className="flex gap-3 mb-4">
              <Avatar
                size={40}
                src={user.avatar}
                name={user.fullName}
                className="flex-shrink-0"
              >
                {user.fullName?.charAt(0)}
              </Avatar>
              <div className="flex-1">
                <Input.TextArea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Chia sẻ suy nghĩ của bạn..."
                  rows={3}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    onClick={() => {
                      setCommentText("");
                      setShowCommentForm(false);
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="primary"
                    loading={submitting}
                    onClick={handleSubmitComment}
                    icon={<SendOutlined />}
                  >
                    Bình luận
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center text-gray-500 dark:text-gray-400">
            Vui lòng đăng nhập để bình luận
          </div>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : comments.length === 0 ? (
        <Empty description="Chưa có bình luận nào" />
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.commentId} className="space-y-4">
              {/* Main Comment */}
              <div className="flex gap-4">
                <Avatar
                  size={40}
                  src={comment.avatar}
                  className={`flex-shrink-0 ${!comment.avatar ? "bg-primary" : ""}`}
                >
                  {comment.fullName?.charAt(0) || "U"}
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-[#111418] dark:text-white">
                        {comment.fullName || "Người dùng"}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {comment.commentDetail}
                    </p>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs font-medium">
                    {user && (
                      <button
                        onClick={() => setReplyingTo(comment.commentId)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Phản hồi
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.commentId && user && (
                <div className="ml-12 mb-4">
                  <div className="flex gap-3">
                    <Avatar
                      size={32}
                      src={user.avatar}
                      className="flex-shrink-0"
                    >
                      {user.fullName?.charAt(0)}
                    </Avatar>
                    <div className="flex-1">
                      <Input.TextArea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập phản hồi..."
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button
                          size="small"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                        >
                          Hủy
                        </Button>
                        <Button
                          type="primary"
                          size="small"
                          loading={submitting}
                          onClick={handleReplyComment}
                          icon={<SendOutlined />}
                        >
                          Phản hồi
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-4 pt-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.commentId} className="flex gap-3">
                      <Avatar
                        size={32}
                        src={reply.avatar}
                        className={`flex-shrink-0 ${!reply.avatar ? "bg-primary" : ""}`}
                      >
                        {reply.fullName?.charAt(0) || "U"}
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-semibold text-sm text-[#111418] dark:text-white">
                              {reply.fullName || "Người dùng"}
                            </h5>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {reply.commentDetail}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
