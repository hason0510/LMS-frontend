import React from "react";
import {
  ArrowRightIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export default function CourseCard({
  id,
  title,
  author,
  image,
  rating = 0,
  reviews,
  type = "student", // 'student' | 'teacher'
  status, // 'active' | 'draft' | 'archived'
  code,
  studentsCount,
  schedule,
  progress = 0, // Student progress percentage (0-100)
  onManage,
  onEdit,
  onPreview,
}) {
  const navigate = useNavigate();

  const getProgressColor = (progress) => {
    if (progress === 100) return "#22c55e";
    if (progress >= 50) return "#137fec";
    return "#9ca3af";
  };

  if (type === "teacher") {
    return (
      <div className="flex flex-col w-full bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
        <div
          className="bg-center bg-no-repeat aspect-video bg-cover"
          style={{ backgroundImage: `url(${image})` }}
        ></div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white pr-2">
              {title}
            </h3>
            {status === "active" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Hoạt động
              </span>
            )}
            {status === "draft" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                Bản nháp
              </span>
            )}
            {status === "archived" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Đã lưu trữ
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Mã lớp: #{code}
          </p>
          <div className="flex-grow space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-4">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              <span>{studentsCount} học viên</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5" />
              <span>{schedule}</span>
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            {status === "active" ? (
              <>
                <button
                  onClick={onPreview}
                  className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-primary text-white text-xs font-bold leading-normal tracking-wide hover:bg-primary/90"
                >
                  Xem chi tiết
                </button>
                <button
                  onClick={onManage}
                  className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold leading-normal tracking-wide"
                >
                  Quản lý
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-primary text-white text-xs font-bold leading-normal tracking-wide hover:bg-primary/90"
                >
                  Chi tiết
                </button>
                <button
                  onClick={onPreview}
                  className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold leading-normal tracking-wide"
                >
                  Xem trước
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(
        <span
          key={i}
          className="material-symbols-outlined !text-base text-yellow-500"
          style={{ fontVariationSettings: `"FILL" 1` }}
        >
          star
        </span>
      );
    } else if (rating >= i - 0.5) {
      stars.push(
        <span
          key={i}
          className="material-symbols-outlined !text-base text-yellow-500"
          style={{ fontVariationSettings: `"FILL" 1` }}
        >
          star_half
        </span>
      );
    } else {
      stars.push(
        <span
          key={i}
          className="material-symbols-outlined !text-base text-gray-300 dark:text-gray-600"
        >
          star
        </span>
      );
    }
  }

  return (
    <div className="flex h-full w-72 flex-col gap-4 rounded-xl bg-white dark:bg-background-dark shadow-md dark:shadow-xl dark:shadow-black/20 hover:shadow-lg hover:-translate-y-1 transform transition duration-200">
      <div
        className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-t-xl flex flex-col"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
        <div>
          <p className="text-lg font-bold leading-normal text-[#111418] dark:text-white">
            {title}
          </p>
          <p className="text-sm font-normal leading-normal text-slate-500 dark:text-slate-400">
            {author}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-bold text-sm text-orange-500">
              {rating ? rating.toFixed(1) : "0.0"}
            </span>
            <div className="flex">{stars}</div>
            {reviews ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({reviews})
              </span>
            ) : null}
          </div>
          
          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: getProgressColor(progress),
                  }}
                ></div>
              </div>
              <span className="text-xs font-medium text-[#111418] dark:text-white min-w-fit">
                {progress}%
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(`/courses/${id}`)}
          className="btn btn-outline w-full text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-primary hover:text-white dark:hover:bg-primary/90"
          aria-label={`Xem chi tiết ${title}`}
        >
          <span>Xem chi tiết</span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
