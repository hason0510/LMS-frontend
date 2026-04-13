import axiosClient from "./axiosClient";

export const createClassSectionFromTemplateId = async (curriculumVersionId, data) => {
  const response = await axiosClient.post(`class-sections/from-template/${curriculumVersionId}`, data);
  return response.data;
};

export const createFromLatestPublishedVersion = async (templateId, data) => {
  const response = await axiosClient.post(`class-sections/from-template-latest/${templateId}`, data);
  return response.data;
};

export const getClassSectionById = async (id) => {
  const response = await axiosClient.get(`class-sections/${id}`);
  return response.data;
};

export const getClassSections = async (params) => {
  const response = await axiosClient.get('class-sections', {
    params,
  });
  return response.data;
};

// ── Functional equivalents for legacy course API ────────────────
export const getTeacherCourses = async (pageNumber = 1, pageSize = 10) => {
  // Pass pagination to backend even if not used yet for future-proofing
  const response = await axiosClient.get('class-sections', { 
    params: { pageNumber, pageSize } 
  });
  return response.data;
};

export const getAdminCourses = async (pageNumber = 1, pageSize = 10) => {
  const response = await axiosClient.get('class-sections', { 
    params: { pageNumber, pageSize } 
  });
  return response.data;
};

export const getAllCourses = async (pageNumber = 1, pageSize = 10) => {
  const response = await axiosClient.get('class-sections', { 
    params: { pageNumber, pageSize } 
  });
  return response.data;
};

export const getApprovedCourses = async (pageNumber = 1, pageSize = 10) => {
  const response = await axiosClient.get('class-sections/approved', { 
    params: { pageNumber, pageSize } 
  });
  return response.data;
};

export const getCourseById = getClassSectionById;

export const updateClassSectionStatus = async (id, status) => {
  const response = await axiosClient.patch(`class-sections/${id}/status`, null, {
    params: { status },
  });
  return response.data;
};

export const getPendingCourses = async (pageNumber = 1, pageSize = 10) => {
  const response = await axiosClient.get('class-sections/pending', { 
    params: { pageNumber, pageSize } 
  });
  return response.data;
};

export const addMember = async (classSectionId, data) => {
  const response = await axiosClient.post(`class-sections/${classSectionId}/members`, data);
  return response.data;
};

export const updateMemberRole = async (classSectionId, userId, data) => {
  const response = await axiosClient.put(`class-sections/${classSectionId}/members/${userId}`, data);
  return response.data;
};

export const removeMember = async (classSectionId, userId) => {
  const response = await axiosClient.delete(`class-sections/${classSectionId}/members/${userId}`);
  return response.data;
};

export const getMembers = async (classSectionId) => {
  const response = await axiosClient.get(`class-sections/${classSectionId}/members`);
  return response.data;
};

export const getClassChapters = async (classSectionId) => {
  const response = await axiosClient.get(`class-sections/${classSectionId}/chapters`);
  return response.data;
};

export const getClassContentItems = async (classSectionId, chapterId) => {
  const response = await axiosClient.get(`class-sections/${classSectionId}/chapters/${chapterId}/content-items`);
  return response.data;
};

export const getApprovedClassSections = async () => {
  const response = await axiosClient.get('class-sections/approved');
  return response.data;
};

export const getPendingClassSections = async () => {
  const response = await axiosClient.get('class-sections/pending');
  return response.data;
};

export const getMyClassSections = async () => {
  const response = await axiosClient.get('class-sections/my-classes');
  return response.data;
};

export const createClassChapter = async (classSectionId, data) => {
  const response = await axiosClient.post(`class-sections/${classSectionId}/chapters`, data);
  return response.data;
};

export const updateClassChapter = async (classSectionId, classChapterId, data) => {
  const response = await axiosClient.patch(`class-sections/${classSectionId}/chapters/${classChapterId}`, data);
  return response.data;
};

// alias — same endpoint, kept for compatibility
export const overrideClassChapter = updateClassChapter;

export const deleteClassChapter = async (classSectionId, classChapterId) => {
  const response = await axiosClient.delete(`class-sections/${classSectionId}/chapters/${classChapterId}`);
  return response.data;
};

export const createClassContentItem = async (classSectionId, classChapterId, data) => {
  const response = await axiosClient.post(`class-sections/${classSectionId}/chapters/${classChapterId}/content-items`, data);
  return response.data;
};

export const updateClassContentItem = async (classSectionId, classContentItemId, data) => {
  const response = await axiosClient.patch(`class-sections/${classSectionId}/content-items/${classContentItemId}`, data);
  return response.data;
};

// alias — same endpoint, kept for compatibility
export const overrideClassContentItem = updateClassContentItem;

export const deleteClassContentItem = async (classSectionId, classContentItemId) => {
  const response = await axiosClient.delete(`class-sections/${classSectionId}/content-items/${classContentItemId}`);
  return response.data;
};

export const deleteClassSection = async (id) => {
  const response = await axiosClient.delete(`class-sections/${id}`);
  return response.data;
};

export const updateClassSection = async (id, data) => {
  const response = await axiosClient.patch(`class-sections/${id}`, data);
  return response.data;
};

export const resetClassCode = async (classSectionId) => {
  const response = await axiosClient.post(`class-sections/${classSectionId}/class-code/reset`);
  return response.data;
};

export const deleteClassCode = async (classSectionId) => {
  const response = await axiosClient.delete(`class-sections/${classSectionId}/class-code`);
  return response.data;
};
