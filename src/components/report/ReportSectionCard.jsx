import React from "react";

export default function ReportSectionCard({ title, subtitle, actions = null, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">{title}</h2> : null}
            {subtitle ? <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
