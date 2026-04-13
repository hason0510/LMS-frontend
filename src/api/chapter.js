import axiosClient from "./axiosClient";

// ── Chapter Management ──────────────────────────────────────────
export const createChapter = async (classId, data) => {
  const response = await axiosClient.post(`chapters/${classId}`, data);
  return response.data;
};

export const getChapterById = async (id) => {
  const response = await axiosClient.get(`chapters/${id}`);
  return response.data;
};

export const getChaptersByCourseId = async (courseId) => {
  const response = await axiosClient.get(`chapters/course/${courseId}`);
  return response.data;
};

export const updateChapter = async (id, data) => {
  const response = await axiosClient.put(`chapters/${id}`, data);
  return response.data;
};

export const deleteChapter = async (id) => {
  const response = await axiosClient.delete(`chapters/${id}`);
  return response.data;
};

export const updateChapterOrder = async (courseId, orderedChapterIds) => {
  const response = await axiosClient.put(`chapters/course/${courseId}/order-chapters`, { orderedChapterIds });
  return response.data;
};

// ── Chapter Items (Lessons/Quizzes in Chapter) ──────────────────
export const getChapterItems = async (chapterId) => {
  const response = await axiosClient.get(`chapters/${chapterId}/items`);
  return response.data;
};

export const getChapterItemsForStudent = async (chapterId) => {
  const response = await axiosClient.get(`chapters/${chapterId}/items/student`);
  return response.data;
};

export const updateChapterItemOrder = async (chapterId, orderedItemIds) => {
  const response = await axiosClient.put(`chapters/${chapterId}/order-items`, { orderedItemIds });
  return response.data;
};

export const deleteChapterItem = async (id) => {
  const response = await axiosClient.delete(`chaptersItems/${id}`);
  return response.data;
};
