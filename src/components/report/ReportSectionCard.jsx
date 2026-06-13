import React from "react";

export default function ReportSectionCard({ title, subtitle, actions = null, children, className = "" }) {
  return (
    <section className={`!rounded-2xl border border-slate-200 bg-white !p-4 shadow-sm sm:!p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="!mb-4 flex flex-col !gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h2 className="!m-0 text-base font-black text-slate-950 sm:text-lg dark:text-white">{title}</h2> : null}
            {subtitle ? <p className="!m-0 !mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
