export function unwrapApiData(response) {
  return response?.data ?? response ?? null;
}

export function unwrapPageItems(response) {
  const payload = unwrapApiData(response);
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.pageList)) {
    return payload.pageList;
  }
  if (Array.isArray(payload?.content)) {
    return payload.content;
  }
  return [];
}

export function unwrapPageData(response) {
  const payload = unwrapApiData(response);
  const items = unwrapPageItems(response);

  return {
    items,
    currentPage: Number(payload?.currentPage ?? payload?.pageNumber ?? payload?.number ?? 1) || 1,
    totalPage: Number(payload?.totalPage ?? payload?.totalPages ?? 1) || 1,
    totalElements: Number(payload?.totalElements ?? payload?.totalItems ?? items.length) || items.length,
  };
}

export async function collectAllPagedItems(fetchPage, options = {}) {
  const {
    startPage = 1,
    maxPages = 20,
    zeroBased = false,
  } = options;

  let page = startPage;
  let totalPage = null;
  const allItems = [];

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const response = await fetchPage(page);
    const pageData = unwrapPageData(response);
    allItems.push(...pageData.items);

    if (!pageData.items.length) {
      break;
    }

    totalPage = Number(pageData.totalPage) || totalPage;
    if (totalPage) {
      const reachedLastPage = zeroBased ? page + 1 >= totalPage : page >= totalPage;
      if (reachedLastPage) {
        break;
      }
    } else if (pageData.items.length === 0) {
      break;
    }

    page += 1;
  }

  return allItems;
}

function normalizeProgressThresholds(thresholds = {}) {
  const rawLow = Number(thresholds?.low);
  const rawHigh = Number(thresholds?.high);
  const low = Number.isFinite(rawLow) ? Math.max(0, Math.min(99, rawLow)) : 40;
  const highBase = Number.isFinite(rawHigh) ? rawHigh : 80;
  const high = Math.max(low + 1, Math.min(100, highBase));

  return { low, high };
}

export function calculateClassSectionStats(approvedStudents = [], pendingRequests = [], gradeBook = [], thresholds = {}) {
  const safeStudents = Array.isArray(approvedStudents) ? approvedStudents : [];
  const safePending = Array.isArray(pendingRequests) ? pendingRequests : [];
  const safeGradeBook = Array.isArray(gradeBook) ? gradeBook : [];
  const progressThresholds = normalizeProgressThresholds(thresholds);

  const totalStudents = safeStudents.length;
  const pendingCount = safePending.length;
  const averageProgress = totalStudents
    ? Number(
        (
          safeStudents.reduce((sum, student) => sum + (Number(student.progress) || 0), 0) / totalStudents
        ).toFixed(1)
      )
    : 0;

  const quizIds = new Set();
  const studentScores = new Map();
  let topScore = 0;

  safeGradeBook.forEach((row) => {
    const quizId = row.quizId ?? row.classContentItemId;
    if (quizId != null) {
      quizIds.add(quizId);
    }

    if (row.studentId == null) {
      return;
    }

    const score = Number(row.maxGrade) || 0;
    topScore = Math.max(topScore, score);

    if (!studentScores.has(row.studentId)) {
      studentScores.set(row.studentId, []);
    }
    studentScores.get(row.studentId).push(score);
  });

  const perStudentAverages = Array.from(studentScores.values()).map((scores) => {
    if (!scores.length) {
      return 0;
    }
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });

  const averageQuizScore = perStudentAverages.length
    ? Number((perStudentAverages.reduce((sum, score) => sum + score, 0) / perStudentAverages.length).toFixed(1))
    : 0;

  const atRiskStudents = safeStudents.filter((student) => (Number(student.progress) || 0) < progressThresholds.low).length;
  const engagedStudents = safeStudents.filter((student) => (Number(student.progress) || 0) >= progressThresholds.high).length;

  return {
    totalStudents,
    pendingCount,
    averageProgress,
    averageQuizScore,
    trackedQuizzes: quizIds.size,
    atRiskStudents,
    engagedStudents,
    topScore,
  };
}

