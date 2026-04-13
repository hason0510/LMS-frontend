import axiosClient from "./axiosClient";

export async function getCommentsByLesson(lectureId, pageNumber = 1, pageSize = 20) {
  const response = await axiosClient.get(`lessons/${lectureId}/comments`, {
    params: { pageNumber, pageSize }
  });
  return response.data;
}

export async function createComment(lectureId, commentData) {
  const response = await axiosClient.post(`lessons/${lectureId}/comments`, {
    content: commentData.content,
    parentId: null, // Không là reply
  });
  return response.data;
}

export async function replyComment(parentCommentId, replyData) {
  // Gọi API thêm comment nhưng với parentId
  const lessonId = replyData.lessonId; // Cần truyền lessonId từ component

  const response = await axiosClient.post(`lessons/${lessonId}/comments`, {
    content: replyData.content,
    parentId: parentCommentId,
  });
  return response.data;
}

export async function updateComment(commentId, commentData) {
  const response = await axiosClient.put(`comments/${commentId}`, {
    content: commentData.content,
  });
  return response.data;
}

export async function deleteComment(commentId) {
  const response = await axiosClient.delete(`comments/${commentId}`);
  return response.data;
}
