//const API_URL = "http://localhost:8080/api/v1/lms";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms`;

export async function getAllCourses(pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch courses");
  }

  return await response.json();
}

export async function getAdminCourses(pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/admin/courses?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch admin courses");
  }

  return await response.json();
}

export async function getTeacherCourses(pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/teacher/courses?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch teacher courses");
  }

  return await response.json();
}

export async function getApprovedCourses(pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses/approved?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch approved courses");
  }

  return await response.json();
}

export async function getPendingCourses(pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses/pending?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch pending courses");
  }

  return await response.json();
}

export async function getCourseById(id) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/courses/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch course details");
  }

  return await response.json();
}

export async function createCourse(courseData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/courses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(courseData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create course");
  }

  return await response.json();
}

export async function uploadCourseImage(courseId, file) {
  const token = localStorage.getItem("accessToken");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/courses/${courseId}/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload course image");
  }

  return await response.json();
}

export async function updateCourse(id, courseData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/courses/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(courseData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update course");
  }

  return await response.json();
}

export async function deleteCourse(id) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/courses/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete course");
  }

  // Handle 204 No Content response (empty body)
  if (response.status === 204) {
    return { success: true };
  }

  return await response.json();
}

export async function publishCourse(id) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/courses/${id}/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to publish course");
  }

  return await response.json();
}

export async function enrollCourse(courseId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to enroll in course");
  }

  return await response.json();
}

export async function checkEnrollmentStatus(courseId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/courses/${courseId}/enrollment-status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return await response.json();

  // if (!response.ok) {
  //   // If endpoint doesn't exist or error, return false (not enrolled)
  //   return false;
  // }

  // const data = await response.json();
  // return data.enrolled || data.isEnrolled || false;
}

export async function getAllEnrollments(pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/enrollments?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch all enrollments");
  }

  return await response.json();
}

export async function getTeacherEnrollments(pageNumber = 1, pageSize = 10, courseId = null, approvalStatus = null) {
  const token = localStorage.getItem("accessToken");
  const params = new URLSearchParams();
  params.append("pageNumber", pageNumber);
  params.append("pageSize", pageSize);
  if (courseId) params.append("courseId", courseId);
  if (approvalStatus) params.append("approvalStatus", approvalStatus);

  const response = await fetch(
    `${API_URL}/teacher/enrollments?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch teacher enrollments");
  }

  return await response.json();
}

export async function getCourseEnrollments(courseId, pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/teacher/courses/${courseId}/enrollments?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch enrollments");
  }

  return await response.json();
}

export async function approveEnrollment(studentId, courseId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/enrollments/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentId,
        courseId,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to approve enrollment");
  }

  return await response.json();
}

export async function rejectEnrollment(studentId, courseId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/enrollments/reject`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentId,
        courseId,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to reject enrollment");
  }

  return await response.json();
}

export async function deleteEnrollment(enrollmentId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/enrollments/${enrollmentId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete enrollment");
  }

  return await response.json();
}

export async function deleteStudentsFromCourse(courseId, studentIds) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses/${courseId}/students`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentIds: studentIds,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete students from course");
  }

  // Response might be plain text or JSON, handle both cases
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    return { message: await response.text() };
  }
}

export async function getStudentsNotInCourse(courseId, searchRequest = {}, pageNumber = 1, pageSize = 10) {
  const token = localStorage.getItem("accessToken");
  const params = new URLSearchParams({
    pageNumber,
    pageSize,
    ...(searchRequest.fullName && { fullName: searchRequest.fullName }),
    ...(searchRequest.username && { username: searchRequest.username }),
    ...(searchRequest.email && { email: searchRequest.email }),
  });

  const response = await fetch(
    `${API_URL}/courses/${courseId}/students/not-available?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch available students");
  }

  return await response.json();
}

export async function addStudentsToCourse(courseId, studentIds) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/courses/${courseId}/students`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentIds: studentIds,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to add students to course");
  }

  // Response might be plain text or JSON, handle both cases
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    return { message: await response.text() };
  }
}
