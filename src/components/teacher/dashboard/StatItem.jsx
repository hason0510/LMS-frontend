/*import React from "react";

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
}*/

import React from "react";

export default function StatItem({ icon, colorClass, label, value }) {
    return (
        <div className="flex items-center gap-4">
            <div
                className={`flex items-center justify-center size-10 rounded-lg ${colorClass}`}
            >
                {icon}
            </div>

            {/* 1. Biến div này thành flex column để quản lý khoảng cách chuẩn hơn */}
            <div className="flex flex-col justify-center">

                {/* Gốc: className="text-sm text-slate-500 dark:text-slate-400 m-0 leading-tight" */}
                <p className="text-sm text-slate-500 dark:text-slate-400 !mb-0.5 leading-tight">
                    {label}
                </p>

                {/* Gốc: className="font-bold text-lg text-[#111418] dark:text-white m-0 leading-tight mt-0.5" */}
                <p className="font-bold text-lg text-[#111418] dark:text-white !mb-0.5 mt-1.5 leading-tight">
                    {value}
                </p>

            </div>
        </div>
    );
}
