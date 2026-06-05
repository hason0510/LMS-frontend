import React, { useCallback, useEffect, useState } from "react";
import { Input, Button, Avatar, Spin, message, Empty } from "antd";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  getCommentsByLesson,
  createComment,
  replyComment,
} from "../../api/lessonComment";
import { SendOutlined } from "@ant-design/icons";
import useUserStore from "../../store/useUserStore";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

export default function LessonComments({ lectureId, previewMode = false, readOnlyReason = null }) {
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
  const isReadOnly = previewMode || Boolean(readOnlyReason);

  const fetchComments = useCallback(async () => {
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
      message.error(t("lessonComments.errors.loadFailed"));
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [lectureId, t]);

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
      connectHeaders: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
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
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || t("lessonComments.errors.replyFailed"));
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
      <h3 className="text-xl font-bold text-[#111418] dark:text-white mb-6">
        {t("lessonComments.title", { count: comments.length })}
      </h3>

      {/* Comment Button / Form */}
      {isReadOnly ? (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg py-2.5 px-4">
            {readOnlyReason || t("lessonComments.previewReadOnly")}
          </div>
        </div>
      ) : user ? (
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          {!showCommentForm ? (
            <Button
              type="primary"
              size="large"
              onClick={() => setShowCommentForm(true)}
              className="w-full"
            >
              {t("lessonComments.actions.add")}
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
          )}
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
                        {comment.fullName || t("lessonComments.unknownUser")}
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
                    {user && !isReadOnly && (
                      <button
                        onClick={() => setReplyingTo(comment.commentId)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t("lessonComments.actions.reply")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.commentId && user && !isReadOnly && (
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
                        placeholder={t("lessonComments.placeholders.reply")}
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
                              {reply.fullName || t("lessonComments.unknownUser")}
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
