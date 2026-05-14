import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Empty, Input, Spin, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import TeachingLayout from "../../components/teaching/TeachingLayout";
import { getMyTeachingClasses } from "../../api/teaching";

export default function TeachingClasses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getMyTeachingClasses();
        setClasses(Array.isArray(response) ? response : response?.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || t("teaching.classes.errors.loadClasses"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = classes.filter((item) => {
    const text = `${item.title || ""} ${item.classCode || ""} ${item.subjectTitle || ""}`.toLowerCase();
    return text.includes(keyword.trim().toLowerCase());
  });

  return (
    <TeachingLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-primary">{t("teaching.layout.title")}</p>
            <h1 className="m-0 mt-2 text-2xl font-black text-slate-950 dark:text-white md:text-3xl">{t("teaching.classes.title")}</h1>
          </div>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("teaching.classes.searchPlaceholder")}
            className="w-full md:w-96"
          />
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={t("teaching.classes.errors.loadData")} description={error} />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
            <Empty description={t("teaching.classes.empty")} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/teaching/class-sections/${item.id}`)}
                className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="m-0 line-clamp-2 text-lg font-black text-slate-950 dark:text-white">
                      {item.title || item.classCode}
                    </h2>
                    <p className="m-0 mt-1 text-sm text-slate-500">{item.subjectTitle || t("teaching.classes.noSubject")}</p>
                  </div>
                  <Tag color={item.status === "PUBLIC" ? "green" : item.status === "ARCHIVED" ? "default" : "gold"}>
                    {t(`teaching.status.${(item.status || "PRIVATE").toLowerCase()}`)}
                  </Tag>
                </div>
                <div className="mb-3">
                  <Tag color={item.myClassRole === "TEACHER" ? "blue" : "green"}>
                    {item.myClassRole === "TEACHER"
                      ? t("teaching.roles.primaryTeacher")
                      : t("teaching.roles.teachingAssistant")}
                  </Tag>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="m-0 text-xs text-slate-500">{t("teaching.classes.students")}</p>
                    <p className="m-0 text-xl font-black text-slate-900 dark:text-white">{item.totalEnrollments ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="m-0 text-xs text-slate-500">{t("teaching.classes.staff")}</p>
                    <p className="m-0 text-xl font-black text-slate-900 dark:text-white">{item.teachingMembers?.length ?? 1}</p>
                  </div>
                </div>
                <p className="m-0 mt-4 text-sm font-bold text-primary group-hover:underline">{t("teaching.classes.openWorkspace")}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </TeachingLayout>
  );
}
