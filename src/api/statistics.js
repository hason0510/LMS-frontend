import axiosClient from "./axiosClient";

export async function getClassSectionGradeBook(classSectionId) {
    const response = await axiosClient.get(`class-sections/${classSectionId}/quiz-grades`);
    return response.data;
}

/**
 * Get quiz attempts for a specific class content item
 */
export async function getQuizAttempts(classContentItemId, pageNumber = 1, pageSize = 10) {
    if (!classContentItemId) {
        throw new Error("classContentItemId is required");
    }

    const response = await axiosClient.get(`class-content-items/${classContentItemId}/attempts`, {
        params: { pageNumber, pageSize }
    });
    return response.data;
}

export async function getClassSectionApprovedStudents(classSectionId, pageNumber = 1, pageSize = 100) {
    const response = await axiosClient.get(`class-sections/${classSectionId}/enrollments/approved`, {
        params: { pageNumber, pageSize }
    });
    return response.data;
}

export async function getClassSectionPendingRequests(classSectionId, pageNumber = 1, pageSize = 100) {
    const response = await axiosClient.get(`class-sections/${classSectionId}/enrollments/pending`, {
        params: { pageNumber, pageSize }
    });
    return response.data;
}
