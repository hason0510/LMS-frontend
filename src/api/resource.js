import axiosClient from "./axiosClient";
import { unwrapListPayload, unwrapPagePayload, unwrapPayload } from "./responseAdapter";

/**
 * Tạo resource cho bài học
 * @param {number} lessonId - ID của bài học
 * @param {object} resourceData - {title, fileUrl, embedUrl, type}
 */
export async function createResource(lessonId, resourceData) {
  const response = await axiosClient.post(`lessons/${lessonId}/resources`, resourceData);
  return unwrapPayload(response);
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

  return unwrapPayload(response);
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

  return unwrapPayload(response);
}

/**
 * Lấy tất cả resources của một bài học
 * @param {number} lessonId - ID của bài học
 */
export async function getResourcesByLessonId(lessonId) {
  const response = await axiosClient.get(`lessons/${lessonId}/resources`);
  return unwrapListPayload(response);
}

export async function attachResourceToLesson(lessonId, resourceId) {
  await axiosClient.post(`lessons/${lessonId}/resources/${resourceId}/attach`);
}

export async function attachResourceToAssignment(assignmentId, resourceId) {
  await axiosClient.post(`assignments/${assignmentId}/resources/${resourceId}/attach`);
}

export async function detachResourceFromLesson(lessonId, resourceId) {
  await axiosClient.delete(`lessons/${lessonId}/resources/${resourceId}/detach`);
}

export async function detachResourceFromAssignment(assignmentId, resourceId) {
  await axiosClient.delete(`assignments/${assignmentId}/resources/${resourceId}/detach`);
}

/**
 * Lấy resource theo ID
 * @param {number} resourceId - ID của resource
 */
export async function getResourceById(resourceId) {
  const response = await axiosClient.get(`resources/${resourceId}`);
  return unwrapPayload(response);
}

export async function getResourcePage(params = {}) {
  const response = await axiosClient.get("resources", { params });
  return unwrapPagePayload(response);
}

export async function getResourceUploadPolicy() {
  const response = await axiosClient.get("resources/upload-policy");
  return unwrapPayload(response);
}

export async function getResourceReferences(resourceId) {
  const response = await axiosClient.get(`resources/${resourceId}/references`);
  return unwrapListPayload(response);
}

export async function getResourceAuditLogs(resourceId) {
  const response = await axiosClient.get(`resources/${resourceId}/audit-log`);
  return unwrapListPayload(response);
}

export async function createStandaloneResource(resourceData) {
  const response = await axiosClient.post("resources/standalone", resourceData);
  return unwrapPayload(response);
}

/**
 * Cập nhật resource
 * @param {number} resourceId - ID của resource
 * @param {object} resourceData - {title, fileUrl, embedUrl, type}
 */
export async function updateResource(resourceId, resourceData) {
  const response = await axiosClient.put(`resources/${resourceId}`, resourceData);
  return unwrapPayload(response);
}

/**
 * Xóa resource
 * @param {number} resourceId - ID của resource
 */
export async function deleteResource(resourceId) {
  await axiosClient.delete(`resources/${resourceId}`);
}

export async function uploadStandaloneResource(file, params = {}) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post("upload/resource", formData, {
    params,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return unwrapPayload(response);
}
