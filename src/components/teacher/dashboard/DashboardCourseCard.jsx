import React from "react";
import { UserGroupIcon, StarIcon } from "@heroicons/react/24/outline";

export default function DashboardCourseCard({ title, students, classCode, subject = "Chưa phân loại" }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <h4 className="font-bold text-[#111418] dark:text-white flex-1 line-clamp-1">
          {title && title !== "undefined" ? title : (classCode || "Lớp học không tên")}
        </h4>
      </div>
      
      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-4">
        <div className="flex items-center gap-1.5">
          <UserGroupIcon className="h-5 w-5" />
          <span>{students} học viên</span>
        </div>
      </div>

      <div className="space-y-2 mt-auto">
        {/* Class Code */}
        {classCode && (
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded inline-block">
            Mã lớp: {classCode}
          </div>
        )}

        {/* Subject */}
        <div className="block mt-2">
          <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full truncate max-w-full inline-block">
            {subject}
          </span>
        </div>
      </div>
    </div>
  );
}
