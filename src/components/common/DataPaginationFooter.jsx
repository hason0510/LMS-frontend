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

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="font-semibold text-slate-700 dark:text-slate-200">
        {totalLabel || `Total: ${safeTotal}`}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span>{pageSizeLabel || "Rows per page"}</span>
          <Select
            value={pageSize}
            onChange={(value) => onPageSizeChange?.(value)}
            options={pageSizeOptions.map((value) => ({ value, label: value }))}
            showSearch
            optionFilterProp="label"
            className="w-24"
          />
        </div>
        <div className="font-semibold text-slate-700 dark:text-slate-200">
          {rangeLabel || `${start} - ${end}`}
        </div>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={safeTotal}
          onChange={(page) => onPageChange?.(page)}
          showSizeChanger={false}
          size="small"
        />
      </div>
    </div>
  );
}
