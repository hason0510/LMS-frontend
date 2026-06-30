import React, { useCallback, useEffect, useState } from "react";
import { Input, Button, Spin, message, Empty, App, Dropdown } from "antd";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  getCommentsByLesson,
  createComment,
  replyComment,
  updateComment,
  deleteComment,
} from "../../api/lessonComment";
import { SendOutlined, MoreOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import useUserStore from "../../store/useUserStore";
import UserIdentity from "../common/UserIdentity";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

export default function LessonComments({ lectureId, classSectionId = null, previewMode = false, readOnlyReason = null }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const accessToken = useUserStore((state) => state.accessToken);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const isReadOnly = previewMode || Boolean(readOnlyReason);
  
  const { modal } = App.useApp();

  const fetchComments = useCallback(async () => {
    if (!lectureId) return;
    try {
      setLoading(true);
      const response = await getCommentsByLesson(lectureId, 1, 20, classSectionId);
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
      message.error(t("lessonComments.errors.loadFailed"));
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [lectureId, classSectionId, t]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!lectureId || !accessToken) {
      return undefined;
    }

    const socket = new SockJS(`${BACKEND_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
    });

    client.onConnect = () => {
      client.subscribe(`/topic/lessons/${lectureId}/comments`, () => {
        fetchComments();
      });
    };

    client.onStompError = (frame) => {
      console.error("Comment STOMP error:", frame.headers?.message, frame.body);
    };

    client.onWebSocketError = (event) => {
      console.error("Comment WebSocket error:", event);
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [lectureId, accessToken, fetchComments]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      message.error(t("lessonComments.errors.emptyComment"));
      return;
    }

    try {
      setSubmitting(true);
      await createComment(lectureId, {
        content: commentText,
      });
      message.success(t("lessonComments.messages.created"));
      setCommentText("");
      setShowCommentForm(false);
      fetchComments();
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || t("lessonComments.errors.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyComment = async () => {
    if (!replyText.trim()) {
      message.error(t("lessonComments.errors.emptyReply"));
      return;
    }

    try {
      setSubmitting(true);
      await replyComment(replyingTo, {
        content: replyText,
        lessonId: lectureId,
      });
      message.success(t("lessonComments.messages.replied"));
      setReplyText("");
      setReplyingTo(null);
      fetchComments();
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || t("lessonComments.errors.replyFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) {
      message.error(t("lessonComments.errors.emptyComment"));
      return;
    }

    try {
      setSubmitting(true);
      await updateComment(commentId, {
        content: editCommentText,
      });
      message.success(t("lessonComments.messages.updated"));
      setEditingCommentId(null);
      setEditCommentText("");
      fetchComments();
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || t("lessonComments.errors.updateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    modal.confirm({
      title: t("lessonComments.confirmRevoke.title"),
      content: t("lessonComments.confirmRevoke.content"),
      okText: t("lessonComments.actions.revoke"),
      okType: "danger",
      cancelText: t("lessonComments.actions.cancel"),
      onOk: async () => {
        try {
          await deleteComment(commentId);
          message.success(t("lessonComments.messages.revoked"));
          fetchComments();
        } catch (err) {
          message.error(err?.response?.data?.message || err.message || t("lessonComments.errors.revokeFailed"));
        }
      },
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return t("lessonComments.time.justNow");
    if (diff < 3600000) return t("lessonComments.time.minutesAgo", { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t("lessonComments.time.hoursAgo", { count: Math.floor(diff / 3600000) });
    if (diff < 604800000) return t("lessonComments.time.daysAgo", { count: Math.floor(diff / 86400000) });

    return date.toLocaleDateString(i18n.language === "en" ? "en-US" : "vi-VN");
  };

  // Đếm TỔNG tất cả bình luận, gồm cả reply lồng nhau (không chỉ comment gốc)
  const countAllComments = (list = []) =>
    list.reduce((sum, c) => sum + 1 + countAllComments(c.replies), 0);

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-xl font-bold text-[#111418] dark:text-white">
          {t("lessonComments.title", { count: countAllComments(comments) })}
        </h3>
        {!isReadOnly && user && !showCommentForm ? (
          <Button type="primary" onClick={() => setShowCommentForm(true)} className="shrink-0">
            {t("lessonComments.actions.add")}
          </Button>
        ) : null}
      </div>

      {/* Comment Button / Form */}
      {isReadOnly ? (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg py-2.5 px-4">
            {readOnlyReason || t("lessonComments.previewReadOnly")}
          </div>
        </div>
      ) : user ? (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          {showCommentForm ? (
            <div className="flex gap-3 mb-4">
              <UserIdentity
                user={user}
                variant="student"
                className="flex-shrink-0 items-start"
                avatarSizeClass="size-10"
              />
              <div className="flex-1">
                <Input.TextArea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t("lessonComments.placeholders.comment")}
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
                    {t("lessonComments.actions.cancel")}
                  </Button>
                  <Button
                    type="primary"
                    loading={submitting}
                    onClick={handleSubmitComment}
                    icon={<SendOutlined />}
                  >
                    {t("lessonComments.actions.submit")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center text-gray-500 dark:text-gray-400">
            {t("lessonComments.loginRequired")}
          </div>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : comments.length === 0 ? (
        <Empty description={t("lessonComments.empty")} />
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => {
            const renderCommentNode = (comment, depth = 0) => (
              <div key={comment.commentId} className="space-y-4">
                <div className="flex gap-4">
                  <UserIdentity
                    user={comment}
                    variant="student"
                    className="flex-shrink-0 items-start"
                    avatarSizeClass={depth === 0 ? "size-10" : "size-8"}
                    showText={false}
                    secondaryText={null}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-2.5 dark:border-gray-700/50 dark:bg-gray-800/40">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-semibold text-[#111418] dark:text-white">
                          {comment.fullName || t("lessonComments.unknownUser")}
                        </span>
                        {comment.classRole === "TA" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {t("lessonComments.labels.assistant", "Trợ giảng")}
                          </span>
                        ) : comment.authorRole === "TEACHER" ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {t("lessonComments.labels.instructor", "Giảng viên")}
                          </span>
                        ) : comment.authorRole === "ADMIN" ? (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                            {t("lessonComments.labels.admin", "Quản trị viên")}
                          </span>
                        ) : comment.authorRole === "STUDENT" ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                            {t("lessonComments.labels.student", "Người học")}
                          </span>
                        ) : null}
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-gray-700 dark:text-gray-300 text-sm leading-relaxed m-0 break-words">
                        {comment.isDeleted ? (
                          <span className="italic text-gray-500 dark:text-gray-400">
                            {comment.commentDetail}
                          </span>
                        ) : editingCommentId === comment.commentId ? (
                          <div className="mt-2">
                            <Input.TextArea
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              rows={2}
                              className="mb-2 text-sm"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <Button size="small" onClick={() => setEditingCommentId(null)}>{t("lessonComments.actions.cancel")}</Button>
                              <Button size="small" type="primary" loading={submitting} onClick={() => handleEditComment(comment.commentId)}>{t("lessonComments.actions.save")}</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {comment.commentDetail}
                            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                              <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">{t("lessonComments.labels.edited")}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 mt-1.5 ml-1 text-xs font-medium items-center">
                      {user && !isReadOnly && !comment.isDeleted && (
                        <button
                          onClick={() => setReplyingTo(comment.commentId)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          {t("lessonComments.actions.reply")}
                        </button>
                      )}
                      {user && !isReadOnly && user.id === comment.userId && !comment.isDeleted && (
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: "edit",
                                icon: <EditOutlined />,
                                label: t("lessonComments.actions.edit"),
                                onClick: () => {
                                  setEditingCommentId(comment.commentId);
                                  setEditCommentText(comment.commentDetail);
                                },
                              },
                              {
                                key: "delete",
                                icon: <DeleteOutlined className="text-red-500" />,
                                label: <span className="text-red-500">{t("lessonComments.actions.revoke")}</span>,
                                onClick: () => handleDeleteComment(comment.commentId),
                              },
                            ],
                          }}
                          trigger={["click"]}
                          placement="bottomRight"
                        >
                          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center justify-center p-1 -ml-1 rounded">
                            <MoreOutlined />
                          </button>
                        </Dropdown>
                      )}
                    </div>

                    {replyingTo === comment.commentId && user && !isReadOnly && (
                      <div className="mt-3">
                        <div className="flex gap-3">
                          <UserIdentity
                            user={user}
                            variant="student"
                            className="flex-shrink-0 items-start"
                            avatarSizeClass="size-8"
                            showText={false}
                          />
                          <div className="flex-1">
                            <Input.TextArea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={t("lessonComments.placeholders.reply")}
                              rows={2}
                              className="text-sm"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <Button
                                size="small"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                }}
                              >
                                {t("lessonComments.actions.cancel")}
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                loading={submitting}
                                onClick={handleReplyComment}
                                icon={<SendOutlined />}
                              >
                                {t("lessonComments.actions.reply")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 space-y-4 pt-2 pl-4 border-l-2 border-gray-100 dark:border-gray-700/60">
                    {comment.replies.map((reply) => renderCommentNode(reply, depth + 1))}
                  </div>
                )}
              </div>
            );

            return renderCommentNode(comment, 0);
          })}
        </div>
      )}
    </div>
  );
}
