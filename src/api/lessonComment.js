const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms`;

export async function getCommentsByLesson(lectureId, pageNumber = 1, pageSize = 20) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/lessons/${lectureId}/comments?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }

  return await response.json();
}

export async function createComment(lectureId, commentData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/lessons/${lectureId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: commentData.content,
      parentId: null, // Không là reply
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create comment");
  }

  return await response.json();
}

export async function replyComment(parentCommentId, replyData) {
  const token = localStorage.getItem("accessToken");
  // Gọi API thêm comment nhưng với parentId
  const lessonId = replyData.lessonId; // Cần truyền lessonId từ component

  const response = await fetch(`${API_URL}/lessons/${lessonId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: replyData.content,
      parentId: parentCommentId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to reply comment");
  }

  return await response.json();
}

export async function updateComment(commentId, commentData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: commentData.content,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update comment");
  }

  return await response.json();
}

export async function deleteComment(commentId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/comments/${commentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete comment");
  }

  return await response.json();
}
