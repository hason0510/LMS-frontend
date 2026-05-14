import React, { useEffect, useState } from "react";
import { Drawer, Empty, Select, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";
import Avatar from "../common/Avatar";
import { getClassPeople } from "../../api/teaching";

export default function ClassPeopleTab({ classSectionId }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getClassPeople(classSectionId, { status });
        setRows(Array.isArray(response) ? response : response?.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classSectionId, status]);

  const columns = [
    {
      title: t("teaching.people.columns.student"),
      render: (_, record) => (
        <button onClick={() => setSelected(record)} className="flex min-w-0 items-center gap-3 text-left">
          <Avatar src={record.avatarUrl} alt={record.studentName} className="!h-9 !w-9" />
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-slate-900 dark:text-white">{record.studentName || "N/A"}</p>
            <p className="m-0 text-xs text-slate-500">{record.email || record.studentNumber || t("teaching.people.noStudentCode")}</p>
          </div>
        </button>
      ),
    },
    {
      title: t("teaching.people.columns.status"),
      dataIndex: "enrollmentStatus",
      width: 120,
      render: (value) => <Tag color={value === "APPROVED" ? "green" : value === "PENDING" ? "gold" : "red"}>{t(`teaching.enrollmentStatus.${String(value || "").toLowerCase()}`)}</Tag>,
    },
    {
      title: t("teaching.people.columns.progress"),
      dataIndex: "progress",
      width: 100,
      render: (value) => `${value ?? 0}%`,
    },
    {
      title: t("teaching.people.columns.missingAssignments"),
      dataIndex: "missingAssignments",
      width: 120,
      render: (value) => <Tag color={value > 0 ? "red" : "default"}>{value}</Tag>,
    },
    {
      title: t("teaching.people.columns.pendingReviews"),
      dataIndex: "pendingReviews",
      width: 120,
      render: (value) => <Tag color={value > 0 ? "gold" : "default"}>{value}</Tag>,
    },
    {
      title: t("teaching.people.columns.latestScore"),
      dataIndex: "latestScore",
      width: 130,
      render: (value) => value ?? "-",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="m-0 text-lg font-black text-slate-950 dark:text-white">{t("teaching.people.title")}</h2>
          <p className="m-0 text-sm text-slate-500">{t("teaching.people.subtitle")}</p>
        </div>
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { value: "ALL", label: t("teaching.people.filters.all") },
            { value: "APPROVED", label: t("teaching.people.filters.approved") },
            { value: "PENDING", label: t("teaching.people.filters.pending") },
            { value: "REJECTED", label: t("teaching.people.filters.rejected") },
          ]}
          className="w-full md:w-44"
        />
      </div>
      {rows.length === 0 && !loading ? (
        <Empty description={t("teaching.people.empty")} />
      ) : (
        <Table
          rowKey="studentId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 860 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      )}
      <Drawer
        title={selected?.studentName || t("teaching.people.studentProfile")}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={420}
        destroyOnHidden
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={selected.avatarUrl} alt={selected.studentName} />
              <div>
                <p className="m-0 font-black text-slate-950 dark:text-white">{selected.studentName}</p>
                <p className="m-0 text-sm text-slate-500">{selected.email || selected.studentNumber}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label={t("teaching.people.columns.progress")} value={`${selected.progress ?? 0}%`} />
              <Metric label={t("teaching.people.columns.missingAssignments")} value={selected.missingAssignments} />
              <Metric label={t("teaching.people.columns.pendingReviews")} value={selected.pendingReviews} />
              <Metric label={t("teaching.people.columns.latestScore")} value={selected.latestScore ?? "-"} />
            </div>
            {selected.self && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {t("teaching.people.selfNotice")}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="m-0 text-xs text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-xl font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
