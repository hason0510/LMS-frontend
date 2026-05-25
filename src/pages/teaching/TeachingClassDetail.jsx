import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, App, Button, Empty, Form, Input, Modal, Spin, Tabs } from "antd";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  MegaphoneIcon,
  PhotoIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Header from "../../components/layout/Header";
import CourseContent from "../../components/course/CourseContent";
import AnnouncementsTab from "../../components/course/AnnouncementsTab";
import ClassPeopleTab from "../../components/teaching/ClassPeopleTab";
import ClassReviewTab from "../../components/teaching/ClassReviewTab";
import ClassStaffModal from "../../components/teaching/ClassStaffModal";
import { getClassSectionById } from "../../api/classSection";
import { createAnnouncement } from "../../api/announcement";
import { getClassWorkbenchSummary } from "../../api/teaching";

const CAP_VIEW_PEOPLE = "VIEW_PEOPLE";
const CAP_GRADE_ASSIGNMENTS = "GRADE_ASSIGNMENTS";
const CAP_REVIEW_QUIZZES = "REVIEW_QUIZZES";
const CAP_POST_ANNOUNCEMENTS = "POST_ANNOUNCEMENTS";
const CAP_MANAGE_STAFF = "MANAGE_STAFF";

const statusLabel = {
  PUBLIC: "Công khai",
  PRIVATE: "Riêng tư",
  ARCHIVED: "Đã lưu trữ",
};

