import axiosClient from "./axiosClient";

export async function getLessonsByChapterId(chapterId) {
  const response = await axiosClient.get(`lessons/chapter/${chapterId}`);
  return response.data;
}

export async function getLessonById(id) {
  const response = await axiosClient.get(`lessons/${id}`);
  return response.data;
}

export async function createLesson(lessonData) {
  const response = await axiosClient.post('lessons', lessonData);
  return response.data;
}

export async function createLessonInChapter(chapterId, lessonData) {
  const response = await axiosClient.post(`chapters/${chapterId}/lessons`, lessonData);
  return response.data;
}

export async function updateLesson(id, lessonData) {
  const response = await axiosClient.put(`lessons/${id}`, lessonData);
  return response.data;
}

export async function deleteLesson(id) {
  const response = await axiosClient.delete(`lessons/${id}`);
  return response.data;
}

export async function uploadLessonFile(lessonId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post(`lessons/${lessonId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}
