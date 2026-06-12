import axiosClient from "./axiosClient";

export const enrollClassSectionByCode = async (classCode) => {
    const response = await axiosClient.post(`class-sections/join-by-code`, { classCode });
    return response.data;
};

export const enrollClassSection = async (classSectionId) => {
    const response = await axiosClient.post(`class-sections/${classSectionId}/enroll`);
    return response.data;
};

export const completeClassContentItem = async (classContentItemId) => {
    const response = await axiosClient.post(`class-content-items/${classContentItemId}/complete`);
    return response.data;
};

export const getCurrentUserProgressByClassSection = async (classSectionId) => {
    const response = await axiosClient.get(`my-progress/class-sections/${classSectionId}`);
    return response.data;
};

// ── Enrollment management (Teacher / Admin) ─────────────────────
// Now supports either courseId or classSectionId
export const approveEnrollment = async (studentId, courseId = null, classSectionId = null) => {
    const body = { studentId };
    if (classSectionId) {
        body.classSectionId = classSectionId;
    } else if (courseId) {
        body.courseId = courseId;
    }

    const response = await axiosClient.post(`enrollments/approve`, body);
    return response.data;
};

export const rejectEnrollment = async (studentId, courseId = null, classSectionId = null) => {
    const body = { studentId };
    if (classSectionId) {
        body.classSectionId = classSectionId;
    } else if (courseId) {
        body.courseId = courseId;
    }

    const response = await axiosClient.delete(`enrollments/reject`, {
        data: body,
    });
    return response.data;
};

export const getApprovedClassSectionEnrollments = async (classSectionId, pageNumber = 1, pageSize = 10, keyword = null) => {
    const response = await axiosClient.get(`class-sections/${classSectionId}/enrollments/approved`, {
        params: { pageNumber, pageSize, keyword: keyword || undefined },
    });
    return response.data;
};

export const getPendingClassSectionEnrollments = async (classSectionId, pageNumber = 1, pageSize = 10) => {
    const response = await axiosClient.get(`class-sections/${classSectionId}/enrollments/pending`, {
        params: { pageNumber, pageSize },
    });
    return response.data;
};

export const getAllEnrollments = async (pageNumber = 1, pageSize = 10, approvalStatus = null) => {
    const params = { pageNumber, pageSize };
    if (approvalStatus) params.approvalStatus = approvalStatus;
    const response = await axiosClient.get(`enrollments`, { params });
    return response.data;
};

export const getTeacherEnrollments = async (pageNumber = 1, pageSize = 10, courseId = null, classSectionId = null, approvalStatus = null) => {
    const params = { pageNumber, pageSize };
    if (courseId) params.courseId = courseId;
    if (classSectionId) params.classSectionId = classSectionId;
    if (approvalStatus) params.approvalStatus = approvalStatus;

    const response = await axiosClient.get(`teacher/enrollments`, {
        params,
    });
    return response.data;
};

// ── Fetch all enrollments across all class sections (for Teacher/Admin dashboard) ──────────────────────
export const getAllTeacherEnrollments = async (pageNumber = 1, pageSize = 100, approvalStatus = null) => {
    // Use the /teacher/enrollments endpoint which supports approvalStatus filter
    const response = await axiosClient.get('teacher/enrollments', {
        params: { pageNumber, pageSize, approvalStatus }
    });
    return response.data;
};

// ── Students in / not-in class section ─────────────────────────────────
export const getStudentsNotInClassSection = async (classSectionId, searchRequest = {}, pageNumber = 1, pageSize = 5) => {
    const response = await axiosClient.get(`class-sections/${classSectionId}/students/not-available`, {
        params: { ...searchRequest, pageNumber, pageSize },
    });
    return response.data;
};

export const addStudentsToClassSection = async (classSectionId, studentIds) => {
    const response = await axiosClient.post(`class-sections/${classSectionId}/students`, { studentIds });
    return response.data;
};

export const deleteStudentsFromClassSection = async (classSectionId, studentIds) => {
    const response = await axiosClient.delete(`class-sections/${classSectionId}/students`, {
        data: { studentIds },
    });
    return response.data;
};
