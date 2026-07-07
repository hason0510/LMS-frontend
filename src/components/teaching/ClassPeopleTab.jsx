import React, { useEffect, useMemo, useState } from "react";
import { Empty, Input, Select, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import UserIdentity from "../common/UserIdentity";
import DataPaginationFooter from "../common/DataPaginationFooter";
import { getClassPeople } from "../../api/teaching";

function ProgressBarMini({ percent, color }) {
  const p = Math.max(0, Math.min(100, percent || 0));
  return (
    <div className="flex items-center justify-center gap-3">
      <span style={{ color, minWidth: 40 }} className="text-right text-[13px] font-bold">{p}%</span>
      <div className="h-2.5 max-w-[120px] flex-1 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Ngưỡng trạng thái đồng nhất với báo cáo lớp GV/Admin (ClassSectionReportContent).
function resolveStanding(progress) {
  const p = progress ?? 0;
  if (p < 40) return { key: "atRisk", color: "#e11d48", tag: "error" };
  if (p < 75) return { key: "average", color: "#f59e0b", tag: "warning" };
  return { key: "good", color: "#10b981", tag: "success" };
}

export default function ClassPeopleTab({ classSectionId }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [standingFilter, setStandingFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getClassPeople(classSectionId, { status: "ALL" });
        setRows(Array.isArray(response) ? response : response?.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classSectionId]);

  useEffect(() => {
    setPage(1);
  }, [standingFilter, search, pageSize]);

  const filteredRows = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (standingFilter !== "ALL" && resolveStanding(r.progress).key !== standingFilter) return false;
      if (!kw) return true;
      return [r.studentName, r.studentNumber, r.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(kw));
    });
  }, [rows, search, standingFilter]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const columns = [
    {
      title: t("teaching.people.columns.index"),
      width: 56,
      align: "center",
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: t("teaching.people.columns.student"),
      render: (_, record) => (
        <UserIdentity
          user={{
            name: record.studentName || "N/A",
            avatarUrl: record.avatarUrl,
            studentNumber: record.studentNumber,
            email: record.email,
          }}
          variant="student"
          secondaryText={record.studentNumber || record.email || t("teaching.people.noStudentCode")}
          avatarSizeClass="size-9"
        />
      ),
    },
    {
      title: t("teaching.people.columns.progress"),
      dataIndex: "progress",
      width: 220,
      align: "center",
      render: (value) => <ProgressBarMini percent={value} color={resolveStanding(value).color} />,
    },
    {
      title: t("teaching.people.columns.submittedAssignments"),
      width: 140,
      align: "center",
      render: (_, record) => `${record.submittedAssignments || 0} / ${record.totalAssignments || 0}`,
    },
    {
      title: t("teaching.people.columns.passedQuizzes"),
      width: 150,
      align: "center",
      render: (_, record) => `${record.passedQuizzes || 0} / ${record.totalQuizzes || 0}`,
    },
    {
      title: t("teaching.people.columns.notSubmitted"),
      dataIndex: "notSubmittedAssignments",
      width: 160,
      align: "center",
      render: (value) => value ?? 0,
    },
    {
      title: t("teaching.people.columns.status"),
      dataIndex: "progress",
      width: 120,
      align: "center",
      render: (value) => {
        const s = resolveStanding(value);
        return <Tag className="mx-0 font-bold" color={s.tag}>{t(`teaching.people.standing.${s.key}`)}</Tag>;
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="m-0 text-lg font-black leading-tight! text-slate-950 dark:text-white">{t("teaching.people.title")}</h2>
          <p className="m-0 text-sm text-slate-500">{t("teaching.people.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("teaching.people.searchPlaceholder")}
            className="w-full sm:w-64"
          />
          <Select
            value={standingFilter}
            onChange={setStandingFilter}
            showSearch
            optionFilterProp="label"
            options={[
              { value: "ALL", label: t("teaching.people.progressFilter.all") },
              { value: "atRisk", label: t("teaching.people.standing.atRisk") },
              { value: "average", label: t("teaching.people.standing.average") },
              { value: "good", label: t("teaching.people.standing.good") },
            ]}
            className="w-full sm:w-44"
          />
        </div>
      </div>
      {filteredRows.length === 0 && !loading ? (
        <Empty description={t("teaching.people.empty")} />
      ) : (
        <div className="app-table-shell">
          <Table
            rowKey="studentId"
            loading={loading}
            columns={columns}
            dataSource={paginatedRows}
            scroll={{ x: 980 }}
            pagination={false}
          />
          <DataPaginationFooter
            currentPage={page}
            pageSize={pageSize}
            total={filteredRows.length}
            totalLabel={t("teaching.people.pagination.total", { count: filteredRows.length })}
            pageSizeLabel={t("teaching.people.pagination.pageSize")}
            rangeLabel={t("teaching.people.pagination.range", {
              start: filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, filteredRows.length),
            })}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
