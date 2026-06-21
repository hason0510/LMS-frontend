import React, { useEffect, useState } from "react";
import { Empty, Pagination, Select, Spin } from "antd";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import ReportSectionCard from "./ReportSectionCard";
import { unwrapPageData } from "../../utils/reporting";

const SORT_OPTIONS = [
  { value: "desc", label: "Nhiều lớp nhất" },
  { value: "asc", label: "Ít lớp nhất" },
  { value: "alpha", label: "A → Z" },
];

const EMPTY_PAGE = { items: [], totalPage: 1, totalElements: 0, currentPage: 1 };

/**
 * Biểu đồ "tải" dạng bar ngang có tìm kiếm + sắp xếp + phân trang (server-side).
 * fetcher: async ({ search, sort, page, size }) => PageResponse
 * mapItem: (rawItem) => ({ id, label, value })
 */
const formatVi = (n) => Number(n || 0).toLocaleString("vi-VN");

export default function PaginatedLoadChart({
  title,
  subtitle,
  fetcher,
  mapItem,
  searchPlaceholder = "Tìm...",
  unitLabel = "lớp",
  color = "#1d4ed8",
  pageSize = 8,
  emptyText = "Không có dữ liệu",
  totalClasses = null,
  entityLabel = "mục",
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(EMPTY_PAGE);

  // Debounce ô tìm kiếm
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Đổi tìm kiếm / sắp xếp thì về trang 1
  useEffect(() => {
    setPage(1);
  }, [debounced, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.resolve(fetcher({ search: debounced, sort, page, size: pageSize }))
      .then((res) => {
        if (!cancelled) setData(unwrapPageData(res));
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY_PAGE);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, debounced, sort, page, pageSize]);

  const items = (data.items || []).map(mapItem);
  const maxValue = Math.max(...items.map((it) => Number(it.value) || 0), 1);

  // Phụ đề kèm tỉ lệ tổng: "<subtitle> • X lớp / Y GV"
  const subtitleNode =
    totalClasses != null ? (
      <span>
        {subtitle} • <strong className="!text-slate-700 dark:!text-slate-200">{formatVi(totalClasses)}</strong> {unitLabel} /{" "}
        <strong className="!text-slate-700 dark:!text-slate-200">{formatVi(data.totalElements)}</strong> {entityLabel}
      </span>
    ) : (
      subtitle
    );

  return (
    <ReportSectionCard title={title} subtitle={subtitleNode}>
      {/* Thanh điều khiển: tìm kiếm + sắp xếp + tổng số */}
      <div className="!mb-4 !flex !flex-wrap !items-center !gap-2">
        <div className="!relative !min-w-[120px] !flex-1">
          <MagnifyingGlassIcon className="!pointer-events-none !absolute !left-3 !top-1/2 !h-4 !w-4 !-translate-y-1/2 !text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="!w-full !rounded-xl !border !border-slate-200 !bg-slate-50 !py-2 !pl-9 !pr-3 !text-sm !text-slate-700 !outline-none focus:!border-blue-400 dark:!border-slate-700 dark:!bg-slate-800 dark:!text-white"
          />
        </div>
        <Select value={sort} onChange={setSort} options={SORT_OPTIONS} className="!min-w-[124px]" />
        <span className="!shrink-0 !text-xs !font-semibold !text-slate-400">{formatVi(data.totalElements)} {entityLabel}</span>
      </div>

      {/* Danh sách bar */}
      <div className="!min-h-[300px]">
        {loading ? (
          <div className="!flex !min-h-[300px] !items-center !justify-center">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <div className="!flex !min-h-[300px] !items-center !justify-center">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
          </div>
        ) : (
          <div className="!space-y-2">
            {items.map((it, i) => {
              const globalIndex = (data.currentPage - 1) * pageSize + i + 1;
              const value = Number(it.value) || 0;
              const width = Math.max((value / maxValue) * 100, value > 0 ? 8 : 0);
              return (
                <div key={it.id ?? i} className="!flex !items-center !gap-2.5">
                  <span className="!w-5 !shrink-0 !text-right !text-xs !font-bold !text-slate-400">{globalIndex}</span>
                  <span
                    className="!w-32 !shrink-0 !truncate !text-sm !font-semibold !text-slate-700 dark:!text-slate-200"
                    title={it.label}
                  >
                    {it.label}
                  </span>
                  <div className="!relative !h-7 !flex-1 !overflow-hidden !rounded-md !bg-slate-100 dark:!bg-slate-800">
                    <div
                      className="!absolute !inset-y-0 !left-0 !rounded-md !transition-all !duration-500"
                      style={{ width: `${width}%`, background: color }}
                    />
                    <span className="!absolute !left-2.5 !top-1/2 !-translate-y-1/2 !text-xs !font-bold !text-white">
                      {value}
                    </span>
                  </div>
                  <span className="!w-16 !shrink-0 !text-right !text-sm !text-slate-500 dark:!text-slate-400">
                    {value} {unitLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pager gọn — chỉ hiện khi có nhiều hơn 1 trang */}
      {data.totalElements > pageSize && (
        <div className="!mt-4 !flex !justify-center">
          <Pagination
            size="small"
            current={data.currentPage}
            total={data.totalElements}
            pageSize={pageSize}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      )}
    </ReportSectionCard>
  );
}