export function buildGradebookTable(gradeBook = [], approvedStudents = [], options = {}) {
  const safeGradeBook = Array.isArray(gradeBook) ? gradeBook : [];
  const safeStudents = Array.isArray(approvedStudents) ? approvedStudents : [];
  const {
    fallbackStudentName = "",
    fallbackStudentNumber = "",
    fallbackQuizTitle = "Quiz",
  } = options;
  const quizOrder = [];
  const quizMap = new Map();

  safeGradeBook.forEach((row) => {
    const quizId = row.quizId ?? row.classContentItemId;
    if (quizId == null || quizMap.has(quizId)) {
      return;
    }
    quizMap.set(quizId, {
      id: quizId,
      title: row.quizTitle || `${fallbackQuizTitle} ${quizId}`,
    });
    quizOrder.push(quizId);
  });

  const rowsByStudent = new Map();

  safeStudents.forEach((student) => {
    rowsByStudent.set(student.studentId, {
      key: student.studentId,
      studentId: student.studentId,
      studentName: student.fullName || fallbackStudentName,
      studentNumber: student.studentNumber || fallbackStudentNumber,
      progress: Number(student.progress) || 0,
      averageScore: null,
    });
  });

  safeGradeBook.forEach((row, index) => {
    const studentId = row.studentId ?? `missing-${index}`;
    if (!rowsByStudent.has(studentId)) {
      rowsByStudent.set(studentId, {
        key: studentId,
        studentId,
        studentName: row.studentName || fallbackStudentName,
        studentNumber: row.studentNumber || fallbackStudentNumber,
        progress: null,
        averageScore: null,
      });
    }

    const target = rowsByStudent.get(studentId);
    const quizId = row.quizId ?? row.classContentItemId;
    if (quizId != null) {
      target[`quiz_${quizId}`] = row.maxGrade;
    }
  });

  const rows = Array.from(rowsByStudent.values())
    .map((row) => {
      const scores = quizOrder
        .map((quizId) => row[`quiz_${quizId}`])
        .filter((score) => typeof score === "number");
      const averageScore = scores.length
        ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1))
        : null;
      return {
        ...row,
        averageScore,
      };
    })
    .sort((left, right) => {
      const leftNumber = left.studentNumber || "";
      const rightNumber = right.studentNumber || "";
      return leftNumber.localeCompare(rightNumber);
    });

  return {
    rows,
    quizzes: quizOrder.map((quizId) => quizMap.get(quizId)).filter(Boolean),
  };
}

export function getProgressBuckets(approvedStudents = [], thresholds = {}) {
  const safeStudents = Array.isArray(approvedStudents) ? approvedStudents : [];
  const progressThresholds = normalizeProgressThresholds(thresholds);
  return {
    low: safeStudents.filter((student) => (Number(student.progress) || 0) < progressThresholds.low).length,
    medium: safeStudents.filter((student) => {
      const progress = Number(student.progress) || 0;
      return progress >= progressThresholds.low && progress < progressThresholds.high;
    }).length,
    high: safeStudents.filter((student) => (Number(student.progress) || 0) >= progressThresholds.high).length,
  };
}

export function summarizeAssignmentSubmissions(submissions = []) {
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];
  return {
    total: safeSubmissions.length,
    submitted: safeSubmissions.filter((item) => item.status && item.status !== "NOT_SUBMITTED").length,
    waitingFeedback: safeSubmissions.filter((item) => item.status === "SUBMITTED" || item.status === "LATE_SUBMITTED").length,
    graded: safeSubmissions.filter((item) => item.status === "GRADED").length,
    returned: safeSubmissions.filter((item) => item.status === "RETURNED").length,
    notSubmitted: safeSubmissions.filter((item) => item.status === "NOT_SUBMITTED").length,
    late: safeSubmissions.filter((item) => item.status === "LATE_SUBMITTED" || item.late).length,
  };
}

export function summarizeQuizAttempts(quizAttempts = []) {
  const safeAttempts = Array.isArray(quizAttempts) ? quizAttempts : [];
  const gradedAttempts = safeAttempts.filter((item) => item.grade != null);
  const averageScore = gradedAttempts.length
    ? Number(
        (
          gradedAttempts.reduce((sum, item) => sum + (Number(item.grade) || 0), 0) / gradedAttempts.length
        ).toFixed(1)
      )
    : 0;

  const highestScore = gradedAttempts.length
    ? Math.max(...gradedAttempts.map((item) => Number(item.grade) || 0))
    : 0;

  return {
    totalAttempts: safeAttempts.length,
    waitingReview: safeAttempts.filter((item) => item.gradingStatus === "NEEDS_REVIEW").length,
    passed: safeAttempts.filter((item) => item.isPassed === true && item.gradingStatus !== "NEEDS_REVIEW").length,
    notPassed: safeAttempts.filter((item) => item.isPassed === false && item.gradingStatus !== "NEEDS_REVIEW").length,
    averageScore,
    highestScore,
  };
}

