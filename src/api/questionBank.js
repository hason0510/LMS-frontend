import axiosClient from "./axiosClient";

const unwrapPayload = (response) => response?.data?.data ?? response?.data;

const unwrapArrayPayload = (response) => {
  const payload = unwrapPayload(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.pageList)) return payload.pageList;
  return [];
};

// ==========================================
// Question Bank Management
// ==========================================

export const createQuestionBank = async (bankData) => {
  const response = await axiosClient.post('question-banks', bankData);
  return unwrapPayload(response);
};

export const updateQuestionBank = async (id, bankData) => {
  const response = await axiosClient.put(`question-banks/${id}`, bankData);
  return unwrapPayload(response);
};

export const deleteQuestionBank = async (id) => {
  const response = await axiosClient.delete(`question-banks/${id}`);
  return response.data;
};

export const getQuestionBankById = async (id) => {
  const response = await axiosClient.get(`question-banks/${id}`);
  return unwrapPayload(response);
};

export const getQuestionBanks = async (params) => {
  const response = await axiosClient.get('question-banks', {
    params, // { subjectId, curriculumVersionId, classSectionId, includeQuestions }
  });
  return unwrapArrayPayload(response);
};

// ==========================================
// Bank Question Management
// ==========================================

export const createQuestion = async (bankId, questionData) => {
  const response = await axiosClient.post(`question-banks/${bankId}/questions`, questionData);
  return unwrapPayload(response);
};

export const updateQuestion = async (questionId, questionData) => {
  const response = await axiosClient.put(`question-banks/questions/${questionId}`, questionData);
  return unwrapPayload(response);
};

export const deleteQuestion = async (questionId) => {
  const response = await axiosClient.delete(`question-banks/questions/${questionId}`);
  return response.data;
};

export const importGiftQuestions = async (bankId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post(`question-banks/${bankId}/import-gift`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return unwrapPayload(response);
};

export const exportGiftQuestions = async (bankId) => {
  return axiosClient.get(`question-banks/${bankId}/export-gift`, {
    responseType: "blob",
  });
};

// ==========================================
// Tags Management
// ==========================================

export const createTag = async (bankId, tagData) => {
  const response = await axiosClient.post(`question-banks/${bankId}/tags`, tagData);
  return unwrapPayload(response);
};

export const createTagsBatch = async (bankId, names) => {
  const response = await axiosClient.post(`question-banks/${bankId}/tags/batch`, { names });
  return unwrapArrayPayload(response);
};

export const getTags = async (bankId, params) => {
  const response = await axiosClient.get(`question-banks/${bankId}/tags`, { params });
  return unwrapArrayPayload(response);
};

export const updateTag = async (bankId, tagId, tagData) => {
  const response = await axiosClient.put(`question-banks/${bankId}/tags/${tagId}`, tagData);
  return unwrapPayload(response);
};

export const deleteTag = async (bankId, tagId) => {
  const response = await axiosClient.delete(`question-banks/${bankId}/tags/${tagId}`);
  return response.data;
};

// ==========================================
// Member Management
// ==========================================

export const addMember = async (bankId, memberData) => {
  const response = await axiosClient.post(`question-banks/${bankId}/members`, memberData);
  return unwrapPayload(response);
};

export const updateMemberRole = async (bankId, userId, roleData) => {
  const response = await axiosClient.put(`question-banks/${bankId}/members/${userId}`, roleData);
  return unwrapPayload(response);
};

export const removeMember = async (bankId, userId) => {
  const response = await axiosClient.delete(`question-banks/${bankId}/members/${userId}`);
  return response.data;
};

export const getMembers = async (bankId) => {
  const response = await axiosClient.get(`question-banks/${bankId}/members`);
  return unwrapArrayPayload(response);
};
