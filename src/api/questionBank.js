import axiosClient from "./axiosClient";

// ==========================================
// Question Bank Management
// ==========================================

export const createQuestionBank = async (bankData) => {
  const response = await axiosClient.post('question-banks', bankData);
  return response.data;
};

export const updateQuestionBank = async (id, bankData) => {
  const response = await axiosClient.put(`question-banks/${id}`, bankData);
  return response.data;
};

export const getQuestionBankById = async (id) => {
  const response = await axiosClient.get(`question-banks/${id}`);
  return response.data;
};

export const getQuestionBanks = async (params) => {
  const response = await axiosClient.get('question-banks', {
    params, // { subjectId, curriculumVersionId, classSectionId, includeQuestions }
  });
  return response.data;
};

// ==========================================
// Bank Question Management
// ==========================================

export const createQuestion = async (bankId, questionData) => {
  const response = await axiosClient.post(`question-banks/${bankId}/questions`, questionData);
  return response.data;
};

export const updateQuestion = async (questionId, questionData) => {
  const response = await axiosClient.put(`question-banks/questions/${questionId}`, questionData);
  return response.data;
};

export const deleteQuestion = async (questionId) => {
  const response = await axiosClient.delete(`question-banks/questions/${questionId}`);
  return response.data;
};

// ==========================================
// Tags Management
// ==========================================

export const createTag = async (tagData) => {
  const response = await axiosClient.post(`question-banks/tags`, tagData);
  return response.data;
};

export const getTags = async (params) => {
  const response = await axiosClient.get(`question-banks/tags`, {
    params, // { subjectId }
  });
  return response.data;
};

// ==========================================
// Member Management
// ==========================================

export const addMember = async (bankId, memberData) => {
  const response = await axiosClient.post(`question-banks/${bankId}/members`, memberData);
  return response.data;
};

export const updateMemberRole = async (bankId, userId, roleData) => {
  const response = await axiosClient.put(`question-banks/${bankId}/members/${userId}`, roleData);
  return response.data;
};

export const removeMember = async (bankId, userId) => {
  const response = await axiosClient.delete(`question-banks/${bankId}/members/${userId}`);
  return response.data;
};

export const getMembers = async (bankId) => {
  const response = await axiosClient.get(`question-banks/${bankId}/members`);
  return response.data;
};
