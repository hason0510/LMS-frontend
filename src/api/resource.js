//const API_URL = "http://localhost:8080/api/v1/lms";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms`;
/**
 * Tạo resource cho bài học
 * @param {number} lessonId - ID của bài học
 * @param {object} resourceData - {title, url, type}
 */
export async function createResource(lessonId, resourceData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/lessons/${lessonId}/resources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(resourceData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create resource");
  }

  return await response.json();
}

/**
 * Tải lên video cho resource
 * @param {number} resourceId - ID của resource
 * @param {File} file - Video file
 */
export async function uploadVideoResource(resourceId, file) {
  const token = localStorage.getItem("accessToken");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/resources/${resourceId}/video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload video");
  }

  return await response.json();
}

/**
 * Tải lên slide/tài liệu cho resource
 * @param {number} resourceId - ID của resource
 * @param {File} file - Slide/document file
 */
export async function uploadSlideResource(resourceId, file) {
  const token = localStorage.getItem("accessToken");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/resources/${resourceId}/slide`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to upload slide");
  }

  return await response.json();
}

/**
 * Lấy tất cả resources của một bài học
 * @param {number} lessonId - ID của bài học
 */
export async function getResourcesByLessonId(lessonId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/lessons/${lessonId}/resources`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resources");
  }

  return await response.json();
}

/**
 * Lấy resource theo ID
 * @param {number} resourceId - ID của resource
 */
export async function getResourceById(resourceId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/resources/${resourceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resource");
  }

  return await response.json();
}

/**
 * Cập nhật resource
 * @param {number} resourceId - ID của resource
 * @param {object} resourceData - {title, url, type}
 */
export async function updateResource(resourceId, resourceData) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/resources/${resourceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(resourceData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update resource");
  }

  return await response.json();
}

/**
 * Xóa resource
 * @param {number} resourceId - ID của resource
 */
export async function deleteResource(resourceId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/resources/${resourceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete resource");
  }

  if (response.status === 204) {
    return { success: true };
  }

  return await response.json();
}
