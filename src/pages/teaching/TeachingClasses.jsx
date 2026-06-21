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
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import classPlaceholder from "../../assets/class_placeholder.png";

const sortOptions = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "az", label: "Tên A-Z" },
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
  const [categoryId, setCategoryId] = useState(null);
  const [subjectCode, setSubjectCode] = useState(null);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    setPage(1);
  }, [keyword, categoryId, subjectCode, sort]);

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

  const categoryOptions = useMemo(() => {
    const cats = new Map();
    classes.forEach(c => {
      if (c.categoryId) cats.set(c.categoryId, c.categoryTitle || `Danh mục ${c.categoryId}`);
    });
    return Array.from(cats.entries()).map(([value, label]) => ({ value, label }));
  }, [classes]);

  const subjectOptions = useMemo(() => {
    const subs = new Map();
    classes.forEach(c => {
      if (c.subjectCode) subs.set(c.subjectCode, `${c.subjectCode} - ${c.subjectTitle || ""}`);
    });
    return Array.from(subs.entries()).map(([value, label]) => ({ value, label }));
  }, [classes]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const items = classes.filter((item) => {
      const text = `${item.title || ""} ${item.classCode || ""} ${item.subjectTitle || ""} ${item.teacherName || ""}`.toLowerCase();
      const matchKeyword = !q || text.includes(q);
      const matchCategory = !categoryId || item.categoryId === categoryId;
      const matchSubject = !subjectCode || item.subjectCode === subjectCode;
      return matchKeyword && matchCategory && matchSubject;
    });

    return [...items].sort((a, b) => {
      if (sort === "az") return (a.title || a.classCode || "").localeCompare(b.title || b.classCode || "", "vi");
      if (sort === "oldest") return (a.id || 0) - (b.id || 0);
      return (b.id || 0) - (a.id || 0);
    });
  }, [classes, keyword, sort, categoryId, subjectCode]);

  const resetFilters = () => {
    setKeyword("");
    setCategoryId(null);
    setSubjectCode(null);
    setSort("newest");
  };

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <Header />
      <main className="!px-4 !py-6 sm:!px-6 lg:!px-8">
        <div className="!mx-auto !max-w-7xl">
          <div className="!mb-6 !flex !flex-col !gap-4 sm:!flex-row sm:!items-start sm:!justify-between">
            <div className="!min-w-0">
              <h1 className="!m-0 !text-2xl !font-bold !tracking-tight !text-slate-900 dark:!text-white sm:!text-3xl">Lớp trợ giảng</h1>
              <p className="!m-0 !mt-1.5 !max-w-2xl !text-sm !leading-6 !text-slate-500 dark:!text-slate-400">
                Các lớp bạn được phân công hỗ trợ. Vào từng lớp để xem nội dung, người học, chấm bài và thông báo theo quyền được giảng viên cấp.
              </p>
            </div>
            <Button type="primary" onClick={() => navigate("/classes")} className="shrink-0">
              Về lớp người học
            </Button>
          </div>

          <section className="overflow-hidden !rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {/* Header trong khung */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
              <div className="flex items-center gap-2">
                <h2 className="!m-0 !text-lg !font-bold !text-slate-900 dark:!text-white">Danh sách lớp trợ giảng</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {filtered.length}
                </span>
              </div>
            </div>

            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_200px_200px_180px_auto]">
                <Input
                  allowClear
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo tên lớp..."
                  className="w-full"
                />
                <Select
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categoryOptions}
                  placeholder="Danh mục"
                  className="w-full"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
                <Select
                  value={subjectCode}
                  onChange={setSubjectCode}
                  options={subjectOptions}
                  placeholder="Mã học phần"
                  className="w-full"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                />
                <Select
                  value={sort}
                  onChange={setSort}
                  options={sortOptions}
                  className="w-full"
                />
                <Button onClick={resetFilters}>Đặt lại</Button>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: pageSize }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <Skeleton.Image active className="!aspect-[16/7] !h-auto !w-full !rounded-xl" />
                      <Skeleton active paragraph={{ rows: 5 }} className="mt-4" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <Alert type="error" showIcon message="Không thể tải dữ liệu" description={error} />
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/70">
                  <Empty description="Bạn chưa có lớp học phù hợp với bộ lọc hiện tại." />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((item) => (
                    <TeachingClassCard key={item.id} item={item} onOpen={() => navigate(`/teaching/class-sections/${item.id}`)} />
                  ))}
                </div>
              )}
            </div>

            <DataPaginationFooter
              currentPage={page}
              pageSize={pageSize}
              total={filtered.length}
              pageSizeOptions={[6, 12, 24]}
              totalLabel={`Tổng số: ${filtered.length}`}
              pageSizeLabel="Số dòng/trang"
              rangeLabel={filtered.length === 0 ? "0 - 0" : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, filtered.length)}`}
              onPageChange={setPage}
              onPageSizeChange={(newPageSize) => {
                setPageSize(newPageSize);
                setPage(1);
              }}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function TeachingClassCard({ item, onOpen }) {
  const title = item.title || item.classCode || "Lớp chưa có tên";
  const status = item.status || "PRIVATE";
  const subjectText = item?.subjectTitle
    ? item?.subjectCode
      ? `${item.subjectCode} - ${item.subjectTitle}`
      : item.subjectTitle
    : item?.subjectCode || "Chưa có môn học";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div
        className="aspect-[16/7] bg-cover bg-center"
        style={{ backgroundImage: `url(${item?.imageUrl || classPlaceholder})` }}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Mã lớp: {item?.classCode || "-"}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass[status] || statusClass.PRIVATE}`}>
              {statusLabel[status] || status}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">Danh mục:</span>{" "}
            {item?.categoryTitle || "Không có"}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">Môn học:</span>{" "}
            {subjectText}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">Giảng viên:</span>{" "}
            {item?.teacherName || "Chưa xác định"}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">Thời gian:</span>{" "}
            {formatDateRange(item)}
          </div>
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">Người học:</span>{" "}
            {item?.totalEnrollments || 0}
          </div>
        </div>

        <div className="mt-4 pt-1 flex-1 flex flex-col justify-end">
          <button
            type="button"
            onClick={onOpen}
            className="flex h-10 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vào lớp
          </button>
        </div>
      </div>
    </article>
  );
}
