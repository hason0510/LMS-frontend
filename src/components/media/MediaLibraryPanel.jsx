import React, { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Checkbox, Input, Select, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import {
  createStandaloneResource,
  deleteResource,
  getResourceAuditLogs,
  getResourceById,
  getResourcePage,
  getResourceReferences,
  getResourceUploadPolicy,
  updateResource,
  uploadStandaloneResource,
} from "../../api/resource";
import { getQuestionBanks } from "../../api/questionBank";
import { getMyTeachingClasses } from "../../api/teaching";
import { getClassSections } from "../../api/classSection";
import { getTemplates } from "../../api/curriculumTemplate";
import { useAuth } from "../../contexts/AuthContext";
import DataPaginationFooter from "../common/DataPaginationFooter";
import MediaDetailModal from "./MediaDetailModal";
import ResourceRenderer from "./ResourceRenderer";
import { getDisplayFileType } from "../../utils/fileUtils";

const DEFAULT_PAGE_SIZE = 24;
const PAGE_SIZE_OPTIONS = [12, 24, 48];
const RESOURCE_TYPES = ["IMAGE", "VIDEO", "AUDIO", "PDF", "FILE", "LINK"];
const RESOURCE_SCOPES = ["QUESTION_BANK", "CLASS_SECTION", "CURRICULUM_TEMPLATE", "PRIVATE_USER", "INSTITUTION_SHARED"];
const SCOPES_WITH_TARGET = ["CLASS_SECTION", "QUESTION_BANK", "CURRICULUM_TEMPLATE"];
const ALL_TARGET = "__ALL__";
const RESOURCE_VISIBILITY = ["PRIVATE", "SHARED", "INSTITUTION"];

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
  ownerLibrary = false,
  includeCurrentScope = false,
  allowUpload = true,
  allowLinkCreate = false,
  governance = false,
  showInstitutionScope = false,
}) {
  const { message, modal } = App.useApp();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState();
  const [sortBy, setSortBy] = useState("date");
  const [status, setStatus] = useState("ACTIVE");
  const [hideSubmissions, setHideSubmissions] = useState(governance);
  const [scopeFilter, setScopeFilter] = useState(scopeType);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [scopeTargetFilter, setScopeTargetFilter] = useState();
  const [classScopeOptions, setClassScopeOptions] = useState([]);
  const [questionBankScopeOptions, setQuestionBankScopeOptions] = useState([]);
  const [templateScopeOptions, setTemplateScopeOptions] = useState([]);
  const [scopeTargetLoading, setScopeTargetLoading] = useState(false);
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
  const allScopeOptions = RESOURCE_SCOPES.map((value) => ({ value, label: t(`mediaManager.scopes.${value}`) }));
  const scopeOptions = allScopeOptions.filter((item) => showInstitutionScope || item.value !== "INSTITUTION_SHARED");
  const typeLabels = Object.fromEntries(typeOptions.map((item) => [item.value, item.label]));
  const scopeLabels = Object.fromEntries(allScopeOptions.map((item) => [item.value, item.label]));
  const visibilityLabels = Object.fromEntries(
    RESOURCE_VISIBILITY.map((value) => [value, t(`mediaManager.visibility.${value}`)]),
  );
  // Quyền quản lý lấy thẳng từ backend (admin / người tạo / OWNER-EDITOR của bank chứa tài nguyên).
  // Fallback theo admin/người tạo để không vỡ nếu response cũ chưa có cờ canManage.
  const isAdmin = user?.role === "ADMIN";
  const currentUsername = user?.username || user?.userName || "";
  const canManageSelected = Boolean(
    selected && (selected.canManage ?? (isAdmin || selected.createdBy === currentUsername))
  );
  const isSelectedInUse = Boolean((selected?.usageCount || 0) > 0 || references.length > 0);
  const canDeleteSelected = canManageSelected && !isSelectedInUse;
  const startItem = pagination.totalElements === 0 ? 0 : (pagination.currentPage - 1) * pageSize + 1;
  const endItem = Math.min(pagination.currentPage * pageSize, pagination.totalElements);
  const totalSize = resources.reduce((sum, item) => sum + (item.fileSize || 0), 0);
  const hasScopeTargetDropdown = !fixedScope && SCOPES_WITH_TARGET.includes(scopeFilter);
  const effectiveScopeTarget = hasScopeTargetDropdown ? (scopeTargetFilter ?? ALL_TARGET) : undefined;
  const isSpecificTarget = hasScopeTargetDropdown && effectiveScopeTarget !== ALL_TARGET;
  const activeScopeTargetOptions = useMemo(() => {
    const specifics = scopeFilter === "CLASS_SECTION"
      ? classScopeOptions
      : scopeFilter === "QUESTION_BANK"
        ? questionBankScopeOptions
        : scopeFilter === "CURRICULUM_TEMPLATE"
          ? templateScopeOptions
          : [];
    const allLabel = scopeFilter === "CLASS_SECTION"
      ? t("mediaManager.filters.allClasses")
      : scopeFilter === "QUESTION_BANK"
        ? t("mediaManager.filters.allBanks")
        : t("mediaManager.filters.allTemplates");
    return [{ value: ALL_TARGET, label: allLabel }, ...specifics];
  }, [scopeFilter, classScopeOptions, questionBankScopeOptions, templateScopeOptions, t]);

  const uploadParams = useMemo(() => {
    const params = {};
    if (fixedScope) {
      if (scopeType) params.scopeType = scopeType;
      if (scopeId) params.scopeId = scopeId;
      return params;
    }
    if (!scopeFilter || scopeFilter === "PRIVATE_USER") {
      return params;
    }
    if (scopeFilter === "INSTITUTION_SHARED") {
      params.scopeType = scopeFilter;
      return params;
    }
    if (hasScopeTargetDropdown && isSpecificTarget) {
      params.scopeType = scopeFilter;
      params.scopeId = scopeTargetFilter;
    }
    return params;
  }, [fixedScope, hasScopeTargetDropdown, isSpecificTarget, scopeFilter, scopeId, scopeTargetFilter, scopeType]);

  const queryParams = useMemo(() => {
    const params = {
      pageSize,
      sortBy,
    };
    if (!fixedScope && hasScopeTargetDropdown) {
      if (scopeFilter === "CLASS_SECTION") {
        if (isSpecificTarget) params.usedInClassId = scopeTargetFilter;
        else params.usedInAnyClass = true;
      } else {
        params.scopeType = scopeFilter;
        if (isSpecificTarget) params.scopeId = scopeTargetFilter;
      }
    } else {
      const activeScope = fixedScope ? scopeType : scopeFilter;
      if (activeScope) params.scopeType = activeScope;
      if (fixedScope && scopeId) params.scopeId = scopeId;
    }
    if (type) params.type = type;
    if (status === "ALL") params.allStatuses = true;
    else if (status) params.status = status;
    if (createdByMe) params.createdByMe = true;
    if (ownerLibrary) params.ownerLibrary = true;
    if (includeCurrentScope) params.includeCurrentScope = true;
    if (governance && ownerFilter.trim()) params.owner = ownerFilter.trim();
    if (governance && hideSubmissions) params.excludeSubmissions = true;
    if (search.trim()) params.search = search.trim();
    return params;
  }, [
    createdByMe,
    fixedScope,
    governance,
    hasScopeTargetDropdown,
    hideSubmissions,
    includeCurrentScope,
    isSpecificTarget,
    ownerFilter,
    ownerLibrary,
    pageSize,
    scopeFilter,
    scopeId,
    scopeTargetFilter,
    scopeType,
    search,
    sortBy,
    status,
    type,
  ]);

  const formatScopeDisplay = (resource) => {
    const scopeLabel = resource?.scopeType
      ? scopeLabels[resource.scopeType] || resource.scopeType
      : t("mediaManager.scopes.LEGACY");

    if (!resource?.scopeType) {
      return scopeLabel;
    }
    if (resource.scopeTargetName) {
      return `${scopeLabel} · ${resource.scopeTargetName}`;
    }
    if (
      resource.scopeId &&
      (resource.scopeType === "CLASS_SECTION" || resource.scopeType === "QUESTION_BANK")
    ) {
      return `${scopeLabel} #${resource.scopeId}`;
    }
    return scopeLabel;
  };

  const formatScopeTarget = (resource) => {
    if (!resource?.scopeType) {
      return t("mediaManager.detail.empty");
    }
    if (resource.scopeTargetName) {
      return resource.scopeTargetName;
    }
    if (
      resource.scopeId &&
      (resource.scopeType === "CLASS_SECTION" || resource.scopeType === "QUESTION_BANK")
    ) {
      return `#${resource.scopeId}`;
    }
    return t("mediaManager.detail.notApplicable");
  };

  const formatSourceLabel = (source) => (source ? t(`mediaManager.sources.${source}`, source) : "-");

  const loadResources = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const page = await getResourcePage({ ...queryParams, pageNumber });
      setResources(page.items || []);
      setPagination({
        currentPage: page.currentPage || pageNumber,
        totalPage: page.totalPage || pageNumber,
        totalElements: page.totalElements || 0,
      });
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources(1);
  }, [queryParams]);

  useEffect(() => {
    if (!fixedScope) {
      setScopeTargetFilter(SCOPES_WITH_TARGET.includes(scopeFilter) ? ALL_TARGET : undefined);
    }
  }, [fixedScope, scopeFilter]);

  useEffect(() => {
    if (fixedScope) {
      return;
    }
    if (scopeFilter === "CLASS_SECTION" && classScopeOptions.length === 0) {
      setScopeTargetLoading(true);
      (isAdmin ? getClassSections() : getMyTeachingClasses())
        .then((response) => {
          const items = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
          setClassScopeOptions(
            items
              .filter((item) => item?.id)
              .map((item) => ({
                value: item.id,
                label: item.title || item.classCode || `#${item.id}`,
              })),
          );
        })
        .catch(() => {
          setClassScopeOptions([]);
        })
        .finally(() => setScopeTargetLoading(false));
    }
    if (scopeFilter === "QUESTION_BANK" && questionBankScopeOptions.length === 0) {
      setScopeTargetLoading(true);
      getQuestionBanks()
        .then((items) => {
          setQuestionBankScopeOptions(
            (Array.isArray(items) ? items : [])
              .filter((item) => item?.id)
              .map((item) => ({
                value: item.id,
                label: item.subjectTitle ? `${item.name} · ${item.subjectTitle}` : item.name || `#${item.id}`,
              })),
          );
        })
        .catch(() => {
          setQuestionBankScopeOptions([]);
        })
        .finally(() => setScopeTargetLoading(false));
    }
    if (scopeFilter === "CURRICULUM_TEMPLATE" && templateScopeOptions.length === 0) {
      setScopeTargetLoading(true);
      getTemplates()
        .then((items) => {
          const list = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : [];
          setTemplateScopeOptions(
            list
              .filter((item) => item?.id)
              .map((item) => ({
                value: item.id,
                label: item.name || item.title || `#${item.id}`,
              })),
          );
        })
        .catch(() => {
          setTemplateScopeOptions([]);
        })
        .finally(() => setScopeTargetLoading(false));
    }
  }, [classScopeOptions.length, fixedScope, isAdmin, questionBankScopeOptions.length, templateScopeOptions.length, scopeFilter]);

  useEffect(() => {
    getResourceUploadPolicy()
      .then((response) => setPolicy(response))
      .catch(() => setPolicy(null));
  }, []);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (hasScopeTargetDropdown && !isSpecificTarget) {
      message.warning(t("mediaManager.messages.scopeTargetRequired"));
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        await uploadStandaloneResource(file, uploadParams);
      }
      message.success(t("mediaManager.messages.uploadSuccess"));
      await loadResources(1);
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
    if (hasScopeTargetDropdown && !isSpecificTarget) {
      message.warning(t("mediaManager.messages.scopeTargetRequired"));
      return;
    }

    setCreatingLink(true);
    try {
      await createStandaloneResource({
        title: linkTitle.trim() || null,
        type: "LINK",
        source: "LINK",
        fileUrl: trimmedUrl,
        ...uploadParams,
      });
      setLinkTitle("");
      setLinkUrl("");
      message.success(t("mediaManager.link.success"));
      await loadResources(1);
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
      const [resourceResponse, referenceResponse, auditResponse] = await Promise.all([
        getResourceById(resource.id),
        getResourceReferences(resource.id),
        getResourceAuditLogs(resource.id),
      ]);
      setSelected(resourceResponse);
      setEditTitle(resourceResponse?.title || "");
      setEditDescription(resourceResponse?.description || "");
      setReferences(referenceResponse);
      setAuditLogs(auditResponse);
    } catch (error) {
      message.warning(error?.response?.data?.message || t("mediaManager.messages.detailsFailed"));
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!selected?.id || !canManageSelected) return;
    try {
      const item = await updateResource(selected.id, {
        title: editTitle.trim() || selected.title,
        description: editDescription,
      });
      setSelected(item);
      setResources((prev) => prev.map((resource) => (resource.id === item.id ? item : resource)));
      message.success(t("mediaManager.messages.updateSuccess"));
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.updateFailed"));
    }
  };

  const reloadCurrentPageAfterMutation = async () => {
    const targetPage = resources.length === 1 && pagination.currentPage > 1
      ? pagination.currentPage - 1
      : pagination.currentPage;
    await loadResources(targetPage);
  };

  const handleSetStatus = async (nextStatus) => {
    if (!selected?.id || !canManageSelected) return;
    try {
      await updateResource(selected.id, { status: nextStatus });
      setSelected(null);
      await reloadCurrentPageAfterMutation();
      message.success(nextStatus === "ARCHIVED" ? t("mediaManager.messages.archiveSuccess") : t("mediaManager.messages.restoreSuccess"));
    } catch (error) {
      message.error(error?.response?.data?.message || t("mediaManager.messages.statusFailed"));
    }
  };

  const handleDelete = async () => {
    if (!selected?.id || !canManageSelected) return;
    if (!canDeleteSelected) {
      message.warning(t("mediaManager.messages.deleteBlocked"));
      return;
    }
    modal.confirm({
      title: t("mediaManager.messages.deleteConfirm"),
      okText: t("mediaManager.actions.delete"),
      cancelText: t("common.huy"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteResource(selected.id);
          setSelected(null);
          await reloadCurrentPageAfterMutation();
          message.success(t("mediaManager.messages.deleteSuccess"));
        } catch (error) {
          message.error(error?.response?.data?.message || t("mediaManager.messages.deleteFailed"));
          throw error;
        }
      },
    });
  };

  return (
    <div className="media-library-panel space-y-5 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-700 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          {policy?.maxSizeBytes ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">{t("mediaManager.link.title")}</div>
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
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("mediaManager.link.hint")}</div>
          <div className="mt-3 flex justify-end">
            <Button type="primary" loading={creatingLink} onClick={handleCreateLink}>
              {t("mediaManager.link.create")}
            </Button>
          </div>
        </div>
      ) : null}

      {governance ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("mediaManager.stats.currentResult")}</div>
            <div className="mt-1 text-2xl font-bold">{pagination.totalElements}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("mediaManager.stats.visibleSize")}</div>
            <div className="mt-1 text-2xl font-bold">{formatBytes(totalSize)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("mediaManager.stats.archivedInView")}</div>
            <div className="mt-1 text-2xl font-bold">{resources.filter((item) => item.status === "ARCHIVED").length}</div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:flex-row md:flex-wrap md:items-center">
        <Input.Search
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("mediaManager.searchPlaceholder")}
          allowClear
          className="w-full md:w-64 md:flex-shrink-0"
        />
        {governance ? (
          <div className="w-[250px] min-w-[250px] flex-shrink-0">
            <Input
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              placeholder={t("mediaManager.filters.owner")}
              allowClear
              className="w-full"
            />
          </div>
        ) : null}
        {!fixedScope ? (
          <Select
            allowClear
            placeholder={t("mediaManager.filters.scope")}
            value={scopeFilter}
            onChange={setScopeFilter}
            options={scopeOptions}
            className="w-full md:w-auto"
            style={{ minWidth: 260, maxWidth: 260 }}
            showSearch
            optionFilterProp="label"
          />
        ) : null}
        {hasScopeTargetDropdown ? (
          <Select
            showSearch
            loading={scopeTargetLoading}
            placeholder={
              scopeFilter === "CLASS_SECTION"
                ? t("mediaManager.filters.scopeTargetClass")
                : scopeFilter === "QUESTION_BANK"
                  ? t("mediaManager.filters.scopeTargetQuestionBank")
                  : t("mediaManager.filters.scopeTargetTemplate")
            }
            value={effectiveScopeTarget}
            onChange={(value) => setScopeTargetFilter(value ?? ALL_TARGET)}
            options={activeScopeTargetOptions}
            className="w-full md:w-auto"
            style={{ minWidth: 260, maxWidth: 260 }}
            optionFilterProp="label"
            notFoundContent={
              scopeTargetLoading ? (
                <div className="py-2 text-center">
                  <Spin size="small" />
                </div>
              ) : undefined
            }
          />
        ) : null}
        <Select
          allowClear
          placeholder={t("mediaManager.filters.type")}
          value={type}
          onChange={setType}
          options={typeOptions}
          className="w-full md:w-auto"
          style={{ minWidth: 150, maxWidth: 150 }}
          showSearch
          optionFilterProp="label"
        />
        <Select
          value={status}
          onChange={setStatus}
          showSearch
          optionFilterProp="label"
          options={[
            { value: "ALL", label: t("mediaManager.status.all") },
            { value: "ACTIVE", label: t("mediaManager.status.ACTIVE") },
            { value: "ARCHIVED", label: t("mediaManager.status.ARCHIVED") },
          ]}
          className="w-full md:w-auto"
          style={{ minWidth: 200, maxWidth: 200 }}
        />
        <Select
          value={sortBy}
          onChange={setSortBy}
          showSearch
          optionFilterProp="label"
          options={[
            { value: "date", label: t("mediaManager.sort.newest") },
            { value: "name", label: t("mediaManager.sort.name") },
            { value: "size", label: t("mediaManager.sort.size") },
          ]}
          className="w-full md:w-auto"
          style={{ minWidth: 150, maxWidth: 150 }}
        />
        {governance ? (
          <Checkbox
            checked={hideSubmissions}
            onChange={(event) => setHideSubmissions(event.target.checked)}
            className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300"
          >
            {t("mediaManager.filters.hideSubmissions")}
          </Checkbox>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {loading && resources.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : resources.length > 0 ? (
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {resources.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => openDetails(resource)}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition hover:border-blue-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500"
                >
                  <div className="flex min-h-[220px] items-center justify-center overflow-hidden bg-slate-50 p-3 dark:bg-slate-900">
                    <ResourceRenderer resource={resource} compact thumbnail className="m-0 h-full w-full" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800 dark:text-white">
                      {resource.title || t("mediaManager.untitled")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Tag>{getDisplayFileType(resource)}</Tag>
                      <Tag>{formatBytes(resource.fileSize)}</Tag>
                      <Tag color="blue">{formatScopeDisplay(resource)}</Tag>

                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span
                        className="truncate"
                        title={
                          resource.createdByName
                            ? `${resource.createdByName} (${resource.createdBy})`
                            : resource.createdBy || "-"
                        }
                      >
                        {resource.createdByName || resource.createdBy || "-"}
                      </span>
                      <span className="whitespace-nowrap">
                        {(resource.usageCount || 0) > 0 ? t("mediaManager.usedCount", { count: resource.usageCount }) : t("mediaManager.unused")}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            {!fixedScope && scopeFilter === "CLASS_SECTION" && isSpecificTarget
              ? t("mediaManager.emptyStates.usedInClass")
              : t("mediaManager.empty")}
          </div>
        )}

        <DataPaginationFooter
          currentPage={pagination.currentPage}
          pageSize={pageSize}
          total={pagination.totalElements}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          totalLabel={t("mediaManager.pagination.total", { count: pagination.totalElements })}
          pageSizeLabel={t("mediaManager.pagination.pageSize")}
          rangeLabel={t("mediaManager.pagination.range", {
            start: startItem,
            end: endItem,
            total: pagination.totalElements,
          })}
          onPageChange={(page) => loadResources(page)}
          onPageSizeChange={(value) => setPageSize(value)}
        />
      </div>

      <MediaDetailModal
        open={!!selected}
        resource={selected}
        editTitle={editTitle}
        editDescription={editDescription}
        onClose={() => setSelected(null)}
        onEditTitleChange={setEditTitle}
        onEditDescriptionChange={setEditDescription}
        onSave={handleSaveMetadata}
        onToggleStatus={handleSetStatus}
        onDelete={handleDelete}
        canManage={canManageSelected}
        canDelete={canDeleteSelected}
        detailsLoading={detailsLoading}
        references={references}
        auditLogs={auditLogs}
        locale={locale}
        typeLabels={typeLabels}
        visibilityLabels={visibilityLabels}
        formatBytes={formatBytes}
        formatScopeDisplay={formatScopeDisplay}
        formatScopeTarget={formatScopeTarget}
        formatSourceLabel={formatSourceLabel}
      />
    </div>
  );
}
