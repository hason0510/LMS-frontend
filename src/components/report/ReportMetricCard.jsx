import React from "react";

const toneMap = {
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export default function ReportMetricCard({ icon, label, value, hint, tone = "slate", loading = false }) {
  return (
    <article className="!rounded-2xl border border-slate-200 bg-white !p-4 shadow-sm sm:!p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between !gap-3">
        <div className="min-w-0">
          <p className="!m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <>
              <div className="!mt-3 h-8 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              {hint ? <div className="!mt-2 h-4 w-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/80" /> : null}
            </>
          ) : (
            <>
              <p className="!m-0 !mt-2 text-[28px] font-black leading-none text-slate-950 sm:text-3xl dark:text-white">{value}</p>
              {hint ? <p className="!m-0 !mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{hint}</p> : null}
            </>
          )}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center !rounded-2xl border ${toneMap[tone] || toneMap.slate}`}>
          {icon}
        </div>
      </div>
    </article>
  );
}
