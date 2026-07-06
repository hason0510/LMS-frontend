import React, { useEffect, useState } from "react";
import { Empty, Select, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";
import Avatar from "../common/Avatar";
import UserIdentity from "../common/UserIdentity";
import { getClassPeople } from "../../api/teaching";

export default function ClassPeopleTab({ classSectionId }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

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
        <UserIdentity
          user={{
            name: record.studentName || "N/A",
            avatarUrl: record.avatarUrl
          }}
          secondaryText={record.email || record.studentNumber || t("teaching.people.noStudentCode")}
          avatarSizeClass="size-9"
        />
      ),
    },
    {
      title: t("teaching.people.columns.status"),
      dataIndex: "enrollmentStatus",
      width: 120,
      align: "center",
      render: (value) => <Tag className="mx-0" color={value === "APPROVED" ? "green" : value === "PENDING" ? "gold" : "red"}>{t(`teaching.enrollmentStatus.${String(value || "").toLowerCase()}`)}</Tag>,
    },
    {
      title: t("teaching.people.columns.progress"),
      dataIndex: "progress",
      width: 120,
      align: "center",
      render: (value) => `${value ?? 0}%`,
    },
    {
      title: t("teaching.people.columns.missingAssignments"),
      dataIndex: "missingAssignments",
      width: 120,
      align: "center",
      render: (value) => <Tag className="mx-0" color={value > 0 ? "red" : "default"}>{value}</Tag>,
    },
    {
      title: t("teaching.people.columns.pendingReviews"),
      dataIndex: "pendingReviews",
      width: 120,
      align: "center",
      render: (value) => <Tag className="mx-0" color={value > 0 ? "gold" : "default"}>{value}</Tag>,
    },
    {
      title: t("teaching.people.columns.latestScore"),
      dataIndex: "latestScore",
      width: 160,
      align: "center",
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
          showSearch
          optionFilterProp="label"
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
        <div className="app-table-shell">
          <Table
            rowKey="studentId"
            loading={loading}
            columns={columns}
            dataSource={rows}
            scroll={{ x: 860 }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </div>
      )}
    </div>
  );
}
