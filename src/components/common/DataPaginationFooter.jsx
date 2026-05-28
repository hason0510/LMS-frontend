import React from "react";
import { Pagination, Select } from "antd";

export default function DataPaginationFooter({
  currentPage,
  pageSize,
  total,
  pageSizeOptions = [10, 25, 50],
  totalLabel,
  pageSizeLabel,
  rangeLabel,
  onPageChange,
  onPageSizeChange,
}) {
  const safeTotal = total || 0;
  const start = safeTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, safeTotal);

  return safeTotal > 0 ? (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="font-semibold text-slate-900 dark:text-slate-100">
          {totalLabel || `Total: ${safeTotal}`}
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          {rangeLabel || `${start} - ${end}`}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">{pageSizeLabel || "Rows per page"}</span>
          <Select
            value={pageSize}
            onChange={(value) => onPageSizeChange?.(value)}
            options={pageSizeOptions.map((value) => ({ value, label: value }))}
            className="w-28"
          />
        </div>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={safeTotal}
          onChange={(page) => onPageChange?.(page)}
          showSizeChanger={false}
          size="default"
          responsive
        />
      </div>
    </div>
  ) : (
    <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {totalLabel || "Total: 0"}
        </span>
        <span>{rangeLabel || "0 - 0"}</span>
      </div>
    </div>
  );
}
