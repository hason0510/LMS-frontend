import React from "react";

export default function NotificationItem({ icon, colorClass, text, time }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      <div
        className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${colorClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm text-[#111418] dark:text-white leading-snug">
          {text}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {time}
        </p>
      </div>
    </div>
  );
}
