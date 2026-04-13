import axiosClient from "./axiosClient";

/**
 * Get teacher's enrollment statistics
 * Supports both courseId (legacy) and classSectionId
 */
export async function getTeacherEnrollments(courseId = null, classSectionId = null, approvalStatus = null, pageNumber = 1, pageSize = 10) {
    const params = { pageNumber, pageSize };

    if (courseId) params.courseId = courseId;
    if (classSectionId) params.classSectionId = classSectionId;
    if (approvalStatus) params.approvalStatus = approvalStatus;

    const response = await axiosClient.get('teacher/enrollments', { params });
    return response.data;
}

/**
 * Get course/class section grade book (all students' quiz results)
 */
export async function getCourseGradeBook(courseId = null, classSectionId = null) {
    let url;
    if (classSectionId) {
        url = `class-sections/${classSectionId}/quiz-grades`;
    } else {
        url = `courses/${courseId}/quiz-grades`;
    }

    const response = await axiosClient.get(url);
    return response.data;
}

/**
 * Get quiz attempts for a specific chapter item or class content item
 */
export async function getQuizAttempts(chapterItemId = null, classContentItemId = null, pageNumber = 1, pageSize = 10) {
    let url;
    if (classContentItemId) {
        url = `class-content-items/${classContentItemId}/attempts`;
    } else {
        url = `chapterItem/${chapterItemId}/attempts`;
    }

    const response = await axiosClient.get(url, {
        params: { pageNumber, pageSize }
    });
    return response.data;
}

/**
 * Get approved students for a course or class section
 */
export async function getApprovedStudents(courseId = null, classSectionId = null, pageNumber = 1, pageSize = 10) {
    let url;
    if (classSectionId) {
        url = `class-sections/${classSectionId}/enrollments/approved`;
    } else {
        url = `courses/${courseId}/enrollments/approved`;
    }

    const response = await axiosClient.get(url, {
        params: { pageNumber, pageSize }
    });
    return response.data;
}

/**
 * Get pending enrollment requests for a course or class section
 */
export async function getPendingRequests(courseId = null, classSectionId = null, pageNumber = 1, pageSize = 10) {
    let url;
    if (classSectionId) {
        url = `class-sections/${classSectionId}/enrollments/pending`;
    } else {
        url = `courses/${courseId}/enrollments/pending`;
    }

    const response = await axiosClient.get(url, {
        params: { pageNumber, pageSize }
    });
    return response.data;
}

// Aliases for legacy course naming
export const getCourseApprovedStudents = getApprovedStudents;
export const getCoursePendingRequests = getPendingRequests;
