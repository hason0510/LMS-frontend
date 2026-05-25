import React from "react";
import { Link } from "react-router-dom";

/*
Gốc:
export default function SidebarLink({ icon, label, active, to, isCollapsed }) {
  return (
    <Link
      to={to || "#"}
      title={isCollapsed ? label : ""}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
      }`}
    >
      {icon}
      {!isCollapsed && <span className="text-sm font-semibold">{label}</span>}
    </Link>
  );
}
*/
/*
Mục tiêu:
Default: slate-900 / slate-400
Hover: blue-500
Active: blue-600
*/

export default function SidebarLink({ icon, label, active, to, isCollapsed }) {

  const linkClasses = active
      ? "bg-blue-50! text-blue-600! dark:bg-blue-500/10! dark:text-blue-300!"
      : "text-slate-800! hover:bg-slate-50! hover:text-blue-500! dark:text-slate-200! dark:hover:bg-slate-700/50! dark:hover:text-blue-300!";

  const iconClasses = active
      ? "text-blue-600! dark:text-blue-300!"
      : "text-slate-500! group-hover:text-blue-500! dark:text-slate-400! dark:group-hover:text-blue-300!";

  const textClasses = active
      ? "text-blue-600! dark:text-blue-300!"
      : "text-slate-800! dark:text-slate-200! group-hover:text-blue-500! dark:group-hover:text-blue-300!";

  return (
      <Link
          to={to || "#"}
          title={isCollapsed ? label : ""}
          aria-current={active ? "page" : undefined}
          className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 no-underline transition-all duration-200 ${linkClasses}`}
      >
      <span className={`shrink-0 transition-colors duration-200 ${iconClasses}`}>
        {icon}
      </span>

        {!isCollapsed && (
            <span className={`text-sm font-semibold leading-none transition-colors duration-200 ${textClasses}`}>
          {label}
        </span>
        )}
      </Link>
  );
}
