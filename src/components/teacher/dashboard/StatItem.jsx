import React from "react";

export default function StatItem({ icon, colorClass, label, value }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center justify-center size-10 rounded-lg ${colorClass}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-bold text-lg text-[#111418] dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}
