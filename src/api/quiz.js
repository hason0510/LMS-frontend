//const API_URL = "http://localhost:8080/api/v1/lms/quizzes";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms/quizzes`;

export async function createQuiz(quizData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(quizData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create quiz");
  }

  return await response.json();
}

export async function createQuizInChapter(chapterId, quizData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${BACKEND_URL}/api/v1/lms/chapters/${chapterId}/quizzes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(quizData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create quiz in chapter");
  }

  return await response.json();
}

export async function getQuizById(id) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch quiz");
  }

  return await response.json();
}

export async function updateQuiz(id, quizData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(quizData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update quiz");
  }

  return await response.json();
}

export async function deleteQuiz(id) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete quiz");
  }

  if (response.status === 204) {
    return { success: true };
  }

  return await response.json();
}

export async function startQuizAttempt(quizId, chapterItemId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${BACKEND_URL}/api/v1/lms/chapterItem/${chapterItemId}/quiz/${quizId}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to start quiz attempt");
  }

  return await response.json();
}

export async function getCurrentAttempt(chapterItemId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${BACKEND_URL}/api/v1/lms/chapterItem/${chapterItemId}/quiz/current`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // If 404, it might mean no attempt is in progress, which could be valid.
    if(response.status === 404) return null;
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to get current attempt");
  }

  return await response.json();
}

export async function submitAnswer(attemptId, questionId, answerData) {
  const token = localStorage.getItem("accessToken");
  // answerData: { selectedAnswerIds: [], textAnswer: "" }
  const response = await fetch(`${BACKEND_URL}/api/v1/lms/quiz-attempts/${attemptId}/question/${questionId}/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(answerData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to submit answer");
  }

  return true;
}

export async function submitQuiz(attemptId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${BACKEND_URL}/api/v1/lms/quiz-attempts/${attemptId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to submit quiz");
  }

  return await response.json();
}

export async function getAttemptDetail(attemptId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${BACKEND_URL}/api/v1/lms/quiz-attempts/${attemptId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to get attempt detail");
  }

  return await response.json();
}

export async function getStudentAttemptsHistory(chapterItemId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${BACKEND_URL}/api/v1/lms/chapterItem/${chapterItemId}/my-attempts`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to get attempts history");
  }

  return await response.json();
}