export function buildQuizSummaries(quizAttempts = [], options = {}) {
  const safeAttempts = Array.isArray(quizAttempts) ? quizAttempts : [];
  const { fallbackQuizTitle = "Quiz" } = options;
  const quizMap = new Map();

  safeAttempts.forEach((attempt) => {
    const quizId = attempt.quizId ?? attempt.classContentItemId;
    if (quizId == null) {
      return;
    }

    if (!quizMap.has(quizId)) {
      quizMap.set(quizId, {
        id: quizId,
        title: attempt.quizTitle || `${fallbackQuizTitle} ${quizId}`,
        attempts: [],
      });
    }

    quizMap.get(quizId).attempts.push(attempt);
  });

  return Array.from(quizMap.values())
    .map((item) => ({
      ...item,
      ...summarizeQuizAttempts(item.attempts),
    }))
    .sort((left, right) => right.totalAttempts - left.totalAttempts);
}

export function buildAssignmentStatusChartData(assignmentOverviews = [], options = {}) {
  const safeAssignments = Array.isArray(assignmentOverviews) ? assignmentOverviews : [];
  const { fallbackAssignmentTitle = "Assignment" } = options;

  return safeAssignments
    .map((item, index) => {
      const totalStudents = Math.max(0, Number(item.totalStudents) || 0);
      const waitingFeedback = Math.min(totalStudents, Math.max(0, Number(item.pendingReviewCount) || 0));
      const rawFeedbackSent =
        item.gradedCount != null
          ? Math.max(0, Number(item.gradedCount) || 0)
          : Math.max(0, (Number(item.turnedInCount) || 0) - waitingFeedback);
      const feedbackSent = Math.min(Math.max(totalStudents - waitingFeedback, 0), rawFeedbackSent);
      const notSubmitted = Math.max(totalStudents - waitingFeedback - feedbackSent, 0);

      return {
        id: item.assignmentId ?? index,
        label: item.assignmentTitle || `${fallbackAssignmentTitle} ${index + 1}`,
        totalStudents,
        feedbackSent,
        waitingFeedback,
        notSubmitted,
        dueAt: item.dueAt || null,
      };
    })
    .sort((left, right) => {
      if (!left.dueAt && !right.dueAt) {
        return 0;
      }
      if (!left.dueAt) {
        return 1;
      }
      if (!right.dueAt) {
        return -1;
      }
      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });
}

export function getBestQuizAttemptsByStudent(quizAttempts = []) {
  const safeAttempts = Array.isArray(quizAttempts) ? quizAttempts : [];
  const bestByStudent = new Map();

  safeAttempts.forEach((attempt, index) => {
    const studentKey = attempt.studentId ?? attempt.userId ?? attempt.studentEmail ?? `attempt-${index}`;
    const current = bestByStudent.get(studentKey);

    if (!current) {
      bestByStudent.set(studentKey, attempt);
      return;
    }

    const currentScore = current.grade == null ? -1 : Number(current.grade) || 0;
    const nextScore = attempt.grade == null ? -1 : Number(attempt.grade) || 0;
    if (nextScore > currentScore) {
      bestByStudent.set(studentKey, attempt);
      return;
    }

    if (nextScore < currentScore) {
      return;
    }

    const currentTime = new Date(current.completedTime || current.startTime || 0).getTime();
    const nextTime = new Date(attempt.completedTime || attempt.startTime || 0).getTime();
    if (nextTime > currentTime) {
      bestByStudent.set(studentKey, attempt);
    }
  });

  return Array.from(bestByStudent.values());
}

export function buildQuizHistogramData(quizAttempts = []) {
  const bestAttempts = getBestQuizAttemptsByStudent(quizAttempts);
  const bins = [
    { label: "0-9", min: 0, max: 9, color: "#f43f5e" },
    { label: "10-19", min: 10, max: 19, color: "#f43f5e" },
    { label: "20-29", min: 20, max: 29, color: "#f43f5e" },
    { label: "30-39", min: 30, max: 39, color: "#fb7185" },
    { label: "40-49", min: 40, max: 49, color: "#fb7185" },
    { label: "50-59", min: 50, max: 59, color: "#f59e0b" },
    { label: "60-69", min: 60, max: 69, color: "#f59e0b" },
    { label: "70-79", min: 70, max: 79, color: "#10b981" },
    { label: "80-89", min: 80, max: 89, color: "#10b981" },
    { label: "90-100", min: 90, max: 100, color: "#059669" },
  ].map((item) => ({ ...item, value: 0 }));

  bestAttempts.forEach((attempt) => {
    if (attempt.grade == null) {
      return;
    }
    const score = Math.max(0, Math.min(100, Number(attempt.grade) || 0));
    const target =
      bins.find((item) => score >= item.min && score <= item.max) ||
      bins[bins.length - 1];
    target.value += 1;
  });

  return bins;
}

