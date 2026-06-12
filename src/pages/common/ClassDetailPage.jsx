import React, { useDeferredValue, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "../../components/layout/Header";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import ClassCoverField from "../../components/media/ClassCoverField";
import CourseTabs from "../../components/course/CourseTabs";
import CourseContent from "../../components/course/CourseContent";
import ClassStaffModal from "../../components/teaching/ClassStaffModal";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import UserIdentity from "../../components/common/UserIdentity";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AnnouncementsTab from "../../components/course/AnnouncementsTab";
import { useAuth } from "../../contexts/AuthContext";
import {
  getClassSectionById,
  updateClassSectionStatus,
  resetClassCode,
  deleteClassCode,
  deleteClassSection,
  updateClassSection,
} from "../../api/classSection";
import {
  enrollClassSection,
  getApprovedClassSectionEnrollments,
  getCurrentUserProgressByClassSection,
} from "../../api/enrollment";
import {
  Spin,
  Alert,
  Modal,
  Button,
  Form,
  Input,
  DatePicker,
  message,
  Tooltip,
  Popconfirm,
  Tag,
} from "antd";
import {
  ArrowPathIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  PencilSquareIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GlobeAltIcon,
  LockClosedIcon,
  ArchiveBoxIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";
import dayjs from "dayjs";

export default function ClassSectionDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id: paramId, classSectionId } = useParams();
  const id = paramId || classSectionId;
  const navigate = useNavigate();
  const location = useLocation();

  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";
  const isTeacherOrAdmin = isTeacher || isAdmin;

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [codeActionLoading, setCodeActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [studentActiveTab, setStudentActiveTab] = useState(
    new URLSearchParams(location.search).has("announcementId") ? "announcements" : "content"
  );

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();
  const editImageUrl = Form.useWatch("imageUrl", editForm);
  const editImageResourceId = Form.useWatch("imageResourceId", editForm);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchCourse = async () => {
    try {
      const response = await getClassSectionById(id);
      const classData = response?.data || response;
      if (isStudent && classData?.myWorkspaceType === "TEACHING") {
        navigate(`/teaching/class-sections/${id}`, { replace: true });
        return;
      }
      setCourse(classData);
      if (isStudent) {
        const currentEnrollmentStatus = classData?.myEnrollmentStatus || null;
        setEnrollmentStatus(currentEnrollmentStatus);
        if (currentEnrollmentStatus === "APPROVED") {
          try {
            const progress = await getCurrentUserProgressByClassSection(id);
            const progressData = progress?.data || progress;
            setEnrollmentStatus(progressData?.approvalStatus || progressData?.enrollmentStatus || currentEnrollmentStatus);
          } catch {
            setEnrollmentStatus(currentEnrollmentStatus);
          }
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchCourse().finally(() => setLoading(false));
    }
  }, [id, isStudent]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    try {
      setPublishing(true);
      const updated = await updateClassSectionStatus(id, newStatus);
      setCourse(updated?.data || updated);
      const msgMap = {
        PUBLIC: "Lớp học đã được xuất bản!",
        PRIVATE: "Lớp học đã chuyển về riêng tư.",
        ARCHIVED: "Lớp học đã được lưu trữ.",
      };
      message.success(msgMap[newStatus] || "Đã cập nhật trạng thái.");
    } catch (err) {
      message.error("Lỗi khi thay đổi trạng thái: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteClassSection(id);
      message.success("Đã xóa lớp học!");
      navigate(isAdmin ? "/admin/class-sections" : "/teacher/class-sections");
    } catch (err) {
      message.error("Lỗi khi xóa lớp học: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      await enrollClassSection(id);
      message.success("Đăng ký lớp học thành công! Vui lòng chờ phê duyệt.");
      await fetchCourse();
    } catch (err) {
      message.error(err.response?.data?.message || "Lỗi khi đăng ký lớp học");
    } finally {
      setEnrolling(false);
    }
  };

  const handleResetCode = async () => {
    try {
      setCodeActionLoading(true);
      const updated = await resetClassCode(id);
      setCourse(updated?.data || updated);
      message.success("Đã tạo mã lớp mới!");
    } catch (err) {
      message.error(err.response?.data?.message || "Không thể tạo lại mã lớp");
    } finally {
      setCodeActionLoading(false);
    }
  };

  const handleDeleteCode = async () => {
    try {
      setCodeActionLoading(true);
      const updated = await deleteClassCode(id);
      setCourse(updated?.data || updated);
      message.success("Đã xóa mã lớp!");
    } catch (err) {
      message.error(err.response?.data?.message || "Không thể xóa mã lớp");
    } finally {
      setCodeActionLoading(false);
    }
  };

  const openEditModal = () => {
    editForm.setFieldsValue({
      title: course.title,
      description: course.description,
      imageUrl: course.imageUrl || null,
      imageResourceId: course.imageResourceId || null,
      dateRange:
        course.startDate && course.endDate
          ? [dayjs(course.startDate), dayjs(course.endDate)]
          : null,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      const payload = {
        title: values.title,
        description: values.description,
        imageUrl: values.imageUrl || null,
        imageResourceId: values.imageResourceId || null,
        startDate: values.dateRange?.[0]?.format("YYYY-MM-DD") || null,
        endDate: values.dateRange?.[1]?.format("YYYY-MM-DD") || null,
      };
      const updated = await updateClassSection(id, payload);
      setCourse(updated?.data || updated);
      message.success("Đã cập nhật thông tin lớp học!");
      setEditModalOpen(false);
    } catch (err) {
      if (err?.errorFields) return; // validation error — do nothing
      message.error("Lỗi khi cập nhật: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Loading / Error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <Alert description={error} type="error" showIcon />
      </div>
    );
  }

  if (!course) return null;

  const displayTitle = course.title || course.classCode || "Lớp học chưa có tên";
  const isPublic = course.status === "PUBLIC";
  const isArchived = course.status === "ARCHIVED";
  const canManageStaff = (course?.myCapabilities || []).includes("MANAGE_STAFF");

  // ── Shared sub-components ────────────────────────────────────────────────
  const StatusBadge = () => {
    if (isPublic)
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <GlobeAltIcon className="w-3.5 h-3.5" />
          Công khai
        </span>
      );
    if (isArchived)
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
          <ArchiveBoxIcon className="w-3.5 h-3.5" />
          Đã lưu trữ
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <LockClosedIcon className="w-3.5 h-3.5" />
        Riêng tư
      </span>
    );
  };

  const ClassCodeCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">Mã nhóm</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        Chia sẻ mã này để người học tham gia trực tiếp vào lớp.
      </p>
      {course.classCode ? (
        <>
          <p className="text-2xl font-black tracking-[0.2em] text-primary font-mono mb-4 select-all">
            {course.classCode}
          </p>
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Sao chép">
              <button
                onClick={() => { navigator.clipboard.writeText(course.classCode); message.success("Đã sao chép!"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" /> Sao chép
              </button>
            </Tooltip>
            <Tooltip title="Tạo mã mới">
              <button
                onClick={handleResetCode}
                disabled={isArchived || codeActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${codeActionLoading ? "animate-spin" : ""}`} /> Đặt lại
              </button>
            </Tooltip>
            <Popconfirm
              title="Xóa mã lớp?"
              description="Người học sẽ không thể tham gia bằng mã sau khi xóa."
              onConfirm={handleDeleteCode}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <button
                disabled={isArchived || codeActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <TrashIcon className="w-3.5 h-3.5" /> Xóa
              </button>
            </Popconfirm>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Chưa có mã lớp</p>
          <button
            onClick={handleResetCode}
            disabled={isArchived || codeActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${codeActionLoading ? "animate-spin" : ""}`} />
            Tạo mã
          </button>
        </div>
      )}
    </div>
  );

  // ── Teacher / Admin layout ───────────────────────────────────────────────
  if (isTeacherOrAdmin) {
    const userRole = isAdmin ? "admin" : "teacher";
    const hasLinkedAnnouncement = new URLSearchParams(location.search).has("announcementId");
    const teacherTabs = [
      {
        label: "Nội dung",
        content: <CourseContent enrollmentStatus="APPROVED" archived={isArchived} />,
      },
      {
        label: "Announcements",
        content: <AnnouncementsTab classSectionId={id} />,
      },
      {
        label: "Thông tin",
        content: (
            <div className="space-y-6">
              {/* Description */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mô tả lớp học</h4>
              {course.description ? (
                <>
                  <p
                    className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words transition-all ${
                      !descExpanded ? "line-clamp-4" : ""
                    }`}
                  >
                    {course.description}
                  </p>
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {descExpanded ? (
                      <><ChevronUpIcon className="w-3.5 h-3.5" /> Thu gọn</>
                    ) : (
                      <><ChevronDownIcon className="w-3.5 h-3.5" /> Xem thêm</>
                    )}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Chưa có mô tả. Nhấn "Chỉnh sửa" để thêm mô tả.</p>
              )}
            </div>
            {/* Meta info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Chi tiết</h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-3">
                  <TagIcon className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Môn học: <span className="font-medium text-gray-800 dark:text-white">{course.subjectTitle || "—"}</span></span>
                </li>
                <li className="flex items-center gap-3">
                  <CalendarDaysIcon className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>
                    Thời gian:{" "}
                    <span className="font-medium text-gray-800 dark:text-white">
                      {course.startDate && course.endDate
                        ? `${dayjs(course.startDate).format("DD/MM/YYYY")} → ${dayjs(course.endDate).format("DD/MM/YYYY")}`
                        : course.startDate
                        ? `Từ ${dayjs(course.startDate).format("DD/MM/YYYY")}`
                        : "Chưa xác định"}
                    </span>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <UserGroupIcon className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>người học: <span className="font-medium text-gray-800 dark:text-white">{course.totalEnrollments ?? 0}</span></span>
                </li>
                </ul>
              </div>
              {/* Teaching staff */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nhân sự giảng dạy</h4>
                  <button
                    onClick={() => setStaffModalOpen(true)}
                    disabled={!canManageStaff}
                    className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Quản lý trợ giảng
                  </button>
                </div>
                    {course.teachingMembers?.length ? (
                      <div className="space-y-2">
                        {course.teachingMembers.map((member) => (
                      <div
                        key={`${member.userId}-${member.role}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 px-3 py-2"
                      >
                        <UserIdentity
                          user={member}
                          variant="teacher"
                          avatarSizeClass="size-9"
                          className="min-w-0 flex-1"
                          nameClassName="m-0 truncate text-sm font-semibold text-gray-800 dark:text-white"
                          secondaryClassName="m-0 mt-1 truncate text-xs text-gray-500 dark:text-gray-400"
                        />
                        <Tag color={member.role === "TEACHER" ? "blue" : "green"}>
                          {member.role === "TEACHER" ? "Giáo viên chính" : "Trợ giảng"}
                        </Tag>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa có trợ giảng trong lớp này.</p>
                )}
                {!canManageStaff && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Bạn không có quyền thay đổi nhân sự giảng dạy của lớp này.
                  </p>
                )}
              </div>
            </div>
        ),
      },
    ];

    return (
      <div className="class-section-detail-page min-h-screen bg-slate-50 dark:bg-background-dark font-display text-gray-900 dark:text-gray-100">
        <TeacherHeader />
        <div className="flex">
          {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
          <main
            className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {isArchived && (
                <Alert
                  showIcon
                  type="info"
                  message={t("classContent.archived.title")}
                  description={t("classContent.archived.description")}
                  className="mb-6"
                />
              )}
              <AppBreadcrumb className="mb-5" context={{ classTitle: course?.title || course?.classCode }} />

              {/* Back */}
{/*              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 mb-5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Quay lại danh sách lớp học
              </button>*/}

              {/* Class Hero Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
                {course.imageUrl ? (
                  <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                    <img
                      src={course.imageUrl}
                      alt={displayTitle}
                      className="h-56 w-full object-cover sm:h-64"
                    />
                  </div>
                ) : null}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge />
                      {course.subjectTitle && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {course.subjectTitle}
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-3">
                      {displayTitle}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {course.teacherName && (
                        <div className="flex items-center gap-2">
                          {course.teacherImageUrl ? (
                            <img src={course.teacherImageUrl} alt={course.teacherName} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                              {course.teacherName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{course.teacherName}</span>
                        </div>
                      )}
                      {course.startDate && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="w-4 h-4" />
                          <span>
                            {dayjs(course.startDate).format("DD/MM/YYYY")}
                            {course.endDate && ` → ${dayjs(course.endDate).format("DD/MM/YYYY")}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <UserGroupIcon className="w-4 h-4" />
                        <span>{course.totalEnrollments ?? 0} người học</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={openEditModal}
                      disabled={isArchived}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => setStaffModalOpen(true)}
                      disabled={!canManageStaff || isArchived}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserGroupIcon className="w-4 h-4" />
                      Trợ giảng
                    </button>

                    {/* PRIVATE → publish */}
                    {!isPublic && !isArchived && (
                      <button
                        onClick={() => handleStatusChange("PUBLIC")}
                        disabled={publishing}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-60"
                      >
                        <GlobeAltIcon className="w-4 h-4" />
                        Xuất bản
                      </button>
                    )}

                    {/* PUBLIC → set private */}
                    {isPublic && (
                      <button
                        onClick={() => handleStatusChange("PRIVATE")}
                        disabled={publishing}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors disabled:opacity-60"
                      >
                        <LockClosedIcon className="w-4 h-4" />
                        Đặt riêng tư
                      </button>
                    )}

                    {/* Any active state → archive */}
                    {!isArchived && (
                      <Popconfirm
                        title="Lưu trữ lớp học?"
                        description="Người học sẽ không thể truy cập lớp sau khi lưu trữ."
                        onConfirm={() => handleStatusChange("ARCHIVED")}
                        okText="Lưu trữ"
                        cancelText="Hủy"
                        okButtonProps={{ loading: publishing }}
                      >
                        <button
                          disabled={publishing}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-60"
                        >
                          <ArchiveBoxIcon className="w-4 h-4" />
                          Lưu trữ
                        </button>
                      </Popconfirm>
                    )}

                    {/* ARCHIVED → restore to private */}
                    {isArchived && (
                      <button
                        onClick={() => handleStatusChange("PRIVATE")}
                        disabled={publishing}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-60"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        Khôi phục
                      </button>
                    )}

                    <Popconfirm
                      title="Xóa lớp học này?"
                      description="Hành động này không thể hoàn tác. Tất cả dữ liệu lớp học sẽ bị xóa."
                      onConfirm={handleDelete}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true, loading: deleteLoading }}
                    >
                      <button disabled={isArchived} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <TrashIcon className="w-4 h-4" />
                        Xóa lớp
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              </div>

              {/* Body grid */}
              <div className="grid grid-cols-12 gap-6">
                {/* Main tabs */}
                <div className="col-span-12 lg:col-span-8">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <CourseTabs tabs={teacherTabs} defaultIndex={hasLinkedAnnouncement ? 1 : 0} />
                  </div>
                </div>

                {/* Sidebar */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                  <ClassCodeCard />

                  {/* Quick stats */}
{/*                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Thống kê nhanh</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-primary">{course.totalEnrollments ?? 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">người học</p>
                      </div>
                      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
                          {course.chapters?.length ?? 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Chương</p>
                      </div>
                    </div>
                  </div>*/}
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Edit modal */}
        <Modal
          title="Chỉnh sửa thông tin lớp học"
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={handleEditSave}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={editLoading}
          destroyOnHidden
        >
          <Form form={editForm} layout="vertical" className="mt-4">
            <Form.Item name="imageUrl" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="imageResourceId" hidden>
              <Input />
            </Form.Item>
            <ClassCoverField
              imageUrl={editImageUrl}
              resourceId={editImageResourceId}
              onChange={(value) => {
                editForm.setFieldValue("imageUrl", value?.imageUrl || null);
                editForm.setFieldValue("imageResourceId", value?.imageResourceId || null);
              }}
            />
            <Form.Item
              name="title"
              label="Tên lớp học"
            >
              <Input placeholder="Nhập tên lớp học" />
            </Form.Item>
            <Form.Item name="description" label="Mô tả">
              <Input.TextArea rows={4} placeholder="Mô tả nội dung và mục tiêu lớp học..." />
            </Form.Item>
            <Form.Item name="dateRange" label="Thời gian học">
              <DatePicker.RangePicker
                format="DD/MM/YYYY"
                placeholder={["Ngày bắt đầu", "Ngày kết thúc"]}
                className="w-full"
              />
            </Form.Item>
          </Form>
        </Modal>
        <ClassStaffModal
          open={staffModalOpen}
          classSectionId={Number(id)}
          canManageStaff={canManageStaff && !isArchived}
          onClose={() => setStaffModalOpen(false)}
          onChanged={fetchCourse}
        />
      </div>
    );
  }

  // ── Student layout ───────────────────────────────────────────────────────
  const studentProgress = summarizeLearningProgress(course);
  const primaryTeacher = (course.teachingMembers || []).find((member) => member.role === "TEACHER") || null;
  const teachingMembers = (course.teachingMembers || []).length
    ? course.teachingMembers
    : course.teacherName
      ? [{
          userId: course.teacherId || 0,
          fullName: course.teacherName,
          avatarUrl: course.teacherImageUrl,
          email: null,
          role: "TEACHER",
        }]
      : [];

  return (
    <div className="class-section-detail-page min-h-screen bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-gray-100">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <AppBreadcrumb className="mb-5" context={{ classTitle: course?.title || course?.classCode }} />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="h-1.5 bg-gradient-to-r from-primary via-sky-400 to-cyan-400" />
              <div className="px-6 py-6 sm:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  {course.subjectTitle && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-blue-300">
                      {course.subjectTitle}
                    </span>
                  )}
                  {course.categoryTitle && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {course.categoryTitle}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">
                      {displayTitle}
                    </h1>

                    {primaryTeacher && (
                      <UserIdentity
                        user={primaryTeacher}
                        variant="teacher"
                        className="mt-5"
                        avatarSizeClass="size-12"
                        avatarClassName="ring-2 ring-primary/15"
                        secondaryText={primaryTeacher.email || null}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:w-[220px]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        người học
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {course.totalEnrollments ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Nhân sự
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {teachingMembers.length || 1}
                      </p>
                    </div>
                  </div>
                </div>

                {course.description && (
                  <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p
                      className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300 ${
                        !descExpanded ? "line-clamp-3" : ""
                      }`}
                    >
                      {course.description}
                    </p>
                    <button
                      onClick={() => setDescExpanded((prev) => !prev)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {descExpanded ? (
                        <><ChevronUpIcon className="h-3.5 w-3.5" /> Thu gọn</>
                      ) : (
                        <><ChevronDownIcon className="h-3.5 w-3.5" /> Xem thêm</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 dark:border-slate-700 sm:px-6">
                <div className="flex gap-1 overflow-x-auto">
                  {[
                    { id: "content", label: "Nội dung học tập" },
                    { id: "announcements", label: "Thông báo" },
                    { id: "staff", label: "Nhân sự" },
                    { id: "students", label: "Người học" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStudentActiveTab(tab.id)}
                      className={`shrink-0 border-b-2 px-3 py-4 text-sm font-semibold transition-colors ${
                        studentActiveTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 py-5 sm:px-6">
                {studentActiveTab === "content" && <CourseContent enrollmentStatus={enrollmentStatus} />}
                {studentActiveTab === "announcements" && <AnnouncementsTab classSectionId={id} />}
                {studentActiveTab === "staff" && (
                  <StudentStaffPanel
                    members={teachingMembers}
                    subjectTitle={course.subjectTitle}
                  />
                )}
                {studentActiveTab === "students" && (
                  <StudentRosterPanel
                    classSectionId={Number(id)}
                    enabled={studentActiveTab === "students"}
                  />
                )}
              </div>
            </section>
          </div>

          <aside className="col-span-12 space-y-4 lg:col-span-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Trạng thái
                </p>
              </div>

              <div className="px-5 py-5">
                {(enrollmentStatus === null || enrollmentStatus === "REJECTED") && (
                  <div className="space-y-4">
                    {enrollmentStatus === "REJECTED" && (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                        Yêu cầu tham gia trước đó đã bị từ chối. Bạn có thể gửi lại yêu cầu mới.
                      </p>
                    )}
                    <Button
                      type="primary"
                      block
                      size="large"
                      loading={enrolling}
                      onClick={handleEnroll}
                      className="h-11 font-bold"
                    >
                      Đăng ký học
                    </Button>
                  </div>
                )}

                {enrollmentStatus === "PENDING" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        Đang chờ phê duyệt
                      </p>
                    </div>
                  </div>
                )}

                {enrollmentStatus === "APPROVED" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <div className="flex items-center gap-3">
                        <CheckCircleSolidIcon className="h-5 w-5 text-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          Đã tham gia lớp học
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Tiến độ học</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {studentProgress.progressValue}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all"
                          style={{ width: `${studentProgress.progressValue}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {studentProgress.progressText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Thông tin lớp học
                </p>
              </div>
              <div className="space-y-2 px-3 pb-4">
                {course.subjectTitle && (
                  <InfoRow icon={<TagIcon className="h-4 w-4" />}>
                    {course.subjectTitle}
                  </InfoRow>
                )}
                {(course.startDate || course.endDate) && (
                  <InfoRow icon={<CalendarDaysIcon className="h-4 w-4" />}>
                    {course.startDate ? dayjs(course.startDate).format("DD/MM/YYYY") : "Chưa xác định"}
                    {course.endDate ? ` → ${dayjs(course.endDate).format("DD/MM/YYYY")}` : ""}
                  </InfoRow>
                )}
                <InfoRow icon={<UserGroupIcon className="h-4 w-4" />}>
                  {course.totalEnrollments ?? 0} người học đã đăng ký
                </InfoRow>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function summarizeLearningProgress(course) {
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const items = chapters.flatMap((chapter) => chapter?.contentItems || []);
  const eligibleItems = items.filter((item) => item?.progressEligible);
  const completedItems = eligibleItems.filter((item) => item?.completed);
  const progressValue = typeof course?.myProgress === "number"
    ? Math.max(0, Math.min(course.myProgress, 100))
    : 0;

  if (eligibleItems.length === 0) {
    return {
      progressValue,
      progressText: "Lớp học chưa có lesson hoặc quiz để tính tiến độ.",
    };
  }

  if (completedItems.length === 0) {
    return {
      progressValue,
      progressText: `Bạn chưa hoàn thành nội dung học tập nào (${completedItems.length}/${eligibleItems.length}).`,
    };
  }

  return {
    progressValue,
    progressText: `Đã hoàn thành ${completedItems.length}/${eligibleItems.length} lesson và quiz.`,
  };
}

function InfoRow({ icon, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </div>
      <span>{children}</span>
    </div>
  );
}

function StudentStaffPanel({ members, subjectTitle }) {
  const safeMembers = Array.isArray(members) ? members : [];

  if (safeMembers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Chưa có thông tin nhân sự giảng dạy.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {safeMembers.map((member) => {
        const roleLabel = member.role === "TEACHER" ? "Giáo viên chính" : "Trợ giảng";
        return (
          <div
            key={`${member.userId}-${member.role}`}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.fullName}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/10"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                  {(member.fullName || "G").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-slate-950 dark:text-white">
                    {member.fullName || member.username}
                  </p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    member.role === "TEACHER"
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  }`}>
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {subjectTitle ? `${roleLabel} · ${subjectTitle}` : roleLabel}
                </p>
                {member.email && (
                  <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentRosterPanel({ classSectionId, enabled }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    if (!enabled || !classSectionId) {
      return;
    }

    let cancelled = false;

    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await getApprovedClassSectionEnrollments(
          classSectionId,
          page,
          pageSize,
          deferredSearch || null
        );
        if (cancelled) {
          return;
        }
        const payload = response?.data || response || {};
        setRows(Array.isArray(payload.pageList) ? payload.pageList : []);
        setTotal(payload.totalElements || 0);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          message.error(err?.response?.data?.message || "Không thể tải danh sách người học");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStudents();
    return () => {
      cancelled = true;
    };
  }, [classSectionId, deferredSearch, enabled, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Danh sách người học</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tìm theo họ tên hoặc MSSV.
            </p>
          </div>
          <Input
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên hoặc MSSV"
            prefix={<MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />}
            className="w-full md:max-w-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Không có người học phù hợp.
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
            {rows.map((student) => (
              <div
                key={student.id || `${student.studentId}-${student.studentNumber}`}
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserIdentity
                    user={student}
                    variant="student"
                    avatarSizeClass="size-11"
                    nameClassName="m-0 truncate text-sm font-semibold text-slate-950 dark:text-white"
                    secondaryClassName="m-0 mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                  />
                </div>
              </div>
            ))}
          </div>

          <DataPaginationFooter
            currentPage={page}
            pageSize={pageSize}
            total={total}
            totalLabel={`Tổng người học: ${total}`}
            pageSizeLabel="Hiển thị"
            rangeLabel={undefined}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
