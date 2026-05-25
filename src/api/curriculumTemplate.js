import axiosClient from "./axiosClient";
import { unwrapListPayload, unwrapPayload } from "./responseAdapter";

// ==========================================
// Curriculum Template Endpoints
// ==========================================

export const createTemplate = async (templateData) => {
  const response = await axiosClient.post('curriculum-templates', templateData);
  return unwrapPayload(response);
};

export const deleteTemplate = async (id) => {
  await axiosClient.delete(`curriculum-templates/${id}`);
};

export const updateTemplate = async (id, templateData) => {
  const response = await axiosClient.put(`curriculum-templates/${id}`, templateData);
  return unwrapPayload(response);
};

export const getTemplateById = async (id) => {
  const response = await axiosClient.get(`curriculum-templates/${id}`);
  return unwrapPayload(response);
};

export const getTemplates = async (params) => {
  const response = await axiosClient.get('curriculum-templates', {
    params,
  });
  return unwrapListPayload(response);
};

// ==========================================
// Chapter Template CRUD
// ==========================================

export const createChapterTemplate = async (templateId, data) => {
  const response = await axiosClient.post(`curriculum-templates/${templateId}/chapters`, data);
  return unwrapPayload(response);
};

export const updateChapterTemplate = async (templateId, chapterId, data) => {
  const response = await axiosClient.put(`curriculum-templates/${templateId}/chapters/${chapterId}`, data);
  return unwrapPayload(response);
};

export const deleteChapterTemplate = async (templateId, chapterId) => {
  await axiosClient.delete(`curriculum-templates/${templateId}/chapters/${chapterId}`);
};

// ==========================================
// Content Item Template CRUD
// ==========================================

export const createContentItemTemplate = async (templateId, chapterId, data) => {
  const response = await axiosClient.post(`curriculum-templates/${templateId}/chapters/${chapterId}/content-items`, data);
  return unwrapPayload(response);
};

export const updateContentItemTemplate = async (templateId, chapterId, contentItemId, data) => {
  const response = await axiosClient.put(`curriculum-templates/${templateId}/chapters/${chapterId}/content-items/${contentItemId}`, data);
  return unwrapPayload(response);
};

export const deleteContentItemTemplate = async (templateId, chapterId, contentItemId) => {
  await axiosClient.delete(`curriculum-templates/${templateId}/chapters/${chapterId}/content-items/${contentItemId}`);
};

// ==========================================
// Lesson Template CRUD
// ==========================================

export const createLessonTemplate = async (data) => {
  const response = await axiosClient.post('curriculum-templates/lesson-templates', data);
  return unwrapPayload(response);
};

export const getLessonTemplateById = async (id) => {
  const response = await axiosClient.get(`curriculum-templates/lesson-templates/${id}`);
  return unwrapPayload(response);
};

export const updateLessonTemplate = async (id, data) => {
  const response = await axiosClient.put(`curriculum-templates/lesson-templates/${id}`, data);
  return unwrapPayload(response);
};

// ==========================================
// Quiz Template CRUD
// ==========================================

export const createQuizTemplate = async (data) => {
  const response = await axiosClient.post('curriculum-templates/quiz-templates', data);
  return unwrapPayload(response);
};

export const getQuizTemplateById = async (id) => {
  const response = await axiosClient.get(`curriculum-templates/quiz-templates/${id}`);
  return unwrapPayload(response);
};

export const getQuizTemplatePreviewSample = async (id, seed) => {
  const response = await axiosClient.get(`curriculum-templates/quiz-templates/${id}/preview-sample`, {
    params: seed == null ? {} : { seed },
  });
  return unwrapPayload(response);
};

export const updateQuizTemplate = async (id, data) => {
  const response = await axiosClient.put(`curriculum-templates/quiz-templates/${id}`, data);
  return unwrapPayload(response);
};
