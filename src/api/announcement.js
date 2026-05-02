import axiosClient from "./axiosClient";

export async function createAnnouncement(payload) {
  const response = await axiosClient.post("announcements", payload);
  return response.data;
}

export async function updateAnnouncement(id, payload) {
  const response = await axiosClient.put(`announcements/${id}`, payload);
  return response.data;
}

export async function getAnnouncementById(id) {
  const response = await axiosClient.get(`announcements/${id}`);
  return response.data;
}

export async function getAnnouncements(params = {}) {
  const response = await axiosClient.get("announcements", { params });
  return response.data;
}

export async function deleteAnnouncement(id) {
  const response = await axiosClient.delete(`announcements/${id}`);
  return response.data;
}
