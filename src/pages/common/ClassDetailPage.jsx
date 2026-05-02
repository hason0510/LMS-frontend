import React, { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import CourseTabs from "../../components/course/CourseTabs";
import CourseContent from "../../components/course/CourseContent";
import TeacherTab from "../../components/course/TeacherTab";
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
import { enrollClassSection, getCurrentUserProgressByClassSection } from "../../api/enrollment";
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
  ArrowLeftIcon,
  ArrowPathIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  PencilSquareIcon,
  UserGroupIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GlobeAltIcon,
  LockClosedIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";

export default function ClassSectionDetailPage() {
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

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchCourse = async () => {
    try {
      const response = await getClassSectionById(id);
      setCourse(response?.data || response);
      if (isStudent) {
        try {
          const progress = await getCurrentUserProgressByClassSection(id);
          const progressData = progress?.data || progress;
          setEnrollmentStatus(progressData?.approvalStatus || progressData?.enrollmentStatus);
        } catch {
          setEnrollmentStatus(null);
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
        Chia sẻ mã này để học viên tham gia trực tiếp vào lớp.
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
                disabled={codeActionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${codeActionLoading ? "animate-spin" : ""}`} /> Đặt lại
              </button>
            </Tooltip>
            <Popconfirm
              title="Xóa mã lớp?"
              description="Học viên sẽ không thể tham gia bằng mã sau khi xóa."
              onConfirm={handleDeleteCode}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <button
                disabled={codeActionLoading}
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
            disabled={codeActionLoading}
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
        content: <CourseContent enrollmentStatus="APPROVED" />,
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
                    className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap transition-all ${
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
                  <span>Học viên: <span className="font-medium text-gray-800 dark:text-white">{course.totalEnrollments ?? 0}</span></span>
                </li>
              </ul>
            </div>
          </div>
        ),
      },
    ];

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display text-gray-900 dark:text-gray-100">
        <TeacherHeader />
        <div className="flex">
          {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
          <main
            className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

              {/* Back */}
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 mb-5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Quay lại danh sách lớp học
              </button>

              {/* Class Hero Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
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
                        <span>{course.totalEnrollments ?? 0} học viên</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={openEditModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                      Chỉnh sửa
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

                    {/* PUBLIC → archive */}
                    {isPublic && (
                      <Popconfirm
                        title="Lưu trữ lớp học?"
                        description="Học viên sẽ không thể truy cập lớp sau khi lưu trữ."
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
                      <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
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
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Thống kê nhanh</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-primary">{course.totalEnrollments ?? 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Học viên</p>
                      </div>
                      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
                          {course.chapters?.length ?? 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Chương</p>
                      </div>
                    </div>
                  </div>
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
      </div>
    );
  }

  // ── Student layout ───────────────────────────────────────────────────────
  const studentTabs = [
    {
      label: "Nội dung học tập",
      content: <CourseContent enrollmentStatus={enrollmentStatus} />,
    },
    {
      label: "Announcements",
      content: <AnnouncementsTab classSectionId={id} />,
    },
    {
      label: "Giảng viên",
      content: <TeacherTab course={course} />,
    },
  ];
  const hasLinkedAnnouncement = new URLSearchParams(location.search).has("announcementId");

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Quay lại danh sách lớp học
        </button>

        {/* Hero */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
          {course.subjectTitle && (
            <span className="inline-block mb-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {course.subjectTitle}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-3">
            {displayTitle}
          </h1>

          {/* Teacher row */}
          {course.teacherName && (
            <div className="flex items-center gap-2 mb-4">
              {course.teacherImageUrl ? (
                <img src={course.teacherImageUrl} alt={course.teacherName} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                  {course.teacherName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{course.teacherName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Giảng viên</p>
              </div>
            </div>
          )}

          {/* Collapsible description */}
          {course.description && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <p
                className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap transition-all ${
                  !descExpanded ? "line-clamp-2" : ""
                }`}
              >
                {course.description}
              </p>
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-1.5 text-xs text-primary hover:underline flex items-center gap-1"
              >
                {descExpanded ? (
                  <><ChevronUpIcon className="w-3.5 h-3.5" /> Thu gọn</>
                ) : (
                  <><ChevronDownIcon className="w-3.5 h-3.5" /> Xem thêm</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Main tabs */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <CourseTabs tabs={studentTabs} defaultIndex={hasLinkedAnnouncement ? 1 : 0} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Enrollment card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Tham gia lớp học</h3>

              {(enrollmentStatus === null || enrollmentStatus === "REJECTED") && (
                <>
                  {enrollmentStatus === "REJECTED" && (
                    <p className="text-xs text-red-500 dark:text-red-400 mb-3">
                      Yêu cầu của bạn đã bị từ chối. Bạn có thể đăng ký lại.
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
                </>
              )}

              {enrollmentStatus === "PENDING" && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Đang chờ phê duyệt</p>
                </div>
              )}

              {enrollmentStatus === "APPROVED" && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Đã tham gia lớp học</p>
                </div>
              )}
            </div>

            {/* Class info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Thông tin lớp học</h3>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                {course.subjectTitle && (
                  <li className="flex items-center gap-3">
                    <TagIcon className="w-4 h-4 shrink-0 text-gray-400" />
                    <span>{course.subjectTitle}</span>
                  </li>
                )}
                {course.startDate && (
                  <li className="flex items-center gap-3">
                    <CalendarDaysIcon className="w-4 h-4 shrink-0 text-gray-400" />
                    <span>
                      {dayjs(course.startDate).format("DD/MM/YYYY")}
                      {course.endDate && ` → ${dayjs(course.endDate).format("DD/MM/YYYY")}`}
                    </span>
                  </li>
                )}
                <li className="flex items-center gap-3">
                  <UserGroupIcon className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>{course.totalEnrollments ?? 0} học viên đã đăng ký</span>
                </li>
                <li className="flex items-center gap-3">
                  <BookOpenIcon className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>{course.chapters?.length ?? 0} chương học</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
