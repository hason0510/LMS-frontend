import axiosClient from "./axiosClient";

const isClassContentItemNotFoundError = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || "").toLowerCase();
  return status === 404 && message.includes("class content item");
};

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

export async function startQuizAttempt(quizId, contentItemId) {
  try {
    const response = await axiosClient.post(`class-content-items/${contentItemId}/quiz/${quizId}/start`);
    return response.data;
  } catch (error) {
    if (!isClassContentItemNotFoundError(error)) {
      throw error;
    }
    const legacyResponse = await axiosClient.post(`chapterItem/${contentItemId}/quiz/${quizId}/start`);
    return legacyResponse.data;
  }
}

export async function getCurrentAttempt(contentItemId) {
  try {
    const response = await axiosClient.get(`class-content-items/${contentItemId}/quiz/current`);
    return response.data;
  } catch (error) {
    if (!isClassContentItemNotFoundError(error)) {
      throw error;
    }
    const legacyResponse = await axiosClient.get(`chapterItem/${contentItemId}/quiz/current`);
    return legacyResponse.data;
  }
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

export async function getStudentAttemptsHistory(contentItemId) {
  try {
    const response = await axiosClient.get(`class-content-items/${contentItemId}/my-attempts`);
    return response.data;
  } catch (error) {
    if (!isClassContentItemNotFoundError(error)) {
      throw error;
    }
    const legacyResponse = await axiosClient.get(`chapterItem/${contentItemId}/my-attempts`);
    return legacyResponse.data;
  }
}
