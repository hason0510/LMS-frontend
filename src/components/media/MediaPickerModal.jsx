import React, { useDeferredValue, useEffect, useRef, useState } from "react";
import { Button, Input, Modal, Select, Spin, message } from "antd";
import { useTranslation } from "react-i18next";
import {
  createStandaloneResource,
  getResourcePage,
  getResourceUploadPolicy,
  uploadStandaloneResource,
} from "../../api/resource";
import ResourceRenderer from "./ResourceRenderer";
import { getDisplayFileType } from "../../utils/fileUtils";

const TYPE_ACCEPT = {
  IMAGE: "image/*",
  VIDEO: "video/*",
  AUDIO: "audio/*,.mp3",
};

const POLICY_TYPE = {
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
};

const PAGE_SIZE = 24;

const normalizeUploadResponse = (response) => {
  const payload = response ?? {};
  const id = payload.resourceId ?? payload.id;
  return {
    id,
    title: payload.title,
    fileUrl: payload.fileUrl || payload.url,
    hlsUrl: payload.hlsUrl,
    mimeType: payload.mimeType,
    fileType: payload.fileType,
    fileSize: payload.fileSize,
    type: payload.type,
    source: "UPLOAD",
  };
};

const getExtension = (fileName = "") => {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
};

const formatBytes = (value) => {
  if (!value) return "";
  if (value >= 1024 * 1024) return `${Math.round(value / (1024 * 1024))} MB`;
  return `${Math.round(value / 1024)} KB`;
};

const createDraftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createDraftFileResource = (file, mediaType, scopedParams) => {
  const objectUrl = URL.createObjectURL(file);
  return {
    id: null,
    title: file.name,
    fileUrl: objectUrl,
    mimeType: file.type,
    fileType: getExtension(file.name).toUpperCase() || mediaType,
    fileSize: file.size,
    type: mediaType,
    source: "UPLOAD",
    scopeType: scopedParams.scopeType || null,
    scopeId: scopedParams.scopeId || null,
    __draftMedia: {
      draftId: createDraftId(),
      kind: "file",
      file,
      objectUrl,
      mediaType,
      scopedParams,
    },
  };
};

const createDraftUrlResource = (payload, scopedParams) => ({
  id: null,
  title: payload.title,
  type: payload.type,
  source: payload.source,
  fileUrl: payload.fileUrl || null,
  embedUrl: payload.embedUrl || null,
  scopeType: scopedParams.scopeType || null,
  scopeId: scopedParams.scopeId || null,
  __draftMedia: {
    draftId: createDraftId(),
    kind: "url",
    payload,
    scopedParams,
  },
});

const extractYoutubeId = (url = "") => {
  const direct = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return direct?.[1] || null;
};

const extractVimeoId = (url = "") => {
  const direct = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return direct?.[1] || null;
};

