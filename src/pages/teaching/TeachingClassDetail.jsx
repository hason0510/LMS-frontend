import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, App, Button, Empty, Form, Input, Modal, Spin, Tabs } from "antd";
import { useTranslation } from "react-i18next";
import {
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Header from "../../components/layout/Header";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import UserIdentity from "../../components/common/UserIdentity";
import CourseContent from "../../components/course/CourseContent";
import AnnouncementsTab from "../../components/course/AnnouncementsTab";
import ClassPeopleTab from "../../components/teaching/ClassPeopleTab";
import ClassReviewTab from "../../components/teaching/ClassReviewTab";
import ClassStaffModal from "../../components/teaching/ClassStaffModal";
import TeacherQuizAttempts from "../teacher/TeacherQuizAttempts";
import { getClassSectionById } from "../../api/classSection";
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "../../api/announcement";
import { getClassWorkbenchSummary } from "../../api/teaching";

const CAP_VIEW_PEOPLE = "VIEW_PEOPLE";
const CAP_MANAGE_ASSIGNMENTS = "MANAGE_ASSIGNMENTS";
const CAP_REVIEW_QUIZZES = "REVIEW_QUIZZES";
const CAP_POST_ANNOUNCEMENTS = "POST_ANNOUNCEMENTS";
const CAP_MANAGE_STAFF = "MANAGE_STAFF";

const statusClass = {
  PUBLIC: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300",
  PRIVATE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
  ARCHIVED: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const tabFromPath = (pathname) => {
  if (pathname.endsWith("/people") || pathname.endsWith("/progress")) return "people";
  if (pathname.endsWith("/review")) return "review";
  if (pathname.endsWith("/quiz-attempts")) return "quiz-attempts";
  if (pathname.endsWith("/announcements")) return "announcements";
  if (pathname.endsWith("/content")) return "content";
  return "overview";
};

const hasCapability = (course, capability) => (course?.myCapabilities || []).includes(capability);

export default function TeachingClassDetail() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [summary, setSummary] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementVersion, setAnnouncementVersion] = useState(0);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcementForm] = Form.useForm();

  const activeTab = tabFromPath(location.pathname);
  const canManageStaff = hasCapability(course, CAP_MANAGE_STAFF);
  const canViewPeople = hasCapability(course, CAP_VIEW_PEOPLE);
  const canManageAssignments = hasCapability(course, CAP_MANAGE_ASSIGNMENTS);
  const canReviewQuizzes = hasCapability(course, CAP_REVIEW_QUIZZES);
  const canReview = canManageAssignments || canReviewQuizzes;
  const canPostAnnouncements = hasCapability(course, CAP_POST_ANNOUNCEMENTS);
  const isArchived = course?.status === "ARCHIVED";
  const canManageStaffActions = canManageStaff && !isArchived;
  const canPostAnnouncementsActions = canPostAnnouncements && !isArchived;
  // GV/Admin có MANAGE_STAFF; TA thì không → suy ra vai trò trong lớp này
  const isTeachingAssistant = (course?.myCapabilities?.length || 0) > 0 && !canManageStaff;
  const myClassRole = isTeachingAssistant ? "TA" : "TEACHER";

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [courseRes, summaryRes] = await Promise.all([getClassSectionById(id), getClassWorkbenchSummary(id)]);
      setCourse(courseRes?.data || courseRes || null);
      setSummary(summaryRes?.data || summaryRes || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t("teaching.classDetail.errors.loadClass"));
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
    if (isArchived) {
      message.warning(t("teaching.classDetail.archived.actionsBlocked"));
      return;
    }
    setEditingAnnouncement(null);
    announcementForm.resetFields();
    setAnnouncementOpen(true);
  };

  const openEditAnnouncementModal = (item) => {
    if (isArchived) {
      message.warning(t("teaching.classDetail.archived.actionsBlocked"));
      return;
    }
    setEditingAnnouncement(item);
    announcementForm.setFieldsValue({ title: item?.title, summary: item?.summary });
    setAnnouncementOpen(true);
  };

  const handleSubmitAnnouncement = async () => {
    try {
      const values = await announcementForm.validateFields();
      setSubmittingAnnouncement(true);
      const payload = {
        classSectionId: Number(id),
        title: values.title?.trim(),
        summary: values.summary,
      };
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, payload);
        message.success(t("teaching.classDetail.messages.announcementUpdated"));
      } else {
        await createAnnouncement(payload);
        message.success(t("teaching.classDetail.messages.announcementCreated"));
      }
      setAnnouncementOpen(false);
      setEditingAnnouncement(null);
      setAnnouncementVersion((value) => value + 1);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || t("teaching.classDetail.errors.saveAnnouncement"));
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (item) => {
    if (!item?.id) return;
    try {
      await deleteAnnouncement(item.id);
      message.success(t("teaching.classDetail.messages.announcementDeleted"));
      setAnnouncementVersion((value) => value + 1);
    } catch (err) {
      message.error(err?.response?.data?.message || t("teaching.classDetail.errors.deleteAnnouncement"));
    }
  };

  const tabItems = useMemo(() => {
    const items = [
      {
        key: "overview",
        label: t("teaching.classDetail.tabs.overview"),
        children: (
          <Overview
            t={t}
            course={course}
            summary={summary}
            canManageStaff={canManageStaffActions}
            onOpenStaff={() => setStaffOpen(true)}
          />
        ),
      },
      {
        key: "content",
        label: t("teaching.classDetail.tabs.content"),
        children: <CourseContent enrollmentStatus="APPROVED" workspaceMode="teaching" capabilities={course?.myCapabilities || []} archived={isArchived} />,
      },
    ];

    if (canViewPeople) {
      items.push({
        key: "people",
        label: t("teaching.classDetail.tabs.people"),
        children: <ClassPeopleTab classSectionId={Number(id)} />,
      });
    }

    if (canReview) {
      items.push({
        key: "review",
        label: t("teaching.classDetail.tabs.review"),
        children: (
          <ClassReviewTab
            classSectionId={Number(id)}
            canManageAssignments={canManageAssignments}
            canReviewQuizzes={canReviewQuizzes}
          />
        ),
      });
    }

    if (canReviewQuizzes) {
      items.push({
        key: "quiz-attempts",
        label: t("teaching.classDetail.tabs.quizAttempts"),
        children: <TeacherQuizAttempts teachingMode fixedClassSectionId={Number(id)} />,
      });
    }

    if (canPostAnnouncements) {
      items.push({
        key: "announcements",
        label: t("teaching.classDetail.tabs.announcements"),
        children: (
          <AnnouncementsPanel
            t={t}
            classSectionId={id}
            refreshKey={announcementVersion}
            onCreate={openAnnouncementModal}
            canCreate={canPostAnnouncementsActions}
            canManage={canPostAnnouncementsActions}
            onEdit={openEditAnnouncementModal}
            onDelete={handleDeleteAnnouncement}
          />
        ),
      });
    }

    return items;
  }, [
    announcementVersion,
    canManageAssignments,
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
      <main className="mx-auto w-full max-w-7xl !px-4 !py-6 sm:!px-6 lg:!px-8">
        {loading ? (
          <div className="flex min-h-[520px] items-center justify-center">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={t("teaching.classDetail.errors.loadClass")} description={error} />
        ) : !course ? (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
            <Empty description={t("teaching.classDetail.noClassData")} />
          </section>
        ) : (
          <div className="space-y-5">
            <AppBreadcrumb className="mb-1" context={{ classTitle: course?.title || course?.classCode }} />
            {isArchived && (
              <Alert
                type="info"
                showIcon
                message={t("teaching.classDetail.archived.title")}
                description={t("teaching.classDetail.archived.description")}
              />
            )}
            <ClassHero
              t={t}
              course={course}
              role={myClassRole}
              canManageStaff={canManageStaffActions}
              canPostAnnouncements={canPostAnnouncementsActions}
              onOpenStaff={() => setStaffOpen(true)}
              onOpenAnnouncement={openAnnouncementModal}
            />

            <section className="!rounded-2xl border border-slate-200 bg-white !p-4 sm:!p-5 dark:border-slate-800 dark:bg-slate-900">
              <Tabs activeKey={normalizedActiveTab} onChange={handleTabChange} items={tabItems} />
            </section>
          </div>
        )}
      </main>

      <ClassStaffModal
        open={staffOpen}
        classSectionId={Number(id)}
        canManageStaff={canManageStaffActions}
        allowPrimaryTeacherAssignment={false}
        onClose={() => setStaffOpen(false)}
        onChanged={load}
      />

      <Modal
        title={editingAnnouncement ? t("teaching.classDetail.announcements.editModalTitle") : t("teaching.classDetail.announcements.modalTitle")}
        open={announcementOpen}
        onCancel={() => {
          setAnnouncementOpen(false);
          setEditingAnnouncement(null);
        }}
        onOk={handleSubmitAnnouncement}
        okText={editingAnnouncement ? t("teaching.classDetail.announcements.save") : t("teaching.classDetail.announcements.submit")}
        cancelText={t("teaching.classDetail.announcements.cancel")}
        confirmLoading={submittingAnnouncement}
        destroyOnHidden
      >
        <Form form={announcementForm} layout="vertical" className="mt-4">
          <Form.Item
            name="title"
            label={t("teaching.classDetail.announcements.title")}
            rules={[{ required: true, message: t("teaching.classDetail.announcements.validationTitle") }]}
          >
            <Input placeholder={t("teaching.classDetail.announcements.placeholderTitle")} />
          </Form.Item>
          <Form.Item
            name="summary"
            label={t("teaching.classDetail.announcements.content")}
            rules={[{ required: true, message: t("teaching.classDetail.announcements.validationContent") }]}
          >
            <Input.TextArea rows={5} placeholder={t("teaching.classDetail.announcements.placeholderContent")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function ClassHero({ course, role, canManageStaff, canPostAnnouncements, onOpenStaff, onOpenAnnouncement, t }) {
  const title = course.title || course.classCode || t("teaching.classDetail.noClassData");
  const status = course.status || "PRIVATE";
  const roleClass = role === "TA"
    ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-900/20 dark:text-violet-300"
    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300";
  const roleLabel = role === "TA" ? t("teaching.roles.teachingAssistant") : t("teaching.roles.primaryTeacher");

  return (
    <section className="!overflow-hidden !rounded-2xl !border !border-slate-200 !bg-white dark:!border-slate-800 dark:!bg-slate-900">
      {/* Ảnh lớp học ở trang chi tiết được ẩn theo yêu cầu
      {course.imageUrl && (
        <div className="!aspect-[5/1] !min-h-36 !overflow-hidden !bg-slate-100 dark:!bg-slate-800">
          <img src={course.imageUrl} alt={title} className="!h-full !w-full !object-cover" />
        </div>
      )}
      */}
      <div className="!flex !flex-col !gap-4 !p-5 sm:!p-6 lg:!flex-row lg:!items-start lg:!justify-between">
        <div className="!min-w-0">
          <div className="!mb-3 !flex !flex-wrap !items-center !gap-2">
            <span className={`!rounded-full !border !px-2.5 !py-1 !text-xs !font-bold ${statusClass[status] || statusClass.PRIVATE}`}>
              {t(`teaching.status.${String(status || "private").toLowerCase()}`)}
            </span>
            <span className={`!rounded-full !border !px-2.5 !py-1 !text-xs !font-bold ${roleClass}`}>{roleLabel}</span>
            {course.subjectTitle && (
              <span className="!rounded-full !border !border-slate-200 !bg-slate-50 !px-2.5 !py-1 !text-xs !font-bold !text-slate-600 dark:!border-slate-700 dark:!bg-slate-800 dark:!text-slate-300">
                {course.subjectTitle}
              </span>
            )}
          </div>
          <h1 className="!m-0 !text-2xl !font-bold !tracking-tight !text-slate-950 dark:!text-white sm:!text-3xl">{title}</h1>
          <p className="!m-0 !mt-2 !text-sm !text-slate-500 dark:!text-slate-400">
            {t("teaching.classDetail.heroMeta", {
              teacher: course.teacherName || t("teaching.classDetail.unknownTeacher"),
              students: course.totalEnrollments ?? 0,
              staff: course.teachingMembers?.length ?? 1,
            })}
          </p>
        </div>

        <div className="!flex !flex-wrap !gap-2">
          {canPostAnnouncements && (
            <Button type="primary" onClick={onOpenAnnouncement}>
              {t("teaching.classDetail.actions.createAnnouncement")}
            </Button>
          )}
          {canManageStaff && (
            <Button onClick={onOpenStaff}>
              {t("teaching.classes.staff")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function Overview({ t, course, summary, canManageStaff, onOpenStaff }) {
  if (!course) return <Empty description={t("teaching.classDetail.noClassData")} />;

  return (
    <div className="!space-y-5">
      <div className="!grid !grid-cols-1 !gap-4 sm:!grid-cols-2 xl:!grid-cols-4">
        <SummaryTile label={t("teaching.classDetail.stats.students")} value={summary?.totalStudents ?? course.totalEnrollments ?? 0} icon={<UserGroupIcon className="!h-5 !w-5" />} tone="blue" />
        <SummaryTile label={t("teaching.classDetail.stats.pendingSubmissions")} value={summary?.pendingSubmissions ?? 0} icon={<ClipboardDocumentCheckIcon className="!h-5 !w-5" />} tone="amber" />
        <SummaryTile label={t("teaching.classDetail.stats.pendingQuizReviews")} value={summary?.pendingQuizReviews ?? 0} icon={<BookOpenIcon className="!h-5 !w-5" />} tone="violet" />
        <SummaryTile label={t("teaching.classDetail.stats.atRiskStudents")} value={summary?.atRiskStudents ?? 0} icon={<ExclamationTriangleIcon className="!h-5 !w-5" />} tone="rose" />
      </div>

      <section className="!rounded-2xl !border !border-slate-200 !p-5 dark:!border-slate-800">
        <div className="!mb-4 !flex !items-center !justify-between !gap-3">
          <h2 className="!m-0 !text-base !font-bold !text-slate-950 dark:!text-white">{t("teaching.staff.title")}</h2>
          {canManageStaff && (
            <Button type="link" onClick={onOpenStaff} className="!px-0">
              {t("teaching.staff.actions.manage")}
            </Button>
          )}
        </div>
        <div className="!space-y-2.5">
          {(course.teachingMembers || []).length ? (
            course.teachingMembers.map((member) => (
              <div key={member.userId} className="!flex !min-w-0 !items-center !justify-between !gap-3 !rounded-xl !border !border-slate-100 !bg-slate-50 !px-3.5 !py-2.5 dark:!border-slate-800 dark:!bg-slate-800/60">
                <UserIdentity
                  user={member}
                  variant="teacher"
                  avatarSizeClass="size-9"
                  className="min-w-0 flex-1"
                  nameClassName="!m-0 truncate text-sm font-bold text-slate-900 dark:text-white"
                  secondaryClassName="!m-0 !mt-0.5 truncate text-xs text-slate-500"
                />
                <span className="!shrink-0 !text-xs !font-semibold !text-slate-500">
                  {member.role === "TEACHER" ? t("teaching.roles.primaryTeacher") : t("teaching.roles.teachingAssistant")}
                </span>
              </div>
            ))
          ) : (
            <p className="!m-0 !text-sm !text-slate-500">{t("teaching.classDetail.archived.noStaffData")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ label, value, icon, tone = "slate" }) {
  const toneClass = {
    blue: "!bg-blue-50 !text-blue-600 dark:!bg-blue-900/20 dark:!text-blue-300",
    amber: "!bg-amber-50 !text-amber-600 dark:!bg-amber-900/20 dark:!text-amber-300",
    violet: "!bg-violet-50 !text-violet-600 dark:!bg-violet-900/20 dark:!text-violet-300",
    rose: "!bg-rose-50 !text-rose-600 dark:!bg-rose-900/20 dark:!text-rose-300",
    slate: "!bg-slate-100 !text-primary dark:!bg-slate-800",
  }[tone] || "!bg-slate-100 !text-primary dark:!bg-slate-800";

  return (
    <article className="!rounded-2xl !border !border-slate-200 !bg-white !p-5 dark:!border-slate-800 dark:!bg-slate-900">
      <div className={`!mb-3 !flex !h-9 !w-9 !items-center !justify-center !rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <p className="!m-0 !text-xs !font-bold !uppercase !tracking-wide !text-slate-500">{label}</p>
      <p className="!m-0 !mt-1 !text-2xl !font-black !text-slate-950 dark:!text-white">{value ?? 0}</p>
    </article>
  );
}

function AnnouncementsPanel({ classSectionId, refreshKey, onCreate, canCreate, canManage, onEdit, onDelete, t }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">{t("teaching.classDetail.announcements.panelTitle")}</h2>
          <p className="m-0 text-sm text-slate-500">{t("teaching.classDetail.announcements.panelDescription")}</p>
        </div>
        <Button type="primary" onClick={onCreate} disabled={!canCreate}>
          {t("teaching.classDetail.announcements.create")}
        </Button>
      </div>
      <AnnouncementsTab key={refreshKey} classSectionId={classSectionId} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
