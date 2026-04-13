import React from "react";
import {
  ArrowRightIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { Popconfirm } from "antd";

export default function CourseCard({
  id,
  title,
  author,
  image,
  type = "student", // 'student' | 'teacher'
  status, // 'active' | 'draft' | 'archived'
  code,
  studentsCount,
  schedule,
  progress = 0, // Student progress percentage (0-100)
  onManage,
  onEdit,
  onPreview,
  onDelete,
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
              {title && title !== "undefined" ? title : (code || "Lớp học không tên")}
            </h3>
            {status === "PUBLIC" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Đang hoạt động
              </span>
            )}
            {status === "PRIVATE" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                Bản nháp
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
            <button
              onClick={onPreview || onEdit}
              className="flex-1 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-primary text-white text-xs font-bold leading-normal tracking-wide hover:bg-primary/90"
            >
              Chi tiết
            </button>
            {onDelete && (
              <Popconfirm
                title="Xóa lớp học này?"
                description="Hành động này không thể hoàn tác."
                onConfirm={onDelete}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <button className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </Popconfirm>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Rating has been removed.

  return (
    <div className="flex h-full w-72 flex-col gap-4 rounded-xl bg-white dark:bg-background-dark shadow-md dark:shadow-xl dark:shadow-black/20 hover:shadow-lg hover:-translate-y-1 transform transition duration-200">
      <div
        className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-t-xl flex flex-col"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
        <div>
          <p className="text-lg font-bold leading-normal text-[#111418] dark:text-white">
            {title && title !== "undefined" ? title : (code || "Lớp học không tên")}
          </p>
          <p className="text-sm font-normal leading-normal text-slate-500 dark:text-slate-400">
            {author}
          </p>
          
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
          onClick={() => navigate(`/class-sections/${id}`)}
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
