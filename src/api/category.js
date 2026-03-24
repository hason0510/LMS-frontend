
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms/categories`;

export async function getAllCategories(pageNumber = 1, pageSize = 100) {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${API_URL}?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  return await response.json();
}
