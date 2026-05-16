import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Empty, Spin, Tag, Tabs } from "antd";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import CourseContent from "../../components/course/CourseContent";
import AnnouncementsTab from "../../components/course/AnnouncementsTab";
import ClassPeopleTab from "../../components/teaching/ClassPeopleTab";
import ClassReviewTab from "../../components/teaching/ClassReviewTab";
import ClassStaffModal from "../../components/teaching/ClassStaffModal";
import { getClassSectionById } from "../../api/classSection";
import { getClassWorkbenchSummary } from "../../api/teaching";

const CAP_VIEW_PEOPLE = "VIEW_PEOPLE";
const CAP_VIEW_PROGRESS = "VIEW_PROGRESS";
const CAP_GRADE_ASSIGNMENTS = "GRADE_ASSIGNMENTS";
const CAP_REVIEW_QUIZZES = "REVIEW_QUIZZES";
const CAP_POST_ANNOUNCEMENTS = "POST_ANNOUNCEMENTS";
const CAP_MANAGE_STAFF = "MANAGE_STAFF";

const tabFromPath = (pathname) => {
  if (pathname.endsWith("/people")) return "people";
  if (pathname.endsWith("/review")) return "review";
  if (pathname.endsWith("/announcements")) return "announcements";
  if (pathname.endsWith("/progress")) return "progress";
  if (pathname.endsWith("/content")) return "content";
  return "overview";
};

function SummaryTile({ label, value, icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2 text-slate-500">{icon}</div>
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-2xl font-black text-slate-950 dark:text-white">{value ?? 0}</p>
    </div>
  );
}

const hasCapability = (course, capability) => (course?.myCapabilities || []).includes(capability);

