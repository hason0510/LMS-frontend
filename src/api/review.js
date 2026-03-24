//const API_URL = "http://localhost:8080/api/v1/lms";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const API_URL = `${BACKEND_URL}/api/v1/lms`;

export async function getReviewsByCourse(courseId, params = {}) {
  const token = localStorage.getItem("accessToken");
  
  // Build query params - EnrollmentController expects pageNumber and pageSize
  const pageNumber = (params.page || 0) + 1; // Convert 0-indexed to 1-indexed
  const pageSize = params.size || 10;
  
  const queryParams = new URLSearchParams({
    pageNumber: pageNumber,
    pageSize: pageSize,
  });
  
  // Add rating filter if specified
  if (params.rating !== null && params.rating !== undefined && params.rating !== "all") {
    queryParams.append("ratingValue", params.rating);
  }

  const response = await fetch(
    `${API_URL}/courses/${courseId}/rating?${queryParams}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch reviews");
  }

  return await response.json();
}

export async function getReviewStats(courseId) {
  const token = localStorage.getItem("accessToken");
  
  // Get all ratings for the course to calculate stats
  const response = await fetch(
    `${API_URL}/courses/${courseId}/rating?pageNumber=1&pageSize=1000`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch review stats");
  }

  const responseData = await response.json();
  
  // Extract pageList from response structure
  const ratings = responseData.data?.pageList || [];
  
  // Calculate stats from the data
  if (!ratings || ratings.length === 0) {
    return {
      data: {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
      }
    };
  }
  
  const totalReviews = ratings.length;
  const sumRating = ratings.reduce((sum, r) => sum + (r.ratingValue || 0), 0);
  const averageRating = totalReviews > 0 ? sumRating / totalReviews : 0;
  
  // Calculate rating distribution
  const ratingDistribution = {};
  for (let i = 1; i <= 5; i++) {
    ratingDistribution[i] = ratings.filter(r => r.ratingValue === i).length;
  }
  
  return {
    data: {
      averageRating,
      totalReviews,
      ratingDistribution,
    }
  };
}

export async function createReview(courseId, reviewData) {
  const token = localStorage.getItem("accessToken");
  
  // Convert to CourseRatingRequest format
  const payload = {
    ratingValue: reviewData.rating,
    description: reviewData.comment,
  };
  
  const response = await fetch(`${API_URL}/courses/${courseId}/rating`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create review");
  }

  return await response.json();
}

export async function updateReviewHelpful(reviewId, isHelpful) {
  // This endpoint is not available in the current EnrollmentController
  // You may need to create a separate ReviewController for this functionality
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/reviews/${reviewId}/helpful`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isHelpful }),
  });

  if (!response.ok) {
    throw new Error("Failed to update review helpful");
  }

  return await response.json();
}

export async function updateReview(courseId, reviewData) {
  const token = localStorage.getItem("accessToken");
  
  // Convert to CourseRatingRequest format
  const payload = {
    ratingValue: reviewData.rating,
    description: reviewData.comment,
  };
  
  // Backend ratingCourse endpoint handles both create and update via POST
  const response = await fetch(`${API_URL}/courses/${courseId}/rating`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update review");
  }

  return await response.json();
}

export async function deleteReview(courseId) {
  const token = localStorage.getItem("accessToken");
  
  const response = await fetch(`${API_URL}/courses/${courseId}/rating`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete review");
  }

  return await response.json();
}
