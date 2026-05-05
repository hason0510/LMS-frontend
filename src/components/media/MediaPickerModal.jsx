import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Modal, Select, Spin, message } from "antd";
import { useTranslation } from "react-i18next";
import { createStandaloneResource, getResourcePage, uploadStandaloneResource } from "../../api/resource";
import ResourceRenderer from "./ResourceRenderer";

const TYPE_ACCEPT = {
  IMAGE: "image/*",
  VIDEO: "video/*",
  AUDIO: "audio/*,.mp3",
};

const normalizeUploadResponse = (response) => {
  const payload = response?.data ?? response ?? {};
  const id = payload.resourceId ?? payload.id;
  return {
    id,
    title: payload.title,
    fileUrl: payload.fileUrl || payload.url,
    hlsUrl: payload.hlsUrl,
    mimeType: payload.mimeType,
    fileSize: payload.fileSize,
    type: payload.type,
    source: "UPLOAD",
  };
};

const getResourceList = (response) => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.pageList)) return payload.pageList;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

const getPaginationMeta = (response) => {
  const payload = response?.data ?? response;
  if (payload && typeof payload.currentPage === "number" && typeof payload.totalPage === "number") {
    return { currentPage: payload.currentPage, totalPage: payload.totalPage };
  }
  return null;
};

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
  const [url, setUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [videoSource, setVideoSource] = useState("MP4");

  const acceptedTypes = allowedTypes?.length ? allowedTypes : [mediaType];
  const accept = acceptedTypes.map((type) => TYPE_ACCEPT[type]).filter(Boolean).join(",");

  const loadAllResources = async () => {
    const pageSize = 100;
    let pageNumber = 1;
    let totalPage = 1;
    const all = [];

    while (pageNumber <= totalPage) {
      const response = await getResourcePage({ pageNumber, pageSize });
      all.push(...getResourceList(response));
      const meta = getPaginationMeta(response);
      totalPage = meta?.totalPage || pageNumber;
      pageNumber += 1;
    }

    return all;
  };

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    loadAllResources()
      .then((items) => setResources(items))
      .catch(() => message.error(t("quizMedia.loadFailed")))
      .finally(() => setLoading(false));
  }, [open, t]);

  const filteredResources = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const list = resources.filter((resource) => {
      const typeMatched = acceptedTypes.includes(resource.type);
      const textMatched = !keyword || [resource.title, resource.description, resource.mimeType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
      return typeMatched && textMatched;
    });

    return [...list].sort((left, right) => {
      if (sortBy === "name") {
        return String(left.title || "").localeCompare(String(right.title || ""));
      }
      return (right.id || 0) - (left.id || 0);
    });
  }, [acceptedTypes, resources, search, sortBy]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const uploaded = normalizeUploadResponse(await uploadStandaloneResource(file));
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
      source: "UPLOAD",
      fileUrl: trimmed,
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
      };
    }

    if (videoSource === "EMBED") {
      return {
        title: customTitle?.trim() || null,
        type: "VIDEO",
        source: "EMBED",
        embedUrl: trimmed,
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

    setCreatingLink(true);
    try {
      const created = await createStandaloneResource(payload);
      const item = created?.data ?? created;
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
    >
      <div
        className="mb-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center hover:border-blue-400"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Spin />
        ) : (
          <>
            <div className="text-base font-semibold text-gray-800">{t("quizMedia.uploadFile")}</div>
            <div className="mt-1 text-sm text-gray-500">{t("quizMedia.dropOrBrowse")}</div>
            <Button type="primary" className="mt-4">{t("quizMedia.browseFiles")}</Button>
          </>
        )}
        <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
      </div>

      <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-gray-700">{t("quizMedia.attachByUrl")}</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {mediaType === "VIDEO" && (
            <Select
              value={videoSource}
              onChange={setVideoSource}
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
          options={[
            { value: "date", label: t("quizMedia.byDate") },
            { value: "name", label: t("quizMedia.byName") },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spin /></div>
      ) : filteredResources.length > 0 ? (
        <div className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <button
              key={resource.id}
              type="button"
              onClick={() => onSelect(resource)}
              className="group rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-sm"
            >
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-md bg-gray-50">
                <ResourceRenderer resource={resource} compact className="m-0 max-h-36" />
              </div>
              <div className="mt-2 truncate text-sm font-medium text-gray-800">{resource.title || t("quizMedia.untitled")}</div>
              <div className="text-xs text-gray-500">{resource.type || resource.mimeType}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
          {t("quizMedia.empty")}
        </div>
      )}
    </Modal>
  );
}
