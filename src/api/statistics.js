//const API_URL = "http://localhost:8080/api/v1/lms";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms`;
/**
 * Get teacher's enrollment statistics
 */
export async function getTeacherEnrollments(courseId = null, approvalStatus = null, pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  let url = `${API_URL}/teacher/enrollments?pageNumber=${pageNumber}&pageSize=${pageSize}`;
  
  if (courseId) {
    url += `&courseId=${courseId}`;
  }
  if (approvalStatus) {
    url += `&approvalStatus=${approvalStatus}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch enrollments");
  }

  return await response.json();
}

/**
 * Get course grade book (all students' quiz results)
 */
export async function getCourseGradeBook(courseId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses/${courseId}/quiz-grades`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch course grade book");
  }

  return await response.json();
}

/**
 * Get quiz attempts for a specific chapter item
 */
export async function getQuizAttempts(chapterItemId, pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/chapterItem/${chapterItemId}/attempts?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch quiz attempts");
  }

  return await response.json();
}

/**
 * Get approved students for a course
 */
export async function getCourseApprovedStudents(courseId, pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses/${courseId}/enrollments/approved?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch approved students");
  }

  return await response.json();
}

/**
 * Get pending enrollment requests for a course
 */
export async function getCoursePendingRequests(courseId, pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses/${courseId}/enrollments/pending?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch pending requests");
  }

  return await response.json();
}
