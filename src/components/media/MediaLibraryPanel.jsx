import React, { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Drawer, Input, Select, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import {
  deleteResource,
  createStandaloneResource,
  getResourceAuditLogs,
  getResourcePage,
  getResourceReferences,
  getResourceUploadPolicy,
  updateResource,
  uploadStandaloneResource,
} from "../../api/resource";
import ResourceRenderer from "./ResourceRenderer";

const PAGE_SIZE = 24;

const RESOURCE_TYPES = ["IMAGE", "VIDEO", "AUDIO", "PDF", "FILE", "LINK"];
const RESOURCE_SCOPES = ["QUESTION_BANK", "CLASS_SECTION", "PRIVATE_USER", "INSTITUTION_SHARED"];

const getItems = (response) => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.pageList)) return payload.pageList;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const getMeta = (response, fallbackPage) => {
  const payload = response?.data ?? response;
  return {
    currentPage: payload?.currentPage || fallbackPage,
    totalPage: payload?.totalPage || fallbackPage,
    totalElements: payload?.totalElements || 0,
  };
};

const formatBytes = (value) => {
  if (!value) return "-";
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  return `${Math.round(value / 1024)} KB`;
};

export default function MediaLibraryPanel({
  title,
  subtitle,
  scopeType,
  scopeId,
  fixedScope = true,
  createdByMe = false,
  allowUpload = true,
  allowLinkCreate = false,
  governance = false,
}) {
  const { message } = App.useApp();
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState();
  const [sortBy, setSortBy] = useState("date");
  const [status, setStatus] = useState("ACTIVE");
  const [scopeFilter, setScopeFilter] = useState(scopeType);
  const [selected, setSelected] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [references, setReferences] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPage: 1, totalElements: 0 });
  const locale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const typeOptions = RESOURCE_TYPES.map((value) => ({ value, label: t(`mediaManager.types.${value}`) }));
  const scopeOptions = RESOURCE_SCOPES.map((value) => ({ value, label: t(`mediaManager.scopes.${value}`) }));
  const typeLabels = Object.fromEntries(typeOptions.map((item) => [item.value, item.label]));
  const scopeLabels = Object.fromEntries(scopeOptions.map((item) => [item.value, item.label]));

  const uploadParams = useMemo(() => {
    const params = {};
    if (scopeType) params.scopeType = scopeType;
    if (scopeId) params.scopeId = scopeId;
    return params;
  }, [scopeType, scopeId]);

  const queryParams = useMemo(() => {
    const params = {
      pageSize: PAGE_SIZE,
      sortBy,
    };
    const activeScope = fixedScope ? scopeType : scopeFilter;
    if (activeScope) params.scopeType = activeScope;
    if (fixedScope && scopeId) params.scopeId = scopeId;
    if (type) params.type = type;
    if (status) params.status = status;
    if (createdByMe) params.createdByMe = true;
    if (search.trim()) params.search = search.trim();
    return params;
  }, [createdByMe, fixedScope, scopeFilter, scopeId, scopeType, search, sortBy, status, type]);

  const loadResources = async (pageNumber = 1, append = false) => {
    setLoading(true);
    try {
      const response = await getResourcePage({ ...queryParams, pageNumber });
      const items = getItems(response);
      setResources((prev) => (append ? [...prev, ...items] : items));
      setPagination(getMeta(response, pageNumber));
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources(1, false);
  }, [queryParams]);

  useEffect(() => {
    getResourceUploadPolicy()
      .then((response) => setPolicy(response?.data ?? response))
      .catch(() => setPolicy(null));
  }, []);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadStandaloneResource(file, uploadParams);
      }
      message.success(t("mediaManager.messages.uploadSuccess"));
      await loadResources(1, false);
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleCreateLink = async () => {
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      message.warning(t("mediaManager.link.invalidUrl"));
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      message.warning(t("mediaManager.link.invalidUrl"));
      return;
    }

    setCreatingLink(true);
    try {
      const created = await createStandaloneResource({
        title: linkTitle.trim() || null,
        type: "LINK",
        source: "EMBED",
        embedUrl: trimmedUrl,
        ...uploadParams,
      });
      const item = created?.data ?? created;
      setResources((prev) => [item, ...prev]);
      setLinkTitle("");
      setLinkUrl("");
      message.success(t("mediaManager.link.success"));
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.link.failed"));
    } finally {
      setCreatingLink(false);
    }
  };

  const openDetails = async (resource) => {
    setSelected(resource);
    setEditTitle(resource?.title || "");
    setEditDescription(resource?.description || "");
    setReferences([]);
    setAuditLogs([]);
    if (!resource?.id) return;
    setDetailsLoading(true);
    try {
      const [referenceResponse, auditResponse] = await Promise.all([
        getResourceReferences(resource.id),
        getResourceAuditLogs(resource.id),
      ]);
      setReferences(getItems(referenceResponse));
      setAuditLogs(getItems(auditResponse));
    } catch (error) {
      message.warning(error?.response?.data?.message || t("mediaManager.messages.detailsFailed"));
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!selected?.id) return;
    try {
      const updated = await updateResource(selected.id, {
        title: editTitle.trim() || selected.title,
        description: editDescription,
      });
      const item = updated?.data ?? updated;
      setSelected(item);
      setResources((prev) => prev.map((resource) => (resource.id === item.id ? item : resource)));
      message.success(t("mediaManager.messages.updateSuccess"));
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.updateFailed"));
    }
  };

  const handleSetStatus = async (nextStatus) => {
    if (!selected?.id) return;
    try {
      const updated = await updateResource(selected.id, { status: nextStatus });
      const item = updated?.data ?? updated;
      setSelected(item);
      setResources((prev) => prev.filter((resource) => resource.id !== item.id));
      message.success(nextStatus === "ARCHIVED" ? t("mediaManager.messages.archiveSuccess") : t("mediaManager.messages.restoreSuccess"));
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.statusFailed"));
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    if (references.length > 0 || (selected.usageCount || 0) > 0) {
      message.warning(t("mediaManager.messages.deleteBlocked"));
      return;
    }
    try {
      await deleteResource(selected.id);
      setResources((prev) => prev.filter((resource) => resource.id !== selected.id));
      setSelected(null);
      message.success(t("mediaManager.messages.deleteSuccess"));
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.deleteFailed"));
    }
  };

  const totalSize = resources.reduce((sum, item) => sum + (item.fileSize || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          {policy?.maxSizeBytes ? (
            <p className="mt-2 text-xs text-slate-500">
              {t("mediaManager.uploadPolicy", {
                size: formatBytes(policy.maxSizeBytes),
                extensions: (policy.allowedExtensions || []).slice(0, 12).join(", "),
              })}
            </p>
          ) : null}
        </div>
        {allowUpload ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="primary" loading={uploading} onClick={() => fileInputRef.current?.click()}>
              {t("mediaManager.actions.upload")}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleUpload} />
          </div>
        ) : null}
      </div>

      {allowLinkCreate ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-800">{t("mediaManager.link.title")}</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              value={linkTitle}
              onChange={(event) => setLinkTitle(event.target.value)}
              placeholder={t("mediaManager.link.titlePlaceholder")}
            />
            <Input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder={t("mediaManager.link.urlPlaceholder")}
            />
          </div>
          <div className="mt-2 text-xs text-slate-500">{t("mediaManager.link.hint")}</div>
          <div className="mt-3 flex justify-end">
            <Button type="primary" loading={creatingLink} onClick={handleCreateLink}>
              {t("mediaManager.link.create")}
            </Button>
          </div>
        </div>
      ) : null}

      {governance ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase text-slate-500">{t("mediaManager.stats.currentResult")}</div>
            <div className="mt-1 text-2xl font-bold">{pagination.totalElements}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase text-slate-500">{t("mediaManager.stats.visibleSize")}</div>
            <div className="mt-1 text-2xl font-bold">{formatBytes(totalSize)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase text-slate-500">{t("mediaManager.stats.archivedInView")}</div>
            <div className="mt-1 text-2xl font-bold">{resources.filter((item) => item.status === "ARCHIVED").length}</div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center">
        <Input.Search
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("mediaManager.searchPlaceholder")}
          allowClear
          className="md:max-w-xs"
        />
        {!fixedScope ? (
          <Select
            allowClear
            placeholder={t("mediaManager.filters.scope")}
            value={scopeFilter}
            onChange={setScopeFilter}
            options={scopeOptions}
            className="w-full md:w-48"
          />
        ) : null}
        <Select allowClear placeholder={t("mediaManager.filters.type")} value={type} onChange={setType} options={typeOptions} className="w-full md:w-40" />
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { value: "ACTIVE", label: t("mediaManager.status.ACTIVE") },
            { value: "ARCHIVED", label: t("mediaManager.status.ARCHIVED") },
          ]}
          className="w-full md:w-40"
        />
        <Select
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: "date", label: t("mediaManager.sort.newest") },
            { value: "name", label: t("mediaManager.sort.name") },
            { value: "size", label: t("mediaManager.sort.size") },
          ]}
          className="w-full md:w-40"
        />
      </div>

      {loading && resources.length === 0 ? (
        <div className="flex justify-center py-16"><Spin /></div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {resources.map((resource) => (
            <button
              key={resource.id}
              type="button"
              onClick={() => openDetails(resource)}
              className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-sm"
            >
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-md bg-slate-50">
                <ResourceRenderer resource={resource} compact className="m-0 max-h-36" />
              </div>
              <div className="mt-3 truncate text-sm font-semibold text-slate-800">{resource.title || t("mediaManager.untitled")}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Tag>{typeLabels[resource.type] || resource.mimeType || t("mediaManager.types.FILE")}</Tag>
                <Tag>{formatBytes(resource.fileSize)}</Tag>
                {resource.scopeType ? <Tag color="blue">{scopeLabels[resource.scopeType] || resource.scopeType}</Tag> : null}
                {(resource.usageCount || 0) > 0 ? <Tag color="green">{t("mediaManager.usedCount", { count: resource.usageCount })}</Tag> : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          {t("mediaManager.empty")}
        </div>
      )}

      {pagination.currentPage < pagination.totalPage ? (
        <div className="flex justify-center">
          <Button loading={loading} onClick={() => loadResources(pagination.currentPage + 1, true)}>
            {t("mediaManager.actions.loadMore")}
          </Button>
        </div>
      ) : null}

      <Drawer open={!!selected} onClose={() => setSelected(null)} width={460} title={t("mediaManager.drawer.title")}>
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <ResourceRenderer resource={selected} />
            </div>
            <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder={t("mediaManager.fields.title")} />
            <Input.TextArea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder={t("mediaManager.fields.description")}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-slate-500">{t("mediaManager.fields.type")}</span><span>{typeLabels[selected.type] || selected.type || "-"}</span>
              <span className="text-slate-500">{t("mediaManager.fields.size")}</span><span>{formatBytes(selected.fileSize)}</span>
              <span className="text-slate-500">{t("mediaManager.fields.scope")}</span><span>{scopeLabels[selected.scopeType] || t("mediaManager.scopes.LEGACY")}</span>
              <span className="text-slate-500">{t("mediaManager.fields.owner")}</span><span>{selected.createdBy || "-"}</span>
              <span className="text-slate-500">{t("mediaManager.fields.status")}</span><span>{t(`mediaManager.status.${selected.status || "ACTIVE"}`)}</span>
              <span className="text-slate-500">{t("mediaManager.fields.usageCount")}</span><span>{selected.usageCount || references.length || 0}</span>
              <span className="text-slate-500">{t("mediaManager.fields.lastUsedAt")}</span><span>{selected.lastUsedAt ? new Date(selected.lastUsedAt).toLocaleString(locale) : "-"}</span>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-800">{t("mediaManager.references.title")}</div>
              {detailsLoading ? (
                <Spin size="small" />
              ) : references.length > 0 ? (
                <div className="space-y-2">
                  {references.map((item, index) => (
                    <div key={`${item.entityType}-${item.entityId}-${index}`} className="text-sm text-slate-600">
                      {t(`mediaManager.referenceTypes.${item.entityType}`, { id: item.entityId })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">{t("mediaManager.references.empty")}</div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-sm font-semibold text-slate-800">{t("mediaManager.audit.title")}</div>
              {detailsLoading ? (
                <Spin size="small" />
              ) : auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {auditLogs.map((item) => (
                    <div key={item.id} className="text-sm text-slate-600">
                      <span className="font-medium text-slate-800">{t(`mediaManager.auditActions.${item.actionType}`, item.actionType)}</span>
                      {item.actorUsername ? t("mediaManager.audit.byActor", { actor: item.actorUsername }) : ""}
                      {item.createdDate ? ` · ${new Date(item.createdDate).toLocaleDateString(locale)}` : ""}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">{t("mediaManager.audit.empty")}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="primary" onClick={handleSaveMetadata}>{t("mediaManager.actions.save")}</Button>
              {selected.status === "ARCHIVED" ? (
                <Button onClick={() => handleSetStatus("ACTIVE")}>{t("mediaManager.actions.restore")}</Button>
              ) : (
                <Button onClick={() => handleSetStatus("ARCHIVED")}>{t("mediaManager.actions.archive")}</Button>
              )}
              {governance ? <Button danger onClick={handleDelete}>{t("mediaManager.actions.delete")}</Button> : null}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
