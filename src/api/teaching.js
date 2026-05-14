import axiosClient from "./axiosClient";

export async function getTeachingContext() {
  const response = await axiosClient.get("teaching/context");
  return response.data;
}

export async function getMyTeachingClasses() {
  const response = await axiosClient.get("teaching/my-classes");
  return response.data;
}

export async function getTeachingWorkbenchSummary(params = {}) {
  const response = await axiosClient.get("teaching/workbench/summary", { params });
  return response.data;
}

export async function getTeachingReviewQueue() {
  const response = await axiosClient.get("teaching/workbench/review-queue");
  return response.data;
}

export async function getClassWorkbenchSummary(classSectionId) {
  const response = await axiosClient.get(`class-sections/${classSectionId}/workbench/summary`);
  return response.data;
}

export async function getClassReviewQueue(classSectionId) {
  const response = await axiosClient.get(`class-sections/${classSectionId}/workbench/review-queue`);
  return response.data;
}

export async function getClassPeople(classSectionId, params = {}) {
  const response = await axiosClient.get(`class-sections/${classSectionId}/people`, { params });
  return response.data;
}
