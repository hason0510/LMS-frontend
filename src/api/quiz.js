import axiosClient from "./axiosClient";

export async function createQuiz(quizData) {
  const response = await axiosClient.post('quizzes', quizData);
  return response.data;
}

export async function createQuizInChapter(chapterId, quizData) {
  const response = await axiosClient.post(`chapters/${chapterId}/quizzes`, quizData);
  return response.data;
}

export async function getQuizById(id) {
  const response = await axiosClient.get(`quizzes/${id}`);
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

export async function startQuizAttempt(quizId, chapterItemId) {
  const response = await axiosClient.post(`chapterItem/${chapterItemId}/quiz/${quizId}/start`);
  return response.data;
}

export async function getCurrentAttempt(chapterItemId) {
  const response = await axiosClient.get(`chapterItem/${chapterItemId}/quiz/current`);
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

export async function getStudentAttemptsHistory(chapterItemId) {
  const response = await axiosClient.get(`chapterItem/${chapterItemId}/my-attempts`);
  return response.data;
}