export function buildQuizPassRateData(quizSummaries = []) {
  const safeSummaries = Array.isArray(quizSummaries) ? quizSummaries : [];

  return safeSummaries
    .map((summary) => {
      let passed = 0;
      let notPassed = 0;
      let waitingReview = 0;

      if (summary.passed != null && summary.notPassed != null && (!summary.attempts || summary.attempts.length === 0)) {
        passed = Number(summary.passed) || 0;
        notPassed = Number(summary.notPassed) || 0;
        waitingReview = Number(summary.waitingReview) || 0;
      } else {
        const bestAttempts = getBestQuizAttemptsByStudent(summary.attempts);
        waitingReview = bestAttempts.filter((item) => item.gradingStatus === "NEEDS_REVIEW").length;
        passed = bestAttempts.filter((item) => item.isPassed === true && item.gradingStatus !== "NEEDS_REVIEW").length;
        notPassed = bestAttempts.filter((item) => item.isPassed === false && item.gradingStatus !== "NEEDS_REVIEW").length;
      }

      const reviewed = passed + notPassed;
      const passRate = reviewed ? Number(((passed / reviewed) * 100).toFixed(1)) : 0;

      return {
        id: summary.id,
        label: summary.title,
        value: passRate,
        passed,
        notPassed,
        waitingReview,
        color: passRate < 50 ? "#f43f5e" : passRate < 70 ? "#f59e0b" : "#10b981",
      };
    })
    .sort((left, right) => left.value - right.value);
}

export function buildQuizParticipationRows(students = [], quizAttempts = []) {
  const safeStudents = Array.isArray(students) ? students : [];
  const safeAttempts = Array.isArray(quizAttempts) ? quizAttempts : [];
  const attemptsByStudent = new Map();

  safeAttempts.forEach((attempt, index) => {
    const studentKey = attempt.studentId ?? attempt.userId ?? attempt.studentEmail ?? `attempt-${index}`;
    if (!attemptsByStudent.has(studentKey)) {
      attemptsByStudent.set(studentKey, []);
    }
    attemptsByStudent.get(studentKey).push(attempt);
  });

  return safeStudents.map((student) => {
    const studentKey = student.studentId ?? student.userId ?? student.email ?? student.id;
    const studentAttempts = [...(attemptsByStudent.get(studentKey) || [])].sort((left, right) => {
      const leftDate = new Date(left.completedTime || left.startTime || 0).getTime();
      const rightDate = new Date(right.completedTime || right.startTime || 0).getTime();
      return rightDate - leftDate;
    });

    const latestAttempt = studentAttempts[0] || null;
    const reviewedAttempts = studentAttempts.filter((attempt) => attempt.gradingStatus !== "NEEDS_REVIEW");
    const bestReviewedAttempt = reviewedAttempts.reduce((best, current) => {
      if (!best) {
        return current;
      }

      const bestScore = best.grade == null ? -1 : Number(best.grade) || 0;
      const currentScore = current.grade == null ? -1 : Number(current.grade) || 0;
      if (currentScore > bestScore) {
        return current;
      }
      if (currentScore < bestScore) {
        return best;
      }

      const bestDate = new Date(best.completedTime || best.startTime || 0).getTime();
      const currentDate = new Date(current.completedTime || current.startTime || 0).getTime();
      return currentDate > bestDate ? current : best;
    }, null);

    let status = "NOT_STARTED";
    if (studentAttempts.length > 0) {
      const hasWaitingReview = studentAttempts.some((attempt) => attempt.gradingStatus === "NEEDS_REVIEW");
      if (hasWaitingReview) {
        status = "WAITING_REVIEW";
      } else if (bestReviewedAttempt?.isPassed === true) {
        status = "PASSED";
      } else {
        status = "NOT_PASSED";
      }
    }

    return {
      key: student.id || student.studentId,
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      studentNumber: student.studentNumber,
      progress: student.progress,
      attemptsCount: studentAttempts.length,
      status,
      latestAttemptId: latestAttempt?.id || null,
      latestCompletedAt: latestAttempt?.completedTime || latestAttempt?.startTime || null,
      bestScore: bestReviewedAttempt?.grade ?? null,
      bestAttemptId: bestReviewedAttempt?.id || null,
    };
  });
}

export function formatDateTime(value) {
  return formatDateTimeWithOptions(value);
}

export function formatDateTimeWithOptions(
  value,
  {
    locale = "vi-VN",
    emptyLabel = "",
  } = {}
) {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return emptyLabel;
  }

  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
