import React, { useState } from "react";
import { Button, Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  AudioLines,
  Clapperboard,
  Image as ImageIcon,
  ImagePlus,
  X,
} from "lucide-react";
import MediaPickerModal from "./MediaPickerModal";

const TYPE_OPTIONS = [
  {
    type: "IMAGE",
    Icon: ImageIcon,
    accentClass: "text-sky-600",
    badgeClass: "bg-sky-50 border-sky-100",
  },
  {
    type: "VIDEO",
    Icon: Clapperboard,
    accentClass: "text-violet-600",
    badgeClass: "bg-violet-50 border-violet-100",
  },
  {
    type: "AUDIO",
    Icon: AudioLines,
    accentClass: "text-emerald-600",
    badgeClass: "bg-emerald-50 border-emerald-100",
  },
];

export default function MediaAttachButton({
  resource,
  allowedTypes = ["IMAGE", "VIDEO", "AUDIO"],
  onChange,
  compact = false,
  label,
  mediaContext,
  deferUpload = false,
  iconOnly = false,
  variant = "default",
  previewImage = false,
}) {
  const { t } = useTranslation();
  const [typeOpen, setTypeOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(allowedTypes[0] || "IMAGE");
  const triggerLabel = label || t(resource ? "quizMedia.changeMedia" : "quizMedia.addMedia");
  const primaryType = allowedTypes[0] || "IMAGE";
  const primaryOption = TYPE_OPTIONS.find((option) => option.type === primaryType);
  const TriggerIcon =
    allowedTypes.length === 1 && primaryOption ? primaryOption.Icon : ImagePlus;
  const resourceType = resource?.type || primaryType;
  const resourceOption = TYPE_OPTIONS.find((option) => option.type === resourceType) || primaryOption;
  const ResourceIcon = resourceOption?.Icon || ImagePlus;
  const isImageResource =
    !!resource && (resource.type === "IMAGE" || resource.mimeType?.startsWith("image/"));

  const openPicker = (type) => {
    setSelectedType(type);
    setTypeOpen(false);
    setPickerOpen(true);
  };

  const handleClick = () => {
    if (allowedTypes.length === 1) {
      openPicker(allowedTypes[0]);
      return;
    }
    setTypeOpen(true);
  };

  const renderTrigger = () => {
    if (variant === "answer-image-frame") {
      return (
        <div className="group relative w-full">
          <Tooltip title={triggerLabel} mouseEnterDelay={0.6} placement="bottom">
            <button
              type="button"
              onClick={handleClick}
              aria-label={triggerLabel}
              className={`w-full overflow-hidden rounded-2xl border transition-colors ${
                isImageResource
                  ? "border-slate-200 bg-white hover:border-blue-300"
                  : "border-dashed border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {previewImage && isImageResource ? (
                <div className="aspect-[16/9] w-full bg-white">
                  <img
                    src={resource.fileUrl || resource.embedUrl || resource.hlsUrl}
                    alt={resource.title || triggerLabel}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-slate-50">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                    <ImageIcon className="h-8 w-8" strokeWidth={1.8} />
                  </div>
                </div>
              )}
            </button>
          </Tooltip>
          {isImageResource ? (
            <button
              type="button"
              aria-label={t("quizMedia.remove")}
              onClick={(event) => {
                event.stopPropagation();
                onChange?.({ resourceId: null, resource: null });
              }}
              className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity hover:bg-slate-900 group-hover:opacity-100"
            >
              {t("quizMedia.remove")}
            </button>
          ) : null}
        </div>
      );
    }

    if (variant === "question-slot") {
      return (
        <div className="relative inline-flex">
          <Tooltip title={triggerLabel} mouseEnterDelay={0.6} placement="bottom">
            <button
              type="button"
              onClick={handleClick}
              aria-label={triggerLabel}
              className={`group inline-flex h-14 w-14 items-center justify-center rounded-xl border transition-colors ${
                resource
                  ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  : "border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              {previewImage && isImageResource ? (
                <img
                  src={resource.fileUrl || resource.embedUrl || resource.hlsUrl}
                  alt={resource.title || triggerLabel}
                  className="h-11 w-11 rounded-lg border border-slate-200 object-cover"
                />
              ) : (
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                    resource
                      ? `${resourceOption?.badgeClass || "bg-slate-50 border-slate-100"} ${resourceOption?.accentClass || "text-slate-600"}`
                      : "border-slate-200 bg-white text-slate-400 group-hover:border-blue-100 group-hover:text-blue-600"
                  }`}
                >
                  <ResourceIcon className="h-5 w-5" strokeWidth={2} />
                </div>
              )}
            </button>
          </Tooltip>
          {resource ? (
            <button
              type="button"
              aria-label={t("quizMedia.remove")}
              onClick={(event) => {
                event.stopPropagation();
                onChange?.({ resourceId: null, resource: null });
              }}
              className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-colors hover:bg-rose-600"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      );
    }

    const baseIconClasses = compact || iconOnly ? "h-4 w-4" : "h-4 w-4";
    const iconNode = <TriggerIcon className={baseIconClasses} strokeWidth={2} />;

    if (compact || iconOnly) {
      return (
        <Tooltip title={triggerLabel} mouseEnterDelay={0.6} placement="bottom">
          <button
            type="button"
            onClick={handleClick}
            aria-label={triggerLabel}
            className={`inline-flex items-center justify-center rounded-xl border transition-colors ${
              resource
                ? "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            } ${compact ? "h-9 w-9" : "h-11 w-11"}`}
          >
            {iconNode}
          </button>
        </Tooltip>
      );
    }

    return (
      <Button
        size="middle"
        type={resource ? "primary" : "default"}
        onClick={handleClick}
        className="inline-flex items-center gap-2"
      >
        {iconNode}
        {triggerLabel}
      </Button>
    );
  };

  return (
    <>
      {renderTrigger()}

      <Modal
        open={typeOpen}
        onCancel={() => setTypeOpen(false)}
        footer={null}
        width={520}
        title={t("quizMedia.selectMediaType")}
        destroyOnHidden
      >
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {t("quizMedia.selectQuestionMediaType")}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.filter((option) => allowedTypes.includes(option.type)).map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => openPicker(option.type)}
              className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${option.badgeClass} ${option.accentClass}`}
              >
                <option.Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <span className="mt-3 text-sm font-medium text-slate-700 group-hover:text-slate-900">
                {t(`quizMedia.types.${option.type}`)}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <MediaPickerModal
        open={pickerOpen}
        mediaType={selectedType}
        allowedTypes={[selectedType]}
        mediaContext={mediaContext}
        deferUpload={deferUpload}
        onCancel={() => setPickerOpen(false)}
        onSelect={(nextResource) => {
          onChange?.(nextResource ? { resourceId: nextResource.id, resource: nextResource } : { resourceId: null, resource: null });
          setPickerOpen(false);
        }}
      />
    </>
  );
}