const statusClass = {
  PUBLIC: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300",
  PRIVATE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
  ARCHIVED: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const tabFromPath = (pathname) => {
  if (pathname.endsWith("/people") || pathname.endsWith("/progress")) return "people";
  if (pathname.endsWith("/review")) return "review";
  if (pathname.endsWith("/announcements")) return "announcements";
  if (pathname.endsWith("/content")) return "content";
  return "overview";
};

const hasCapability = (course, capability) => (course?.myCapabilities || []).includes(capability);

export default function TeachingClassDetail() {
  const { message } = App.useApp();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [summary, setSummary] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementVersion, setAnnouncementVersion] = useState(0);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcementForm] = Form.useForm();

  const activeTab = tabFromPath(location.pathname);
  const canManageStaff = hasCapability(course, CAP_MANAGE_STAFF);
  const canViewPeople = hasCapability(course, CAP_VIEW_PEOPLE);
  const canGradeAssignments = hasCapability(course, CAP_GRADE_ASSIGNMENTS);
  const canReviewQuizzes = hasCapability(course, CAP_REVIEW_QUIZZES);
  const canReview = canGradeAssignments || canReviewQuizzes;
  const canPostAnnouncements = hasCapability(course, CAP_POST_ANNOUNCEMENTS);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [courseRes, summaryRes] = await Promise.all([getClassSectionById(id), getClassWorkbenchSummary(id)]);
      setCourse(courseRes?.data || courseRes || null);
      setSummary(summaryRes?.data || summaryRes || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Không thể tải lớp trợ giảng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (location.pathname.endsWith("/progress")) {
      navigate(`/teaching/class-sections/${id}/people`, { replace: true });
    }
  }, [id, location.pathname, navigate]);

  const openAnnouncementModal = () => {
    announcementForm.resetFields();
    setAnnouncementOpen(true);
  };

  const handleCreateAnnouncement = async () => {
    try {
      const values = await announcementForm.validateFields();
      setSubmittingAnnouncement(true);
      await createAnnouncement({
        classSectionId: Number(id),
        title: values.title?.trim(),
        summary: values.summary,
      });
      message.success("Đã đăng thông báo lớp học.");
      setAnnouncementOpen(false);
      setAnnouncementVersion((value) => value + 1);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Không thể đăng thông báo.");
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const tabItems = useMemo(() => {
    const items = [
      {
        key: "overview",
        label: "Tổng quan",
        children: (
          <Overview
            course={course}
            summary={summary}
            canViewPeople={canViewPeople}
            canReview={canReview}
            canGradeAssignments={canGradeAssignments}
            canReviewQuizzes={canReviewQuizzes}
            canPostAnnouncements={canPostAnnouncements}
            canManageStaff={canManageStaff}
            onNavigate={navigate}
            onOpenStaff={() => setStaffOpen(true)}
            onOpenAnnouncement={openAnnouncementModal}
          />
        ),
      },
      {
        key: "content",
        label: "Nội dung",
        children: <CourseContent enrollmentStatus="APPROVED" workspaceMode="teaching" capabilities={course?.myCapabilities || []} />,
      },
    ];

    if (canViewPeople) {
      items.push({
        key: "people",
        label: "Học viên",
        children: <ClassPeopleTab classSectionId={Number(id)} />,
      });
    }

    if (canReview) {
      items.push({
        key: "review",
        label: "Chấm bài",
        children: (
          <ClassReviewTab
            classSectionId={Number(id)}
            canGradeAssignments={canGradeAssignments}
            canReviewQuizzes={canReviewQuizzes}
          />
        ),
      });
    }

    if (canPostAnnouncements) {
      items.push({
        key: "announcements",
        label: "Thông báo",
        children: (
          <AnnouncementsPanel
            classSectionId={id}
            refreshKey={announcementVersion}
            onCreate={openAnnouncementModal}
          />
        ),
      });
    }

    return items;
  }, [
    announcementVersion,
    canGradeAssignments,
    canManageStaff,
    canPostAnnouncements,
    canReview,
    canReviewQuizzes,
    canViewPeople,
    course,
    id,
    navigate,
    summary,
  ]);

  const handleTabChange = (key) => {
    const suffix = key === "overview" ? "" : `/${key}`;
    navigate(`/teaching/class-sections/${id}${suffix}`);
  };

  const normalizedActiveTab = tabItems.some((item) => item.key === activeTab) ? activeTab : "overview";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[520px] items-center justify-center">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message="Không thể tải dữ liệu" description={error} />
        ) : !course ? (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
            <Empty description="Không có dữ liệu lớp." />
          </section>
        ) : (
          <div className="space-y-5">
            <button onClick={() => navigate("/teaching/classes")} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              <ArrowLeftIcon className="h-4 w-4" />
              Quay lại danh sách lớp
            </button>

            <ClassHero
              course={course}
              canManageStaff={canManageStaff}
              canPostAnnouncements={canPostAnnouncements}
              onOpenStaff={() => setStaffOpen(true)}
              onOpenAnnouncement={openAnnouncementModal}
              onOpenMedia={() => navigate(`/teaching/class-sections/${id}/media`)}
            />

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Tabs activeKey={normalizedActiveTab} onChange={handleTabChange} items={tabItems} />
            </section>
          </div>
        )}
      </main>

      <ClassStaffModal
        open={staffOpen}
        classSectionId={Number(id)}
        canManageStaff={canManageStaff}
        onClose={() => setStaffOpen(false)}
        onChanged={load}
      />

      <Modal
        title="Tạo thông báo lớp học"
        open={announcementOpen}
        onCancel={() => setAnnouncementOpen(false)}
        onOk={handleCreateAnnouncement}
        okText="Đăng thông báo"
        cancelText="Hủy"
        confirmLoading={submittingAnnouncement}
        destroyOnHidden
      >
        <Form form={announcementForm} layout="vertical" className="mt-4">
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: "Nhập tiêu đề thông báo" }]}
          >
            <Input placeholder="Ví dụ: Nhắc lịch nộp bài tuần này" />
          </Form.Item>
          <Form.Item
            name="summary"
            label="Nội dung"
            rules={[{ required: true, message: "Nhập nội dung thông báo" }]}
          >
            <Input.TextArea rows={5} placeholder="Nội dung gửi tới học viên trong lớp..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function ClassHero({ course, canManageStaff, canPostAnnouncements, onOpenStaff, onOpenAnnouncement, onOpenMedia }) {
  const title = course.title || course.classCode || "Lớp chưa có tên";
  const status = course.status || "PRIVATE";

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {course.imageUrl && (
        <div className="aspect-[5/1] min-h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img src={course.imageUrl} alt={title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[status] || statusClass.PRIVATE}`}>
              {statusLabel[status] || status}
            </span>
            {course.subjectTitle && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
                {course.subjectTitle}
              </span>
            )}
          </div>
          <h1 className="m-0 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
          <p className="m-0 mt-2 text-sm text-slate-500">
            GV: {course.teacherName || "Chưa xác định"} · {course.totalEnrollments ?? 0} học viên · {course.teachingMembers?.length ?? 1} nhân sự
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canPostAnnouncements && (
            <Button type="primary" icon={<MegaphoneIcon className="h-4 w-4" />} onClick={onOpenAnnouncement}>
              Tạo thông báo
            </Button>
          )}
          {canManageStaff && (
            <Button icon={<UserGroupIcon className="h-4 w-4" />} onClick={onOpenStaff}>
              Nhân sự giảng dạy
            </Button>
          )}
          <Button icon={<PhotoIcon className="h-4 w-4" />} onClick={onOpenMedia}>
            Media lớp
          </Button>
        </div>
      </div>
    </section>
  );
}

