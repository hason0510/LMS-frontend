import React, { useEffect, useState } from "react";
import { Empty, Spin, Tag } from "antd";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import ReportSectionCard from "./ReportSectionCard";
import DataPaginationFooter from "../common/DataPaginationFooter";
import UserIdentity from "../common/UserIdentity";
import { unwrapPageData } from "../../utils/reporting";

const EMPTY_PAGE = { items: [], totalPage: 1, totalElements: 0, currentPage: 1 };

/**
 * Danh sách trợ giảng (TA) + các lớp đang hỗ trợ, có tìm kiếm (tên/email/lớp) + phân trang server-side.
 * fetcher: async ({ search, page, size }) => PageResponse<AssistantClassesItem>
 */
export default function AssistantListSection({
  fetcher,
  title = "Danh sách Trợ giảng (TA)",
  subtitle = "Trợ giảng và các lớp đang hỗ trợ — tìm kiếm theo tên, email hoặc lớp",
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(EMPTY_PAGE);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, size]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.resolve(fetcher({ search: debounced, page, size }))
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
  }, [fetcher, debounced, page, size]);

  const rows = data.items || [];

  return (
    <ReportSectionCard
      title={
        <span className="!flex !items-center !gap-2">
          {title}
          <span className="!rounded-full !bg-slate-100 !px-2.5 !py-0.5 !text-xs !font-bold !text-slate-500 dark:!bg-slate-800 dark:!text-slate-300">
            {data.totalElements}
          </span>
        </span>
      }
      subtitle={subtitle}
      actions={
        <div className="!relative !w-full md:!w-72">
          <MagnifyingGlassIcon className="!pointer-events-none !absolute !left-3 !top-1/2 !h-4 !w-4 !-translate-y-1/2 !text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email hoặc lớp..."
            className="!w-full !rounded-xl !border !border-slate-200 !bg-slate-50 !py-2 !pl-9 !pr-3 !text-sm !text-slate-700 !outline-none focus:!border-blue-400 dark:!border-slate-700 dark:!bg-slate-800 dark:!text-white"
          />
        </div>
      }
    >
      <div className="!overflow-x-auto">
        <table className="!w-full !border-collapse !text-sm">
          <thead>
            <tr className="!border-b-2 !border-slate-200 dark:!border-slate-700">
              <th className="!px-3 !py-2.5 !text-left !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-500" style={{ width: "38%" }}>
                Trợ giảng
              </th>
              <th className="!px-3 !py-2.5 !text-left !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-500">
                Lớp đang hỗ trợ
              </th>
              <th className="!px-3 !py-2.5 !text-center !text-[11px] !font-bold !uppercase !tracking-wider !text-slate-500">
                Số lớp
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="!py-12 !text-center">
                  <Spin />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="!py-12 !text-center">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy trợ giảng nào" />
                </td>
              </tr>
            ) : (
              rows.map((ta) => (
                <tr
                  key={ta.userId}
                  className="!border-b !border-slate-100 last:!border-0 hover:!bg-slate-50 dark:!border-slate-800 dark:hover:!bg-slate-800/50"
                >
                  <td className="!px-3 !py-3">
                    <UserIdentity
                      user={{ fullName: ta.fullName, gmail: ta.email, imageUrl: ta.avatarUrl }}
                      avatarSizeClass="size-9"
                    />
                  </td>
                  <td className="!px-3 !py-3">
                    <div className="!flex !flex-wrap !gap-1.5">
                      {(ta.classes || []).length === 0 ? (
                        <span className="!text-xs !text-slate-400">—</span>
                      ) : (
                        (ta.classes || []).map((c) => (
                          <Tag key={c.classSectionId} color="blue" className="!m-0 !text-sm !font-semibold">
                            {c.title || c.classCode}
                          </Tag>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="!px-3 !py-3 !text-center !font-bold !text-slate-700 dark:!text-slate-200">
                    {(ta.classes || []).length}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="!-mx-4 !-mb-4 !mt-4 !overflow-hidden !rounded-b-2xl sm:!-mx-5 sm:!-mb-5">
        <DataPaginationFooter
          currentPage={data.currentPage}
          pageSize={size}
          total={data.totalElements}
          pageSizeOptions={[10, 25, 50]}
          totalLabel={`Tổng: ${data.totalElements} trợ giảng`}
          pageSizeLabel="Dòng/trang"
          onPageChange={setPage}
          onPageSizeChange={setSize}
        />
      </div>
    </ReportSectionCard>
  );
}
