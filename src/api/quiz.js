import axiosClient from "./axiosClient";

export async function createQuiz(quizData) {
  const response = await axiosClient.post('quizzes', quizData);
  return response.data;
}

export async function getQuizById(id, classContentItemId = null) {
  const response = await axiosClient.get(`quizzes/${id}`, {
    params: classContentItemId ? { classContentItemId } : {},
  });
  return response.data;
}

export async function getQuizPreviewSample(id, seed) {
  const response = await axiosClient.get(`quizzes/${id}/preview-sample`, {
    params: seed == null ? {} : { seed },
  });
  return response.data;
}

export async function updateQuiz(id, quizData) {
  const response = await axiosClient.put(`quizzes/${id}`, quizData);
  return response.data;
}

export async function deleteQuiz(id) {
  const response = await axiosClient.delete(`quizzes/${id}`);
  return response.data;
}

export async function startQuizAttempt(quizId, contentItemId) {
  const response = await axiosClient.post(`class-content-items/${contentItemId}/quiz/${quizId}/start`);
  return response.data;
}

export async function getCurrentAttempt(contentItemId) {
  const response = await axiosClient.get(`class-content-items/${contentItemId}/quiz/current`);
  return response.data;
}

export async function submitAnswer(attemptId, questionId, answerData) {
  // answerData: { selectedAnswerIds: [], textAnswer: "" }
  await axiosClient.post(`quiz-attempts/${attemptId}/question/${questionId}/answer`, answerData);
  return true;
}

export async function submitQuiz(attemptId) {
  const response = await axiosClient.post(`quiz-attempts/${attemptId}/submit`);
  return response.data;
}

export async function getAttemptDetail(attemptId) {
  const response = await axiosClient.get(`quiz-attempts/${attemptId}`);
  return response.data;
}

export async function getManagedQuizAttempts(params = {}) {
  const response = await axiosClient.get("quiz-attempts/manage", { params });
  return response.data;
}

export async function reviewQuizAttempt(attemptId, reviewData) {
  const response = await axiosClient.put(`quiz-attempts/${attemptId}/review`, reviewData);
  return response.data;
}

// Feed quiz của học viên (trang tổng quan / việc cần làm)
export async function getStudentQuizFeed(params = {}) {
  const response = await axiosClient.get("quizzes/me/feed", { params });
  return response.data;
}

export async function getStudentAttemptsHistory(contentItemId) {
  const response = await axiosClient.get(`class-content-items/${contentItemId}/my-attempts`);
  return response.data;
}

export async function getQuizAttemptsByClassContentItem(classContentItemId, params = {}) {
  const response = await axiosClient.get(`class-content-items/${classContentItemId}/attempts`, { params });
  return response.data;
}