function Overview({
  course,
  summary,
  canViewPeople,
  canReview,
  canGradeAssignments,
  canReviewQuizzes,
  canPostAnnouncements,
  canManageStaff,
  onNavigate,
  onOpenStaff,
  onOpenAnnouncement,
}) {
  if (!course) return <Empty description="Không có dữ liệu lớp." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Học viên" value={summary?.totalStudents ?? course.totalEnrollments ?? 0} icon={<UserGroupIcon className="h-5 w-5" />} />
        <SummaryTile label="Bài chờ chấm" value={summary?.pendingSubmissions ?? 0} icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />} />
        <SummaryTile label="Quiz cần review" value={summary?.pendingQuizReviews ?? 0} icon={<BookOpenIcon className="h-5 w-5" />} />
        <SummaryTile label="Cần chú ý" value={summary?.atRiskStudents ?? 0} icon={<MegaphoneIcon className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="m-0 text-base font-black text-slate-950 dark:text-white">Thao tác nhanh</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onNavigate(`/teaching/class-sections/${course.id}/content`)}>
              Nội dung lớp
            </Button>
            {canViewPeople && (
              <Button onClick={() => onNavigate(`/teaching/class-sections/${course.id}/people`)}>
                Danh sách học viên
              </Button>
            )}
            {canReview && (
              <Button type="primary" onClick={() => onNavigate(`/teaching/class-sections/${course.id}/review`)}>
                {canGradeAssignments && canReviewQuizzes ? "Chấm bài" : canGradeAssignments ? "Chấm bài tập" : "Review quiz"}
              </Button>
            )}
            {canPostAnnouncements && (
              <Button onClick={onOpenAnnouncement}>
                Tạo thông báo
              </Button>
            )}
            <Button onClick={() => onNavigate(`/teaching/class-sections/${course.id}/media`)}>
              Media lớp
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-base font-black text-slate-950 dark:text-white">Nhân sự giảng dạy</h2>
            {canManageStaff && (
              <Button type="link" onClick={onOpenStaff} className="px-0">
                Quản lý
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {(course.teachingMembers || []).length ? (
              course.teachingMembers.map((member) => (
                <div key={member.userId} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">{member.fullName || member.username}</p>
                    <p className="m-0 truncate text-xs text-slate-500">@{member.username}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {member.role === "TEACHER" ? "Giáo viên" : "Trợ giảng"}
                  </span>
                </div>
              ))
            ) : (
              <p className="m-0 text-sm text-slate-500">Chưa có dữ liệu nhân sự.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, icon }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-primary dark:bg-slate-800">
        {icon}
      </div>
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-2xl font-black text-slate-950 dark:text-white">{value ?? 0}</p>
    </article>
  );
}

function AnnouncementsPanel({ classSectionId, refreshKey, onCreate }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">Thông báo lớp học</h2>
          <p className="m-0 text-sm text-slate-500">Gửi cập nhật cho học viên trong lớp.</p>
        </div>
        <Button type="primary" onClick={onCreate}>
          Tạo thông báo
        </Button>
      </div>
      <AnnouncementsTab key={refreshKey} classSectionId={classSectionId} />
    </div>
  );
}
