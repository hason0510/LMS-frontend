const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms`;

export async function getMyNotifications() {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/notifications`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return await response.json();
}

export async function countUnreadNotifications() {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/notifications/unread/count`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to count unread notifications");
  }

  return await response.json();
}

export async function markNotificationAsRead(notificationId) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(
    `${API_URL}/notifications/${notificationId}/read`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }

  return await response.json();
}
