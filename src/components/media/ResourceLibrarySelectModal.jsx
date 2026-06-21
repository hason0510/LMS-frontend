import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Select, Spin, message } from "antd";
import { useTranslation } from "react-i18next";
import { getResourcePage } from "../../api/resource";
import ResourceRenderer from "./ResourceRenderer";
import { getDisplayFileType } from "../../utils/fileUtils";

const PAGE_SIZE = 24;
const ALL_TYPES = ["IMAGE", "VIDEO", "AUDIO", "PDF", "FILE", "LINK"];

const formatBytes = (value) => {
  if (!value) return "";
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  return `${Math.round(value / 1024)} KB`;
};

export default function ResourceLibrarySelectModal({
  open,
  onCancel,
  onSelect,
  mediaContext,
  title,
  allowedTypes = ALL_TYPES,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState();
  const [sortBy, setSortBy] = useState("date");
  const [pagination, setPagination] = useState({ currentPage: 1, totalPage: 1 });

  const typeOptions = useMemo(
    () =>
      ALL_TYPES.filter((item) => allowedTypes.includes(item)).map((item) => ({
        value: item,
        label: t(`mediaManager.types.${item}`),
      })),
    [allowedTypes, t]
  );

  const scopedParams =
    mediaContext?.scopeType && mediaContext?.scopeId
      ? {
          scopeType: mediaContext.scopeType,
          scopeId: mediaContext.scopeId,
        }
      : {};

  const loadResources = async (pageNumber = 1, append = false) => {
    const params = {
      pageNumber,
      pageSize: PAGE_SIZE,
      sortBy,
      status: "ACTIVE",
      ownerLibrary: true,
      includeCurrentScope: Boolean(scopedParams.scopeType && scopedParams.scopeId),
      ...scopedParams,
    };
    if (search.trim()) params.search = search.trim();
    if (type) params.type = type;

    const page = await getResourcePage(params);
    setPagination({
      currentPage: page.currentPage || pageNumber,
      totalPage: page.totalPage || pageNumber,
    });
    setResources((prev) => (append ? [...prev, ...page.items] : page.items));
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadResources(1, false)
      .catch(() => message.error(t("mediaManager.messages.loadFailed")))
      .finally(() => setLoading(false));
  }, [open, search, sortBy, type, mediaContext?.scopeType, mediaContext?.scopeId, t]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={980}
      destroyOnHidden
      title={title || t("mediaManager.pages.personal.title")}
      rootClassName="resource-library-select-modal"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input.Search
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("mediaManager.searchPlaceholder")}
          className="sm:max-w-xs"
          allowClear
        />
        <div className="flex gap-2">
          <Select
            allowClear
            value={type}
            onChange={setType}
            options={typeOptions}
            placeholder={t("mediaManager.filters.type")}
            className="w-40"
            showSearch
            optionFilterProp="label"
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            className="w-36"
            showSearch
            optionFilterProp="label"
            options={[
              { value: "date", label: t("mediaManager.sort.newest") },
              { value: "name", label: t("mediaManager.sort.name") },
              { value: "size", label: t("mediaManager.sort.size") },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : resources.length > 0 ? (
        <div className="max-h-[520px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <button
                key={resource.id}
                type="button"
                onClick={() => onSelect?.(resource)}
                className="group rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-sm dark:border-gray-700 dark:bg-slate-900 dark:hover:border-blue-500"
              >
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-md bg-gray-50 dark:bg-slate-800">
                  <ResourceRenderer resource={resource} compact thumbnail className="m-0 max-h-36" />
                </div>
                <div className="mt-2 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                  {resource.title || t("mediaManager.untitled")}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{getDisplayFileType(resource)}</span>
                  {resource.fileSize ? <span>{formatBytes(resource.fileSize)}</span> : null}
                </div>
              </button>
            ))}
          </div>
          {pagination.currentPage < pagination.totalPage ? (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => loadResources(pagination.currentPage + 1, true)}>
                {t("mediaManager.actions.loadMore")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {t("mediaManager.empty")}
        </div>
      )}
    </Modal>
  );
}
