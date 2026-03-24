import React from "react";
import { UserGroupIcon, StarIcon } from "@heroicons/react/24/outline";

export default function DashboardCourseCard({ title, students, rating = 0, category = "Chưa phân loại" }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <h4 className="font-bold text-[#111418] dark:text-white flex-1">{title}</h4>
      </div>
      
      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-4">
        <div className="flex items-center gap-1.5">
          <UserGroupIcon className="h-5 w-5" />
          <span>{students} học viên</span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-300 dark:text-slate-600"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {rating.toFixed(1)}
          </span>
        </div>

        {/* Category */}
        <div className="inline-block">
          <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
            {category}
          </span>
        </div>
      </div>
    </div>
  );
}
