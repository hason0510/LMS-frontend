import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Empty, Input, Select, Skeleton } from "antd";
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Header from "../../components/layout/Header";
import { getMyTeachingClasses } from "../../api/teaching";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";

const statusOptions = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PUBLIC", label: "Công khai" },
  { value: "PRIVATE", label: "Riêng tư" },
  { value: "ARCHIVED", label: "Đã lưu trữ" },
];

const sortOptions = [
  { value: "newest", label: "Mới nhất" },
  { value: "az", label: "Tên A-Z" },
  { value: "students", label: "Nhiều người học" },
];

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

function normalizeList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.pageList)) return response.data.pageList;
  if (Array.isArray(response?.pageList)) return response.pageList;
  return [];
}

function formatDateRange(item) {
  if (!item?.startDate && !item?.endDate) return "Chưa xác định thời gian";
  if (item.startDate && item.endDate) return `${item.startDate} - ${item.endDate}`;
  return item.startDate ? `Từ ${item.startDate}` : `Đến ${item.endDate}`;
}

export default function TeachingClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getMyTeachingClasses();
        setClasses(normalizeList(response));
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Không thể tải danh sách lớp trợ giảng.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const items = classes.filter((item) => {
      const text = `${item.title || ""} ${item.classCode || ""} ${item.subjectTitle || ""} ${item.teacherName || ""}`.toLowerCase();
      const matchKeyword = !q || text.includes(q);
      const matchStatus = status === "ALL" || item.status === status;
      return matchKeyword && matchStatus;
    });

    return [...items].sort((a, b) => {
      if (sort === "az") return (a.title || a.classCode || "").localeCompare(b.title || b.classCode || "", "vi");
      if (sort === "students") return (b.totalEnrollments || 0) - (a.totalEnrollments || 0);
      return (b.id || 0) - (a.id || 0);
    });
  }, [classes, keyword, sort, status]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <AppBreadcrumb className="mb-5" />
        <section className="mb-5 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-primary">Trợ giảng</p>
              <h1 className="m-0 mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Lớp trợ giảng
              </h1>
              <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Các lớp bạn được phân công hỗ trợ. Vào từng lớp để xem nội dung, người học, chấm bài và thông báo theo quyền được giáo viên cấp.
              </p>
            </div>
            <Button type="primary" onClick={() => navigate("/classes")}>
              Về lớp người học
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_170px]">
            <Input
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên lớp, môn học, giáo viên..."
              prefix={<MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />}
              className="h-11"
            />
            <Select value={status} onChange={setStatus} options={statusOptions} className="h-11" showSearch optionFilterProp="label" />
            <Select value={sort} onChange={setSort} options={sortOptions} className="h-11" showSearch optionFilterProp="label" />
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Skeleton active paragraph={{ rows: 5 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert type="error" showIcon message="Không thể tải dữ liệu" description={error} />
        ) : filtered.length === 0 ? (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
            <Empty description={keyword || status !== "ALL" ? "Không tìm thấy lớp phù hợp." : "Bạn chưa được phân công trợ giảng lớp nào."} />
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <TeachingClassCard key={item.id} item={item} onOpen={() => navigate(`/teaching/class-sections/${item.id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TeachingClassCard({ item, onOpen }) {
  const title = item.title || item.classCode || "Lớp chưa có tên";
  const status = item.status || "PRIVATE";
  const staffCount = item.teachingMembers?.length ?? item.totalTeachingMembers ?? 1;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-primary/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <AcademicCapIcon className="h-14 w-14" />
          </div>
        )}
        <span className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[status] || statusClass.PRIVATE}`}>
          {statusLabel[status] || status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="min-w-0">
          <h2 className="m-0 line-clamp-2 text-lg font-black leading-6 text-slate-950 dark:text-white">{title}</h2>
          <p className="m-0 mt-1 line-clamp-1 text-sm text-slate-500">{item.subjectTitle || "Chưa có môn học"}</p>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpenIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">GV: {item.teacherName || "Chưa xác định"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{formatDateRange(item)}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{item.totalEnrollments ?? 0} người học · {staffCount} nhân sự</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white transition hover:bg-primary/90"
        >
          Vào lớp
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
