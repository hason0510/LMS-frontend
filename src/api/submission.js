import axiosClient from "./axiosClient";

export async function submitAssignment(assignmentId, classSectionId, payload) {
  const response = await axiosClient.post(`submissions/assignments/${assignmentId}/me`, payload, {
    params: classSectionId ? { classSectionId } : undefined,
  });
  return response.data;
}

export async function getMySubmission(assignmentId, classSectionId) {
  const response = await axiosClient.get(`submissions/assignments/${assignmentId}/me`, {
    params: classSectionId ? { classSectionId } : undefined,
  });
  return response.data;
}

export async function getAssignmentSubmissions(assignmentId, classSectionId, includeNotSubmitted = true) {
  const response = await axiosClient.get(`submissions/assignments/${assignmentId}`, {
    params: {
      includeNotSubmitted,
      ...(classSectionId ? { classSectionId } : {}),
    },
  });
  return response.data;
}

export async function gradeSubmission(submissionId, payload) {
  const response = await axiosClient.post(`submissions/${submissionId}/grade`, payload);
  return response.data;
}

export async function returnSubmission(submissionId, payload) {
  const response = await axiosClient.post(`submissions/${submissionId}/return`, payload);
  return response.data;
}

export async function getSubmissionById(submissionId) {
  const response = await axiosClient.get(`submissions/${submissionId}`);
  return response.data;
}
