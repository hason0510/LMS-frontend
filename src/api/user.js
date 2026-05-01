import axiosClient from "./axiosClient";

export async function getUserById(id) {
  const response = await axiosClient.get(`users/${id}`);
  return response.data;
}

export async function updateUser(id, userData) {
  const response = await axiosClient.put(`users/${id}`, userData);
  return response.data;
}

export async function getAllUsers(page = 0, size = 50) {
  const response = await axiosClient.get(`users?pageNumber=${page+1}&pageSize=${size}`);
  return response.data;
}

export async function deleteUser(id) {
  const response = await axiosClient.delete(`users/${id}`);
  return response.data;
}

export async function uploadUserAvatar(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosClient.post(`users/${userId}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}

export async function changePassword(passwordData) {
  const response = await axiosClient.post(`auth/change-password`, passwordData);
  return response.data;
}

export async function createUser(userData) {
  const response = await axiosClient.post(`users`, userData);
  return response.data;
}

export async function searchUsers(params = {}) {
  const response = await axiosClient.get("users/search", { params });
  return response.data;
}

