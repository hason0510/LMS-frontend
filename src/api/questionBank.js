import axiosClient from "./axiosClient";
import { unwrapListPayload, unwrapPayload } from "./responseAdapter";

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
  await axiosClient.delete(`question-banks/${id}`);
};

export const getQuestionBankById = async (id, params = {}) => {
  const response = await axiosClient.get(`question-banks/${id}`, { params });
  return unwrapPayload(response);
};

export const getQuestionBanks = async (params) => {
  const response = await axiosClient.get('question-banks', {
    params, // { subjectId, curriculumVersionId, classSectionId, includeQuestions }
  });
  return unwrapListPayload(response);
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
  await axiosClient.delete(`question-banks/questions/${questionId}`);
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
  return unwrapListPayload(response);
};

export const getTags = async (bankId, params) => {
  const response = await axiosClient.get(`question-banks/${bankId}/tags`, { params });
  return unwrapListPayload(response);
};

export const updateTag = async (bankId, tagId, tagData) => {
  const response = await axiosClient.put(`question-banks/${bankId}/tags/${tagId}`, tagData);
  return unwrapPayload(response);
};

export const deleteTag = async (bankId, tagId) => {
  await axiosClient.delete(`question-banks/${bankId}/tags/${tagId}`);
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
  await axiosClient.delete(`question-banks/${bankId}/members/${userId}`);
};

export const getMembers = async (bankId) => {
  const response = await axiosClient.get(`question-banks/${bankId}/members`);
  return unwrapListPayload(response);
};
