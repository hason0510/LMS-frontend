//const API_URL = 'http://localhost:8080/api/v1/lms';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export async function getUserById(id) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }
  return await response.json();
}

export async function updateUser(id, userData) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    throw new Error('Failed to update user data');
  }
  return await response.json();
}

export async function getAllUsers(page = 0, size = 50) {
  const response = await fetch(`${API_URL}/users?pageNumber=${page+1}&pageSize=${size}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return await response.json();
}

export async function deleteUser(id) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
  // Handle 204 No Content response
  if (response.status === 204) {
    return {};
  }
  return await response.json();
}

export async function uploadUserAvatar(userId, file) {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload avatar');
  }

  return await response.json();
}

export async function changePassword(passwordData) {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(passwordData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Không thể đổi mật khẩu');
  }

  return await response.json();
}

export async function createUser(userData) {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Không thể tạo người dùng');
  }

  return await response.json();
}

