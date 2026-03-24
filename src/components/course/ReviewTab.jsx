import React, { useState, useEffect, useRef } from "react";
import { Input, Select, Spin, message, Dropdown } from "antd";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getReviewsByCourse, getReviewStats, createReview, updateReview, deleteReview } from "../../api/review";

export default function ReviewTab({ enrollmentStatus, onReviewChanged }) {
  const { user } = useAuth();
  const { id: courseId } = useParams();
  const isApproved = enrollmentStatus === "APPROVED";
  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const scrollPositionRef = useRef(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterRating, setFilterRating] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserReview, setCurrentUserReview] = useState(null);
  const [isEditingOwnReview, setIsEditingOwnReview] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const loadStartTimeRef = useRef(null);

  console.log("Enrollment status in ReviewTab:", enrollmentStatus);

  useEffect(() => {
    fetchInitialUserReview();
    fetchReviewsToDisplay();
  }, [courseId, user?.id]);

  useEffect(() => {
    fetchReviewsToDisplay();
  }, [courseId, sortBy, filterRating]);

  // Fetch user's own review once (independent of filters)
  const fetchInitialUserReview = async () => {
    if (!courseId || !user?.id) return;
    
    try {
      // Fetch all reviews (no filter) to find user's review
      const reviewsResponse = await getReviewsByCourse(courseId, {
        page: 0,
        size: 100,
        sort: "createdAt,desc",
        rating: null, // No filter - get all
      });
      
      let reviewsData = reviewsResponse.data.pageList || [];
      reviewsData = Array.isArray(reviewsData) ? reviewsData : [];
      
      // Find user's review
      const myReview = reviewsData?.find(r => r.studentId === user?.id);
      if (myReview) {
        setCurrentUserReview(myReview);
        setRating(myReview.ratingValue || 0);
        setReviewContent(myReview.description || "");
      } else {
        setCurrentUserReview(null);
        setRating(0);
        setReviewContent("");
      }
    } catch (err) {
      console.error("Error fetching user review:", err);
    }
  };

  // Fetch reviews to display (with filters applied)
  const fetchReviewsToDisplay = async () => {
    if (!courseId) return;
    
    try {
      // Save scroll position before fetching
      scrollPositionRef.current = window.scrollY;
      loadStartTimeRef.current = Date.now();
      setLoading(true);
      
      // Fetch review stats
      const statsResponse = await getReviewStats(courseId);
      setReviewStats(statsResponse.data);
      
      // Fetch reviews with filter applied
      const reviewsResponse = await getReviewsByCourse(courseId, {
        page: 0,
        size: 10,
        sort: sortBy === "newest" ? "createdAt,desc" : "helpful,desc",
        rating: filterRating === "all" ? null : filterRating,
      });
      
      // Handle pagination response structure
      let reviewsData = reviewsResponse.data.pageList;
      reviewsData = Array.isArray(reviewsData) ? reviewsData : [];
      
      setReviews(reviewsData);
      
      setPage(0);
      const totalElements = reviewsResponse.data.totalElements || 0;
      const pageSize = 10;
      setHasMore(totalElements > pageSize);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      message.error("Lỗi khi tải đánh giá");
      setReviewStats(null);
      setReviews([]);
    } finally {
      setLoading(false);
      
      // Restore scroll position after loading
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current);
      }, 0);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      message.error("Vui lòng chọn số sao");
      return;
    }
    if (!reviewContent.trim()) {
      message.error("Vui lòng nhập nhận xét");
      return;
    }

    try {
      setSubmitting(true);
      const reviewData = { rating, comment: reviewContent };
      
      if (currentUserReview) {
        // Update existing review
        await updateReview(courseId, reviewData);
        message.success("Cập nhật đánh giá thành công");
      } else {
        // Create new review
        await createReview(courseId, reviewData);
        message.success("Gửi đánh giá thành công");
      }
      
      setIsEditingOwnReview(false);
      // Refresh user review and displayed reviews
      await fetchInitialUserReview();
      await fetchReviewsToDisplay();
      // Notify parent to refresh course data (rating, review count)
      if (onReviewChanged) onReviewChanged();
    } catch (err) {
      message.error(err.message || "Lỗi khi gửi đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    try {
      setSubmitting(true);
      await deleteReview(courseId);
      message.success("Xóa đánh giá thành công");
      setCurrentUserReview(null);
      setRating(0);
      setReviewContent("");
      // Refresh user review and displayed reviews
      await fetchInitialUserReview();
      await fetchReviewsToDisplay();
      // Notify parent to refresh course data (rating, review count)
      if (onReviewChanged) onReviewChanged();
    } catch (err) {
      message.error(err.message || "Lỗi khi xóa đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadMore = async () => {
    try {
      const nextPage = page + 1;
      const reviewsResponse = await getReviewsByCourse(courseId, {
        page: nextPage,
        size: 10,
        sort: sortBy === "newest" ? "createdAt,desc" : "helpful,desc",
        rating: filterRating === "all" ? null : filterRating,
      });
      
      const newReviews = reviewsResponse.data || [];
      setReviews([...reviews, ...(Array.isArray(newReviews) ? newReviews : [])]);
      setPage(nextPage);
      
      if (!Array.isArray(newReviews) || newReviews.length < 10) {
        setHasMore(false);
      }
    } catch (err) {
      message.error("Lỗi khi tải thêm đánh giá");
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-6">
        Đánh giá từ học viên
      </h3>

      {loading && (Date.now() - (loadStartTimeRef.current || Date.now())) > 500 ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Write Review - Only show if user is APPROVED */}
          {isApproved ? (
            !currentUserReview || isEditingOwnReview ? (
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="text-lg font-bold text-[#111418] dark:text-white mb-4">
                  {isEditingOwnReview ? "Chỉnh sửa đánh giá" : "Viết đánh giá của bạn"}
                </h4>
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bạn đánh giá khóa học này bao nhiêu sao?
                    </p>
                    <div className="flex gap-1 items-center">
                      <div className="flex flex-row-reverse gap-1 justify-end">
                        {[5, 4, 3, 2, 1].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className={`transition-colors cursor-pointer p-0.5 ${
                              star <= (hoverRating || rating) ? "text-yellow-500" : "text-gray-300"
                            }`}
                          >
                            <span className="material-symbols-outlined !text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              star
                            </span>
                          </button>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
                        (Chọn số sao)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nhận xét chi tiết
                    </label>
                    <Input.TextArea
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="Hãy chia sẻ trải nghiệm của bạn về nội dung, giảng viên và các dự án thực tế trong khóa học này..."
                      rows={4}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSubmitReview}
                      disabled={submitting}
                      className="min-w-[160px] bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span>{submitting ? "Đang gửi..." : isEditingOwnReview ? "Cập nhật" : "Gửi đánh giá"}</span>
                      <span className="material-symbols-outlined !text-lg">send</span>
                    </button>
                    {isEditingOwnReview && (
                      <button
                        onClick={() => {
                          setIsEditingOwnReview(false);
                          setRating(currentUserReview?.ratingValue || 0);
                          setReviewContent(currentUserReview?.description || "");
                        }}
                        className="min-w-[100px] bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null
          ) : !isTeacherOrAdmin ? (
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-blue-700 dark:text-blue-300 font-medium">
                <span className="material-symbols-outlined align-middle inline-block !text-base mr-2">info</span>
                Vui lòng tham gia khóa học để viết đánh giá
              </p>
            </div>
          ) : null}

          {/* Rating Stats - Only show if there are reviews */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-4 mt-4">
              <div className="md:col-span-3 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="text-5xl font-black text-primary mb-2">
                  {reviewStats.averageRating?.toFixed(1) || 0}
                </div>
                <div className="flex text-yellow-500 mb-1">
                  {[...Array(5)].map((_, i) => {
                    const avg = reviewStats.averageRating || 0;
                    return (
                      <span
                        key={i}
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {i < Math.floor(avg) ? "star" : i < avg ? "star_half" : "star"}
                      </span>
                    );
                  })}
                </div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                  Xếp hạng khóa học
                </div>
              </div>

              <div className="md:col-span-9 space-y-2">
                {reviewStats.ratingDistribution &&
                  Object.entries(reviewStats.ratingDistribution)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([stars, count]) => {
                      const total = reviewStats.totalReviews || 1;
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <div key={stars} className="flex items-center gap-4">
                          <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center gap-1 w-24">
                            <div className="flex text-yellow-500">
                              <span
                                className="material-symbols-outlined !text-[16px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {stars} sao ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 mt-6">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => setFilterRating("all")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  filterRating === "all"
                    ? "bg-primary text-white border border-primary"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary"
                }`}
              >
                Tất cả
              </button>
              {[5, 4, 3].map((stars) => (
                <button
                  key={stars}
                  onClick={() => setFilterRating(stars)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterRating === stars
                      ? "bg-primary text-white border border-primary"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary"
                  }`}
                >
                  {stars} sao
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sắp xếp:</span>
              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: 150 }}
                options={[
                  { label: "Mới nhất", value: "newest" },
                  { label: "Hữu ích nhất", value: "helpful" },
                ]}
              />
            </div>
          </div>
          {/* Reviews List */}
          <div className="space-y-6">
            {!reviewStats || reviewStats.totalReviews === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Chưa có đánh giá nào cho khóa học
              </div>
            ) : (
              <>
                {reviews.map((review, index) => (
                  <div key={review.id}>
                    {index === 0 && review.studentId === user?.id && (
                      <h4 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Đánh giá của bạn</h4>
                    )}
                    {index === 1 && review.studentId !== user?.id && (
                      <h4 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Các đánh giá khác</h4>
                    )}
                    {index > 0 && index - 1 === 0 && reviews[0]?.studentId === user?.id && review.studentId !== user?.id && (
                      <h4 className="text-lg font-bold text-[#111418] dark:text-white mb-4">Các đánh giá khác</h4>
                    )}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-white font-bold">
                              {review.studentFullname ? review.studentFullname.charAt(0).toUpperCase() : "?"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#111418] dark:text-white">
                              {review.studentFullname || review.studentUsername}
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="flex text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className="material-symbols-outlined !text-[14px]"
                                    style={{
                                      fontVariationSettings: i < review.ratingValue ? "'FILL' 1" : "'FILL' 0",
                                    }}
                                  >
                                    star
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {review.ratingValue} sao
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.studentId === user?.id && (
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: "edit",
                                  label: "Cập nhật",
                                  onClick: () => setIsEditingOwnReview(true),
                                },
                                {
                                  key: "delete",
                                  label: "Xóa",
                                  danger: true,
                                  onClick: handleDeleteReview,
                                },
                              ],
                            }}
                            trigger={["click"]}
                          >
                            <button className="text-gray-400 hover:text-primary">
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                          </Dropdown>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {review.description}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-center pt-4">
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      className="px-8 py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-colors"
                    >
                      Xem thêm đánh giá
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
