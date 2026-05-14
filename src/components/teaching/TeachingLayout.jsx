import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  BellIcon,
  ClipboardDocumentCheckIcon,
  RectangleStackIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../common/Avatar";
import useUserStore from "../../store/useUserStore";
import useNotificationStore from "../../store/useNotificationStore";

export default function TeachingLayout({ children }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const navItems = [
    { label: t("teaching.nav.overview"), path: "/teaching", icon: Squares2X2Icon },
    { label: t("teaching.nav.classes"), path: "/teaching/classes", icon: AcademicCapIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/teaching" className="flex items-center gap-2 text-primary shrink-0">
              <span className="material-symbols-outlined text-3xl leading-none">school</span>
              <span className="hidden text-lg font-black leading-none text-slate-950 dark:text-white sm:block">
                {t("teaching.layout.title")}
              </span>
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-800 md:block" />
            <div className="hidden items-center rounded-full bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-900 md:flex">
              <button
                onClick={() => navigate("/home")}
                className="rounded-full px-3 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                {t("teaching.layout.learningWorkspace")}
              </button>
              <button className="rounded-full bg-white px-3 py-1 text-primary shadow-sm dark:bg-slate-800">
                {t("teaching.layout.teachingWorkspace")}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip title={t("teaching.layout.backToLearning")}>
              <Button
                type="text"
                icon={<ArrowLeftIcon className="h-5 w-5" />}
                onClick={() => navigate("/home")}
                className="hidden sm:inline-flex"
              />
            </Tooltip>
            <Tooltip title={t("common.thongBao")}>
              <Button
                type="text"
                icon={
                  <span className="relative inline-flex">
                    <BellIcon className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />
                    )}
                  </span>
                }
                onClick={() => navigate("/notifications")}
              />
            </Tooltip>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-900">
              <Avatar src={user?.imageUrl} alt={user?.fullName || user?.username} className="!h-8 !w-8" />
              <div className="hidden min-w-0 pr-2 text-left sm:block">
                <p className="m-0 max-w-36 truncate text-xs font-bold text-slate-900 dark:text-white">
                  {user?.fullName || user?.username || t("teaching.layout.defaultUser")}
                </p>
                <p className="m-0 text-[11px] leading-tight text-slate-500">{t("teaching.layout.teachingWorkspace")}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 border-r border-slate-200 bg-white px-3 py-5 dark:border-slate-800 dark:bg-slate-950 lg:block">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <div className="mb-2 flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
            <ClipboardDocumentCheckIcon className="h-4 w-4 text-primary" />
            {t("teaching.layout.focusTitle")}
          </div>
          {t("teaching.layout.focusDescription")}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <Link
          to="/teaching"
          className={`flex flex-col items-center gap-1 py-2 text-xs font-semibold ${location.pathname === "/teaching" ? "text-primary" : "text-slate-500"}`}
        >
          <Squares2X2Icon className="h-5 w-5" />
          {t("teaching.nav.overview")}
        </Link>
        <Link
          to="/teaching/classes"
          className={`flex flex-col items-center gap-1 py-2 text-xs font-semibold ${location.pathname.startsWith("/teaching/classes") ? "text-primary" : "text-slate-500"}`}
        >
          <RectangleStackIcon className="h-5 w-5" />
          {t("teaching.nav.classesShort")}
        </Link>
        <Link to="/teaching/classes" className="flex flex-col items-center gap-1 py-2 text-xs font-semibold text-slate-500">
          <UserGroupIcon className="h-5 w-5" />
          {t("teaching.nav.people")}
        </Link>
      </nav>

      <main className="px-4 pb-20 pt-20 sm:px-6 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
