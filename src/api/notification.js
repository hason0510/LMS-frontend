import axiosClient from "./axiosClient";

export async function countUnreadNotifications() {
  const response = await axiosClient.get('notifications/unread/count');
  return response.data;
}

export async function getMyNotifications() {
  const response = await axiosClient.get('notifications');
  return response.data;
}

export async function getMyNotificationsPage(pageNumber = 1, pageSize = 10) {
  const response = await axiosClient.get('notifications/page', {
    params: { pageNumber, pageSize }
  });
  return response.data;
}

export async function markNotificationAsRead(notificationId) {
  const response = await axiosClient.put(`notifications/${notificationId}/read`);
  return response.data;
}

export async function deleteNotification(notificationId) {
  const response = await axiosClient.delete(`notifications/${notificationId}`);
  return response.data;
}
