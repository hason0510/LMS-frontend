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

export async function getClassSectionPendingRequests(classSectionId, pageNumber = 1, pageSize = 100) {
    const response = await axiosClient.get(`class-sections/${classSectionId}/enrollments/pending`, {
        params: { pageNumber, pageSize }
    });
    return response.data;
}

// ── Admin aggregate endpoints ──────────────────────────────────────────

/**
 * Admin system-wide report summary.
 * Includes: totalUsers, totalClassSections, totalSubjects, totalTeachers,
 * totalAssistants, totalStudents, pendingEnrollments, pendingSubmissions,
 * pendingQuizReviews, classStatusBreakdown, teacherLoad, subjectLoad,
 * topClasses, assistantsActive.
 */
export async function getAdminReportSummary() {
    const response = await axiosClient.get(`admin/reports/summary`);
    return response.data;
}

// Tải của giảng viên — phân trang + tìm kiếm + sắp xếp (sort: desc | asc | alpha)
export async function getAdminTeacherLoad({ search = "", sort = "desc", page = 1, size = 8 } = {}) {
    const response = await axiosClient.get(`admin/reports/teacher-load`, {
        params: { search: search || undefined, sort, page, size },
    });
    return response.data;
}

// Tải theo môn học — phân trang + tìm kiếm + sắp xếp
export async function getAdminSubjectLoad({ search = "", sort = "desc", page = 1, size = 8 } = {}) {
    const response = await axiosClient.get(`admin/reports/subject-load`, {
        params: { search: search || undefined, sort, page, size },
    });
    return response.data;
}

// Danh sách trợ giảng (TA) + lớp hỗ trợ — phân trang + tìm kiếm (tên / email / lớp)
export async function getAdminAssistants({ search = "", page = 1, size = 10 } = {}) {
    const response = await axiosClient.get(`admin/reports/assistants`, {
        params: { search: search || undefined, page, size },
    });
    return response.data;
}

// ── Teacher aggregate endpoints ───────────────────────────────────────

/**
 * Teacher-scope report summary (all classes the calling user teaches/assists).
 * Includes: totalClasses, totalStudents, pendingSubmissions, pendingQuizReviews,
 * atRiskStudents, pendingRequests, taughtClasses, assistedClasses.
 */
export async function getTeacherReportSummary() {
    const response = await axiosClient.get(`teacher/reports/summary`);
    return response.data;
}

// ── Class-level aggregate endpoints ───────────────────────────────────

/**
 * Class overview report.
 * @param {number} classSectionId
 * @param {number} [lowThreshold=40]  Progress % below which student is "at risk"
 * @param {number} [highThreshold=80] Progress % at or above which student is "engaged"
 */
export async function getClassReportOverview(classSectionId, lowThreshold = 40, highThreshold = 80) {
    const response = await axiosClient.get(`class-sections/${classSectionId}/reports/overview`, {
        params: { lowThreshold, highThreshold }
    });
    return response.data;
}

/**
 * Class assignment aggregate report.
 * Each row has: assignmentId, assignmentTitle, totalStudents, submittedCount,
 * gradedCount, pendingReviewCount, lateSubmittedCount, returnedCount,
 * notSubmitted, maxScore, dueAt, closeAt.
 */
export async function getClassAssignmentReport(classSectionId) {
    const response = await axiosClient.get(`class-sections/${classSectionId}/reports/assignments`);
    return response.data;
}

/**
 * Class quiz aggregate report.
 * Each row has: quizId, classContentItemId, quizTitle, totalAttempts,
 * uniqueStudents, passedCount, notPassedCount, waitingReviewCount,
 * averageScore, topScore, minPassScore.
 */
export async function getClassQuizReport(classSectionId) {
    const response = await axiosClient.get(`class-sections/${classSectionId}/reports/quizzes`);
    return response.data;
}
