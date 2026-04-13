import axiosClient from "./axiosClient";

export async function getAllSubjects() {
  const response = await axiosClient.get('subjects');
  return response.data;
}

export async function getSubjectsByCategory(categoryId) {
  const response = await axiosClient.get(`subjects/category/${categoryId}`);
  return response.data;
}

export async function getSubjectById(id) {
  const response = await axiosClient.get(`subjects/${id}`);
  return response.data;
}

export async function createSubject(data) {
  const response = await axiosClient.post('subjects', data);
  return response.data;
}

export async function updateSubject(id, data) {
  const response = await axiosClient.put(`subjects/${id}`, data);
  return response.data;
}

export async function deleteSubject(id) {
  const response = await axiosClient.delete(`subjects/${id}`);
  return response.data;
}