export default function MediaPickerModal({
  open,
  mediaType = "IMAGE",
  allowedTypes,
  mediaContext,
  deferUpload = false,
  onCancel,
  onSelect,
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [pagination, setPagination] = useState({ currentPage: 1, totalPage: 1, totalElements: 0 });
  const [uploadPolicy, setUploadPolicy] = useState(null);
  const [url, setUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [videoSource, setVideoSource] = useState("MP4");

  const acceptedTypes = allowedTypes?.length ? allowedTypes : [mediaType];
  const accept = acceptedTypes.map((type) => TYPE_ACCEPT[type]).filter(Boolean).join(",");
  const deferredSearch = useDeferredValue(search);
  const activePolicyType = POLICY_TYPE[acceptedTypes[0]] || "resource";
  const policyExtensions =
    uploadPolicy?.allowedExtensionsByType?.[activePolicyType] || uploadPolicy?.allowedExtensions || [];
  const policyMaxSize =
    uploadPolicy?.maxSizeBytesByType?.[activePolicyType] || uploadPolicy?.maxSizeBytes;
  const scopedParams = mediaContext?.scopeType && mediaContext?.scopeId
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
      ownerLibrary: true,
      includeCurrentScope: Boolean(scopedParams.scopeType && scopedParams.scopeId),
      ...scopedParams,
    };
    if (acceptedTypes.length === 1) {
      params.type = acceptedTypes[0];
    }
    if (deferredSearch.trim()) {
      params.search = deferredSearch.trim();
    }

    const page = await getResourcePage(params);
    setPagination({
      currentPage: page.currentPage || pageNumber,
      totalPage: page.totalPage || pageNumber,
      totalElements: page.totalElements || 0,
    });
    setResources((prev) => (append ? [...prev, ...page.items] : page.items));
  };

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    loadResources(1, false)
      .catch(() => message.error(t("quizMedia.loadFailed")))
      .finally(() => setLoading(false));
  }, [open, deferredSearch, sortBy, mediaType, mediaContext?.scopeType, mediaContext?.scopeId, t]);

  useEffect(() => {
    if (!open) return;
    getResourceUploadPolicy()
      .then((policy) => setUploadPolicy(policy))
      .catch(() => setUploadPolicy(null));
  }, [open]);

  const validateUploadFile = (file) => {
    const extension = getExtension(file.name);
    if (policyExtensions.length && !policyExtensions.includes(extension)) {
      message.error(t("quizMedia.invalidFileType"));
      return false;
    }
    if (policyMaxSize && file.size > policyMaxSize) {
      message.error(t("quizMedia.fileTooLarge", { size: formatBytes(policyMaxSize) }));
      return false;
    }
    return true;
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!validateUploadFile(file)) return;

    if (deferUpload) {
      onSelect(createDraftFileResource(file, acceptedTypes[0], scopedParams));
      message.success(t("quizMedia.attachSuccess"));
      return;
    }

    setUploading(true);
    try {
      const uploaded = normalizeUploadResponse(await uploadStandaloneResource(file, scopedParams));
      setResources((prev) => [uploaded, ...prev]);
      onSelect(uploaded);
      message.success(t("quizMedia.uploadSuccess"));
    } catch {
      message.error(t("quizMedia.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const createPayloadFromUrl = () => {
    const trimmed = String(url || "").trim();
    if (!trimmed) return null;

    const payload = {
      title: customTitle?.trim() || null,
      type: mediaType,
      source: "LINK",
      fileUrl: trimmed,
      ...scopedParams,
    };

    if (mediaType !== "VIDEO") return payload;

    if (videoSource === "YOUTUBE") {
      const videoId = extractYoutubeId(trimmed);
      if (!videoId) return null;
      return {
        title: customTitle?.trim() || null,
        type: "VIDEO",
        source: "EMBED",
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        ...scopedParams,
      };
    }

    if (videoSource === "VIMEO") {
      const videoId = extractVimeoId(trimmed);
      if (!videoId) return null;
      return {
        title: customTitle?.trim() || null,
        type: "VIDEO",
        source: "EMBED",
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        ...scopedParams,
      };
    }

    if (videoSource === "EMBED") {
      return {
        title: customTitle?.trim() || null,
        type: "VIDEO",
        source: "EMBED",
        embedUrl: trimmed,
        ...scopedParams,
      };
    }

    return payload;
  };

  const handleAttachByUrl = async () => {
    const payload = createPayloadFromUrl();
    if (!payload) {
      message.warning(t("quizMedia.invalidUrl"));
      return;
    }

    if (deferUpload) {
      onSelect(createDraftUrlResource(payload, scopedParams));
      message.success(t("quizMedia.attachSuccess"));
      return;
    }

    setCreatingLink(true);
    try {
      const item = await createStandaloneResource(payload);
      setResources((prev) => [item, ...prev]);
      onSelect(item);
      message.success(t("quizMedia.attachSuccess"));
    } catch {
      message.error(t("quizMedia.attachFailed"));
    } finally {
      setCreatingLink(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={920}
      title={t("quizMedia.mediaGallery")}
      destroyOnHidden
      rootClassName="media-picker-modal"
    >
      <div
        className="mb-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center hover:border-blue-400 dark:border-gray-700 dark:bg-slate-900 dark:hover:border-blue-500"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Spin />
        ) : (
          <>
            <div className="text-base font-semibold text-gray-800 dark:text-white">{t("quizMedia.uploadFile")}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("quizMedia.dropOrBrowse")}</div>
            {policyMaxSize ? (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("quizMedia.uploadPolicy", {
                  extensions: policyExtensions.slice(0, 8).join(", "),
                  size: formatBytes(policyMaxSize),
                })}
              </div>
            ) : null}
            <div className="mt-4">
              <Button type="primary">{t("quizMedia.browseFiles")}</Button>
            </div>
          </>
        )}
        <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
      </div>

      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{t("quizMedia.attachByUrl")}</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {mediaType === "VIDEO" && (
            <Select
              value={videoSource}
              onChange={setVideoSource}
              showSearch
              optionFilterProp="label"
              options={[
                { value: "MP4", label: t("quizMedia.videoSources.MP4") },
                { value: "YOUTUBE", label: t("quizMedia.videoSources.YOUTUBE") },
                { value: "VIMEO", label: t("quizMedia.videoSources.VIMEO") },
                { value: "EMBED", label: t("quizMedia.videoSources.EMBED") },
                { value: "EXTERNAL", label: t("quizMedia.videoSources.EXTERNAL") },
              ]}
            />
          )}
          <Input
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder={t("quizMedia.titleOptional")}
          />
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t("quizMedia.urlPlaceholder")}
            className={mediaType === "VIDEO" ? "md:col-span-2" : ""}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="primary" loading={creatingLink} onClick={handleAttachByUrl}>
            {t("quizMedia.attachLink")}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input.Search
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("quizMedia.search")}
          className="sm:max-w-xs"
          allowClear
        />
        <Select
          value={sortBy}
          onChange={setSortBy}
          className="w-40"
          showSearch
          optionFilterProp="label"
          options={[
            { value: "date", label: t("quizMedia.byDate") },
            { value: "name", label: t("quizMedia.byName") },
            { value: "size", label: t("quizMedia.bySize") },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spin /></div>
      ) : resources.length > 0 ? (
        <div className="max-h-[420px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <button
                key={resource.id}
                type="button"
                onClick={() => onSelect(resource)}
                className="group rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-sm dark:border-gray-700 dark:bg-slate-900 dark:hover:border-blue-500"
              >
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-md bg-gray-50 dark:bg-slate-800">
                  <ResourceRenderer resource={resource} compact className="m-0 max-h-36" />
                </div>
                <div className="mt-2 truncate text-sm font-medium text-gray-800 dark:text-gray-100">{resource.title || t("quizMedia.untitled")}</div>
                <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{getDisplayFileType(resource)}</span>
                  {resource.fileSize ? <span>{formatBytes(resource.fileSize)}</span> : null}
                </div>
              </button>
            ))}
          </div>
          {pagination.currentPage < pagination.totalPage && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => loadResources(pagination.currentPage + 1, true)}>
                {t("quizMedia.loadMore")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {t("quizMedia.empty")}
        </div>
      )}
    </Modal>
  );
}
