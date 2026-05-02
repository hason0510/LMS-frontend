import React from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SidebarLink from "./SidebarLink";
import {
  Squares2X2Icon,
  UserGroupIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  RectangleGroupIcon,
  TagIcon,
  BookmarkIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";

export default function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="w-64 flex-shrink-0 flex-col bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex fixed top-[65px] bottom-0 left-0 overflow-y-auto z-40">
      <nav className="flex-1 px-4 py-6 space-y-2">
        <SidebarLink
          icon={<Squares2X2Icon className="h-6 w-6" />}
          label={t("admin.tongQuan")}
          active={currentPath === "/admin/dashboard"}
          to="/admin/dashboard"
        />
        <SidebarLink
          icon={<UserGroupIcon className="h-6 w-6" />}
          label={t("admin.quanLyNguoiDung")}
          active={currentPath.startsWith("/admin/users")}
          to="/admin/users"
        />
        <SidebarLink
          icon={<TagIcon className="h-6 w-6" />}
          label="Quản lý danh mục"
          active={currentPath.startsWith("/admin/categories")}
          to="/admin/categories"
        />
        <SidebarLink
          icon={<BookmarkIcon className="h-6 w-6" />}
          label="Quản lý môn học"
          active={currentPath.startsWith("/admin/subjects")}
          to="/admin/subjects"
        />
        <SidebarLink
          icon={<AcademicCapIcon className="h-6 w-6" />}
          label={t("admin.quanLyLopHoc")}
          active={currentPath.startsWith("/admin/class-sections")}
          to="/admin/class-sections"
        />
        <SidebarLink
          icon={<BookOpenIcon className="h-6 w-6" />}
          label={t("admin.chuongTrinhHoc") || "Chương trình học"}
          active={currentPath.startsWith("/admin/curriculums")}
          to="/admin/curriculums"
        />
        <SidebarLink
          icon={<RectangleGroupIcon className="h-6 w-6" />}
          label={t("admin.nganHangCauHoi") || "Ngân hàng câu hỏi"}
          active={currentPath.startsWith("/admin/question-banks")}
          to="/admin/question-banks"
        />
        <SidebarLink
          icon={<MegaphoneIcon className="h-6 w-6" />}
          label="Announcements"
          active={currentPath.startsWith("/admin/announcements")}
          to="/admin/announcements"
        />
        <SidebarLink
          icon={<CheckCircleIcon className="h-6 w-6" />}
          label={t("teacher.quanLyHocVien")}
          active={currentPath.startsWith("/admin/students")}
          to="/admin/students"
        />
        <SidebarLink
          icon={<ChartBarIcon className="h-6 w-6" />}
          label={t("admin.thongKe")}
          active={currentPath === "/admin/reports"}
          to="/admin/reports"
        />
        <SidebarLink
          icon={<Cog6ToothIcon className="h-6 w-6" />}
          label={t("admin.caiDat")}
          active={currentPath === "/admin/settings"}
          to="/admin/settings"
        />
      </nav>
    </aside>
  );
}
