import { useQuery } from "@tanstack/react-query";
import {
  getClassSectionGradeBook,
  getClassSectionPendingRequests,
  getClassReportOverview,
  getClassAssignmentReport,
  getClassQuizReport,
} from "../api/statistics";
import { getClassPeople } from "../api/teaching";
import { collectAllPagedItems, unwrapApiData } from "../utils/reporting";

const valueOf = (settledResult) =>
  settledResult.status === "fulfilled" ? settledResult.value : null;

/**
 * Dữ liệu báo cáo theo lớp cho dashboard teacher/admin.
 * - queryKey gắn classSectionId → đổi lớp thì React Query bỏ qua response lớp cũ (hết race).
 * - Promise.allSettled → 1 API hỏng không làm sập cả khối (chịu lỗi từng phần).
 * - refetchInterval 60s + refetchOnWindowFocus (mặc định) thay cho poll 30s tự viết.
 */
export default function useClassReportData(classSectionId) {
  return useQuery({
    queryKey: ["classReport", classSectionId],
    enabled: !!classSectionId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [gradeBookRes, peopleRes, pendingRes, overviewRes, assignRes, quizRes] =
        await Promise.allSettled([
          getClassSectionGradeBook(classSectionId),
          getClassPeople(classSectionId, { status: "APPROVED" }),
          collectAllPagedItems(
            (page) => getClassSectionPendingRequests(classSectionId, page, 250),
            { startPage: 1, maxPages: 8 }
          ),
          getClassReportOverview(classSectionId),
          getClassAssignmentReport(classSectionId),
          getClassQuizReport(classSectionId),
        ]);

      const gradeBookData = unwrapApiData(valueOf(gradeBookRes));
      const people = valueOf(peopleRes);
      return {
        gradeBook: Array.isArray(gradeBookData) ? gradeBookData : [],
        peopleRows: Array.isArray(people) ? people : people?.data || [],
        pendingRequests: valueOf(pendingRes) || [],
        classOverview: unwrapApiData(valueOf(overviewRes)),
        assignmentReport: unwrapApiData(valueOf(assignRes)),
        quizReport: unwrapApiData(valueOf(quizRes)),
      };
    },
  });
}

const EMPTY_REPORT = {
  gradeBook: [],
  peopleRows: [],
  pendingRequests: [],
  classOverview: null,
  assignmentReport: null,
  quizReport: null,
};

export { EMPTY_REPORT };
