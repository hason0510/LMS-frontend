import axiosClient from "./axiosClient";

export async function getAllCategories(pageNumber = 1, pageSize = 100) {
  const response = await axiosClient.get('categories', {
    params: { pageNumber, pageSize }
  });
  return response.data;
}

export async function createCategory(data) {
  const response = await axiosClient.post('categories', data);
  return response.data;
}

export async function updateCategory(id, data) {
  const response = await axiosClient.put(`categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id) {
  const response = await axiosClient.delete(`categories/${id}`);
  return response.data;
}
