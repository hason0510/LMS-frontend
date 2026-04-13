import axiosClient from "./axiosClient";

// ==========================================
// Curriculum Template Endpoints
// ==========================================

export const createTemplate = async (templateData) => {
  const response = await axiosClient.post('curriculum-templates', templateData);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await axiosClient.delete(`curriculum-templates/${id}`);
  return response.data;
};

export const updateTemplate = async (id, templateData) => {
  const response = await axiosClient.put(`curriculum-templates/${id}`, templateData);
  return response.data;
};

export const getTemplateById = async (id) => {
  const response = await axiosClient.get(`curriculum-templates/${id}`);
  return response.data;
};

export const getTemplates = async (params) => {
  const response = await axiosClient.get('curriculum-templates', {
    params,
  });
  return response.data;
};

// ==========================================
// Chapter Template CRUD
// ==========================================

export const createChapterTemplate = async (templateId, data) => {
  const response = await axiosClient.post(`curriculum-templates/${templateId}/chapters`, data);
  return response.data;
};

export const updateChapterTemplate = async (templateId, chapterId, data) => {
  const response = await axiosClient.put(`curriculum-templates/${templateId}/chapters/${chapterId}`, data);
  return response.data;
};

export const deleteChapterTemplate = async (templateId, chapterId) => {
  const response = await axiosClient.delete(`curriculum-templates/${templateId}/chapters/${chapterId}`);
  return response.data;
};

// ==========================================
// Content Item Template CRUD
// ==========================================

export const createContentItemTemplate = async (templateId, chapterId, data) => {
  const response = await axiosClient.post(`curriculum-templates/${templateId}/chapters/${chapterId}/content-items`, data);
  return response.data;
};

export const updateContentItemTemplate = async (templateId, chapterId, contentItemId, data) => {
  const response = await axiosClient.put(`curriculum-templates/${templateId}/chapters/${chapterId}/content-items/${contentItemId}`, data);
  return response.data;
};

export const deleteContentItemTemplate = async (templateId, chapterId, contentItemId) => {
  const response = await axiosClient.delete(`curriculum-templates/${templateId}/chapters/${chapterId}/content-items/${contentItemId}`);
  return response.data;
};

// ==========================================
// Lesson Template CRUD
// ==========================================

export const createLessonTemplate = async (data) => {
  const response = await axiosClient.post('curriculum-templates/lesson-templates', data);
  return response.data;
};

export const getLessonTemplateById = async (id) => {
  const response = await axiosClient.get(`curriculum-templates/lesson-templates/${id}`);
  return response.data;
};

export const updateLessonTemplate = async (id, data) => {
  const response = await axiosClient.put(`curriculum-templates/lesson-templates/${id}`, data);
  return response.data;
};

// ==========================================
// Quiz Template CRUD
// ==========================================

export const createQuizTemplate = async (data) => {
  const response = await axiosClient.post('curriculum-templates/quiz-templates', data);
  return response.data;
};

export const getQuizTemplateById = async (id) => {
  const response = await axiosClient.get(`curriculum-templates/quiz-templates/${id}`);
  return response.data;
};

export const updateQuizTemplate = async (id, data) => {
  const response = await axiosClient.put(`curriculum-templates/quiz-templates/${id}`, data);
  return response.data;
};
