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
  BookOpenIcon,
  RectangleGroupIcon,
  TagIcon,
  BookmarkIcon,
  MegaphoneIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

export default function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="w-64 flex-shrink-0 flex-col bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex fixed top-[65px] bottom-0 left-0 overflow-y-auto z-40">
      <nav className="flex-1 px-4 py-6 space-y-2">
        <SidebarLink
          icon={<ChartBarIcon className="h-6 w-6" />}
          label={t("admin.thongKe")}
          active={currentPath === "/admin/reports"}
          to="/admin/reports"
        />
        <SidebarLink
          icon={<UserGroupIcon className="h-6 w-6" />}
          label={t("admin.quanLyNguoiDung")}
          active={currentPath.startsWith("/admin/users")}
          to="/admin/users"
        />
        <SidebarLink
          icon={<TagIcon className="h-6 w-6" />}
          label={t("admin.quanLyDanhMuc")}
          active={currentPath.startsWith("/admin/categories")}
          to="/admin/categories"
        />
        <SidebarLink
          icon={<BookmarkIcon className="h-6 w-6" />}
          label={t("admin.quanLyMonHoc")}
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
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          label={t("admin.assignments")}
          active={currentPath.startsWith("/admin/assignments")}
          to="/admin/assignments"
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
          icon={<PhotoIcon className="h-6 w-6" />}
          label={t("admin.quanLyMedia")}
          active={currentPath.startsWith("/admin/media")}
          to="/admin/media"
        />
        <SidebarLink
          icon={<MegaphoneIcon className="h-6 w-6" />}
          label={t("admin.announcements")}
          active={currentPath.startsWith("/admin/announcements")}
          to="/admin/announcements"
        />
        <SidebarLink
          icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
          label={t("admin.quizAttempts")}
          active={currentPath.startsWith("/admin/quiz-attempts")}
          to="/admin/quiz-attempts"
        />
        <SidebarLink
          icon={<CheckCircleIcon className="h-6 w-6" />}
          label={t("teacher.quanLyHocVien")}
          active={currentPath.startsWith("/admin/students")}
          to="/admin/students"
        />
      </nav>
    </aside>
  );
}
