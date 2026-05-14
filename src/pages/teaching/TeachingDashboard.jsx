import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Empty, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import {
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import { getMyTeachingClasses, getTeachingReviewQueue, getTeachingWorkbenchSummary } from "../../api/teaching";

function StatBlock({ icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="m-0 mt-2 text-3xl font-black text-slate-950 dark:text-white">{value ?? 0}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function TeachingDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString(i18n.language === "vi" ? "vi-VN" : "en-US")
      : t("teaching.common.noDeadline");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [classesRes, summaryRes, reviewQueueRes] = await Promise.all([
          getMyTeachingClasses(),
          getTeachingWorkbenchSummary(),
          getTeachingReviewQueue(),
        ]);
        setClasses(Array.isArray(classesRes) ? classesRes : classesRes?.data || []);
        setSummary(summaryRes?.data || summaryRes || null);
        setReviewQueue(Array.isArray(reviewQueueRes) ? reviewQueueRes : reviewQueueRes?.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || t("teaching.dashboard.errors.loadWorkspace"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const previewQueue = useMemo(() => reviewQueue.slice(0, 8), [reviewQueue]);

  const openReviewItem = (item) => {
    if (!item || item.selfOwned) {
      return;
    }
    if (item.type === "QUIZ") {
      navigate(`/teaching/quiz-attempts/${item.attemptId}`);
      return;
    }
    navigate(`/teaching/class-sections/${item.classSectionId}/review`);
  };

  return (
    <TeachingLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-primary">{t("teaching.layout.title")}</p>
            <h1 className="m-0 mt-2 text-2xl font-black text-slate-950 dark:text-white md:text-3xl">
              {t("teaching.dashboard.title")}
            </h1>
            <p className="m-0 mt-1 max-w-2xl text-sm text-slate-500">{t("teaching.dashboard.subtitle")}</p>
          </div>
          <Button type="primary" onClick={() => navigate("/teaching/classes")}>
            {t("teaching.dashboard.myClasses")}
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-96 items-center justify-center">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={t("teaching.dashboard.errors.loadData")} description={error} />
        ) : classes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
            <Empty description={t("teaching.dashboard.empty")} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatBlock
                label={t("teaching.dashboard.stats.pendingSubmissions")}
                value={summary?.pendingSubmissions}
                icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
                tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
              />
              <StatBlock
                label={t("teaching.dashboard.stats.pendingQuizReviews")}
                value={summary?.pendingQuizReviews}
                icon={<QueueListIcon className="h-6 w-6" />}
                tone="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
              />
              <StatBlock
                label={t("teaching.dashboard.stats.atRiskStudents")}
                value={summary?.atRiskStudents}
                icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                tone="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
              />
              <StatBlock
                label={t("teaching.dashboard.stats.totalClasses")}
                value={summary?.totalClasses}
                icon={<UserGroupIcon className="h-6 w-6" />}
                tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="m-0 text-base font-black text-slate-950 dark:text-white">{t("teaching.dashboard.reviewQueue")}</h2>
                  <Button type="link" onClick={() => navigate("/teaching/classes")}>
                    {t("teaching.dashboard.openByClass")} <ArrowRightIcon className="ml-1 inline h-4 w-4" />
                  </Button>
                </div>
                {previewQueue.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("teaching.dashboard.noReviewItems")} />
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewQueue.map((item) => (
                      <button
                        key={`${item.type}-${item.submissionId || item.attemptId}`}
                        onClick={() => openReviewItem(item)}
                        disabled={item.selfOwned}
                        className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800/50"
                      >
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="m-0 text-xs text-slate-500">
                            {item.classSectionTitle} · {item.studentName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Tag color={item.type === "QUIZ" ? "blue" : "green"}>
                            {t(`teaching.review.types.${String(item.type || "").toLowerCase()}`)}
                          </Tag>
                          {item.late && <Tag color="red">{t("teaching.review.flags.late")}</Tag>}
                          {item.selfOwned && <Tag color="gold">{t("teaching.review.flags.selfOwned")}</Tag>}
                          <span className="text-xs text-slate-400">{formatDate(item.submittedAt || item.dueAt)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-primary" />
                  <h2 className="m-0 text-base font-black text-slate-950 dark:text-white">{t("teaching.dashboard.myClasses")}</h2>
                </div>
                <div className="space-y-2">
                  {classes.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/teaching/class-sections/${item.id}`)}
                      className="w-full rounded-lg border border-slate-100 px-3 py-2 text-left hover:border-primary/50 dark:border-slate-800"
                    >
                      <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">
                        {item.title || item.classCode}
                      </p>
                      <p className="m-0 text-xs text-slate-500">{item.subjectTitle || t("teaching.classes.noSubject")}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </TeachingLayout>
  );
}
