import axiosClient from "./axiosClient";

export async function createAssignment(payload) {
  const response = await axiosClient.post("assignments", payload);
  return response.data;
}

export async function updateAssignment(id, payload) {
  const response = await axiosClient.put(`assignments/${id}`, payload);
  return response.data;
}

export async function getAssignmentById(id) {
  const response = await axiosClient.get(`assignments/${id}`);
  return response.data;
}

export async function getAssignmentsByClassSection(classSectionId) {
  const response = await axiosClient.get(`assignments/class-sections/${classSectionId}`);
  return response.data;
}

export async function deleteAssignment(id) {
  const response = await axiosClient.delete(`assignments/${id}`);
  return response.data;
}
