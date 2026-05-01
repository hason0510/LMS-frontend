import axiosClient from "./axiosClient";

/**
 * Tạo resource cho bài học
 * @param {number} lessonId - ID của bài học
 * @param {object} resourceData - {title, fileUrl, embedUrl, type}
 */
export async function createResource(lessonId, resourceData) {
  const response = await axiosClient.post(`lessons/${lessonId}/resources`, resourceData);
  return response.data;
}

/**
 * Tải lên video cho resource
 * @param {number} resourceId - ID của resource
 * @param {File} file - Video file
 * @param onProgress
 */
export async function uploadVideoResource(resourceId, file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post(`resources/${resourceId}/video`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  });

  return response.data;
}

/**
 * Tải lên slide/tài liệu cho resource
 * @param {number} resourceId - ID của resource
 * @param {File} file - Slide/document file
 * @param {Function} [onProgress] - Callback nhận phần trăm upload (0-100)
 */
export async function uploadSlideResource(resourceId, file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post(`resources/${resourceId}/slide`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  });

  return response.data;
}

/**
 * Lấy tất cả resources của một bài học
 * @param {number} lessonId - ID của bài học
 */
export async function getResourcesByLessonId(lessonId) {
  const response = await axiosClient.get(`lessons/${lessonId}/resources`);
  return response.data;
}

/**
 * Lấy resource theo ID
 * @param {number} resourceId - ID của resource
 */
export async function getResourceById(resourceId) {
  const response = await axiosClient.get(`resources/${resourceId}`);
  return response.data;
}

/**
 * Cập nhật resource
 * @param {number} resourceId - ID của resource
 * @param {object} resourceData - {title, fileUrl, embedUrl, type}
 */
export async function updateResource(resourceId, resourceData) {
  const response = await axiosClient.put(`resources/${resourceId}`, resourceData);
  return response.data;
}

/**
 * Xóa resource
 * @param {number} resourceId - ID của resource
 */
export async function deleteResource(resourceId) {
  const response = await axiosClient.delete(`resources/${resourceId}`);
  return response.data;
}

export async function uploadStandaloneResource(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post("upload/resource", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