export default function TeachingClassDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [summary, setSummary] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeTab = tabFromPath(location.pathname);
  const canManageStaff = hasCapability(course, CAP_MANAGE_STAFF);
  const canViewPeople = hasCapability(course, CAP_VIEW_PEOPLE);
  const canGradeAssignments = hasCapability(course, CAP_GRADE_ASSIGNMENTS);
  const canReviewQuizzes = hasCapability(course, CAP_REVIEW_QUIZZES);
  const canReview = canReviewQuizzes || canGradeAssignments;
  const canPostAnnouncements = hasCapability(course, CAP_POST_ANNOUNCEMENTS);
  const canViewProgress = hasCapability(course, CAP_VIEW_PROGRESS);

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

  const tabItems = useMemo(() => {
    const items = [
      {
        key: "overview",
        label: t("teaching.classDetail.tabs.overview"),
        children: (
          <Overview
            course={course}
            summary={summary}
            onOpenStaff={() => setStaffOpen(true)}
            onNavigate={navigate}
            canManageStaff={canManageStaff}
            canReview={canReview}
            canGradeAssignments={canGradeAssignments}
            canReviewQuizzes={canReviewQuizzes}
            canViewPeople={canViewPeople}
            canPostAnnouncements={canPostAnnouncements}
          />
        ),
      },
    ];

    items.push({
      key: "content",
      label: t("teaching.classDetail.tabs.content"),
      children: <CourseContent enrollmentStatus="APPROVED" workspaceMode="teaching" capabilities={course?.myCapabilities || []} />,
    });
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
            canGradeAssignments={canGradeAssignments}
            canReviewQuizzes={canReviewQuizzes}
          />
        ),
      });
    }
    if (canPostAnnouncements) {
      items.push({
        key: "announcements",
        label: t("teaching.classDetail.tabs.announcements"),
        children: <AnnouncementsTab classSectionId={id} />,
      });
    }
    if (canViewProgress) {
      items.push({
        key: "progress",
        label: t("teaching.classDetail.tabs.progress"),
        children: <ProgressPanel summary={summary} />,
      });
    }
    return items;
  }, [course, summary, id, navigate, canViewPeople, canReview, canGradeAssignments, canReviewQuizzes, canPostAnnouncements, canViewProgress, canManageStaff, t]);

  const handleTabChange = (key) => {
    const suffix = key === "overview" ? "" : `/${key}`;
    navigate(`/teaching/class-sections/${id}${suffix}`);
  };

  const normalizedActiveTab = tabItems.some((item) => item.key === activeTab) ? activeTab : "overview";

  return (
    <TeachingLayout>
      {loading ? (
        <div className="flex min-h-96 items-center justify-center">
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" showIcon message={t("teaching.classDetail.errors.loadClass")} description={error} />
      ) : (
        <div className="space-y-5">
          <button onClick={() => navigate("/teaching/classes")} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            <ArrowLeftIcon className="h-4 w-4" />
            {t("teaching.classDetail.backToClasses")}
          </button>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Tag color="blue">{t("teaching.layout.teachingWorkspace")}</Tag>
                  <Tag color={course?.status === "PUBLIC" ? "green" : "gold"}>{t(`teaching.status.${(course?.status || "PRIVATE").toLowerCase()}`)}</Tag>
                  <Tag color={course?.myClassRole === "TEACHER" ? "blue" : "green"}>
                    {course?.myClassRole === "TEACHER" ? t("teaching.roles.primaryTeacher") : t("teaching.roles.teachingAssistant")}
                  </Tag>
                </div>
                <h1 className="m-0 text-2xl font-black text-slate-950 dark:text-white md:text-3xl">{course?.title || course?.classCode}</h1>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  {course?.subjectTitle || t("teaching.classes.noSubject")} · {course?.teacherName || t("teaching.classDetail.noPrimaryTeacher")}
                </p>
              </div>
              {canManageStaff && (
                <Button icon={<UserGroupIcon className="h-4 w-4" />} onClick={() => setStaffOpen(true)}>
                  {t("teaching.classDetail.manageStaff")}
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Tabs activeKey={normalizedActiveTab} onChange={handleTabChange} items={tabItems} />
          </section>

          <ClassStaffModal open={staffOpen} classSectionId={Number(id)} canManageStaff={canManageStaff} onClose={() => setStaffOpen(false)} onChanged={load} />
        </div>
      )}
    </TeachingLayout>
  );
}

function Overview({
  course,
  summary,
  onOpenStaff,
  onNavigate,
  canManageStaff,
  canReview,
  canGradeAssignments,
  canReviewQuizzes,
  canViewPeople,
  canPostAnnouncements,
}) {
  const { t } = useTranslation();
  if (!course) return <Empty description={t("teaching.classDetail.noClassData")} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label={t("teaching.classDetail.stats.students")} value={summary?.totalStudents} icon={<UserGroupIcon className="h-5 w-5" />} />
        <SummaryTile label={t("teaching.classDetail.stats.pendingSubmissions")} value={summary?.pendingSubmissions} icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />} />
        <SummaryTile label={t("teaching.classDetail.stats.pendingQuizReviews")} value={summary?.pendingQuizReviews} icon={<PencilSquareIcon className="h-5 w-5" />} />
        <SummaryTile label={t("teaching.classDetail.stats.atRiskStudents")} value={summary?.atRiskStudents} icon={<MegaphoneIcon className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 xl:col-span-2">
          <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">{t("teaching.classDetail.quickStart")}</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {canReview && (
              <Button onClick={() => onNavigate(`/teaching/class-sections/${course.id}/review`)}>
                {canGradeAssignments && canReviewQuizzes
                  ? t("teaching.classDetail.tabs.review")
                  : canGradeAssignments
                  ? t("teaching.review.filters.assignment")
                  : t("teaching.review.filters.quiz")}
              </Button>
            )}
            {canViewPeople && <Button onClick={() => onNavigate(`/teaching/class-sections/${course.id}/people`)}>{t("teaching.classDetail.tabs.people")}</Button>}
            {canPostAnnouncements && (
              <Button onClick={() => onNavigate(`/teaching/class-sections/${course.id}/announcements`)}>{t("teaching.classDetail.tabs.announcements")}</Button>
            )}
            <Button onClick={() => onNavigate(`/teaching/class-sections/${course.id}/media`)}>
              Media
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">{t("teaching.staff.title")}</h2>
            {canManageStaff && (
              <Button type="link" onClick={onOpenStaff}>
                {t("teaching.staff.actions.manage")}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {(course.teachingMembers || []).map((member) => (
              <div key={member.userId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{member.fullName || member.username}</span>
                <Tag color={member.role === "TEACHER" ? "blue" : "green"}>
                  {member.role === "TEACHER" ? t("teaching.roles.primaryTeacher") : t("teaching.roles.teachingAssistant")}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressPanel({ summary }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <SummaryTile label={t("teaching.classDetail.progress.atRisk")} value={summary?.atRiskStudents} icon={<UserGroupIcon className="h-5 w-5" />} />
      <SummaryTile label={t("teaching.classDetail.progress.upcoming")} value={summary?.upcomingAssignments} icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />} />
      <SummaryTile
        label={t("teaching.classDetail.progress.pendingReviews")}
        value={(summary?.pendingSubmissions || 0) + (summary?.pendingQuizReviews || 0)}
        icon={<PencilSquareIcon className="h-5 w-5" />}
      />
    </div>
  );
}
